import os
import io
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict

# ==============================================================================
# CONFIGURABLE COLUMN MAP
# ==============================================================================
# Maps internal logical field names -> physical CSV column headers.
# Modify the values on the right if your incoming CSV uses different headers.
# ==============================================================================
COLUMN_MAP = {
    "asset_id": "asset_id",
    "asset_type": "asset_type",
    "site_name": "site_name",
    "timestamp": "timestamp",
    "actual_kwh": "actual_kwh",
    "expected_kwh": "expected_kwh",
    "grid_load_mw": "grid_load_mw",
    "weather": "weather",
}

REQUIRED_LOGICAL_FIELDS = [
    "asset_id",
    "asset_type",
    "site_name",
    "timestamp",
    "actual_kwh",
    "expected_kwh",
    "grid_load_mw",
    "weather",
]


class OperationalDocument:
    """Represents an aggregated natural language summary document with structured metadata."""

    def __init__(self, text: str, metadata: Dict[str, Any], doc_id: str):
        self.text = text
        self.metadata = metadata
        self.doc_id = doc_id

    def __repr__(self) -> str:
        return f"<OperationalDocument id={self.doc_id} asset={self.metadata.get('asset_id')} date={self.metadata.get('date')}>"


def validate_csv_headers(headers: List[str], column_map: Dict[str, str] = COLUMN_MAP) -> None:
    """Validate that all mapped physical columns are present in the CSV headers."""
    header_set = set(h.strip() for h in headers)
    missing_fields = []
    
    for logical_field in REQUIRED_LOGICAL_FIELDS:
        physical_col = column_map.get(logical_field)
        if not physical_col:
            missing_fields.append(f"Logical field '{logical_field}' has no mapping in COLUMN_MAP")
        elif physical_col not in header_set:
            missing_fields.append(f"Mapped column '{physical_col}' (for '{logical_field}') missing from CSV headers")
            
    if missing_fields:
        raise ValueError(
            f"CSV Header Validation Failed:\n" + "\n".join(f"  - {err}" for err in missing_fields)
        )


def parse_timestamp_and_date(ts_str: str) -> tuple[datetime, str]:
    """Parse a timestamp string and return datetime object and calendar date string (YYYY-MM-DD)."""
    ts_str = ts_str.strip()
    date_formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d",
        "%d-%m-%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
    ]
    for fmt in date_formats:
        try:
            dt = datetime.strptime(ts_str, fmt)
            return dt, dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    raise ValueError(f"Unable to parse timestamp '{ts_str}'. Supported formats include YYYY-MM-DD HH:MM:SS.")


def calculate_deviation_pct(actual_kwh: float, expected_kwh: float) -> float:
    """
    Calculate generation deviation percentage.
    Formula: ((actual_kwh - expected_kwh) / expected_kwh) * 100
    Handles expected_kwh == 0 safely without division-by-zero.
    """
    if expected_kwh <= 0.0:
        if actual_kwh > 0.0:
            return 100.0
        return 0.0
    return ((actual_kwh - expected_kwh) / expected_kwh) * 100.0


