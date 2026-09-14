# Solution Overview

## What We Built

**Grid Risk Advisor** is a power transformer health monitoring and maintenance planning system. It combines two machine learning models trained on real transformer failure datasets with a FastAPI backend and an interactive HTML dashboard.

## Core Mechanism

The system works in four steps:

### 1. Health Index Prediction (Model 1)
A `RandomForestRegressor` trained on the **Kaggle failure-analysis-in-power-transformers** dataset (470 real transformer records) predicts a continuous *health index* (damage score) for each asset. Inputs are 14 DGA and electrical measurements:

> Hydrogen, Oxigen, Nitrogen, Methane, CO, CO2, Ethylene, Ethane, Acethylene, DBDS, Power factor, Interfacial V, Dielectric rigidity, Water content

The health index is a **damage score** (13.4 = pristine, ≥50 = severe fault, ≥70 = critical). A calibrated heuristic converts it to **Remaining Useful Life (RUL)** in days.

**Validated performance**: held-out test R² = 0.72, MAE = 5.88 (target: R² ~0.76, MAE ~6).

### 2. DGA Fault Classification (Model 2)
A `RandomForestClassifier` trained on the **Kaggle DGA dissolved-gas-analysis** dataset (4,150 real records) classifies the fault type into IEC categories: NF, PD, D1, D2, T1, T2, T3.

Three engineered gas-ratio features (CH4/H2, C2H2/C2H4, C2H4/C2H6) are added before inference — these are the standard IEC 60599 Duval triangle proxies.

**Validated performance**: accuracy = 90.8%, macro F1 = 0.896. Known limitation: T2 recall = 0.743 (thermal grade T2 is confused with T1/T3 — documented and reported honestly in all outputs).

### 3. Composite Grid Impact Ranking
A transparent weighted formula ranks all 18 assets:

| Component | Weight | Rationale |
|---|---|---|
| Health index (normalised) | 35% | Primary damage signal |
| RUL (inverted, normalised) | 25% | Time urgency |
| Fault severity (by type) | 20% | D2/T3 > D1/T1 > PD > NF |
| MVA rating (log-normalised) | 10% | Larger transformer = higher grid impact |
| Historical incident rate | 10% | Repeat-failure risk |

A criticality multiplier (2× for Critical assets) is applied after the weighted sum. Every sub-score is returned in the API response for full auditability.

### 4. IBM Bob Advisory Generation
IBM Bob (Claude claude-3-5-haiku-20241022) is called for each asset to generate a plain-English maintenance advisory grounded in actual sensor values and SHAP feature contributions. If the Bob API call fails (network, rate limit, missing key), a deterministic template-based fallback is used — the core scoring and ranking pipeline is **never interrupted** by an advisory failure.

## The TX-115 Intervention Story

TX-115 is the key demo differentiator: a transformer that was heading toward imminent failure (health index 71.3, RUL 7.7 days on Day 78) and was **rescued** by a cooling fan repair and load curtailment. By Day 89 its health index had fallen to 36.1 and RUL recovered to 97 days — 89 additional days of asset life recovered by a timely, targeted intervention. The system detects, tracks, and communicates this recovery explicitly, never conflating a recovering asset with one that is "still at risk."

## Architecture Summary

```
Real Kaggle datasets → Model training (src/models/)
Synthetic time-series → Integration pipeline (src/pipeline/)
                       → FastAPI backend (src/backend/)
                       → HTML dashboard (src/frontend/)
                       → IBM Bob advisories (in-pipeline)
```

See [architecture.md](architecture.md) for the full Mermaid diagram.

## Honest Performance Statements

- Health Index model explains ~72% of variance on real transformer data. The gap from 100% reflects a known, citable limitation: real transformer datasets lack furan and DP (degree of polymerisation) measurements needed to capture paper insulation aging (IEEE C57.104 / CIGRE TB 296). This is a dataset limitation, not a modelling flaw.
- DGA fault classifier achieves 91% accuracy and macro F1 0.90. T2 recall is 0.743 — this is documented and exposed in every T2 advisory output.
- RUL estimates are heuristic (no ground truth available in the Kaggle dataset). The calibration is documented and reproducible; the uncertainty is disclosed in the UI.
