import { Router, type Response } from "express";
import { db, notifications, adminBroadcasts, users } from "@workspace/db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { createNotificationLimited, sendPushToUsers, trimNotificationsForUser } from "../../utils/notification.js";
import { miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// GET /api/notifications — current user's notifications with pagination (L7)
router.get("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const uid = req.user!.userId;
  const limit = Math.min(parseInt((req.query["limit"] as string) ?? "10"), 10);
  const page = Math.max(parseInt((req.query["page"] as string) ?? "1"), 1);
  const offset = (page - 1) * limit;

  const [rows, [{ unread }], [{ total }]] = await Promise.all([
    db.select().from(notifications)
      .where(eq(notifications.userId, uid))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ unread: count() }).from(notifications)
      .where(and(eq(notifications.userId, uid), eq(notifications.isRead, false))),
    db.select({ total: count() }).from(notifications)
      .where(eq(notifications.userId, uid)),
  ]);
  res.json({
    success: true,
    notifications: miArr(rows),
    unreadCount: Number(unread),
    total: Number(total),
    page,
    pages: Math.ceil(Number(total) / limit),
  });
});

// PATCH /api/notifications/read-all — mark all unread as read
// Must be defined before /:id/read to avoid route conflict
router.patch("/read-all", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, req.user!.userId), eq(notifications.isRead, false)));
  res.json({ success: true, message: "All notifications marked as read" });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, req.params["id"] as string), eq(notifications.userId, req.user!.userId)));
  res.json({ success: true });
});

// POST /api/notifications/broadcast — admin sends to audience
router.post("/broadcast", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, message, targetAudience, targetUserId } =
    req.body as { title: string; message: string; targetAudience: string; targetUserId?: string };

  if (!title || !message || !targetAudience) {
    res.status(400).json({ success: false, message: "title, message and targetAudience are required" });
    return;
  }

  let recipientIds: string[];

  if (targetAudience === "specific") {
    if (!targetUserId) {
      res.status(400).json({ success: false, message: "targetUserId required for specific audience" });
      return;
    }
    recipientIds = [targetUserId];
  } else if (targetAudience === "customers") {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "customer"));
    recipientIds = rows.map(r => r.id);
  } else if (targetAudience === "vendors") {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "vendor"));
    recipientIds = rows.map(r => r.id);
  } else {
    const rows = await db.select({ id: users.id }).from(users);
    recipientIds = rows.map(r => r.id);
  }

  const payload = { type: "system" as const, title, message };

  // Save in-app notifications (noPush=true — we handle push separately to get counts)
  await Promise.all(recipientIds.map(id =>
    createNotificationLimited(id, payload, { noPush: true })
  ));

  // Send push notifications and collect delivery counts
  const { sent: pushSent, failed: pushFailed } = await sendPushToUsers(recipientIds, payload);

  try {
    await db.insert(adminBroadcasts).values({
      title,
      message,
      targetAudience,
      targetUserId,
      sentCount: recipientIds.length,
      pushSent,
      pushFailed,
    });
  } catch {
    // Fallback for production DB not yet migrated (push_sent/push_failed columns may be missing)
    await db.insert(adminBroadcasts).values({
      title,
      message,
      targetAudience,
      targetUserId,
      sentCount: recipientIds.length,
    });
  }

  req.log.info({ inApp: recipientIds.length, pushSent, pushFailed }, "Broadcast complete");

  res.json({ success: true, sentCount: recipientIds.length, pushSent, pushFailed });
});

// POST /api/notifications/broadcasts — admin broadcast history
router.get("/broadcasts", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  const broadcasts = await db.select().from(adminBroadcasts).orderBy(desc(adminBroadcasts.createdAt)).limit(50);
  res.json({ success: true, broadcasts: miArr(broadcasts) });
});

