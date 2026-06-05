import { Router, type Response } from "express";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";
import { PushSubscription } from "../../models/PushSubscription.js";
import { vapidPublicKey } from "../../lib/webpush.js";

const router = Router();

// GET /api/push/vapid-public-key — public, used by frontend to subscribe
router.get("/vapid-public-key", (_req, res: Response): void => {
  res.json({ success: true, publicKey: vapidPublicKey });
});

// POST /api/push/subscribe — save or update a push subscription for this user
router.post("/subscribe", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { endpoint, keys } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ success: false, message: "Invalid subscription object" });
    return;
  }

  await PushSubscription.findOneAndUpdate(
    { userId: req.user!.userId, endpoint },
    { userId: req.user!.userId, endpoint, keys },
    { upsert: true, new: true }
  );

  res.json({ success: true });
});

// POST /api/push/unsubscribe — remove a push subscription
router.post("/unsubscribe", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { endpoint } = req.body as { endpoint: string };
  if (endpoint) {
    await PushSubscription.deleteOne({ userId: req.user!.userId, endpoint });
  }
  res.json({ success: true });
});

export default router;
