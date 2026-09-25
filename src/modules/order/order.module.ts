import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DeliveryModule } from '@/modules/delivery/delivery.module';
import { WebhookModule } from '@/modules/webhook/webhook.module';
import { OrderController } from './controllers/order.controller';
import { OrderService } from './services/order.service';
import { OrderTimeoutProcessor } from './processors/order-timeout.processor';

@Module({
  imports: [
    DeliveryModule,
    WebhookModule,
    BullModule.registerQueue({
      name: 'order-timeout',
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderTimeoutProcessor],
  exports: [OrderService],
})
export class OrderModule {}
