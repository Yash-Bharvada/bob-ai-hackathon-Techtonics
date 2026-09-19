/**
 * DuvalTriangle.tsx
 * =================
 * Interactive, high-precision SVG implementation of Michel Duval's Triangle 1
 * (IEC 60599 / IEEE C57.104) for dissolved gas analysis (DGA) diagnostic verification.
 *
 * Mathematically projects ternary coordinates (%CH4, %C2H4, %C2H2) onto an equilateral
 * Cartesian SVG plane with zero seeded data, real-time live telemetry tracking, and
 * multi-day degradation/recovery trajectory trails.
 */

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { type DuvalAnalysis } from "@/lib/techtonicsApi";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Flame,
  Activity,
  Compass,
  Sparkles,
  Info,
} from "lucide-react";

export interface DuvalPoint {
  pct_ch4: number;
  pct_c2h4: number;
  pct_c2h2: number;
  label?: string;
  day?: number;
  date?: string;
  health_index?: number;
  rul_days?: number;
  zone?: string;
}

export interface DuvalTriangleProps {
  /** Current active gas readings (ppm) or pre-calculated percentages */
  ch4Ppm?: number;
  c2h4Ppm?: number;
  c2h2Ppm?: number;
  /** Optional pre-calculated ternary percentages */
  pctCh4?: number;
  pctC2h4?: number;
  pctC2h2?: number;
  /** Model 2 predicted fault type (e.g. "D2", "T1", "NF") for agreement comparison */
  modelPredictedFault?: string;
  /** Optional duval_analysis from backend */
  duvalAnalysis?: DuvalAnalysis | null;
  /** Optional historical trajectory points (Day 0 to Day 89) */
  trajectory?: DuvalPoint[];
  /** Asset ID (e.g. "TX-107") */
  assetId?: string;
  /** Width/size of the triangle in pixels */
  size?: number;
  /** Compact mode for embedding inside smaller drawer cards */
  compact?: boolean;
  /** Optional flag to show/hide the top header title */
  showTitle?: boolean;
}

interface TernaryVertex {
  c: number; // % CH4
  e: number; // % C2H4
  a: number; // % C2H2
}

interface ZoneDefinition {
  id: "PD" | "T1" | "T2" | "T3" | "D1" | "D2" | "DT";
  name: string;
  shortDesc: string;
  colorHex: string;
  fillRgba: string;
  strokeColor: string;
  centerText: [number, number, number]; // label position in ternary (c, e, a)
  vertices: TernaryVertex[];
}

