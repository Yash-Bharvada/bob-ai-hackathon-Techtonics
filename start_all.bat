@echo off
echo ====================================================
echo Starting VOLTRA Services (Backend, RAG, & Frontend)
echo ====================================================

start "VOLTRA Core Backend (8000)" cmd /k "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir src/backend"

start "VOLTRA RAG Chatbot (8001)" cmd /k "cd rag-chatbot && .venv\Scripts\activate && uvicorn api.main:app --host 127.0.0.1 --port 8001 --reload"

start "VOLTRA Frontend (3000)" cmd /k "cd src/frontend && npm run dev"

echo.
echo All 3 services launched in separate windows!
echo - Core Backend: http://127.0.0.1:8000
echo - RAG Chatbot:  http://127.0.0.1:8001
echo - Frontend:     http://localhost:3000
echo.
pause
