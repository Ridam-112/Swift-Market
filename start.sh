#!/bin/bash

# Kill any stale processes holding our ports
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
sleep 1

# Ensure esbuild is linked for the api-server (pnpm may not link devDeps in the workspace)
ESBUILD_STORE=$(ls -d /home/runner/workspace/node_modules/.pnpm/esbuild@*/node_modules/esbuild 2>/dev/null | head -1)
ESBUILD_PLUGIN_STORE=$(ls -d /home/runner/workspace/node_modules/.pnpm/esbuild-plugin-pino@*/node_modules/esbuild-plugin-pino 2>/dev/null | head -1)
mkdir -p artifacts/api-server/node_modules/@workspace
if [ -n "$ESBUILD_STORE" ] && [ ! -e "artifacts/api-server/node_modules/esbuild" ]; then
  ln -sf "$ESBUILD_STORE" artifacts/api-server/node_modules/esbuild
fi
if [ -n "$ESBUILD_PLUGIN_STORE" ] && [ ! -e "artifacts/api-server/node_modules/esbuild-plugin-pino" ]; then
  ln -sf "$ESBUILD_PLUGIN_STORE" artifacts/api-server/node_modules/esbuild-plugin-pino
fi
# Link @workspace/db so esbuild can resolve and bundle it
if [ ! -e "artifacts/api-server/node_modules/@workspace/db" ]; then
  ln -sf "$(pwd)/lib/db" artifacts/api-server/node_modules/@workspace/db
fi

echo "Building API server..."
(cd artifacts/api-server && node ./build.mjs)
if [ $? -ne 0 ]; then
  echo "API server build failed — aborting"
  exit 1
fi

echo "Applying database migrations..."
pnpm --filter @workspace/db run push

echo "Starting API server on port 8080..."
PORT=8080 node --enable-source-maps artifacts/api-server/dist/index.mjs &
API_PID=$!

# Give API server a moment to bind
sleep 2

echo "Starting frontend on port 5000..."
cd artifacts/swiftmart
PORT=5000 node_modules/.bin/vite --config vite.config.ts --host 0.0.0.0 &
FRONTEND_PID=$!

wait $API_PID $FRONTEND_PID
