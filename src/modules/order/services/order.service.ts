import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WebhookService } from '@/modules/webhook/services/webhook.service';
import { CreateOrderDto, OnItemUnavailable } from '../dto/create-order.dto';
import {
  DeliverOrderDto,
  DispatchOrderDto,
  FailDeliveryDto,
  ReturnDecisionDto,
} from '../dto/transition-order.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly webhookService: WebhookService,
    @InjectQueue('order-timeout') private readonly timeoutQueue: Queue,
  ) {}

  private generatePin(): string {
    return randomBytes(3).toString('hex').toUpperCase();
  }

  /**
   * Remove o job de auto-cancelamento quando a loja aceita/rejeita o pedido.
   */
  private async disarmTimeout(orderId: string) {
    const job = await this.timeoutQueue.getJob(`timeout-${orderId}`);
    if (job) {
      await job.remove();
    }
  }

  private async transitionStatus(
    orderId: string,
    storeId: string,
    fromStatuses: string[],
    toStatus: string,
    extra?: Record<string, any>,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!fromStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${toStatus}. Expected one of: ${fromStatuses.join(', ')}`,
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: toStatus as any, ...extra },
    });
  }

  async create(storeId: string, dto: CreateOrderDto) {
    // Idempotency check: storeId + externalId must be unique
    const existing = await this.prisma.order.findFirst({
      where: { storeId, externalId: dto.externalId },
    });

    if (existing) {
      throw new ConflictException(
        `Order with externalId "${dto.externalId}" already exists for this store`,
      );
    }

    const storePin = this.generatePin();
    const courierPin = this.generatePin();
    const clientPin = this.generatePin();

    const order = await this.prisma.order.create({
      data: {
        storeId,
        externalId: dto.externalId,
        clientAddress: dto.clientAddress as any,
        deliveryFee: dto.deliveryFee,
        itemsPayload: dto.itemsPayload ?? undefined,
        onItemUnavailable: dto.onItemUnavailable ?? OnItemUnavailable.CANCEL_ORDER,
        status: 'RECEIVED',
        storePin,
        courierPin,
        clientPin,
      },
    });

    // Armar auto-cancelamento: se loja não aceitar em X minutos, cancela
    const timeoutMinutes = this.config.get<number>('app.delivery.orderAcceptTimeoutMinutes') ?? 5;
    await this.timeoutQueue.add(
      'auto-cancel',
      { orderId: order.id, storeId },
      {
        delay: timeoutMinutes * 60 * 1000,
        jobId: `timeout-${order.id}`,
      },
    );

    // Webhook: notificar que pedido foi recebido
    await this.webhookService.notifyStatusChange(storeId, order.id, 'RECEIVED');

    return order;
  }

  async accept(storeId: string, orderId: string) {
    const result = await this.transitionStatus(orderId, storeId, ['RECEIVED'], 'ACCEPTED');
    await this.disarmTimeout(orderId);
    await this.webhookService.notifyStatusChange(storeId, orderId, 'ACCEPTED');
    return result;
  }

  async reject(storeId: string, orderId: string) {
    const result = await this.transitionStatus(orderId, storeId, ['RECEIVED'], 'REJECTED');
    await this.disarmTimeout(orderId);
    await this.webhookService.notifyStatusChange(storeId, orderId, 'REJECTED');
    return result;
  }

  async ready(storeId: string, orderId: string) {
    const result = await this.transitionStatus(orderId, storeId, ['ACCEPTED'], 'READY');
    await this.webhookService.notifyStatusChange(storeId, orderId, 'READY');
    return result;
  }

  async requestChange(storeId: string, orderId: string) {
    const result = await this.transitionStatus(orderId, storeId, ['ACCEPTED'], 'AWAITING_CHANGE');
    await this.webhookService.notifyStatusChange(storeId, orderId, 'AWAITING_CHANGE');
    return result;
  }

  async resolveChange(storeId: string, orderId: string, accepted: boolean) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'AWAITING_CHANGE') {
      throw new BadRequestException(
        `Cannot resolve change: order is in ${order.status}, expected AWAITING_CHANGE`,
      );
    }

    if (accepted) {
      const result = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'ACCEPTED' },
      });
      await this.webhookService.notifyStatusChange(storeId, orderId, 'ACCEPTED', {
        reason: 'change_accepted',
      });
      return result;
    }

    // Apply onItemUnavailable rule
    if (order.onItemUnavailable === OnItemUnavailable.CANCEL_ORDER) {
      const result = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
      await this.webhookService.notifyStatusChange(storeId, orderId, 'CANCELLED', {
        reason: 'change_rejected_cancel_order',
      });
      return result;
    }

    // CANCEL_ITEM: go back to ACCEPTED (item removed from payload upstream)
    const result = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'ACCEPTED' },
    });
    await this.webhookService.notifyStatusChange(storeId, orderId, 'ACCEPTED', {
      reason: 'change_rejected_item_removed',
    });
    return result;
  }

  async dispatch(storeId: string, orderId: string, dto: DispatchOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!['ACCEPTED', 'READY'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot dispatch: order is in ${order.status}, expected ACCEPTED or READY`,
      );
    }

    // Double Handshake: store sends courierPin OR courier sends storePin
    const isValid =
      (dto.source === 'store' && dto.pin === order.courierPin) ||
      (dto.source === 'courier' && dto.pin === order.storePin);

    if (!isValid) {
      throw new BadRequestException('Invalid PIN for dispatch');
    }

    const result = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'DISPATCHED' },
    });
    await this.webhookService.notifyStatusChange(storeId, orderId, 'DISPATCHED');
    return result;
  }

  async deliver(storeId: string, orderId: string, dto: DeliverOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'DISPATCHED') {
      throw new BadRequestException(
        `Cannot deliver: order is in ${order.status}, expected DISPATCHED`,
      );
    }

    if (dto.clientPin !== order.clientPin) {
      throw new BadRequestException('Invalid client PIN');
    }

    const result = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'DELIVERED' },
    });
    await this.webhookService.notifyStatusChange(storeId, orderId, 'DELIVERED');
    return result;
  }

  async failDelivery(storeId: string, orderId: string, dto: FailDeliveryDto) {
    const result = await this.transitionStatus(orderId, storeId, ['DISPATCHED'], 'FAILED_DELIVERY', {
      faultType: dto.faultType,
    });
    await this.webhookService.notifyStatusChange(storeId, orderId, 'FAILED_DELIVERY', {
      faultType: dto.faultType,
    });
    return result;
  }

  async returnDecision(storeId: string, orderId: string, dto: ReturnDecisionDto) {
    const toStatus = dto.decision === 'RETURN' ? 'RETURNING' : 'DISCARDED';
    const result = await this.transitionStatus(
      orderId,
      storeId,
      ['AWAITING_RETURN_DECISION'],
      toStatus,
    );
    await this.webhookService.notifyStatusChange(storeId, orderId, toStatus);
    return result;
  }

  async cancel(storeId: string, orderId: string) {
    const result = await this.transitionStatus(
      orderId,
      storeId,
      ['ACCEPTED', 'READY', 'AWAITING_CHANGE'],
      'CANCELLED',
    );
    await this.webhookService.notifyStatusChange(storeId, orderId, 'CANCELLED');
    return result;
  }

  async findAll(storeId: string, filters?: { status?: string }) {
    return this.prisma.order.findMany({
      where: {
        storeId,
        ...(filters?.status ? { status: filters.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(storeId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
