import { Wrench, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSelectTx115?: () => void;
}

export function TX115InterventionBanner({ onSelectTx115 }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-all sm:p-8">
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left narrative & badge */}
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="pill inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              KEY DEMO · INTERVENTION SUCCESS
            </span>
            <span className="pill inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] font-mono font-semibold text-background">
              TX-115 · 100 MVA Bulk
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              +89 Days Remaining Life Recovered
            </span>
          </div>

          <h3 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            TX-115: Imminent Outage Prevented by Predictive Maintenance
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            At Day 78, TX-115 reached a critical health index of <strong className="text-red-600 dark:text-red-400 font-semibold">71.3</strong> with remaining useful life collapsing to <strong className="text-red-600 dark:text-red-400 font-semibold">7.7 days</strong>. A timely cooling fan motor replacement and 20% load curtailment halted the thermal cascade — returning RUL to <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">97 days</strong>. VOLTRA explicitly distinguishes stabilized assets from active hazards.
          </p>
        </div>

        {/* Action Button */}
        {onSelectTx115 && (
          <div className="shrink-0">
            <Button
              onClick={onSelectTx115}
              className="pill h-11 rounded-full bg-primary px-6 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
            >
              Inspect TX-115 Telemetry <ArrowRight className="ml-1 size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 4-Step Trajectory Timeline */}
      <div className="relative mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {/* Step 1 */}
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 transition-colors">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Day 65</span>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-1.5 text-xs font-bold text-foreground">Degradation Onset</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-foreground">HI 13.7</span>
            <span className="text-[10px] text-muted-foreground">Pristine baseline</span>
          </div>
        </div>

        {/* Step 2 - Peak */}
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 transition-colors">
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-red-600 dark:text-red-400">
            <span>Day 78 · PEAK</span>
            <AlertTriangle className="size-3.5" />
          </div>
          <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">Imminent Failure Alarm</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-red-600 dark:text-red-400">HI 71.3</span>
            <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">RUL 7.7d</span>
          </div>
        </div>

        {/* Step 3 - Maintenance */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 transition-colors">
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">
            <span>Day 78–79</span>
            <Wrench className="size-3.5" />
          </div>
          <p className="mt-1.5 text-xs font-bold text-foreground">Targeted Intervention</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Fan repair + 20% load shed
          </p>
        </div>

        {/* Step 4 - Recovery */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 transition-colors">
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Day 89 · CURRENT</span>
            <ShieldCheck className="size-3.5" />
          </div>
          <p className="mt-1.5 text-xs font-bold text-foreground">Stabilized & Monitored</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">HI 36.1</span>
            <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">RUL 97d (+89d)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
