import csv
from pathlib import Path

data_dir = Path(__file__).resolve().parent.parent.parent / "src" / "data"
scored_path = data_dir / "scored_snapshot_day89.csv"
ts_path = data_dir / "transformer_timeseries.csv"

# Read scored snapshot
scored_meta = {}
with open(scored_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        aid = row["asset_id"].strip()
        scored_meta[aid] = {
            "risk_tier": row.get("risk_tier", "Standard"),
            "criticality": row.get("criticality", "Standard"),
            "archetype": row.get("archetype", "Standard"),
        }

# Read timeseries day 89
rows_89 = []
headers = None
with open(ts_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    headers = list(reader.fieldnames or [])
    for row in reader:
        if row.get("day") == "89":
            aid = row["asset_id"].strip()
            extra = scored_meta.get(aid, {})
            row["risk_tier"] = extra.get("risk_tier", "Standard")
            row["criticality"] = extra.get("criticality", "Standard")
            row["archetype"] = extra.get("archetype", "Standard")
            rows_89.append(row)

out_headers = headers + ["risk_tier", "criticality", "archetype"]

out_file = Path(__file__).resolve().parent / "raw" / "anand_corridor_sample.csv"
out_file.parent.mkdir(parents=True, exist_ok=True)
with open(out_file, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=out_headers)
    writer.writeheader()
    writer.writerows(rows_89)

assets = sorted(list({r["asset_id"] for r in rows_89}))
print(f"Successfully generated {out_file.name}")
print(f"Total rows: {len(rows_89)}, Unique assets: {len(assets)}")
print(f"Assets: {assets}")
