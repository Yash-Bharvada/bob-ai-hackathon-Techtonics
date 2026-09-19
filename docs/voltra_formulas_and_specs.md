# VOLTRA Model Formulas & Technical Specifications

This document is the authoritative reference for all mathematical formulas, thresholds, feature engineering steps, model hyperparameters, scoring logic, and pipeline constants used in the VOLTRA Grid Risk Intelligence & Operations Advisor system.

---

## 1. Model 1 — Health Index Regressor

### 1.1 Algorithm & Hyperparameters

| Parameter | Value |
|---|---|
| Algorithm | `RandomForestRegressor` (scikit-learn) |
| `n_estimators` | 200 |
| `min_samples_leaf` | 2 |
| `random_state` | 42 |
| Output file | `src/models/risk_model.pkl` |

### 1.2 Training Data

- **Source**: Kaggle — failure-analysis-in-power-transformers dataset
- **Records**: 470 real power transformer records
- **Target column**: `Health index` (continuous, 0–100 scale)

### 1.3 Validated Performance

| Metric | Value |
|---|---|
| Test R² | 0.717 |
| Test MAE | 5.88 |

**Known limitation**: Real DGA datasets lack furan/DP measurements for paper insulation aging (IEEE C57.104 / CIGRE TB 296). This is a dataset gap, not a modelling flaw.

### 1.4 Input Features (14 total)

The model consumes these 14 DGA and electrical measurements using their **full column names** from the data layer:

| Feature Name | Unit | Description |
|---|---|---|
| `Hydrogen` | ppm | Dissolved hydrogen gas |
| `Oxigen` | ppm | Dissolved oxygen |
| `Nitrogen` | ppm | Dissolved nitrogen |
| `Methane` | ppm | Dissolved methane |
| `CO` | ppm | Carbon monoxide |
| `CO2` | ppm | Carbon dioxide |
| `Ethylene` | ppm | Dissolved ethylene |
| `Ethane` | ppm | Dissolved ethane |
| `Acethylene` | ppm | Dissolved acetylene |
| `DBDS` | mg/kg | Dibenzyl disulfide |
| `Power factor` | — | Dielectric power factor |
| `Interfacial V` | mN/m | Interfacial tension of oil |
| `Dielectric rigidity` | kV | Dielectric breakdown voltage |
| `Water content` | ppm | Moisture in oil |

### 1.5 Health Index Scale

| Range | Condition |
|---|---|
| 13.4 | Pristine / new transformer baseline |
| < 30 | Healthy / normal operation |
| 30–50 | Medium / early degradation signals |
| 50–70 | Severe fault zone |
| ≥ 70 | Critical — imminent failure |

---

## 2. Remaining Useful Life (RUL) Heuristic

No ground-truth RUL labels exist in either Kaggle dataset. The heuristic is calibrated against documented transformer lifecycle literature and is reproducible from the formula below.

### 2.1 RUL Formula (piecewise)

```
If Health Index (HI) >= 70 (Critical zone):
    RUL = max(1.0,  8.0 - (HI - 70) × 0.2)          [days — steep: days to failure]

If 50 <= HI < 70 (Severe zone):
    RUL = max(8.0,  45.0 - (HI - 50) × 1.85)         [days]

If HI < 50 (Healthy zone):
    RUL = max(45.0, 180.0 - (HI - 13.4) × 3.65)      [days]
```

### 2.2 Risk Tier Thresholds

| Tier | Health Index Condition |
|---|---|
| `CRITICAL` | HI ≥ 70 |
| `HIGH` | 50 ≤ HI < 70 |
| `MEDIUM` | 30 ≤ HI < 50 |
| `LOW` | HI < 30 |

---

## 3. Model 2 — DGA Fault Classifier

### 3.1 Algorithm & Hyperparameters

| Parameter | Value |
|---|---|
| Algorithm | `RandomForestClassifier` (scikit-learn) |
| `n_estimators` | 300 |
| `max_depth` | 12 |
| `random_state` | 42 |
| Output file | `src/models/dga_fault_model.pkl` |

### 3.2 Training Data

