#!/bin/bash
set -eo pipefail

PORT=${PORT:-8000}
RAG_PORT=${RAG_PORT:-8001}
NITRO_PORT=3000

PIDS=()

cleanup() {
    echo "==> [PROCESS SUPERVISOR] Caught signal (SIGTERM/SIGINT). Gracefully stopping all services..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "==> Terminating PID $pid..."
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    wait 2>/dev/null || true
    echo "==> [PROCESS SUPERVISOR] All child services stopped cleanly."
    exit 0
}

trap cleanup SIGTERM SIGINT

# ── 1. Start Nitro frontend SSR server (if built) ────────────────────────────
if [ -f "src/frontend/.output/server/index.mjs" ]; then
    echo "==> [1/3] Starting Nitro frontend SSR server on internal port $NITRO_PORT..."
    PORT=$NITRO_PORT node src/frontend/.output/server/index.mjs &
    NITRO_PID=$!
    PIDS+=("$NITRO_PID")
fi

# ── 2. Start RAG FastAPI service on internal localhost port ──────────────────
echo "==> [2/3] Starting RAG FastAPI service on internal port $RAG_PORT..."
python -m uvicorn api.main:app --host 127.0.0.1 --port "$RAG_PORT" --app-dir rag-chatbot &
RAG_PID=$!
PIDS+=("$RAG_PID")

# ── 3. Start public BOB Backend (FastAPI reverse proxy + core ML) ─────────────
echo "==> [3/3] Starting VOLTRA Core Backend on public port $PORT..."
python -m uvicorn src.backend.main:app --host 0.0.0.0 --port "$PORT" &
BACKEND_PID=$!
PIDS+=("$BACKEND_PID")

echo "==> [PROCESS SUPERVISOR] All services launched. Active PIDs: ${PIDS[*]}"

# Wait for any process to exit. If a critical service stops, trigger cleanup
wait -n "${PIDS[@]}"
EXIT_STATUS=$?

echo "==> [PROCESS SUPERVISOR] A service has stopped with exit code $EXIT_STATUS. Shutting down remaining services..."
cleanup
exit "$EXIT_STATUS"
