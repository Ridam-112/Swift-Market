#!/bin/bash
set -e
pnpm install --frozen-lockfile
node scripts/check-secrets.mjs
# Use "yes" to auto-select "create table" for any new tables drizzle-kit detects.
# This avoids the interactive TTY prompt that blocks CI/post-merge automation.
yes | timeout 60 pnpm --filter @workspace/db run push || true
