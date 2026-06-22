import { type Request, type Response, type NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

const isDev = process.env["NODE_ENV"] !== "production";

function makeRateLimiter(opts: { windowMs: number; max: number; keyFn: (req: Request) => string; message: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = opts.keyFn(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    if (entry.count >= opts.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.status(429).json({ success: false, message: opts.message, retryAfter });
      return;
    }

    entry.count += 1;
    next();
  };
}

// Per-phone: 5 OTP requests per 10 minutes in production.
// In dev, raised to 50 per minute so testing isn't blocked.
export const otpPhoneLimiter = makeRateLimiter({
  windowMs: isDev ? 60 * 1000 : 10 * 60 * 1000,
  max: isDev ? 50 : 5,
  keyFn: (req) => `otp:phone:${(req.body as { phone?: string })?.phone ?? "unknown"}`,
  message: "Too many OTP requests for this number. Please wait 10 minutes before trying again.",
});

// Per-IP: 10 OTP requests per 15 minutes (catches multi-phone abuse from one device).
// Skipped in dev — Replit's reverse proxy makes all traffic share one IP,
// so the IP limiter would permanently block all OTP sends during development.
export const otpIpLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 10,
      keyFn: (req) => `otp:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many OTP requests from your network. Please wait 10 minutes before trying again.",
    });

// Global API limiter — broad abuse protection across all endpoints.
// 2000 requests per 15 minutes per IP in production; effectively unlimited in dev.
// NOTE: Replit proxies all traffic through a shared IP so the limit must be high
// enough to cover all concurrent users, not just one.
export const globalApiLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 2000,
      keyFn: (req) => `api:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many requests. Please slow down and try again in a few minutes.",
    });

// ─── OTP Verification limiter ────────────────────────────────────────────────
// HTTP-layer defense for /verify-otp in addition to the DB-level attempt counter
// (MAX_VERIFY_ATTEMPTS=5 deletes the session on 5th failure).
// Keyed per-phone so bots can't hammer the endpoint across sessions.
// 10 per 10 min = room for 2 OTP requests × 5 attempts each, plus some buffer.
// In dev: relaxed to 50 per minute.
export const verifyOtpLimiter = makeRateLimiter({
  windowMs: isDev ? 60 * 1000 : 10 * 60 * 1000,
  max: isDev ? 50 : 10,
  keyFn: (req) => `verify:phone:${(req.body as { phone?: string })?.phone ?? "unknown"}`,
  message: "Too many verification attempts for this number. Please wait 10 minutes.",
});

// ─── Google auth limiter ─────────────────────────────────────────────────────
// Prevents token-spray attacks on /google (attacker tries many stolen Google tokens).
// Per-IP: 20 per 15 minutes in production. Skipped in dev (shared Replit IP issue).
export const googleAuthLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 20,
      keyFn: (req) => `google:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many Google login attempts. Please wait 15 minutes before trying again.",
    });

// ─── Token refresh limiter ───────────────────────────────────────────────────
// Prevents token-flooding on /refresh (attacker with stolen refresh token spams
// the endpoint to keep a valid access token alive).
// Per-IP: 30 per 15 minutes in production. Skipped in dev (shared Replit IP issue).
export const tokenRefreshLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 30,
      keyFn: (req) => `refresh:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many token refresh requests. Please wait 15 minutes.",
    });

// ─── Order placement limiter ─────────────────────────────────────────────────
// Prevents a compromised account or bot from flooding the system with orders.
// Keyed per authenticated user ID: 10 orders per 10 minutes.
// Falls back to IP if user ID unavailable. Always active (even in dev) because
// the key is user-scoped, not IP-scoped, so Replit's shared-IP issue doesn't apply.
export const orderLimiter = makeRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 100 : 10,
  keyFn: (req) => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    return `order:user:${userId ?? req.ip ?? "unknown"}`;
  },
  message: "You are placing orders too quickly. Please wait a few minutes before trying again.",
});

// ─── Coupon validation limiter ────────────────────────────────────────────────
// Prevents brute-forcing coupon codes by trying many random strings.
// Per-IP: 30 attempts per 15 minutes in production.
// Skipped in dev (Replit shared-IP issue).
export const couponValidateLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 30,
      keyFn: (req) => `coupon:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many coupon attempts. Please wait 15 minutes before trying again.",
    });

// ─── Vendor write limiter ─────────────────────────────────────────────────────
// Prevents a vendor from spamming product creates/updates (e.g. bulk fake listings).
// Per authenticated vendor ID: 50 write operations per 15 minutes.
// User-scoped, so active in all environments.
export const vendorWriteLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 50,
  keyFn: (req) => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    return `vendor:write:${userId ?? req.ip ?? "unknown"}`;
  },
  message: "Too many product updates. Please slow down and try again in 15 minutes.",
});

// ─── Upload limiter ───────────────────────────────────────────────────────────
// Image uploads hit Cloudinary and are expensive. Cap at 20 uploads per hour
// per authenticated user to prevent abuse / cost attacks.
// User-scoped, so active in all environments.
export const uploadLimiter = makeRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 200 : 20,
  keyFn: (req) => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    return `upload:user:${userId ?? req.ip ?? "unknown"}`;
  },
  message: "Upload limit reached. You can upload up to 20 images per hour.",
});
