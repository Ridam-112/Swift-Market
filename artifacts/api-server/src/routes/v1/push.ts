import { Router, type Response } from "express";
import { db, pushSubscriptions } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";
import { vapidPublicKey, webpush } from "../../lib/webpush.js";

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

  // Upsert: delete existing entry for this (user, endpoint) pair, then re-insert
  await db.delete(pushSubscriptions).where(
    and(eq(pushSubscriptions.userId, req.user!.userId), eq(pushSubscriptions.endpoint, endpoint))
  );
  await db.insert(pushSubscriptions).values({
    userId: req.user!.userId,
    endpoint,
    keys,
  });

  console.log("[Push] Subscription saved:", { userId: req.user!.userId, endpoint: endpoint.slice(0, 60) + "…" });
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

// POST /api/push/test — send a real push to yourself to verify end-to-end setup
router.post("/test", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) {
    res.status(404).json({
      success: false,
      message: "No push subscription found for your account. Enable notifications first.",
    });
    return;
  }

  const pushPayload = JSON.stringify({
    title: "🔔 Test Notification",
    body:  "Push is working! You'll get alerts for orders & updates even when the app is closed.",
    icon:  "/logo.png",
    badge: "/logo.png",
    tag:   "test",
    data:  { url: "/notifications" },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const keys = sub.keys as { p256dh: string; auth: string };
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
        pushPayload
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      const e = err as { statusCode?: number; message?: string };
      console.error("[Push] Test send failed:", { status: e.statusCode, message: e.message });
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }

  if (sent > 0) {
    res.json({ success: true, message: `Test push sent to ${sent} device(s).`, sent, failed });
  } else {
    res.status(500).json({ success: false, message: "Push send failed — check server logs.", sent, failed });
  }
});

export default router;
