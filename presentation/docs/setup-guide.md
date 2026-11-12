# Setup Guide — VOLTRA Grid Risk Advisor

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10 or later (3.11 recommended) | Used by backend + ML pipeline |
| Node.js | ≥ 18 | Used by frontend build |
| Bun (optional) | Latest | Faster alternative to npm for the frontend |
| MongoDB Atlas | Any | Free tier works; required only for operator login |
| Internet access | — | Kaggle dataset download (~40 KB total) on first model training run |

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp src/.env.example src/backend/.env
```

Then edit `src/backend/.env`:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | **Yes (for auth)** | MongoDB Atlas connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/voltra` |
| `JWT_SECRET` | **Yes (for auth)** | Random secret string for signing JWTs — use at least 32 random characters |
| `JWT_ALGORITHM` | No | Default: `HS256` |
| `JWT_EXPIRE_MINUTES` | No | Default: `10080` (7 days) |
| `ANTHROPIC_API_KEY` | No | IBM Bob (Claude) advisory generation. System works without it using deterministic fallback. |
| `GROQ_API_KEY` | No | Groq LPU live trajectory reports (`/api/groq-report`). Falls back gracefully. |
| `GEMINI_API_KEY` | No | Google Gemini geospatial event search (`/api/events/search`). Falls back gracefully. |
| `GOOGLE_CLIENT_ID` | No | Google OAuth 2.0 app client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth 2.0 app client secret |
| `API_BASE_URL` | No | Public URL of this FastAPI server, used for OAuth callback. Default: `http://localhost:8000` |
| `FRONTEND_URL` | No | URL of the frontend app, used for OAuth redirect. Default: `http://localhost:5173` |

> **Important:** `MONGODB_URI` and `JWT_SECRET` are only needed for the operator login system. All ML scoring, ranking, and advisory endpoints work without them — they use CSV/JSON files and do not require a database.

---

## Step-by-Step Local Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/techtonics/bob-ai-hackathon-Techtonics.git
cd bob-ai-hackathon-Techtonics
```

### Step 2 — Create a Python virtual environment

```bash
python -m venv .venv

# macOS / Linux:
source .venv/bin/activate

# Windows:
.venv\Scripts\activate
```

### Step 3 — Install Python dependencies

```bash
pip install -r src/requirements.txt
```

### Step 4 — Configure environment variables

```bash
cp src/.env.example src/backend/.env
# Edit src/backend/.env and set MONGODB_URI + JWT_SECRET at minimum
```

### Step 5 — Generate synthetic data

```bash
python src/data/generate_synthetic.py
```

**Expected output:**
```
[Registry]   18 assets written → src/data/asset_registry.csv
[Weather]    Fetched 90 days from Open-Meteo (real data) → src/data/weather.csv
[TimeSeries] 1620 rows (18 assets × 90 days) → src/data/transformer_timeseries.csv
[RiskEvents] 4 events written → src/data/risk_events.csv
[Incidents]  ~24 incidents across 3 years → src/data/incident_log.csv

Archetype trajectories:
  TX-107 (CRITICAL_ARCING)   Day-89 HI: 72.1  RUL: 6.8d
  TX-104 (THERMAL_RUNAWAY)   Day-89 HI: 61.4  RUL: 34.2d
  TX-115 (INTERVENTION)      Day-89 HI: 36.1  RUL: 97.0d  ← recovery case
  TX-112 (STABLE)            Day-89 HI: 18.3  RUL: 142d
```

### Step 6 — Train Model 1 (Health Index regression)

```bash
python src/models/train_health_index.py
```

Downloads `Health index1.csv` from Kaggle (~10 KB) on first run.

**Expected output:**
```
5-FOLD CROSS-VALIDATION (on 80% train split)
  R2  mean±std : 0.665 +/- 0.051
  MAE mean±std : 6.65 +/- 0.45

HELD-OUT TEST SET (genuine 20%, never seen during CV)
  R2  : 0.717
  MAE : 5.88

Saved → src/models/risk_model.pkl
```

### Step 7 — Train Model 2 (DGA Fault Classifier)

```bash
python src/models/train_dga_classifier.py
```

Downloads `dga_dataset.csv` from Kaggle (~30 KB) on first run.

**Expected output:**
```
Overall accuracy : 0.908  (target ~0.91)
Macro F1         : 0.896  (target ~0.90)
[HONESTY NOTE] T2 recall = 0.743
               T2 (moderate thermal fault) is confused with T1 and T3.
               This is documented in all T2 advisory outputs.

