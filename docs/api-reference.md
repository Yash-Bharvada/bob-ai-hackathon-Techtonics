# API Reference — VOLTRA Grid Risk Advisor

Base URL (local): `http://localhost:8000`  
Interactive docs (Swagger UI): `http://localhost:8000/docs`

All ML, scoring, and weather endpoints work **without authentication**. Auth endpoints require MongoDB Atlas. Protected endpoints require a `Authorization: Bearer <token>` header.

---

## Health Check

### `GET /health`
Liveness check.

**Response:**
```json
{
  "status": "ok",
  "service": "grid-risk-api",
  "version": "1.0.0"
}
```

---

## Asset & Scoring Endpoints

### `GET /api/assets`
Returns the full 18-transformer asset registry.

**Response:**
```json
{
  "count": 18,
  "assets": [
    {
      "asset_id": "TX-101",
      "substation_name": "Anand Central Transmission Substation",
      "grid_zone": "Zone-A",
      "rated_mva": 63,
      "voltage_kv": "220/132",
      "age_years": 18,
      "manufacturer": "BHEL",
      "customer_count_served": 42000,
      "criticality": "High",
      "criticality_tier": "HIGH"
    }
  ]
}
```

---

### `GET /api/scores?day=89`
Returns ML scores for all assets at a given timeseries day (default: Day 89).

**Query parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `day` | int | 89 | Timeseries day (1–90). Day 89 = cached snapshot. Other days are computed on demand. |

**Response:**
```json
{
  "day": 89,
  "count": 18,
  "scores": [
    {
      "asset_id": "TX-107",
      "health_index_score": 72.1,
      "RUL_days": 6.8,
      "risk_tier": "CRITICAL",
      "fault_type": "D2",
      "fault_confidence": 0.84,
      "top3_shap_features": [["C2H2", 9.05], ["H2", 4.2], ["C2H4", 3.1]]
    }
  ]
}
```

---

### `GET /api/ranked`
Returns all 18 assets sorted by composite grid impact score (highest risk first). Includes ranking weights.

**Response:**
```json
{
  "count": 18,
  "weights": {
    "health_index": 0.35,
    "rul": 0.25,
    "fault_severity": 0.20,
    "mva_rating": 0.10,
    "incident_history": 0.10
  },
  "ranked_assets": [
    {
      "rank": 1,
      "asset_id": "TX-107",
      "substation_name": "GIDC Phase-2",
      "grid_zone": "Zone-B",
      "criticality_tier": "CRITICAL",
      "health_index": 72.1,
      "RUL_days": 6.8,
      "fault_type": "D2",
      "fault_prob": 0.84,
      "risk_tier": "CRITICAL",
      "composite_score": 0.923,
      "mva_rating": 100,
      "top_3_shap": [["C2H2", 9.05], ["H2", 4.2], ["C2H4", 3.1]]
    }
  ]
}
```

---

### `GET /api/asset/{asset_id}?generate_advisory=true`
Returns full detail for a single asset: ML scores, SHAP top-3, IBM Bob advisory, raw sensor readings, registry metadata.

**Path parameters:**
| Parameter | Description |
|---|---|
| `asset_id` | Transformer ID, e.g. `TX-115`, `TX-107` |

**Query parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `generate_advisory` | bool | `true` | Whether to call IBM Bob (or fallback) for advisory text |

**Response:**
```json
{
  "asset_id": "TX-115",
  "health_index": 36.1,
  "RUL_days": 97.0,
  "risk_tier": "MEDIUM",
  "fault_type": "T2",
  "fault_prob": 0.71,
  "fault_probabilities": {
    "NF": 0.02, "PD": 0.01, "D1": 0.04, "D2": 0.03,
    "T1": 0.12, "T2": 0.71, "T3": 0.07
  },
  "top_3_shap": [["C2H4", 3.2], ["CH4", 2.8], ["top_oil_temp_c", 2.1]],
  "advisory_text": "TX-115 at Anand North shows stabilized thermal profile following Day-78 cooling fan overhaul...",
  "advisory_source": "ibm_bob_llm",
  "sensor_readings": {
    "Hydrogen": 22.0,
    "Methane": 45.0,
    "Acethylene": 0.2,
    "top_oil_temp_c": 68.0
  },
  "registry": {
    "substation_name": "Anand North Substation",
    "rated_mva": 40,
    "age_years": 14
  },
  "composite_score": 0.421,
  "rank": 8
}
```