def format_operational_document(
    asset_id: str,
    asset_type: str,
    site_name: str,
    date_str: str,
    records: List[Dict[str, Any]],
    source_file: str,
    dataset_id: str = "default",
) -> OperationalDocument:
    """
    Groups and aggregates records for an (asset_id, date) pair into a rich natural-language operational document.
    """
    record_count = len(records)
    total_actual = sum(r["actual_kwh"] for r in records)
    total_expected = sum(r["expected_kwh"] for r in records)
    avg_grid_load = sum(r["grid_load_mw"] for r in records) / record_count if record_count > 0 else 0.0
    deviation_pct = calculate_deviation_pct(total_actual, total_expected)

    # Sort records by timestamp to find time range
    sorted_records = sorted(records, key=lambda r: r["dt"])
    earliest_time = sorted_records[0]["dt"].strftime("%H:%M:%S")
    latest_time = sorted_records[-1]["dt"].strftime("%H:%M:%S")
    time_range = f"{earliest_time} to {latest_time}" if record_count > 1 else earliest_time

    # Collect distinct weather observations preserving order
    weather_list = []
    seen_weather = set()
    for r in sorted_records:
        w = r.get("weather", "").strip()
        if w and w not in seen_weather:
            seen_weather.add(w)
            weather_list.append(w)
    weather_summary = "; ".join(weather_list) if weather_list else "Not recorded"

    # Status classification
    if deviation_pct < -10.0:
        perf_status = f"UNDERPERFORMING (Negative deviation: {deviation_pct:+.2f}%)"
    elif deviation_pct > 10.0:
        perf_status = f"SURGE / HIGH GENERATION (Positive deviation: {deviation_pct:+.2f}%)"
    else:
        perf_status = f"NOMINAL (Deviation: {deviation_pct:+.2f}%)"

    # Generate Natural Language Document Text
    doc_lines = [
        f"OPERATIONAL ASSET SUMMARY: {asset_id} ({asset_type})",
        f"Dataset: {dataset_id} | Site: {site_name}",
        f"Date: {date_str} | Telemetry Period: {time_range} ({record_count} intervals)",
        f"Performance Status: {perf_status}",
        f"- Total Actual Generation: {total_actual:,.2f} kWh",
        f"- Total Expected Generation: {total_expected:,.2f} kWh",
        f"- Performance Deviation: {deviation_pct:+.2f}%",
        f"- Average Grid Load: {avg_grid_load:,.2f} MW",
        f"- Weather & Operational Conditions Observed: {weather_summary}",
    ]
    doc_text = "\n".join(doc_lines)

    # Deterministic Document ID: {dataset_id}_{asset_id}_{date_str}
    doc_id = f"{dataset_id}_{asset_id}_{date_str}".replace(" ", "_")

    metadata = {
        "knowledge_type": "operational",
        "dataset_id": dataset_id,
        "source_file": source_file,
        "asset_id": asset_id,
        "asset_type": asset_type,
        "site_name": site_name,
        "date": date_str,
        "actual_kwh": round(total_actual, 2),
        "expected_kwh": round(total_expected, 2),
        "deviation_pct": round(deviation_pct, 2),
        "grid_load_mw": round(avg_grid_load, 2),
        "weather": weather_summary,
        "record_count": record_count,
        "time_range": time_range,
    }

    return OperationalDocument(text=doc_text, metadata=metadata, doc_id=doc_id)


def format_transformer_operational_document(
    row: Dict[str, str],
    row_idx: int,
    source_file: str,
    dataset_id: str = "default",
) -> OperationalDocument:
    """Format a transformer or substation asset sensor reading row into an OperationalDocument."""
    asset_id = (
        row.get("asset_id")
        or row.get("Asset_ID")
        or row.get("asset")
        or row.get("Asset")
        or row.get("id")
        or row.get("ID")
        or row.get("transformer_id")
        or row.get("unit_id")
        or f"TX-ROW-{row_idx}"
    ).strip()

    gas_keys = [
        ("Hydrogen", "H2 (Hydrogen)"),
        ("Methane", "CH4 (Methane)"),
        ("Acethylene", "C2H2 (Acetylene)"),
        ("Ethylene", "C2H4 (Ethylene)"),
        ("Ethane", "C2H6 (Ethane)"),
        ("CO", "CO (Carbon Monoxide)"),
        ("CO2", "CO2 (Carbon Dioxide)"),
        ("Oxigen", "O2 (Oxygen)"),
        ("Nitrogen", "N2 (Nitrogen)"),
    ]
    gases = []
    for k, label in gas_keys:
        val = row.get(k) or row.get(k.lower())
        if val is not None and str(val).strip() != "":
            gases.append(f"  - {label}: {val} ppm")

    oil_keys = [
        ("Water_content", "Water Content"),
        ("Water content", "Water Content"),
        ("Dielectric_rigidity", "Dielectric Rigidity"),
        ("Interfacial_V", "Interfacial Tension"),
        ("Power_factor", "Power Factor"),
        ("Power factor", "Power Factor"),
        ("DBDS", "DBDS Content"),
        ("top_oil_temp_c", "Top Oil Temperature"),
        ("load_pct", "Operating Load"),
    ]
    oil_metrics = []
    for k, label in oil_keys:
        val = row.get(k) or row.get(k.lower())
        if val is not None and str(val).strip() != "":
            unit = "°C" if "temp" in k.lower() else ("%" if "load" in k.lower() else "")
            oil_metrics.append(f"  - {label}: {val} {unit}".strip())

    hi = row.get("health_index") or row.get("health_index_score")
    rul = row.get("RUL_days") or row.get("rul_days")
    risk = row.get("risk_tier") or row.get("criticality_tier")
    fault = row.get("fault_type")
    fault_prob = row.get("fault_prob")

    doc_lines = [
        f"OPERATIONAL ASSET SUMMARY: {asset_id} (Grid Substation Transformer Asset)",
        f"Dataset: {dataset_id} | Source File: {source_file} (Row {row_idx})",
    ]

    if risk or hi or rul or fault:
        eval_parts = []
        if risk: eval_parts.append(f"Risk Tier: {risk}")
        if hi: eval_parts.append(f"Health Index: {hi}/100")
        if rul: eval_parts.append(f"RUL: {rul} days")
        if fault: eval_parts.append(f"Diagnosed Fault: {fault} (Confidence: {fault_prob or 'N/A'})")
        doc_lines.append("Health & Risk Assessment: " + " | ".join(eval_parts))

    if gases:
        doc_lines.append("Dissolved Gas Analysis (DGA) Readings:")
        doc_lines.extend(gases)

    if oil_metrics:
        doc_lines.append("Insulating Oil & Thermal Parameters:")
        doc_lines.extend(oil_metrics)

    handled = {k for k, _ in gas_keys} | {k for k, _ in oil_keys} | {
        "asset_id", "Asset_ID", "asset", "Asset", "id", "ID", "health_index", "RUL_days", "rul_days",
        "risk_tier", "criticality_tier", "fault_type", "fault_prob", "health_index_score",
        "site_name", "substation_name", "date", "timestamp", "transformer_id", "unit_id"
    }
    other_lines = []
    for k, v in row.items():
        if k not in handled and v is not None and str(v).strip() != "":
            other_lines.append(f"  - {k}: {v}")
    if other_lines:
        doc_lines.append("Additional Telemetry Readings:")
        doc_lines.extend(other_lines)

    doc_text = "\n".join(doc_lines)
    today_str = datetime.now().strftime("%Y-%m-%d")
    date_val = row.get("date") or row.get("timestamp") or today_str
    # Deterministic doc_id incorporating dataset_id + asset_id + row/date
    doc_id = f"{dataset_id}_{asset_id}_row{row_idx}_{date_val}".replace(" ", "_").replace(":", "-")

    hi_val = None
    try:
        if hi is not None and str(hi).strip() != "":
            hi_val = float(hi)
    except Exception:
        pass

    rul_val = None
    try:
        if rul is not None and str(rul).strip() != "":
            rul_val = float(rul)
    except Exception:
        pass

    metadata = {
        "knowledge_type": "operational",
        "dataset_id": dataset_id,
        "source_file": source_file,
        "asset_id": asset_id,
        "asset_type": "Transformer",
        "site_name": row.get("substation_name") or row.get("site_name") or "Substation Fleet",
        "date": date_val,
        "health_index": hi_val,
        "rul_days": rul_val,
        "risk_tier": risk or "Standard",
        "fault_type": fault or "NF",
    }
    return OperationalDocument(text=doc_text, metadata=metadata, doc_id=doc_id)


