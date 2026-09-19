# How to Run VOLTRA (Frontend & Backends)

### Linux / macOS (Quick Start)
```bash
python3 -m uvicorn src.backend.main:app --host 0.0.0.0 --port 8000 & (cd src/frontend && npm run dev)
```

---

## Windows & Multi-Terminal Setup

> **Note**: On **Windows PowerShell**, `&` and `&&` cause syntax errors (`AmpersandNotAllowed`). Use separate terminal tabs or the commands below.

### Option 1: Run in Separate Terminals

#### Terminal 1: Core ML Backend (Port 8000)
```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir src/backend
```

#### Terminal 2: RAG Chatbot Service (Port 8001)
```powershell
cd rag-chatbot
.\.venv\Scripts\activate
uvicorn api.main:app --host 127.0.0.1 --port 8001 --reload
```

#### Terminal 3: Frontend Web App (Port 3000)
```powershell
cd src/frontend
npm run dev
```

---

### Option 2: One-Line PowerShell Command (Launches all in separate windows)

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir src/backend"; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd rag-chatbot; .\.venv\Scripts\activate; uvicorn api.main:app --host 127.0.0.1 --port 8001 --reload"; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd src/frontend; npm run dev"
```

---

### Option 3: Double-Click `start_all.bat` (Windows Batch)

Run `.\start_all.bat` in the project root to open all three services in their own terminal windows automatically.
