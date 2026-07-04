---
name: API server build - @workspace/db linking
description: esbuild cannot resolve @workspace/db without a manual symlink; packages lost after environment resets need pnpm install
---

## Rule
Before running `node ./build.mjs` in `artifacts/api-server/`, `@workspace/db` must be symlinked into `artifacts/api-server/node_modules/@workspace/db`. Without this, esbuild throws 37 "Could not resolve" errors and the server won't start.

**Why:** pnpm workspaces link packages at the root `.pnpm` store but the api-server's local `node_modules/@workspace/` only contains packages that are explicitly symlinked. esbuild resolves from the file where the import occurs, not the workspace root, so it misses the workspace-level resolution.

**How to apply:**
- `start.sh` already does the symlink on every startup:
  ```bash
  mkdir -p artifacts/api-server/node_modules/@workspace
  ln -sfn $(pwd)/lib/db artifacts/api-server/node_modules/@workspace/db
  ```
- If the server fails to build with "@workspace/db not found", run that command manually then retry.
- If other packages fail (helmet, razorpay, web-push, google-auth-library, zod, google-auth-library), the pnpm store was reset — run `pnpm install` from the workspace root to restore them.
- These packages are NOT in the esbuild external list; they are bundled directly into dist/index.mjs. Only drizzle-orm and native modules are external.
