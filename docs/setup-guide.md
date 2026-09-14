# Setup Guide

## Prerequisites

- Python 3.10 or later
- pip
- Internet access (to download Kaggle datasets on first run — ~40KB total)
- Optional: Kaggle account (datasets are public; kagglehub downloads without authentication for public datasets)
- Optional: IBM Bob API key (`ANTHROPIC_API_KEY`) for AI-generated advisories — system works fully without it

## Quick Start (clean terminal)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <repo-directory>

# 2. Create a virtual environment (recommended)
python -m venv .venv

# On macOS / Linux:
source .venv/bin/activate

# On Windows:
.venv\Scripts\activate

# 3. Install dependencies
pip install -r src/requirements.txt

# 4. Configure environment (optional — only needed for IBM Bob advisories)
cp src/.env.example .env
# Edit .env and set ANTHROPIC_API_KEY=<your-key>
# If you skip this step, the system uses fallback advisory templates

# 5. Generate synthetic data
python src/data/generate_synthetic.py
# Expected: 7 files written to src/data/
# Expected: real weather fetched from Open-Meteo (or synthetic fallback)

# 6. Train Model 1 (Health Index regression)
python src/models/train_health_index.py
# Downloads Health index1.csv from Kaggle (~10KB) on first run
# Expected: R² ~0.72, MAE ~5.9 on held-out test
# Expected: src/models/risk_model.pkl created

# 7. Train Model 2 (DGA Fault Classifier)
python src/models/train_dga_classifier.py
# Downloads dga_dataset.csv from Kaggle (~30KB) on first run
# Expected: accuracy ~0.91, macro F1 ~0.90
# Expected: src/models/dga_fault_model.pkl created

# 8. Start the backend (:8000)
uvicorn src.backend.main:app --port 8000

# 9. Start the VOLTRA frontend (:3000)
cd src/frontend
npm install
npm run dev
# Dashboard opens at http://localhost:3000
```

## Expected Output After Step 5

```
[Registry] 18 assets written.
[Weather] Fetched 90 days from Open-Meteo (real data).
[TimeSeries] 1620 rows (18 assets x 90 days).
[RiskEvents] 4 events written.
[Incidents] ~24 incidents across 3 years.
```

Plus the archetype trajectory table showing TX-107, TX-104, TX-115, TX-112 as distinguishable.

## Expected Output After Step 6 (Model 1)

```
5-FOLD CROSS-VALIDATION (on 80% train split)
  R2  mean±std : 0.665 +/- 0.051
  MAE mean±std : 6.65 +/- 0.45

HELD-OUT TEST SET (genuine 20%, never seen during CV)
  R2  : 0.717
  MAE : 5.88
```

## Expected Output After Step 7 (Model 2)

```
Overall accuracy : 0.908  (target ~0.91)
Macro F1         : 0.896  (target ~0.90)
[HONESTY NOTE] T2 recall = 0.743
```

## Running the Full Pipeline Manually

To re-score all assets and regenerate the maintenance plan:

```bash
python src/pipeline/score_asset_risk.py    # scores all assets, saves scored_snapshot_day89.csv
python src/pipeline/grid_impact_ranker.py  # ranks assets, saves ranked_assets.csv
python src/pipeline/maintenance_plan.py    # generates maintenance_plan.json
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | IBM Bob (Claude) API key for AI-generated advisories. System works without it using deterministic fallback templates. |

## Troubleshooting

**"Cannot connect to API"** in the browser dashboard:
- Make sure step 8 is running before opening the frontend
- Check that port 8000 is not in use: `lsof -i :8000` (mac/linux) or `netstat -ano | findstr :8000` (Windows)

**kagglehub download fails**:
- Download manually from:
  - https://www.kaggle.com/datasets/shashwatwork/failure-analysis-in-power-transformers-dataset → save as `src/data/Health index1.csv`
  - https://www.kaggle.com/datasets/luizflaviopereira/dga-dissolved-gas-analysis → save as `src/data/dga_dataset.csv`
- Re-run the training scripts — they check for local files first

**SHAP `TreeExplainer` warning about feature names**:
- This is a cosmetic warning from SHAP version differences — results are unaffected

**Windows encoding error in terminal** (Unicode arrows):
- The scripts use ASCII-safe output; if you see encoding errors in older Windows terminals, use `python -u <script>` or set `PYTHONUTF8=1`

## Testing the API

After step 8, verify the backend at: http://localhost:8000/docs (auto-generated Swagger UI)

Key endpoints to test:
- `GET /health` → `{"status":"ok"}`
- `GET /api/ranked` → ranked asset list
- `GET /api/asset/TX-115` → TX-115 recovery story
- `GET /api/plan` → full maintenance plan
