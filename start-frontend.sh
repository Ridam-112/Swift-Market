#!/bin/bash
# Kill anything already holding port 5000
fuser -k 5000/tcp 2>/dev/null || true
sleep 1

cd /home/runner/workspace/artifacts/swiftmart
exec PORT=5000 node_modules/.bin/vite --config vite.config.ts --host 0.0.0.0
