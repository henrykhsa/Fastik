import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookService } from './services/webhook.service';
import { WebhookProcessor } from './processors/webhook.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'webhooks' })],
  providers: [WebhookService, WebhookProcessor],
  exports: [WebhookService],
})
export class WebhookModule {}
