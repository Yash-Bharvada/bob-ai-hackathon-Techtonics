"""
Stage 1 — Synthetic Data Generation
=====================================
Generates:
  1. Asset registry (18 transformers, multiple grid zones)
  2. 90-day transformer time-series with 4 named degradation archetypes
     + 14 stable background assets
  3. Historical incident log (~0.52 incidents/asset/year over 3 years)
  4. External risk events (excavation strikes, storms, cable faults)
  5. Real weather via Open-Meteo archive API (no API key needed)

Archetype definitions (traceable throughout pipeline):
  TX-107  Electrical Arcing            — imminent failure (~3 days RUL)
  TX-104  Progressive Thermal Over-    — early-warning (~7 days RUL)
           heating
  TX-115  Intervention & Stalled       — KEY DEMO: degrades then recovers
           Recovery                      after maintenance on Day 78
  TX-112  Shock-Induced Partial        — externally triggered, ambiguous
           Discharge

Column naming: FULL gas names (Hydrogen, Methane, Ethylene, Ethane,
Acethylene) to match Model 1 schema. Model 2 rename is handled in the
integration pipeline, NOT here.

Health-index scale: DAMAGE score. 13.4 = pristine. >=50 = severe fault.
"""

import json
import os
import warnings
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).parent
DATA_DIR.mkdir(parents=True, exist_ok=True)

RANDOM_SEED = 42
rng = np.random.default_rng(RANDOM_SEED)

# ---------------------------------------------------------------------------
# 1. Asset Registry
# ---------------------------------------------------------------------------
GRID_ZONES = ["Zone-A", "Zone-B", "Zone-C", "Zone-D"]
VOLTAGE_LEVELS = ["11kV", "33kV", "66kV", "132kV"]

# 18 assets — 4 archetype + 14 background
ASSET_IDS = [
    "TX-101", "TX-102", "TX-103", "TX-104",  # Zone-A
    "TX-105", "TX-106", "TX-107", "TX-108",  # Zone-B
    "TX-109", "TX-110", "TX-111", "TX-112",  # Zone-C
    "TX-113", "TX-114", "TX-115", "TX-116",  # Zone-D
    "TX-117", "TX-118",                       # Zone-A (extras)
]

ARCHETYPE_ASSETS = {"TX-107", "TX-104", "TX-115", "TX-112"}

ASSET_META = {}
for i, aid in enumerate(ASSET_IDS):
    zone_idx = i // 4 if i < 16 else 0
    ASSET_META[aid] = {
        "asset_id": aid,
        "grid_zone": GRID_ZONES[zone_idx],
        "voltage_kv": VOLTAGE_LEVELS[i % 4],
        "mva_rating": float(rng.choice([25, 40, 63, 100, 160])),
        "install_year": int(rng.integers(1985, 2015)),
        "archetype": (
            "Electrical_Arcing"             if aid == "TX-107" else
            "Progressive_Thermal"           if aid == "TX-104" else
            "Intervention_Recovery"         if aid == "TX-115" else
            "Shock_PD"                      if aid == "TX-112" else
            "Stable"
        ),
        "criticality": (
            "Critical" if aid in {"TX-107", "TX-104", "TX-115", "TX-112"} else
            rng.choice(["High", "Medium", "Low"], p=[0.15, 0.45, 0.40])
        ),
    }

asset_registry_df = pd.DataFrame(list(ASSET_META.values()))
asset_registry_df.to_csv(DATA_DIR / "asset_registry.csv", index=False)
print(f"[Registry] {len(asset_registry_df)} assets written.")


# ---------------------------------------------------------------------------
# 2. Weather — Open-Meteo archive (hourly → daily)
# ---------------------------------------------------------------------------
# Grid centroid: approximate UK midlands lat/lon
WEATHER_LAT = 52.48
WEATHER_LON = -1.90
# 90-day window ending yesterday (to guarantee availability)
WEATHER_END = date.today() - timedelta(days=1)
WEATHER_START = WEATHER_END - timedelta(days=89)

