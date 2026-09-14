import { AlertTriangle, Radio, Zap, ShieldCheck } from "lucide-react";

export type GridNode = {
  id: string;
  label: string;
  substation: string;
  status: "stable" | "watch" | "risk";
  x: number;
  y: number;
};

export const anandDistrictGridNodes: GridNode[] = [
  { id: "TX-101", label: "Civil Hospital Node", substation: "Anand Urban Core", status: "stable", x: 10, y: 36 },
  { id: "TX-104", label: "Central 132kV Node", substation: "Anand Central Transmission", status: "watch", x: 28, y: 64 },
  { id: "TX-107", label: "GIDC Industrial Phase-2", substation: "GIDC Heavy Industry", status: "risk", x: 48, y: 30 },
  { id: "TX-112", label: "Borsad Feeder Node", substation: "Borsad Industrial", status: "risk", x: 68, y: 66 },
  { id: "TX-115", label: "South Bulk Node (Recovered)", substation: "Anand South Bulk", status: "watch", x: 88, y: 34 },
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
  return (
    <div className={`grid-map relative overflow-hidden ${compact ? "h-64" : "h-[360px] md:h-[440px]"}`}>
      {/* Dynamic Power Line Interconnects */}
      <div className="absolute left-[10%] top-[36%] h-px w-[20%] power-line rotate-[12deg]" />
      <div className="absolute left-[28%] top-[64%] h-px w-[22%] power-line -rotate-[14deg]" />
      <div className="absolute left-[48%] top-[30%] h-px w-[22%] power-line rotate-[14deg]" />
      <div className="absolute left-[68%] top-[66%] h-px w-[22%] power-line -rotate-[14deg]" />

      {nodes.map((node) => {
        const isSelected = selected === node.id;
        return (
          <button
            key={node.id}
            type="button"
            aria-label={`${node.label}: ${node.status}`}
            onClick={() => onSelect?.(node.id)}
            className={`grid-node absolute -translate-x-1/2 -translate-y-1/2 text-left ${isSelected ? "is-selected" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span className={`node-core node-${node.status}`}>
              {node.status === "risk" ? (
                <AlertTriangle className="size-3.5" />
              ) : node.status === "watch" ? (
                <Radio className="size-3.5" />
              ) : (
                <Zap className="size-3.5" />
              )}
            </span>
            <span className="mt-2 hidden whitespace-nowrap text-[11px] font-semibold text-foreground sm:block">
              {node.label}
            </span>
            <span className="hidden text-[9px] uppercase font-mono text-muted-foreground sm:block">
              {node.id} · {node.substation}
            </span>
          </button>
        );
      })}

      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-3 text-[10px] uppercase font-mono text-muted-foreground bg-surface/70 px-3 py-1.5 rounded-full backdrop-blur border border-border/40">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-signal" />
          Stable (NF)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-warning" />
          Watch / Stabilized (T1/T2)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-danger" />
          Critical Risk (D1/D2/T3)
        </span>
      </div>
    </div>
  );
}