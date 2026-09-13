# Grid Risk Advisor — Power Outage Prediction & Equipment Failure Advisory

> **IBM Bobathon submission — Team Techtonics**

---

## Team

| Field | Value |
|---|---|
| **Team Name** | Techtonics |
| **Track** | AI |
| **Team Lead** | Yash Bhaskar — yash.bhaskar@ibm.com |

---

## Problem Statement

Power utilities operate thousands of high-value transformers whose sensor data (dissolved gas analysis, oil temperature, dielectric measurements) is rarely combined into a unified risk signal. Grid operators learn about equipment failure after the fact — not before it. Maintenance crews are dispatched reactively, at 3–7× the cost of planned intervention.

---

## Solution

Grid Risk Advisor combines two ML models trained on **real Kaggle transformer failure datasets** into a single pipeline:

1. **Health Index regression** (R²=0.72, MAE=5.88) — predicts a damage score for each transformer from 14 DGA/electrical features
2. **DGA Fault Classifier** (accuracy 90.8%, macro F1 0.896) — classifies fault type into 7 IEC categories (NF, PD, D1, D2, T1, T2, T3)
3. **Composite grid impact ranking** — explicit 5-component weighted formula + criticality multiplier
4. **IBM Bob advisory generation** — per-asset plain-English maintenance advisories grounded in actual SHAP feature contributions

The TX-115 case is the key demo: a transformer heading for imminent failure (RUL 7.7 days) was rescued by a targeted maintenance intervention, recovering **89 additional days of asset life**. The system detects and communicates this recovery explicitly.

---

## Key Features

- **Dual ML models on real data**: Health Index regression + DGA Fault Classifier, both trained on public Kaggle datasets, both validated on held-out test sets with honest metric reporting
- **Composite ranking with transparent weights**: 5-component formula (HI 35%, RUL 25%, fault severity 20%, MVA 10%, history 10%) — every sub-score returned in the API
- **TX-115 intervention detection**: degradation tracked day-by-day; post-maintenance recovery communicated explicitly (never flattened to "still at risk")
- **IBM Bob integration (load-bearing)**: advisories grounded in real SHAP values, with graceful deterministic fallback — the pipeline never fails due to a Bob call failure
- **FastAPI backend (9 endpoints) + HTML dashboard**: real pipeline output, no mock data, no build step

---

## Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python, JavaScript, HTML, CSS |
| **Frameworks** | FastAPI, scikit-learn, SHAP, pandas, numpy, uvicorn |
| **IBM Technologies** | IBM Bob (Claude claude-3-5-haiku-20241022) |
| **External APIs** | Open-Meteo (real weather), kagglehub (real training data) |

---

## Repository Structure

```
src/
  data/                 generate_synthetic.py + generated CSV files
  models/               train_health_index.py, train_dga_classifier.py, *.pkl
  pipeline/             score_asset_risk.py, grid_impact_ranker.py, maintenance_plan.py
  backend/              main.py (FastAPI, 9 endpoints)
  frontend/             index.html (single-file dashboard)
  requirements.txt
docs/
  problem-statement.md
  solution-overview.md
  architecture.md        (includes Mermaid system diagram)
  setup-guide.md
demo/
  screenshots/
  demo-video-link.txt
presentation/
submission.yaml
```

---

## How to Run

See [`docs/setup-guide.md`](docs/setup-guide.md) for complete instructions. Quick version:

```bash
# Install dependencies
pip install -r src/requirements.txt

# Generate data + train models
python src/data/generate_synthetic.py
python src/models/train_health_index.py
python src/models/train_dga_classifier.py

# Start backend
uvicorn src.backend.main:app --port 8000

# Open dashboard
# Open src/frontend/index.html in your browser
```

IBM Bob advisory generation requires `ANTHROPIC_API_KEY` in a `.env` file — fully optional, the system uses deterministic fallback without it.

---

## Demo

| Artifact | Link |
|---|---|
| Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| Screenshots | [See demo/screenshots/](demo/screenshots/) |
| Presentation | [See presentation/](presentation/) |

---

## Known Limitations

- **Health Index model R² = 0.717** (target ~0.76): real DGA datasets lack furan/DP measurements for paper insulation aging (IEEE C57.104 / CIGRE TB 296) — a dataset gap, not a modelling flaw
- **DGA Classifier T2 recall = 0.743**: T2 (moderate thermal fault) is confused with T1/T3 — documented in all T2 outputs; no claim of zero missed failures
- **RUL estimates are heuristic**: no ground-truth RUL labels exist in either dataset; calibration is documented and reproducible
- **Extreme archetype sensor values** (TX-107 C2H2 at 2,790 ppm) fall outside the RF model's training distribution — extrapolation, not interpolation
- No user authentication — API is open on localhost; not production-ready

---

## What We're Most Proud Of

The TX-115 intervention and stalled recovery story. It is not a toy example — every step of the degradation, the peak at Day 78 (RUL 7.7 days), the maintenance event, and the measurable recovery to RUL 97 days are traceable through the actual source code, data files, and API responses. The IBM Bob integration is genuinely load-bearing: advisories cite specific sensor readings and SHAP contributions from the real pipeline output.