def fetch_weather(lat: float, lon: float, start: date, end: date) -> pd.DataFrame:
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={start}&end_date={end}"
        "&daily=temperature_2m_max,precipitation_sum,windspeed_10m_max"
        "&timezone=Europe%2FLondon"
    )
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()["daily"]
        df = pd.DataFrame({
            "date": pd.to_datetime(data["time"]),
            "temp_max_c": data["temperature_2m_max"],
            "precip_mm": data["precipitation_sum"],
            "windspeed_max_kmh": data["windspeed_10m_max"],
        })
        print(f"[Weather] Fetched {len(df)} days from Open-Meteo (real data).")
        return df
    except Exception as exc:
        print(f"[Weather] Open-Meteo fetch failed ({exc}). Generating synthetic fallback.")
        dates = [start + timedelta(days=d) for d in range(90)]
        return pd.DataFrame({
            "date": pd.to_datetime(dates),
            "temp_max_c": rng.normal(15, 6, 90).clip(-5, 38),
            "precip_mm": rng.exponential(2, 90).clip(0, 40),
            "windspeed_max_kmh": rng.normal(18, 8, 90).clip(0, 80),
        })

weather_df = fetch_weather(WEATHER_LAT, WEATHER_LON, WEATHER_START, WEATHER_END)
weather_df.to_csv(DATA_DIR / "weather.csv", index=False)


# ---------------------------------------------------------------------------
# 3. Time-series generation helpers
# ---------------------------------------------------------------------------
DAYS = 90
DAY_INDEX = np.arange(DAYS)

# Pristine baseline values (Model 1 feature set — full names)
BASELINE = {
    "Hydrogen":          15.0,
    "Oxigen":            10000.0,
    "Nitrogen":          35000.0,
    "Methane":           30.0,
    "CO":                200.0,
    "CO2":               900.0,
    "Ethylene":           3.0,
    "Ethane":            15.0,
    "Acethylene":         0.1,
    "DBDS":               0.5,
    "Power factor":       0.002,
    "Interfacial V":     35.0,
    "Dielectric rigidity": 60.0,
    "Water content":      12.0,
}

NOISE_STD = {
    "Hydrogen":           3.0,
    "Oxigen":           500.0,
    "Nitrogen":        2000.0,
    "Methane":           5.0,
    "CO":               20.0,
    "CO2":              80.0,
    "Ethylene":          0.5,
    "Ethane":            2.0,
    "Acethylene":        0.02,
    "DBDS":              0.05,
    "Power factor":      0.0003,
    "Interfacial V":     1.0,
    "Dielectric rigidity": 1.5,
    "Water content":     1.0,
}


def base_row(asset_id: str, day: int, day_date: date) -> dict:
    row = {
        "asset_id": asset_id,
        "day": day,
        "date": str(day_date),
    }
    for feat, bval in BASELINE.items():
        noise = rng.normal(0, NOISE_STD[feat])
        row[feat] = max(0.0, bval + noise)
    # top-oil temp default ~65°C
    row["top_oil_temp_c"] = float(rng.normal(65, 3))
    row["load_pct"] = float(np.clip(rng.normal(75, 8), 30, 100))
    row["vibration_g"] = float(np.clip(rng.normal(0.05, 0.01), 0, 1))
    return row


def health_index_from_features(row: dict) -> float:
    """
    Deterministic approximation of what the RF model will score.
    Used ONLY to set archetype trajectories consistently.
    Pristine baseline ≈ 13.4 (DAMAGE score — low = healthy).
    >=50 = severe fault.
    """
    hi = 13.4
    hi += max(0, (row["Hydrogen"] - 50) * 0.15)
    hi += max(0, (row["Acethylene"] - 5) * 2.5)
    hi += max(0, (row["Methane"] - 100) * 0.08)
    hi += max(0, (row["Ethylene"] - 20) * 0.4)
    hi += max(0, (row["CO"] - 500) * 0.03)
    hi += max(0, (60 - row["Dielectric rigidity"]) * 1.2)
    hi += max(0, (row["Power factor"] - 0.005) * 800)
    hi += max(0, (row["Water content"] - 20) * 0.5)
    return round(float(hi), 2)


