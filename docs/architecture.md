# Architecture

## System Architecture

```mermaid
flowchart TD
    subgraph Data["Data Layer"]
        D1["Health index1.csv\n(Kaggle, 470 rows, real)"]
        D2["dga_dataset.csv\n(Kaggle, 4150 rows, real)"]
        D3["Synthetic time-series\n18 assets × 90 days\n4 archetypes"]
        D4["Open-Meteo API\n90-day real weather"]
        D5["Asset registry\nIncident log\nRisk events"]
    end

    subgraph Models["Model Layer  src/models/"]
        M1["Model 1 — Health Index\nRandomForestRegressor\nn=200, min_leaf=2\nR²=0.72, MAE=5.88\nSHAP TreeExplainer"]
        M2["Model 2 — DGA Fault\nRandomForestClassifier\nn=300, depth=12\nAcc=90.8%, F1=0.896\n7 classes: NF,D1,D2,PD,T1,T2,T3"]
    end

    subgraph Pipeline["Pipeline Layer  src/pipeline/"]
        P1["score_asset_risk()\nColumn rename step:\nHydrogen→H2, Methane→CH4\nEthane→C2H6, Ethylene→C2H4\nAcethylene→C2H2\nSHAP top-3 per asset"]
        P2["grid_impact_ranker()\n5-component weighted formula\nHI 35%, RUL 25%, Fault 20%\nMVA 10%, History 10%\n× criticality multiplier"]
        P3["maintenance_plan()\nFault-type-specific actions\nD1/D2→ELEC-INSPECT/URGENT\nT1/T2/T3→THERM-* actions\nPD→PD-MAP\nCrew pre-positioning"]
    end

    subgraph Bob["IBM Bob  (Anthropic API)"]
        B1["generate_advisory_text()\nPer-asset plain-English\nmaintenance advisory\nGrounded in sensor values\n& SHAP contributions"]
        B2["Graceful fallback:\nDeterministic template\nNever breaks pipeline"]
    end

    subgraph Backend["Backend  src/backend/  FastAPI"]
        E1["GET /health"]
        E2["GET /api/ranked"]
        E3["GET /api/asset/{id}"]
        E4["GET /api/plan"]
        E5["GET /api/timeseries/{id}"]
        E6["POST /api/score"]
        E7["GET /api/scores\nGET /api/assets\nGET /api/weather"]
    end

    subgraph Frontend["Frontend  src/frontend/  HTML+JS"]
        F1["Asset risk list\n(sidebar, ranked)"]
        F2["TX-115 intervention\nbanner (always visible)"]
        F3["Per-asset detail view\nHI, RUL, SHAP bars\n90-day sparkline\nFault probability breakdown"]
        F4["Maintenance plan table\nTop-10 prioritised actions\ndeadline + action code"]
    end

    D1 --> M1
    D2 --> M2
    D3 --> P1
    D4 --> D5
    D5 --> P2
    M1 --> P1
    M2 --> P1
    P1 --> B1
    B1 --> B2
    B2 --> P1
    P1 --> P2
    P2 --> P3
    P3 --> Backend
    Backend --> Frontend
```

## Data Flow Detail

### Column Name Translation (CRITICAL)
The two models use different naming conventions for the same five gases. The rename step is applied **in the integration pipeline** (`score_asset_risk.py`), never in the data layer:

```
Data layer (Model 1 names)  →  Model 2 names
Hydrogen                    →  H2
Methane                     →  CH4
Ethane                      →  C2H6
Ethylene                    →  C2H4
Acethylene                  →  C2H2
```

### RUL Heuristic
No ground-truth RUL labels exist in either dataset. The heuristic is calibrated as:
- HI ≥ 70: `RUL = max(1, 8 − (HI − 70) × 0.2)` — steep segment, imminent failure
- HI ≥ 50: `RUL = max(8, 45 − (HI − 50) × 1.85)` — severe zone
- HI < 50: `RUL = max(45, 180 − (HI − 13.4) × 3.65)` — healthy zone

### IBM Bob Integration Points
Bob is called in two places in the live pipeline:
1. **`score_asset_risk.py` → `generate_advisory_text()`**: per-asset advisory at scoring time
2. **`maintenance_plan.py` → `_generate_crew_summary_bob()`**: crew pre-positioning briefing

Both have deterministic fallbacks. The fallback text is grounded in the same sensor values — it is not generic boilerplate.

## Key Files

| File | Purpose |
|---|---|
| `src/data/generate_synthetic.py` | Synthetic data generation with 4 archetypes |
| `src/models/train_health_index.py` | Model 1 training (downloads from Kaggle) |
| `src/models/train_dga_classifier.py` | Model 2 training (downloads from Kaggle) |
| `src/pipeline/score_asset_risk.py` | Integration: both models + rename + SHAP + Bob |
| `src/pipeline/grid_impact_ranker.py` | Composite ranking with explicit weights |
| `src/pipeline/maintenance_plan.py` | Fault-type-specific actions + crew plan |
| `src/backend/main.py` | FastAPI: 9 endpoints, cached startup |
| `src/frontend/index.html` | Single-file dashboard, no build step |

## Deployment Notes

- No database required — all pipeline outputs are CSV/JSON files in `src/data/`
- Single Python process for backend; frontend is a static HTML file
- API key for IBM Bob is optional — fallback mode is fully functional without it
- Kaggle datasets are downloaded automatically on first model training run
