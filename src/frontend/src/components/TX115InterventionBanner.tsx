import { Wrench, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSelectTx115?: () => void;
}

export function TX115InterventionBanner({ onSelectTx115 }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-signal/40 bg-surface/90 p-5 shadow-glass backdrop-blur sm:p-6">
      {/* Background ambient gradient */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-signal/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-accent-blue/15 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left narrative & badge */}
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill inline-flex items-center gap-1.5 bg-signal/20 px-3 py-1 text-xs font-semibold text-signal-foreground border border-signal/40">
              <CheckCircle2 className="size-3.5 text-signal" />
              KEY DEMO · INTERVENTION SUCCESS
            </span>
            <span className="pill inline-flex items-center gap-1 bg-ink text-cream px-2.5 py-0.5 text-[11px] font-mono">
              TX-115 · 100 MVA Bulk
            </span>
            <span className="text-xs text-muted-foreground">
              +89 Days Remaining Life Recovered
            </span>
          </div>

          <h3 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl text-foreground">
            TX-115: Imminent Outage Prevented by Predictive Maintenance
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            At Day 78, TX-115 reached a critical health index of <strong className="text-danger">71.3</strong> with remaining useful life collapsing to <strong className="text-danger">7.7 days</strong>. A timely cooling fan motor replacement and 20% load curtailment halted the thermal cascade — returning RUL to <strong className="text-signal">97 days</strong>. VOLTRA explicitly tracks and communicates this recovery, distinguishing stabilized assets from active hazards.
          </p>
        </div>

        {/* Action Button */}
        {onSelectTx115 && (
          <div className="shrink-0">
            <Button
              onClick={onSelectTx115}
              className="pill h-11 bg-signal px-5 font-semibold text-signal-foreground shadow-glow hover:bg-signal/90"
            >
              Inspect TX-115 Telemetry <ArrowRight className="ml-1 size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 4-Step Trajectory Timeline */}
      <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Step 1 */}
        <div className="rounded-2xl border border-border/60 bg-background/60 p-3.5 backdrop-blur">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Day 65</span>
            <span className="size-2 rounded-full bg-signal" />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-foreground">Degradation Onset</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-foreground">HI 13.7</span>
            <span className="text-[10px] text-muted-foreground">Pristine baseline</span>
          </div>
        </div>

        {/* Step 2 - Peak */}
        <div className="rounded-2xl border border-danger/40 bg-danger/10 p-3.5 backdrop-blur">
          <div className="flex items-center justify-between text-[11px] font-mono text-danger font-semibold">
            <span>Day 78 · PEAK</span>
            <AlertTriangle className="size-3.5 text-danger" />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-danger">Imminent Failure Alarm</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-danger">HI 71.3</span>
            <span className="font-mono text-xs font-bold text-danger">RUL 7.7d</span>
          </div>
        </div>

        {/* Step 3 - Maintenance */}
        <div className="rounded-2xl border border-accent-blue/40 bg-accent-blue/10 p-3.5 backdrop-blur">
          <div className="flex items-center justify-between text-[11px] font-mono text-accent-blue font-semibold">
            <span>Day 78–79</span>
            <Wrench className="size-3.5 text-accent-blue" />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-foreground">Targeted Intervention</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Fan repair + 20% load shed
          </p>
        </div>

        {/* Step 4 - Recovery */}
        <div className="rounded-2xl border border-signal/40 bg-signal/15 p-3.5 backdrop-blur">
          <div className="flex items-center justify-between text-[11px] font-mono text-signal-foreground font-semibold">
            <span>Day 89 · CURRENT</span>
            <ShieldCheck className="size-3.5 text-signal" />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-foreground">Stabilized & Monitored</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-signal">HI 36.1</span>
            <span className="font-mono text-xs font-bold text-signal font-semibold">RUL 97d (+89d)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
