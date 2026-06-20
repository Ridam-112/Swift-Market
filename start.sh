#!/bin/bash

# Kill any stale processes holding our ports
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
sleep 1

echo "Building API server..."
pnpm --filter @workspace/api-server run build

echo "Starting API server on port 8080..."
pnpm --filter @workspace/api-server run start &
API_PID=$!

# Give API server a moment to bind
sleep 2

echo "Starting frontend on port 5000..."
pnpm --filter @workspace/swiftmart run dev &
FRONTEND_PID=$!

wait $API_PID $FRONTEND_PID