def rul_days(health_index: float) -> float:
    """
    RUL heuristic — calibrated so:
      health_index ~13 (pristine) → RUL ~180 days
      health_index ~50 (severe)   → RUL ~45 days
      health_index ~70 (critical) → RUL ~8 days
      health_index ~95 (extreme)  → RUL ~3 days
    health_index >= 70: steep segment
    """
    if health_index >= 70:
        return max(1.0, 8.0 - (health_index - 70) * 0.2)
    elif health_index >= 50:
        return max(8.0, 45.0 - (health_index - 50) * 1.85)
    else:
        return max(45.0, 180.0 - (health_index - 13.4) * 3.65)


# ---------------------------------------------------------------------------
# 4. Archetype trajectory builders
# ---------------------------------------------------------------------------

def build_tx107_electrical_arcing(rows: list) -> list:
    """
    TX-107 — Electrical Arcing
    Days 0-59:  normal operating baseline
    Days 60-89: rapid arcing signature — C2H2 (Acethylene) >2500 ppm,
                H2 surge, dielectric rigidity 57→28 kV
                RUL drops to ~3 days by Day 89
    """
    for row in rows:
        d = row["day"]
        if d < 60:
            pass  # baseline noise is sufficient
        else:
            t = (d - 60) / 29.0  # 0..1 over degradation window
            # Acethylene spike: 0.1 → 2800 ppm
            row["Acethylene"] = 0.1 + t * 2799.9 + rng.normal(0, 30 * t)
            # H2 surge: 15 → 1200 ppm
            row["Hydrogen"] = 15 + t * 1185 + rng.normal(0, 40 * t)
            # Ethylene rises (arc by-product)
            row["Ethylene"] = 3 + t * 200 + rng.normal(0, 5 * t)
            # Dielectric rigidity degrades 57 → 28 kV
            row["Dielectric rigidity"] = max(10, 57 - t * 29 + rng.normal(0, 0.8))
            # Power factor worsens
            row["Power factor"] = 0.002 + t * 0.025 + rng.normal(0, 0.0005)
            # Water content rises (insulation breakdown)
            row["Water content"] = 12 + t * 18 + rng.normal(0, 0.5)
            # Top oil temperature rises
            row["top_oil_temp_c"] = 65 + t * 25 + rng.normal(0, 2)

        row["health_index"] = health_index_from_features(row)
        row["RUL_days"] = rul_days(row["health_index"])
    return rows


def build_tx104_progressive_thermal(rows: list) -> list:
    """
    TX-104 — Progressive Thermal Overheating
    Days 0-59:  normal
    Days 60-89: 3-week gradual rise: CH4/C2H4/C2H6 climb together,
                top-oil temp to 96°C, RUL → ~7 days
    """
    for row in rows:
        d = row["day"]
        if d < 60:
            pass
        else:
            t = (d - 60) / 29.0
            row["Methane"] = 30 + t * 320 + rng.normal(0, 8 * t)
            row["Ethylene"] = 3 + t * 150 + rng.normal(0, 4 * t)
            row["Ethane"] = 15 + t * 180 + rng.normal(0, 5 * t)
            row["CO"] = 200 + t * 800 + rng.normal(0, 20 * t)
            row["CO2"] = 900 + t * 2000 + rng.normal(0, 50 * t)
            row["top_oil_temp_c"] = 65 + t * 31 + rng.normal(0, 1.5)
            row["load_pct"] = min(100, 75 + t * 20 + rng.normal(0, 2))
            row["Power factor"] = 0.002 + t * 0.015 + rng.normal(0, 0.0003)
            row["Dielectric rigidity"] = max(25, 60 - t * 15 + rng.normal(0, 0.5))

        row["health_index"] = health_index_from_features(row)
        row["RUL_days"] = rul_days(row["health_index"])
    return rows


