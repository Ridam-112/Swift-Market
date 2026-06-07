import { Router, type Response } from "express";
import { db, pushSubscriptions } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";
import { vapidPublicKey } from "../../lib/webpush.js";

const router = Router();

// GET /api/push/vapid-public-key — public, used by frontend to subscribe
router.get("/vapid-public-key", (_req, res: Response): void => {
  res.json({ success: true, publicKey: vapidPublicKey });
});

// POST /api/push/subscribe — save or update a push subscription for this user
// Uses delete+insert to emulate upsert on (userId, endpoint)
router.post("/subscribe", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { endpoint, keys } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ success: false, message: "Invalid subscription object" });
    return;
  }

  await db.delete(pushSubscriptions).where(
    and(eq(pushSubscriptions.userId, req.user!.userId), eq(pushSubscriptions.endpoint, endpoint))
  );
  await db.insert(pushSubscriptions).values({
    userId: req.user!.userId,
    endpoint,
    keys,
  });

  res.json({ success: true });
});

// POST /api/push/unsubscribe — remove a push subscription
router.post("/unsubscribe", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { endpoint } = req.body as { endpoint: string };
  if (endpoint) {
    await db.delete(pushSubscriptions).where(
      and(eq(pushSubscriptions.userId, req.user!.userId), eq(pushSubscriptions.endpoint, endpoint))
    );
  }
  res.json({ success: true });
});

export default router;
