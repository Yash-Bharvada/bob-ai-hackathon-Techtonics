# Problem Statement

## The Challenge

Power utilities operate thousands of high-value transformers across geographically distributed grid zones. Each transformer holds years of dissolved gas analysis (DGA) records, thermal sensor readings, and maintenance history — yet this data is rarely combined into a unified, actionable risk signal.

**The result:** grid operators learn about equipment failure after the fact, not before it.

## Why This Matters

- **Unplanned transformer outages** cost utilities an average of £100,000–£1.2M per incident in direct costs (emergency procurement, crew mobilisation, loss of supply) — and substantially more in regulatory penalties and customer compensation.
- **Planned maintenance** based on condition data costs 3–7× less than emergency repair.
- **Load growth and ageing assets** mean the transformer fleet is under more stress than ever: 40% of UK grid transformers were installed before 1990.

## The Data Gap

The transformer lifecycle produces rich sensor data — DGA gas concentrations (H₂, CH₄, C₂H₂, C₂H₄, C₂H₆), dielectric rigidity, power factor, oil temperature, moisture — but this data lives in isolated silos:

- DGA lab results arrive as CSV exports, rarely linked to health scores
- No automatic ranking of which asset needs a crew first
- No mechanism to detect whether a previous intervention *worked*

Grid operators are left making prioritisation decisions manually, using experience and intuition rather than evidence.

## The Specific Problem This Project Addresses

> **Given real-time transformer sensor data, how can a utility predict which assets are most likely to fail, what type of fault is developing, and what action should be taken — ranked by grid impact severity?**

The sub-problems are:
1. **Health Index prediction**: given 14 DGA and oil-quality measurements, what is the current damage state of the transformer, and how many days of useful life remain?
2. **Fault type diagnosis**: given the gas composition, which IEC fault category (No Fault, Partial Discharge, Discharge D1/D2, Thermal T1/T2/T3) best describes what's happening inside the oil?
3. **Grid impact ranking**: given scores for all assets, which ones should a limited crew address first, accounting for asset size, criticality, and historical failure frequency?
4. **Intervention detection**: can the system detect and communicate when a previous maintenance action successfully halted or reversed a degradation trend?

## Who Experiences This Problem

- **Grid operations managers** who need a single ranked view to dispatch limited maintenance crews
- **Asset health engineers** who need to translate DGA lab results into actionable severity scores
- **Control room operators** who need early warning of developing faults before they trigger unplanned outages
