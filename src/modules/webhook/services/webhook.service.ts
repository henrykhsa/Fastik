import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WebhookJobData } from '../dto/webhook-event.dto';

@Injectable()
export class WebhookService {
  constructor(
    @InjectQueue('webhooks') private readonly webhookQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async dispatch(
    storeId: string,
    event: string,
    payload: Record<string, any>,
    orderId?: string,
  ): Promise<void> {
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { webhookUrl: true, externalPmsId: true },
    });

    if (!store.webhookUrl) return;

    const jobData: WebhookJobData = {
      storeId,
      webhookUrl: store.webhookUrl,
      event,
      // externalPmsId permite o receptor (Laurus) resolver a loja/tenant —
      // o webhook é server-to-server, sem sessão/cookie.
      payload: { ...payload, externalPmsId: store.externalPmsId },
      orderId,
    };

    await this.webhookQueue.add(event, jobData, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async notifyStatusChange(
    storeId: string,
    orderId: string,
    newStatus: string,
    extraData?: Record<string, any>,
  ): Promise<void> {
    await this.dispatch(
      storeId,
      'order.status_changed',
      {
        orderId,
        status: newStatus,
        timestamp: new Date().toISOString(),
        ...extraData,
      },
      orderId,
    );
  }
}