Saved → src/models/dga_fault_model.pkl
```

### Step 8 — Start the FastAPI backend

```bash
uvicorn src.backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify it's running: http://localhost:8000/health → `{"status":"ok"}`  
Interactive API docs: http://localhost:8000/docs

### Step 9 — Start the VOLTRA frontend (separate terminal)

```bash
cd src/frontend
npm install        # or: bun install
npm run dev        # or: bun run dev
```

VOLTRA opens at: **http://localhost:3000**

---

## Docker Setup (Single Container, Production)

The `Dockerfile` is a multi-stage build:
- **Stage 1** (Node 20): installs npm deps + runs `vite build` → Nitro SSR bundle
- **Stage 2** (Python 3.11): installs Python deps + copies everything including the built frontend

```bash
# Build the image
docker build -t voltra .

# Run with environment variables
docker run -p 8000:8000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="your-secret-here" \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  voltra

# Or use an env file
docker run -p 8000:8000 --env-file src/backend/.env voltra
```

The container starts:
1. Nitro SSR server on internal port 3000
2. FastAPI on port 8000 (public) — proxies all non-API requests to Nitro

App available at: **http://localhost:8000**

---

## Running the Full Pipeline Manually

To re-score all 18 assets and regenerate the maintenance plan:

```bash
# Score all assets → saves src/data/scored_snapshot_day89.csv
python src/pipeline/score_asset_risk.py

# Rank by composite grid impact → saves src/data/ranked_assets.csv
python src/pipeline/grid_impact_ranker.py

# Generate 7-day maintenance plan → saves src/data/maintenance_plan.json
python src/pipeline/maintenance_plan.py
```

---

## Creating a Demo Operator Account

If MongoDB is configured, seed a demo operator account:

```bash
python src/backend/seed_user.py
```

Or register through the UI at http://localhost:3000/login → "Create Account".

---

## Testing the API

After Step 8, smoke-test all endpoints:

```bash
python src/backend/test_endpoints.py
```

Key endpoints to verify manually via http://localhost:8000/docs:

| Endpoint | Expected result |
|---|---|
| `GET /health` | `{"status":"ok","service":"grid-risk-api","version":"1.0.0"}` |
| `GET /api/ranked` | 18 assets sorted by composite score, highest risk first |
| `GET /api/asset/TX-115` | RUL ~97 days, HI ~36.1, advisory mentioning cooling fan recovery |
| `GET /api/asset/TX-107` | RUL ~7 days, fault_type D1 or D2, high C2H2 ppm |
| `GET /api/plan` | `top_10_actions` array + `tx115_narrative` + `crew_schedule` |
| `GET /api/weather/live` | Real temperature + `thermal_stress_pct` for Anand District |
| `POST /api/score` | Send JSON body → `health_index`, `RUL_days`, `fault_type` |

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `"Cannot connect to API"` in browser | Backend not started | Run Step 8 before opening the frontend |
| Port 8000 already in use | Another process | `lsof -i :8000` (Mac/Linux) or `netstat -ano \| findstr :8000` (Windows) → kill that process |
| `kagglehub download fails` | No internet or rate limit | Download manually: [Health index1.csv](https://www.kaggle.com/datasets/shashwatwork/failure-analysis-in-power-transformers-dataset) and [dga_dataset.csv](https://www.kaggle.com/datasets/luizflaviopereira/dga-dissolved-gas-analysis) → place in `src/data/` |
| `MONGODB_URI not set` error on login | .env not configured | Auth endpoints need `MONGODB_URI`. ML endpoints work without it. |
| `SHAP TreeExplainer warning about feature names` | SHAP version difference | Cosmetic warning only — results are unaffected |
| Windows Unicode error in terminal | Windows terminal encoding | Run with `python -u <script>` or set `PYTHONUTF8=1` |
| `ModuleNotFoundError: pipeline` | Wrong working directory | Always run from the repo root, not from inside `src/` |
| `FileNotFoundError: risk_model.pkl` | Models not trained yet | Run Steps 6 and 7 first |
| `503 Frontend SSR initializing` in Docker | Nitro not started | Wait ~5 seconds and retry; check logs with `docker logs <container>` |
| Google OAuth redirect mismatch | `API_BASE_URL` not set | Set `API_BASE_URL` to your public server URL in `.env` |

---

## Verifying IBM Bob Integration

```bash
# Backend must be running on :8000
python src/backend/verify_advisory.py
```

This calls `GET /api/asset/TX-115?generate_advisory=true` and prints:
- `advisory_source`: `"ibm_bob_llm"` (if key present) or `"deterministic_fallback"`
- `advisory_text`: the full advisory paragraph

Both outputs are grounded in real sensor values and SHAP contributions.
