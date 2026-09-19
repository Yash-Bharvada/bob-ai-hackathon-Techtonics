@echo off
:: Run this from the repo root: d:\IBM BOB
:: Or double-click — the script forces the working directory to its grandparent (repo root).
cd /d "%~dp0.."

echo ====================================================
echo  Starting VOLTRA (Backend + RAG + Frontend)
echo  Working directory: %CD%
echo ====================================================

:: ── 1. RAG Chatbot (FastAPI, port 8001) — start BEFORE backend so it's ready when backend checks ──
start "VOLTRA RAG Chatbot (8001)" cmd /k "python -m uvicorn api.main:app --host 127.0.0.1 --port 8001 --app-dir src/rag-chatbot"

:: Give RAG a moment to bind before backend starts
timeout /t 3 /nobreak >nul

:: ── 2. Core Backend (FastAPI, port 8000) — AUTO_START_RAG=false since we launched RAG above ────
start "VOLTRA Backend (8000)" cmd /k "set AUTO_START_RAG=false && python -m uvicorn src.backend.main:app --host 127.0.0.1 --port 8000 --reload"

:: ── 3. Frontend (Vite dev server, port 3000) ─────────────────────────────────
start "VOLTRA Frontend (3000)" cmd /k "cd src\frontend && npm run dev"

echo.
echo All three services launched in separate windows:
echo   Backend:  http://127.0.0.1:8000
echo   RAG API:  http://127.0.0.1:8001
echo   Frontend: http://localhost:3000
echo   Health:   http://127.0.0.1:8000/health/deployment
echo.
pause
