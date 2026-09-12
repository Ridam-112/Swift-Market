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

function getAuthIdentifier(req: Request): string {
  const body = req.body as { phone?: string; email?: string } | undefined;
  if (body?.email && typeof body.email === "string" && body.email.trim()) {
    return `email:${body.email.toLowerCase().trim()}`;
  }
  if (body?.phone && typeof body.phone === "string" && body.phone.trim()) {
    return `phone:${body.phone.trim()}`;
  }
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || "unknown";
  return `ip:${ip}`;
}

// ─── OTP limiters (kept for backward compat, no longer used in routes) ────────
export const otpPhoneLimiter = makeRateLimiter({
  windowMs: isDev ? 60 * 1000 : 10 * 60 * 1000,
  max: isDev ? 50 : 10,
  keyFn: (req) => `otp:${getAuthIdentifier(req)}`,
  message: "Too many OTP requests. Please wait 10 minutes before trying again.",
});

export const otpIpLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 30,
      keyFn: (req) => `otp:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many OTP requests from your network. Please wait 10 minutes before trying again.",
    });

// ─── Password login limiter ───────────────────────────────────────────────────
// Per-user (email or phone or IP): 30 attempts per 15 minutes.
export const loginLimiter = makeRateLimiter({
  windowMs: isDev ? 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 200 : 30,
  keyFn: (req) => `login:${getAuthIdentifier(req)}`,
  message: "Too many login attempts. Please wait a few minutes before trying again.",
});

// ─── Signup limiter ───────────────────────────────────────────────────────────
// Per-IP: 20 signups per 15 minutes in production.
export const signupLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 20,
      keyFn: (req) => `signup:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many signup attempts. Please wait 15 minutes before trying again.",
    });

// ─── Password reset limiter ───────────────────────────────────────────────────
// Per-user (email or phone): 10 reset requests per 15 minutes.
export const resetPasswordLimiter = makeRateLimiter({
  windowMs: isDev ? 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 50 : 10,
  keyFn: (req) => `reset:${getAuthIdentifier(req)}`,
  message: "Too many password reset requests. Please wait 15 minutes before trying again.",
});

// ─── Global API limiter ───────────────────────────────────────────────────────
export const globalApiLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 2000,
      keyFn: (req) => `api:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many requests. Please slow down and try again in a few minutes.",
    });

// ─── OTP Verification limiter (kept for compat) ───────────────────────────────
export const verifyOtpLimiter = makeRateLimiter({
  windowMs: isDev ? 60 * 1000 : 10 * 60 * 1000,
  max: isDev ? 50 : 10,
  keyFn: (req) => `verify:phone:${(req.body as { phone?: string })?.phone ?? "unknown"}`,
  message: "Too many verification attempts for this number. Please wait 10 minutes.",
});

// ─── Google auth limiter ──────────────────────────────────────────────────────
export const googleAuthLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 20,
      keyFn: (req) => `google:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many Google login attempts. Please wait 15 minutes before trying again.",
    });

// ─── Token refresh limiter ────────────────────────────────────────────────────
export const tokenRefreshLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 30,
      keyFn: (req) => `refresh:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many token refresh requests. Please wait 15 minutes.",
    });

// ─── Order placement limiter ──────────────────────────────────────────────────
export const orderLimiter = makeRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 100 : 10,
  keyFn: (req) => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    return `order:user:${userId ?? req.ip ?? "unknown"}`;
  },
  message: "You are placing orders too quickly. Please wait a few minutes before trying again.",
});

// ─── Coupon validation limiter ─────────────────────────────────────────────────
export const couponValidateLimiter = isDev
  ? (_req: Request, _res: Response, next: NextFunction): void => next()
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 30,
      keyFn: (req) => `coupon:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
      message: "Too many coupon attempts. Please wait 15 minutes before trying again.",
    });

// ─── Vendor write limiter ──────────────────────────────────────────────────────
export const vendorWriteLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 50,
  keyFn: (req) => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    return `vendor:write:${userId ?? req.ip ?? "unknown"}`;
  },
  message: "Too many product updates. Please slow down and try again in 15 minutes.",
});

// ─── Upload limiter ────────────────────────────────────────────────────────────
export const uploadLimiter = makeRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 200 : 20,
  keyFn: (req) => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    return `upload:user:${userId ?? req.ip ?? "unknown"}`;
  },
  message: "Upload limit reached. You can upload up to 20 images per hour.",
});

// ─── Truecaller auth limiter ───────────────────────────────────────────────────
export const truecallerAuthLimiter = isDev
  ? makeRateLimiter({ windowMs: 60 * 1000, max: 100, keyFn: (req) => `tc:${req.ip ?? "unknown"}`, message: "Too many requests." })
  : makeRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 20,
      keyFn: (req) => `tc:${req.ip ?? "unknown"}`,
      message: "Too many Truecaller login attempts. Please try again in 15 minutes.",
    });
