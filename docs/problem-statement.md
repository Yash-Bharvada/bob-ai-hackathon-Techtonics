# Problem Statement — VOLTRA Grid Risk Advisor

## The Challenge

Power utilities operate thousands of high-value transformers across geographically distributed grid zones. Each transformer continuously produces sensor data — dissolved gas concentrations, oil temperature, dielectric measurements, load percentage — yet this data is rarely synthesised into a unified, actionable risk signal.

**Grid operators learn about equipment failure after the fact. Not before it.**

---

## Why This Matters

### Financial Cost of Reactive Maintenance

Unplanned transformer outages impose three layers of cost:

1. **Emergency repair cost**: £100,000–£1.2M per incident in direct costs (emergency procurement, rapid crew mobilisation, hire of replacement units)
2. **Reactive dispatch multiplier**: Emergency maintenance crews cost 3–7× more than a planned maintenance visit to the same asset
3. **Regulatory and compensation exposure**: UK and Indian regulators impose penalties for prolonged outages; large industrial customers hold utility contracts with SLA compensation clauses

### The Ageing Asset Fleet

40% of UK grid transformers were installed before 1990. Indian state utilities face similar demographics. These assets operate under higher loads than their original design assumed — rising demand from data centres, industrial growth, and EV charging compounds the thermal stress on ageing insulation.

### The Ground Event Blind Spot

Transformers don't only fail from internal degradation. They fail from external physical shocks: construction excavators hitting cable trenches, grass fires near transformer enclosures, lightning strikes to overhead conductors, flooding. These events are often noticed by people on the ground before any SCADA sensor registers a response — yet there is no standardised channel to feed this ground truth into a risk model.

---

## The Data Gap

Every transformer lifecycle produces rich telemetry:

| Sensor Type | Measurements | Current State |
|---|---|---|
| **Dissolved Gas Analysis (DGA)** | H₂, CH₄, C₂H₂, C₂H₄, C₂H₆, CO, CO₂ | Lab results arrive as CSV exports, rarely linked to health scores |
| **Dielectric** | Dielectric rigidity, Power factor, Interfacial voltage | Logged in isolation; not combined with gas data |
| **Thermal** | Top-oil temperature, ambient temperature | Available in SCADA, not tied to fault classifiers |
| **Physical** | Load %, vibration, moisture, age | Scattered across maintenance logs and asset registries |

**None of these channels are automatically combined** into a unified risk score, a ranked action list, or a plain-English directive that a field crew can act on.

### What Operators Currently Lack

1. **No unified health score** — there is no single number combining DGA + thermal + dielectric + history into a prioritised asset rank
2. **No fault-type diagnosis** — knowing *that* a transformer is degrading is not enough; knowing *whether* it is arcing, overheating, or experiencing partial discharge determines the crew action
3. **No intervention confirmation** — once maintenance is performed, there is no system tracking whether the health index actually recovered or whether the asset is still heading toward failure
4. **No explainability** — a black-box risk score saying "85% failure probability" gives a field crew no guidance; they cannot justify taking a £500,000 transformer offline without knowing which specific sensor reading is driving the alert

---

## The Specific Problem VOLTRA Addresses

> **Given real-time transformer sensor data, how can a utility predict which assets are most likely to fail, what type of fault is developing, what grid impact that failure would have, and what specific crew action to take — ranked and explained in plain English?**

This breaks into five concrete sub-problems:

1. **Health Index prediction**: given 14 DGA and electrical measurements, what is the current damage state and how many days of useful life remain?
2. **Fault type diagnosis**: given the gas composition, which IEC 60599 fault category (No Fault, Partial Discharge, Discharge D1/D2, Thermal T1/T2/T3) best describes what is developing inside the oil?
3. **Grid impact ranking**: given scores for all assets, which ones should a limited crew address first — accounting for asset size, criticality, and historical failure frequency?
4. **Intervention detection**: can the system detect and communicate when a previous maintenance action successfully halted or reversed a degradation trend?
5. **Ground truth integration**: can community reports and field observations be safely incorporated into risk scoring without opening the system to adversarial manipulation?

---

## Who Experiences This Problem

| Persona | Pain Point |
|---|---|
| **Grid operations manager** | Needs a single ranked view to dispatch 3–4 available crews across 18+ transformers; currently relies on experience and calendar schedules |
| **Asset health engineer** | Needs to translate lab DGA results into actionable severity scores; currently does this manually with Excel and IEC reference tables |
| **Control room operator** | Needs early warning of developing faults before they trigger automatic protection relay trips; currently has no predictive layer |
| **Field crew supervisor** | Needs to know *what to do*, not just *which asset*; requires fault-type-specific action codes and urgency windows |
| **Utility risk manager** | Needs documented, reproducible evidence that a maintenance decision was justified by data; black-box ML is not acceptable |

---

## Why Existing Solutions Don't Solve It

| Existing approach | Why it fails |
|---|---|
| Calendar-based maintenance | Ignores actual equipment condition; wastes crew time on healthy assets, misses accelerating faults |
| SCADA threshold alarms | Reactive by design; alerts only after a threshold is crossed, not before |
| DGA lab software (standalone) | Analyses gases in isolation; does not combine with thermal, electrical, or historical data |
| Generic asset management platforms | Not trained on transformer failure data; no ML inference; no fault-type classification |
| Academic research models | Not deployed; no operator-facing interface; no real-time API; no plain-English output for non-specialists |