def build_tx115_intervention_recovery(rows: list) -> list:
    """
    TX-115 — Intervention & Stalled Recovery  (KEY DEMO DIFFERENTIATOR)
    Days 0-64:  normal
    Days 65-77: degradation: thermal+moisture rise, RUL → ~16 days
    Day 78:     maintenance event: cooling fan repair + load curtailment
    Days 78-89: recovery — gas levels fall, dielectric improves, RUL → ~55 days
    NOTE: never flatten to "still at risk" — the recovery is real and measurable.
    """
    for row in rows:
        d = row["day"]
        if d < 65:
            pass
        elif d <= 77:
            t = (d - 65) / 12.0  # 0..1 over degradation window
            row["Methane"] = 30 + t * 140 + rng.normal(0, 5)
            row["Ethylene"] = 3 + t * 60 + rng.normal(0, 2)
            row["Water content"] = 12 + t * 18 + rng.normal(0, 0.5)
            row["top_oil_temp_c"] = 65 + t * 22 + rng.normal(0, 1.5)
            row["Power factor"] = 0.002 + t * 0.012 + rng.normal(0, 0.0002)
            row["Dielectric rigidity"] = max(30, 60 - t * 20 + rng.normal(0, 0.5))
            row["load_pct"] = 75 + t * 15 + rng.normal(0, 2)
        else:
            # Recovery: 78..89  (0..1 over recovery window)
            r = (d - 78) / 11.0
            # Gases partially return toward baseline (cooling restores oil circulation)
            row["Methane"] = 170 - r * 110 + rng.normal(0, 4)     # 170 → ~60
            row["Ethylene"] = 63 - r * 45 + rng.normal(0, 2)      # 63 → ~18
            row["Water content"] = 30 - r * 14 + rng.normal(0, 0.4)  # 30 → ~16
            row["top_oil_temp_c"] = 87 - r * 20 + rng.normal(0, 1.2)  # 87 → ~67
            row["Power factor"] = 0.014 - r * 0.008 + rng.normal(0, 0.0002)
            row["Dielectric rigidity"] = 40 + r * 15 + rng.normal(0, 0.5)  # 40 → ~55
            row["load_pct"] = 90 - r * 20 + rng.normal(0, 2)     # 90 → ~70

        row["health_index"] = health_index_from_features(row)
        row["RUL_days"] = rul_days(row["health_index"])
    return rows


def build_tx112_shock_pd(rows: list) -> list:
    """
    TX-112 — Shock-Induced Partial Discharge
    Days 0-71:  normal
    Day 72:     external excavation strike
    Days 72-89: H2 climb + vibration surge (PD signature), ambiguous
    """
    for row in rows:
        d = row["day"]
        if d < 72:
            pass
        else:
            t = (d - 72) / 17.0
            # PD signature: H2 rises, small C2H2 trace
            row["Hydrogen"] = 15 + t * 350 + rng.normal(0, 20 * t)
            row["Acethylene"] = 0.1 + t * 12 + rng.normal(0, 1.5 * t)   # modest — PD, not arcing
            row["Methane"] = 30 + t * 80 + rng.normal(0, 5 * t)
            row["vibration_g"] = 0.05 + t * 0.45 + rng.normal(0, 0.02 * t)
            row["Power factor"] = 0.002 + t * 0.010 + rng.normal(0, 0.0002)
            row["Dielectric rigidity"] = max(38, 60 - t * 12 + rng.normal(0, 0.5))

        row["health_index"] = health_index_from_features(row)
        row["RUL_days"] = rul_days(row["health_index"])
    return rows