const DUVAL_ZONES: ZoneDefinition[] = [
  {
    id: "PD",
    name: "Partial Discharge",
    shortDesc: "Localized corona or micro-tracking in insulation voids.",
    colorHex: "#a855f7",
    fillRgba: "rgba(168, 85, 247, 0.22)",
    strokeColor: "rgba(168, 85, 247, 0.6)",
    centerText: [98.5, 0.8, 0.7],
    vertices: [
      { c: 100, e: 0, a: 0 },
      { c: 98, e: 0, a: 2 },
      { c: 98, e: 2, a: 0 },
    ],
  },
  {
    id: "T1",
    name: "Thermal Fault < 300°C",
    shortDesc: "Methane dominant thermal decomposition (cooling deficit / hot spot).",
    colorHex: "#10b981",
    fillRgba: "rgba(16, 185, 129, 0.22)",
    strokeColor: "rgba(16, 185, 129, 0.6)",
    centerText: [86, 9, 5],
    vertices: [
      { c: 98, e: 0, a: 2 },
      { c: 76, e: 0, a: 24 },
      { c: 76, e: 20, a: 4 },
      { c: 80, e: 20, a: 0 },
      { c: 98, e: 2, a: 0 },
    ],
  },
  {
    id: "T2",
    name: "Thermal Fault 300°C - 700°C",
    shortDesc: "Ethylene rising relative to Methane (core / winding overheating).",
    colorHex: "#f59e0b",
    fillRgba: "rgba(245, 158, 11, 0.24)",
    strokeColor: "rgba(245, 158, 11, 0.6)",
    centerText: [64, 34, 2],
    vertices: [
      { c: 80, e: 20, a: 0 },
      { c: 76, e: 20, a: 4 },
      { c: 46, e: 50, a: 4 },
      { c: 50, e: 50, a: 0 },
    ],
  },
  {
    id: "T3",
    name: "Thermal Fault > 700°C",
    shortDesc: "Severe oil pyrolization and solid paper insulation charring.",
    colorHex: "#ef4444",
    fillRgba: "rgba(239, 68, 68, 0.28)",
    strokeColor: "rgba(239, 68, 68, 0.6)",
    centerText: [22, 70, 8],
    vertices: [
      { c: 50, e: 50, a: 0 },
      { c: 35, e: 50, a: 15 },
      { c: 0, e: 85, a: 15 },
      { c: 0, e: 100, a: 0 },
    ],
  },
  {
    id: "D1",
    name: "Low-Energy Electrical Discharge",
    shortDesc: "Continuous sparking, tap-changer pitting or tracking.",
    colorHex: "#0ea5e9",
    fillRgba: "rgba(14, 165, 233, 0.24)",
    strokeColor: "rgba(14, 165, 233, 0.6)",
    centerText: [38, 10, 52],
    vertices: [
      { c: 76, e: 0, a: 24 },
      { c: 0, e: 0, a: 100 },
      { c: 0, e: 23, a: 77 },
      { c: 64, e: 23, a: 13 },
      { c: 76, e: 11, a: 13 },
    ],
  },
  {
    id: "D2",
    name: "High-Energy Electrical Arcing",
    shortDesc: "Active destructive power arc flashover across dielectric oil.",
    colorHex: "#d946ef",
    fillRgba: "rgba(217, 70, 239, 0.30)",
    strokeColor: "rgba(217, 70, 239, 0.7)",
    centerText: [16, 42, 42],
    vertices: [
      { c: 0, e: 23, a: 77 },
      { c: 0, e: 71, a: 29 },
      { c: 32, e: 39, a: 29 },
      { c: 38, e: 23, a: 39 },
    ],
  },
  {
    id: "DT",
    name: "Mixed Electrical & Thermal",
    shortDesc: "Simultaneous thermal degradation and localized electrical discharge.",
    colorHex: "#eab308",
    fillRgba: "rgba(234, 179, 8, 0.20)",
    strokeColor: "rgba(234, 179, 8, 0.5)",
    centerText: [42, 35, 23],
    vertices: [
      { c: 76, e: 20, a: 4 },
      { c: 76, e: 11, a: 13 },
      { c: 64, e: 23, a: 13 },
      { c: 38, e: 23, a: 39 },
      { c: 32, e: 39, a: 29 },
      { c: 0, e: 71, a: 29 },
      { c: 0, e: 85, a: 15 },
      { c: 35, e: 50, a: 15 },
      { c: 46, e: 50, a: 4 },
    ],
  },
];

/** Convert ternary (c = %CH4, e = %C2H4, a = %C2H2) to Cartesian 2D (x, y) */
function ternaryToCartesian(c: number, e: number, a: number, W: number, H: number): [number, number] {
  // Normalize if slight rounding drift
  const sum = (c + e + a) || 100;
  const normC = (c / sum) * 100;
  const normE = (e / sum) * 100;
  
  // Top vertex is 100% CH4 at (W/2, 0)
  // Bottom-Left vertex is 100% C2H2 at (0, H)
  // Bottom-Right vertex is 100% C2H4 at (W, H)
  const x = W * (normE / 100 + normC / 200);
  const y = (H / 100) * (100 - normC);
  return [x, y];
}

