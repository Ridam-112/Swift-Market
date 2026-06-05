---
name: Web Push Notifications
description: How push notifications are implemented on top of the existing in-app notification system in SwiftMart.
---

# Web Push Notifications

## Architecture
- In-app notifications (MongoDB `Notification` model, polling every 30s) were already built.
- Push notifications layer on top: every call to `createNotificationLimited()` also fires `sendPush()`.
- Uses `web-push` npm package with VAPID keys stored as env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).

## Key files
- Backend model: `artifacts/api-server/src/models/PushSubscription.ts`
- Backend lib: `artifacts/api-server/src/lib/webpush.ts`
- Backend routes: `artifacts/api-server/src/routes/v1/push.ts` (subscribe, unsubscribe, vapid-public-key)
- Utility: `artifacts/api-server/src/utils/notification.ts` — calls `sendPush()` after creating in-app notification
- Service worker: `artifacts/swiftmart/public/sw.js`
- Frontend helper: `artifacts/swiftmart/src/lib/pushNotifications.ts`
- UI: push enable/disable banner in `artifacts/swiftmart/src/pages/Notifications.tsx`

## Quirks
- `api.delete()` in `artifacts/swiftmart/src/lib/api.ts` does NOT support a request body. Unsubscribe uses `POST /api/push/unsubscribe` instead of DELETE.
- Stale/expired push subscriptions (404/410 responses from push service) are auto-deleted from MongoDB.
- VAPID keys were auto-generated and stored as shared env vars (not secrets) since they were programmatically created — not user-supplied.

**Why:** Push requires subscriptions stored per-user; the existing `createNotificationLimited` is the single choke-point for all notifications so hooking there ensures every notification type (orders, shop approval, broadcasts) automatically triggers a push.

**How to apply:** To add a new notification trigger, just call `createNotificationLimited(userId, payload)` as usual — push is automatic.
