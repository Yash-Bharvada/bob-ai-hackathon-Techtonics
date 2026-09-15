# VOLTRA — Grid Risk Advisor

> **IBM Bobathon Submission · Team Techtonics · Track U1**
>
> *"The lights have not gone out yet. VOLTRA sees that they are going to."*

---

## Team

| Field | Detail |
|---|---|
| **Team Name** | Techtonics |
| **Track** | U1 |
| **Team Lead** | Om Rashiya — 24cs084@charusat.edu.in |
| **Members** | Om Rashiya · Yash Bharvada · Nikunj Desai · Purva Shah |

| Name | Email | Role |
|---|---|---|
| Om Rashiya | 24cs084@charusat.edu.in | Backend & Frontend |
| Yash Bharvada | 23cs006@charusat.edu.in | Python Model & Backend |
| Nikunj Desai | 24cs016@charusat.edu.in | Frontend Polish & Mobile Responsiveness |
| Purva Shah | 24cs094@charusat.edu.in | Documentation, Architecture, Presentation & End-to-End Testing |

---

## Problem Statement

Power utilities operate thousands of high-value transformers whose sensor data (dissolved gas analysis, oil temperature, dielectric measurements) is rarely combined into a unified risk signal. Grid operators learn about equipment failure after the fact — not before it. Maintenance crews are dispatched reactively, at 3–7× the cost of planned intervention. There is no mechanism to detect whether a previous maintenance action actually worked.

---

## Solution

**VOLTRA — Grid Risk Advisor** combines two ML models trained on **real Kaggle transformer failure datasets** into a single end-to-end pipeline:

1. **[Health Index regression](https://www.kaggle.com/code/bharvadayash/health-index)** (R²=0.72, MAE=5.88) — predicts a continuous damage score (0–100) from 14 DGA/electrical features, converted to Remaining Useful Life in days
2. **[DGA Fault Classifier](https://www.kaggle.com/code/bharvadayash/dga-fault-model)** (accuracy 90.8%, macro F1 0.896) — classifies fault type into 7 IEC 60599 categories: NF, PD, D1, D2, T1, T2, T3
3. **Composite grid impact ranking** — 5-component weighted formula (HI 35%, RUL 25%, fault severity 20%, MVA 10%, history 10%) with criticality multiplier
4. **IBM Bob advisory generation** — per-asset plain-English maintenance advisories grounded in real SHAP feature contributions; full deterministic fallback when key is absent
5. **VOLTRA operator console** — React 19 + TanStack Start full-stack app with 5 pages, live telemetry, ML prediction studio, community incident reporting, and cinematic landing

The **TX-115 case** is the key demo differentiator: a transformer that peaked at RUL 7.7 days (Day 78) was rescued by a cooling fan overhaul, recovering **89 additional days of asset life** — tracked, detected, and communicated explicitly by the system.

---

## Key Features

- **Dual ML models on real Kaggle data** — both trained on public transformer failure datasets, validated on held-out test sets with honest metric reporting
- **Transparent composite ranking** — 5-component formula returning every sub-score in the API; full auditability
- **TX-115 intervention detection** — degradation tracked day-by-day; post-maintenance recovery communicated explicitly
- **IBM Bob integration (load-bearing)** — advisories grounded in real SHAP values, graceful deterministic fallback; pipeline never fails on a Bob call failure
- **Community incident reporting with injection defence** — `POST /events/report` with regex-based prompt-injection filter, quarantine logging, bounded risk multipliers
- **Groq LPU live advisories** — `POST /api/groq-report` for real-time 24-hour trajectory forecasting
- **Gemini geospatial search** — `POST /api/events/search` for semantic hazard area analysis
- **CSV batch scoring** — upload any transformer CSV via `POST /api/score/csv`; sample template at `GET /api/sample/csv`
- **JWT + Google OAuth authentication** — MongoDB Atlas user store, bcrypt passwords, 7-day tokens
- **Single-container Docker deployment** — multi-stage Dockerfile; Nitro SSR frontend + FastAPI backend on one port

---

## Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python 3.11, TypeScript, JavaScript |
| **Backend & ML** | FastAPI, scikit-learn, SHAP, pandas, numpy, uvicorn, httpx |
| **Frontend** | React 19, TanStack Start, TanStack Router, Vite 8, TailwindCSS v4, Recharts, Radix UI, Lucide |
| **Database** | MongoDB Atlas (user accounts via pymongo) |
| **Auth** | JWT (python-jose), bcrypt, Google OAuth 2.0 |
| **IBM Technologies** | IBM Bob (Claude claude-3-5-haiku-20241022) |
| **Other AI** | Groq LPU API (trajectory forecasting), Google Gemini Flash (geospatial search) |
| **External APIs** | [Open-Meteo](https://open-meteo.com/) (real-time weather + thermal stress) |
| **Infrastructure** | Docker (multi-stage), Nitro SSR server |

---

## Repository Structure

```
bob-ai-hackathon-Techtonics/
├── submission.yaml              ← Hackathon metadata
├── README.md                    ← This file
├── Dockerfile                   ← Multi-stage: Node frontend build + Python backend
├── start.sh                     ← Production entrypoint (Nitro + uvicorn)
│
├── src/
│   ├── requirements.txt
│   ├── .env.example             ← All required environment variables
│   ├── data/                    ← Generated CSVs, asset registry, timeseries
│   ├── models/                  ← risk_model.pkl, dga_fault_model.pkl + training scripts
│   ├── pipeline/                ← score_asset_risk.py, grid_impact_ranker.py, maintenance_plan.py
│   ├── backend/
│   │   ├── main.py              ← FastAPI (20+ endpoints)
│   │   └── auth_router.py       ← JWT + MongoDB + Google OAuth (/api/auth/*)
│   └── frontend/                ← VOLTRA React 19 + TanStack Start console
│       └── src/routes/          ← / dashboard /grid /predict /technology /login
│
├── docs/
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md          ← Mermaid system diagram + component table
│   ├── setup-guide.md           ← Full setup including Docker, env vars, troubleshooting
│   └── api-reference.md         ← All endpoints documented
│
├── demo/
│   ├── demo-video-link.txt
│   ├── live-demo-url.txt
│   └── screenshots/
│
└── presentation/
    └── SLIDES_CONTENT.md        ← Full 8-slide pitch deck blueprint
```

---

## How to Run

See [`docs/setup-guide.md`](docs/setup-guide.md) for full instructions including Docker. Quick start:

```bash
# 1. Clone
git clone https://github.com/techtonics/bob-ai-hackathon-Techtonics.git
cd bob-ai-hackathon-Techtonics

# 2. Install Python dependencies
pip install -r src/requirements.txt

# 3. Configure environment
cp src/.env.example src/backend/.env
# Edit .env: set MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY (optional)

# 4. Generate data + train models
python src/data/generate_synthetic.py
python src/models/train_health_index.py
python src/models/train_dga_classifier.py

# 5. Start backend on :8000
uvicorn src.backend.main:app --port 8000

# 6. Start VOLTRA frontend on :3000  (separate terminal)
cd src/frontend
npm install       # or: bun install
npm run dev       # or: bun run dev
```

**Docker (single container, production):**
```bash
docker build -t voltra .
docker run -p 8000:8000 --env-file src/backend/.env voltra
# App available at http://localhost:8000
```

---

## Demo

| Artifact | Link |
|---|---|
| Demo Video | [demo/demo-video-link.txt](demo/demo-video-link.txt) |
| Live Demo | [demo/live-demo-url.txt](demo/live-demo-url.txt) |
| Screenshots | [demo/screenshots/](demo/screenshots/) |
| Presentation | [presentation/SLIDES_CONTENT.md](presentation/SLIDES_CONTENT.md) |

---

## Known Limitations

- **Health Index model R² = 0.717**: real DGA datasets lack furan/DP measurements for paper insulation aging (IEEE C57.104 / CIGRE TB 296) — a dataset gap, not a modelling flaw
- **DGA Classifier T2 recall = 0.743**: T2 (moderate thermal fault) confused with T1/T3; documented in every T2 advisory output
- **RUL estimates are heuristic**: no ground-truth RUL labels exist in the Kaggle datasets; calibration is documented and reproducible
- **TX-107 extreme sensor values** (C2H2 at 2,790 ppm) fall outside the RF model's training distribution — extrapolation territory
- **Auth requires MongoDB Atlas**: operator login/register won't work without `MONGODB_URI`; the rest of the app (all ML endpoints) works without it
- **IBM Bob advisory generation requires `ANTHROPIC_API_KEY`**: optional; deterministic fallback is always available

---

## What We're Most Proud Of

The **TX-115 intervention and recovery story**. Every step — the Day 65 onset, the Day 78 peak at RUL 7.7 days, the cooling fan overhaul, and the Day 89 recovery to RUL 97 days — is traceable through the actual pipeline code, CSV data files, and API responses. The system doesn't just detect faults; it detects when maintenance worked. The IBM Bob integration is genuinely load-bearing: advisories cite specific sensor ppm values and SHAP contributions from the real pipeline output, not generic templates.
