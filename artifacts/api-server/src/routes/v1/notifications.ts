import { Router, type Response } from "express";
import { Notification } from "../../models/Notification.js";
import { AdminBroadcast } from "../../models/AdminBroadcast.js";
import { User } from "../../models/User.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// GET /api/notifications — current user's notifications
router.get("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const notifications = await Notification.find({ userId: req.user!.userId })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ userId: req.user!.userId, isRead: false });
  res.json({ success: true, notifications, unreadCount });
});

// PATCH /api/notifications/read-all
router.patch("/read-all", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await Notification.updateMany({ userId: req.user!.userId, isRead: false }, { isRead: true });
  res.json({ success: true, message: "All notifications marked as read" });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await Notification.findByIdAndUpdate(req.params["id"], { isRead: true });
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

  let userFilter: Record<string, unknown> = {};
  if (targetAudience === "customers") {
    userFilter = { role: "customer" };
  } else if (targetAudience === "vendors") {
    userFilter = { role: "vendor" };
  } else if (targetAudience === "specific") {
    if (!targetUserId) {
      res.status(400).json({ success: false, message: "targetUserId required for specific audience" });
      return;
    }
    userFilter = { _id: targetUserId };
  }

  const users = await User.find(userFilter).select("_id").lean();
  const notifications = users.map(u => ({
    userId: String(u._id),
    type: "system" as const,
    title,
    message,
    isRead: false,
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  await AdminBroadcast.create({
    title,
    message,
    targetAudience,
    targetUserId,
    sentCount: notifications.length,
  });

  res.json({ success: true, sentCount: notifications.length });
});

// GET /api/notifications/broadcasts — admin history
router.get("/broadcasts", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const broadcasts = await AdminBroadcast.find({})
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, broadcasts });
});

export default router;