def load_csv_from_string(
    csv_text: str,
    source_filename: str = "uploaded.csv",
    column_map: Dict[str, str] = COLUMN_MAP,
    dataset_id: str = "default",
) -> List[OperationalDocument]:
    """
    Parse CSV text from memory. Automatically identifies whether the file is
    a renewable generation telemetry CSV or a transformer/substation sensor readings CSV,
    and returns a list of rich OperationalDocument objects with dataset_id stamped.
    """
    f = io.StringIO(csv_text.strip())
    reader = csv.DictReader(f)
    if reader.fieldnames is None:
        raise ValueError(f"CSV content in '{source_filename}' is empty or malformed.")

    headers_clean = [h.strip() for h in reader.fieldnames if h and h.strip()]
    if not headers_clean:
        raise ValueError(f"CSV in '{source_filename}' does not contain any valid column headers.")

    headers_lower = {h.lower() for h in headers_clean}

    # Verify at least one identifier column exists across any known schema
    candidate_id_cols = {
        "asset_id", "asset", "id", "transformer_id", "unit_id",
        "equipment_id", "device_id", "station_id", "asset_name", "tx_id"
    }
    has_id_col = bool(headers_lower & candidate_id_cols)
    is_renewable = "actual_kwh" in headers_lower or "expected_kwh" in headers_lower

    if not has_id_col and not is_renewable:
        raise ValueError(
            f"CSV Header Validation Failed: No recognized asset identifier column found in '{source_filename}'. "
            f"Expected at least one of: {', '.join(sorted(candidate_id_cols))}."
        )

    # Branch A: Renewable generation telemetry (has actual_kwh / expected_kwh)
    if is_renewable:
        validate_csv_headers(reader.fieldnames, column_map)

        def get_col(row: Dict[str, str], logical_key: str) -> str:
            phys = column_map[logical_key]
            return row.get(phys, "").strip()

        groups = defaultdict(lambda: {
            "asset_id": "",
            "asset_type": "",
            "site_name": "",
            "date_str": "",
            "records": [],
        })

        for row_idx, row in enumerate(reader, start=2):
            try:
                asset_id = get_col(row, "asset_id")
                asset_type = get_col(row, "asset_type")
                site_name = get_col(row, "site_name")
                ts_str = get_col(row, "timestamp")
                actual_kwh_str = get_col(row, "actual_kwh")
                expected_kwh_str = get_col(row, "expected_kwh")
                grid_load_str = get_col(row, "grid_load_mw")
                weather = get_col(row, "weather")

                if not asset_id or not ts_str:
                    continue

                dt, date_str = parse_timestamp_and_date(ts_str)

                try:
                    actual_kwh = float(actual_kwh_str)
                except ValueError:
                    raise ValueError(f"Invalid numeric actual_kwh '{actual_kwh_str}' at row {row_idx}")

                try:
                    expected_kwh = float(expected_kwh_str)
                except ValueError:
                    raise ValueError(f"Invalid numeric expected_kwh '{expected_kwh_str}' at row {row_idx}")

                try:
                    grid_load_mw = float(grid_load_str)
                except ValueError:
                    raise ValueError(f"Invalid numeric grid_load_mw '{grid_load_str}' at row {row_idx}")

                key = (asset_id, date_str)
                group = groups[key]
                group["asset_id"] = asset_id
                group["asset_type"] = asset_type
                group["site_name"] = site_name
                group["date_str"] = date_str
                group["records"].append({
                    "dt": dt,
                    "actual_kwh": actual_kwh,
                    "expected_kwh": expected_kwh,
                    "grid_load_mw": grid_load_mw,
                    "weather": weather,
                })

            except Exception as e:
                raise ValueError(f"Error parsing row {row_idx} in '{source_filename}': {str(e)}") from e

        documents: List[OperationalDocument] = []
        for (asset_id, date_str), group in groups.items():
            doc = format_operational_document(
                asset_id=group["asset_id"],
                asset_type=group["asset_type"],
                site_name=group["site_name"],
                date_str=group["date_str"],
                records=group["records"],
                source_file=source_filename,
                dataset_id=dataset_id,
            )
            documents.append(doc)

        return documents

    # Branch B: Transformer / Substation / Custom Asset Sensor Telemetry
    documents: List[OperationalDocument] = []
    for row_idx, row in enumerate(reader, start=2):
        cleaned_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
        # Skip empty lines
        if not any(cleaned_row.values()):
            continue
        doc = format_transformer_operational_document(
            row=cleaned_row,
            row_idx=row_idx,
            source_file=source_filename,
            dataset_id=dataset_id,
        )
        documents.append(doc)

    if not documents:
        raise ValueError(f"CSV in '{source_filename}' contains headers but no valid data rows.")

    return documents


