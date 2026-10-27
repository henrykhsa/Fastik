import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WebhookService } from '@/modules/webhook/services/webhook.service';

export interface OrderTimeoutJobData {
  orderId: string;
  storeId: string;
}

@Processor('order-timeout')
export class OrderTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderTimeoutProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {
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

    // Auto-cancelar — loja não aceitou a tempo.
    // updateMany com `status: 'RECEIVED'` no WHERE: se a loja aceitou entre o
    // findFirst acima e este update, NÃO sobrescreve o aceite (corrida).
    const cancelled = await this.prisma.order.updateMany({
      where: { id: orderId, storeId, status: 'RECEIVED' },
      data: { status: 'CANCELLED' },
    });
    if (cancelled.count === 0) {
      this.logger.log(
        `Timeout: Order ${orderId} changed state during auto-cancel, skipping`,
      );
      return;
    }

    this.logger.warn(
      `⏰ Order ${orderId} auto-cancelled: store did not accept within timeout`,
    );

    // Avisa o receptor (Laurus). Sem isto o pedido ficava CANCELLED só aqui e o
    // espelho do pedido na Laurus ficava RECEIVED para sempre; pagamentos online
    // ligados ao pedido (reserva no cartão / Pix) nunca eram liberados/estornados.
    // O cancelamento já foi gravado: se o enfileiramento falhar, só registramos
    // (um retry do job cairia no skip acima e não reenviaria). A Laurus tem uma
    // conciliação própria que consulta o status real como rede de segurança.
    try {
      await this.webhookService.notifyStatusChange(
        storeId,
        orderId,
        'CANCELLED',
        { reason: 'ACCEPT_TIMEOUT' },
      );
    } catch (error) {
      this.logger.error(
        `Timeout: falha ao enfileirar webhook CANCELLED do pedido ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
