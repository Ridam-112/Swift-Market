// Order Pause Configuration
// Orders are paused due to Durga Puja celebrations and resume on 26th October 2026 (IST).

export const ORDERS_PAUSED_UNTIL = new Date("2026-10-26T00:00:00+05:30");
export const ORDERS_PAUSED_MESSAGE =
  "Orders are currently paused due to Durga Puja celebrations. Deliveries will resume on 26th October.";

export function isOrdersPaused(): boolean {
  if (process.env.ORDERS_PAUSED === "false") return false;
  if (process.env.ORDERS_PAUSED === "true") return true;
  return Date.now() < ORDERS_PAUSED_UNTIL.getTime();
}
