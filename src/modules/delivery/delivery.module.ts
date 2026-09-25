import { Module } from '@nestjs/common';
import { DeliveryController } from './controllers/delivery.controller';
import { DeliveryService } from './services/delivery.service';
import { StoreApiKeyGuard } from './guards/store-api-key.guard';

@Module({
  controllers: [DeliveryController],
  providers: [DeliveryService, StoreApiKeyGuard],
  exports: [DeliveryService],
})
export class DeliveryModule {}
