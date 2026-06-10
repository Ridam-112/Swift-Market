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

// Per-phone: 2 OTP requests per 10 minutes in production.
// In dev, raised to 20 per minute so testing isn't blocked.
export const otpPhoneLimiter = makeRateLimiter({
  windowMs: isDev ? 60 * 1000 : 10 * 60 * 1000,
  max: isDev ? 20 : 2,
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
