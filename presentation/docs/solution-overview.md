# Solution Overview — VOLTRA Grid Risk Advisor

## What We Built

**VOLTRA** is a full-stack predictive grid intelligence platform for power transformer health monitoring and proactive maintenance planning. It spans a complete pipeline from raw sensor data through ML inference to an operator-facing console — with no mock data anywhere in the system.

The platform consists of five layers that work together:

1. **Real ML models** trained on Kaggle transformer failure datasets
2. **A deterministic scoring pipeline** that scores all 18 Anand District transformers every day
3. **A FastAPI backend** with 20+ endpoints exposing every layer of the pipeline
4. **IBM Bob AI advisories** grounded in actual sensor readings and SHAP attribution values
5. **A React 19 operator console** (VOLTRA) with five routes, cinematic intro, live grid, prediction studio, and community incident reporting

---

## How It Works — Core Mechanism

### Step 1 — Health Index Prediction (Model 1)

A `RandomForestRegressor` trained on the **Kaggle failure-analysis-in-power-transformers** dataset (470 real transformer records) predicts a continuous *health index* (damage score, 0–100) for each asset from 14 DGA and electrical measurements:

> Hydrogen, Oxygen, Nitrogen, Methane, CO, CO₂, Ethylene, Ethane, Acetylene, DBDS, Power factor, Interfacial voltage, Dielectric rigidity, Water content

**Damage scale:** 13.4 = pristine, 50+ = severe fault zone, 70+ = critical/imminent failure.

A calibrated heuristic converts health index to **Remaining Useful Life (RUL)** in days:
- HI ≥ 70 → `RUL = max(1, 8 − (HI − 70) × 0.2)` — steep: days to failure
- HI ≥ 50 → `RUL = max(8, 45 − (HI − 50) × 1.85)` — severe zone
- HI < 50 → `RUL = max(45, 180 − (HI − 13.4) × 3.65)` — healthy range

**Validated performance:** held-out test R² = 0.72, MAE = 5.88

### Step 2 — DGA Fault Classification (Model 2)

A `RandomForestClassifier` trained on the **Kaggle DGA dissolved-gas-analysis** dataset (4,150 real records) classifies the developing fault into 7 IEC 60599 categories:

| Class | Fault Type | Characteristic Gas |
|---|---|---|
| NF | No Fault | Baseline levels |
| PD | Partial Discharge | High H₂, CH₄ |
| D1 | Low-energy electrical discharge | C₂H₂, H₂ |
| D2 | High-energy electrical discharge (arcing) | C₂H₂, C₂H₄, H₂ |
| T1 | Thermal fault < 300°C | CH₄, CO |
| T2 | Thermal fault 300–700°C | C₂H₄, CH₄ |
| T3 | Thermal fault > 700°C | C₂H₄, C₂H₆ |

Three IEC 60599 Duval triangle proxy features are engineered before inference: CH₄/H₂, C₂H₂/C₂H₄, C₂H₄/C₂H₆.

**Validated performance:** accuracy = 90.8%, macro F1 = 0.896. Known limitation: T2 recall = 0.743 (T2 confused with T1/T3 — documented in every T2 advisory output).

### Step 3 — Composite Grid Impact Ranking

A transparent weighted formula ranks all 18 assets by combined risk to the grid:

| Component | Weight | Rationale |
|---|---|---|
| Health index (normalised) | 35% | Primary damage signal |
| RUL (inverted, normalised) | 25% | Time urgency |
| Fault severity (by class) | 20% | D2/T3 > D1/T2 > T1/PD > NF |
| MVA rating (log-normalised) | 10% | Larger transformer = higher grid impact |
| Historical incident rate | 10% | Repeat-failure risk |

A criticality multiplier (2× for Critical assets, 1.5× for High) is applied after the weighted sum. Every sub-score is returned in the API for full auditability.

### Step 4 — IBM Bob Advisory Generation

IBM Bob (Claude claude-3-5-haiku-20241022) is called for each asset with a structured prompt containing:
- Actual sensor ppm readings (H₂, CH₄, C₂H₂, C₂H₄, C₂H₆, dielectric rigidity, oil temperature)
- SHAP top-3 feature attributions (feature name + contribution magnitude)
- Health index, RUL, fault class, risk tier

The result is a 3–4 sentence plain-English advisory citing specific numbers and recommending the appropriate action code (ELEC-INSPECT, THERM-CHECK, PD-MAP, etc.).

**Fallback:** if the API key is absent or the call fails, a deterministic template engine generates an advisory grounded in the same sensor data. The pipeline never raises an exception due to an advisory failure.

### Step 5 — 7-Day Maintenance Plan

The maintenance planner maps each fault type to standardised utility action codes:

| Fault | Action Code | Description |
|---|---|---|
| D1 | ELEC-INSPECT | Bushing + tap-changer oil sampling |
| D2 | ELEC-URGENT | Emergency bushing inspection + 15–20% load curtailment |
| T1/T2 | THERM-CHECK | Radiator fin + cooling fan overhaul |
| T3 | THERM-URGENT | Emergency thermal scan + load transfer |
| PD | PD-MAP | Acoustic partial discharge mapping |
| NF | MONITOR | Continue 30-day DGA monitoring |

