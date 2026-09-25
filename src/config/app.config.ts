import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Token de serviço para provisionamento de tenants (S2S, reutilizável)
  bootstrapToken: process.env.BOOTSTRAP_TOKEN || '',

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    expiration: process.env.JWT_EXPIRATION || '24h',
  },

  webhook: {
    apiKey: process.env.WEBHOOK_API_KEY || '',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  delivery: {
    clockDriftToleranceMinutes: parseInt(
      process.env.CLOCK_DRIFT_TOLERANCE_MINUTES || '3',
      10,
    ),
    watchdogTimeoutHours: parseInt(
      process.env.WATCHDOG_TIMEOUT_HOURS || '4',
      10,
    ),
    batchingWindowSeconds: parseInt(
      process.env.BATCHING_WINDOW_SECONDS || '120',
      10,
    ),
    orderAcceptTimeoutMinutes: parseInt(
      process.env.ORDER_ACCEPT_TIMEOUT_MINUTES || '5',
      10,
    ),
  },
}));