// POST /api/notifications/send-custom — admin sends a custom push notification with deep-linking payload
router.post("/send-custom", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, message, imageUrl, target, targetUserId, redirectType, redirectValue, showTimer, timerSeconds, progress } = req.body as {
    title: string;
    message: string;
    imageUrl?: string;
    target: "all" | "specific" | "customers" | "vendors";
    targetUserId?: string;
    redirectType: "none" | "product" | "category" | "shop";
    redirectValue?: string;
    showTimer?: string | boolean;
    timerSeconds?: string | number;
    progress?: string | number;
  };

  if (!title || !message || !target) {
    res.status(400).json({ success: false, message: "title, message and target are required" });
    return;
  }

  let recipientIds: string[] = [];

  if (target === "specific") {
    if (!targetUserId) {
      res.status(400).json({ success: false, message: "targetUserId is required for target='specific'" });
      return;
    }
    const [userExists] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!userExists) {
      res.status(400).json({ success: false, message: "Specified user ID does not exist" });
      return;
    }
    recipientIds = [targetUserId];
  } else if (target === "customers") {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "customer"));
    recipientIds = rows.map(r => r.id);
  } else if (target === "vendors") {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "vendor"));
    recipientIds = rows.map(r => r.id);
  } else {
    // Broadcast to all users
    const allUsers = await db.select({ id: users.id }).from(users);
    recipientIds = allUsers.map(u => u.id);
  }

  if (recipientIds.length === 0) {
    res.status(400).json({ success: false, message: "No recipients found" });
    return;
  }

  // Create deep link URL for web clients or fallback links
  let targetUrl = "/notifications";
  if (redirectType === "product" && redirectValue) {
    targetUrl = `/product/${redirectValue}`;
  } else if (redirectType === "category" && redirectValue) {
    targetUrl = `/category/${redirectValue}`;
  } else if (redirectType === "shop" && redirectValue) {
    targetUrl = `/shop/${redirectValue}`;
  }

  // Prepare standard payload including data attributes for Android/iOS native click/routing extraction
  const payload = {
    type: "promo" as const,
    title,
    message,
    data: {
      url: targetUrl,
      imageUrl: imageUrl || "",
      redirectType: redirectType || "none",
      redirectValue: redirectValue || "",
      showTimer: showTimer === "true" || showTimer === true ? "true" : "false",
      timerSeconds: timerSeconds != null ? String(timerSeconds) : "0",
      progress: progress != null ? String(progress) : "",
    }
  };

  // 1. Save in-app notification records (so they persist in the notification bell history)
  await Promise.all(recipientIds.map(id =>
    createNotificationLimited(id, payload, { noPush: true })
  ));

  // 2. Dispatch FCM push notification
  const { sent: pushSent, failed: pushFailed } = await sendPushToUsers(recipientIds, payload);

  // 3. Log broadcast history
  try {
    await db.insert(adminBroadcasts).values({
      title,
      message,
      targetAudience: target,
      targetUserId: target === "specific" ? targetUserId : null,
      sentCount: recipientIds.length,
      pushSent,
      pushFailed,
    });
  } catch {
    // Fallback for legacy DB version without push count tracking
    await db.insert(adminBroadcasts).values({
      title,
      message,
      targetAudience: target,
      targetUserId: target === "specific" ? targetUserId : null,
      sentCount: recipientIds.length,
    });
  }

  res.json({
    success: true,
    sentCount: recipientIds.length,
    pushSent,
    pushFailed
  });
});

// POST /api/notifications/admin/cleanup — admin: trim all users to 10-notification cap
router.post("/admin/cleanup", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allUsers = await db
      .select({ userId: notifications.userId, cnt: count() })
      .from(notifications)
      .groupBy(notifications.userId)
      .having(({ cnt }) => sql`${cnt} > 10`);

    if (allUsers.length === 0) {
      res.json({ success: true, message: "All users already within the 10-notification limit.", trimmed: 0 });
      return;
    }

    await Promise.all(allUsers.map(({ userId }) => trimNotificationsForUser(userId)));

    res.json({
      success: true,
      message: `Trimmed notifications for ${allUsers.length} user(s) to the 10-item cap.`,
      trimmed: allUsers.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Cleanup failed", error: String(err) });
  }
});

export default router;
