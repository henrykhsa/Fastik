import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DeliveryModule } from '@/modules/delivery/delivery.module';
import { WebhookModule } from '@/modules/webhook/webhook.module';
import { OrderController } from './controllers/order.controller';
import { OrderService } from './services/order.service';
import { DeliveryCronService } from './services/delivery-cron.service';
import { OrderTimeoutProcessor } from './processors/order-timeout.processor';
import { OrderAutoDeliverProcessor } from './processors/order-auto-deliver.processor';


@Module({
  imports: [
    DeliveryModule,
    WebhookModule,
    BullModule.registerQueue({
      name: 'order-timeout',
    }),
    BullModule.registerQueue({
      name: 'order-auto-deliver',
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderTimeoutProcessor, OrderAutoDeliverProcessor, DeliveryCronService],
  exports: [OrderService],
})
export class OrderModule {}
