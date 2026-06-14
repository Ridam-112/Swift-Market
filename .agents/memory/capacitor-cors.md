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

## Symptom pattern
Deployment logs show: `CORS: origin 'https://localhost' not allowed` on every OPTIONS preflight to `/api/auth/send-otp`.
