import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface OrderTimeoutJobData {
  orderId: string;
  storeId: string;
}

@Processor('order-timeout')
export class OrderTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderTimeoutProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<OrderTimeoutJobData>) {
    const { orderId, storeId } = job.data;

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId },
    });

    if (!order) {
      this.logger.warn(`Timeout: Order ${orderId} not found, skipping`);
      return;
    }

    // Se o pedido já saiu de RECEIVED, o timeout é irrelevante
    if (order.status !== 'RECEIVED') {
      this.logger.log(
        `Timeout: Order ${orderId} already in ${order.status}, skipping auto-cancel`,
      );
      return;
    }

    // Auto-cancelar — loja não aceitou a tempo
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    this.logger.warn(
      `⏰ Order ${orderId} auto-cancelled: store did not accept within timeout`,
    );

    // TODO: Disparar webhook notifyStatusChange quando integrado
  }
}
