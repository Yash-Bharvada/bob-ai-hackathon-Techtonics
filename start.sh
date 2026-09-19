#!/bin/bash
set -eo pipefail

PORT=${PORT:-8000}
RAG_PORT=${RAG_PORT:-8001}
NITRO_PORT=3000

# Cap PyTorch / OpenMP / BLAS thread pools to prevent container memory exhaustion
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
export OPENBLAS_NUM_THREADS=1
export NUMEXPR_NUM_THREADS=1
export VECLIB_MAXIMUM_THREADS=1
# Prevent backend lifespan from spawning a redundant duplicate RAG process
export AUTO_START_RAG=false

PIDS=()

cleanup() {
    echo "==> [PROCESS SUPERVISOR] Caught shutdown signal. Gracefully stopping all services..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "==> Stopping PID $pid..."
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
if [ -d "rag-chatbot" ]; then
    echo "==> [2/3] Starting RAG FastAPI service on internal port $RAG_PORT..."
    python -m uvicorn api.main:app --host 127.0.0.1 --port "$RAG_PORT" --app-dir rag-chatbot --workers 1 &
    RAG_PID=$!
    PIDS+=("$RAG_PID")
fi

# ── 3. Start public VOLTRA Backend (FastAPI reverse proxy + core ML) ─────────
echo "==> [3/3] Starting VOLTRA Core Backend on public port $PORT..."
python -m uvicorn src.backend.main:app --host 0.0.0.0 --port "$PORT" &
BACKEND_PID=$!
PIDS+=("$BACKEND_PID")

echo "==> [PROCESS SUPERVISOR] All services launched. Active PIDs: ${PIDS[*]}"

# Keep container alive tied to the primary web server (BACKEND_PID).
# Companion services (RAG, SSR) failing will not crash the entire deployment.
wait "$BACKEND_PID"
EXIT_STATUS=$?

echo "==> [PROCESS SUPERVISOR] Primary backend stopped with exit code $EXIT_STATUS. Shutting down remaining services..."
cleanup
exit "$EXIT_STATUS"

