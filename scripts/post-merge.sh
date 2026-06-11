#!/bin/bash
set -e
pnpm install --frozen-lockfile
node scripts/check-secrets.mjs
pnpm --filter @workspace/db run push
