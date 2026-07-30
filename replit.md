# SwiftMart

A full-stack grocery delivery platform with vendor management, order tracking, live rider GPS, and an Android app (Capacitor).

## Stack

- **Frontend:** React + Vite (port 5000) — `artifacts/swiftmart/`
- **API server:** Express + TypeScript, built with esbuild (port 8080) — `artifacts/api-server/`
- **Database:** PostgreSQL (Replit) + Neon shards via Drizzle ORM — `lib/db/`
- **Shared libs:** `lib/api-zod/`, `lib/api-client-react/`, `lib/api-spec/`

## How to run

The **"Start application"** workflow handles everything:
1. Builds the API server via esbuild
2. Starts API on port 8080
3. Starts the Vite dev server on port 5000

After a fresh clone or environment reset, run this recovery sequence once:
```bash
pnpm install                         # install all dependencies
cd lib/db && pnpm drizzle-kit push   # push schema to DATABASE1_URL (Neon primary)
```
Then restart the "Start application" workflow.

> **Note:** The artifact-specific workflows (`artifacts/api-server: API Server`, `artifacts/swiftmart: web`) will always fail with EADDRINUSE — they share ports with the main workflow. This is expected; use "Start application" only.

## Admin login

Two super-admin accounts are seeded automatically on startup:
- **Email:** thrid5564@gmail.com — has password set, can log in at `/auth`
- **Phone:** 7602584238 — OTP-only (requires real TWO_FACTOR_API_KEY or Android app)

## Required secrets

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Auto-provisioned by Replit PostgreSQL |
| `JWT_SECRET` | Access token signing (64-byte hex) |
| `JWT_REFRESH_SECRET` | Refresh token signing (64-byte hex) |

Run `node scripts/check-secrets.mjs` to see full secret status.

## Secrets status (last verified: 2026-07-30)

| Group | Status |
|-------|--------|
| Core JWT + DB | ✅ All set |
| Neon DB shards (DATABASE1–5_URL) | ✅ All set |
| Google OAuth + Firebase | ✅ All set |
| FCM push (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) | ✅ Set |
| OTP SMS (TWO_FACTOR_API_KEY) | ✅ Set — OTP_MODE=real (env var) |
| Truecaller (TRUECALLER_APP_KEY) | ✅ Set |
| ImageKit uploads (IMAGEKIT_PUBLIC/PRIVATE_KEY, URL_ENDPOINT) | ✅ Set |
| Razorpay payments | ❌ Not yet configured — checkout will fail |
| Password-reset emails (RESEND_API_KEY) | ✅ Set |
| VAPID + Firebase VAPID push | ✅ Set |

## Optional secrets (features degrade gracefully)

- **Google OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
- **FCM push notifications:** `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_VAPID_KEY`
- **Payments (Razorpay):** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- **Image uploads (ImageKit):** `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`
- **OTP SMS (2factor.in):** `TWO_FACTOR_API_KEY`
- **Truecaller login:** `TRUECALLER_APP_KEY` (Android mobile only)
- **Password-reset emails:** `RESEND_API_KEY`

## User preferences

- Maintain existing project structure — do not restructure or migrate
- Keep OTP_MODE=demo in development (set TWO_FACTOR_API_KEY for real OTP)
- Truecaller button shown only on Android mobile (not desktop, not iOS)