- **Source**: Kaggle — DGA dissolved-gas-analysis dataset
- **Records**: 4,150 real DGA records
- **Target column**: IEC 60599 fault class (7 classes)

### 3.3 Validated Performance

| Metric | Value |
|---|---|
| Test Accuracy | 90.8% |
| Macro F1 | 0.896 |
| T2 recall (weakest class) | 0.743 |

**Known limitation**: T2 (moderate thermal fault) is confused with T1/T3. This limitation is disclosed in every T2 advisory output and visible in the fault probability breakdown in the UI.

### 3.4 Output Classes — IEC 60599 Fault Types

| Class | Full Name | Characteristic Gases | Severity |
|---|---|---|---|
| `NF` | No Fault | Baseline levels | — |
| `PD` | Partial Discharge | High H₂, CH₄ | Watchlist |
| `D1` | Low-Energy Electrical Discharge | C₂H₂, H₂ (sparking) | Moderate |
| `D2` | High-Energy Electrical Discharge (arcing) | C₂H₂, C₂H₄, H₂ | High |
| `T1` | Thermal Fault < 300°C | CH₄, CO | Moderate |
| `T2` | Thermal Fault 300–700°C | C₂H₄, CH₄ | High |
| `T3` | Thermal Fault > 700°C | C₂H₄, C₂H₆ | Critical |

### 3.5 Column Name Translation (CRITICAL)

Model 1 uses full chemical names; Model 2 uses short codes. This rename is applied **inside `score_asset_risk()`**, NOT in the data layer. If skipped, Model 2 silently receives wrong column names and produces incorrect fault classifications.

| Model 1 name (data layer) | Model 2 name (pipeline) |
|---|---|
| `Hydrogen` | `H2` |
| `Methane` | `CH4` |
| `Ethane` | `C2H6` |
| `Ethylene` | `C2H4` |
| `Acethylene` | `C2H2` |

### 3.6 Engineered Duval Triangle Features

Three IEC 60599 proxy ratio features are computed before Model 2 inference:

```
CH4_H2    = CH4  / (H2   + 1)     [methane-to-hydrogen ratio]
C2H2_C2H4 = C2H2 / (C2H4 + 1)     [acetylene-to-ethylene ratio]
C2H4_C2H6 = C2H4 / (C2H6 + 1)     [ethylene-to-ethane ratio]
```

The `+1` denominator guard prevents division-by-zero on clean (zero-gas) readings.

Model 2 input feature vector (8 features total):
```
[H2, CH4, C2H6, C2H4, C2H2, CH4_H2, C2H2_C2H4, C2H4_C2H6]
```

### 3.7 Duval Triangle Visualisation Feature Engineering

For the interactive Duval Triangle on the `/predict` page, percentages are computed as:

```
%CH4  = CH4  / (CH4 + C2H4 + C2H2)
%C2H4 = C2H4 / (CH4 + C2H4 + C2H2)
%C2H2 = C2H2 / (CH4 + C2H4 + C2H2)
```

These three percentages sum to 1.0 and define the position within the Duval Triangle fault zones.

---

## 4. SHAP Explainability

- **Method**: TreeSHAP (`shap.TreeExplainer`) applied to Model 1 (RandomForestRegressor)
- **Output**: Top-3 feature contributions per asset (feature name + SHAP value in health-index units)
- **Purpose**: Identifies which dissolved gas or electrical measurement is the primary driver of the health index for each asset
- **API field**: `top3_shap_features` → array of `[feature_name, shap_value]` tuples
- **UI display**: SHAP bar chart in the Asset Inspector modal on `/grid`

---

## 5. Composite Grid Impact Ranking Formula

### 5.1 Component Weights

| Component | Weight | Description |
|---|---|---|
| Health Index (normalised) | 35% (`HI_WEIGHT = 0.35`) | Primary damage signal from Model 1 |
| RUL (inverted, normalised) | 25% (`RUL_WEIGHT = 0.25`) | Time urgency — shorter RUL = higher risk |
| Fault Severity | 20% (`FAULT_WEIGHT = 0.20`) | Severity score by IEC fault class |
| MVA Rating (log-normalised) | 10% (`MVA_WEIGHT = 0.10`) | Larger transformer = greater grid impact if it fails |
| Historical Incident Rate | 10% (`INCIDENT_WEIGHT = 0.10`) | Repeat-failure risk from incident log |

