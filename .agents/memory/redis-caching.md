---
name: Redis caching layer
description: ioredis-based cache for products, categories, homepage — graceful fallback to Postgres when Redis unavailable
---

## Implementation

**New file:** `artifacts/api-server/src/lib/cache.ts`
- ioredis client with `enableOfflineQueue: false`, `maxRetriesPerRequest: 1`
- Exports: `cacheGet`, `cacheSet`, `cacheDel`, `cacheDelPattern`, `invalidateProductCaches`, `invalidateCategoryCache`, `productsCacheKey`, `connectRedis`, `disconnectRedis`
- Completely non-throwing — all operations silently no-op if Redis is down or REDIS_URL not set
- Uses SCAN (not KEYS) for pattern-based deletion — safe for production

## TTLs
- `sm:categories` → 30 min
- `sm:homepage` → 5 min  
- `sm:products:{sortedQueryJson}` → 5 min (only when `status !== "all"`)

## Cache keys
- `KEYS.CATEGORIES = "sm:categories"`
- `KEYS.HOMEPAGE = "sm:homepage"`
- `KEYS.PRODUCTS_PREFIX = "sm:products:"` — full key is prefix + `JSON.stringify(sortedQueryParams)`

## Routes updated
- `categories.ts`: GET / reads cache; POST/PATCH/DELETE call `invalidateCategoryCache()`
- `homepage-sections.ts`: GET / reads cache; POST/PATCH/PATCH reorder/DELETE call `cacheDel(KEYS.HOMEPAGE)`
- `products.ts`: GET / reads cache (skips when status=all); POST/PATCH/:id/approval/PATCH/:id/DELETE call `invalidateProductCaches()` (deletes all `sm:products:*` + `sm:homepage`)

## Startup / shutdown
- `index.ts` calls `connectRedis()` synchronously before `app.listen()`
- SIGTERM handler calls `await disconnectRedis()` before `process.exit(0)`
- REDIS_URL added to optional warnings in `validateEnv()`

## Activation
Set env var `REDIS_URL` to a `rediss://` URL (e.g. from Upstash free tier). Without it, app runs normally hitting Postgres on every request.

**Why:** Products list runs expensive subqueries + shop name batch-fetch; homepage resolves 10 sections × product queries each request. These are the highest-traffic endpoints and change rarely in normal operation.
