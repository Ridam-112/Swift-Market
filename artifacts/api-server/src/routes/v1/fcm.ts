import { Router, type Response } from "express";
import { db, fcmTokens, users, adminBroadcasts } from "@workspace/db";
import { eq, and, count, sum, desc, inArray } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { getMessagingInstance } from "../../lib/firebase-admin.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// GET /api/fcm/config — public: frontend fetches this to get the FCM VAPID key
router.get("/config", (_req, res: Response): void => {
  // Prefer FIREBASE_VAPID_KEY, but if it is set to its own name (misconfigured),
  // fall back to VAPID_PUBLIC_KEY which the .replit env already has the real value.
  const raw = process.env["FIREBASE_VAPID_KEY"] ?? process.env["VITE_FIREBASE_VAPID_KEY"] ?? "";
  const vapidKey = (raw && raw !== "FIREBASE_VAPID_KEY" && raw !== "VITE_FIREBASE_VAPID_KEY")
    ? raw
    : (process.env["VAPID_PUBLIC_KEY"] ?? "");
  res.json({ success: true, vapidKey });
});

// POST /api/fcm/register-token — save or refresh an FCM token for this user
router.post("/register-token", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { token, platform = "web" } = req.body as { token: string; platform?: string };

  if (!token || typeof token !== "string") {
    res.status(400).json({ success: false, message: "FCM token is required" });
    return;
  }

  const userId    = req.user!.userId;
  const role      = req.user!.role;
  const userAgent = req.headers["user-agent"] ?? null;

  try {
    // Upsert: if same token exists (any user), take ownership; otherwise insert
    const existing = await db.select({ id: fcmTokens.id }).from(fcmTokens).where(eq(fcmTokens.token, token)).limit(1);

    if (existing.length > 0) {
      await db.update(fcmTokens)
        .set({ userId, role, platform, userAgent, isActive: true, lastSeenAt: new Date(), updatedAt: new Date() })
        .where(eq(fcmTokens.token, token));
    } else {
      await db.insert(fcmTokens).values({ userId, token, platform, role, userAgent, isActive: true });
    }

    console.log("[FCM] Token registered:", { userId, platform, role, token: token.slice(0, 20) + "…" });
    res.json({ success: true });
  } catch (err) {
    console.error("[FCM] register-token error:", err);
    res.status(500).json({ success: false, message: "Failed to save FCM token" });
  }
});

// POST /api/fcm/unregister-token — deactivate a specific FCM token
router.post("/unregister-token", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (token) {
    await db.update(fcmTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(fcmTokens.token, token), eq(fcmTokens.userId, req.user!.userId)));
  }
  res.json({ success: true });
});

// POST /api/fcm/unregister-all — deactivate ALL tokens for this user (fallback when specific token can't be retrieved)
router.post("/unregister-all", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const result = await db.update(fcmTokens)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(fcmTokens.userId, userId), eq(fcmTokens.isActive, true)));
  console.log(`[FCM] unregister-all userId=${userId}`);
  res.json({ success: true });
});

