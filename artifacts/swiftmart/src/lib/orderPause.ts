// Order Pause Configuration
// Orders are paused due to Durga Puja celebrations and resume on 26th October 2026.

export const ORDERS_RESUME_DATE_STR = "26th October";
export const ORDERS_PAUSED_UNTIL = new Date("2026-10-26T00:00:00+05:30");

export function isOrdersPaused(): boolean {
  if (typeof window !== "undefined") {
    // Allows manual bypass or testing with ?resume_orders=true
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("resume_orders") === "true") return false;
      if (params.get("pause_orders") === "true") return true;
    } catch (_) {}
  }
  return Date.now() < ORDERS_PAUSED_UNTIL.getTime();
}

export const ORDERS_PAUSED_TITLE = "Orders Paused for Durga Puja";
export const ORDERS_PAUSED_MESSAGE =
  "Orders are currently paused due to Durga Puja celebrations. Deliveries will resume on 26th October.";
export const ORDERS_PAUSED_BUTTON_LABEL = "Orders Paused (Resumes 26th Oct)";
