---
name: Pincode & Notifications implementation
description: Covers the pincode filtering system and notification system added to SwiftMart
---

## Pincode Filtering

**Rule:** User's top-level `pincode` field (separate from `addresses[].pincode`) drives shop/product filtering.

**Backend changes:**
- `User` model: added `pincode?: string` top-level field
- `/auth/me` and `/auth/verify-otp` responses now include `pincode`
- `PATCH /users/me/profile` now allows `pincode` in allowed fields
- `GET /shops` accepts `?pincode=` query param filtering on `address.pincode`
- `GET /products` accepts `?pincode=` query param — looks up approved shop IDs with matching pincode, then filters products

**Frontend changes:**
- `User` type in `types/index.ts` has `pincode?: string`
- `AuthContext` maps `pincode` from API, exposes `updatePincode(pincode)` function
- `ShopsContext` reads `auth.user.pincode`; if set and not admin, filters client-side to matching pincode; admin sees all
- `ProductsContext` waits for `authLoading` to finish, then passes `?pincode=` to `/products` API
- `PincodeSelector` component — full-screen overlay (compact prop for inline use in Profile)
- `PincodeGuard` in `App.tsx` wraps `ProtectedLayout`; shows `PincodeSelector` if `role === 'customer'` with no pincode
- Profile page has "Your Area" section with inline `PincodeSelector` for changing
- Supported pincodes: `733101` (Balurghat) and `733103` (Gangarampur)

**Why:** Admin always sees all data regardless of pincode. Vendors are not pincode-gated (they have their own shop pincode). Only customers are gated.

## Notification System

**Backend models:**
- `Notification` model unchanged — per-user records
- New `AdminBroadcast` model — tracks admin send history (title, message, targetAudience, sentCount, createdAt)

**Backend routes (`/api/notifications`):**
- `GET /` — user's own notifications + `unreadCount` field added to response
- `PATCH /read-all` — mark all as read
- `PATCH /:id/read` — mark one as read
- `POST /broadcast` — admin only; fans out to matching users; creates `AdminBroadcast` record
- `GET /broadcasts` — admin only; returns send history

**Order lifecycle notifications (in `orders.ts`):**
- `POST /orders` → notify customer (order placed) + notify shop owner (new order)
- `PATCH /:id/status` → notify customer of status change
- `POST /:id/refund` → notify customer of refund

**Frontend:**
- `Header.tsx` — bell icon with unread badge; polls every 30s; shown for customer + vendor roles
- `/notifications` page — lists notifications, mark-all-read, per-item mark-read on click, type icons
- Admin panel → "Notifications" tab — compose form (audience picker: all/customers/vendors/specific user) + broadcast history table

**How to apply:** `AdminBroadcast` is for history only. Actual delivery is per-user `Notification` records (fan-out on write). Do not change this pattern without considering large user bases.
