# How to Run BOB / VOLTRA (Frontend & Backend)

> **Architecture Note**: The backend now features a unified single-server deployment. When you start the backend, it **automatically launches and manages the RAG Chatbot** internally on port 8001. You only need to run **Frontend** and **Backend**!

### Linux / macOS (Quick Start)
```bash
python3 -m uvicorn src.backend.main:app --host 0.0.0.0 --port 8000 & (cd src/frontend && npm run dev)
```

---

## Windows & Multi-Terminal Setup

> **Note**: On **Windows PowerShell**, `&` and `&&` cause syntax errors (`AmpersandNotAllowed`). Use separate terminal tabs or the commands below.

### Option 1: Run in 2 PowerShell Terminals

#### Terminal 1: Core Backend & RAG Chatbot (Port 8000)
```powershell
rag-chatbot\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir src/backend
```
*(The rag-chatbot venv contains all dependencies for both the backend and the RAG service. The backend will automatically start the RAG service on internal port 8001 in the background and proxy `/rag/*` calls seamlessly).*

#### Terminal 2: Frontend (Port 3000)
```powershell
cd src/frontend
npm run dev
```

---

### Option 2: One-Line PowerShell Command (Launches both in separate windows)

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "rag-chatbot\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir src/backend"; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd src/frontend; npm run dev"
```

---

### Option 3: Double-Click `start_all.bat` (Windows Batch)

Run `.\start_all.bat` in the project root to open both services in their own terminal windows automatically.
