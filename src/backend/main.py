"""
Stage 6 — FastAPI Backend
==========================
Wraps the pipeline in a REST API. Core score/rank endpoints NEVER fail
due to advisory-generation errors — Bob/LLM calls are fully isolated.

Endpoints:
  GET  /health                    — liveness check
  GET  /api/assets                — all assets from registry
  GET  /api/scores                — scored snapshot (Day 89 by default)
  GET  /api/ranked                — ranked asset list with composite scores
  GET  /api/asset/{asset_id}      — single-asset detail: score + SHAP + advisory
  GET  /api/plan                  — full maintenance plan
  GET  /api/weather               — weather data
  GET  /api/timeseries/{asset_id} — 90-day time-series for one asset
  POST /api/score                 — score an ad-hoc sensor reading (JSON body)
  POST /events/report             — community / field-tech hazard report (injection-filtered)
"""

import ast
import csv
import json
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Make pipeline importable
BACKEND_DIR  = Path(__file__).parent
SRC_DIR      = BACKEND_DIR.parent
PIPELINE_DIR = SRC_DIR / "pipeline"
sys.path.insert(0, str(PIPELINE_DIR))

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from score_asset_risk import score_asset_risk, score_all_assets
from grid_impact_ranker import rank_assets
from maintenance_plan import generate_maintenance_plan

DATA_DIR    = SRC_DIR / "data"
EVENTS_DIR  = DATA_DIR          # CSVs live beside other data files

# CSV file paths for incident audit trail
ACCEPTED_EVENTS_CSV  = EVENTS_DIR / "user_reported_events.csv"
REJECTED_EVENTS_CSV  = EVENTS_DIR / "rejected_submissions_log.csv"

# ---------------------------------------------------------------------------
# Prompt-injection defence patterns (mirrors frontend incidentReport.ts)
# ---------------------------------------------------------------------------
_INJECTION_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("ignore_previous_instructions", re.compile(r"ignore\s+previous\s+instructions?", re.I)),
    ("system_prompt_override",       re.compile(r"system\s+prompt\s*(override|:)", re.I)),
    ("you_are_now",                  re.compile(r"you\s+are\s+now\b", re.I)),
    ("disregard_all",                re.compile(r"disregard\s+all\b", re.I)),
    ("override_keyword",             re.compile(r"\boverride\b.*\b(safe|healthy|pristine|alert|alarm)\b", re.I)),
    ("jailbreak",                    re.compile(r"\bjailbreak\b", re.I)),
    ("dan_mode",                     re.compile(r"\bDAN\s+mode\b", re.I)),
    ("mark_as_safe",                 re.compile(r"mark\s+(all\s+)?transformers?\s+(as\s+)?(safe|healthy|pristine)", re.I)),
    ("suppress_alerts",              re.compile(r"suppress\s+(all\s+)?(alerts?|alarms?|warnings?)", re.I)),
    ("disregard_arcing",             re.compile(r"disregard\s+(all\s+)?arc(ing)?\s+alerts?", re.I)),
    ("act_as",                       re.compile(r"\bact\s+as\b", re.I)),
    ("new_instructions",             re.compile(r"new\s+(instructions?|directive)", re.I)),
    ("forget_previous",              re.compile(r"forget\s+(all\s+)?(previous|prior|earlier)", re.I)),
]

_CATEGORY_RULES: list[tuple[str, re.Pattern]] = [
    ("excavation",    re.compile(r"\b(excavat|backhoe|dig(ger|ging)?|trench|drill(ing)?|bore)\b", re.I)),
    ("wildfire",      re.compile(r"\b(fire|wildfire|grass\s+fire|blaze|burn(ing)?|flame|smoke)\b", re.I)),
    ("storm_damage",  re.compile(r"\b(storm|lightning|thunder|flood|wind|tree|fallen|debris|hail)\b", re.I)),
    ("explosion",     re.compile(r"\b(explos(ion|ive)?|blast|boom|bang)\b", re.I)),
    ("collision",     re.compile(r"\b(collision|crash|vehicle|truck|car|hit|struck)\b", re.I)),
    ("grid_incident", re.compile(r"\b(spark(ing|s)?|humm(ing)?|arc(ing)?|flash|bushing|transformers?|cable|conductor|wire)\b", re.I)),
]

_CATEGORY_MULTIPLIERS = {
    "excavation": 1.20, "wildfire": 1.25, "explosion": 1.25,
    "collision": 1.15, "storm_damage": 1.10, "grid_incident": 1.18, "other": 1.05,
}