def build_stable_asset(asset_id: str, rows: list) -> list:
    """14 background assets — slow drift only, RUL stays >120 days."""
    drift_rate = rng.uniform(0.0, 0.015)
    for row in rows:
        d = row["day"]
        t = d / 89.0
        row["Methane"] = max(0, row["Methane"] + drift_rate * d * 2)
        row["CO"] = max(0, row["CO"] + drift_rate * d * 10)
        row["health_index"] = health_index_from_features(row)
        row["RUL_days"] = rul_days(row["health_index"])
    return rows


# ---------------------------------------------------------------------------
# 5. Build full time-series
# ---------------------------------------------------------------------------
dates = [WEATHER_START + timedelta(days=d) for d in range(DAYS)]

all_rows = []
for asset_id in ASSET_IDS:
    rows = [base_row(asset_id, d, dates[d]) for d in range(DAYS)]

    if asset_id == "TX-107":
        rows = build_tx107_electrical_arcing(rows)
    elif asset_id == "TX-104":
        rows = build_tx104_progressive_thermal(rows)
    elif asset_id == "TX-115":
        rows = build_tx115_intervention_recovery(rows)
    elif asset_id == "TX-112":
        rows = build_tx112_shock_pd(rows)
    else:
        rows = build_stable_asset(asset_id, rows)

    all_rows.extend(rows)

timeseries_df = pd.DataFrame(all_rows)

# Ensure non-negative values for gas columns
gas_cols = list(BASELINE.keys())
for col in gas_cols:
    timeseries_df[col] = timeseries_df[col].clip(lower=0)

timeseries_df.to_csv(DATA_DIR / "transformer_timeseries.csv", index=False)
print(f"[TimeSeries] {len(timeseries_df)} rows ({len(ASSET_IDS)} assets x {DAYS} days).")


# ---------------------------------------------------------------------------
# 6. External risk events
# ---------------------------------------------------------------------------
risk_events = [
    {
        "event_id": "EVT-001",
        "date": str(dates[72]),
        "type": "excavation_strike",
        "affected_asset": "TX-112",
        "description": "Nearby utility excavation caused mechanical shock, triggering partial discharge signature.",
        "severity": "High",
    },
    {
        "event_id": "EVT-002",
        "date": str(dates[78]),
        "type": "maintenance_intervention",
        "affected_asset": "TX-115",
        "description": "Cooling fan repair + load curtailment applied. Gas levels and oil temperature began recovering.",
        "severity": "N/A (preventive)",
    },
    {
        "event_id": "EVT-003",
        "date": str(dates[60]),
        "type": "grid_overload",
        "affected_asset": "TX-104",
        "description": "Zone-A demand surge initiated progressive thermal overheating cycle.",
        "severity": "Medium",
    },
    {
        "event_id": "EVT-004",
        "date": str(dates[60]),
        "type": "insulation_fault",
        "affected_asset": "TX-107",
        "description": "Latent insulation degradation reached threshold; electrical arcing sequence commenced.",
        "severity": "Critical",
    },
]
risk_events_df = pd.DataFrame(risk_events)
risk_events_df.to_csv(DATA_DIR / "risk_events.csv", index=False)
print(f"[RiskEvents] {len(risk_events_df)} events written.")


# ---------------------------------------------------------------------------
# 7. Historical incident log (~0.52 incidents/asset/year over 3 years)
# ---------------------------------------------------------------------------
# Expected: 18 assets * 0.52 * 3 = ~28 incidents total
incident_rows = []
inc_id = 1
incident_types = [
    "unplanned_outage", "scheduled_maintenance", "partial_discharge_alarm",
    "overtemperature_trip", "bushing_failure", "oil_leak",
]
for asset_id in ASSET_IDS:
    n_incidents = rng.poisson(0.52 * 3)  # average per 3-year window
    for _ in range(n_incidents):
        day_offset = rng.integers(0, 3 * 365)
        inc_date = date(2022, 1, 1) + timedelta(days=int(day_offset))
        incident_rows.append({
            "incident_id": f"INC-{inc_id:04d}",
            "asset_id": asset_id,
            "date": str(inc_date),
            "type": rng.choice(incident_types),
            "duration_hours": float(np.clip(rng.exponential(8), 0.5, 72)),
            "outage_mwh_lost": float(np.clip(rng.exponential(15), 0, 200)),
            "root_cause": rng.choice([
                "Thermal_stress", "Insulation_aging", "Moisture_ingress",
                "Mechanical_shock", "Overload", "Lightning_surge",
            ]),
        })
        inc_id += 1

