import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WebhookJobData } from '../dto/webhook-event.dto';

@Processor('webhooks')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { webhookUrl, event, payload, storeId, orderId } = job.data;

    const body = {
      event,
      payload,
      timestamp: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(body);

    // Assina o corpo com HMAC-SHA256 (WEBHOOK_API_KEY) para o receptor
    // (Laurus) verificar autenticidade. Sem isto, qualquer um que descubra a
    // URL poderia injetar pedidos falsos.
    const secret = this.configService.get<string>('app.webhook.apiKey') ?? '';
    const signature = secret
      ? createHmac('sha256', secret).update(rawBody).digest('hex')
      : '';

    let httpStatus: number | null = null;
    let success = false;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(signature ? { 'x-fastik-signature': signature } : {}),
        },
        body: rawBody,
      });

      httpStatus = response.status;
      success = response.ok;

      if (!response.ok) {
        errorMessage = `HTTP ${response.status}: ${await response.text()}`;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    await this.prisma.webhookLog.create({
      data: {
        storeId,
        orderId,
        event,
        payload: payload as any,
        httpStatus,
        success,
        attempt: job.attemptsMade + 1,
        errorMessage,
      },
    });

    if (!success) {
      this.logger.warn(
        `Webhook delivery failed for store ${storeId}: ${errorMessage}`,
      );
      throw new Error(errorMessage ?? 'Webhook delivery failed');
    }

    this.logger.log(
      `Webhook delivered: ${event} to ${webhookUrl} (status ${httpStatus})`,
    );
  }
}