**Notes:**
- `advisory_source` is `"ibm_bob_llm"` when `ANTHROPIC_API_KEY` is set; `"deterministic_fallback"` otherwise
- Re-scores the latest timeseries row on every call (not cached per request)

---

### `GET /api/timeseries/{asset_id}`
Returns the 90-day sensor timeseries for one asset.

**Response:**
```json
{
  "asset_id": "TX-115",
  "days": 90,
  "timeseries": [
    {
      "day": 1,
      "date": "2024-09-01",
      "asset_id": "TX-115",
      "Hydrogen": 12.0,
      "Methane": 28.0,
      "Acethylene": 0.1,
      "top_oil_temp_c": 62.0,
      "load_pct": 68.0,
      "Health index": 14.2,
      "RUL_days": 145.0,
      "fault_mode": "NF"
    }
  ]
}
```

---

### `GET /api/plan`
Returns the 7-day maintenance plan with prioritised top-10 actions, crew schedule, and TX-115 narrative.

**Response:**
```json
{
  "generated_date": "2024-11-27",
  "total_actions": 18,
  "top_10_actions": [
    {
      "rank": 1,
      "asset_id": "TX-107",
      "substation_name": "GIDC Phase-2",
      "grid_zone": "Zone-B",
      "risk_tier": "CRITICAL",
      "fault_type": "D2",
      "action_code": "ELEC-URGENT",
      "short_action": "Emergency bushing inspection",
      "detail": "Immediate oil sampling + 15% load curtailment. Activate Zone-B standby.",
      "urgency_window": "24 hours",
      "crew_assignment": "Alpha-1",
      "crew_conflict": false
    }
  ],
  "crew_schedule": {
    "Alpha-1": ["TX-107", "TX-104"],
    "Beta-2": ["TX-112", "TX-103"]
  },
  "tx115_narrative": {
    "asset_id": "TX-115",
    "story": "TX-115 peaked at HI 71.3 (RUL 7.7d) on Day 78...",
    "degradation_peak": "Day 78: HI=71.3, RUL=7.7 days",
    "intervention": "Cooling fan overhaul + 20% load curtailment",
    "recovery_outcome": "Day 89: HI=36.1, RUL=97 days",
    "rul_recovered_days": 89
  }
}
```

---

## Ad-hoc Scoring Endpoints

### `POST /api/score`
Score a single transformer reading on demand.

**Request body (JSON):**
```json
{
  "asset_id": "MY-TX-01",
  "Hydrogen": 15.0,
  "Oxigen": 10000.0,
  "Nitrogen": 35000.0,
  "Methane": 30.0,
  "CO": 200.0,
  "CO2": 900.0,
  "Ethylene": 3.0,
  "Ethane": 15.0,
  "Acethylene": 0.1,
  "DBDS": 0.5,
  "Power_factor": 0.002,
  "Interfacial_V": 35.0,
  "Dielectric_rigidity": 60.0,
  "Water_content": 12.0,
  "top_oil_temp_c": 65.0,
  "generate_advisory": false
}
```

All fields are optional and default to healthy fleet-average values.

**Response:**
```json
{
  "asset_id": "MY-TX-01",
  "health_index": 18.4,
  "RUL_days": 138.0,
  "risk_tier": "LOW",
  "fault_type": "NF",
  "fault_prob": 0.89,
  "fault_probabilities": {"NF": 0.89, "PD": 0.04, "D1": 0.02, "T1": 0.03, "T2": 0.01, "T3": 0.01},
  "top_3_shap": [["Dielectric_rigidity", -2.1], ["Water_content", 0.8], ["Methane", 0.4]]
}
```

---

### `POST /api/score/csv`
Upload a CSV of transformer sensor readings for batch ML scoring.

**Request:** `multipart/form-data` with field `file` (a `.csv` file, max 5 MB)

