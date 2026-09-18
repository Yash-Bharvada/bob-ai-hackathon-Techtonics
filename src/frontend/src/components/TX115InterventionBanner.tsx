import { PieChart, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSelectTx115?: () => void;
}

export function TX115InterventionBanner({ onSelectTx115 }: Props) {
  return (
    <section className="relative w-full py-2 sm:py-4">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-medium tracking-[0.18em] text-foreground/80 uppercase shrink-0">
            <span className="size-1.5 rounded-full bg-foreground" />
            GRID RELIABILITY
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-snug">
            Next-generation grid intelligence keeping power{" "}
            <span className="inline-flex items-center justify-center size-6 sm:size-7 rounded-full bg-[#0ea5e9] text-white mx-1 align-middle shadow-xs">
              <PieChart className="size-3.5" />
            </span>{" "}
            <span className="font-extrabold text-foreground">resilient</span> and{" "}
            <span className="inline-flex items-center justify-center size-6 sm:size-7 rounded-full bg-[#ccff00] text-black mx-1 align-middle shadow-xs">
              <Lightbulb className="size-3.5 fill-black text-black" />
            </span>{" "}
            <span className="text-muted-foreground font-normal">fail-safe</span>
          </h2>
        </div>

        {onSelectTx115 && (
          <div className="shrink-0">
            <Button
              onClick={onSelectTx115}
              size="sm"
              variant="outline"
              className="pill h-8 rounded-full border border-border/80 bg-card px-3.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
            >
              Inspect TX-115 <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── 4-Card Grid Section ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        
        {/* Card 1: Floating tags + Sub-Zones 04 */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#f1f3f5] dark:bg-[#161a22] p-4 flex flex-col justify-between min-h-[190px] shadow-xs">
          {/* Floating Pill Badges */}
          <div className="relative flex flex-wrap gap-1.5 pt-0.5">
            <span className="rounded-full bg-white dark:bg-[#212631] px-2.5 py-0.5 text-[10px] font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10 opacity-70">
              DGA Sensors
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-2.5 py-0.5 text-[10px] font-semibold text-foreground shadow-xs border border-black/5 dark:border-white/10">
              IEEE C57.104
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-2.5 py-0.5 text-[10px] font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10">
              Dual ML
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-2.5 py-0.5 text-[10px] font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10">
              IEC 60599
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-2.5 py-0.5 text-[10px] font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10 opacity-80">
              Oil Telemetry
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-2.5 py-0.5 text-[10px] font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10">
              SCADA Live
            </span>
          </div>

          {/* Bottom Sub-Zones Metric */}
          <div className="mt-4">
            <p className="text-[11px] font-medium text-muted-foreground">Sub-Zones</p>
            <p className="mt-0.5 text-3xl font-bold tracking-tight text-foreground font-display">04</p>
          </div>
        </div>

        {/* Card 2: Electric Neon Lime Card (100%) */}
        <div className="rounded-2xl bg-[#ccff00] text-black p-4 flex flex-col justify-between min-h-[190px] shadow-xs border border-[#b8f000]">
          <div>
            <p className="text-[11px] font-semibold text-black/75">Commitment to zero outages</p>
          </div>
          <div className="my-1">
            <p className="text-4xl font-bold tracking-tight text-black font-display">100%</p>
          </div>
          <div>
            <p className="text-[11px] leading-snug text-black/80 font-medium">
              Real-time early warning coverage across Anand District distribution nodes.
            </p>
          </div>
        </div>

        {/* Card 3: Photographic Macro Dew Leaf Card (120+) */}
        <div className="relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between min-h-[190px] shadow-xs text-white border border-border/60">
          <img
            src="/assets/macro-dew-leaf.jpg"
            alt="Macro green leaf with morning dew"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

          {/* Space filler at top */}
          <div className="relative z-10" />

          {/* Bottom 120+ and copy */}
          <div className="relative z-10">
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display mb-1">120+</p>
            <p className="text-[11px] leading-snug text-white/90 font-medium">
              Days advance notice on accelerated dielectric oil degradation.
            </p>
          </div>
        </div>

        {/* Card 4: Clean Data Points Card (520k+) */}
        <div className="rounded-2xl border border-border/70 bg-[#f1f3f5] dark:bg-[#161a22] p-4 flex flex-col justify-between min-h-[190px] shadow-xs">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Telemetry Points</p>
          </div>
          <div className="my-1">
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-display">520k+</p>
          </div>
          <div>
            <p className="text-[11px] leading-snug text-muted-foreground font-medium">
              Continuous dissolved gas, load, and ambient temperature readings.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
