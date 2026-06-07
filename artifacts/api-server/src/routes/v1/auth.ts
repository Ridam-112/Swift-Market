import { Router, type Request, type Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { db, users, shops, otpSessions } from "@workspace/db";
import { eq, or, and, lt } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";
import { mi } from "../../utils/mapId.js";
import { otpPhoneLimiter, otpIpLimiter } from "../../middlewares/rateLimiter.js";

const googleClient = new OAuth2Client(process.env["GOOGLE_CLIENT_ID"]);
const router = Router();
const DEMO_OTP = process.env["OTP_DEMO_CODE"] ?? "123456";

function formatUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    _id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email ?? "",
    role: u.role,
    status: u.status,
    vendorStatus: u.vendorStatus,
    pincode: u.pincode ?? "",
    addresses: (u.addresses as unknown[]) ?? [],
  };
}

// GET /api/auth/config
router.get("/config", (_req: Request, res: Response): void => {
  res.json({ success: true, googleClientId: process.env["GOOGLE_CLIENT_ID"] ?? "" });
});

// POST /api/auth/google
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  const { credential, accessToken: googleAccessToken } = req.body as { credential?: string; accessToken?: string };
  if (!credential && !googleAccessToken) {
    res.status(400).json({ success: false, message: "Google credential token required" });
    return;
  }
  try {
    let email: string | undefined;
    let name: string | undefined;
    let googleId: string | undefined;

    if (credential) {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env["GOOGLE_CLIENT_ID"] });
      const payload = ticket.getPayload();
      if (!payload?.email) { res.status(400).json({ success: false, message: "Invalid Google token" }); return; }
      email = payload.email; name = payload.name; googleId = payload.sub;
    } else {
      const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      if (!resp.ok) { res.status(400).json({ success: false, message: "Invalid Google access token" }); return; }
      const info = await resp.json() as { email?: string; name?: string; sub?: string };
      if (!info.email) { res.status(400).json({ success: false, message: "Could not retrieve Google user info" }); return; }
      email = info.email; name = info.name; googleId = info.sub;
    }

    if (!email || !googleId) { res.status(400).json({ success: false, message: "Invalid Google token" }); return; }

    let [user] = await db.select().from(users).where(or(eq(users.googleId, googleId), eq(users.email, email))).limit(1);
    const isNewUser = !user;

    if (!user) {
      [user] = await db.insert(users).values({
        name: name ?? "User", email, googleId, phone: `g_${googleId}`, role: "customer", status: "active",
      }).returning();
    } else if (!user.googleId) {
      await db.update(users).set({ googleId }).where(eq(users.id, user.id));
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    const tokenPayload = { userId: updated.id, phone: updated.phone, role: updated.role as any };
    res.json({ success: true, isNewUser, accessToken: signAccessToken(tokenPayload), refreshToken: signRefreshToken(tokenPayload), user: formatUser(updated) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Google authentication failed";
    res.status(401).json({ success: false, message: msg });
  }
});

// POST /api/auth/send-otp
router.post("/send-otp", otpIpLimiter, otpPhoneLimiter, async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body as { phone?: string };
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    res.status(400).json({ success: false, message: "Valid 10-digit phone number required" });
    return;
  }
  try {
    await db.delete(otpSessions).where(eq(otpSessions.phone, phone));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.insert(otpSessions).values({ phone, otp: DEMO_OTP, expiresAt });
    req.log.info({ phone }, "OTP sent (demo)");
    res.json({ success: true, message: "OTP sent successfully" });
  } catch {
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req: Request, res: Response): Promise<void> => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };
  if (!phone || !otp) { res.status(400).json({ success: false, message: "Phone and OTP required" }); return; }
  try {
    const [session] = await db.select().from(otpSessions)
      .where(and(eq(otpSessions.phone, phone), eq(otpSessions.verified, false)))
      .orderBy(otpSessions.createdAt)
      .limit(1);

    if (!session || session.otp !== otp || session.expiresAt < new Date()) {
      res.status(400).json({ success: false, message: "Invalid or expired OTP" });
      return;
    }
    await db.delete(otpSessions).where(eq(otpSessions.id, session.id));

    let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    const isNewUser = !user;
    if (!user) {
      [user] = await db.insert(users).values({ phone, name: "User", role: "customer" }).returning();
    }
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    const payload = { userId: updated.id, phone: updated.phone, role: updated.role as any };
    res.json({ success: true, isNewUser, accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload), user: formatUser(updated) });
  } catch {
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) { res.status(400).json({ success: false, message: "Refresh token required" }); return; }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user || user.status !== "active") { res.status(401).json({ success: false, message: "User not found or banned" }); return; }
    const newPayload = { userId: user.id, phone: user.phone, role: user.role as any };
    res.json({ success: true, accessToken: signAccessToken(newPayload), refreshToken: signRefreshToken(newPayload) });
  } catch {
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }

    let vendorProfile: Record<string, unknown> | undefined;
    if (user.vendorStatus === "approved" || user.vendorStatus === "pending") {
      const [shop] = await db.select({
        shopName: shops.shopName, category: shops.category, shopType: shops.shopType,
        description: shops.description, upiId: shops.upiId, bankAccountNumber: shops.bankAccountNumber,
        bankIfscCode: shops.bankIfscCode, panNumber: shops.panNumber, gstNumber: shops.gstNumber,
      }).from(shops).where(eq(shops.ownerId, user.id)).limit(1);
      if (shop) {
        vendorProfile = {
          storeName: shop.shopName, storeCategory: shop.category ?? shop.shopType,
          storeDescription: shop.description ?? "", upiId: shop.upiId,
          bankAccountNumber: shop.bankAccountNumber, bankIfscCode: shop.bankIfscCode,
          panNumber: shop.panNumber, gstNumber: shop.gstNumber ?? "",
        };
      }
    }

    res.json({ success: true, user: { ...formatUser(user), addresses: (user.addresses as unknown[]) ?? [], vendorProfile } });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
});

// POST /api/auth/logout
router.post("/logout", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    req.log.info({ userId: req.user!.userId }, "User logged out");
    res.json({ success: true, message: "Logged out successfully" });
  } catch {
    res.json({ success: true, message: "Logged out" });
  }
});

export default router;
