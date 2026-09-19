/**
 * SmallGridMap.tsx
 * ================
 * Compact, interactive GIS topology map for Anand District sub-transmission grid.
 * Replaces the static SVG diagram in both the dashboard overview (Image 1)
 * and the Grid Topology tab (Image 2).
 *
 * Features:
 * - Real MapLibre GL map powered by CARTO Dark/Light raster tiles
 * - Geolocates all 18 Anand District substations with live risk coloring
 * - Seamlessly synchronizes with selected substation across tabs
 * - Link to full-screen Substation Map explorer (/map)
 * - Sleek dark glassmorphism aesthetic matching the VOLTRA design system
 */

import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Layers, Zap } from "lucide-react";
import { TransformerMap } from "@/components/TransformerMap";
import { TRANSFORMER_LOCATIONS_FULL } from "@/lib/transformerLocations";
import { cn } from "@/lib/utils";

export interface SmallGridMapProps {
  /** Selected transformer ID (e.g. "TX-107") */
  selected?: string | null;
  /** Callback when user clicks or selects a substation node */
  onSelect?: (id: string) => void;
  /** Live telemetry overrides keyed by transformer ID */
  liveUpdates?: Record<
    string,
    { status: "risk" | "watch" | "stable"; healthScore: number; lastUpdated: string }
  >;
  /** Optional custom title override */
  title?: string;
  /** Optional custom subtitle override */
  subtitle?: string;
  className?: string;
  /** Fixed height or minimum height (default: 460px) */
  minHeight?: string;
}

export function SmallGridMap({
  selected,
  onSelect,
  liveUpdates,
  title = "Anand District Regional Sub-Transmission",
  subtitle = "LIVE · 18 SUBSTATIONS MAPPED",
  className,
  minHeight = "460px",
}: SmallGridMapProps) {
  const [internalSelected, setInternalSelected] = useState<string | null>(selected || null);

  const activeSelectedId = selected !== undefined ? selected : internalSelected;

  const handlePinClick = (id: string) => {
    setInternalSelected(id);
    onSelect?.(id);
  };

  const selectedLocation = useMemo(() => {
    if (!activeSelectedId) return null;
    return TRANSFORMER_LOCATIONS_FULL.find((loc) => loc.id === activeSelectedId);
  }, [activeSelectedId]);

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c0d0f] shadow-2xl overflow-hidden flex flex-col justify-between p-3.5 sm:p-5 select-none",
        className
      )}
      style={{ minHeight }}
    >
      {/* Background ambient gradient glow */}
      <div className="pointer-events-none absolute left-[50%] top-[30%] -translate-x-1/2 -translate-y-1/2 size-80 rounded-full bg-rose-500/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute left-[15%] top-[50%] -translate-x-1/2 -translate-y-1/2 size-72 rounded-full bg-emerald-500/[0.04] blur-3xl" />

      {/* Header Bar */}
      <div className="relative z-20 flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-white">
              {title}
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 font-semibold">
              <Zap className="size-2.5" />
              GIS TILES
            </span>
          </div>
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-0.5">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-mono font-semibold text-emerald-400 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden xs:inline">SYNCHRONIZED</span>
            <span className="xs:hidden">LIVE</span>
          </div>

          <Link
            to="/map"
            className="flex items-center gap-1 text-[10px] font-mono text-neutral-300 hover:text-white px-2 py-1 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            title="Open full interactive map explorer"
          >
            <span>Full Map</span>
            <ExternalLink className="size-2.5" />
          </Link>
        </div>
      </div>

      {/* Map Body */}
      <div className="relative flex-1 w-full my-3 rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.08] bg-[#090a0c] shadow-inner min-h-[300px]">
        <TransformerMap
          compact
          selectedId={activeSelectedId}
          onPinClick={handlePinClick}
          liveUpdates={liveUpdates}
          className="w-full h-full"
          style={{ width: "100%", height: "100%", minHeight: "100%" }}
        />

        {/* Floating selected substation pill when active */}
        {selectedLocation && (
          <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-[#121418]/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono text-white shadow-lg">
            <span
              className={cn(
                "size-2 rounded-full",
                selectedLocation.criticality === "Critical"
                  ? "bg-rose-500 animate-pulse"
                  : selectedLocation.criticality === "High"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              )}
            />
            <span className="font-bold">{selectedLocation.id}</span>
            <span className="text-neutral-400 truncate max-w-[140px] sm:max-w-[200px]">
              {selectedLocation.name}
            </span>
          </div>
        )}
      </div>

      {/* Footer Legend Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.08] text-[10px] font-mono text-neutral-400">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Stable (NF)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span>Watch (T1/T2)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Critical Risk (D1/D2)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-neutral-400">
          <Layers className="size-3 text-neutral-400" />
          <span>132kV / 66kV Inter-Substation Trace</span>
        </div>
      </div>
    </div>
  );
}
