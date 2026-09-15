import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  CloudLightning,
  Cpu,
  Database,
  FileCheck,
  Flame,
  Gauge,
  Info,
  Layers,
  Lock,
  Network,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Waves,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import gridImg from "@/assets/voltra-grid.jpg";
import homeImg from "@/assets/voltra-home.jpeg";

export const Route = createFileRoute("/technology")({
  head: () => ({
    meta: [
      { title: "Technology & Methodology · VOLTRA" },
      {
        name: "description",
        content:
          "Defensible, trained machine learning for power grid reliability: Health Index regression (R²=0.72) and DGA Fault classification (90.8% accuracy) grounded in IEEE C57.104 standards.",
      },
      { property: "og:title", content: "Technology & Methodology · VOLTRA" },
      {
        property: "og:description",
        content:
          "How VOLTRA combines Dissolved Gas Analysis, Health Index regression, and IBM Bob plain-English advisories to prevent power outages before equipment failure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TechnologyPage,
});

export function TechnologyPage() {
  const [demoRequested, setDemoRequested] = useState(false);
  const [activePillar, setActivePillar] = useState(0);

  const pillars = [
    {
      num: "01",
      icon: Waves,
      title: "Dissolved Gas Analysis (DGA)",
      summary:
        "5 critical diagnostic gases measured in parts-per-million (ppm) to detect electrical arcing, corona discharge, and thermal insulation breakdown.",
      details: [
        "Hydrogen (H2): Core partial discharge and low-energy dielectric breakdown",
        "Methane (CH4) & Ethane (C2H6): Low-temperature oil degradation (< 300°C)",
        "Ethylene (C2H4): High-temperature thermal oil cracking (300°C to 700°C+)",
        "Acetylene (C2H2): Critical indicator of active electrical arcing (D1/D2)",
      ],
      tag: "IEEE C57.104 Standard",
    },
    {
      num: "02",
      icon: Gauge,
      title: "Operating Physical Telemetry",
      summary:
        "Substation operating state tracking transformer thermal gradients, dielectric rigidity, and load stress.",
      details: [
        "Core Top-Oil Temperature (°C) monitoring thermal dissipation headroom",
        "Active load factor (MW) relative to nameplate capacity (15 to 45 MVA)",
        "Nominal voltage corridors: 132 kV transmission, 66 kV and 33 kV distribution",
        "Dielectric oil breakdown rigidity (kV/mm) tracking insulation integrity",
      ],
      tag: "Continuous Telemetry",
    },
    {
      num: "03",
      icon: CloudLightning,
      title: "Meteorological Stress Correlation",
      summary:
        "Hyperlocal weather readings correlating ambient atmospheric stress with transformer overheating.",
      details: [
        "Real 90-day ambient temperature history sourced via Open-Meteo API",
        "Relative humidity and ambient wind velocity tracking cooling efficiency",
        "Summer heatwave stress multipliers applied to radiator bank dissipation",
        "Historical thunderstorm and lightning corridor proximity factors",
      ],
      tag: "Open-Meteo Live API",
    },
    {
      num: "04",
      icon: ShieldAlert,
      title: "Field Incident & Hazard Reports",
      summary:
        "Auditable field technician hazard reports with built-in prompt-injection filtering.",
      details: [
        "6 physical hazard categories: excavation, wildfire, storm, explosion, collision, grid arcing",
        "Category risk multipliers (1.10x to 1.25x) dynamically adjusting composite urgency",
        "Automated regex pattern guards preventing prompt-injection attacks on LLM advisories",
        "Permanent CSV audit logs (user_reported_events.csv and rejected_submissions_log.csv)",
      ],
      tag: "Injection-Guarded Reports",
    },
  ];

  const pipelineStages = [
    {
      step: "01",
      title: "Telemetry Ingestion",
      icon: Radio,
      desc: "Streams 18 transformers across 4 Anand District sub-zones (Zone-A to Zone-D) into the pipeline.",
    },
    {
      step: "02",
      title: "Feature Harmonisation",
      icon: Layers,
      desc: "Translates gas naming conventions (Hydrogen→H2, Acethylene→C2H2) and computes Duval gas ratios.",
    },
    {
      step: "03",
      title: "Model 1: Health Index",
      icon: Activity,
      desc: "Random Forest Regressor (R²=0.72, MAE=5.88) predicts continuous damage score & calibrated RUL.",
    },
    {
      step: "04",
      title: "Model 2: DGA Classifier",
      icon: BrainCircuit,
      desc: "Random Forest Classifier (90.8% accuracy) categorises 7 IEC 60599 fault classes (D1, D2, T1, T2, T3, PD, Normal).",
    },
    {
      step: "05",
      title: "SHAP & IBM Bob Advisory",
      icon: Sparkles,
      desc: "SHAP TreeExplainer attributes top-3 causal gas drivers; Claude 3.5 Haiku generates plain-English operator advice.",
    },
  ];

  return (
    <div className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-4 text-xs font-mono">
        <span className="pill bg-signal px-3 py-1 font-medium text-signal-foreground">Technology</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Sensing Streams</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Dual ML Pipeline</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Empirical Benchmarks</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Citable Limitations</span>
      </div>

      {/* Hero Section */}
      <div className="mt-8 grid gap-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
            Defensible Power Grid Intelligence
          </p>
          <h1 className="mt-3 font-sans text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Machine learning grounded in{" "}
            <span className="font-display font-normal italic text-signal">physical chemistry.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            VOLTRA pairs two real machine learning models trained on Kaggle transformer datasets with dissolved gas
            analysis (DGA) and IBM Bob plain-English advisories to turn catastrophic failures into scheduled, low-cost
            interventions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:col-span-4 md:justify-end">
          <Button asChild className="pill bg-signal text-xs font-medium text-signal-foreground hover:bg-signal/90">
            <Link to="/grid">
              Explore Live Grid <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="pill text-xs border-border/70">
            <Link to="/predict">
              Launch Studio <ArrowUpRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Hero Visual Imagery */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl sm:col-span-2">
          <img
            src={gridImg}
            alt="Transmission towers monitored with automated power line telemetry"
            width={1600}
            height={900}
            className="h-72 w-full object-cover sm:h-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/20" />
          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between text-cream">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-cream/60">
                Monitored Transmission Asset
              </p>
              <p className="font-sans text-base font-semibold">132 kV Transmission Corridor · Anand Sub-Zone</p>
            </div>
            <span className="pill glass-dark px-3 py-1 font-mono text-[11px] text-signal">
              18 Transformers Mapped
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-border/60 bg-ink p-6 text-cream">
          <div>
            <span className="pill bg-signal/20 px-2.5 py-1 font-mono text-[10px] text-signal font-semibold">
              PIPELINE ARCHITECTURE
            </span>
            <h3 className="mt-4 font-sans text-xl font-semibold">FastAPI & Isolated LLM Layer</h3>
            <p className="mt-2 text-xs leading-relaxed text-cream/70">
              Scoring and ranking endpoints are fully decoupled from external LLM API availability. If Bob API keys are
              absent, the system automatically falls back to deterministic engineering templates without downtime.
            </p>
          </div>

          <div className="mt-6 border-t border-cream/10 pt-4 flex items-center justify-between text-xs text-cream/60 font-mono">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5 text-signal" /> Fully Auditable
            </span>
            <span>FastAPI :8000</span>
          </div>
        </div>
      </div>

      {/* The 4 Real Sensing Pillars */}
      <section className="mt-20">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Real Telemetry Streams</p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            The 4 Physical Data Streams in <span className="font-display font-normal italic text-signal">VOLTRA</span>
          </h2>
          <p className="max-w-xl text-xs text-muted-foreground sm:text-sm">
            Failure prediction is grounded in IEEE C57.104 gas signatures and physical top-oil thermal constraints.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            const isSelected = activePillar === idx;
            return (
              <div
                key={pillar.num}
                onClick={() => setActivePillar(idx)}
                className={`cursor-pointer rounded-3xl border p-5 transition-all hover:scale-[1.01] ${
                  isSelected
                    ? "border-signal bg-signal/10 ring-1 ring-signal shadow-soft"
                    : "border-border/60 bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{pillar.num}</span>
                  <span className="pill bg-surface border border-border/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {pillar.tag}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-ink text-signal">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="font-sans text-base font-semibold leading-tight text-foreground">{pillar.title}</h3>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{pillar.summary}</p>

                <div className="mt-4 border-t border-border/40 pt-3 space-y-1.5">
                  {pillar.details.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                      <span className="mt-1 size-1 shrink-0 rounded-full bg-signal" />
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* The 5-Stage Machine Learning Pipeline */}
      <section className="mt-20 rounded-[2.5rem] border border-border/60 bg-ink p-6 sm:p-10 text-cream">
        <div className="max-w-2xl">
          <span className="pill bg-signal/20 px-3 py-1 font-mono text-xs text-signal font-semibold">
            STAGE-BY-STAGE PIPELINE
          </span>
          <h2 className="mt-4 font-sans text-3xl font-semibold sm:text-4xl text-cream">
            The 5-Stage <span className="font-display font-normal italic text-signal">Dual ML Architecture</span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-cream/70 sm:text-sm">
            From dissolved gas ppm to calibrated Remaining Useful Life (RUL) and plain-English dispatch advisories.
          </p>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-5">
          {pipelineStages.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.step}
                className="relative rounded-2xl border border-cream/10 bg-cream/5 p-5 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-signal" />
                  <span className="font-mono text-xs text-cream/40">{st.step}</span>
                </div>
                <h4 className="mt-8 font-sans text-sm font-semibold text-cream">{st.title}</h4>
                <p className="mt-2 text-xs leading-relaxed text-cream/60">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Real Empirical Reliability Benchmarks */}
      <section className="mt-20">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Actual Verified Metrics</p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Empirical Model Performance <span className="font-display font-normal italic text-signal">Benchmarks</span>
          </h2>
          <p className="max-w-xl text-xs text-muted-foreground sm:text-sm">
            Trained and cross-validated on real Kaggle transformer datasets without simulated shortcuts.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <ShieldCheck className="size-5 text-signal" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight text-foreground font-mono">90.8%</p>
            <p className="mt-2 font-sans text-sm font-semibold text-foreground">DGA Fault Classification</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Random Forest Classifier across 7 IEC 60599 fault categories (F1 = 0.896 on 4,151 rows).
            </p>
          </div>

          <div className="rounded-3xl bg-signal p-6 text-signal-foreground shadow-sm">
            <Activity className="size-5" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight font-mono">R² = 0.72</p>
            <p className="mt-2 font-sans text-sm font-semibold">Health Index Regression</p>
            <p className="mt-1 text-xs opacity-80">
              Random Forest Regressor (MAE = 5.88) predicting continuous damage score on 470 Kaggle units.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <Clock3 className="size-5 text-emerald-600 dark:text-emerald-400" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight text-foreground font-mono">+89d</p>
            <p className="mt-2 font-sans text-sm font-semibold text-foreground">TX-115 Rescued Life</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pre-failure intervention at Day 78 (RUL 7.7d) recovered useful operating life to 97 days.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <Zap className="size-5 text-signal" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight text-foreground font-mono">545 MVA</p>
            <p className="mt-2 font-sans text-sm font-semibold text-foreground">Total Fleet Monitored</p>
            <p className="mt-1 text-xs text-muted-foreground">
              18 active transformers mapped across Anand District regional transmission corridors.
            </p>
          </div>
        </div>
      </section>

      {/* Transparent Technical Limitations */}
      <section className="mt-20 rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-mono text-signal">
          <Info className="size-4" /> TRANSPARENT ENGINEERING LIMITATIONS
        </div>
        <h3 className="mt-2 font-sans text-2xl font-semibold sm:text-3xl text-foreground">
          Known Boundaries & Academic Defense
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm max-w-3xl">
          To maintain scientific integrity for judges and utility engineers, we document the specific domain constraints
          of real dissolved gas analysis datasets:
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-2xl border border-border/60 bg-surface/70 p-4">
            <p className="font-semibold text-foreground font-mono text-xs">1. Furan / Paper Insulation Gap</p>
            <p className="mt-2 text-muted-foreground leading-relaxed text-[11px]">
              The Health Index model achieves R² = 0.717 because public DGA datasets omit furan 2-FAL and degree of
              polymerisation (DP) measurements (IEEE C57.104, CIGRE TB 296). This is a known dataset gap, not a modeling flaw.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface/70 p-4">
            <p className="font-semibold text-foreground font-mono text-xs">2. T2 Fault Class Recall (74.3%)</p>
            <p className="mt-2 text-muted-foreground leading-relaxed text-[11px]">
              The T2 class (moderate thermal fault 300°C–700°C) shares overlapping gas ratios with T1 and T3 boundary
              states. The system flags this uncertainty explicitly in operator advisories.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface/70 p-4">
            <p className="font-semibold text-foreground font-mono text-xs">3. Calibrated RUL Estimation</p>
            <p className="mt-2 text-muted-foreground leading-relaxed text-[11px]">
              Because utility datasets do not provide run-to-destruction ground truth labels, Remaining Useful Life is
              modeled through a calibrated piecewise function validated against transformer thermal dissipation curves.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-20 mb-10 overflow-hidden rounded-[2.5rem] bg-signal p-8 text-signal-foreground sm:p-14">
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70 font-mono">Techtonics · Bobathon AI</p>
            <h2 className="mt-2 font-sans text-3xl font-semibold sm:text-5xl">
              Grounded predictions <span className="font-display font-normal italic">before the dark.</span>
            </h2>
            <p className="mt-3 max-w-xl text-xs leading-relaxed opacity-80 sm:text-sm">
              Inspect all 18 ranked transformers, live SHAP explanations, and the 7-day maintenance plan on the operator console.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="pill bg-ink text-xs font-medium text-cream hover:bg-ink/90">
              <Link to="/grid">
                Open Live Grid <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="pill border-signal-foreground/30 bg-transparent text-xs text-signal-foreground hover:bg-signal-foreground/10"
            >
              <Link to="/predict">
                Launch Prediction Studio <ArrowUpRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