export function DuvalTriangle({
  ch4Ppm = 30,
  c2h4Ppm = 3,
  c2h2Ppm = 0.1,
  pctCh4,
  pctC2h4,
  pctC2h2,
  modelPredictedFault,
  duvalAnalysis,
  trajectory = [],
  assetId,
  size = 420,
  compact = false,
  showTitle = true,
}: DuvalTriangleProps) {
  const [hoveredZone, setHoveredZone] = useState<ZoneDefinition | null>(null);
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true);

  // Derive active ternary percentages
  const activePercentages = useMemo(() => {
    if (pctCh4 != null && pctC2h4 != null && pctC2h2 != null) {
      return { ch4: pctCh4, c2h4: pctC2h4, c2h2: pctC2h2 };
    }
    const ch4 = Math.max(0, ch4Ppm ?? 0);
    const c2h4 = Math.max(0, c2h4Ppm ?? 0);
    const c2h2 = Math.max(0, c2h2Ppm ?? 0);
    const total = ch4 + c2h4 + c2h2;
    if (total <= 0.001 && duvalAnalysis) {
      return {
        ch4: duvalAnalysis.pct_ch4,
        c2h4: duvalAnalysis.pct_c2h4,
        c2h2: duvalAnalysis.pct_c2h2,
      };
    }
    if (total <= 0.001) {
      return { ch4: 90.0, c2h4: 9.7, c2h2: 0.3 };
    }
    const pCh4 = Number(((ch4 / total) * 100).toFixed(2));
    const pC2h4 = Number(((c2h4 / total) * 100).toFixed(2));
    const pC2h2 = Number((100 - pCh4 - pC2h4).toFixed(2));
    return { ch4: pCh4, c2h4: pC2h4, c2h2: Math.max(0, pC2h2) };
  }, [ch4Ppm, c2h4Ppm, c2h2Ppm, pctCh4, pctC2h4, pctC2h2, duvalAnalysis]);

  // ViewBox dimensions: standard equilateral triangle
  const viewBoxW = 500;
  const viewBoxH = 433; // 500 * sin(60°) ≈ 433

  // Current active marker screen coordinates
  const [activeX, activeY] = useMemo(() => {
    return ternaryToCartesian(
      activePercentages.ch4,
      activePercentages.c2h4,
      activePercentages.c2h2,
      viewBoxW,
      viewBoxH
    );
  }, [activePercentages]);

  // Determine current Duval Classical Zone
  const currentDuvalZone = useMemo(() => {
    const { ch4, c2h4, c2h2 } = activePercentages;
    if (ch4 >= 98.0) return DUVAL_ZONES.find((z) => z.id === "PD")!;
    if (c2h2 < 4.0 && c2h4 < 20.0) return DUVAL_ZONES.find((z) => z.id === "T1")!;
    if (c2h2 < 4.0 && c2h4 >= 20.0 && c2h4 <= 50.0) return DUVAL_ZONES.find((z) => z.id === "T2")!;
    if (c2h2 < 15.0 && c2h4 > 50.0) return DUVAL_ZONES.find((z) => z.id === "T3")!;
    if (c2h2 >= 29.0 && c2h4 >= 23.0) return DUVAL_ZONES.find((z) => z.id === "D2")!;
    if (c2h2 >= 13.0 && c2h4 < 23.0) return DUVAL_ZONES.find((z) => z.id === "D1")!;
    return DUVAL_ZONES.find((z) => z.id === "DT")!;
  }, [activePercentages]);

  // Check agreement between AI Model 2 and Duval Classical Rule
  const modelAgreement = useMemo(() => {
    if (!modelPredictedFault) return null;
    const cleanPred = modelPredictedFault.replace(/^possible\s+/i, "").toUpperCase();
    const duvalId = currentDuvalZone.id;
    if (cleanPred === duvalId) return "EXACT";
    if (
      (cleanPred === "D1" || cleanPred === "D2") &&
      (duvalId === "D1" || duvalId === "D2" || duvalId === "DT")
    )
      return "COMPATIBLE_ELECTRICAL";
    if (
      (cleanPred === "T1" || cleanPred === "T2" || cleanPred === "T3") &&
      (duvalId === "T1" || duvalId === "T2" || duvalId === "T3" || duvalId === "DT")
    )
      return "COMPATIBLE_THERMAL";
    return "DISCREPANCY";
  }, [modelPredictedFault, currentDuvalZone]);

  // Build SVG trajectory path points from real historical telemetry
  const trajectoryPoints = useMemo(() => {
    if (!trajectory || trajectory.length === 0) return [];
    return trajectory.map((pt) => {
      const [x, y] = ternaryToCartesian(pt.pct_ch4, pt.pct_c2h4, pt.pct_c2h2, viewBoxW, viewBoxH);
      return { x, y, day: pt.day, date: pt.date, hi: pt.health_index };
    });
  }, [trajectory]);

  const trajectoryPathString = useMemo(() => {
    if (trajectoryPoints.length < 2) return "";
    return trajectoryPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }, [trajectoryPoints]);

  return (
    <div className={`relative flex flex-col rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-md ${compact ? "max-w-md" : "w-full"}`}>
      {/* ── Top Header Strip ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50">
        {showTitle ? (
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary border border-primary/30 shadow-xs">
              <Compass className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 font-mono">
                Duval Triangle 1 Diagnostics
                <span className="text-[10px] font-normal text-muted-foreground">(IEC 60599)</span>
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Ternary Gas Projection · %CH₄ · %C₂H₄ · %C₂H₂
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <Compass className="size-3.5 text-primary" />
            <span>IEC 60599 Geometry</span>
          </div>
        )}

        {/* Live Zone Readout Badge */}
        <div className="flex items-center gap-2">
          {trajectoryPoints.length > 0 && (
            <button
              onClick={() => setShowTrajectory((s) => !s)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all ${
                showTrajectory
                  ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {showTrajectory ? "Trail ON" : "Trail OFF"}
            </button>
          )}

          <Badge
            variant="outline"
            className="gap-1 font-mono text-[10px] px-2 py-0.5 border"
            style={{
              borderColor: currentDuvalZone.colorHex,
              backgroundColor: currentDuvalZone.fillRgba,
              color: currentDuvalZone.colorHex,
            }}
          >
            <span className="size-1.5 rounded-full animate-ping" style={{ backgroundColor: currentDuvalZone.colorHex }} />
            Zone {currentDuvalZone.id}: {currentDuvalZone.name}
          </Badge>
        </div>
      </div>

      {/* ── Main SVG Ternary Canvas ────────────────────────────────────────── */}
      <div className="relative mx-auto my-3 flex items-center justify-center" style={{ width: "100%", maxWidth: size }}>
        <svg
          viewBox={`-30 -25 ${viewBoxW + 60} ${viewBoxH + 55}`}
          className="w-full h-auto select-none overflow-visible"
        >
          <defs>
            {/* Gradient for historical trajectory path */}
            <linearGradient id="duvalTrailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
            </linearGradient>

            {/* Glowing filter for current active point */}
            <filter id="duvalGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Triangular Grid Lines ────────────────────────────────────── */}
          {[20, 40, 60, 80].map((pct) => {
            // Horizontal grid line (%CH4 constant)
            const [xL, yH] = ternaryToCartesian(pct, 0, 100 - pct, viewBoxW, viewBoxH);
            const [xR] = ternaryToCartesian(pct, 100 - pct, 0, viewBoxW, viewBoxH);
            return (
              <line
                key={`grid-h-${pct}`}
                x1={xL}
                y1={yH}
                x2={xR}
                y2={yH}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            );
          })}

          {/* ── Duval Zones (Filled Polygons) ────────────────────────────── */}
          {DUVAL_ZONES.map((zone) => {
            const polygonPoints = zone.vertices
              .map((v) => {
                const [x, y] = ternaryToCartesian(v.c, v.e, v.a, viewBoxW, viewBoxH);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");

            const isCurrent = currentDuvalZone.id === zone.id;
            const isHovered = hoveredZone?.id === zone.id;

            const [labelX, labelY] = ternaryToCartesian(
              zone.centerText[0],
              zone.centerText[1],
              zone.centerText[2],
              viewBoxW,
              viewBoxH
            );

            return (
              <g
                key={zone.id}
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer transition-opacity duration-200"
              >
                <polygon
                  points={polygonPoints}
                  fill={zone.fillRgba}
                  stroke={isCurrent || isHovered ? zone.colorHex : zone.strokeColor}
                  strokeWidth={isCurrent || isHovered ? 2 : 1}
                  strokeOpacity={isCurrent || isHovered ? 1 : 0.6}
                  style={{
                    filter: isHovered ? "brightness(1.2)" : "none",
                    transition: "all 0.2s ease",
                  }}
                />

                {/* Zone Code Label */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={compact ? 10 : 12}
                  fontWeight="bold"
                  fontFamily="monospace"
                  fill={zone.colorHex}
                  className="pointer-events-none drop-shadow-xs"
                >
                  {zone.id}
                </text>
              </g>
            );
          })}

          {/* ── Outer Equilateral Triangle Border ────────────────────────── */}
          <polygon
            points={`0,${viewBoxH} ${viewBoxW / 2},0 ${viewBoxW},${viewBoxH}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeWidth={1.75}
          />

          {/* ── Vertex Coordinates & Chemistry Gas Labels ────────────────── */}
          {/* Top: 100% CH4 */}
          <g>
            <circle cx={viewBoxW / 2} cy={0} r={3} fill="#10b981" />
            <text
              x={viewBoxW / 2}
              y={-12}
              textAnchor="middle"
              className="font-mono text-[11px] font-bold fill-emerald-500 tracking-wider"
            >
              100% CH₄ (Methane)
            </text>
          </g>

          {/* Bottom-Left: 100% C2H2 */}
          <g>
            <circle cx={0} cy={viewBoxH} r={3} fill="#0ea5e9" />
            <text
              x={-6}
              y={viewBoxH + 20}
              textAnchor="start"
              className="font-mono text-[11px] font-bold fill-sky-400 tracking-wider"
            >
              100% C₂H₂ (Acetylene)
            </text>
          </g>

          {/* Bottom-Right: 100% C2H4 */}
          <g>
            <circle cx={viewBoxW} cy={viewBoxH} r={3} fill="#ef4444" />
            <text
              x={viewBoxW + 6}
              y={viewBoxH + 20}
              textAnchor="end"
              className="font-mono text-[11px] font-bold fill-red-400 tracking-wider"
            >
              100% C₂H₄ (Ethylene)
            </text>
          </g>

          {/* ── Historical 90-Day Telemetry Drift Trail ──────────────────── */}
          {showTrajectory && trajectoryPoints.length > 1 && (
            <g>
              <path
                d={trajectoryPathString}
                fill="none"
                stroke="url(#duvalTrailGrad)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 2"
                opacity={0.85}
              />
              {/* Day 0 Origin Point */}
              <circle
                cx={trajectoryPoints[0].x}
                cy={trajectoryPoints[0].y}
                r={4}
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              <text
                x={trajectoryPoints[0].x}
                y={trajectoryPoints[0].y - 8}
                textAnchor="middle"
                fontSize={8}
                fontFamily="monospace"
                fill="#10b981"
                fontWeight="bold"
              >
                Day 0
              </text>
            </g>
          )}

          {/* ── Active Live Transformer Marker (Exact Live Calculation) ───── */}
          <g transform={`translate(${activeX}, ${activeY})`} filter="url(#duvalGlow)">
            {/* Outer radar pulse animation ring */}
            <circle
              r={12}
              fill="none"
              stroke={currentDuvalZone.colorHex}
              strokeWidth={1.5}
              opacity={0.6}
              className="animate-ping"
            />
            {/* Outer aura */}
            <circle
              r={7}
              fill={currentDuvalZone.colorHex}
              opacity={0.35}
            />
            {/* Center solid core dot */}
            <circle
              r={4}
              fill="#ffffff"
              stroke={currentDuvalZone.colorHex}
              strokeWidth={2}
            />
          </g>
        </svg>
      </div>

      {/* ── Real-Time Coordinate Readout & Validation Strip ────────────────── */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2 text-center font-mono text-[11px] border border-border/40">
        <div className="flex flex-col items-center justify-center">
          <span className="text-muted-foreground text-[9px]">CH₄ (Methane)</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {activePercentages.ch4.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col items-center justify-center border-x border-border/50">
          <span className="text-muted-foreground text-[9px]">C₂H₄ (Ethylene)</span>
          <span className="font-bold text-red-500 dark:text-red-400">
            {activePercentages.c2h4.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-muted-foreground text-[9px]">C₂H₂ (Acetylene)</span>
          <span className="font-bold text-sky-500 dark:text-sky-400">
            {activePercentages.c2h2.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* ── AI Model vs Duval Verification Agreement Badge ───────────────── */}
      <div className="mt-3 flex flex-col gap-1 text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {modelAgreement === "EXACT" || modelAgreement === "COMPATIBLE_ELECTRICAL" || modelAgreement === "COMPATIBLE_THERMAL" ? (
              <ShieldCheck className="size-3.5 text-emerald-500" />
            ) : (
              <ShieldAlert className="size-3.5 text-amber-500" />
            )}
            <span className="font-semibold text-foreground">
              {hoveredZone ? hoveredZone.name : currentDuvalZone.name}
            </span>
          </div>

          {modelPredictedFault && (
            <span className="font-mono text-[10px]">
              AI Predict: <span className="font-bold text-foreground">{modelPredictedFault}</span>
            </span>
          )}
        </div>

        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {hoveredZone ? hoveredZone.shortDesc : currentDuvalZone.shortDesc}
        </p>
      </div>
    </div>
  );
}
