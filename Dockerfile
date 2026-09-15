# ── Stage 1: Build Frontend (Vite + React) ──────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY src/frontend/package*.json ./
RUN npm install

COPY src/frontend/ ./
RUN npm run build

# ── Stage 2: Runtime Backend + Models + Static Serving ───────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY src/requirements.txt ./src/requirements.txt
RUN pip install --no-cache-dir -r ./src/requirements.txt

COPY src/ ./src/

# Copy compiled frontend from Stage 1 into the runtime
COPY --from=frontend-builder /app/frontend/.output ./src/frontend/.output

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV PORT=8000
EXPOSE 8000

CMD ["/app/start.sh"]
