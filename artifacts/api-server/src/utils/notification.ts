import { db, notifications, pushSubscriptions } from "@workspace/db";
import { eq, count, asc, inArray, and, not } from "drizzle-orm";
import { webpush } from "../lib/webpush.js";

const NOTIFICATION_LIMIT = 50;
// These types are never trimmed first — older non-critical notifications are removed preferentially
const CRITICAL_TYPES = ["order_update", "delivery_update"] as const;

type NotificationPayload = {
  type: "order_update" | "shop_approval" | "delivery_update" | "coupon" | "promo" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

async function sendPush(userId: string, payload: NotificationPayload): Promise<void> {
  try {
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    if (subs.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.message,
      icon: "/logo.png",
      badge: "/logo.png",
      tag: payload.type,
      data: { url: "/notifications", ...payload.data },
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        const keys = sub.keys as { p256dh: string; auth: string };
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
            pushPayload
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          }
        }
      })
    );
  } catch { /* non-fatal */ }
}

export async function createNotificationLimited(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  await db.insert(notifications).values({ userId, ...payload });

  const [{ cnt }] = await db.select({ cnt: count() }).from(notifications).where(eq(notifications.userId, userId));
  const total = Number(cnt);
  if (total > NOTIFICATION_LIMIT) {
    const excessCount = total - NOTIFICATION_LIMIT;
    // M3 fix: trim non-critical notifications first so order/delivery updates are never dropped
    const nonCritical = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), not(inArray(notifications.type, [...CRITICAL_TYPES]))))
      .orderBy(asc(notifications.createdAt))
      .limit(excessCount);
    const toDelete = nonCritical.length >= excessCount
      ? nonCritical
      : await db.select({ id: notifications.id })
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(asc(notifications.createdAt))
          .limit(excessCount);
    if (toDelete.length > 0) {
      await db.delete(notifications).where(inArray(notifications.id, toDelete.map((n) => n.id)));
    }
  }

  void sendPush(userId, payload);
}
