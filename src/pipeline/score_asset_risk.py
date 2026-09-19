"""
Stage 4 — Integration Pipeline: score_asset_risk()
====================================================
Combines Model 1 (Health Index regression) and Model 2 (DGA Fault
Classifier) into a single score_asset_risk() function.

CRITICAL COLUMN-NAME MAPPING (handled here, NOT in data generation):
  Hydrogen   -> H2    |  Methane  -> CH4   |  Ethane    -> C2H6
  Ethylene   -> C2H4  |  Acethylene -> C2H2

IBM Bob integration:
  - Bob is called via generate_advisory_text() to produce plain-English
    maintenance advisories grounded in actual sensor values.
  - The pipeline NEVER fails if the Bob call fails; fallback text is
    generated from a deterministic template so core score/rank always works.

Returns per-asset dict with:
  health_index_score, risk_tier, RUL_days,
  fault_type, fault_confidence, fault_label,
  top3_shap_features, advisory_text
"""

import os
import pickle
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import shap

warnings.filterwarnings("ignore")

PIPELINE_DIR = Path(__file__).parent
MODELS_DIR   = PIPELINE_DIR.parent / "models"
DATA_DIR     = PIPELINE_DIR.parent / "data"

# ---------------------------------------------------------------------------
# Column rename: Model 1 full names -> Model 2 short names
# ---------------------------------------------------------------------------
M1_TO_M2_RENAME = {
    "Hydrogen":   "H2",
    "Methane":    "CH4",
    "Ethane":     "C2H6",
    "Ethylene":   "C2H4",
    "Acethylene": "C2H2",
}

# ---------------------------------------------------------------------------
# RUL heuristic (mirrors generate_synthetic.py)
# ---------------------------------------------------------------------------
def rul_days(health_index: float) -> float:
    if health_index >= 70:
        return max(1.0, 8.0 - (health_index - 70) * 0.2)
    elif health_index >= 50:
        return max(8.0, 45.0 - (health_index - 50) * 1.85)
    else:
        return max(45.0, 180.0 - (health_index - 13.4) * 3.65)


def risk_tier(health_index: float) -> str:
    if health_index >= 70:
        return "CRITICAL"
    elif health_index >= 50:
        return "HIGH"
    elif health_index >= 30:
        return "MEDIUM"
    else:
        return "LOW"


# ---------------------------------------------------------------------------
# Load models (lazy, cached)
# ---------------------------------------------------------------------------
_m1_artifact: Optional[Dict] = None
_m2_artifact: Optional[Dict] = None


def _load_models() -> None:
    global _m1_artifact, _m2_artifact
    if _m1_artifact is None:
        with open(MODELS_DIR / "risk_model.pkl", "rb") as f:
            _m1_artifact = pickle.load(f)
    if _m2_artifact is None:
        with open(MODELS_DIR / "dga_fault_model.pkl", "rb") as f:
            _m2_artifact = pickle.load(f)


