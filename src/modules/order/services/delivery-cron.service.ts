import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OrderService } from './order.service';

@Injectable()
export class DeliveryCronService {
  private readonly logger = new Logger(DeliveryCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {}

  // Roda automaticamente a cada 1 hora ("0 * * * *")
  @Cron(CronExpression.EVERY_HOUR)
  async handleStuckOrdersSweep() {
    this.logger.log('Iniciando varredura automática de pedidos travados em rota...');

    try {
      // Busca todas as lojas ativas no sistema
      const activeStores = await this.prisma.store.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const store of activeStores) {
        try {
          const result = await this.orderService.sweepStuckDispatchedOrders(store.id);
          if (result.queuedCount > 0) {
            this.logger.warn(
              `Loja ${store.id}: ${result.queuedCount} pedidos presos em rota foram enfileirados para conclusão.`,
            );
          }
        } catch (err) {
          this.logger.error(
            `Erro ao varrer pedidos da loja ${store.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      this.logger.log('Varredura automática concluída com sucesso.');
    } catch (error) {
      this.logger.error(
        `Falha crítica na varredura automática de entregas: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}