Crew pre-positioning is scheduled by zone, with conflict detection for overlapping assignments.

---

## The TX-115 Intervention Story

TX-115 is the demonstration differentiator. Most hackathon projects detect fault states but cannot confirm when maintenance worked. VOLTRA does both:

| Day | Event | Health Index | RUL |
|---|---|---|---|
| 65 | Onset: cooling fan begins degrading | 13.7 | 148d |
| 78 | Peak alarm: top-oil temp 91°C | **71.3** | **7.7 days** |
| 78–79 | Intervention: cooling fan overhaul + 20% load curtailment | — | — |
| 89 | Current snapshot | **36.1** | **97 days** |

The system detects this recovery trajectory, explicitly labels the asset as "Stabilized / Monitoring" in the advisory, and includes an `tx115_narrative` block in the maintenance plan output that communicates the **+89 days of asset life recovered**.

---

## The VOLTRA Operator Console — 5 Routes

### `/` — Home
Cinematic 168-frame WebP scroll-based landing sequence. After the intro, presents the TX-115 intervention story, the pipeline architecture overview, and real-time KPI snapshots from the API.

### `/dashboard`
KPI cards (monitored assets, critical/high risk count, watch tier count, mean health score), RUL distribution histogram, fault analysis breakdown by type, live sync from `GET /api/ranked`.

### `/grid` — Live Grid Operator Console
The primary operational screen:
- **18 transformer cards** auto-updated every 8 seconds from `GET /api/ranked`
- **Anand District topology diagram** — interactive grid map with node status colours
- **Asset inspector modal** — opens on card click: health index, RUL, fault probabilities, 90-day degradation chart (Recharts), SHAP bar chart, IBM Bob advisory, raw sensor readings
- **7-day maintenance plan table** — from `GET /api/plan`, showing top-10 prioritised actions with deadlines, crew assignments, and action codes
- **TX-115 Intervention Banner** — always visible; shows 4-step recovery timeline
- **Community incident reporting modal** — `POST /events/report` with client-side injection filter preview + backend quarantine

### `/predict` — Prediction Studio
Interactive dual ML simulation:
- **DGA gas sliders** (H₂, CH₄, C₂H₂, C₂H₄, C₂H₆, dielectric rigidity) → real-time `POST /api/score` call
- **Preset scenario buttons** (Healthy, Thermal Stress, Arcing Fault, Critical) — fills sliders to archetype values
- **CSV batch upload** — drag-and-drop or file picker → `POST /api/score/csv` → tabular results
- **Sample CSV download** — `GET /api/sample/csv`
- **Local heuristic fallback** — works offline without backend using `src/frontend/src/lib/prediction.ts`

### `/technology` — Methodology & Architecture
Documentation page within the app:
- 4 sensing pillars (DGA, thermal, electrical, physical)
- 5-stage ML pipeline diagram
- Empirical benchmarks with honest limitation statements
- IEC 60599 Duval triangle explanation
- SHAP explainability section

### `/login`
- Email + password registration and login (JWT, MongoDB Atlas)
- Google OAuth 2.0 sign-in
- Guest "Preview Mode" — all pages accessible without login using the curated Day-89 snapshot

---

## AI Integration — Three Models

| AI | Endpoint | Role | Fallback |
|---|---|---|---|
| IBM Bob (Claude 3.5 Haiku) | `GET /api/asset/{id}` | Per-asset plain-English advisory grounded in SHAP | Deterministic template |
| Groq LPU API | `POST /api/groq-report` | Real-time 24-hour degradation trajectory forecast | HTTP error returned to client |
| Google Gemini Flash | `POST /api/events/search` | Semantic geospatial hazard area analysis with cascading risk assessment | HTTP error returned to client |

---

## Security Design

### Prompt-Injection Defence
Community reports submitted via `POST /events/report` pass through:
1. Client-side regex pre-check in `incidentReport.ts` (shows warning before submission)
2. Server-side regex filter against known injection patterns
3. Quarantine: flagged submissions saved to `rejected_submissions_log.csv`, never reach any model or database
4. Bounded multiplier: accepted reports can only increase risk by ≤ 1.25×; cannot decrease any risk tier

### Auth Security
- Passwords stored as bcrypt hashes (cost factor 12)
- JWTs signed with HS256, 7-day expiry, `email` + MongoDB ObjectId in claims
- Google OAuth CSRF protection via state cookie
- Frontend clears session on 401 responses

---

## Honest Performance Statements

- **Health Index R² = 0.717** (not 100%): real transformer datasets lack furan and DP measurements needed to fully model paper insulation aging (IEEE C57.104 / CIGRE TB 296). This is a dataset limitation, not a modelling error.
- **DGA Classifier T2 recall = 0.743**: T2 (moderate thermal fault) is confused with T1/T3. This is documented in every T2 advisory and visible in the fault probability breakdown in the UI.
- **RUL is heuristic**: no ground-truth RUL labels exist in the Kaggle datasets. The calibration is documented, reproducible, and disclosed in the UI.
- **TX-107 sensor values** (C₂H₂ at 2,790 ppm) are extrapolation territory for the trained RF model — predictions in this range are extrapolated beyond the training distribution.