# ---------------------------------------------------------------------------
# IBM Bob advisory generation (load-bearing in pipeline)
# ---------------------------------------------------------------------------
def generate_advisory_text(
    asset_id: str,
    health_index: float,
    rul: float,
    tier: str,
    fault_type: str,
    fault_confidence: float,
    top3_shap: List[tuple],
    sensor_row: Dict[str, float],
) -> str:
    """
    Calls IBM Bob (via the Anthropic SDK) to generate a plain-English
    maintenance advisory grounded in actual sensor values.

    If the Bob call fails for any reason (no API key, network error,
    rate limit), falls back to a deterministic template — the core
    score/rank pipeline is NEVER broken by this failure.
    """
    shap_lines = "\n".join(
        f"  - {feat}: SHAP contribution {val:+.2f} (health-index units)"
        for feat, val in top3_shap
    )
    prompt = (
        f"You are a senior power grid asset health advisor. "
        f"Provide a concise (2-3 sentence) plain-English maintenance advisory "
        f"for transformer {asset_id} based strictly on the telemetry below. "
        f"Do not add generic filler. State the primary driver and the recommended immediate action.\n\n"
        f"Health Index: {health_index:.1f} (scale: 13.4=pristine, >=50=severe fault, >=70=critical)\n"
        f"Risk Tier: {tier}\n"
        f"Estimated RUL: {rul:.0f} days\n"
        f"DGA Fault Classification: {fault_type} (confidence {fault_confidence*100:.0f}%)\n"
        f"Top contributing sensor features (SHAP):\n{shap_lines}\n"
        f"Key sensor readings: "
        f"H2={sensor_row.get('Hydrogen', sensor_row.get('H2', 0)):.0f} ppm, "
        f"C2H2={sensor_row.get('Acethylene', sensor_row.get('C2H2', 0)):.1f} ppm, "
        f"CH4={sensor_row.get('Methane', sensor_row.get('CH4', 0)):.0f} ppm, "
        f"Oil temp={sensor_row.get('top_oil_temp_c', 65):.0f}C, "
        f"Dielectric rigidity={sensor_row.get('Dielectric rigidity', 60):.0f} kV"
    )

    # 1. Primary: Groq LPU (Ultra-fast inference)
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if groq_key:
        try:
            import json, ssl, urllib.request
            try:
                import certifi
                ctx = ssl.create_default_context(cafile=certifi.where())
            except Exception:
                ctx = ssl.create_default_context()

            req_data = json.dumps({
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You are an expert power transformer maintenance engineer and SCADA reliability advisor. Provide concise, professional 2-3 sentence advisory."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 250,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=req_data,
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Voltra-SCADA/1.0",
                },
                method="POST"
            )
            with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                content = res_json["choices"][0]["message"]["content"].strip()
                if content:
                    return content
        except Exception:
            pass

    # 2. Secondary: Anthropic Claude (if configured)
    bob_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if bob_key:
        try:
            import importlib.util
            if importlib.util.find_spec("anthropic"):
                anthropic_mod = importlib.import_module("anthropic")
                client = anthropic_mod.Anthropic(api_key=bob_key)
                response = client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=300,
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.content[0].text.strip()
            else:
                import json, urllib.request, ssl
                try:
                    import certifi
                    ctx = ssl.create_default_context(cafile=certifi.where())
                except Exception:
                    ctx = ssl.create_default_context()
                payload = json.dumps({
                    "model": "claude-3-5-haiku-20241022",
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                }).encode("utf-8")
                req = urllib.request.Request(
                    "https://api.anthropic.com/v1/messages",
                    data=payload,
                    headers={
                        "x-api-key": bob_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
                    res_json = json.loads(resp.read().decode("utf-8"))
                    content = res_json["content"][0]["text"].strip()
                    if content:
                        return content
        except Exception:
            pass

    # 3. Deterministic SCADA advisory fallback
    return _fallback_advisory(
        asset_id, health_index, rul, tier, fault_type,
        fault_confidence, top3_shap, sensor_row
    )


def _fallback_advisory(
    asset_id: str,
    health_index: float,
    rul: float,
    tier: str,
    fault_type: str,
    fault_confidence: float,
    top3_shap: List[tuple],
    sensor_row: Dict[str, float],
) -> str:
    """Deterministic plain-English advisory based on fault type and sensor values."""
    h2  = sensor_row.get("Hydrogen", sensor_row.get("H2", 0))
    c2h2 = sensor_row.get("Acethylene", sensor_row.get("C2H2", 0))
    ch4  = sensor_row.get("Methane", sensor_row.get("CH4", 0))
    oil  = sensor_row.get("top_oil_temp_c", 65)
    diel = sensor_row.get("Dielectric rigidity", 60)
    conf_pct = fault_confidence * 100

    fault_descriptions = {
        "D1": f"low-energy electrical discharge (D1 fault, {conf_pct:.0f}% confidence). "
              f"Acethylene at {c2h2:.1f} ppm and H2 at {h2:.0f} ppm are early arcing markers.",
        "D2": f"high-energy electrical discharge (D2 fault, {conf_pct:.0f}% confidence). "
              f"H2={h2:.0f} ppm and C2H2={c2h2:.1f} ppm indicate active arcing in the oil.",
        "PD": f"partial discharge activity (PD, {conf_pct:.0f}% confidence). "
              f"H2={h2:.0f} ppm is the primary indicator; dielectric rigidity at {diel:.0f} kV.",
        "T1": f"mild thermal fault (T1, {conf_pct:.0f}% confidence). "
              f"CH4={ch4:.0f} ppm rising with oil temperature {oil:.0f}°C.",
        "T2": f"moderate thermal fault (T2, {conf_pct:.0f}% confidence; note: T2 is the "
              f"classifier's weakest class with ~74% recall — confirm with on-site inspection). "
              f"CH4={ch4:.0f} ppm, oil temp {oil:.0f}°C.",
        "T3": f"severe thermal fault (T3, {conf_pct:.0f}% confidence). "
              f"CH4={ch4:.0f} ppm with oil temperature {oil:.0f}°C approaching critical threshold.",
        "NF": f"no active fault detected (NF, {conf_pct:.0f}% confidence). "
              f"Asset operating within normal DGA limits.",
    }
    fault_str = fault_descriptions.get(
        fault_type, f"{fault_type} fault ({conf_pct:.0f}% confidence)."
    )
    confidence_qualifier = "possible " if fault_confidence < 0.6 else ""

    if tier == "CRITICAL":
        urgency = f"IMMEDIATE ACTION REQUIRED: {asset_id} has health index {health_index:.1f} " \
                  f"with estimated {rul:.0f} days remaining before failure."
    elif tier == "HIGH":
        urgency = f"HIGH PRIORITY: {asset_id} shows health index {health_index:.1f} " \
                  f"with approximately {rul:.0f} days of remaining useful life."
    elif tier == "MEDIUM":
        urgency = f"MONITOR CLOSELY: {asset_id} is showing early degradation signals " \
                  f"(health index {health_index:.1f}, RUL ~{rul:.0f} days)."
    else:
        urgency = f"{asset_id} is operating normally (health index {health_index:.1f}, RUL ~{rul:.0f} days)."

    top_feat = top3_shap[0][0] if top3_shap else "unknown feature"
    return (
        f"{urgency} "
        f"DGA analysis indicates {confidence_qualifier}{fault_str} "
        f"Primary driver: {top_feat} (highest SHAP contribution). "
        f"Recommended action: see maintenance plan for fault-type-specific response."
    )


# ---------------------------------------------------------------------------
# Core scoring function
# ---------------------------------------------------------------------------
def score_asset_risk(
    sensor_row: Dict[str, Any],
    generate_advisory: bool = True,
) -> Dict[str, Any]:
    """
    Score a single asset snapshot.

    Parameters
    ----------
    sensor_row : dict
        Must contain all 14 Model 1 features (full names: Hydrogen, Oxigen, etc.)
        plus optionally top_oil_temp_c, load_pct, asset_id.
    generate_advisory : bool
        If True, call IBM Bob (or fallback) to produce plain-English text.

    Returns
    -------
    dict with keys:
        asset_id, health_index_score, risk_tier, RUL_days,
        fault_type, fault_confidence, fault_label,
        top3_shap_features, advisory_text
    """
    _load_models()
    m1 = _m1_artifact
    m2 = _m2_artifact

    asset_id = sensor_row.get("asset_id", "UNKNOWN")

    # ---- Model 1: Health Index regression ----
    feat_m1 = np.array([[sensor_row[c] for c in m1["feature_cols"]]])
    hi_pred = float(m1["model"].predict(feat_m1)[0])
    rul = rul_days(hi_pred)
    tier = risk_tier(hi_pred)

    # SHAP top-3 — explainer is rebuilt from the model (not persisted in pkl
    # to avoid Python-version-specific CodeType serialisation crashes)
    explainer = shap.TreeExplainer(m1["model"])
    sv = explainer.shap_values(feat_m1)[0]
    feat_shap = sorted(
        zip(m1["feature_cols"], sv), key=lambda x: abs(x[1]), reverse=True
    )
    top3_shap = feat_shap[:3]

    # ---- Column rename: Model 1 names -> Model 2 short codes ----
    renamed = {}
    for m1_name, val in sensor_row.items():
        m2_name = M1_TO_M2_RENAME.get(m1_name, m1_name)
        renamed[m2_name] = val

    # ---- Model 2: DGA Fault Classifier ----
    # Build engineered features
    h2  = max(0, float(renamed.get("H2",  0)))
    ch4 = max(0, float(renamed.get("CH4", 0)))
    c2h6 = max(0, float(renamed.get("C2H6", 0)))
    c2h4 = max(0, float(renamed.get("C2H4", 0)))
    c2h2 = max(0, float(renamed.get("C2H2", 0)))

    ch4_h2     = ch4 / (h2 + 1)
    c2h2_c2h4  = c2h2 / (c2h4 + 1)
    c2h4_c2h6  = c2h4 / (c2h6 + 1)

    feat_m2 = np.array([[h2, ch4, c2h6, c2h4, c2h2,
                          ch4_h2, c2h2_c2h4, c2h4_c2h6]])

    proba = m2["model"].predict_proba(feat_m2)[0]
    proba_sum = float(np.sum(proba))
    if proba_sum > 0:
        proba = proba / proba_sum
    classes = m2["classes"]
    pred_idx = int(np.argmax(proba))
    fault_type = classes[pred_idx]
    fault_confidence = float(proba[pred_idx])

    # Low-confidence fault phrased as "possible"
    fault_label = f"possible {fault_type}" if fault_confidence < 0.6 else fault_type

    # ---- Advisory text (IBM Bob or fallback) ----
    advisory = ""
    if generate_advisory:
        advisory = generate_advisory_text(
            asset_id=asset_id,
            health_index=hi_pred,
            rul=rul,
            tier=tier,
            fault_type=fault_type,
            fault_confidence=fault_confidence,
            top3_shap=top3_shap,
            sensor_row=sensor_row,
        )

    return {
        "asset_id":            asset_id,
        "health_index_score":  round(hi_pred, 2),
        "risk_tier":           tier,
        "RUL_days":            round(rul, 1),
        "fault_type":          fault_type,
        "fault_label":         fault_label,
        "fault_confidence":    round(fault_confidence, 3),
        "fault_proba_all":     {c: round(float(p), 3) for c, p in zip(classes, proba)},
        "top3_shap_features":  [(f, round(v, 3)) for f, v in top3_shap],
        "advisory_text":       advisory,
    }


def score_all_assets(
    timeseries_csv: Optional[Path] = None,
    day: int = 89,                     # default: latest snapshot
    generate_advisory: bool = True,
) -> pd.DataFrame:
    """
    Score all assets from the latest snapshot in the time-series.

    Parameters
    ----------
    timeseries_csv : Path or None
        Path to transformer_timeseries.csv. Defaults to DATA_DIR.
    day : int
        Which day snapshot to score. Default 89 (last day).
    generate_advisory : bool
        Whether to call Bob for each asset.

    Returns
    -------
    pd.DataFrame with one row per asset, sorted by health_index_score desc.
    """
    _load_models()
    ts_path = timeseries_csv or DATA_DIR / "transformer_timeseries.csv"
    ts = pd.read_csv(ts_path)

    snapshot = ts[ts["day"] == day].copy()
    if snapshot.empty:
        raise ValueError(f"No rows found for day={day} in {ts_path}")

    results = []
    for _, row in snapshot.iterrows():
        sensor_dict = row.to_dict()
        result = score_asset_risk(sensor_dict, generate_advisory=generate_advisory)
        # Preserve metadata columns for ranking
        result["grid_zone"]       = row.get("asset_id", "")  # will be overwritten
        results.append(result)

    # Merge asset registry metadata
    reg_path = DATA_DIR / "asset_registry.csv"
    if reg_path.exists():
        registry = pd.read_csv(reg_path)
        results_df = pd.DataFrame(results)
        results_df = results_df.merge(
            registry[["asset_id", "grid_zone", "mva_rating",
                       "voltage_kv", "criticality", "archetype"]],
            on="asset_id", how="left"
        )
        # drop the wrong grid_zone column that was overwritten
        if "grid_zone_x" in results_df.columns:
            results_df = results_df.rename(columns={"grid_zone_y": "grid_zone"})
            results_df = results_df.drop(columns=["grid_zone_x"], errors="ignore")
    else:
        results_df = pd.DataFrame(results)

    results_df = results_df.sort_values("health_index_score", ascending=False).reset_index(drop=True)
    return results_df


# ---------------------------------------------------------------------------
# CLI: run as script to see full pipeline output
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("="*70)
    print("STAGE 4 — INTEGRATION PIPELINE: scoring all 18 assets (Day 89)")
    print("="*70)
    print("\n[Pipeline] Loading models and scoring...")

    # Score without Bob advisories for brevity in console (advisory=False)
    df = score_all_assets(day=89, generate_advisory=False)

    print(f"\n[Pipeline] Scored {len(df)} assets.\n")
    print(f"{'Asset':<10} {'HI Score':>9} {'Tier':<10} {'RUL_d':>7} "
          f"{'Fault':>5} {'Conf%':>6} {'Top SHAP feature':<22} {'Archetype'}")
    print("-"*90)
    for _, row in df.iterrows():
        top_feat = row["top3_shap_features"][0][0] if row["top3_shap_features"] else ""
        arch = row.get("archetype", "")
        print(f"{row['asset_id']:<10} {row['health_index_score']:>9.1f} "
              f"{row['risk_tier']:<10} {row['RUL_days']:>7.1f} "
              f"{row['fault_type']:>5} {row['fault_confidence']*100:>6.1f}% "
              f"{top_feat:<22} {arch}")

    # Verify the 4 archetypes are correctly ranked / identified
    print("\n--- ARCHETYPE SPOT-CHECK ---")
    for aid in ["TX-107", "TX-104", "TX-115", "TX-112"]:
        r = df[df["asset_id"] == aid].iloc[0]
        print(f"  {aid}: HI={r['health_index_score']:.1f}, tier={r['risk_tier']}, "
              f"RUL={r['RUL_days']}d, fault={r['fault_label']} ({r['fault_confidence']*100:.0f}%)")

    print("\n[Pipeline] Saving scored snapshot...")
    out_path = DATA_DIR / "scored_snapshot_day89.csv"
    df.to_csv(out_path, index=False)
    print(f"[Pipeline] Saved: {out_path}")
    print("\n" + "="*70)
    print("Stage 4 complete.")
    print("="*70)