// POST /api/fcm/test — send a test FCM push to yourself
router.post("/test", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  // Wrap EVERYTHING in try/catch so no exception can escape to the global "Internal server error" handler
  try {
    const userId = req.user!.userId;

    // 1) Gather all tokens for this user (active + inactive) for diagnostics
    const allTokens = await db
      .select({ token: fcmTokens.token, isActive: fcmTokens.isActive, platform: fcmTokens.platform, updatedAt: fcmTokens.updatedAt })
      .from(fcmTokens)
      .where(eq(fcmTokens.userId, userId));

    const activeTokens = allTokens.filter(t => t.isActive);

    console.log(`[FCM] /test userId=${userId} total_tokens=${allTokens.length} active=${activeTokens.length}`);

    if (activeTokens.length === 0) {
      res.status(404).json({
        success: false,
        message: "No active FCM tokens. Enable notifications first.",
        debug: { totalTokensInDb: allTokens.length, tokens: allTokens.map(t => ({ active: t.isActive, platform: t.platform, updatedAt: t.updatedAt })) },
      });
      return;
    }

    const messaging = getMessagingInstance();
    if (!messaging) {
      const projectId   = process.env["FIREBASE_PROJECT_ID"] ?? process.env["VITE_FIREBASE_PROJECT_ID"] ?? "(not set)";
      const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"] ? "(set)" : "(not set)";
      const privateKey  = process.env["FIREBASE_PRIVATE_KEY"]  ? "(set)" : "(not set)";
      console.error(`[FCM] getMessagingInstance returned null — projectId=${projectId} clientEmail=${clientEmail} privateKey=${privateKey}`);
      res.status(503).json({
        success: false,
        message: "FCM not configured on server. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
        debug: { projectId, clientEmail, privateKey },
      });
      return;
    }

    const appUrl = (process.env["APP_URL"] ?? `${(req as { protocol: string }).protocol}://${(req as { get: (h: string) => string }).get("host")}`).replace(/\/+$/, "");
    const tokenStrings = activeTokens.map(t => t.token);

    console.log(`[FCM] Sending test push to ${tokenStrings.length} token(s) via project=${process.env["FIREBASE_PROJECT_ID"] ?? process.env["VITE_FIREBASE_PROJECT_ID"]}`);

    const result = await messaging.sendEachForMulticast({
      tokens: tokenStrings,
      notification: {
        title: "Test Notification",
        body:  "Push is working! You'll get alerts for orders and updates.",
        imageUrl: `${appUrl}/logo.png`,
      },
      data: { type: "system", url: `${appUrl}/notifications` },
      webpush: {
        notification: {
          icon:  `${appUrl}/logo.png`,
          badge: `${appUrl}/logo.png`,
          tag:   "swiftmart-test",
          requireInteraction: false,
        },
        fcmOptions: { link: `${appUrl}/notifications` },
      },
    });

    const { successCount, failureCount, responses } = result;

    // Log per-token results
    responses.forEach((resp, i) => {
      if (resp.success) {
        console.log(`[FCM] Token[${i}] OK — messageId=${resp.messageId}`);
      } else {
        console.error(`[FCM] Token[${i}] FAILED — code=${resp.error?.code} message=${resp.error?.message}`);
      }
    });

    // Deactivate tokens that Firebase says are stale/invalid
    const staleErrorCodes = new Set([
      "messaging/registration-token-not-registered",
      "messaging/invalid-registration-token",
      "messaging/invalid-argument",
    ]);
    const toDeactivate = responses
      .map((resp, i) => (!resp.success && resp.error?.code && staleErrorCodes.has(resp.error.code) ? tokenStrings[i] : null))
      .filter(Boolean) as string[];

    if (toDeactivate.length > 0) {
      await db.update(fcmTokens).set({ isActive: false, updatedAt: new Date() }).where(inArray(fcmTokens.token, toDeactivate));
      console.log(`[FCM] Deactivated ${toDeactivate.length} stale token(s)`);
    }

    const perTokenErrors = responses
      .filter(r => !r.success)
      .map(r => ({ code: r.error?.code, message: r.error?.message }));

    if (successCount > 0) {
      res.json({ success: true, message: `Test push sent to ${successCount} device(s).`, sent: successCount, failed: failureCount });
    } else {
      res.status(422).json({
        success: false,
        message: "All tokens rejected by Firebase. Your FCM token may be stale — re-enable notifications.",
        sent: 0,
        failed: failureCount,
        errors: perTokenErrors,
      });
    }
  } catch (err: unknown) {
    // Catch-all: log the full exception and return a structured 500 (never reaches global handler)
    const e = err as { code?: string; message?: string; errorInfo?: unknown; stack?: string };
    console.error("[FCM] /test EXCEPTION code=%s message=%s", e?.code, e?.message);
    console.error("[FCM] /test stack:", e?.stack);
    res.status(500).json({
      success: false,
      message: e?.message ?? "FCM send error",
      code: e?.code ?? null,
      errorInfo: e?.errorInfo ?? null,
    });
  }
});

// GET /api/fcm/diagnostics — admin: FCM token health overview
router.get("/diagnostics", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      [{ totalUsers }],
      [{ activeTokens }],
      tokensByRoleRows,
      tokensByPlatformRows,
      lastBroadcastRows,
    ] = await Promise.all([
      db.select({ totalUsers: count() }).from(users),
      db.select({ activeTokens: count() }).from(fcmTokens).where(eq(fcmTokens.isActive, true)),

      db.select({ role: fcmTokens.role, cnt: count() })
        .from(fcmTokens)
        .where(eq(fcmTokens.isActive, true))
        .groupBy(fcmTokens.role),

      db.select({ platform: fcmTokens.platform, cnt: count() })
        .from(fcmTokens)
        .where(eq(fcmTokens.isActive, true))
        .groupBy(fcmTokens.platform),

      db.select().from(adminBroadcasts).orderBy(desc(adminBroadcasts.createdAt)).limit(1),
    ]);

    let allTimePushSent = 0;
    let allTimePushFailed = 0;
    try {
      const [totals] = await db.select({
        allTimeSent:   sum(adminBroadcasts.pushSent),
        allTimeFailed: sum(adminBroadcasts.pushFailed),
      }).from(adminBroadcasts);
      allTimePushSent   = Number(totals?.allTimeSent   ?? 0);
      allTimePushFailed = Number(totals?.allTimeFailed ?? 0);
    } catch { /* columns may be missing in pre-migrated prod */ }

    const tokensByRole: Record<string, number> = {};
    for (const row of tokensByRoleRows) tokensByRole[row.role] = Number(row.cnt);

    const tokensByPlatform: Record<string, number> = {};
    for (const row of tokensByPlatformRows) tokensByPlatform[row.platform] = Number(row.cnt);

    const lastBroadcast = lastBroadcastRows[0] ?? null;

    res.json({
      success: true,
      totalUsers:     Number(totalUsers),
      activeTokens:   Number(activeTokens),
      tokensByRole,
      tokensByPlatform,
      lastBroadcast: lastBroadcast ? {
        title:      lastBroadcast.title,
        pushSent:   lastBroadcast.pushSent ?? 0,
        pushFailed: lastBroadcast.pushFailed ?? 0,
        sentCount:  lastBroadcast.sentCount,
        createdAt:  lastBroadcast.createdAt,
      } : null,
      allTimePushSent,
      allTimePushFailed,
    });
  } catch (err) {
    console.error("[FCM] diagnostics error:", err);
    res.status(500).json({ success: false, message: "Failed to load FCM diagnostics" });
  }
});

export default router;
