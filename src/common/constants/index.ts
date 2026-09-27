export const QUEUE_BATCHING = 'batching';
export const QUEUE_DELAY_TIMING = 'delay-timing';
export const QUEUE_WATCHDOG = 'watchdog';

export const PIN_LENGTH = 6;

export const DEFAULT_CLOCK_DRIFT_MINUTES = 3;
export const DEFAULT_WATCHDOG_HOURS = 4;
export const DEFAULT_BATCHING_WINDOW_SECONDS = 120;
export const DEFAULT_PENALTY_PER_MINUTE = 0.5; // R$ 0.50

/**
 * Status terminais de um Order: uma vez atingidos, não há mais transições
 * relevantes para reconciliação (o pedido está encerrado). A reconciliação
 * PULL usa esta lista para saber o que é "ativo" (não-terminal).
 */
export const TERMINAL_ORDER_STATUSES = [
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
  'FAILED_DELIVERY',
  'DISCARDED',
] as const;

export type TerminalOrderStatus = (typeof TERMINAL_ORDER_STATUSES)[number];