incidents_df = pd.DataFrame(incident_rows)
incidents_df.to_csv(DATA_DIR / "incident_log.csv", index=False)
print(f"[Incidents] {len(incidents_df)} incidents across 3 years "
      f"(~{len(incidents_df)/len(ASSET_IDS)/3:.2f} per asset/year).")


# ---------------------------------------------------------------------------
# 8. Print archetype health-index trajectories (confirm distinguishability)
# ---------------------------------------------------------------------------
print("\n" + "="*70)
print("ARCHETYPE HEALTH-INDEX TRAJECTORIES (sampled every 10 days)")
print("Scale: DAMAGE score. 13.4=pristine, >=50=severe, >=70=critical")
print("="*70)

checkpoints = [0, 10, 20, 30, 40, 50, 60, 65, 70, 72, 75, 78, 80, 85, 89]
archetype_assets = ["TX-107", "TX-104", "TX-115", "TX-112"]

for aid in archetype_assets:
    subset = timeseries_df[timeseries_df["asset_id"] == aid].set_index("day")
    archetype = ASSET_META[aid]["archetype"]
    print(f"\n{aid} [{archetype}]")
    print(f"  {'Day':>4}  {'HealthIdx':>10}  {'RUL_days':>9}  {'H2':>8}  {'C2H2':>8}  {'CH4':>8}  {'OilTemp':>8}")
    for d in checkpoints:
        if d in subset.index:
            r = subset.loc[d]
            print(f"  {d:>4}  {r['health_index']:>10.1f}  {r['RUL_days']:>9.1f}  "
                  f"{r['Hydrogen']:>8.1f}  {r['Acethylene']:>8.2f}  "
                  f"{r['Methane']:>8.1f}  {r['top_oil_temp_c']:>8.1f}")

# Intervention event marker for TX-115
print("\n  [TX-115] Maintenance event occurred on Day 78 (cooling fan + load curtailment)")
print("           Health index should DECREASE after Day 78 (recovery is real)")

# Stable asset sample
sample_stable = [a for a in ASSET_IDS if a not in ARCHETYPE_ASSETS][0]
subset_s = timeseries_df[timeseries_df["asset_id"] == sample_stable].set_index("day")
hi_day0 = subset_s.loc[0]["health_index"]
hi_day89 = subset_s.loc[89]["health_index"]
print(f"\n{sample_stable} [Stable background] health_index: {hi_day0:.1f} (Day 0) -> {hi_day89:.1f} (Day 89)")

print("\n" + "="*70)
print("Stage 1 complete. Files written to:", DATA_DIR.resolve())
print("="*70)

# ---------------------------------------------------------------------------
# 9. Save generation config for audit trail
# ---------------------------------------------------------------------------
config = {
    "random_seed": RANDOM_SEED,
    "n_assets": len(ASSET_IDS),
    "n_days": DAYS,
    "weather_lat": WEATHER_LAT,
    "weather_lon": WEATHER_LON,
    "weather_start": str(WEATHER_START),
    "weather_end": str(WEATHER_END),
    "archetypes": {
        "TX-107": "Electrical_Arcing",
        "TX-104": "Progressive_Thermal",
        "TX-115": "Intervention_Recovery",
        "TX-112": "Shock_PD",
    },
    "stable_assets": [a for a in ASSET_IDS if a not in ARCHETYPE_ASSETS],
}
with open(DATA_DIR / "generation_config.json", "w") as f:
    json.dump(config, f, indent=2)
