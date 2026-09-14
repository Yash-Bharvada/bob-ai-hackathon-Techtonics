/**
 * gridData.ts
 * Real-world grid asset telemetry model and transformer registry for Anand District.
 * Conforms to the Techtonics ML pipeline and scored Day-89 dataset.
 */

import { techtonicsApi, RankedAsset } from "./techtonicsApi";

export type GridAssetType =
  | "Transformer"
  | "Substation"
  | "Transmission Corridor"
  | "Distribution Feeder"
  | "Generation Intake";

export type AssetStatus = "stable" | "watch" | "risk";

export interface TelemetryHistoryPoint {
  time: string;
  loadMw: number;
  voltageKv: number;
  tempC: number;
}

export interface IncidentLogItem {
  id: string;
  timestamp: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface GridAsset {
  id: string;
  name: string;
  substation: string;
  region: string;
  type: GridAssetType;
  voltageKv: number;
  nominalVoltageKv: number;
  currentLoadMw: number;
  ratedCapacityMw: number;
  frequencyHz: number;
  coreTempC: number;
  healthScore: number; // 0 - 100% condition (higher = healthier)
  healthIndexRaw: number; // Raw damage score from Model 1 (13.4 = pristine, >=50 = severe)
  rulDays: number; // Estimated Remaining Useful Life
  faultType: string; // IEC 60599 classification: D1, D2, T1, T2, T3, PD, NF
  status: AssetStatus;
  riskTier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  compositeScore: number;
  criticality: string;
  archetype: string;
  activeAnomalies: number;
  lastInspected: string;
  coolingType: string;
  sf6PressureBar: number;
  acousticDba: number;
  top3Shap?: [string, number][];
  telemetryHistory: TelemetryHistoryPoint[];
  incidentLog: IncidentLogItem[];
}

export interface GridTickerEvent {
  id: string;
  timestamp: string;
  assetId: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

// ---------------------------------------------------------------------------
// 18 Ground-Truth Transformers (Anand District Network)
// Scored at Day 89 from Techtonics ML models
// ---------------------------------------------------------------------------
export const initialGridAssets: GridAsset[] = [
  {
    id: "TX-107",
    name: "TX-107 · 25 MVA GIDC Heavy Industry",
    substation: "GIDC Industrial Phase-2 Substation",
    region: "Zone-B · Heavy Manufacturing Corridor",
    type: "Transformer",
    voltageKv: 66,
    nominalVoltageKv: 66,
    currentLoadMw: 21.8,
    ratedCapacityMw: 25.0,
    frequencyHz: 49.92,
    coreTempC: 78.4,
    healthScore: 44, // 100 - 56.37
    healthIndexRaw: 56.37,
    rulDays: 33.2,
    faultType: "D1",
    status: "risk",
    riskTier: "HIGH",
    compositeScore: 0.884,
    criticality: "Critical",
    archetype: "Electrical Arcing",
    activeAnomalies: 3,
    lastInspected: "2026-09-08",
    coolingType: "ONAF (Forced Air)",
    sf6PressureBar: 5.1,
    acousticDba: 74.2,
    top3Shap: [["Methane", 9.16], ["Acethylene", 9.05], ["Hydrogen", 5.58]],
    telemetryHistory: [
      { time: "Day 60", loadMw: 18.2, voltageKv: 66.0, tempC: 58.2 },
      { time: "Day 70", loadMw: 19.5, voltageKv: 65.8, tempC: 64.1 },
      { time: "Day 80", loadMw: 21.0, voltageKv: 65.4, tempC: 72.8 },
      { time: "Day 89", loadMw: 21.8, voltageKv: 65.1, tempC: 78.4 },
    ],
    incidentLog: [
      { id: "INC-107-1", timestamp: "2026-09-09", message: "High C2H2 (>2500 ppm) rate-of-rise detected by DGA monitor.", severity: "critical" },
      { id: "INC-107-2", timestamp: "2026-08-11", message: "65 mph storm gust flashover transient recorded.", severity: "warning" },
    ],
  },
  {
    id: "TX-104",
    name: "TX-104 · 100 MVA Central Transmission",
    substation: "Anand Central Transmission Substation",
    region: "Zone-A · Urban Core Corridor",
    type: "Transformer",
    voltageKv: 132,
    nominalVoltageKv: 132,
    currentLoadMw: 86.4,
    ratedCapacityMw: 100.0,
    frequencyHz: 49.97,
    coreTempC: 84.2,
    healthScore: 61,
    healthIndexRaw: 38.64,
    rulDays: 87.9,
    faultType: "T1",
    status: "watch",
    riskTier: "MEDIUM",
    compositeScore: 0.692,
    criticality: "Critical",
    archetype: "Progressive Thermal Overheating",
    activeAnomalies: 2,
    lastInspected: "2026-09-02",
    coolingType: "OFAF (Forced Oil / Air)",
    sf6PressureBar: 5.8,
    acousticDba: 68.5,
    top3Shap: [["Methane", 13.13], ["DBDS", -3.70], ["Hydrogen", -3.49]],
    telemetryHistory: [
      { time: "Day 60", loadMw: 72.0, voltageKv: 132.1, tempC: 62.0 },
      { time: "Day 70", loadMw: 78.5, voltageKv: 131.8, tempC: 71.4 },
      { time: "Day 80", loadMw: 84.1, voltageKv: 131.4, tempC: 79.8 },
      { time: "Day 89", loadMw: 86.4, voltageKv: 131.0, tempC: 84.2 },
    ],
    incidentLog: [
      { id: "INC-104-1", timestamp: "2026-09-05", message: "Heatwave ambient 39.5°C elevated top-oil to 95°C limit.", severity: "warning" },
    ],
  },
  {
    id: "TX-115",
    name: "TX-115 · 100 MVA Urban Bulk Feed (RECOVERED)",
    substation: "Anand South Bulk Substation",
    region: "Zone-D · South Distribution Corridor",
    type: "Transformer",
    voltageKv: 66,
    nominalVoltageKv: 66,
    currentLoadMw: 62.0,
    ratedCapacityMw: 100.0,
    frequencyHz: 50.01,
    coreTempC: 56.8,
    healthScore: 64, // Recovered from 28.7 (HI was 71.3, now 36.1)
    healthIndexRaw: 36.1,
    rulDays: 97.0, // Rescued from 7.7 days!
    faultType: "T2",
    status: "watch", // Recovered from imminent risk
    riskTier: "MEDIUM",
    compositeScore: 0.585,
    criticality: "Critical",
    archetype: "Intervention & Stalled Recovery",
    activeAnomalies: 1,
    lastInspected: "2026-09-10 (Post-intervention)",
    coolingType: "ONAF (Repaired Fan Banks)",
    sf6PressureBar: 5.6,
    acousticDba: 61.2,
    top3Shap: [["Methane", 8.42], ["Ethylene", -4.11], ["Hydrogen", -2.85]],
    telemetryHistory: [
      { time: "Day 65", loadMw: 74.0, voltageKv: 66.0, tempC: 62.1 },
      { time: "Day 78 (Peak)", loadMw: 92.5, voltageKv: 65.2, tempC: 91.4 },
      { time: "Day 79 (Repair)", loadMw: 60.0, voltageKv: 66.1, tempC: 58.2 },
      { time: "Day 89 (Current)", loadMw: 62.0, voltageKv: 66.0, tempC: 56.8 },
    ],
    incidentLog: [
      { id: "INC-115-1", timestamp: "2026-08-31", message: "Cooling fan motor replacement & 20% load curtailment completed.", severity: "info" },
      { id: "INC-115-2", timestamp: "2026-08-30", message: "Day 78 critical alert: HI reached 71.3, RUL collapsed to 7.7 days.", severity: "critical" },
    ],
  },
  {
    id: "TX-112",
    name: "TX-112 · 25 MVA Industrial Park Sub",
    substation: "Borsad Industrial Feeder",
    region: "Zone-C · Industrial Transition Zone",
    type: "Transformer",
    voltageKv: 132,
    nominalVoltageKv: 132,
    currentLoadMw: 20.4,
    ratedCapacityMw: 25.0,
    frequencyHz: 49.95,
    coreTempC: 72.1,
    healthScore: 47,
    healthIndexRaw: 53.25,
    rulDays: 39.0,
    faultType: "D1",
    status: "risk",
    riskTier: "HIGH",
    compositeScore: 0.761,
    criticality: "Critical",
    archetype: "Shock-Induced Partial Discharge",
    activeAnomalies: 2,
    lastInspected: "2026-09-06",
    coolingType: "ONAN (Natural Convection)",
    sf6PressureBar: 5.2,
    acousticDba: 71.0,
    top3Shap: [["Methane", 12.30], ["Acethylene", 8.68], ["Hydrogen", 4.99]],
    telemetryHistory: [
      { time: "Day 60", loadMw: 17.5, voltageKv: 132.0, tempC: 55.0 },
      { time: "Day 72 (Strike)", loadMw: 19.8, voltageKv: 131.6, tempC: 68.4 },
      { time: "Day 80", loadMw: 20.1, voltageKv: 131.5, tempC: 70.2 },
      { time: "Day 89", loadMw: 20.4, voltageKv: 131.4, tempC: 72.1 },
    ],
    incidentLog: [
      { id: "INC-112-1", timestamp: "2026-08-25", message: "Nearby excavation strike caused high-frequency mechanical shock & vibration spike.", severity: "warning" },
    ],
  },
  {
    id: "TX-101",
    name: "TX-101 · 25 MVA Civil Hospital Primary",
    substation: "Anand City Civil Hospital Substation",
    region: "Zone-A · Urban Core Corridor",
    type: "Transformer",
    voltageKv: 11,
    nominalVoltageKv: 11,
    currentLoadMw: 16.5,
    ratedCapacityMw: 25.0,
    frequencyHz: 50.00,
    coreTempC: 51.4,
    healthScore: 86,
    healthIndexRaw: 13.8,
    rulDays: 340.0,
    faultType: "NF",
    status: "stable",
    riskTier: "LOW",
    compositeScore: 0.185,
    criticality: "Medium",
    archetype: "Stable",
    activeAnomalies: 0,
    lastInspected: "2026-08-20",
    coolingType: "ONAN",
    sf6PressureBar: 6.0,
    acousticDba: 54.0,
    top3Shap: [["Dielectric rigidity", -5.2], ["Water content", -3.1], ["Interfacial V", -2.8]],
    telemetryHistory: [
      { time: "Day 60", loadMw: 16.0, voltageKv: 11.0, tempC: 50.5 },
      { time: "Day 70", loadMw: 16.2, voltageKv: 11.0, tempC: 51.0 },
      { time: "Day 80", loadMw: 16.3, voltageKv: 11.0, tempC: 51.2 },
      { time: "Day 89", loadMw: 16.5, voltageKv: 11.0, tempC: 51.4 },
    ],
    incidentLog: [],
  },
  {
    id: "TX-116",
    name: "TX-116 · 40 MVA University Feeder",
    substation: "Anand University Feeder Substation",
    region: "Zone-D · South Distribution Corridor",
    type: "Transformer",
    voltageKv: 132,
    nominalVoltageKv: 132,
    currentLoadMw: 26.0,
    ratedCapacityMw: 40.0,
    frequencyHz: 50.02,
    coreTempC: 49.8,
    healthScore: 87,
    healthIndexRaw: 13.4,
    rulDays: 365.0,
    faultType: "NF",
    status: "stable",
    riskTier: "LOW",
    compositeScore: 0.220,
    criticality: "High",
    archetype: "Stable",
    activeAnomalies: 0,
    lastInspected: "2026-07-15",
    coolingType: "ONAF",
    sf6PressureBar: 5.9,
    acousticDba: 52.1,
    telemetryHistory: [
      { time: "Day 60", loadMw: 24.5, voltageKv: 132.0, tempC: 48.9 },
      { time: "Day 89", loadMw: 26.0, voltageKv: 132.0, tempC: 49.8 },
    ],
    incidentLog: [],
  },
  {
    id: "TX-105",
    name: "TX-105 · 100 MVA Vitthal Udyognagar",
    substation: "Vitthal Udyognagar Feeder",
    region: "Zone-B · Heavy Manufacturing Corridor",
    type: "Transformer",
    voltageKv: 11,
    nominalVoltageKv: 11,
    currentLoadMw: 68.0,
    ratedCapacityMw: 100.0,
    frequencyHz: 49.98,
    coreTempC: 54.2,
    healthScore: 85,
    healthIndexRaw: 14.2,
    rulDays: 330.0,
    faultType: "NF",
    status: "stable",
    riskTier: "LOW",
    compositeScore: 0.245,
    criticality: "High",
    archetype: "Stable",
    activeAnomalies: 0,
    lastInspected: "2026-08-14",
    coolingType: "OFAF",
    sf6PressureBar: 5.8,
    acousticDba: 56.0,
    telemetryHistory: [{ time: "Day 60", loadMw: 65.0, voltageKv: 11.0, tempC: 53.0 }, { time: "Day 89", loadMw: 68.0, voltageKv: 11.0, tempC: 54.2 }],
    incidentLog: [],
  },
  {
    id: "TX-110",
    name: "TX-110 · 25 MVA Borsad Town Primary",
    substation: "Borsad Substation",
    region: "Zone-C · Industrial Transition Zone",
    type: "Transformer",
    voltageKv: 33,
    nominalVoltageKv: 33,
    currentLoadMw: 17.1,
    ratedCapacityMw: 25.0,
    frequencyHz: 50.00,
    coreTempC: 52.8,
    healthScore: 86,
    healthIndexRaw: 13.9,
    rulDays: 345.0,
    faultType: "NF",
    status: "stable",
    riskTier: "LOW",
    compositeScore: 0.205,
    criticality: "High",
    archetype: "Stable",
    activeAnomalies: 0,
    lastInspected: "2026-08-01",
    coolingType: "ONAN",
    sf6PressureBar: 5.9,
    acousticDba: 53.4,
    telemetryHistory: [{ time: "Day 60", loadMw: 16.8, voltageKv: 33.0, tempC: 52.0 }, { time: "Day 89", loadMw: 17.1, voltageKv: 33.0, tempC: 52.8 }],
    incidentLog: [],
  },
  // Stable baseline assets (TX-102, 103, 106, 108, 109, 111, 113, 114, 117, 118)
  ...[
    { id: "TX-102", mva: 63, kv: 33, zone: "Zone-A", crit: "Low", hi: 14.1, temp: 49.2, fault: "NF" },
    { id: "TX-103", mva: 40, kv: 66, zone: "Zone-A", crit: "Low", hi: 15.0, temp: 51.0, fault: "NF" },
    { id: "TX-106", mva: 160, kv: 33, zone: "Zone-B", crit: "Medium", hi: 14.8, temp: 53.5, fault: "NF" },
    { id: "TX-108", mva: 100, kv: 132, zone: "Zone-B", crit: "Low", hi: 13.6, temp: 48.5, fault: "NF" },
    { id: "TX-109", mva: 63, kv: 11, zone: "Zone-C", crit: "Medium", hi: 38.6, temp: 64.0, fault: "T1" },
    { id: "TX-111", mva: 160, kv: 66, zone: "Zone-C", crit: "Low", hi: 14.0, temp: 50.1, fault: "NF" },
    { id: "TX-113", mva: 100, kv: 11, zone: "Zone-D", crit: "Low", hi: 13.5, temp: 47.9, fault: "NF" },
    { id: "TX-114", mva: 63, kv: 33, zone: "Zone-D", crit: "Low", hi: 14.2, temp: 49.5, fault: "NF" },
    { id: "TX-117", mva: 63, kv: 11, zone: "Zone-A", crit: "Low", hi: 13.9, temp: 48.0, fault: "NF" },
    { id: "TX-118", mva: 160, kv: 33, zone: "Zone-A", crit: "Low", hi: 14.5, temp: 52.0, fault: "NF" },
  ].map((b): GridAsset => ({
    id: b.id,
    name: `${b.id} · ${b.mva} MVA Regional Unit`,
    substation: `${b.zone} Substation Node`,
    region: `${b.zone} · Anand Distribution`,
    type: "Transformer",
    voltageKv: b.kv,
    nominalVoltageKv: b.kv,
    currentLoadMw: Math.round(b.mva * 0.65),
    ratedCapacityMw: b.mva,
    frequencyHz: 50.00,
    coreTempC: b.temp,
    healthScore: Math.round(100 - b.hi),
    healthIndexRaw: b.hi,
    rulDays: b.hi > 30 ? 87.9 : 350.0,
    faultType: b.fault,
    status: b.hi > 50 ? "risk" : b.hi > 30 ? "watch" : "stable",
    riskTier: b.hi > 50 ? "HIGH" : b.hi > 30 ? "MEDIUM" : "LOW",
    compositeScore: b.hi > 30 ? 0.45 : 0.15,
    criticality: b.crit,
    archetype: b.hi > 30 ? "Moderate Thermal" : "Stable",
    activeAnomalies: b.hi > 30 ? 1 : 0,
    lastInspected: "2026-08-10",
    coolingType: "ONAN",
    sf6PressureBar: 5.9,
    acousticDba: 53.0,
    telemetryHistory: [
      { time: "Day 60", loadMw: Math.round(b.mva * 0.6), voltageKv: b.kv, tempC: b.temp - 2 },
      { time: "Day 89", loadMw: Math.round(b.mva * 0.65), voltageKv: b.kv, tempC: b.temp },
    ],
    incidentLog: [],
  })),
];

export const initialGridTicker: GridTickerEvent[] = [
  {
    id: "TICK-1",
    timestamp: "13:48:10",
    assetId: "TX-107",
    message: "Critical DGA arcing alert: C2H2 rate-of-rise exceeds IEC thresholds. Immediate dispatch recommended.",
    severity: "critical",
  },
  {
    id: "TICK-2",
    timestamp: "13:42:05",
    assetId: "TX-115",
    message: "Stalled recovery verified: Health index stabilized at 36.1 post fan replacement and load curtailment.",
    severity: "info",
  },
  {
    id: "TICK-3",
    timestamp: "13:30:18",
    assetId: "TX-104",
    message: "Progressive thermal signature: CH4 and C2H4 elevation correlates with heatwave ambient peak.",
    severity: "warning",
  },
  {
    id: "TICK-4",
    timestamp: "13:15:00",
    assetId: "TX-112",
    message: "Excavation strike transient damping complete; D1 low-energy discharge monitoring continues.",
    severity: "warning",
  },
];

/**
 * Merge live FastAPI /api/ranked response into the GridAsset list
 */
export function mergeRankedIntoAssets(baseAssets: GridAsset[], rankedList: RankedAsset[]): GridAsset[] {
  const rankedMap = new Map(rankedList.map((r) => [r.asset_id, r]));

  return baseAssets.map((asset) => {
    const live = rankedMap.get(asset.id);
    if (!live) return asset;

    const hiRaw = live.health_index;
    const isCritical = live.risk_tier === "CRITICAL";
    const isHigh = live.risk_tier === "HIGH";
    const isMedium = live.risk_tier === "MEDIUM";

    return {
      ...asset,
      healthIndexRaw: hiRaw,
      healthScore: Math.max(5, Math.min(99, Math.round(100 - hiRaw))),
      rulDays: live.RUL_days,
      faultType: live.fault_type || asset.faultType,
      riskTier: live.risk_tier,
      compositeScore: live.composite_score,
      status: (isCritical || isHigh) ? "risk" : isMedium ? "watch" : "stable",
      activeAnomalies: (isCritical || isHigh) ? 3 : isMedium ? 1 : 0,
      top3Shap: live.top_3_shap || asset.top3Shap,
    };
  });
}
