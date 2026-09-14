# VOLTRA — Grid Risk Advisor

**Predictive Power-Grid Intelligence Platform**  
_Techtonics · Bobathon AI Hackathon Submission_

---

## What is VOLTRA?

VOLTRA is an enterprise-grade AI-powered grid risk advisory system built for the **Anand District Transmission Network**. It combines two trained ML models with IBM Bob plain-English advisories to forecast transformer failures before they happen.

> _"The lights have not gone out yet. VOLTRA sees that they are going to."_

---

## Architecture

| Layer           | Stack                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| **Frontend**    | React 19 + TanStack Router + TailwindCSS v4                                        |
| **Backend API** | FastAPI (Python) on `:8000`                                                        |
| **ML Models**   | Random Forest Health Index Regression (R²=0.72) + DGA Fault Classifier (90.8% acc) |
| **AI Advisory** | IBM Bob (Claude 3.5 Haiku via Anthropic SDK)                                       |
| **Security**    | Prompt-injection regex filter + bounded risk multiplier                            |

---

## Routes

| URL           | Page              | Description                                                                   |
| ------------- | ----------------- | ----------------------------------------------------------------------------- |
| `/`           | Home              | Product narrative, TX-115 intervention story                                  |
| `/grid`       | Live Grid         | Real-time operator console — 18 transformers, live telemetry, asset inspector |
| `/predict`    | Prediction Studio | Dual ML simulation: DGA sliders, health index, RUL, fault classification      |
| `/technology` | Technology        | 4 sensing pillars, 5-stage ML pipeline, NERC CIP compliance                   |

---

## Features

- **Live Grid Console** (`/grid`) — polls `GET /api/ranked` every 8 s, merges live backend scores into 18 Anand District transformer cards
- **Asset Inspector Modal** — `GET /api/asset/{id}` + `GET /api/timeseries/{id}` with 90-day Recharts degradation curve
- **Outage Prediction Studio** (`/predict`) — DGA gas sliders + `POST /api/score` with local heuristic fallback
- **7-Day Maintenance Plan** — `GET /api/plan` with `top_10_actions`, `tx115_narrative`, crew schedule
- **Community Incident Reporting** — `POST /events/report` with server-side prompt-injection defence, audit CSVs
- **TX-115 Intervention Banner** — showcases +89 days RUL recovered after Day 78 cooling fan overhaul

---

## Local Development

### Prerequisites

- Node.js ≥ 18 + [Bun](https://bun.sh)
- Python ≥ 3.10

### 1 — Start the FastAPI backend

```bash
cd src
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend health check: http://localhost:8000/health  
Interactive API docs: http://localhost:8000/docs

### 2 — Start the VOLTRA frontend

```bash
cd src/frontend
bun install # or npm install
bun run dev # or npm run dev
```

Frontend dev server: http://localhost:3000

### 3 — Build for production

```bash
cd src/frontend
bun run build # or npm run build
```

Output in `src/frontend/.output/`

### 4 — Run the connection test suite

```bash
# Backend must be running on :8000 first
python src/backend/test_connection.py
```

### 5 — Quick endpoint smoke test

```bash
python src/backend/test_endpoints.py
```

---

## Machine Learning Models

| Model File            | Type                                            | Key Metric     |
| --------------------- | ----------------------------------------------- | -------------- |
| `risk_model.pkl`      | Health Index regression (0–100 damage score)    | R² = 0.72      |
| `dga_fault_model.pkl` | DGA Fault Classification (NF/D1/D2/T1/T2/T3/PD) | 90.8% accuracy |

Trained on: Kaggle transformer DGA dataset (4,151 rows) + Anand District synthetic time-series (18 assets × 90 days).

---

## Project Structure

```
src/
  frontend/                   ← VOLTRA Frontend (React + TanStack Start)
    src/
      routes/
        index.tsx             → / (Home)
        grid.tsx              → /grid (Live Grid Operator Console)
        predict.tsx           → /predict (Dual ML Prediction Studio)
        technology.tsx        → /technology (Architecture & Methodology)
      components/
        SiteNav.tsx           → Global navigation
        VoltraLogo.tsx        → Custom VOLTRA SVG brand mark
        GridDiagram.tsx       → Interactive topology map
        TX115InterventionBanner → TX-115 recovery showcase
        IncidentReportModal.tsx → Community hazard reporting + injection defence
      lib/
        techtonicsApi.ts      → FastAPI client (all 8 endpoints)
        gridData.ts           → 18 transformer static dataset + mergeRanked()
        prediction.ts         → Local ML heuristic fallback engine
        incidentReport.ts     → Client-side injection filter + category classifier
  backend/main.py             → REST API (8 endpoints)
  pipeline/
    score_asset_risk.py       → Dual model scoring + IBM Bob advisory
    grid_impact_ranker.py       → 5-factor composite risk ranker
    maintenance_plan.py       → 7-day crew pre-positioning plan
  models/
    risk_model.pkl            → Trained Health Index regressor
    dga_fault_model.pkl       → Trained DGA fault classifier
  data/
    asset_registry.csv        → 18 transformer metadata
    scored_snapshot_day89.csv → Day-89 model scores
    ranked_assets.csv         → Pre-built composite rankings
    maintenance_plan.json     → Cached maintenance plan
    transformer_timeseries.csv→ 90-day DGA time-series
```

---

## Team

**Techtonics** — Bobathon AI Hackathon
