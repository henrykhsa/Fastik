export interface WebhookJobData {
  storeId: string;
  webhookUrl: string;
  event: string;
  payload: Record<string, any>;
  orderId?: string;
}
