---
name: Launch Hardening & TypeScript Fixes
description: Security hardening applied during launch audit; how to fix Express 5 req.params TS2769 errors; mockup-sandbox build constraint
---

## Security hardening applied

- Global rate limiter: 300 req/15min/IP in prod, bypass in dev (`src/middlewares/rateLimiter.ts`)
- UUID param validator middleware (`src/middlewares/validateUuid.ts`) — applied to all `/:id` routes in orders.ts
- RBAC fixes in orders.ts: customers can only cancel own orders; vendors can only update their shops' orders
- Payment ownership check in payments.ts verify endpoint
- All silent `.catch(() => {})` blocks replaced with `logger.error()` calls

## Express 5 `req.params` TS2769 fix

**Problem:** `@types/express@5` types `req.params["key"]` as `string | string[]`, causing TS2769 when passing to drizzle-orm `eq()` which expects `string`.

**Module augmentation approach doesn't work:** Even with `export {}` to make the file a true augmentation, TypeScript cannot narrow an existing `string | string[]` index signature to `string` via interface merging.

**Working fix:** Batch `as string` cast at each call site:
```bash
find artifacts/api-server/src/routes -name "*.ts" | xargs sed -i \
  "s/req\.params\['\([^']*\)'\]!/req.params['\1'] as string/g; \
   s/req\.params\[\"\([^\"]*\)\"\]!/req.params[\"\1\"] as string/g"
```

**Why:** `!` (non-null assertion) only removes `undefined`, leaving `string | string[]`. `as string` is a definitive type assertion that overrides to `string`.

## mockup-sandbox vite.config.ts

`vite.config.ts` previously threw errors when `PORT` and `BASE_PATH` env vars were missing — this blocked `pnpm run build`. Fix: default both to safe values (`PORT ?? "3001"`, `BASE_PATH ?? "/"`). These are still required at dev-server runtime but not for build.

## Build status after hardening

`pnpm run typecheck` ✅ — all 4 packages (api-server, swiftmart, mockup-sandbox, scripts)
`pnpm run build` ✅ — all packages build successfully