### 5.2 Sub-Score Formulas

```
# Sub-score 1: Health Index (normalised, clipped to [0,1])
hi_norm = min(1.0, health_index / 100.0)

# Sub-score 2: RUL (inverted — shorter = higher risk; MAX_RUL = 180 days)
rul_norm = max(0.0, 1.0 - (rul_days / 180.0))

# Sub-score 3: Fault Severity (blended with model confidence)
# base_fault_sev from lookup table (see 5.3)
# If model confidence < 0.6, blend toward neutral (0.5)
effective_fault_sev = base_fault_sev × fault_confidence + 0.5 × (1 - fault_confidence)

# Sub-score 4: MVA (log scale, normalised; max_mva = 160 MVA)
mva_norm = min(1.0, log(1 + mva_rating) / log(1 + 160))

# Sub-score 5: Historical incident rate (normalised; max = 3 incidents/year)
inc_norm = min(1.0, incident_rate / 3.0)
```

### 5.3 Fault Severity Lookup Table

| Fault Type | Severity Score |
|---|---|
| `D2` | 0.90 — high-energy discharge, imminent insulation breakdown |
| `T3` | 0.85 — severe thermal, winding damage |
| `D1` | 0.75 — low-energy discharge, early arcing |
| `T2` | 0.65 — moderate thermal |
| `T1` | 0.55 — mild thermal |
| `PD` | 0.50 — partial discharge, watchlist |
| `NF` | 0.10 — no fault |

### 5.4 Criticality Multiplier

Applied to the raw composite score after weighted summation:

| Criticality Label | Multiplier |
|---|---|
| `Critical` | × 2.0 |
| `High` | × 1.5 |
| `Medium` | × 1.1 |
| `Low` | × 0.8 |

### 5.5 Final Composite Score

```
raw_score = (HI_WEIGHT × hi_norm)
          + (RUL_WEIGHT × rul_norm)
          + (FAULT_WEIGHT × effective_fault_sev)
          + (MVA_WEIGHT × mva_norm)
          + (INCIDENT_WEIGHT × inc_norm)

criticality_mult = CRITICALITY_MULT[criticality]   # from lookup table above
composite_score  = min(1.0, raw_score × criticality_mult)
```

The final `composite_score` is always in the range **[0.0, 1.0]**. Higher = more dangerous. All sub-scores are returned in the API response for full auditability.

---

## 6. Maintenance Action Codes

| Fault Type | Action Code | Short Description | Urgency (days) | Crew Type |
|---|---|---|---|---|
| `D1` | `ELEC-INSPECT` | Electrical inspection + targeted oil sampling | 7 | HV Electrical + Oil Chemistry |
| `D2` | `ELEC-URGENT` | Emergency electrical inspection + immediate load shedding | 1 | HV Electrical + Emergency Response |
| `PD` | `PD-MAP` | Partial discharge mapping + insulation resistance test | 3 | Diagnostic + Insulation |
| `T1` | `THERM-WATCH` | Thermal monitoring + cooling system check | 14 | Thermal + Mechanical |
| `T2` | `THERM-INSPECT` | Thermal inspection + load curtailment | 7 | Thermal + Chemistry |
| `T3` | `THERM-CRITICAL` | Critical thermal response + replacement planning | 1 | Thermal + Emergency Response |
| `NF` | `ROUTINE` | Routine condition monitoring — no intervention required | 180 | Routine Maintenance |
| TX-115 only | `TX115-MONITOR` | Post-intervention monitoring (cooling fan repair successful) | 14 | Thermal + Monitoring |

---

## 7. TX-115 Intervention Story (Key Demo Differentiator)

TX-115 (Zone-D, "Intervention & Stalled Recovery" archetype) is the primary demonstration of VOLTRA detecting both fault onset AND maintenance recovery:

