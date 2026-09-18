import { useState, useEffect } from "react";
import { AlertTriangle, Radio, Zap } from "lucide-react";
import { techtonicsApi } from "@/lib/techtonicsApi";

export type GridNode = {
  id: string;
  label: string;
  substation: string;
  status: "stable" | "watch" | "risk";
  x: number; // SVG viewBox coordinates (0 - 1000)
  y: number; // SVG viewBox coordinates (0 - 500)
  hi?: number;
  rul?: number;
  icon: "zap" | "radio" | "alert";
  labelPosition: "top" | "bottom";
};

export const anandDistrictGridNodes: GridNode[] = [
  {
    id: "TX-101",
    label: "Civil Hospital Node",
    substation: "ANAND URBAN CORE",
    status: "stable",
    x: 140,
    y: 240,
    hi: 17.8,
    rul: 180,
    icon: "zap",
    labelPosition: "bottom",
  },
  {
    id: "TX-104",
    label: "Central 132kV Transmission",
    substation: "ANAND CENTRAL",
    status: "watch",
    x: 320,
    y: 350,
    hi: 39.4,
    rul: 68,
    icon: "radio",
    labelPosition: "bottom",
  },
  {
    id: "TX-107",
    label: "GIDC Heavy Industry",
    substation: "PHASE-2 SUBSTATION",
    status: "risk",
    x: 510,
    y: 155,
    hi: 56.4,
    rul: 33,
    icon: "alert",
    labelPosition: "top",
  },
  {
    id: "TX-112",
    label: "Borsad Feeder Node",
    substation: "BORSAD INDUSTRIAL",
    status: "risk",
    x: 700,
    y: 350,
    hi: 53.3,
    rul: 39,
    icon: "alert",
    labelPosition: "bottom",
  },
  {
    id: "TX-115",
    label: "South Bulk (Recovered)",
    substation: "ANAND SOUTH BULK",
    status: "watch",
    x: 870,
    y: 215,
    hi: 38.6,
    rul: 44,
    icon: "radio",
    labelPosition: "top",
  },
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    techtonicsApi
      .getRanked()
      .then((res) => {
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
              return {
                ...node,
                status,
                hi: live.health_index != null ? Math.round(live.health_index * 10) / 10 : node.hi,
                rul: live.RUL_days != null ? Math.round(live.RUL_days * 10) / 10 : node.rul,
                icon: status === "risk" ? "alert" : status === "watch" ? "radio" : "zap",
              };
            })
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0c0d10] shadow-2xl ${
        compact ? "h-64" : "h-full min-h-[380px] sm:min-h-[420px]"
      }`}
    >
      {/* Subtle Dot Matrix Radar Grid (matching reference media_1789717214233) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient Depth Glows */}
      <div className="pointer-events-none absolute left-[51%] top-[30%] -translate-x-1/2 -translate-y-1/2 size-80 rounded-full bg-rose-500/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute left-[15%] top-[45%] -translate-x-1/2 -translate-y-1/2 size-72 rounded-full bg-emerald-500/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute right-[15%] top-[40%] -translate-x-1/2 -translate-y-1/2 size-72 rounded-full bg-amber-500/[0.06] blur-3xl" />

      {/* Clean Header Bar */}
      <div className="absolute top-5 left-6 right-6 z-20 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-white">
            Anand District Regional Sub-Transmission
          </h3>
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-0.5">
            LIVE · 5 NODES MAPPED
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-[10px] font-mono font-semibold text-emerald-400 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>SYNCHRONIZED</span>
        </div>
      </div>

      {/* SVG Canvas for Transmission Line Traces */}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full pointer-events-none"
      >
        <defs>
          <linearGradient id="trace1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="trace2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id="trace3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id="trace4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Trace 1: TX-101 to TX-104 (Stable to Watch) */}
        <path
          d="M 140 240 C 210 320, 250 350, 320 350"
          fill="none"
          stroke="url(#trace1)"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          strokeOpacity="0.85"
        />

        {/* Trace 2: TX-104 to TX-107 (Watch to Critical) */}
        <path
          d="M 320 350 C 390 350, 440 165, 510 155"
          fill="none"
          stroke="url(#trace2)"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          strokeOpacity="0.85"
        />

        {/* Trace 3: TX-107 to TX-112 (Critical Segment) */}
        <path
          d="M 510 155 C 580 155, 630 350, 700 350"
          fill="none"
          stroke="url(#trace3)"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          strokeOpacity="0.9"
        />

        {/* Trace 4: TX-112 to TX-115 (Critical to Watch) */}
        <path
          d="M 700 350 C 770 350, 810 225, 870 215"
          fill="none"
          stroke="url(#trace4)"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          strokeOpacity="0.85"
        />
      </svg>

      {/* HTML Interactive Node Pods with Squircles and Badges */}
      <div className="absolute inset-0 size-full pointer-events-auto">
        {liveNodes.map((node) => {
          const isSelected = selected === node.id;
          const isHovered = hoveredNode === node.id;
          const isRisk = node.status === "risk";
          const isWatch = node.status === "watch";

          const squircleStyle = isRisk
            ? "border-rose-500/50 bg-rose-500/15 text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.35)]"
            : isWatch
            ? "border-amber-500/50 bg-amber-500/15 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            : "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]";

          const leftPercent = (node.x / 1000) * 100;
          const topPercent = (node.y / 500) * 100;

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <button
                type="button"
                aria-label={`${node.id}: ${node.label} (${node.status})`}
                onClick={() => onSelect?.(node.id)}
                className={`group relative flex flex-col items-center cursor-pointer outline-hidden transition-all duration-300 ${
                  node.labelPosition === "top" ? "flex-col-reverse" : "flex-col"
                }`}
              >
                {/* Rounded Squircle Button (Exact match to media_1789717214233) */}
                <div
                  className={`relative flex size-11 sm:size-12 items-center justify-center rounded-2xl border transition-all duration-300 ${squircleStyle} ${
                    isSelected
                      ? "scale-115 ring-2 ring-white ring-offset-2 ring-offset-black"
                      : "group-hover:scale-110"
                  }`}
                >
                  {isRisk && (
                    <span className="pointer-events-none absolute -inset-2 rounded-2xl bg-rose-500/25 animate-ping" />
                  )}
                  {node.icon === "zap" ? (
                    <Zap className="size-5 stroke-[2]" />
                  ) : node.icon === "radio" ? (
                    <Radio className="size-5 stroke-[2]" />
                  ) : (
                    <AlertTriangle className="size-5 stroke-[2]" />
                  )}
                </div>

                {/* Rounded Dark Node Card */}
                <div
                  className={`transition-all duration-200 pointer-events-none ${
                    node.labelPosition === "top" ? "mb-2.5" : "mt-2.5"
                  }`}
                >
                  <div className="rounded-xl border border-white/[0.09] bg-[#141519]/90 px-3 py-1.5 shadow-xl backdrop-blur-md text-center transition-all duration-200 group-hover:border-white/25">
                    <p className="text-xs font-semibold text-white tracking-tight whitespace-nowrap">
                      {node.label}
                    </p>
                    <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                      {node.id} · {node.substation}
                    </p>
                  </div>
                </div>

                {/* Telemetry Tooltip on Hover or Select */}
                {(isHovered || isSelected) && (
                  <div
                    className={`absolute z-30 flex items-center gap-2 rounded-lg border border-white/15 bg-neutral-900/95 px-3 py-1.5 text-[10px] font-mono shadow-2xl backdrop-blur-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 ${
                      node.labelPosition === "top" ? "top-full mt-2" : "bottom-full mb-2"
                    }`}
                  >
                    <span className="text-neutral-400">
                      HI:{" "}
                      <strong
                        className={
                          isRisk ? "text-rose-400" : isWatch ? "text-amber-400" : "text-emerald-400"
                        }
                      >
                        {node.hi ?? 30}
                      </strong>
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-neutral-400">
                      RUL: <strong className="text-white">{node.rul ?? 90}d</strong>
                    </span>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Minimalist Bottom Legend (Exact match to media_1789717214233) */}
      <div className="absolute bottom-4 left-6 flex items-center gap-5 text-xs font-mono text-neutral-400 z-20">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-neutral-300 font-sans text-xs">Stable (NF)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          <span className="text-neutral-300 font-sans text-xs">Watch (T1/T2)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
          <span className="text-neutral-300 font-sans text-xs">Critical Risk (D1/D2)</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-6 text-[11px] font-mono text-neutral-500 uppercase tracking-wider hidden sm:block z-20">
        132kV INTER-SUBSTATION TRACE
      </div>
    </div>
  );
}