**Required CSV columns** (case-sensitive):
`asset_id, Hydrogen, Oxigen, Nitrogen, Methane, CO, CO2, Ethylene, Ethane, Acethylene, DBDS, Power factor, Interfacial V, Dielectric rigidity, Water content, top_oil_temp_c, load_pct`

Missing columns are filled with fleet-average defaults.

**Response:**
```json
{
  "status": "ok",
  "total_rows": 3,
  "scored": 3,
  "errors": 0,
  "error_details": [],
  "results": [
    {
      "row": 0,
      "asset_id": "TX-SAMPLE-1",
      "health_index": 18.4,
      "RUL_days": 138.0,
      "risk_tier": "LOW",
      "fault_type": "NF",
      "fault_prob": 0.89
    }
  ]
}
```

---

### `GET /api/sample/csv`
Download a sample CSV template to fill and re-upload.

**Response:** `text/csv` file download named `voltra_sample_readings.csv`

---

## Weather Endpoints

### `GET /api/weather`
Returns the cached 90-day historical weather timeseries (from data generation).

**Response:**
```json
{
  "count": 90,
  "weather": [
    { "date": "2024-09-01", "temp_c": 29.4, "humidity": 72, "wind_kmh": 14.2 }
  ]
}
```

---

### `GET /api/weather/live?lat=22.56&lon=72.95`
Fetches real-time weather from Open-Meteo and computes a transformer thermal stress index.

**Query parameters:**
| Parameter | Default | Description |
|---|---|---|
| `lat` | `22.56` | Latitude (default: Anand, Gujarat) |
| `lon` | `72.95` | Longitude |

**Response:**
```json
{
  "status": "ok",
  "latitude": 22.56,
  "longitude": 72.95,
  "temperature_c": 34.2,
  "apparent_temp_c": 38.1,
  "humidity_pct": 74.0,
  "wind_speed_kmh": 12.3,
  "thermal_stress_pct": 23.6,
  "cooling_efficiency_pct": 76.4,
  "forecast_24h": [
    { "time": "2024-11-27T00:00", "temp": 28.4, "hour": 0 }
  ]
}
```

**Thermal stress index formula:**
- `base = max(0, (temp_c − 25) / 55) × 100`
- `hum_penalty = max(0, (humidity − 60) / 10) × 2`
- `wind_bonus = max(0, (wind_kmh − 10) / 40) × 5`
- `thermal_stress = min(100, base + hum_penalty − wind_bonus)`

---

## Community Events Endpoints

### `POST /events/report`
Submit a community or field-technician hazard report.

**Request body (JSON):**
```json
{
  "zone_name": "GIDC Industrial Phase-2",
  "event_description": "Construction excavator hit underground cable trench near Borsad Substation",
  "reporter_note": "Observed by municipal contractor",
  "reporter_type": "field_technician"
}
```

**`reporter_type` options:** `"citizen"`, `"field_technician"`, `"municipal_dispatcher"`

**Response (accepted):**
```json
{
  "status": "accepted",
  "incident_id": "EVT-20241127-0042",
  "category": "excavation",
  "risk_multiplier": 1.15,
  "disclaimer": "Unverified — user reported. Does not override sensor data.",
  "message": "Report logged. Zone-B risk multiplier updated to 1.15×."
}
```

**Response (rejected — injection attempt):**
```json
{
  "status": "rejected",
  "matched_pattern": "ignore previous instructions",
  "message": "Report rejected: potential adversarial content detected."
}
```

---

### `GET /api/events/stats`
Returns security pipeline counters from the event log files.

**Response:**
```json
{
  "processed": 47,
  "verified": 39,
  "quarantined": 8,
  "blocked": 3
}
```

---

### `POST /api/events/search`
Semantic geospatial hazard search powered by Google Gemini Flash.

**Request body (JSON):**
```json
{
  "query": "fire near substation",
  "zone": "Zone-B"
}
```

**Response:**
```json
{
  "status": "ok",
  "provider": "gemini",
  "threat_severity": "ELEVATED",
  "total_matched": 3,
  "active_risk_multiplier": 1.18,
  "geospatial_summary": "Two wildfire incidents and one explosion event in Zone-B over past 7 days...",
  "affected_assets": ["TX-107", "TX-108"],
  "cascading_risk_assessment": "Adjacent Zone-B transformers at elevated thermal stress...",
  "containment_protocols": ["Activate Zone-B standby transformer", "Pre-position Alpha crew"],
  "events": [...]
}
```

