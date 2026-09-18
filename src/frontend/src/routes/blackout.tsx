import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { techtonicsApi, type RankedAsset } from "@/lib/techtonicsApi";
import { BlackoutImpactWidget } from "@/components/BlackoutImpactWidget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Zap,
  Home,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  Building2,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/blackout")({
  head: () => ({
    meta: [
      { title: "VOLTRA — Blackout Defense & Consumer Impact Command Center" },
      {
        name: "description",
        content:
          "Real-time grid blackout risk prediction, household outage estimation, and contractor-authorized emergency warning SMS dispatcher.",
      },
    ],
  }),
  component: BlackoutDefensePage,
});

function BlackoutDefensePage() {
  const [rankedAssets, setRankedAssets] = useState<RankedAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("TX-107");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    techtonicsApi
      .getRanked()
      .then((res) => {
        if (res.ranked_assets?.length) {
          setRankedAssets(res.ranked_assets);
          // Set initial selected asset to highest risk asset if available
          const critical = res.ranked_assets.find(
            (a) => a.risk_tier === "CRITICAL" || a.risk_tier === "HIGH"
          );
          if (critical) {
            setSelectedAssetId(critical.asset_id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedAsset = rankedAssets.find((a) => a.asset_id === selectedAssetId);

  // Compute fleet totals from live backend data
  const criticalCount = rankedAssets.filter(
    (a) => a.risk_tier === "CRITICAL" || a.risk_tier === "HIGH"
  ).length;
  const totalMonitored = rankedAssets.length || 18;
  const totalProtectedHouseholds = totalMonitored * 6580; // Estimated district coverage

  return (
    <div className="min-h-screen bg-background text-foreground pt-6 pb-20 font-sans">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
        
        {/* ── Page Hero Header ── */}
        <div className="rounded-3xl border border-border/80 dark:border-white/[0.1] bg-card dark:bg-[#0c0d12] p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Zap className="size-48 text-emerald-500" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-[#d2f831] border border-emerald-500/30 font-mono text-xs font-bold px-3 py-1">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse mr-1.5 inline-block" />
                  BLACKOUT DEFENSE SHIELD · ACTIVE
                </Badge>
                <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-border">
                  Anand District Command
                </Badge>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground dark:text-white font-display">
                Blackout Prevention & Impact Control
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground dark:text-neutral-300 leading-relaxed">
                Translate ML transformer telemetry into real-world citizen impact. Predict outage windows, calculate affected households per feeder, and dispatch authorized warning SMS to consumers before the lights go out.
              </p>
            </div>

            {/* Top Stat Pills */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="rounded-2xl border border-border/70 dark:border-white/[0.08] bg-muted/40 dark:bg-white/[0.03] p-4 text-center">
                <div className="text-2xl sm:text-3xl font-black font-mono text-foreground dark:text-white">
                  {totalMonitored}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                  Transformers Monitored
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 dark:border-white/[0.08] bg-muted/40 dark:bg-white/[0.03] p-4 text-center">
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 dark:text-[#d2f831]">
                  {(totalProtectedHouseholds / 1000).toFixed(0)}k+
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                  Protected Households
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Substation Fleet Grid Selector ── */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-lg font-bold text-foreground dark:text-white flex items-center gap-2">
                <Layers className="size-4 text-emerald-700 dark:text-[#d2f831]" />
                Select Anand District Transformer
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Click any asset to compute live backend blackout risk and consumer impact
              </p>
            </div>

            {criticalCount > 0 && (
              <Badge className="bg-red-500/10 text-red-500 border border-red-500/30 font-mono text-xs font-bold px-2.5 py-1">
                <AlertTriangle className="size-3.5 mr-1" />
                {criticalCount} Critical Outage Risks Flagged
              </Badge>
            )}
          </div>

          {/* Grid of 18 Anand Transformers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {rankedAssets.map((asset) => {
              const isSelected = asset.asset_id === selectedAssetId;
              const isCritical = asset.risk_tier === "CRITICAL" || asset.risk_tier === "HIGH";
              const isWatch = asset.risk_tier === "MEDIUM";

              return (
                <button
                  key={asset.asset_id}
                  onClick={() => setSelectedAssetId(asset.asset_id)}
                  type="button"
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30 dark:border-[#d2f831] dark:bg-[#d2f831]/10"
                      : "border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-xs font-extrabold text-foreground dark:text-white">
                      {asset.asset_id}
                    </span>
                    <span
                      className={`size-2 rounded-full ${
                        isCritical
                          ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"
                          : isWatch
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                  </div>

                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                    {asset.substation_name || "Anand Substation"}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">HI:</span>
                    <span
                      className={`font-bold ${
                        isCritical
                          ? "text-red-500"
                          : isWatch
                          ? "text-amber-500"
                          : "text-emerald-700 dark:text-[#d2f831]"
                      }`}
                    >
                      {asset.health_index.toFixed(1)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Active Asset Blackout Impact Engine Card ── */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h3 className="text-lg font-bold text-foreground dark:text-white flex items-center gap-2">
              <ShieldAlert className="size-5 text-emerald-700 dark:text-[#d2f831]" />
              Live Blackout Calculation for {selectedAssetId}
            </h3>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-border text-xs font-mono dark:border-white/[0.12]"
            >
              <Link to="/grid" className="inline-flex items-center gap-1.5">
                <span>View Full Telemetry on Live Grid</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {/* Embedded Backend-Calculated Blackout Widget */}
          <BlackoutImpactWidget
            assetId={selectedAssetId}
            substationName={selectedAsset?.substation_name}
          />
        </div>

        {/* ── Blackout Mitigation Action Guidance ── */}
        <div className="rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] p-6 space-y-4">
          <h4 className="text-base font-bold text-foreground dark:text-white flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-700 dark:text-[#d2f831]" />
            Recommended Grid Protocol for Blackout Mitigation
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl border border-border/60 dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02] space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-[#d2f831] uppercase">
                1. Load Balancing
              </span>
              <p className="text-foreground dark:text-neutral-200 font-sans leading-relaxed">
                Reroute 20–30% of active MVA capacity to adjacent transmission corridors (e.g. Anand Central line) to relieve thermal stress.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border/60 dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02] space-y-1.5">
              <span className="text-[10px] font-bold text-amber-500 uppercase">
                2. Contractor Advisory
              </span>
              <p className="text-foreground dark:text-neutral-200 font-sans leading-relaxed">
                Ensure Contractor Permit toggle is active, allowing automated emergency SMS warnings to reach affected residential feeders 2h prior.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border/60 dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02] space-y-1.5">
              <span className="text-[10px] font-bold text-blue-500 uppercase">
                3. Field Crew Dispatch
              </span>
              <p className="text-foreground dark:text-neutral-200 font-sans leading-relaxed">
                Dispatch regional maintenance crew to inspect radiator fans, verify oil breakdown voltage, and perform relay resets before ETR expiry.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
