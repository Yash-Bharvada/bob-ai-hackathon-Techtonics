@echo off
echo ====================================================
echo Starting VOLTRA (Backend + RAG & Frontend)
echo ====================================================

start "VOLTRA Backend & RAG Chatbot (8000)" cmd /k "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir src/backend"

start "VOLTRA Frontend (3000)" cmd /k "cd src/frontend && npm run dev"

echo.
echo Both services launched in separate windows!
echo - Core Backend (Auto-launches RAG): http://127.0.0.1:8000
echo - Frontend UI:                      http://localhost:3000
echo - Deployment Health Check:          http://127.0.0.1:8000/health/deployment
echo.
pause