| Day | Event | Health Index | RUL |
|---|---|---|---|
| 65 | Onset: cooling fan begins degrading | 13.7 | 148 days |
| 78 | Peak alarm: top-oil temp 91°C | **71.3** | **7.7 days** |
| 78–79 | Intervention: cooling fan overhaul + 20% load curtailment | — | — |
| 89 | Current snapshot | **36.1** | **97 days** |

Recovery: **+89 days of asset life recovered** from a 7.7-day imminent failure scenario.

The system labels TX-115 as "Stabilized / Monitoring" in all advisory outputs and includes a `tx115_narrative` block in the maintenance plan (`GET /api/plan`).

---

## 8. IEEE C57.104 Dissolved Gas Thresholds

| Gas | Condition 1 (Normal) | Condition 2 (Caution) | Condition 3 (High Risk) | Condition 4 (Extreme Danger) |
|---|---|---|---|---|
| H₂ (ppm) | < 100 | 100–700 | 700–1800 | > 1800 |
| CH₄ (ppm) | < 120 | 120–400 | 400–1000 | > 1000 |
| C₂H₂ (ppm) | < 35 | 35–50 | 50–80 | > 80 |
| C₂H₄ (ppm) | < 50 | 50–200 | 200–400 | > 400 |
| C₂H₆ (ppm) | < 65 | 65–100 | 100–150 | > 150 |
| CO (ppm) | < 350 | 350–570 | 570–1400 | > 1400 |
| CO₂ (ppm) | < 2500 | 2500–4000 | 4000–10000 | > 10000 |

---

## 9. Data Generation — 18-Asset Synthetic Timeseries

The 18 Anand District transformers are simulated across 90 days using 4 degradation archetypes:

| Archetype | Description | Example Assets |
|---|---|---|
| Steady degradation | Linear increase in HI over 90 days | TX-101, TX-102 |
| Fast degradation | Rapid escalation to CRITICAL by Day 60 | TX-107 |
| Stable / healthy | Minimal change, low HI throughout | TX-112 |
| Intervention & stalled recovery | Peak at Day 78, then partial recovery | TX-115 |

**Weather source**: Open-Meteo API, lat=22.56, lon=72.95 (Anand, Gujarat, India), 90-day real historical weather.

**TX-107 extrapolation note**: C₂H₂ values up to 2,790 ppm fall outside the training distribution of both models. Predictions for TX-107 are extrapolated territory and should be treated with additional caution.

---

## 10. Asset Registry — Anand District (18 Transformers)

The asset registry (`src/data/asset_registry.csv`) contains metadata for all 18 monitored transformers:

| Field | Description |
|---|---|
| `asset_id` | Unique transformer ID (e.g. TX-101 through TX-118) |
| `grid_zone` | Substation zone (Zone-A through Zone-F) |
| `mva_rating` | Rated capacity in MVA (ranges from 20 to 160 MVA) |
| `voltage_kv` | Operating voltage (11 kV, 66 kV, 132 kV, 220 kV) |
| `criticality` | Asset criticality label (Critical / High / Medium / Low) |
| `archetype` | Degradation pattern for synthetic data generation |

**Substations covered**: Anand Main, Vidyanagar, Karamsad, Mogar, Borsad, Umreth, Petlad, Khambhat, Tarapur.

---

## 11. Security — Prompt Injection Defence

Community incident reports (`POST /events/report`) pass through a two-layer filter:

1. **Regex first-pass**: scans for patterns `ignore previous instructions`, `system prompt`, `you are now`, `override`, `jailbreak`, `DAN mode`. Matched submissions are quarantined to `rejected_submissions_log.csv`.
2. **Closed-category classifier**: accepted reports are bucketed into: `excavation`, `storm_damage`, `wildfire`, `collision`, `explosion`, `grid_incident`.
3. **Bounded multiplier cap**: community reports can only apply a supplementary risk multiplier ≤ 1.25×. They can **never lower** a risk tier or override physical sensor data.
4. **Audit trail**: accepted events logged to `user_reported_events.csv` with `Unverified — user reported` disclaimer.
