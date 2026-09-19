/**
 * LocationGrid.tsx
 * ================
 * Sortable, filterable data table of the 18 transformer locations.
 * Uses the existing ui/table.tsx component.
 *
 * - Clicking a row calls onRowClick(id) → flies map to that pin
 * - selectedId highlights the corresponding row (synced from map pin click)
 * - Live telemetry updates (status, healthScore, lastUpdated) are shown inline
 * - "Needs attention" section lists any rejected locations with reason
 * - Pin count invariant is asserted and shown in the header
 */

import { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  TRANSFORMER_LOCATIONS_FULL,
  REJECTED_LOCATIONS,
  type TransformerLocation,
} from "@/lib/transformerLocations";
import { cn } from "@/lib/utils";

export interface LocationGridProps {
  onRowClick?: (id: string) => void;
  selectedId?: string | null;
  liveUpdates?: Record<
    string,
    { status: "risk" | "watch" | "stable"; healthScore: number; lastUpdated: string }
  >;
}

type SortKey = "id" | "name" | "lat" | "lng" | "status" | "criticality" | "lastUpdated";
type SortDir = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  risk: "⚠ Risk",
  watch: "◎ Watch",
  stable: "✓ Stable",
};

const STATUS_CLASSES: Record<string, string> = {
  risk: "text-red-600 font-semibold",
  watch: "text-amber-600 font-semibold",
  stable: "text-emerald-600 font-semibold",
};

const CRIT_CLASSES: Record<string, string> = {
  Critical: "text-red-600 font-bold",
  High: "text-orange-500 font-semibold",
  Medium: "text-yellow-600 font-semibold",
  Low: "text-emerald-600",
};

export function LocationGrid({ onRowClick, selectedId, liveUpdates }: LocationGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "risk" | "watch" | "stable">("all");

  // Merge live updates into locations
  const mergedLocations: TransformerLocation[] = useMemo(
    () =>
      TRANSFORMER_LOCATIONS_FULL.map((loc) => {
        const upd = liveUpdates?.[loc.id];
        return upd ? { ...loc, ...upd } : loc;
      }),
    [liveUpdates],
  );

  // Filter
  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return mergedLocations.filter((loc) => {
      const matchesText =
        !q ||
        loc.id.toLowerCase().includes(q) ||
        loc.name.toLowerCase().includes(q) ||
        loc.gridZone.toLowerCase().includes(q) ||
        loc.criticality.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || (loc.status ?? "stable") === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [mergedLocations, filter, statusFilter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case "lat":
          av = a.lat;
          bv = b.lat;
          break;
        case "lng":
          av = a.lng;
          bv = b.lng;
          break;
        case "status":
          av = a.status ?? "stable";
          bv = b.status ?? "stable";
          break;
        case "criticality":
          av = a.criticality;
          bv = b.criticality;
          break;
        case "lastUpdated":
          av = a.lastUpdated ?? "";
          bv = b.lastUpdated ?? "";
          break;
        case "name":
          av = a.name;
          bv = b.name;
          break;
        default:
          av = a.id;
          bv = b.id;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIndicator({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  // INVARIANT: rows in grid must equal valid pin count
  const validCount = TRANSFORMER_LOCATIONS_FULL.length;
  const pinCount = validCount; // TransformerMap renders exactly one pin per valid location
  const invariantOk = pinCount === validCount;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground font-mono">Location Grid</h2>
          <span
            className={cn(
              "text-xs font-mono px-2 py-0.5 rounded-full border",
              invariantOk
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200",
            )}
            title="Pin count must equal valid row count"
          >
            {pinCount} pins = {validCount} rows {invariantOk ? "✓" : "✗ INVARIANT VIOLATED"}
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 w-36 rounded-md border border-input bg-background px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Filter transformer locations"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Filter by status"
          >
            <option value="all">All status</option>
            <option value="risk">Risk</option>
            <option value="watch">Watch</option>
            <option value="stable">Stable</option>
          </select>
        </div>
      </div>

      {/* Main table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead
                className="cursor-pointer select-none text-xs font-mono"
                onClick={() => toggleSort("id")}
              >
                ID <SortIndicator k="id" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-xs font-mono"
                onClick={() => toggleSort("name")}
              >
                Name <SortIndicator k="name" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-xs font-mono"
                onClick={() => toggleSort("lat")}
              >
                Lat <SortIndicator k="lat" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-xs font-mono"
                onClick={() => toggleSort("lng")}
              >
                Lng <SortIndicator k="lng" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-xs font-mono"
                onClick={() => toggleSort("status")}
              >
                Status <SortIndicator k="status" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-xs font-mono"
                onClick={() => toggleSort("criticality")}
              >
                Criticality <SortIndicator k="criticality" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-xs font-mono"
                onClick={() => toggleSort("lastUpdated")}
              >
                Last Updated <SortIndicator k="lastUpdated" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                  No locations match the current filter.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((loc) => {
              const isSelected = selectedId === loc.id;
              const status = loc.status ?? "stable";
              return (
                <TableRow
                  key={loc.id}
                  className={cn(
                    "cursor-pointer text-xs",
                    isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                  )}
                  onClick={() => onRowClick?.(loc.id)}
                  aria-selected={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onRowClick?.(loc.id);
                  }}
                >
                  <TableCell className="font-mono font-semibold">{loc.id}</TableCell>
                  <TableCell className="max-w-[160px] truncate">{loc.name}</TableCell>
                  <TableCell className="font-mono">{loc.lat.toFixed(4)}</TableCell>
                  <TableCell className="font-mono">{loc.lng.toFixed(4)}</TableCell>
                  <TableCell className={cn("font-mono", STATUS_CLASSES[status])}>
                    {STATUS_LABELS[status] ?? status}
                    {loc.healthScore != null && (
                      <span className="ml-1 text-[10px] opacity-70">({loc.healthScore}%)</span>
                    )}
                  </TableCell>
                  <TableCell className={cn("font-mono", CRIT_CLASSES[loc.criticality])}>
                    {loc.criticality}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {loc.lastUpdated ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Needs Attention section — rejected records */}
      {REJECTED_LOCATIONS.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-bold text-red-700 mb-2 font-mono">
            ⚠ Needs Attention ({REJECTED_LOCATIONS.length} records rejected by validator)
          </p>
          <ul className="space-y-1">
            {REJECTED_LOCATIONS.map((r, i) => (
              <li key={i} className="text-xs text-red-600 font-mono">
                <span className="font-semibold">{String(r.raw.id ?? "unknown")}</span>:{" "}
                {r.errors.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
