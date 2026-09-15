"""
Stage 6 — FastAPI Backend
==========================
Wraps the pipeline in a REST API. Core score/rank endpoints NEVER fail
due to advisory-generation errors — Bob/LLM calls are fully isolated.

Endpoints:
  GET  /health                  — liveness check
  GET  /api/assets              — all assets from registry
  GET  /api/scores              — scored snapshot (Day 89 by default)
  GET  /api/ranked              — ranked asset list with composite scores
  GET  /api/asset/{asset_id}    — single-asset detail: score + SHAP + advisory
  GET  /api/plan                — full maintenance plan
  GET  /api/weather             — weather data
  GET  /api/timeseries/{asset_id} — 90-day time-series for one asset
  POST /api/score               — score an ad-hoc sensor reading (JSON body)
  GET  /api/weather/live        — real-time Open-Meteo weather for a lat/lon
  POST /api/score/csv           — upload CSV of sensor readings → ML scores
  GET  /api/sample/csv          — download a sample CSV template
"""

import ast
import io
import json
import sys
from pathlib import Path

# Load .env from the backend directory before anything else
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# Make backend and pipeline importable both at runtime and for IDE static analysis
BACKEND_DIR  = Path(__file__).parent
SRC_DIR      = BACKEND_DIR.parent
PIPELINE_DIR = SRC_DIR / "pipeline"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import httpx
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from auth_router import router as auth_router

from pipeline.score_asset_risk import score_asset_risk, score_all_assets
from pipeline.grid_impact_ranker import rank_assets
from pipeline.maintenance_plan import generate_maintenance_plan

DATA_DIR = SRC_DIR / "data"

