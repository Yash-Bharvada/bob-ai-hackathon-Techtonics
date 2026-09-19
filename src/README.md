# Source Code — VOLTRA Grid Risk Advisor

This directory contains the complete implementation: ML pipeline, FastAPI backend, and VOLTRA React frontend.

---

## Directory Layout

```
src/
├── requirements.txt               ← Python dependencies (pip install -r src/requirements.txt)
├── .env.example                   ← All environment variables with descriptions
│
├── data/
│   ├── generate_synthetic.py      ← Generates 18-asset × 90-day timeseries + weather + registry
│   ├── generation_config.json     ← Archetype definitions (4 failure patterns)
│   ├── asset_registry.csv         ← 18 transformer metadata (substation, MVA, voltage, zone)
│   ├── transformer_timeseries.csv ← 1,620 rows (18 assets × 90 days) with DGA + weather
│   ├── scored_snapshot_day89.csv  ← Day-89 ML scores for all 18 assets (cached)
│   ├── ranked_assets.csv          ← Composite grid impact rankings (cached)
│   ├── maintenance_plan.json      ← 7-day crew action plan (cached)
│   ├── Health index1.csv          ← Kaggle dataset: 470 real transformer records (Model 1 training)
│   ├── dga_dataset.csv            ← Kaggle dataset: 4,150 real DGA records (Model 2 training)
│   ├── incident_log.csv           ← Historical incident events per asset
│   ├── risk_events.csv            ← 4 major historical grid risk events
│   ├── weather.csv                ← 90-day real weather from Open-Meteo (or synthetic fallback)
│   └── user_reported_events.csv   ← Accepted community hazard reports (written at runtime)
│
├── models/
│   ├── train_health_index.py      ← Trains RandomForestRegressor on Health index1.csv
│   ├── train_dga_classifier.py    ← Trains RandomForestClassifier on dga_dataset.csv
│   ├── risk_model.pkl             ← Trained Health Index regressor (generated after training)
│   └── dga_fault_model.pkl        ← Trained DGA Fault Classifier (generated after training)
│
├── pipeline/
│   ├── score_asset_risk.py        ← Core integration: both models + column rename + SHAP + IBM Bob
│   ├── grid_impact_ranker.py      ← 5-component composite ranking with criticality multiplier
│   └── maintenance_plan.py        ← Fault-type-specific action codes + 7-day crew schedule
│
├── rag-chatbot/                   ← Standalone RAG Microservice (Voltrics AI)
│   ├── config.py                  ← Auto-discovers root .env; Qdrant & Groq settings
│   ├── requirements.txt           ← Qdrant, sentence-transformers, Groq
│   ├── api/main.py                ← FastAPI service running on port 8001
│   ├── chatbot/chain.py           ← Prompt assembly & Groq LLM inference
│   ├── retriever/retriever.py     ← Dual-domain Qdrant vector retrieval
│   └── ingestion/                 ← Document & CSV telemetry embedders
│
├── backend/
│   ├── main.py                    ← FastAPI app: 25+ endpoints (scoring, ranking, auth, weather, CSV)
│   ├── auth_router.py             ← JWT + bcrypt + MongoDB Atlas + Google OAuth 2.0
│   ├── rag_proxy.py               ← Internal reverse-proxy & supervisor for RAG microservice
│   ├── services/                  ← SMS alert dispatching, deduplication, and testing
│   ├── seed_user.py               ← Utility: create a demo operator account in MongoDB
│   ├── test_endpoints.py          ← Smoke test all API endpoints
│   └── verify_advisory.py         ← Verifies IBM Bob advisory generation end-to-end
│
└── frontend/                      ← VOLTRA React 19 + TanStack Start operator console
    ├── package.json               ← Dependencies: React 19, TanStack Start, Recharts, Radix UI
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── routes/
        │   ├── __root.tsx         ← Root layout: SiteNav + SiteFooter + CinematicLanding
        │   ├── index.tsx          ← / Home: cinematic landing + TX-115 story + SmallGridMap
        │   ├── dashboard.tsx      ← /dashboard: KPI cards, RUL histogram, fault analysis
        │   ├── grid.tsx           ← /grid: live grid console, SmallGridMap, 7-day work order
        │   ├── map.tsx            ← /map: full-screen interactive GIS Substation map + telemetry
        │   ├── predict.tsx        ← /predict: DGA sliders, POST /api/score, CSV upload
        │   ├── technology.tsx     ← /technology: methodology, benchmarks, architecture
        │   └── login.tsx          ← /login: JWT auth, Google OAuth, register form
        ├── components/
        │   ├── SiteNav.tsx        ← Responsive navbar (desktop capsule + mobile slide-down)
        │   ├── SiteFooter.tsx
        │   ├── VoltraLogo.tsx     ← Custom SVG brand mark
        │   ├── SmallGridMap.tsx   ← Embedded Anand District GIS map for dashboard and topology tab
        │   ├── TransformerMap.tsx ← Interactive MapLibre GL map with CARTO raster tiles & popups
        │   ├── LocationGrid.tsx   ← Real-time telemetry data grid for all 18 substations
        │   ├── TX115InterventionBanner.tsx ← 4-step intervention recovery showcase
        │   ├── IncidentReportModal.tsx     ← Community report + injection defence UI
        │   ├── AuthModal.tsx
        │   ├── LocationOnboarding.tsx
        │   └── LocationPromptModal.tsx
        ├── lib/
        │   ├── techtonicsApi.ts   ← Typed API client for all 20+ backend endpoints
        │   ├── gridData.ts        ← 18-transformer static dataset + mergeRankedIntoAssets()
        │   ├── prediction.ts      ← Local ML heuristic fallback engine (offline mode)
        │   ├── authSession.ts     ← localStorage JWT session management
        │   └── incidentReport.ts  ← Client-side injection filter + event category classifier
        └── cinematic/
            ├── CinematicLanding.tsx      ← Orchestrates the cinematic intro sequence
            ├── CinematicFrameSequence.ts ← 168-frame WebP scroll animation engine
            ├── VoltraSliceSlide.ts        ← 5-strip slide-in transition
            ├── VoltraDepthText.ts         ← SVG depth typography
            └── ThemeTransitionController.ts
```

---

## Environment Variables

Copy `src/.env.example` to `src/backend/.env` and fill in values. See full descriptions in [`.env.example`](.env.example).

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes (for auth) | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes (for auth) | Secret key for JWT signing |
| `ANTHROPIC_API_KEY` | No | IBM Bob (Claude) advisories; falls back to deterministic templates |
| `GROQ_API_KEY` | No | Groq LPU live trajectory reports |
| `GEMINI_API_KEY` | No | Google Gemini geospatial event search |
| `GOOGLE_CLIENT_ID` | No | Google OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth 2.0 |

---

## Running the Pipeline Manually

```bash
# Re-score all assets (writes scored_snapshot_day89.csv)
python src/pipeline/score_asset_risk.py

# Re-rank by grid impact (writes ranked_assets.csv)
python src/pipeline/grid_impact_ranker.py

# Regenerate maintenance plan (writes maintenance_plan.json)
python src/pipeline/maintenance_plan.py
```

---

## What NOT to Commit

- `.env` files with real secrets (already in `.gitignore`)
- `node_modules/` or `.venv/`
- `__pycache__/` or `*.pyc`
- Model `.pkl` files if large — they are regenerated by the training scripts
