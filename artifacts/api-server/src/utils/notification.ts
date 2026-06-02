import { Notification } from "../models/Notification.js";

const NOTIFICATION_LIMIT = 10;

type NotificationPayload = {
  type: "order_update" | "shop_approval" | "delivery_update" | "coupon" | "promo" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

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
}