def _classify_category(text: str) -> str:
    for cat, pat in _CATEGORY_RULES:
        if pat.search(text):
            return cat
    return "other"


def _injection_filter(zone: str, description: str, note: str) -> tuple[bool, str]:
    """Returns (blocked, matched_pattern_label)."""
    combined = f"{zone} {description} {note}"
    for label, pat in _INJECTION_PATTERNS:
        if pat.search(combined):
            return True, label
    return False, ""


def _append_csv(path: Path, row: dict) -> None:
    """Thread-unsafe but sufficient for single-process dev/hackathon usage."""
    write_header = not path.exists()
    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(row.keys()))
        if write_header:
            writer.writeheader()
        writer.writerow(row)

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


def _safe_float(val) -> Optional[float]:
    """Return float or None — handles None, NaN, and numpy scalars."""
    if val is None:
        return None
    try:
        v = float(val)
        return None if v != v else round(v, 4)  # NaN check
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "grid-risk-api", "version": "1.0.0", "models_loaded": True}


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
    """
    Return assets sorted by composite grid impact score (highest risk first).

    Response field contract (matches TypeScript RankedAsset):
      rank, asset_id, substation_name, grid_zone, criticality_tier,
      health_index, RUL_days, fault_type, fault_prob, risk_tier,
      composite_score, mva_rating, voltage_kv, customer_count_served, top_3_shap
    """
    _load_cache()
    df = _cache["ranked"]
    reg_df = pd.DataFrame(_cache["registry"]) if _cache["registry"] else pd.DataFrame()

    records = []
    for row in df.to_dict(orient="records"):
        # Normalise core fields
        asset_id = row.get("asset_id", "")
        clean: dict = {
            "rank":            int(row.get("rank", 0)),
            "asset_id":        asset_id,
            "health_index":    _safe_float(row.get("health_index_score")),  # renamed
            "RUL_days":        _safe_float(row.get("RUL_days")),
            "fault_type":      str(row.get("fault_type", "NF")),
            "fault_prob":      _safe_float(row.get("fault_confidence")),    # renamed
            "risk_tier":       str(row.get("risk_tier", "LOW")),
            "composite_score": _safe_float(row.get("composite_score")),
            "grid_zone":       str(row.get("grid_zone", "")),
            "mva_rating":      _safe_float(row.get("mva_rating")),
            "voltage_kv":      str(row.get("voltage_kv", "")),
            "top_3_shap":      row.get("top3_shap_features") or [],         # renamed
        }

        # Merge registry fields: substation_name, criticality_tier, customer_count_served
        if not reg_df.empty:
            reg_row = reg_df[reg_df["asset_id"] == asset_id]
            if not reg_row.empty:
                r = reg_row.iloc[0]
                clean["substation_name"]       = str(r.get("substation_name", r.get("grid_zone", "")))
                clean["criticality_tier"]      = str(r.get("criticality", r.get("criticality_tier", "")))
                clean["customer_count_served"] = int(r.get("customer_count_served", 0)) if pd.notna(r.get("customer_count_served", None)) else None
            else:
                clean["substation_name"]       = clean["grid_zone"]
                clean["criticality_tier"]      = ""
                clean["customer_count_served"] = None
        else:
            clean["substation_name"]       = clean["grid_zone"]
            clean["criticality_tier"]      = ""
            clean["customer_count_served"] = None

        records.append(clean)

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

    Response field contract (matches TypeScript AssetDetailResponse):
      health_index       (float)   — renamed from health_index_score
      RUL_days           (float)
      risk_tier          (str)
      fault_type         (str)     — primary DGA fault class
      fault_prob         (float)   — confidence of primary fault
      fault_probabilities(dict)    — full class probability distribution
      top_3_shap         (list)    — renamed from top3_shap_features
      sensor_readings    (dict)    — latest raw sensor snapshot
      advisory_text      (str)
      advisory_source    (str)     — "ibm_bob_llm" | "deterministic_fallback"
      registry           (dict)    — asset metadata from registry CSV
      composite_score    (float)
      rank               (int)
    """
    _load_cache()

    ts = _cache.get("timeseries", pd.DataFrame())
    if ts.empty:
        raise HTTPException(404, "Time-series data not loaded.")

    asset_ts = ts[ts["asset_id"] == asset_id]
    if asset_ts.empty:
        raise HTTPException(404, f"Asset '{asset_id}' not found.")

    latest = asset_ts.sort_values("day").iloc[-1].to_dict()

    try:
        raw = score_asset_risk(latest, generate_advisory=generate_advisory)
    except Exception as exc:
        raise HTTPException(500, f"Scoring failed: {exc}")

    # Detect advisory source from the text suffix added by score_asset_risk
    advisory_text: str = raw.get("advisory_text", "")
    if "Bob call failed" in advisory_text or "template fallback" in advisory_text or "ANTHROPIC_API_KEY not set" in advisory_text:
        advisory_source = "deterministic_fallback"
    else:
        advisory_source = "ibm_bob_llm" if advisory_text else "deterministic_fallback"

    # Build normalised response — frontend field names
    result: dict = {
        "asset_id":           raw["asset_id"],
        "health_index":       raw["health_index_score"],       # renamed
        "RUL_days":           raw["RUL_days"],
        "risk_tier":          raw["risk_tier"],
        "fault_type":         raw["fault_type"],               # primary class
        "fault_prob":         raw["fault_confidence"],         # renamed
        "fault_probabilities": raw.get("fault_proba_all", {}),
        "top_3_shap":         raw["top3_shap_features"],       # renamed
        "sensor_readings":    {k: v for k, v in latest.items() if k not in ("asset_id", "day", "date")},
        "advisory_text":      advisory_text,
        "advisory_source":    advisory_source,
    }

    # Registry metadata
    reg_df = pd.DataFrame(_cache["registry"])
    meta = reg_df[reg_df["asset_id"] == asset_id].to_dict(orient="records")
    result["registry"] = meta[0] if meta else {}

    # Ranked position
    ranked = _cache["ranked"]
    ranked_row = ranked[ranked["asset_id"] == asset_id]
    if not ranked_row.empty:
        result["composite_score"] = float(ranked_row.iloc[0]["composite_score"])
        result["rank"]            = int(ranked_row.iloc[0]["rank"])

    return result


@app.get("/api/plan")
def get_plan():
    """
    Return the full maintenance plan with crew pre-positioning.

    Response field contract (matches TypeScript MaintenancePlanResponse):
      top_10_actions  (list) — first 10 items from asset_actions, field names normalised
      crew_schedule   (dict)
      tx115_narrative (dict) — structured TX-115 intervention story
      generated_date  (str)
      total_actions   (int)
    """
    _load_cache()
    plan = _cache["plan"]

    asset_actions = plan.get("asset_actions", [])

    # Normalise top-10 actions to match MaintenanceAction TypeScript type
    top_10 = []
    for act in asset_actions[:10]:
        top_10.append({
            "rank":             act.get("rank", 0),
            "asset_id":         act.get("asset_id", ""),
            "substation_name":  act.get("grid_zone", ""),
            "grid_zone":        act.get("grid_zone", ""),
            "risk_tier":        act.get("risk_tier", "LOW"),
            "fault_type":       act.get("fault_label", act.get("fault_type", "NF")),
            "action_code":      act.get("action_code", ""),
            "short_action":     act.get("short_action", ""),
            "detail":           act.get("detail", act.get("short_action", "")),
            "urgency_window":   act.get("deadline", ""),
            "crew_assignment":  act.get("crew_type", "Maintenance Crew"),
            "crew_conflict":    False,
            "advisory_summary": act.get("advisory_text", "")[:200] if act.get("advisory_text") else "",
        })

    # Crew schedule: keyed by zone for frontend
    crew_schedule: dict = {}
    for cp in plan.get("crew_pre_positioning", []):
        crew_schedule[cp.get("zone", "Unknown")] = cp

    # TX-115 narrative structured for TypeScript tx115_narrative type
    tx115_act = next((a for a in asset_actions if a.get("asset_id") == "TX-115"), {})
    tx115_narrative = {
        "asset_id":          "TX-115",
        "story":             plan.get("intervention_narrative", ""),
        "degradation_peak":  "Day 78 — HI 71.3, RUL 7.7 days (CRITICAL)",
        "intervention":      "Cooling fan motor replacement + 20% load curtailment",
        "recovery_outcome":  f"HI reduced to {tx115_act.get('health_index', 36.1)}, RUL recovered to {tx115_act.get('RUL_days', 97.0)} days",
        "rul_recovered_days": round(float(tx115_act.get("RUL_days", 97.0)) - 7.7, 1),
    }

    return {
        "generated_date":  plan.get("plan_date", ""),
        "total_actions":   len(asset_actions),
        "top_10_actions":  top_10,
        "crew_schedule":   crew_schedule,
        "tx115_narrative": tx115_narrative,
        # Pass full plan through for optional detailed views
        "critical_count":  plan.get("critical_count", 0),
        "high_count":      plan.get("high_count", 0),
        "crew_summary_text": plan.get("crew_summary_text", ""),
    }


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

    Response field contract (matches TypeScript AdhocScoreResponse):
      asset_id, health_index, RUL_days, risk_tier, fault_type,
      fault_prob, top_3_shap, advisory_text, advisory_source
    """
    sensor_dict = reading.model_dump()
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
        raw = score_asset_risk(sensor_dict, generate_advisory=gen_advisory)
    except Exception as exc:
        raise HTTPException(500, f"Scoring failed: {exc}")

    advisory_text: str = raw.get("advisory_text", "")
    advisory_source = (
        "deterministic_fallback"
        if ("Bob call failed" in advisory_text or "template fallback" in advisory_text or "ANTHROPIC_API_KEY not set" in advisory_text)
        else ("ibm_bob_llm" if advisory_text else "deterministic_fallback")
    )

    return {
        "asset_id":       raw["asset_id"],
        "health_index":   raw["health_index_score"],   # renamed
        "RUL_days":       raw["RUL_days"],
        "risk_tier":      raw["risk_tier"],
        "fault_type":     raw["fault_type"],
        "fault_prob":     raw["fault_confidence"],     # renamed
        "top_3_shap":     raw["top3_shap_features"],   # renamed
        "advisory_text":  advisory_text,
        "advisory_source": advisory_source,
    }


