"""
Stage 5a — Grid Impact Ranker
==============================
Takes scored assets from Stage 4 and produces a composite risk ranking
that accounts for:
  1. Health Index (damage score from Model 1)
  2. RUL — remaining useful life
  3. Asset criticality (Critical/High/Medium/Low from registry)
  4. MVA rating (larger transformer = higher grid impact)
  5. Fault type severity (D2, T3, D1 > T1, T2, PD > NF)
  6. Historical incident frequency (from incident log)

All weights are explicit and defensible — no black-box scoring.
Every output can be explained in plain language to a non-technical judge.
"""

from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

DATA_DIR     = Path(__file__).parent.parent / "data"
PIPELINE_DIR = Path(__file__).parent

# ---------------------------------------------------------------------------
# Weighting constants (explicit, defensible)
# ---------------------------------------------------------------------------
# Health index contribution (normalised 0-100)
HI_WEIGHT = 0.35

# RUL contribution: shorter RUL = higher risk (inverted, normalised)
RUL_WEIGHT = 0.25

# Asset criticality multiplier
CRITICALITY_MULT = {
    "Critical": 2.0,
    "High":     1.5,
    "Medium":   1.1,
    "Low":      0.8,
}

# Fault severity score (0-1)
FAULT_SEVERITY = {
    "D2":  0.90,  # high-energy discharge — imminent insulation breakdown
    "T3":  0.85,  # severe thermal — winding damage
    "D1":  0.75,  # low-energy discharge — early arcing
    "T2":  0.65,  # moderate thermal
    "T1":  0.55,  # mild thermal
    "PD":  0.50,  # partial discharge — watchlist
    "NF":  0.10,  # no fault
}
FAULT_WEIGHT = 0.20

# MVA contribution: log-normalised, weight 0.10
MVA_WEIGHT = 0.10

# Historical incident frequency contribution, weight 0.10
INCIDENT_WEIGHT = 0.10

# Max RUL for normalisation
MAX_RUL = 180.0

# ---------------------------------------------------------------------------
# Grid impact ranker
# ---------------------------------------------------------------------------

def compute_grid_impact_score(
    asset_id: str,
    health_index: float,
    rul_days: float,
    criticality: str,
    mva_rating: float,
    fault_type: str,
    fault_confidence: float,
    incident_rate: float,        # incidents per year
    max_hi: float = 100.0,
    max_mva: float = 160.0,
    max_incident_rate: float = 3.0,
) -> dict:
    """
    Compute a composite grid impact score for a single asset.
    All inputs, weights, and sub-scores are returned for full transparency.
    """
    # Sub-score 1: health index (normalised, clipped)
    hi_norm = min(1.0, health_index / max_hi)

    # Sub-score 2: RUL (inverted — shorter = higher risk)
    rul_norm = max(0.0, 1.0 - (rul_days / MAX_RUL))

    # Sub-score 3: fault severity
    base_fault_sev = FAULT_SEVERITY.get(fault_type, 0.5)
    # If low confidence (<0.6), blend toward neutral
    effective_fault_sev = base_fault_sev * fault_confidence + 0.5 * (1 - fault_confidence)

    # Sub-score 4: MVA (log scale, normalised)
    mva_norm = min(1.0, np.log1p(mva_rating) / np.log1p(max_mva))

    # Sub-score 5: historical incident rate (normalised)
    inc_norm = min(1.0, incident_rate / max_incident_rate)

    # Raw composite score
    raw_score = (
        HI_WEIGHT       * hi_norm          +
        RUL_WEIGHT      * rul_norm         +
        FAULT_WEIGHT    * effective_fault_sev +
        MVA_WEIGHT      * mva_norm         +
        INCIDENT_WEIGHT * inc_norm
    )

    # Apply criticality multiplier (capped at 1.0)
    crit_mult = CRITICALITY_MULT.get(criticality, 1.0)
    composite = min(1.0, raw_score * crit_mult)

    return {
        "asset_id":              asset_id,
        "composite_score":       round(composite, 4),
        "raw_score":             round(raw_score, 4),
        "criticality_mult":      crit_mult,
        "hi_subscore":           round(hi_norm, 3),
        "rul_subscore":          round(rul_norm, 3),
        "fault_subscore":        round(effective_fault_sev, 3),
        "mva_subscore":          round(mva_norm, 3),
        "incident_subscore":     round(inc_norm, 3),
    }