---

## Groq Trajectory Endpoint

### `POST /api/groq-report`
Generate a real-time 24-hour degradation trajectory and maintenance directives using Groq LPU.

**Request body (JSON):**
```json
{
  "asset_id": "TX-107",
  "health_index": 72.1,
  "rul_days": 6.8,
  "fault_type": "D2",
  "ambient_temp_c": 34.0,
  "load_mw": 85.0,
  "rated_mva": 100,
  "substation": "GIDC Phase-2",
  "c2h2_ppm": 2590,
  "ch4_ppm": 320,
  "h2_ppm": 890
}
```

**Response:**
```json
{
  "status": "ok",
  "provider": "groq",
  "asset_id": "TX-107",
  "executive_summary": "TX-107 is in critical electrical arcing state with RUL < 7 days...",
  "thermal_analysis": "Top-oil temperature at 91°C with ambient 34°C leaves only 9°C margin...",
  "weather_correlation": "Elevated ambient temperature reduces radiator cooling by ~18%...",
  "trajectory_forecast": "Without intervention, HI is projected to reach 80+ within 48 hours...",
  "recommended_actions": [
    {
      "priority": "HIGH",
      "action": "Emergency oil sampling and bushing inspection",
      "impact": "Confirms arcing source before failure",
      "timeline": "Within 6 hours"
    }
  ]
}
```

---

## Authentication Endpoints

All auth endpoints are under `/api/auth/` prefix.

### `POST /api/auth/register`
Create a new operator account.

**Request body (JSON):**
```json
{
  "name": "Purva Shah",
  "email": "24cs094@charusat.edu.in",
  "password": "securepassword123",
  "zone": "Zone-B · Heavy Manufacturing Corridor",
  "role": "Regional Dispatch Engineer",
  "designation": "Grid Risk Analyst"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "profile": {
    "id": "6739abc123...",
    "name": "Purva Shah",
    "email": "24cs094@charusat.edu.in",
    "role": "Regional Dispatch Engineer",
    "zone": "Zone-B · Heavy Manufacturing Corridor",
    "provider": "credentials",
    "createdAt": "2024-11-27T10:00:00Z"
  }
}
```

**Error codes:** `400` password too short, `409` email already exists

---

### `POST /api/auth/login`
Authenticate and get a JWT.

**Request body (JSON):**
```json
{
  "email": "24cs094@charusat.edu.in",
  "password": "securepassword123"
}
```

**Response:** Same as `/register` (token + profile)

**Error codes:** `401` invalid credentials

---

### `GET /api/auth/me`
Return the profile for the current bearer token.

**Headers:** `Authorization: Bearer <token>`

**Response:** Profile object (same schema as register/login)

---

### `POST /api/auth/logout`
Stateless logout — clears state cookie; JWT invalidation is client-side.

**Response:** `{"status": "ok", "message": "Signed out."}`

---

### `GET /api/auth/google`
Redirect the browser to Google OAuth 2.0 consent screen.

**Requires:** `GOOGLE_CLIENT_ID` set in environment.

---

### `GET /api/auth/google/callback`
Exchange Google auth code → upsert MongoDB user → mint JWT → redirect to frontend.

**Redirects to:** `{FRONTEND_URL}/login?token=<jwt>&name=<name>&email=<email>`

---

## Error Responses

All endpoints return standard FastAPI error format:

```json
{
  "detail": "Asset 'TX-999' not found."
}
```

| HTTP Status | Meaning |
|---|---|
| `400` | Bad request (validation error, file type mismatch) |
| `401` | Missing or invalid Bearer token |
| `404` | Asset ID not found in timeseries |
| `409` | Duplicate email on register |
| `413` | CSV file exceeds 5 MB limit |
| `422` | CSV parse error or empty file |
| `500` | ML scoring pipeline error |
| `502` | Upstream API (Open-Meteo) error |
| `503` | Frontend SSR not yet initialized (Docker startup) |
| `504` | Open-Meteo request timed out |