app = FastAPI(
    title="Power Outage Prediction & Grid Equipment Failure Advisor",
    description=(
        "Combines two trained ML models (Health Index regression + DGA Fault Classifier) "
        "to score, rank, and generate maintenance plans for 18 grid transformers. "
        "IBM Bob generates grounded plain-English advisories."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth routes (/api/auth/*) ──────────────────────────────────────────────────
app.include_router(auth_router)

# ---------------------------------------------------------------------------
# Cached data — loaded once at startup
# ---------------------------------------------------------------------------
_cache: Dict[str, Any] = {}


def _load_cache() -> None:
    if _cache:
        return

    # Asset registry
    reg_path = DATA_DIR / "asset_registry.csv"
    if reg_path.exists():
        _cache["registry"] = pd.read_csv(reg_path).to_dict(orient="records")
    else:
        _cache["registry"] = []

    # Scored snapshot
    snap_path = DATA_DIR / "scored_snapshot_day89.csv"
    if snap_path.exists():
        df = pd.read_csv(snap_path)
        # Parse top3_shap_features string -> list
        if "top3_shap_features" in df.columns:
            df["top3_shap_features"] = df["top3_shap_features"].apply(
                lambda v: ast.literal_eval(str(v)) if pd.notna(v) else []
            )
        _cache["scored"] = df
    else:
        _cache["scored"] = score_all_assets(generate_advisory=False)
        _cache["scored"].to_csv(snap_path, index=False)

    # Ranked assets
    ranked_path = DATA_DIR / "ranked_assets.csv"
    if ranked_path.exists():
        _cache["ranked"] = pd.read_csv(ranked_path)
    else:
        _cache["ranked"] = rank_assets(_cache["scored"])

    # Maintenance plan
    plan_path = DATA_DIR / "maintenance_plan.json"
    if plan_path.exists():
        with open(plan_path) as f:
            _cache["plan"] = json.load(f)
    else:
        plan = generate_maintenance_plan(_cache["ranked"])
        plan_for_json = {k: v for k, v in plan.items() if k != "top10_table"}
        with open(plan_path, "w") as f:
            json.dump(plan_for_json, f, indent=2)
        _cache["plan"] = plan_for_json

    # Time-series
    ts_path = DATA_DIR / "transformer_timeseries.csv"
    if ts_path.exists():
        _cache["timeseries"] = pd.read_csv(ts_path)
    else:
        _cache["timeseries"] = pd.DataFrame()

    # Weather
    wx_path = DATA_DIR / "weather.csv"
    if wx_path.exists():
        _cache["weather"] = pd.read_csv(wx_path).to_dict(orient="records")
    else:
        _cache["weather"] = []


@app.on_event("startup")
async def startup_event():
    _load_cache()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _df_to_records(df: pd.DataFrame) -> list:
    """Convert DataFrame to JSON-safe records."""
    records = []
    for row in df.to_dict(orient="records"):
        clean = {}
        for k, v in row.items():
            if isinstance(v, float) and (v != v):  # NaN check
                clean[k] = None
            elif hasattr(v, "item"):                # numpy scalar
                clean[k] = v.item()
            else:
                clean[k] = v
        records.append(clean)
    return records


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "grid-risk-api", "version": "1.0.0"}


@app.get("/api/assets")
def get_assets():
    """Return the full asset registry (18 transformers)."""
    _load_cache()
    return {"count": len(_cache["registry"]), "assets": _cache["registry"]}


@app.get("/api/scores")
def get_scores(day: int = 89):
    """Return scored snapshot for all assets. day parameter selects the time-series day."""
    _load_cache()
    if day == 89:
        df = _cache["scored"]
    else:
        df = score_all_assets(day=day, generate_advisory=False)
    records = _df_to_records(df)
    return {"day": day, "count": len(records), "scores": records}


@app.get("/api/ranked")
def get_ranked():
    """Return assets sorted by composite grid impact score (highest risk first)."""
    _load_cache()
    df = _cache["ranked"]
    records = _df_to_records(df)
    # Normalise field names for the frontend
    for r in records:
        if "health_index_score" in r:
            r["health_index"] = r.pop("health_index_score")
        if "top3_shap_features" in r:
            r["top_3_shap"] = r.pop("top3_shap_features")
        if "fault_confidence" in r:
            r["fault_prob"] = r.pop("fault_confidence")
    return {
        "count": len(records),
        "weights": {
            "health_index": 0.35,
            "rul": 0.25,
            "fault_severity": 0.20,
            "mva_rating": 0.10,
            "incident_history": 0.10,
        },
        "ranked_assets": records,
    }


@app.get("/api/asset/{asset_id}")
def get_asset_detail(asset_id: str, generate_advisory: bool = True):
    """
    Single-asset detail view: model scores, SHAP top-3, advisory text.
    Advisory generation calls IBM Bob with graceful fallback.
    """
    _load_cache()

    # Get latest sensor reading from timeseries
    ts = _cache.get("timeseries", pd.DataFrame())
    if ts.empty:
        raise HTTPException(404, "Time-series data not loaded.")

    asset_ts = ts[ts["asset_id"] == asset_id]
    if asset_ts.empty:
        raise HTTPException(404, f"Asset '{asset_id}' not found.")

    latest = asset_ts.sort_values("day").iloc[-1].to_dict()

    # Score (with advisory if requested)
    try:
        result = score_asset_risk(latest, generate_advisory=generate_advisory)
    except Exception as exc:
        raise HTTPException(500, f"Scoring failed: {exc}")

    # Normalise field names so the frontend gets consistent keys
    # health_index_score -> health_index
    result["health_index"] = result.pop("health_index_score", result.get("health_index"))
    # fault_proba_all -> fault_probabilities (normalised to 0–1 fractions)
    raw_proba = result.pop("fault_proba_all", {})
    total_votes = sum(raw_proba.values()) if raw_proba else 1.0
    if total_votes > 0:
        result["fault_probabilities"] = {k: round(v / total_votes, 4) for k, v in raw_proba.items()}
        # fault_prob is the max class probability (normalised)
        result["fault_prob"] = round(max(raw_proba.values()) / total_votes, 4)
    else:
        result["fault_probabilities"] = raw_proba
        result["fault_prob"] = result.pop("fault_confidence", 0.0)
    # top3_shap_features -> top_3_shap
    result["top_3_shap"] = result.pop("top3_shap_features", [])
    # Remove raw fault_confidence if still present
    result.pop("fault_confidence", None)

    # Attach full raw sensor readings so the frontend can populate sliders
    sensor_keys = [
        "Hydrogen", "Methane", "Acethylene", "Ethylene", "Ethane",
        "CO", "CO2", "Oxigen", "Nitrogen", "DBDS",
        "Power factor", "Interfacial V", "Dielectric rigidity", "Water content",
        "top_oil_temp_c", "load_pct",
    ]
    result["sensor_readings"] = {
        k: (None if (v != v) else v)   # convert NaN -> None
        for k, v in latest.items()
        if k in sensor_keys
    }

    # Merge registry metadata
    reg_df = pd.DataFrame(_cache["registry"])
    meta = reg_df[reg_df["asset_id"] == asset_id].to_dict(orient="records")
    result["registry"] = meta[0] if meta else {}

    # Merge ranked position
    ranked = _cache["ranked"]
    ranked_row = ranked[ranked["asset_id"] == asset_id]
    if not ranked_row.empty:
        result["composite_score"] = float(ranked_row.iloc[0]["composite_score"])
        result["rank"] = int(ranked_row.iloc[0]["rank"])

    return result


@app.get("/api/plan")
def get_plan():
    """Return the full maintenance plan with crew pre-positioning."""
    _load_cache()
    return _cache["plan"]


@app.get("/api/weather")
def get_weather():
    """Return the 90-day weather time-series."""
    _load_cache()
    return {"count": len(_cache["weather"]), "weather": _cache["weather"]}


@app.get("/api/timeseries/{asset_id}")
def get_timeseries(asset_id: str):
    """Return 90-day sensor time-series for a single asset."""
    _load_cache()
    ts = _cache.get("timeseries", pd.DataFrame())
    if ts.empty:
        raise HTTPException(404, "Time-series not loaded.")

    asset_ts = ts[ts["asset_id"] == asset_id]
    if asset_ts.empty:
        raise HTTPException(404, f"Asset '{asset_id}' not found.")

    records = _df_to_records(asset_ts.sort_values("day"))
    return {"asset_id": asset_id, "days": len(records), "timeseries": records}


# ---------------------------------------------------------------------------
# Ad-hoc scoring endpoint
# ---------------------------------------------------------------------------
class SensorReading(BaseModel):
    asset_id: str = "ADHOC"
    Hydrogen:           float = 15.0
    Oxigen:             float = 10000.0
    Nitrogen:           float = 35000.0
    Methane:            float = 30.0
    CO:                 float = 200.0
    CO2:                float = 900.0
    Ethylene:           float = 3.0
    Ethane:             float = 15.0
    Acethylene:         float = 0.1
    DBDS:               float = 0.5
    Power_factor:       float = 0.002
    Interfacial_V:      float = 35.0
    Dielectric_rigidity: float = 60.0
    Water_content:      float = 12.0
    top_oil_temp_c:     float = 65.0
    generate_advisory:  bool  = False


@app.post("/api/score")
def score_adhoc(reading: SensorReading):
    """
    Score an ad-hoc sensor reading (JSON body).
    Field names with underscores are mapped back to spaced versions for Model 1.
    """
    sensor_dict = reading.model_dump()
    # Map underscored field names back to Model 1 feature names
    rename_map = {
        "Power_factor":        "Power factor",
        "Interfacial_V":       "Interfacial V",
        "Dielectric_rigidity": "Dielectric rigidity",
        "Water_content":       "Water content",
    }
    for old, new in rename_map.items():
        if old in sensor_dict:
            sensor_dict[new] = sensor_dict.pop(old)

    gen_advisory = sensor_dict.pop("generate_advisory", False)

    try:
        result = score_asset_risk(sensor_dict, generate_advisory=gen_advisory)
    except Exception as exc:
        raise HTTPException(500, f"Scoring failed: {exc}")

    # Normalise field names for the frontend
    result["health_index"] = result.pop("health_index_score", result.get("health_index"))
    raw_proba = result.pop("fault_proba_all", {})
    total_votes = sum(raw_proba.values()) if raw_proba else 1.0
    if total_votes > 0:
        result["fault_probabilities"] = {k: round(v / total_votes, 4) for k, v in raw_proba.items()}
        result["fault_prob"] = round(max(raw_proba.values()) / total_votes, 4)
    else:
        result["fault_probabilities"] = raw_proba
        result["fault_prob"] = result.pop("fault_confidence", 0.0)
    result["top_3_shap"] = result.pop("top3_shap_features", [])
    result.pop("fault_confidence", None)

    return result


# ---------------------------------------------------------------------------
# Live weather — Open-Meteo
# ---------------------------------------------------------------------------

# DGA gas column names expected by the scoring pipeline
_CSV_SENSOR_COLS = [
    "asset_id", "Hydrogen", "Oxigen", "Nitrogen", "Methane", "CO", "CO2",
    "Ethylene", "Ethane", "Acethylene", "DBDS", "Power factor",
    "Interfacial V", "Dielectric rigidity", "Water content",
    "top_oil_temp_c", "load_pct",
]

_SAMPLE_CSV_ROWS = [
    "asset_id,Hydrogen,Oxigen,Nitrogen,Methane,CO,CO2,Ethylene,Ethane,Acethylene,DBDS,Power factor,Interfacial V,Dielectric rigidity,Water content,top_oil_temp_c,load_pct",
    "TX-SAMPLE-1,15,9800,36000,30,200,900,3,15,0.1,0.5,0.002,35,60,12,65,70",
    "TX-SAMPLE-2,80,9500,35500,120,350,1500,25,60,8,0.3,0.006,28,45,18,75,85",
    "TX-SAMPLE-3,5,10200,36800,12,90,600,1,8,0.05,0.6,0.0015,38,65,9,58,55",
]


@app.get("/api/weather/live")
async def get_live_weather(lat: float = 22.56, lon: float = 72.95):
    """
    Fetch real-time weather from Open-Meteo for any lat/lon.
    Returns ambient temperature, humidity, wind speed, and a thermal-stress index
    useful for evaluating cooling headroom on substation transformers.
    """
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature"
        "&hourly=temperature_2m"
        "&forecast_days=1"
        "&timezone=auto"
    )
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(502, f"Open-Meteo returned HTTP {resp.status_code}")
        data = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(504, "Open-Meteo request timed out")

    cur = data.get("current", {})
    temp_c: float      = cur.get("temperature_2m", 30.0)
    humidity: float    = cur.get("relative_humidity_2m", 60.0)
    wind_kmh: float    = cur.get("wind_speed_10m", 10.0)
    apparent_c: float  = cur.get("apparent_temperature", temp_c)

    # Thermal-stress index for transformers:
    #   base = normalised temperature above 25°C reference
    #   humidity component: every 10% above 60% adds ~2% stress
    #   wind penalty: low wind (<10 km/h) worsens cooling
    base_stress  = max(0.0, (temp_c - 25.0) / 55.0) * 100.0
    hum_penalty  = max(0.0, (humidity - 60.0) / 10.0) * 2.0
    wind_bonus   = max(0.0, (wind_kmh - 10.0) / 40.0) * 5.0
    thermal_stress = round(min(100.0, base_stress + hum_penalty - wind_bonus), 1)

    # Build 24-hour forecast from hourly data (up to 24 pts)
    hourly_times  = data.get("hourly", {}).get("time", [])[:24]
    hourly_temps  = data.get("hourly", {}).get("temperature_2m", [])[:24]
    forecast_24h  = [
        {"time": t, "temp": round(v, 1), "hour": int(t[11:13]) if len(t) > 13 else 0}
        for t, v in zip(hourly_times, hourly_temps)
    ]

    return {
        "status": "ok",
        "latitude": lat,
        "longitude": lon,
        "temperature_c": round(temp_c, 1),
        "apparent_temp_c": round(apparent_c, 1),
        "humidity_pct": round(humidity, 1),
        "wind_speed_kmh": round(wind_kmh, 1),
        "thermal_stress_pct": thermal_stress,
        "cooling_efficiency_pct": round(max(0.0, 100.0 - thermal_stress), 1),
        "forecast_24h": forecast_24h,
    }


# ---------------------------------------------------------------------------
# Sample CSV download
# ---------------------------------------------------------------------------

@app.get("/api/sample/csv")
def download_sample_csv():
    """
    Return a ready-to-fill CSV template the user can populate with their own
    DGA / oil-analysis sensor readings and re-upload to /api/score/csv.
    """
    content = "\n".join(_SAMPLE_CSV_ROWS) + "\n"
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="voltra_sample_readings.csv"'},
    )


# ---------------------------------------------------------------------------
# CSV batch scoring endpoint
# ---------------------------------------------------------------------------

@app.post("/api/score/csv")
async def score_csv_upload(file: UploadFile = File(...)):
    """
    Accept a CSV of sensor readings (one row per transformer reading),
    run every row through the ML pipeline, and return scored results.

    Required columns (case-sensitive, same as /api/score):
      asset_id, Hydrogen, Methane, Acethylene, Ethylene, Ethane, CO, CO2,
      Oxigen, Nitrogen, DBDS, Power factor, Interfacial V, Dielectric rigidity,
      Water content, top_oil_temp_c, load_pct

    Optional columns are filled with fleet-average defaults when missing.
    Returns JSON with a `results` list; each entry mirrors /api/score output
    plus the original row index and asset_id.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only .csv files are accepted.")

    raw_bytes = await file.read()
    if len(raw_bytes) > 5 * 1024 * 1024:  # 5 MB guard
        raise HTTPException(413, "File too large — maximum 5 MB.")

    try:
        df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as exc:
        raise HTTPException(422, f"Could not parse CSV: {exc}")

    if df.empty:
        raise HTTPException(422, "CSV file is empty.")

    # Normalise column names (strip whitespace)
    df.columns = [c.strip() for c in df.columns]

    # Fleet-average defaults (fall back when a column is absent)
    _DEFAULTS = {
        "Hydrogen": 15.0, "Oxigen": 10000.0, "Nitrogen": 35000.0,
        "Methane": 30.0, "CO": 200.0, "CO2": 900.0,
        "Ethylene": 3.0, "Ethane": 15.0, "Acethylene": 0.1,
        "DBDS": 0.5, "Power factor": 0.002, "Interfacial V": 35.0,
        "Dielectric rigidity": 60.0, "Water content": 12.0,
        "top_oil_temp_c": 65.0, "load_pct": 70.0,
    }
    for col, default in _DEFAULTS.items():
        if col not in df.columns:
            df[col] = default
        else:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(default)

    if "asset_id" not in df.columns:
        df["asset_id"] = [f"ROW-{i+1}" for i in range(len(df))]

    results = []
    errors  = []

    for idx, row in df.iterrows():
        sensor = row.to_dict()
        asset_id = str(sensor.pop("asset_id", f"ROW-{idx+1}"))
        # Drop any extra columns the scoring function doesn't expect
        sensor.pop("load_pct", None)  # not used by score_asset_risk directly

        try:
            result = score_asset_risk(sensor, generate_advisory=False)
        except Exception as exc:
            errors.append({"row": int(idx), "asset_id": asset_id, "error": str(exc)})
            continue

        # Normalise field names
        result["health_index"] = result.pop("health_index_score", result.get("health_index", 0))
        raw_proba = result.pop("fault_proba_all", {})
        total_votes = sum(raw_proba.values()) if raw_proba else 1.0
        if total_votes > 0:
            result["fault_probabilities"] = {k: round(v / total_votes, 4) for k, v in raw_proba.items()}
            result["fault_prob"] = round(max(raw_proba.values()) / total_votes, 4)
        else:
            result["fault_prob"] = result.pop("fault_confidence", 0.0)
        result["top_3_shap"] = result.pop("top3_shap_features", [])
        result.pop("fault_confidence", None)

        results.append({
            "row": int(idx),
            "asset_id": asset_id,
            **{k: (None if (isinstance(v, float) and v != v) else v) for k, v in result.items()},
        })

    return {
        "status": "ok",
        "total_rows": len(df),
        "scored": len(results),
        "errors": len(errors),
        "error_details": errors,
        "results": results,
    }


# ---------------------------------------------------------------------------
# Dev runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
