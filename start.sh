#!/bin/sh
set -e

PORT=${PORT:-8000}
NITRO_PORT=3000

echo "==> Starting Nitro frontend SSR server on port $NITRO_PORT..."
PORT=$NITRO_PORT node src/frontend/.output/server/index.mjs &

echo "==> Starting FastAPI backend on public port $PORT..."
exec python -m uvicorn src.backend.main:app --host 0.0.0.0 --port "$PORT"
