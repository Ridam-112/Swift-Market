---
name: Capacitor CORS fix
description: Android WebView (Capacitor) uses origin 'https://localhost' — must be whitelisted in production CORS config
---

## The rule
`artifacts/api-server/src/app.ts` CORS config must always allow `https://localhost` and `capacitor://localhost` explicitly, regardless of `ALLOWED_ORIGINS`.

## Why
In production (`NODE_ENV=production`) the dev bypass is skipped. Capacitor's Android WebView sends every request (including preflight OPTIONS) with `origin: https://localhost`. Without an explicit allowlist entry this hits the reject branch and returns 500, silently blocking all API calls — including OTP send — on the APK.

## How to apply
The three Capacitor origins (`https://localhost`, `capacitor://localhost`, `http://localhost`) are whitelisted via a `CAPACITOR_ORIGINS` Set checked before `allowedOrigins`. This is safe — they are internal loopback addresses, not real internet origins.

## Second bug: deployed website also blocked
The `cors` npm package's `origin` callback receives `(origin, cb)` — NO `req` access. So same-origin detection via `req.headers.x-forwarded-host` is impossible inside it. Browsers send `Origin` on same-origin POST+JSON requests too, so the deployed website's own origin (`https://xxx.replit.app`) was blocked because `ALLOWED_ORIGINS` was empty.

**Fix**: Replaced `app.use(cors({...}))` with a custom inline middleware that has full `req` access. Logic: (1) no origin → allow, (2) dev → allow all, (3) CAPACITOR_ORIGINS → allow, (4) same-origin via `x-forwarded-host`/`x-forwarded-proto` → allow, (5) configuredOrigins → allow, else reject.

## Symptom pattern
Deployment logs show: `CORS: origin 'https://localhost' not allowed` on APK; or zero `send-otp` POST hits on deployed website (GET config works, POST fails silently).
