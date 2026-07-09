---
name: Supabase Storage migration
description: Cloudinary replaced with Supabase Storage for image uploads/deletes; Node.js 20 constraint requires storage-js not supabase-js.
---

## Rule
Use `@supabase/storage-js` (not `@supabase/supabase-js`) in the API server. The full SDK requires Node.js 22+ for its Realtime/WebSocket layer; the environment runs Node.js 20.

**Why:** `@supabase/supabase-js` v2 initialises a Realtime client on import, which throws immediately on Node.js 20 ("native WebSocket not found"). `@supabase/storage-js` is the storage-only client and has no such dependency.

## How to apply
- `artifacts/api-server/src/lib/supabase-storage.ts` — `StorageClient` from `@supabase/storage-js`; call `storage.from(bucket)` directly.
- Migration script likewise uses `StorageClient`, not `createClient`.
- Delete guard validates against the exact configured Supabase project hostname extracted from `SUPABASE_URL` (not a substring match) to prevent accidental cross-project deletion.
- New env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
- One-time migration script: `artifacts/api-server/scripts/migrate-cloudinary-to-supabase.mjs` — re-runnable; skips URLs already pointing at Supabase; covers products.images, products.colorImages, shops.(image/banner/certificateFile), users.profilePhoto, hero_banners.imageUrl.