def rank_assets(
    scored_df: Optional[pd.DataFrame] = None,
    snapshot_day: int = 89,
) -> pd.DataFrame:
    """
    Load scored snapshot + registry, compute composite scores, rank.

    Returns ranked DataFrame (top = highest risk).
    """
    if scored_df is None:
        snap_path = DATA_DIR / "scored_snapshot_day89.csv"
        if not snap_path.exists():
            # Run pipeline first
            import sys
            sys.path.insert(0, str(Path(__file__).parent))
            from score_asset_risk import score_all_assets
            scored_df = score_all_assets(day=snapshot_day, generate_advisory=False)
        else:
            scored_df = pd.read_csv(snap_path)

    # Load incident log to compute per-asset incident rate
    inc_path = DATA_DIR / "incident_log.csv"
    if inc_path.exists():
        incidents = pd.read_csv(inc_path)
        # Rate = incidents per year (log covers 3 years)
        inc_rate = incidents.groupby("asset_id").size() / 3.0
    else:
        inc_rate = pd.Series(dtype=float)

    # Parse top3_shap_features if it came from CSV as string
    import ast
    def safe_parse(val):
        if isinstance(val, list):
            return val
        try:
            return ast.literal_eval(str(val))
        except Exception:
            return []

    if "top3_shap_features" in scored_df.columns:
        scored_df["top3_shap_features"] = scored_df["top3_shap_features"].apply(safe_parse)

    impact_rows = []
    for _, row in scored_df.iterrows():
        aid = row["asset_id"]
        rate = float(inc_rate.get(aid, 0.0))

        impact = compute_grid_impact_score(
            asset_id       = aid,
            health_index   = float(row["health_index_score"]),
            rul_days       = float(row["RUL_days"]),
            criticality    = str(row.get("criticality", "Medium")),
            mva_rating     = float(row.get("mva_rating", 63)),
            fault_type     = str(row.get("fault_type", "NF")),
            fault_confidence = float(row.get("fault_confidence", 0.5)),
            incident_rate  = rate,
        )
        # Merge all fields for output
        for field in ["health_index_score", "risk_tier", "RUL_days",
                      "fault_type", "fault_label", "fault_confidence",
                      "top3_shap_features", "advisory_text",
                      "grid_zone", "mva_rating", "voltage_kv",
                      "criticality", "archetype"]:
            if field in row:
                impact[field] = row[field]

        impact["incident_rate_per_yr"] = round(rate, 2)
        impact_rows.append(impact)

    ranked = pd.DataFrame(impact_rows)
    ranked = ranked.sort_values("composite_score", ascending=False).reset_index(drop=True)
    ranked["rank"] = ranked.index + 1
    return ranked


if __name__ == "__main__":
    print("="*70)
    print("STAGE 5a — GRID IMPACT RANKING")
    print("="*70)

    ranked = rank_assets()

    print(f"\n{'Rank':<5} {'Asset':<10} {'Score':>6} {'HI':>7} {'Tier':<10} "
          f"{'RUL_d':>6} {'Fault':>5} {'Criticality':<12} {'Zone'}")
    print("-"*80)
    for _, row in ranked.head(10).iterrows():
        print(f"{int(row['rank']):<5} {row['asset_id']:<10} {row['composite_score']:>6.3f} "
              f"{row['health_index_score']:>7.1f} {row['risk_tier']:<10} "
              f"{row['RUL_days']:>6.1f} {row['fault_type']:>5} "
              f"{str(row.get('criticality','?')):<12} {str(row.get('grid_zone','?'))}")

    out_path = DATA_DIR / "ranked_assets.csv"
    ranked.to_csv(out_path, index=False)
    print(f"\n[Ranker] Saved: {out_path}")
    print("="*70)
