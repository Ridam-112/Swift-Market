---
name: ImageKit storage migration
description: Supabase image upload replaced with ImageKit for all product/vendor/banner/certificate uploads
---

# ImageKit Storage Migration

## What changed
- `artifacts/api-server/src/lib/imagekit.ts` — new lib wrapping the `imagekit` npm SDK
- `artifacts/api-server/src/routes/v1/upload.ts` — all 4 endpoints use `uploadToImageKit`
- `artifacts/api-server/src/routes/v1/products.ts` — delete uses `deleteFromImageKit`
- `artifacts/api-server/src/routes/v1/shops.ts` — delete uses `deleteFromImageKit`
- `artifacts/api-server/src/routes/v1/hero-banners.ts` — delete uses `deleteFromImageKit`

## Secrets required
- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_URL_ENDPOINT` — e.g. https://ik.imagekit.io/your_id

## Folders used
- `swiftmart/products`, `swiftmart/shops`, `swiftmart/banners`, `swiftmart/certificates`

## Migration script
`artifacts/api-server/scripts/migrate-supabase-to-imagekit.mjs` — migrated 15 product images from Supabase → ImageKit. Safe to re-run (skips non-Supabase URLs). Uses `pg` (CJS via `createRequire`) + `imagekit` (CJS). Products `id` column is type `text` — do NOT cast to `::uuid` in queries.

## Delete behaviour
ImageKit delete requires a fileId, not a URL. `deleteFromImageKit` calls `listFiles` with a URL search query to find the fileId first, then deletes. Non-fatal on failure.

**Why:** Supabase storage was replaced at user request; Supabase SDK (`@supabase/storage-js`) is still installed for any other uses but no longer used for image uploads.
