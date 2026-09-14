import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  Layers,
  Lock,
  Network,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Waves,
  Zap,
} from "lucide-react";
import gridImg from "@/assets/voltra-grid.jpg";
import homeImg from "@/assets/voltra-home.jpg";

export const Route = createFileRoute("/technology")({
  head: () => ({
    meta: [
      { title: "Technology & Methodology · VOLTRA" },
      { name: "description", content: "The science of outage prevention. High-frequency electrical telemetry, physical asset diagnostics, graph neural networks, and temporal transformers." },
      { property: "og:title", content: "Technology & Methodology · VOLTRA" },
      { property: "og:description", content: "How VOLTRA translates raw electromagnetic waveforms and SCADA telemetry into actionable outage forecasts before physical damage occurs." },
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
      title: "Synchronized Electrical Telemetry",
      summary: "High-frequency phasor measurement units (PMUs) capturing electrical dynamics at sub-cycle granularity.",
      details: [
        "Phasor Measurement Units (PMU) synchronized at 50/60 Hz with GPS timestamps",
        "Sub-cycle transient voltage sag and spike detection (< 20 ms response)",
        "Phase angle divergence tracking between interconnected substations",
        "Total Harmonic Distortion (THD) 3rd, 5th, and 7th order harmonics decomposition",
      ],
      tag: "50k samples / sec",
    },
    {
      num: "02",
      icon: Gauge,
      title: "Physical Asset Diagnostics",
      summary: "Non-invasive thermal, acoustic, and chemical sensors monitoring mechanical and chemical degradation.",
      details: [
        "Continuous Dissolved Gas Analysis (DGA) tracking Hydrogen (H2) and Acetylene (C2H2)",
        "Fiber-optic core and winding temperature sensors monitoring thermal hot-spots",
        "Acoustic partial discharge telemetry identifying microscopic insulator fissures",
        "SF6 gas pressure telemetry and tank seal leakage rate analytics",
      ],
      tag: "Substation IoT",
    },
    {
      num: "03",
      icon: CloudLightning,
      title: "Hyperlocal Meteorological Feeds",
      summary: "Micro-climate atmospheric models predicting environmental mechanical strain on overhead lines.",
      details: [
        "Overhead conductor line thermal dissipation and ambient ambient wind shear models",
        "High-velocity wind gust monitoring detecting transmission line galloping",
        "Real-time lightning strike proximity feeds within a 25 km corridor buffer",
        "Rime icing and ambient humidity condensation risk calculators",
      ],
      tag: "Weather radar integration",
    },
    {
      num: "04",
      icon: Database,
      title: "Historical Grid Failure Archive",
      summary: "15+ years of cascading blackout post-mortems, maintenance logs, and component wear curves.",
      details: [
        "Indexed library of over 14,000 utility fault signatures and cascaded outages",
        "Component-specific Weibull reliability degradation curves parameterized by age",
        "Maintenance history, breaker trip records, and transformer tap-changer cycles",
        "Cross-utility failure correlation models across similar transmission topologies",
      ],
      tag: "14k+ fault signatures",
    },
  ];

  const pipelineStages = [
    {
      step: "01",
      title: "Edge Ingestion",
      icon: Cpu,
      desc: "50,000 samples/sec filtered at substation edge gateways to strip sensor jitter and noise.",
    },
    {
      step: "02",
      title: "Feature Extraction",
      icon: Waves,
      desc: "Continuous Wavelet Transforms (CWT) and FFT isolate high-frequency electromagnetic transients.",
    },
    {
      step: "03",
      title: "GNN Topology Modeling",
      icon: Network,
      desc: "Graph Neural Networks model transmission topology to forecast cascading load transfers across feeders.",
    },
    {
      step: "04",
      title: "Temporal Transformers",
      icon: BrainCircuit,
      desc: "Multi-horizon self-attention models project failure probabilities from 15 minutes to 48 hours.",
    },
    {
      step: "05",
      title: "Explainable AI (XAI)",
      icon: Sparkles,
      desc: "SHAP-based physical factor attribution gives dispatchers the exact causal drivers of elevated risk.",
    },
  ];

  return (
    <div className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6">
      {/* Top Navigation Pill Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-4 text-xs">
        <span className="pill bg-signal px-3 py-1 font-medium text-signal-foreground">Technology</span>
        <span className="pill border border-border/70 px-3 py-1 text-muted-foreground">Sensing Pillars</span>
        <span className="pill border border-border/70 px-3 py-1 text-muted-foreground">ML Pipeline</span>
        <span className="pill border border-border/70 px-3 py-1 text-muted-foreground">Benchmarks</span>
        <span className="pill border border-border/70 px-3 py-1 text-muted-foreground">NERC CIP Compliance</span>
      </div>

      {/* Hero Section */}
      <div className="mt-8 grid gap-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The science of prevention</p>
          <h1 className="mt-3 font-sans text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
            Power systems shouldn't fail <span className="font-display font-normal italic text-signal">in the dark.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            VOLTRA synthesizes high-frequency electromagnetic telemetry, physical transformer acoustics, and hyperlocal atmospheric models into a unified predictive neural representation of the power grid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:col-span-4 md:justify-end">
          <Button asChild className="pill bg-signal text-xs font-medium text-signal-foreground hover:bg-signal/90">
            <Link to="/grid">Explore Live Grid <ArrowRight className="size-3.5" /></Link>
          </Button>
          <Button asChild variant="outline" className="pill text-xs border-border/70">
            <Link to="/predict">Launch Studio <ArrowUpRight className="size-3.5" /></Link>
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
              <p className="text-[10px] uppercase font-mono tracking-wider text-cream/60">Monitored Transmission Asset</p>
              <p className="font-sans text-base font-semibold">132 kV High-Voltage Corridor S04</p>
            </div>
            <span className="pill glass-dark px-3 py-1 font-mono text-[11px] text-signal">
              Phasor Sampling: 100 ms
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-border/60 bg-ink p-6 text-cream">
          <div>
            <span className="pill bg-signal/20 px-2.5 py-1 font-mono text-[10px] text-signal">
              ENTERPRISE DEPLOYMENT
            </span>
            <h3 className="mt-4 font-sans text-xl font-semibold">Air-Gapped SCADA Architecture</h3>
            <p className="mt-2 text-xs leading-relaxed text-cream/70">
              Deployable directly within utility substation perimeters on ruggedized IEC 61850 compliant edge hardware with zero external internet dependencies.
            </p>
          </div>

          <div className="mt-6 border-t border-cream/10 pt-4 flex items-center justify-between text-xs text-cream/60">
            <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-signal" /> NERC CIP Native</span>
            <span className="font-mono text-[10px]">ISO 27001</span>
          </div>
        </div>
      </div>

      {/* The 4 Pillars of Grid Sensing */}
      <section className="mt-20">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Multi-Modal Inputs</p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl">
            The 4 Pillars of <span className="font-display font-normal italic text-signal">Grid Sensing</span>
          </h2>
          <p className="max-w-xl text-xs text-muted-foreground sm:text-sm">
            Failure prediction is impossible with SCADA polling alone. VOLTRA fuses four discrete data planes to detect abnormal physics before protective relays trip.
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
                  <h3 className="font-sans text-base font-semibold leading-tight">{pillar.title}</h3>
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
          <span className="pill bg-signal/20 px-3 py-1 font-mono text-xs text-signal">
            NEURAL ARCHITECTURE
          </span>
          <h2 className="mt-4 font-sans text-3xl font-semibold sm:text-4xl text-cream">
            The 5-Stage <span className="font-display font-normal italic text-signal">Intelligence Pipeline</span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-cream/70 sm:text-sm">
            From raw sub-millisecond electromagnetic waveforms to explainable dispatch decisions for utility control room operators.
          </p>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-5">
          {pipelineStages.map((st, i) => {
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

      {/* Empirical Reliability Benchmarks */}
      <section className="mt-20">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Proven Impact</p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl">
            Empirical Reliability <span className="font-display font-normal italic text-signal">Benchmarks</span>
          </h2>
          <p className="max-w-xl text-xs text-muted-foreground sm:text-sm">
            Field-tested across regional transmission organizations, distribution system operators, and industrial generation facilities.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <ShieldCheck className="size-5 text-signal" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight text-foreground">99.98%</p>
            <p className="mt-2 font-sans text-sm font-semibold">Forecast Accuracy</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across high-voltage transmission corridors and substation step-down transformers.
            </p>
          </div>

          <div className="rounded-3xl bg-signal p-6 text-signal-foreground">
            <CloudLightning className="size-5" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight">−38%</p>
            <p className="mt-2 font-sans text-sm font-semibold">Unplanned Outages</p>
            <p className="mt-1 text-xs opacity-75">
              Advance warnings turn emergency blackouts into scheduled preventive maintenance.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <Clock3 className="size-5 text-warning" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight text-foreground">2.5h</p>
            <p className="mt-2 font-sans text-sm font-semibold">Average Advance Window</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sufficient time for operators to reroute power flows, shed load, or dispatch crews.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <Zap className="size-5 text-signal" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight text-foreground">14.2 GW</p>
            <p className="mt-2 font-sans text-sm font-semibold">Capacity Monitored</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Continuous real-time telemetry ingestion across North American and European pilot grids.
            </p>
          </div>
        </div>
      </section>

      {/* Utility Security & Standards */}
      <section className="mt-20 rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
        <div className="grid gap-8 md:grid-cols-3 md:items-center">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-xs font-mono text-signal">
              <FileCheck className="size-4" /> UTILITY COMPLIANCE & STANDARDS
            </div>
            <h3 className="mt-2 font-sans text-2xl font-semibold sm:text-3xl">
              Architected for Mission-Critical Utility Infrastructure
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              VOLTRA adheres to the strictest global regulatory frameworks for electrical transmission security. Fully compatible with legacy SCADA, DNP3, and modern IEC 61850 substation bus architectures.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="pill bg-surface border border-border/70 px-3 py-1 font-mono">NERC CIP-002 through CIP-014</span>
              <span className="pill bg-surface border border-border/70 px-3 py-1 font-mono">IEC 61850-9-2 Sampled Values</span>
              <span className="pill bg-surface border border-border/70 px-3 py-1 font-mono">IEEE C37.118 Synchrophasor</span>
              <span className="pill bg-surface border border-border/70 px-3 py-1 font-mono">Air-gapped on-prem appliances</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-surface/60 p-5 border border-border/50 text-xs">
            <p className="font-semibold text-foreground">Have compliance requirements?</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Our power systems engineering team provides custom security whitepapers, threat-model documentation, and substation deployment blueprints.
            </p>
            <Button
              onClick={() => {
                setDemoRequested(true);
                toast.success("Compliance whitepaper & architecture blueprint requested");
              }}
              className="pill mt-2 bg-ink text-xs text-cream hover:bg-ink/90"
            >
              {demoRequested ? <><Check className="size-3.5" /> Blueprint Requested</> : <>Request Architecture Blueprint</>}
            </Button>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-20 mb-10 overflow-hidden rounded-[2.5rem] bg-signal p-8 text-signal-foreground sm:p-14">
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Grid operator transition</p>
            <h2 className="mt-2 font-sans text-3xl font-semibold sm:text-5xl">
              Protect your grid <span className="font-display font-normal italic">before the dark.</span>
            </h2>
            <p className="mt-3 max-w-xl text-xs leading-relaxed opacity-80 sm:text-sm">
              Schedule an executive briefing or run live simulations on your regional transmission corridors.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="pill bg-ink text-xs font-medium text-cream hover:bg-ink/90">
              <Link to="/grid">Open Live Grid <ArrowRight className="size-3.5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="pill border-signal-foreground/30 bg-transparent text-xs text-signal-foreground hover:bg-signal-foreground/10">
              <Link to="/predict">Launch Prediction Studio <ArrowUpRight className="size-3.5" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
