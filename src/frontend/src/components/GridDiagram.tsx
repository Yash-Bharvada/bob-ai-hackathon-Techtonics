import { useState, useEffect } from "react";
import { AlertTriangle, Radio, Zap, ShieldCheck } from "lucide-react";
import { techtonicsApi } from "@/lib/techtonicsApi";

export type GridNode = {
  id: string;
  label: string;
  substation: string;
  status: "stable" | "watch" | "risk";
  x: number; // SVG viewBox coordinates (0 - 1000)
  y: number; // SVG viewBox coordinates (0 - 500)
};

export const anandDistrictGridNodes: GridNode[] = [
  { id: "TX-101", label: "Civil Hospital Node", substation: "Anand Urban Core", status: "stable", x: 140, y: 220 },
  { id: "TX-104", label: "Central 132kV Transmission", substation: "Anand Central", status: "watch", x: 330, y: 340 },
  { id: "TX-107", label: "GIDC Heavy Industry", substation: "Phase-2 Substation", status: "risk", x: 520, y: 160 },
  { id: "TX-112", label: "Borsad Feeder Node", substation: "Borsad Industrial", status: "risk", x: 710, y: 340 },
  { id: "TX-115", label: "South Bulk (Recovered)", substation: "Anand South Bulk", status: "watch", x: 880, y: 200 },
];

export function GridDiagram({
  nodes = anandDistrictGridNodes,
  selected,
  onSelect,
  compact = false,
}: {
  nodes?: GridNode[];
  selected?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
}) {
  const [liveNodes, setLiveNodes] = useState<GridNode[]>(nodes);

  useEffect(() => {
    let active = true;
    techtonicsApi.getRanked().then((res) => {
      if (active && res.ranked_assets?.length) {
        const rankedMap = new Map(res.ranked_assets.map((r) => [r.asset_id, r]));
        setLiveNodes((prev) =>
          prev.map((node) => {
            const live = rankedMap.get(node.id);
            if (!live) return node;
            const status: "risk" | "watch" | "stable" =
              live.risk_tier === "CRITICAL" || live.risk_tier === "HIGH"
                ? "risk"
                : live.risk_tier === "MEDIUM"
                ? "watch"
                : "stable";
            return { ...node, status };
          })
        );
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm ${
        compact ? "h-64" : "h-[360px] md:h-[440px]"
      }`}
    >
      {/* Background blueprint subtle dots */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-muted-foreground)_0.8px,transparent_0.8px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      {/* SVG Canvas for Transmission Lines & Flow Pulses */}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full"
      >
        <defs>
          <linearGradient id="lineGradStable" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="lineGradRisk" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="lineGradRecover" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Transmission Line 1: TX-101 to TX-104 */}
        <path
          d="M 140 220 C 200 290, 260 340, 330 340"
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="3"
        />
        <path
          d="M 140 220 C 200 290, 260 340, 330 340"
          fill="none"
          stroke="url(#lineGradStable)"
          strokeWidth="2"
          strokeDasharray="6 8"
          className="animate-[dash_20s_linear_infinite]"
        />

        {/* Transmission Line 2: TX-104 to TX-107 */}
        <path
          d="M 330 340 C 400 340, 440 180, 520 160"
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="3"
        />
        <path
          d="M 330 340 C 400 340, 440 180, 520 160"
          fill="none"
          stroke="url(#lineGradRisk)"
          strokeWidth="2.5"
          strokeDasharray="6 6"
        />

        {/* Transmission Line 3: TX-107 to TX-112 */}
        <path
          d="M 520 160 C 580 160, 640 320, 710 340"
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="3"
        />
        <path
          d="M 520 160 C 580 160, 640 320, 710 340"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeDasharray="8 6"
        />

        {/* Transmission Line 4: TX-112 to TX-115 */}
        <path
          d="M 710 340 C 780 340, 820 220, 880 200"
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="3"
        />
        <path
          d="M 710 340 C 780 340, 820 220, 880 200"
          fill="none"
          stroke="url(#lineGradRecover)"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
      </svg>

      {/* Interactive Substation Node Pins */}
      {liveNodes.map((node) => {
        const isSelected = selected === node.id;
        const leftPercent = (node.x / 1000) * 100;
        const topPercent = (node.y / 500) * 100;

        return (
          <button
            key={node.id}
            type="button"
            aria-label={`${node.label}: ${node.status}`}
            onClick={() => onSelect?.(node.id)}
            className={`group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-all duration-200 z-10 ${
              isSelected ? "scale-110" : "hover:scale-105"
            }`}
            style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
          >
            {/* Core Circular Badge */}
            <div
              className={`relative grid size-11 place-items-center rounded-2xl border shadow-sm transition-all ${
                node.status === "risk"
                  ? "border-red-500/50 bg-red-500/15 text-red-600 dark:text-red-400"
                  : node.status === "watch"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              } ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            >
              {node.status === "risk" ? (
                <AlertTriangle className="size-5" />
              ) : node.status === "watch" ? (
                <Radio className="size-5" />
              ) : (
                <Zap className="size-5" />
              )}
            </div>

            {/* Label Card */}
            <div className="mt-2 text-center pointer-events-none rounded-xl bg-card/90 px-2.5 py-1 border border-border/70 shadow-sm backdrop-blur">
              <p className="text-xs font-bold leading-none text-foreground">{node.label}</p>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                {node.id} · {node.substation}
              </p>
            </div>
          </button>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto flex flex-wrap items-center gap-3 rounded-full border border-border/80 bg-card/95 px-4 py-2 text-[11px] font-mono shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="size-2 rounded-full bg-emerald-500" />
          Stable (NF)
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
          <span className="size-2 rounded-full bg-amber-500" />
          Watch (T1/T2)
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400">
          <span className="size-2 rounded-full bg-red-500" />
          Critical Risk (D1/D2)
        </span>
      </div>
    </div>
  );
}