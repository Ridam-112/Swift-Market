---
name: FCM Push Migration
description: Replaced VAPID/web-push with Firebase Cloud Messaging — what secrets are needed and what was wired where.
---

## What changed
- Old VAPID/web-push system (routes `/api/push/*`, `webpush` util) is still in place for backward compat but the frontend no longer calls it.
- New FCM system is the active push path for all user roles.

## Required secrets (must be set before push works)
| Secret | Source |
|---|---|
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project Settings → Service Accounts → Generate new private key |
| `FIREBASE_PRIVATE_KEY` | Same JSON — the `private_key` field (paste with literal `\n`, the backend converts them) |
| `FIREBASE_VAPID_KEY` | Firebase Console → Project Settings → Cloud Messaging → Web push certificates → Key pair |
| `VITE_FIREBASE_PROJECT_ID` | Already set — reused by backend via `firebase-admin.ts` |

## Key files
- `artifacts/api-server/src/lib/firebase-admin.ts` — lazy-init Admin SDK; returns null if secrets missing (non-fatal)
- `artifacts/api-server/src/routes/v1/fcm.ts` — GET /config, POST /register-token, POST /unregister-token, POST /test, GET /diagnostics
- `artifacts/api-server/src/utils/notification.ts` — sendFcm/sendFcmToUsers replace webpush; `sendPushToUsers` export alias kept
- `artifacts/swiftmart/src/lib/fcm.ts` — registerFcmToken/unregisterFcmToken/getFcmState
- `artifacts/swiftmart/public/firebase-messaging-sw.js` — compat importScripts SW, receives FCM_INIT via postMessage
- `lib/db/src/schema/fcmTokens.ts` — fcm_tokens table (pushed to DB)

## Behavior without secrets
- App starts normally, push routes respond but return 503 with a clear message
- The Enable button still works from the frontend perspective (token is stored in DB) but delivery fails until secrets are set

**Why:** FCM is more reliable than VAPID/web-push for Android/Chrome — no subscription expiry, works through Capacitor/mobile, single token across tabs.
