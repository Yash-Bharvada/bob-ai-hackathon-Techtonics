import { PieChart, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSelectTx115?: () => void;
  compact?: boolean;
}

export function TX115InterventionBanner({ onSelectTx115, compact = false }: Props) {
  if (compact) {
    return (
      <section className="relative w-full py-2 sm:py-3">
        {/* ── Compact Header for Grid Page ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-medium tracking-[0.16em] text-foreground/80 uppercase shrink-0">
              <span className="size-1.5 rounded-full bg-foreground" />
              GRID RELIABILITY
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug">
              Next-generation grid intelligence keeping power{" "}
              <span className="inline-flex items-center justify-center size-5 rounded-full bg-[#0ea5e9] text-white mx-0.5 align-middle shadow-xs">
                <PieChart className="size-3" />
              </span>{" "}
              <span className="font-extrabold text-foreground">resilient</span> and{" "}
              <span className="inline-flex items-center justify-center size-5 rounded-full bg-[#ccff00] text-black mx-0.5 align-middle shadow-xs">
                <Lightbulb className="size-3 fill-black text-black" />
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
                className="pill h-7 rounded-full border border-border/80 bg-card px-3 text-[11px] font-semibold text-foreground shadow-xs hover:bg-muted"
              >
                Inspect TX-115 <ArrowRight className="ml-1 size-3" />
              </Button>
            </div>
          )}
        </div>

        {/* ── Compact 4-Card Grid ── */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
          {/* Card 1: Floating tags + Sub-Zones 04 */}
          <div className="relative overflow-hidden rounded-xl border border-border/70 bg-[#f1f3f5] dark:bg-[#161a22] p-3 flex flex-col justify-between min-h-[155px] shadow-xs">
            <div className="relative flex flex-wrap gap-1 pt-0.5">
              <span className="rounded-full bg-white dark:bg-[#212631] px-2 py-0.5 text-[9px] font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10 opacity-70">
                DGA Sensors
              </span>
              <span className="rounded-full bg-white dark:bg-[#212631] px-2 py-0.5 text-[9px] font-semibold text-foreground shadow-xs border border-black/5 dark:border-white/10">
                IEEE C57.104
              </span>
              <span className="rounded-full bg-white dark:bg-[#212631] px-2 py-0.5 text-[9px] font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10">
                Dual ML
              </span>
              <span className="rounded-full bg-white dark:bg-[#212631] px-2 py-0.5 text-[9px] font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10">
                IEC 60599
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-medium text-muted-foreground">Sub-Zones</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground font-display">04</p>
            </div>
          </div>

          {/* Card 2: Electric Lime Card (100%) */}
          <div className="rounded-xl bg-[#ccff00] text-black p-3 flex flex-col justify-between min-h-[155px] shadow-xs border border-[#b8f000]">
            <div>
              <p className="text-[10px] font-semibold text-black/75">Zero outage commitment</p>
            </div>
            <div className="my-0.5">
              <p className="text-3xl font-bold tracking-tight text-black font-display">100%</p>
            </div>
            <div>
              <p className="text-[10px] leading-snug text-black/80 font-medium">
                Early warning coverage across Anand nodes.
              </p>
            </div>
          </div>

          {/* Card 3: Macro Dew Leaf (120+) */}
          <div className="relative overflow-hidden rounded-xl p-3 flex flex-col justify-between min-h-[155px] shadow-xs text-white border border-border/60">
            <img
              src="/assets/macro-dew-leaf.jpg"
              alt="Macro green leaf with morning dew"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
            <div className="relative z-10" />
            <div className="relative z-10">
              <p className="text-2xl font-bold tracking-tight text-white font-display mb-0.5">120+</p>
              <p className="text-[10px] leading-snug text-white/90 font-medium">
                Days advance notice on oil degradation.
              </p>
            </div>
          </div>

          {/* Card 4: Telemetry Points (520k+) */}
          <div className="rounded-xl border border-border/70 bg-[#f1f3f5] dark:bg-[#161a22] p-3 flex flex-col justify-between min-h-[155px] shadow-xs">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground">Telemetry Points</p>
            </div>
            <div className="my-0.5">
              <p className="text-2xl font-bold tracking-tight text-foreground font-display">520k+</p>
            </div>
            <div>
              <p className="text-[10px] leading-snug text-muted-foreground font-medium">
                Continuous dissolved gas and load readings.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Grand Editorial Showcase for Homepage
  return (
    <section className="relative w-full py-8 sm:py-14">
      {/* ── Top Header Section (Grand Editorial) ── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8 sm:mb-10">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-medium tracking-[0.18em] text-foreground/80 uppercase mb-3">
            <span className="size-2 rounded-full bg-foreground" />
            GRID RELIABILITY
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-sans font-bold tracking-tight text-foreground leading-[1.12]">
            Next-generation grid intelligence keeping power{" "}
            <span className="inline-flex items-center justify-center size-8 sm:size-10 md:size-12 rounded-full bg-[#0ea5e9] text-white mx-1 align-middle shadow-sm">
              <PieChart className="size-4 sm:size-5 md:size-6" />
            </span>{" "}
            <span className="font-extrabold text-foreground">resilient</span> and{" "}
            <span className="inline-flex items-center justify-center size-8 sm:size-10 md:size-12 rounded-full bg-[#ccff00] text-black mx-1 align-middle shadow-sm">
              <Lightbulb className="size-4 sm:size-5 md:size-6 fill-black text-black" />
            </span>{" "}
            <span className="text-muted-foreground font-normal">fail-safe</span>
          </h2>
        </div>

        {onSelectTx115 && (
          <div className="shrink-0 mb-2">
            <Button
              onClick={onSelectTx115}
              size="default"
              variant="outline"
              className="pill rounded-full border border-border/80 bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
            >
              Inspect TX-115 <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── 4-Card Grid Section (Large, Imposing Cards) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        
        {/* Card 1: Floating tags + Sub-Zones 04 */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[#f1f3f5] dark:bg-[#161a22] p-6 flex flex-col justify-between min-h-[250px] sm:min-h-[280px] shadow-sm transition-transform duration-300 hover:scale-[1.01]">
          {/* Floating Pill Badges */}
          <div className="relative flex flex-wrap gap-2 pt-1">
            <span className="rounded-full bg-white dark:bg-[#212631] px-3 py-1 text-xs font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10 opacity-70">
              DGA Sensors
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-3 py-1 text-xs font-semibold text-foreground shadow-xs border border-black/5 dark:border-white/10">
              IEEE C57.104
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-3 py-1 text-xs font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10">
              Dual ML
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-3 py-1 text-xs font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10">
              IEC 60599
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-3 py-1 text-xs font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10 opacity-80">
              Oil Telemetry
            </span>
            <span className="rounded-full bg-white dark:bg-[#212631] px-3 py-1 text-xs font-medium text-foreground/80 shadow-xs border border-black/5 dark:border-white/10">
              SCADA Live
            </span>
          </div>

          {/* Bottom Sub-Zones Metric */}
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground">Sub-Zones</p>
            <p className="mt-1 text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-display">04</p>
          </div>
        </div>

        {/* Card 2: Electric Neon Lime Card (100%) */}
        <div className="rounded-[2rem] bg-[#ccff00] text-black p-6 flex flex-col justify-between min-h-[250px] sm:min-h-[280px] shadow-sm border border-[#b8f000] transition-transform duration-300 hover:scale-[1.01]">
          <div>
            <p className="text-xs font-semibold text-black/75">Commitment to zero outages</p>
          </div>
          <div className="my-3">
            <p className="text-5xl sm:text-6xl font-bold tracking-tight text-black font-display">100%</p>
          </div>
          <div>
            <p className="text-xs leading-relaxed text-black/85 font-medium">
              Real-time early warning coverage across Anand District distribution nodes.
            </p>
          </div>
        </div>

        {/* Card 3: Photographic Macro Dew Leaf Card (120+) */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 flex flex-col justify-between min-h-[250px] sm:min-h-[280px] shadow-sm text-white border border-border/60 transition-transform duration-300 hover:scale-[1.01]">
          <img
            src="/assets/macro-dew-leaf.jpg"
            alt="Macro green leaf with morning dew"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

          <div className="relative z-10" />

          <div className="relative z-10">
            <p className="text-4xl sm:text-5xl font-bold tracking-tight text-white font-display mb-1.5">120+</p>
            <p className="text-xs leading-relaxed text-white/95 font-medium">
              Days advance notice on accelerated dielectric oil degradation.
            </p>
          </div>
        </div>

        {/* Card 4: Clean Data Points Card (520k+) */}
        <div className="rounded-[2rem] border border-border/70 bg-[#f1f3f5] dark:bg-[#161a22] p-6 flex flex-col justify-between min-h-[250px] sm:min-h-[280px] shadow-sm transition-transform duration-300 hover:scale-[1.01]">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Telemetry Points</p>
          </div>
          <div className="my-3">
            <p className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-display">520k+</p>
          </div>
          <div>
            <p className="text-xs leading-relaxed text-muted-foreground font-medium">
              Continuous dissolved gas, load, and ambient temperature readings.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
