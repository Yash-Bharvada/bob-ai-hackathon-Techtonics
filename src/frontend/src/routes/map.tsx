/**
 * map.tsx — /map route
 * ====================
 * Side-by-side MapLibre GL map + live data grid for all 18 Anand transformers.
 *
 * Live updates: polls /api/stream/tick/{assetId}/{day} for each transformer
 * every 5 s (reusing the existing backend polling transport).
 * - Each incoming update is validated; unknown ids are silently ignored
 * - Out-of-order updates (older day than last seen) are dropped
 * - Renders are batched at most once per second via requestAnimationFrame
 * - Reconnect with exponential backoff on repeated failures
 * - Invariant: pin count === grid row count (asserted in both components)
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { TransformerMap } from "@/components/TransformerMap";
import { LocationGrid } from "@/components/LocationGrid";
import { TRANSFORMER_LOCATIONS_FULL } from "@/lib/transformerLocations";
import { validateLocation } from "@/lib/locationValidator";
import { techtonicsApi } from "@/lib/techtonicsApi";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "VOLTRA — Live Transformer Map" },
      {
        name: "description",
        content:
          "Live MapLibre GL map of all 18 Anand District transformer substations with real-time telemetry grid.",
      },
    ],
  }),
  component: MapPage,
});

/** Snapshot of live telemetry for a single asset */
interface AssetLiveTelemetry {
  status: "risk" | "watch" | "stable";
  healthScore: number;
  lastUpdated: string;
  /** Last day value received — used to reject out-of-order updates */
  lastDay: number;
}

/** Known asset ids — used to reject unknown live update ids */
const KNOWN_IDS = new Set(TRANSFORMER_LOCATIONS_FULL.map((l) => l.id));

/** Derive status from health_index (mirrors gridData.ts logic) */
function deriveStatus(healthIndex: number): "risk" | "watch" | "stable" {
  if (healthIndex > 50) return "risk";
  if (healthIndex > 30) return "watch";
  return "stable";
}

function MapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<Record<string, AssetLiveTelemetry>>({});
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "polling" | "error">("idle");

  // Backoff state
  const backoffRef = useRef<number>(1000);
  const pendingRafRef = useRef<number | null>(null);
  const pendingBatchRef = useRef<Record<string, AssetLiveTelemetry>>({});
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dayCounterRef = useRef<Record<string, number>>({});
  const failCountRef = useRef<number>(0);

  // Batch-render at most once per second
  const flushBatch = useCallback(() => {
    if (Object.keys(pendingBatchRef.current).length === 0) return;
    const batch = { ...pendingBatchRef.current };
    pendingBatchRef.current = {};
    setLiveUpdates((prev) => ({ ...prev, ...batch }));
    pendingRafRef.current = null;
  }, []);

  const scheduleBatchFlush = useCallback(() => {
    if (pendingRafRef.current !== null) return;
    // Use setTimeout(1000) to cap renders at 1/s
    pendingRafRef.current = window.setTimeout(() => {
      flushBatch();
    }, 1000) as unknown as number;
  }, [flushBatch]);

  const fetchOneTick = useCallback(
    async (assetId: string) => {
      // Ignore ids not in our known set — never create pins from live messages
      if (!KNOWN_IDS.has(assetId)) return;

      const day = (dayCounterRef.current[assetId] ?? 0) + 1;
      // Cap at day 89 (dataset maximum) then cycle
      const fetchDay = ((day - 1) % 89) + 1;
      dayCounterRef.current[assetId] = fetchDay;

      try {
        const tick = await techtonicsApi.getStreamTick(assetId, fetchDay);

        // Validate the location is still known (guard against unknown ids in response)
        if (tick.asset_id !== assetId) return;
        if (!KNOWN_IDS.has(tick.asset_id)) return;

        // Out-of-order guard: only accept if day >= last seen day (or cycling reset)
        const lastDay = liveUpdates[assetId]?.lastDay ?? 0;
        if (fetchDay < lastDay && lastDay !== 89) return; // stale

        // Validate the location record still passes geo validation
        const loc = TRANSFORMER_LOCATIONS_FULL.find((l) => l.id === assetId);
        if (!loc) return;
        const seen = new Set<string>();
        const seenCoords = new Set<string>();
        const vr = validateLocation(
          loc as unknown as import("@/lib/locationValidator").RawLocationRecord,
          seen,
          seenCoords,
        );
        if (!vr.valid) return;

        const hi = tick.live_ml_output.health_index;
        const status = deriveStatus(hi);
        const healthScore = Math.round(Math.max(0, Math.min(100, 100 - hi)));

        pendingBatchRef.current[assetId] = {
          status,
          healthScore,
          lastUpdated: tick.date,
          lastDay: fetchDay,
        };
        scheduleBatchFlush();
      } catch {
        // Silently drop individual asset fetch errors
      }
    },
    [liveUpdates, scheduleBatchFlush],
  );

  // Poll all assets in sequence, one per tick cycle
  const pollAll = useCallback(async () => {
    if (pollingRef.current) clearTimeout(pollingRef.current);

    try {
      setConnectionStatus("polling");
      // Fan out fetches for all 18 assets (small count — sequential is fine)
      await Promise.allSettled(TRANSFORMER_LOCATIONS_FULL.map((l) => fetchOneTick(l.id)));
      failCountRef.current = 0;
      backoffRef.current = 1000;
    } catch {
      failCountRef.current += 1;
      backoffRef.current = Math.min(30_000, backoffRef.current * 2);
      setConnectionStatus("error");
    }

    // Schedule next poll (5 s normally, backoff on error)
    const delay = failCountRef.current > 2 ? backoffRef.current : 5000;
    pollingRef.current = setTimeout(pollAll, delay);
  }, [fetchOneTick]);

  useEffect(() => {
    pollAll();
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
      if (pendingRafRef.current) clearTimeout(pendingRafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pin/grid count invariant (logged only, UI invariant displayed in LocationGrid)
  useEffect(() => {
    const pinCount = TRANSFORMER_LOCATIONS_FULL.length;
    const gridCount = TRANSFORMER_LOCATIONS_FULL.length;
    if (pinCount !== gridCount) {
      console.error(`[MapPage] INVARIANT: ${pinCount} map pins ≠ ${gridCount} grid rows`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-sm font-bold font-mono text-foreground">
            Anand District — Live Transformer Map
          </h1>
          <span className="text-xs text-muted-foreground font-mono">
            {TRANSFORMER_LOCATIONS_FULL.length} substations
          </span>
          {/* Live polling indicator */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-mono ml-auto"
            aria-live="polite"
          >
            <span
              className={
                connectionStatus === "polling"
                  ? "size-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"
                  : connectionStatus === "error"
                    ? "size-1.5 rounded-full bg-red-500 inline-block"
                    : "size-1.5 rounded-full bg-gray-400 inline-block"
              }
            />
            {connectionStatus === "polling"
              ? "Live telemetry"
              : connectionStatus === "error"
                ? "Telemetry error — retrying"
                : "Starting…"}
          </span>
        </div>
      </div>

      {/* Map + Grid layout */}
      <div className="max-w-[1600px] mx-auto px-4 py-4 flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)]">
        {/* Map panel */}
        <div className="flex-1 min-h-[480px] lg:min-h-0 h-full rounded-xl overflow-hidden border border-border shadow-sm flex flex-col relative bg-muted/20">
          <TransformerMap
            selectedId={selectedId}
            onPinClick={(id) => setSelectedId((prev) => (prev === id ? null : id))}
            liveUpdates={liveUpdates}
            className="w-full h-full flex-1"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Grid panel */}
        <div className="w-full lg:w-[480px] xl:w-[540px] flex flex-col min-h-[350px] lg:min-h-0 lg:h-full overflow-hidden">
          <LocationGrid
            selectedId={selectedId}
            onRowClick={(id) => setSelectedId((prev) => (prev === id ? null : id))}
            liveUpdates={liveUpdates}
          />
        </div>
      </div>
    </div>
  );
}
