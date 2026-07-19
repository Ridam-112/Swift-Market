# SwiftMart

A full-stack grocery delivery platform with vendor management, order tracking, live rider GPS, and an Android app (Capacitor).

## Stack

- **Frontend:** React + Vite (port 5000) — `artifacts/swiftmart/`
- **API server:** Express + TypeScript, built with esbuild (port 8080) — `artifacts/api-server/`
- **Database:** PostgreSQL via Drizzle ORM — `lib/db/`
- **Shared libs:** `lib/api-zod/`, `lib/api-client-react/`, `lib/api-spec/`

## How to run

The **"Start application"** workflow handles everything:
1. Builds the API server via esbuild
2. Starts API on port 8080
3. Starts the Vite dev server on port 5000

After a fresh clone or environment reset, run this recovery sequence once:
```bash
pnpm install                    # install all dependencies
cd lib/db && pnpm drizzle-kit push   # push schema to the database
```
Then restart the "Start application" workflow.

> **Note:** The artifact-specific workflows (`artifacts/api-server: API Server`, `artifacts/swiftmart: web`) will always fail with EADDRINUSE — they share ports with the main workflow. This is expected; use "Start application" only.

## Required secrets

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Auto-provisioned by Replit PostgreSQL |
| `JWT_SECRET` | Access token signing (64-byte hex) |
| `JWT_REFRESH_SECRET` | Refresh token signing (64-byte hex) |

Run `node scripts/check-secrets.mjs` to see full secret status.

## Optional secrets (features degrade gracefully)

- **Google OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID`
- **FCM push notifications:** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- **Payments (Razorpay):** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- **Image uploads (Cloudinary):** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **OTP SMS (2factor.in):** `TWO_FACTOR_API_KEY`
- **Supabase Storage:** configured via `@supabase/storage-js`

## User preferences

- Maintain existing project structure — do not restructure or migrate
- Keep OTP_MODE=demo in development (set TWO_FACTOR_API_KEY for real OTP)
