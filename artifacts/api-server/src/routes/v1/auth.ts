import { Router, type Request, type Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { db, users, shops, otpSessions, servicePincodes as servicePincodesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";
import { mi } from "../../utils/mapId.js";
import {
  loginLimiter,
  signupLimiter,
  resetPasswordLimiter,
  googleAuthLimiter,
  tokenRefreshLimiter,
} from "../../middlewares/rateLimiter.js";

const googleClient = new OAuth2Client(process.env["GOOGLE_CLIENT_ID"]);
const router = Router();

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

type AuthMode = "otp" | "google" | "both";
const AUTH_MODE: AuthMode = (process.env["AUTH_MODE"] as AuthMode | undefined) ?? "otp";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    profilePhoto: u.profilePhoto ?? null,
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function issueTokens(u: typeof users.$inferSelect) {
  const payload = {
    userId: u.id,
    phone: u.phone,
    role: u.role as "customer" | "vendor" | "admin" | "super_admin",
    tokenVersion: u.tokenVersion ?? 1,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

// ─── GET /api/auth/config ─────────────────────────────────────────────────────
// Returns runtime auth configuration consumed by the frontend.
router.get("/config", async (_req: Request, res: Response): Promise<void> => {
  const firebaseConfig = AUTH_MODE !== "otp" ? {
    apiKey:            process.env["VITE_FIREBASE_API_KEY"]      ?? "",
    authDomain:        process.env["VITE_FIREBASE_AUTH_DOMAIN"]  ?? "",
    projectId:         process.env["VITE_FIREBASE_PROJECT_ID"]   ?? "",
    appId:             process.env["VITE_FIREBASE_APP_ID"]       ?? "",
    messagingSenderId: process.env["FIREBASE_MESSAGING_SENDER_ID"] ?? process.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] ?? "",
  } : null;

  const rawPincodes = process.env["SERVICE_PINCODES"] ?? "733101,733102,733103";
  const envPincodes = rawPincodes.split(",").map(p => p.trim()).filter(Boolean);

  let servicePincodes: Array<{ pincode: string; area: string; state: string }>;
  try {
    const rows = await db.select().from(servicePincodesTable).where(eq(servicePincodesTable.isActive, true));
    if (rows.length > 0) {
      servicePincodes = rows.map(r => ({ pincode: r.pincode, area: r.area, state: r.state }));
    } else {
      servicePincodes = envPincodes.map(p => ({ pincode: p, area: "Balurghat, South Dinajpur", state: "West Bengal" }));
    }
  } catch {
    servicePincodes = envPincodes.map(p => ({ pincode: p, area: "Balurghat, South Dinajpur", state: "West Bengal" }));
  }

  res.json({
    success: true,
    authMode: AUTH_MODE,
    googleClientId: AUTH_MODE !== "otp" ? (process.env["GOOGLE_CLIENT_ID"] ?? "") : "",
    firebaseConfig,
    servicePincodes,
  });
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
// Register a new user with name, mobile number and password.
router.post("/signup", signupLimiter, async (req: Request, res: Response): Promise<void> => {
  const { name, phone, password } = req.body as { name?: string; phone?: string; password?: string };

  if (!name || name.trim().length < 2) {
    res.status(400).json({ success: false, message: "Full name must be at least 2 characters" });
    return;
  }
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    res.status(400).json({ success: false, message: "Valid 10-digit mobile number required" });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    return;
  }

  try {
    // Check phone uniqueness
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    if (existing) {
      res.status(409).json({ success: false, message: "An account with this mobile number already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [user] = await db.insert(users).values({
      name: name.trim(),
      phone,
      passwordHash,
      authProvider: "password",
      role: "customer",
      status: "active",
    }).returning();

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    req.log.info({ phone }, "New user signed up");
    res.status(201).json({
      success: true,
      isNewUser: true,
      ...issueTokens(updated),
      user: formatUser(updated),
    });
  } catch (err) {
    req.log.error({ err, phone }, "Signup failed");
    res.status(500).json({ success: false, message: "Signup failed. Please try again." });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Login with mobile number + password.
// If the user has no password set (existing OTP user), returns needsPasswordSetup=true.
router.post("/login", loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { phone, password } = req.body as { phone?: string; password?: string };

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    res.status(400).json({ success: false, message: "Valid 10-digit mobile number required" });
    return;
  }
  if (!password) {
    res.status(400).json({ success: false, message: "Password required" });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (!user) {
      // Don't reveal whether the account exists
      res.status(401).json({ success: false, message: "Invalid mobile number or password" });
      return;
    }

    if (user.status === "banned") {
      res.status(403).json({ success: false, message: "Your account has been suspended. Please contact support." });
      return;
    }

    // Existing OTP user with no password set
    if (!user.passwordHash) {
      res.status(200).json({
        success: false,
        needsPasswordSetup: true,
        message: "Password not set. Please create a password using Forgot Password.",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid mobile number or password" });
      return;
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    req.log.info({ phone, role: user.role }, "User logged in");
    res.json({
      success: true,
      isNewUser: false,
      ...issueTokens(updated),
      user: formatUser(updated),
    });
  } catch (err) {
    req.log.error({ err, phone }, "Login failed");
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Generate a secure password reset/setup token for a mobile number.
// Always returns success regardless of whether the phone exists (no enumeration).
// Token is logged to server console ONLY — never sent to frontend.
router.post("/forgot-password", resetPasswordLimiter, async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body as { phone?: string };

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    res.status(400).json({ success: false, message: "Valid 10-digit mobile number required" });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (user && user.status !== "banned") {
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      await db.update(users)
        .set({ passwordResetTokenHash: tokenHash, passwordResetExpires: expires })
        .where(eq(users.id, user.id));

      // ⚠️  DEV ONLY — log token to server console. Replace with SMS/email in production.
      req.log.info(
        { phone, tokenExpires: expires.toISOString() },
        `[PASSWORD RESET] Token for +91${phone}: ${token}  (expires in 15 min)`
      );
      // Also print plainly so it's easy to find in dev logs:
      console.log(`\n🔑 PASSWORD RESET TOKEN for +91${phone}:\n   ${token}\n   (expires at ${expires.toISOString()})\n`);
    }

    // Always return success — don't reveal if the phone is registered
    res.json({
      success: true,
      message: "If an account exists for this number, a reset token has been sent.",
    });
  } catch (err) {
    req.log.error({ err, phone }, "Forgot-password failed");
    res.status(500).json({ success: false, message: "Request failed. Please try again." });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
// Validate the reset token and set a new password. Auto-logs the user in on success.
router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  const { phone, token, newPassword } = req.body as { phone?: string; token?: string; newPassword?: string };

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    res.status(400).json({ success: false, message: "Valid 10-digit mobile number required" });
    return;
  }
  if (!token || token.length < 10) {
    res.status(400).json({ success: false, message: "Reset token required" });
    return;
  }
  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpires) {
      res.status(400).json({ success: false, message: "Invalid or expired reset token" });
      return;
    }

    if (user.passwordResetExpires < new Date()) {
      res.status(400).json({ success: false, message: "Reset token has expired. Please request a new one." });
      return;
    }

    const providedHash = hashToken(token);
    if (providedHash !== user.passwordResetTokenHash) {
      res.status(400).json({ success: false, message: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await db.update(users)
      .set({
        passwordHash,
        authProvider: "password",
        passwordResetTokenHash: null,
        passwordResetExpires: null,
        tokenVersion: (user.tokenVersion ?? 1) + 1, // revoke all old sessions
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    req.log.info({ phone }, "Password reset successful");
    res.json({
      success: true,
      message: "Password set successfully",
      isNewUser: false,
      ...issueTokens(updated),
      user: formatUser(updated),
    });
  } catch (err) {
    req.log.error({ err, phone }, "Reset-password failed");
    res.status(500).json({ success: false, message: "Password reset failed. Please try again." });
  }
});

// ─── POST /api/auth/google ────────────────────────────────────────────────────
router.post("/google", googleAuthLimiter, async (req: Request, res: Response): Promise<void> => {
  if (AUTH_MODE === "otp") {
    res.status(403).json({ success: false, message: "Google login is not enabled." });
    return;
  }
  const { credential, accessToken: googleAccessToken } = req.body as { credential?: string; accessToken?: string };
  if (!credential && !googleAccessToken) {
    res.status(400).json({ success: false, message: "Google credential token required" });
    return;
  }
  try {
    let email: string | undefined;
    let name: string | undefined;
    let googleId: string | undefined;
    let profilePhoto: string | undefined;

    if (credential) {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env["GOOGLE_CLIENT_ID"] });
      const payload = ticket.getPayload();
      if (!payload?.email) { res.status(400).json({ success: false, message: "Invalid Google token" }); return; }
      email = payload.email;
      name = payload.name;
      googleId = payload.sub;
      profilePhoto = payload.picture;
    } else {
      const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      if (!resp.ok) { res.status(400).json({ success: false, message: "Invalid Google access token" }); return; }
      const info = await resp.json() as { email?: string; name?: string; sub?: string; picture?: string };
      if (!info.email) { res.status(400).json({ success: false, message: "Could not retrieve Google user info" }); return; }
      email = info.email;
      name = info.name;
      googleId = info.sub;
      profilePhoto = info.picture;
    }

    if (!email || !googleId) { res.status(400).json({ success: false, message: "Invalid Google token" }); return; }

    let [user] = await db.select().from(users).where(or(eq(users.googleId, googleId), eq(users.email, email))).limit(1);
    const isNewUser = !user;

    if (!user) {
      [user] = await db.insert(users).values({
        name: name ?? "User",
        email,
        googleId,
        phone: `g_${googleId}`,
        role: "customer",
        status: "active",
        authProvider: "google",
        profilePhoto: profilePhoto ?? null,
      }).returning();
    } else {
      // Link Google ID and update profile photo if not already set
      await db.update(users).set({
        googleId: user.googleId ?? googleId,
        profilePhoto: user.profilePhoto ?? profilePhoto ?? null,
        authProvider: user.authProvider === "otp" ? "google" : user.authProvider,
      }).where(eq(users.id, user.id));
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    res.json({
      success: true,
      isNewUser,
      ...issueTokens(updated),
      user: formatUser(updated),
    });
  } catch (err) {
    req.log.error({ err }, "Google auth failed");
    const msg = err instanceof Error ? err.message : "Google authentication failed";
    res.status(401).json({ success: false, message: msg });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post("/refresh", tokenRefreshLimiter, async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) { res.status(400).json({ success: false, message: "Refresh token required" }); return; }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user || user.status !== "active") { res.status(401).json({ success: false, message: "User not found or banned" }); return; }
    if ((user.tokenVersion ?? 1) !== (payload.tokenVersion ?? 1)) {
      res.status(401).json({ success: false, message: "Session has been revoked. Please log in again." });
      return;
    }
    res.json({ success: true, ...issueTokens(user) });
  } catch (err) {
    req.log.error({ err }, "Token refresh failed");
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
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
  } catch (err) {
    req.log.error({ err }, "GET /me failed");
    res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    await db.update(users)
      .set({ tokenVersion: (req.user!.tokenVersion ?? 1) + 1 })
      .where(eq(users.id, userId));
    req.log.info({ userId }, "User logged out — tokens revoked");
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    req.log.error({ err, userId: req.user?.userId }, "Logout DB update failed");
    res.status(500).json({ success: false, message: "Logout failed. Please try again." });
  }
});

// ─── Legacy OTP routes (removed — kept as 410 Gone for graceful degradation) ──
router.post("/send-otp", (_req: Request, res: Response): void => {
  res.status(410).json({ success: false, message: "OTP login is no longer supported. Please use mobile number + password." });
});
router.post("/verify-otp", (_req: Request, res: Response): void => {
  res.status(410).json({ success: false, message: "OTP login is no longer supported. Please use mobile number + password." });
});

// Suppress unused import warning for otpSessions (still in DB, kept for backward compat)
void otpSessions;
void mi;

export default router;
