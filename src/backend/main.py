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
"""

import ast
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

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from auth_router import router as auth_router

try:
    from pipeline.score_asset_risk import score_asset_risk, score_all_assets
    from pipeline.grid_impact_ranker import rank_assets
    from pipeline.maintenance_plan import generate_maintenance_plan
except ImportError:
    from score_asset_risk import score_asset_risk, score_all_assets
    from grid_impact_ranker import rank_assets
    from maintenance_plan import generate_maintenance_plan

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
# Dev runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
