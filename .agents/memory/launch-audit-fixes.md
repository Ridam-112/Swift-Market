---
name: Launch Audit Fixes
description: Patterns and decisions from fixing all launch audit bugs; pre-existing TypeScript issues in backend routes
---

# Launch Audit Fixes

## Pre-existing Drizzle TypeScript errors
The backend has `TS2769: No overload matches this call` errors in ALL route files (shops.ts, users.ts, orders.ts, etc.). These are a known Drizzle + Express TypeScript version incompatibility — `eq(column, req.params["id"])` triggers the error. They do NOT affect runtime since the build uses esbuild. Frontend (`swiftmart`) typechecks clean.

**Why:** The project was already shipping with these errors before any changes. Do not chase them with workarounds.

## Payment flow: server-side amount
`POST /payments/create-order` now accepts `items: [{productId, qty}]` instead of `amount`. Server fetches DB prices, computes total, creates Razorpay order. Frontend passes items, not amount. `razorpayOrderId` is stored in DB order at creation so webhooks can reconcile abandoned payments.

**Why:** Prevents client-side price tampering (C3 critical bug).

## Order financial reversals
`reverseOrderFinancials()` in orders.ts handles both payout cancellation and coupon decrement atomically when an order is cancelled or refunded. Guard: check `wasAlreadyTerminal` before calling to prevent double-reversals.

## Notification limit
`NOTIFICATION_LIMIT` raised from 10 to 50 in `notification.ts`. Notifications route supports `?page=&limit=` pagination (max 50 per page).

## VAPID keys
Generated and stored as shared env vars `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. The webpush lib at `artifacts/api-server/src/lib/webpush.ts` reads them from these env vars. `VAPID_SUBJECT` defaults to `mailto:admin@swiftmart.com` if not set.

## SSL warning (L9)
`pg-connection-string` emits a warning about deprecated sslmode values when parsing DATABASE_URL. The warning is cosmetic — SSL IS working. Fixed by adding `ssl: { rejectUnauthorized: false }` to the Pool config in `lib/db/src/index.ts`, triggered when the URL contains "neon" or "sslmode=require".

## Razorpay webhook raw body
Raw body is captured via the `verify` callback on `express.json()` in `app.ts`. Captured only for `/payments/webhook` URL. Stored as `req.rawBody: Buffer`.