# ---------------------------------------------------------------------------
# Community Incident Reporting — POST /events/report
# ---------------------------------------------------------------------------
class EventReport(BaseModel):
    zone_name:        str
    event_description: str
    reporter_note:    Optional[str] = None
    reporter_type:    str = "citizen"  # citizen | field_technician | municipal_dispatcher


@app.post("/events/report")
def report_event(report: EventReport):
    """
    Community / field-technician hazard report endpoint.

    Security pipeline:
      1. Deterministic prompt-injection regex filter (server-side mirror of frontend filter)
      2. Closed-category classification
      3. Bounded risk multiplier (max 1.25×, never lowers a risk tier)
      4. Accepted → user_reported_events.csv
         Rejected → rejected_submissions_log.csv

    Response field contract (matches TypeScript EventReportResponse):
      status, incident_id, category, risk_multiplier, disclaimer, matched_pattern, message
    """
    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    received_at = datetime.utcnow().isoformat() + "Z"

    blocked, matched_pattern = _injection_filter(
        report.zone_name,
        report.event_description,
        report.reporter_note or "",
    )

    if blocked:
        _append_csv(REJECTED_EVENTS_CSV, {
            "incident_id":              incident_id,
            "received_at":              received_at,
            "zone_name":                report.zone_name,
            "matched_pattern":          matched_pattern,
            "raw_description_excerpt":  report.event_description[:80],
            "reporter_type":            report.reporter_type,
        })
        return {
            "status":          "rejected",
            "incident_id":     incident_id,
            "matched_pattern": matched_pattern,
            "message":         "Submission blocked — prompt injection pattern detected. Attempt logged to rejected_submissions_log.csv.",
        }

    # Clean submission — classify and apply bounded multiplier
    category = _classify_category(report.event_description)
    risk_multiplier = min(1.25, max(1.0, _CATEGORY_MULTIPLIERS.get(category, 1.05)))

    _append_csv(ACCEPTED_EVENTS_CSV, {
        "incident_id":    incident_id,
        "received_at":    received_at,
        "zone_name":      report.zone_name,
        "event_description": report.event_description,
        "reporter_note":  report.reporter_note or "",
        "reporter_type":  report.reporter_type,
        "category":       category,
        "risk_multiplier": risk_multiplier,
        "disclaimer":     "Unverified — user reported",
    })

    return {
        "status":          "accepted",
        "incident_id":     incident_id,
        "category":        category,
        "risk_multiplier": risk_multiplier,
        "disclaimer":      "Unverified — user reported",
        "message":         f"Hazard report accepted and logged. Risk multiplier: {risk_multiplier:.2f}×.",
    }


# ---------------------------------------------------------------------------
# Dev runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
