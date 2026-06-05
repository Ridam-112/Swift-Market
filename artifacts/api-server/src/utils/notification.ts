import { Notification } from "../models/Notification.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { webpush } from "../lib/webpush.js";

const NOTIFICATION_LIMIT = 10;

type NotificationPayload = {
  type: "order_update" | "shop_approval" | "delivery_update" | "coupon" | "promo" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

async function sendPush(userId: string, payload: NotificationPayload): Promise<void> {
  try {
    const subs = await PushSubscription.find({ userId }).lean();
    if (subs.length === 0) return;

    const pushPayload = JSON.stringify({
      title:   payload.title,
      body:    payload.message,
      icon:    "/logo.png",
      badge:   "/logo.png",
      tag:     payload.type,
      data:    { url: "/notifications", ...payload.data },
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            pushPayload
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await PushSubscription.deleteOne({ _id: sub._id });
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
  await Notification.create({ userId, ...payload });

  const count = await Notification.countDocuments({ userId });
  if (count > NOTIFICATION_LIMIT) {
    const excess = await Notification.find({ userId })
      .sort({ createdAt: 1 })
      .limit(count - NOTIFICATION_LIMIT)
      .select("_id")
      .lean();
    if (excess.length > 0) {
      await Notification.deleteMany({ _id: { $in: excess.map(n => n._id) } });
    }
  }

  void sendPush(userId, payload);
}
