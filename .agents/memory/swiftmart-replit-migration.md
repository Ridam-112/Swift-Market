---
name: Replit migration secrets
description: All secrets and env vars needed to run SwiftMart on Replit; port conflict behavior of artifact workflows
---

# SwiftMart — Replit Migration

**Why:** Migrated from Replit Agent to Replit environment. Needed pnpm install + secrets wired up.

**How to apply:** Run `node scripts/check-secrets.mjs` any time to verify secret status.

## Required secrets (app crashes without these)
- DATABASE_URL — auto-provisioned by Replit PostgreSQL
- JWT_SECRET — random 64-byte hex
- JWT_REFRESH_SECRET — random 64-byte hex

## Optional secrets (features degrade gracefully without them)
- Google Auth: GOOGLE_CLIENT_ID, VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID
- Firebase Admin (FCM push): FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
- OTP SMS: TWO_FACTOR_API_KEY (2factor.in)
- Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- Razorpay: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
- VAPID: VAPID_PRIVATE_KEY (public key set as env var VAPID_PUBLIC_KEY)

## Port conflict behavior (expected, not a bug)
The "Start application" workflow runs both API server (8080) and frontend (5000).
The artifact-specific workflows (`artifacts/api-server: API Server`, `artifacts/swiftmart: web`) will always fail with EADDRINUSE — they try to start on the same ports. This is normal.