def load_csv(
    file_path: Path | str,
    column_map: Dict[str, str] = COLUMN_MAP,
    dataset_id: str = "default",
) -> List[OperationalDocument]:
    """
    Load a single CSV file, validate columns, group by asset_id + date, and return OperationalDocument list.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found at: {path}")

    with open(path, mode="r", encoding="utf-8-sig") as f:
        content = f.read()

    return load_csv_from_string(content, source_filename=path.name, column_map=column_map, dataset_id=dataset_id)


def load_all_csvs(
    data_dir: Path | str,
    column_map: Dict[str, str] = COLUMN_MAP,
) -> List[OperationalDocument]:
    """
    Find and load all CSV files inside data_dir and return all generated OperationalDocuments.
    """
    directory = Path(data_dir)
    if not directory.exists():
        raise FileNotFoundError(f"Data directory does not exist: {directory}")

    csv_files = sorted(directory.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in: {directory}")

    all_docs: List[OperationalDocument] = []
    for csv_path in csv_files:
        docs = load_csv(csv_path, column_map=column_map)
        all_docs.extend(docs)

    return all_docs


if __name__ == "__main__":
    # Quick self-test demonstration
    import sys
    base_dir = Path(__file__).resolve().parent.parent
    raw_dir = base_dir / "data" / "raw"
    print(f"Loading CSVs from {raw_dir}...")
    try:
        documents = load_all_csvs(raw_dir)
        print(f"Successfully generated {len(documents)} operational summary documents:\n")
        for i, doc in enumerate(documents, 1):
            print(f"--- Document [{i}/{len(documents)}] (ID: {doc.doc_id}) ---")
            print(doc.text)
            print("Metadata:", doc.metadata)
            print()
    except Exception as exc:
        print(f"Error during load: {exc}", file=sys.stderr)
        sys.exit(1)
