import { Router, type Response } from "express";
import { Notification } from "../../models/Notification.js";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const notifications = await Notification.find({ userId: req.user!.userId })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, notifications });
});

router.patch("/read-all", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await Notification.updateMany({ userId: req.user!.userId, isRead: false }, { isRead: true });
  res.json({ success: true, message: "All notifications marked as read" });
});

router.patch("/:id/read", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await Notification.findByIdAndUpdate(req.params["id"], { isRead: true });
  res.json({ success: true });
});

export default router;
