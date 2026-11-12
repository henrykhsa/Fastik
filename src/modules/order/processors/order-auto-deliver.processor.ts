import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WebhookService } from '@/modules/webhook/services/webhook.service';

export interface OrderAutoDeliverJobData {
  orderId: string;
  storeId: string;
}

/**
 * Conclusão automática: se o pedido continuar "Em rota" (DISPATCHED) depois do
 * prazo (padrão 3 h; AUTO_DELIVER_AFTER_MINUTES), ninguém informou o código do
 * cliente e o pedido é dado como ENTREGUE pelo sistema. O código continua
 * obrigatório na entrega normal; isto só encerra pedidos que ficaram sem confirmação.
 */
@Processor('order-auto-deliver')
export class OrderAutoDeliverProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderAutoDeliverProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {
    super();
  }

  async process(job: Job<OrderAutoDeliverJobData>) {
    const { orderId, storeId } = job.data;

    // `status: 'DISPATCHED'` no WHERE: se foi entregue/falhou/voltou nesse meio
    // tempo, não sobrescreve nada (corrida segura).
    const done = await this.prisma.order.updateMany({
      where: { id: orderId, storeId, status: 'DISPATCHED' },
      data: { status: 'DELIVERED' },
    });
    if (done.count === 0) {
      this.logger.log(`Auto-deliver: pedido ${orderId} já não está em rota, ignorando`);
      return;
    }

    this.logger.warn(`Pedido ${orderId} concluído automaticamente (sem código do cliente no prazo)`);
    try {
      await this.webhookService.notifyStatusChange(storeId, orderId, 'DELIVERED', {
        reason: 'AUTO_DELIVER_TIMEOUT',
      });
    } catch (error) {
      this.logger.error(
        `Auto-deliver: falha ao enfileirar webhook DELIVERED do pedido ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
