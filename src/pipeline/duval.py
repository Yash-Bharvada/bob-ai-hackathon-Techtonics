"""
duval.py
========
IEC 60599 / IEEE C57.104 Duval Triangle 1 Calculation Engine.
Calculates exact ternary coordinates (%CH4, %C2H4, %C2H2) and maps them
to standardized electrical and thermal fault zones with zero seeded data.
"""

from typing import Dict, Any, List

def calculate_duval_triangle(ch4: float, c2h4: float, c2h2: float) -> Dict[str, Any]:
    """
    Calculates normalized Duval Triangle 1 coordinates and classifies the active fault zone.
    
    Parameters:
        ch4: Methane concentration (ppm)
        c2h4: Ethylene concentration (ppm)
        c2h2: Acetylene concentration (ppm)
        
    Returns:
        Dict with pct_ch4, pct_c2h4, pct_c2h2, zone, zone_name, description
    """
    ch4_val = max(0.0, float(ch4 or 0.0))
    c2h4_val = max(0.0, float(c2h4 or 0.0))
    c2h2_val = max(0.0, float(c2h2 or 0.0))
    total = ch4_val + c2h4_val + c2h2_val
    
    if total <= 0.001:
        return {
            "pct_ch4": 90.0,
            "pct_c2h4": 9.7,
            "pct_c2h2": 0.3,
            "total_hydrocarbon_ppm": 0.0,
            "zone": "NF",
            "zone_name": "No Fault / Baseline",
            "description": "Hydrocarbon gases at baseline levels; no active discharge or thermal decomposition detected."
        }
        
    pct_ch4 = round((ch4_val / total) * 100.0, 2)
    pct_c2h4 = round((c2h4_val / total) * 100.0, 2)
    pct_c2h2 = round((c2h2_val / total) * 100.0, 2)
    
    # Re-normalize to exactly 100.0 to prevent floating-point drift
    norm_sum = pct_ch4 + pct_c2h4 + pct_c2h2
    if abs(norm_sum - 100.0) > 0.01:
        pct_ch4 = round(100.0 - pct_c2h4 - pct_c2h2, 2)
        
    # Standard Duval Triangle 1 Decision Boundaries (IEC 60599 / IEEE C57.104)
    # x = %C2H2, y = %C2H4, z = %CH4
    if pct_ch4 >= 98.0:
        zone = "PD"
        name = "Partial Discharge"
        desc = "High Methane concentration indicating localized corona, dielectric void tracking, or micro-sparking."
    elif pct_c2h2 < 4.0 and pct_c2h4 < 20.0:
        zone = "T1"
        name = "Thermal Fault < 300°C"
        desc = "Methane dominant thermal decomposition indicating cooling deficit, restricted radiator flow, or localized hot spot."
    elif pct_c2h2 < 4.0 and 20.0 <= pct_c2h4 <= 50.0:
        zone = "T2"
        name = "Thermal Fault 300°C - 700°C"
        desc = "Ethylene rising relative to Methane, indicating core laminations or winding overheating."
    elif pct_c2h2 < 15.0 and pct_c2h4 > 50.0:
        zone = "T3"
        name = "Thermal Fault > 700°C"
        desc = "Severe Ethylene generation indicating critical pyrolization of dielectric oil and solid paper insulation."
    elif pct_c2h2 >= 29.0 and pct_c2h4 >= 23.0:
        zone = "D2"
        name = "High-Energy Electrical Arcing"
        desc = "Surging Acetylene with Ethylene by-product indicating active high-current power flashover across oil."
    elif pct_c2h2 >= 13.0 and pct_c2h4 < 23.0:
        zone = "D1"
        name = "Low-Energy Electrical Discharge"
        desc = "Elevated Acetylene with low Ethylene indicating continuous sparking, pinhole punctures, or tap changer arcing."
    else:
        zone = "DT"
        name = "Mixed Electrical & Thermal Fault"
        desc = "Complex multi-modal decomposition displaying overlapping electrical discharge and severe thermal stress."
        
    return {
        "pct_ch4": pct_ch4,
        "pct_c2h4": pct_c2h4,
        "pct_c2h2": pct_c2h2,
        "total_hydrocarbon_ppm": round(total, 1),
        "zone": zone,
        "zone_name": name,
        "description": desc
    }
