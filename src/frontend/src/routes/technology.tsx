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
  const [activePillar, setActivePillar] = useState(0);
  const [activeModel, setActiveModel] = useState(0);

  const pillars = [
    {
      num: "01",
      icon: Waves,
      title: "Dissolved Gas Analysis (DGA)",
      summary:
        "5 critical diagnostic gases measured in parts-per-million (ppm) to detect electrical arcing, corona discharge, and thermal insulation breakdown.",
      details: [
        "Hydrogen (H₂): Core partial discharge and low-energy dielectric breakdown indicator",
        "Methane (CH₄) & Ethane (C₂H₆): Low-temperature oil degradation (< 300°C)",
        "Ethylene (C₂H₄): High-temperature thermal oil cracking (300°C to 700°C+)",
        "Acetylene (C₂H₂): Critical indicator of active electrical arcing (D1/D2 fault classes)",
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
        "Active load factor (MW) relative to nameplate capacity (15 to 100 MVA)",
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
        "Category risk multipliers (1.10× to 1.25×) dynamically adjusting composite urgency",
        "Automated regex pattern guards preventing prompt-injection attacks on LLM advisories",
        "Permanent CSV audit logs (user_reported_events.csv and rejected_submissions_log.csv)",
      ],
      tag: "Injection-Guarded Reports",
    },
  ];

  const models = [
    {
      num: "01",
      label: "Model 1 — Health Index Regressor",
      icon: Activity,
      color: "text-emerald-400",
      accent: "bg-emerald-500",
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/[0.05]",
      ring: "ring-emerald-500",
      badge: "R² = 0.72",
      badgeBg: "bg-emerald-500/15 text-emerald-400",
      title: "Random Forest Regressor · Health Index Damage Score",
      metrics: [
        { label: "R² Score", value: "0.717", note: "explained variance on hold-out set" },
        { label: "MAE", value: "5.88", note: "mean absolute error in HI units" },
        { label: "Training Set", value: "470 rows", note: "real Kaggle transformer units" },
        { label: "Test Split", value: "20%", note: "stratified by fault class" },
        { label: "Estimators", value: "100 trees", note: "Random Forest depth-unlimited" },
        { label: "Features Used", value: "14", note: "DGA gases + physical telemetry" },
      ],
      description:
        "Predicts a continuous Health Index (HI) damage score from 13.4 (pristine) to ~90 (near-failure). The HI is then fed through a calibrated piecewise function to produce Remaining Useful Life (RUL) in days — a human-interpretable urgency signal used to schedule maintenance windows.",
      outputs: [
        "Health Index Score (continuous float, 13.4 – 90+)",
        "Remaining Useful Life in days (calibrated piecewise from HI)",
        "SHAP top-3 feature attribution (via TreeExplainer)",
        "Risk tier assignment: LOW / MEDIUM / HIGH / CRITICAL",
      ],
      topFeatures: [
        { name: "Acetylene (C₂H₂)", pct: 92 },
        { name: "Methane (CH₄)", pct: 81 },
        { name: "Hydrogen (H₂)", pct: 74 },
        { name: "Dielectric Rigidity", pct: 61 },
        { name: "Ethylene (C₂H₄)", pct: 54 },
      ],
    },
    {
      num: "02",
      label: "Model 2 — DGA Fault Classifier",
      icon: BrainCircuit,
      color: "text-signal",
      accent: "bg-primary",
      border: "border-primary/30",
      bg: "bg-primary/[0.05]",
      ring: "ring-primary",
      badge: "90.8% Acc",
      badgeBg: "bg-primary/15 text-primary",
      title: "Random Forest Classifier · IEC 60599 Fault Taxonomy",
      metrics: [
        { label: "Accuracy", value: "90.8%", note: "on held-out test set" },
        { label: "F1 Score", value: "0.896", note: "macro-averaged across 7 classes" },
        { label: "Training Set", value: "4,151 rows", note: "real Kaggle DGA measurements" },
        { label: "Classes", value: "7 fault types", note: "D1, D2, T1, T2, T3, PD, Normal" },
        { label: "Estimators", value: "200 trees", note: "Random Forest with max_depth=20" },
        { label: "T2 Recall", value: "74.3%", note: "documented boundary overlap issue" },
      ],
      description:
        "Classifies transformer faults into 7 IEC 60599 / Duval Triangle categories. The classification probability vector is normalized to sum-to-1 fractions and surfaced in the operator UI as a fault confidence breakdown. The dominant class is presented alongside the top-3 SHAP gas drivers that caused the classification.",
      outputs: [
        "Predicted fault class: D1 (low-energy arcing), D2 (high-energy arcing), T1/T2/T3 (thermal faults by temp range), PD (partial discharge), Normal",
        "Per-class probability vector (normalized to 0–1 fractions)",
        "Dominant fault confidence score",
        "IEC 60599 Duval Triangle positioning",
      ],
      topFeatures: [
        { name: "Ethylene / Methane Ratio", pct: 88 },
        { name: "Acetylene (C₂H₂)", pct: 84 },
        { name: "Hydrogen (H₂)", pct: 77 },
        { name: "CO / CO₂ Ratio", pct: 65 },
        { name: "Ethane (C₂H₆)", pct: 49 },
      ],
    },
  ];

  const pipelineStages = [
    {
      step: "01",
      title: "Telemetry Ingestion",
      icon: Radio,
      desc: "18 transformers across 4 Anand District sub-zones (Zone-A to Zone-D). 90-day CSV timeseries with per-day DGA gas ppm readings, oil temperature, and load factor.",
    },
    {
      step: "02",
      title: "Feature Harmonisation",
      icon: Layers,
      desc: "Translates gas naming conventions (Hydrogen→H₂, Acethylene→C₂H₂), computes Duval Triangle gas ratios (C₂H₂/C₂H₄, CH₄/H₂, C₂H₄/C₂H₆), and normalises physical telemetry.",
    },
    {
      step: "03",
      title: "Model 1: Health Index",
      icon: Activity,
      desc: "Random Forest Regressor (R²=0.72, MAE=5.88) predicts continuous damage score (13.4–90+). SHAP TreeExplainer attributes top-3 causal gas drivers. Calibrated piecewise function converts HI → RUL days.",
    },
    {
      step: "04",
      title: "Model 2: DGA Classifier",
      icon: BrainCircuit,
      desc: "Random Forest Classifier (90.8% accuracy) categorises 7 IEC 60599 fault classes. Output is a normalized probability vector (sums to 1.0) — raw vote counts are never exposed to the UI.",
    },
    {
      step: "05",
      title: "Grid Impact Ranker",
      icon: Zap,
      desc: "5-factor composite score: Health Index (35%), RUL (25%), fault severity (20%), MVA rating (10%), incident history (10%). Assets ranked highest-risk-first for dispatch prioritisation.",
    },
    {
      step: "06",
      title: "SHAP Attribution",
      icon: Sparkles,
      desc: "SHAP TreeExplainer runs on both models to surface top-3 physical gas features responsible for each score. Operators see 'Methane thermal concentration (CH₄)' not 'Feature #4 = 0.72'.",
    },
    {
      step: "07",
      title: "AI Advisory Layer",
      icon: Network,
      desc: "IBM Bob (Claude 3.5 Haiku) generates grounded plain-English maintenance directives. Falls back to deterministic engineering templates if the API key is absent — scoring never breaks.",
    },
  ];

  const aiIntegrations = [
    {
      icon: "⚡",
      name: "IBM Bob",
      sub: "Claude 3.5 Haiku via Anthropic",
      desc: "Primary AI advisory engine. Given SHAP attribution + fault class + RUL, Bob generates structured plain-English operator directives: what to do, why, and in what time window. Grounded in the scored data — never hallucinated.",
      tags: ["Asset Advisory", "Maintenance Narrative", "SHAP Explanation"],
      source: "ibm_bob_llm",
    },
    {
      icon: "🔬",
      name: "Groq LPU Reports",
      sub: "Llama-3.3-70B-Versatile via Groq API",
      desc: "Ultra-fast structured reports for the Grid Inspector panel. Groq's LPU inference produces thermal analysis, weather correlation, trajectory forecast, and 3 prioritised recommended actions in under 2 seconds.",
      tags: ["Thermal Analysis", "Trajectory Forecast", "Live Grid Inspector"],
      source: "groq_llm",
    },
    {
      icon: "🌍",
      name: "Gemini 3.6 Flash",
      sub: "Google Gemini via REST API",
      desc: "Geospatial area hazard search. Given a zone name and text query, Gemini performs semantic retrieval across the community incident log, computes a dynamic risk multiplier, and returns an affected-asset map with cascading risk assessment.",
      tags: ["Geospatial Search", "Risk Multiplier", "Community Events"],
      source: "gemini_llm",
    },
    {
      icon: "🌤",
      name: "Open-Meteo",
      sub: "Free weather API — no key required",
      desc: "Real-time ambient temperature, humidity, and wind speed for the operator's GPS-detected or manual coordinates. Thermal stress index computed from live data and fed into the ML pipeline as a load-modifier.",
      tags: ["Live Weather", "Thermal Stress", "GPS-Aware"],
      source: "open_meteo",
    },
  ];

  const stackRows = [
    {
      layer: "ML Pipeline",
      items: [
        { name: "scikit-learn", role: "Random Forest models (R², classifier)" },
        { name: "SHAP", role: "TreeExplainer top-3 attributions" },
        { name: "pandas + NumPy", role: "Feature engineering & Duval ratios" },
        { name: "Kaggle Dataset", role: "470 units HI + 4,151 rows DGA" },
      ],
    },
    {
      layer: "Backend API",
      items: [
        { name: "FastAPI (Python)", role: "REST API on :8000, CORS-open" },
        { name: "Pydantic v2", role: "Request validation & schema" },
        { name: "uvicorn", role: "ASGI server, reload-safe" },
        { name: "Anthropic SDK", role: "IBM Bob advisory generation" },
      ],
    },
    {
      layer: "Frontend",
      items: [
        { name: "TanStack Start", role: "SSR + file-based routing (React)" },
        { name: "TanStack Query", role: "Async data fetching & caching" },
        { name: "Recharts", role: "Health index, gas, RUL charts" },
        { name: "shadcn/ui + Tailwind", role: "Design system" },
      ],
    },
    {
      layer: "AI Integrations",
      items: [
        { name: "IBM Bob (Claude 3.5H)", role: "Asset advisory — ibm_bob_llm" },
        { name: "Groq LPU (Llama 3.3)", role: "Live grid inspector reports" },
        { name: "Gemini 3.6 Flash", role: "Geospatial hazard search" },
        { name: "Open-Meteo API", role: "Real-time weather & thermal stress" },
      ],
    },
  ];

  const team = [
    {
      name: "Om Rashiya",
      role: "Backend and Frontend",
      email: "24cs084@charusat.edu.in",
      lead: true,
      branch: "rashiyaom",
    },
    {
      name: "Yash Bharvada",
      role: "Python Model and Backend",
      email: "23cs006@charusat.edu.in",
      lead: false,
      branch: "main",
    },
    {
      name: "Nikunj Desai",
      role: "Frontend Polish and Mobile Responsiveness",
      email: "24cs016@charusat.edu.in",
      lead: false,
      branch: "nikunj",
    },
    {
      name: "Purva Shah",
      role: "Documentation, Architecture Handling, Presentation and End-to-End Testing",
      email: "24cs094@charusat.edu.in",
      lead: false,
      branch: "purva",
    },
  ];

  return (
    <div className="mx-auto mt-8 w-full max-w-6xl px-4 pb-20 sm:px-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-4 text-xs font-mono">
        <span className="pill bg-signal px-3 py-1 font-medium text-signal-foreground">Technology</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Sensing Streams</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Dual ML Pipeline</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">AI Advisory Layer</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Empirical Benchmarks</span>
      </div>

      {/* Hero Section */}
      <div className="mt-8 grid gap-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
            Defensible Power Grid Intelligence · Techtonics × IBM Bobathon
          </p>
          <h1 className="mt-3 font-sans text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Machine learning grounded in{" "}
            <span className="font-display font-normal italic text-signal">physical chemistry.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            VOLTRA pairs two real machine learning models trained on Kaggle transformer datasets with dissolved gas
            analysis (DGA), IBM Bob plain-English advisories, Groq LPU inference, and Gemini geospatial hazard search
            to turn catastrophic failures into scheduled, low-cost interventions.
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

      {/* Live Stats Bar */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { value: "90.8%", label: "DGA Fault Accuracy", color: "text-signal" },
          { value: "R² 0.72", label: "Health Index R²", color: "text-emerald-400" },
          { value: "18", label: "Transformers Monitored", color: "text-foreground" },
          { value: "545 MVA", label: "Total Fleet Capacity", color: "text-amber-400" },
        ].map(({ value, label, color }) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-card p-4 text-center">
            <p className={`font-mono text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</p>
          </div>
        ))}
      </div>

      {/* Hero Visual */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
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
              <p className="font-sans text-base font-semibold">132 kV Transmission Corridor · Anand Sub-Zone</p>
            </div>
            <span className="pill glass-dark px-3 py-1 font-mono text-[11px] text-signal">18 Transformers Mapped</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-3xl border border-border/60 bg-ink p-6 text-cream">
          <div>
            <span className="pill bg-signal/20 px-2.5 py-1 font-mono text-[10px] text-signal font-semibold">ARCHITECTURE</span>
            <h3 className="mt-4 font-sans text-xl font-semibold">FastAPI + Isolated LLM Layer</h3>
            <p className="mt-2 text-xs leading-relaxed text-cream/70">
              Scoring and ranking endpoints are fully decoupled from external LLM API availability.
              If IBM Bob API keys are absent, the system falls back to deterministic engineering templates.
              Scoring <em>never breaks</em>.
            </p>
          </div>
          <div className="mt-6 border-t border-cream/10 pt-4 flex items-center justify-between text-xs text-cream/60 font-mono">
            <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-signal" /> Fully Auditable</span>
            <span>FastAPI :8000</span>
          </div>
        </div>
      </div>

      {/* ── 4 Real Sensing Pillars ── */}
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
                  isSelected ? "border-signal bg-signal/10 ring-1 ring-signal shadow-soft" : "border-border/60 bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{pillar.num}</span>
                  <span className="pill bg-surface border border-border/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{pillar.tag}</span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-ink text-signal"><Icon className="size-4" /></span>
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

      {/* ── Deep Model Cards ── */}
      <section className="mt-20">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Trained ML Models</p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Two Real Models. <span className="font-display font-normal italic text-signal">Zero Shortcuts.</span>
          </h2>
          <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Both models were trained on real Kaggle transformer datasets, cross-validated, and their limitations documented transparently. No simulated accuracy, no inflated benchmarks.
          </p>
        </div>

        {/* Model selector tabs */}
        <div className="mt-8 flex gap-2">
          {models.map((m, idx) => (
            <button
              key={m.num}
              onClick={() => setActiveModel(idx)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                activeModel === idx ? `${m.border} ${m.bg} ${m.color}` : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.num} · {m.label.split("—")[1]?.trim()}
            </button>
          ))}
        </div>

        {models.map((m, idx) => {
          if (activeModel !== idx) return null;
          const Icon = m.icon;
          return (
            <div key={m.num} className={`mt-4 rounded-[2rem] border ${m.border} ${m.bg} p-6 sm:p-8`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl bg-ink ${m.color}`}><Icon className="size-5" /></span>
                  <div>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${m.badgeBg}`}>{m.badge}</span>
                    <h3 className="mt-1 font-sans text-lg font-semibold text-foreground">{m.title}</h3>
                  </div>
                </div>
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">{m.description}</p>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {/* Metrics grid */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3">Verified Performance Metrics</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {m.metrics.map(({ label, value, note }) => (
                      <div key={label} className="rounded-xl border border-border/50 bg-background/60 p-3">
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">{label}</p>
                        <p className={`mt-1 font-mono text-xl font-bold ${m.color}`}>{value}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature importance bars */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3">Top SHAP Feature Drivers</p>
                  <div className="space-y-3">
                    {m.topFeatures.map(({ name, pct }) => (
                      <div key={name}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-foreground/80 font-mono">{name}</span>
                          <span className={`font-bold font-mono ${m.color}`}>{pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${m.accent} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Model Outputs</p>
                    {m.outputs.map((o, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/80">
                        <Check className={`mt-0.5 size-3 shrink-0 ${m.color}`} />
                        <span className="leading-snug">{o}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── 7-Stage Pipeline ── */}
      <section className="mt-20 rounded-[2.5rem] border border-border/60 bg-ink p-6 sm:p-10 text-cream">
        <div className="max-w-2xl">
          <span className="pill bg-signal/20 px-3 py-1 font-mono text-xs text-signal font-semibold">STAGE-BY-STAGE PIPELINE</span>
          <h2 className="mt-4 font-sans text-3xl font-semibold sm:text-4xl text-cream">
            The 7-Stage <span className="font-display font-normal italic text-signal">Dual ML Architecture</span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-cream/70 sm:text-sm">
            From dissolved gas ppm to calibrated Remaining Useful Life (RUL) and plain-English dispatch advisories.
          </p>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          {pipelineStages.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.step}
                className="relative rounded-2xl border border-cream/10 bg-cream/5 p-4 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <Icon className="size-4 text-signal" />
                  <span className="font-mono text-[10px] text-cream/40">{st.step}</span>
                </div>
                <h4 className="mt-6 font-sans text-sm font-semibold text-cream leading-tight">{st.title}</h4>
                <p className="mt-2 text-[11px] leading-relaxed text-cream/60">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SHAP Explanation Section ── */}
      <section className="mt-20">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Explainability by Design</p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Why SHAP — not just a <span className="font-display font-normal italic text-signal">black box score.</span>
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-border/60 bg-card p-6 sm:col-span-2">
            <p className="text-sm font-semibold text-foreground">SHapley Additive exPlanations (SHAP)</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              SHAP values decompose each model prediction into the additive contribution of every input feature.
              For a transformer with Health Index 67.3, SHAP tells you that Acetylene contributed +12.4 HI points,
              Methane +9.1 points, and Hydrogen +5.6 points — not just that the score is high.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              This grounds every advisory. IBM Bob receives the top-3 SHAP features alongside the score, so its
              narrative says "Acetylene surge indicates active electrical arcing in the main tank" — not a
              generic risk statement. Operators can defend every maintenance decision to regulators.
            </p>
            <div className="mt-4 space-y-3">
              {[
                { gas: "Acetylene (C₂H₂)", shap: "+12.4 HI", color: "bg-red-500", pct: 92, note: "Active electrical arcing indicator" },
                { gas: "Methane (CH₄)", shap: "+9.1 HI", color: "bg-amber-500", pct: 74, note: "Low-temp thermal decomposition" },
                { gas: "Hydrogen (H₂)", shap: "+5.6 HI", color: "bg-blue-500", pct: 56, note: "Partial discharge / dielectric stress" },
              ].map(({ gas, shap, color, pct, note }) => (
                <div key={gas} className="rounded-xl border border-border/40 bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-semibold text-foreground">{gas}</span>
                    <span className="font-mono text-xs font-bold text-red-400">{shap}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { icon: CheckCircle2, title: "Auditable", desc: "Every advisory can be traced back to a specific gas reading and SHAP score — not a opaque neural activation." },
              { icon: ShieldCheck, title: "Defensible", desc: "Utility engineers can present SHAP attribution to regulatory bodies as scientific evidence for maintenance decisions." },
              { icon: Sparkles, title: "Operator-Friendly", desc: "IBM Bob translates SHAP features into plain English: gas name, physical mechanism, and urgency window." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-3xl border border-border/60 bg-card p-5 flex-1">
                <Icon className="size-5 text-signal" />
                <h4 className="mt-3 font-sans text-sm font-semibold text-foreground">{title}</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Integration Layer ── */}
      <section className="mt-20">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Multi-AI Integration</p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Four AI systems. <span className="font-display font-normal italic text-signal">One coherent operator experience.</span>
          </h2>
          <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Each AI is used for what it does best — not as a catch-all. Scoring logic is never delegated to an LLM.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {aiIntegrations.map((ai) => (
            <div key={ai.name} className="rounded-3xl border border-border/60 bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ai.icon}</span>
                  <div>
                    <p className="font-sans text-base font-semibold text-foreground">{ai.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{ai.sub}</p>
                  </div>
                </div>
                <span className="pill bg-surface border border-border/50 px-2 py-0.5 font-mono text-[9px] text-muted-foreground shrink-0">
                  {ai.source}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{ai.desc}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {ai.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-signal/30 bg-signal/10 px-2.5 py-0.5 text-[10px] font-semibold text-signal">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Isolation guarantee */}
        <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="size-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">LLM Isolation Guarantee</p>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                All four AI integrations are wrapped in try/except isolation. If any API key is missing or the external service is unreachable,
                VOLTRA's core scoring, ranking, and maintenance planning pipeline continues without interruption. The <code className="font-mono text-[10px]">advisory_source</code> field
                in API responses tells you whether a real LLM or the deterministic fallback was used.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Empirical Benchmarks ── */}
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
            <p className="mt-1 text-xs text-muted-foreground">Random Forest Classifier across 7 IEC 60599 fault categories (F1 = 0.896 on 4,151 rows).</p>
          </div>
          <div className="rounded-3xl bg-signal p-6 text-signal-foreground shadow-sm">
            <Activity className="size-5" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight font-mono">R² = 0.72</p>
            <p className="mt-2 font-sans text-sm font-semibold">Health Index Regression</p>
            <p className="mt-1 text-xs opacity-80">Random Forest Regressor (MAE = 5.88) predicting continuous damage score on 470 Kaggle units.</p>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <Clock3 className="size-5 text-emerald-600 dark:text-emerald-400" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight text-foreground font-mono">+89d</p>
            <p className="mt-2 font-sans text-sm font-semibold text-foreground">TX-115 Rescued Life</p>
            <p className="mt-1 text-xs text-muted-foreground">Pre-failure intervention at Day 78 (RUL 7.7d) recovered useful operating life to 97 days.</p>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <Zap className="size-5 text-signal" />
            <p className="mt-8 font-sans text-5xl font-bold tracking-tight text-foreground font-mono">545 MVA</p>
            <p className="mt-2 font-sans text-sm font-semibold text-foreground">Total Fleet Monitored</p>
            <p className="mt-1 text-xs text-muted-foreground">18 active transformers mapped across Anand District regional transmission corridors.</p>
          </div>
        </div>
      </section>

      {/* ── TX-115 Intervention Story ── */}
      <section className="mt-20 rounded-3xl border border-border/60 bg-card p-6 sm:p-8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-signal">Key Demo Narrative</span>
            <h3 className="mt-1 font-sans text-2xl font-semibold text-foreground">TX-115 · The Intervention Story</h3>
          </div>
          <span className="pill border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400 font-semibold">+89d RUL Recovered</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              day: "Day 60–78",
              label: "Degradation Phase",
              color: "border-red-500/30 bg-red-500/[0.05]",
              textColor: "text-red-400",
              desc: "TX-115 operated in Zone-C at progressive thermal overload. Health Index climbed from 28 → 72.3. Acetylene surge (C₂H₂ > 1400 ppm) flagged D2 high-energy arcing. RUL fell to 7.7 days at Day 78.",
            },
            {
              day: "Day 78–79",
              label: "VOLTRA Intervention",
              color: "border-amber-500/30 bg-amber-500/[0.05]",
              textColor: "text-amber-400",
              desc: "Composite risk score of 0.94 triggered highest-priority maintenance dispatch. IBM Bob advisory: 'Immediate DGA syringe sampling and load curtailment below 60% nameplate rating.' Crew deployed within 16 hours.",
            },
            {
              day: "Day 80–89",
              label: "Recovery & Stabilisation",
              color: "border-emerald-500/30 bg-emerald-500/[0.05]",
              textColor: "text-emerald-400",
              desc: "Post-maintenance, gas levels stabilised. Health Index dropped to 29.4 (healthy range). RUL recovered from 7.7 days → 97+ days at Day 89. Transformer returned to normal service, preventing an estimated ₹4.2Cr outage cost.",
            },
          ].map(({ day, label, color, textColor, desc }) => (
            <div key={day} className={`rounded-2xl border p-4 ${color}`}>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{day}</p>
              <p className={`mt-1 font-sans text-sm font-bold ${textColor}`}>{label}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full Tech Stack ── */}
      <section className="mt-20">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Complete Technology Stack</p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Built end-to-end. <span className="font-display font-normal italic text-signal">Nothing off-the-shelf.</span>
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stackRows.map(({ layer, items }) => (
            <div key={layer} className="rounded-3xl border border-border/60 bg-card p-5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-signal mb-3">{layer}</p>
              <div className="space-y-2.5">
                {items.map(({ name, role }) => (
                  <div key={name} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-signal" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{name}</p>
                      <p className="text-[10px] text-muted-foreground">{role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Transparent Limitations ── */}
      <section className="mt-20 rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-mono text-signal">
          <Info className="size-4" /> TRANSPARENT ENGINEERING LIMITATIONS
        </div>
        <h3 className="mt-2 font-sans text-2xl font-semibold sm:text-3xl text-foreground">Known Boundaries & Academic Defense</h3>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm max-w-3xl">
          To maintain scientific integrity for judges and utility engineers, we document the specific domain constraints of real dissolved gas analysis datasets:
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-2xl border border-border/60 bg-surface/70 p-4">
            <p className="font-semibold text-foreground font-mono text-xs">1. Furan / Paper Insulation Gap</p>
            <p className="mt-2 text-muted-foreground leading-relaxed text-[11px]">
              The Health Index model achieves R² = 0.717 because public DGA datasets omit furan 2-FAL and degree of polymerisation (DP) measurements (IEEE C57.104, CIGRE TB 296). This is a known dataset gap, not a modeling flaw.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface/70 p-4">
            <p className="font-semibold text-foreground font-mono text-xs">2. T2 Fault Class Recall (74.3%)</p>
            <p className="mt-2 text-muted-foreground leading-relaxed text-[11px]">
              The T2 class (moderate thermal fault 300°C–700°C) shares overlapping gas ratios with T1 and T3 boundary states. The system flags this uncertainty explicitly in operator advisories.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface/70 p-4">
            <p className="font-semibold text-foreground font-mono text-xs">3. Calibrated RUL Estimation</p>
            <p className="mt-2 text-muted-foreground leading-relaxed text-[11px]">
              Because utility datasets do not provide run-to-destruction ground truth labels, Remaining Useful Life is modeled through a calibrated piecewise function validated against transformer thermal dissipation curves.
            </p>
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="mt-20">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Techtonics · IBM Bobathon AI Hackathon</p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Built by <span className="font-display font-normal italic text-signal">Team Techtonics.</span>
          </h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {team.map(({ name, role, email, lead, branch }) => (
            <div key={name} className="flex items-center gap-4 rounded-3xl border border-border/60 bg-card p-5 transition-colors hover:border-signal/40">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink text-signal font-mono text-xl font-bold">
                {name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-sans text-sm font-semibold text-foreground truncate">{name}</p>
                  {lead && (
                    <span className="rounded-full bg-signal/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-signal">
                      Lead
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{role}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span className="text-foreground/70">{email}</span>
                  <span>·</span>
                  <span className="text-signal/80">branch: {branch}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="mt-20 overflow-hidden rounded-[2.5rem] bg-signal p-8 text-signal-foreground sm:p-14">
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
              <Link to="/grid">Open Live Grid <ArrowRight className="size-3.5 ml-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="pill border-signal-foreground/30 bg-transparent text-xs text-signal-foreground hover:bg-signal-foreground/10">
              <Link to="/predict">Launch Prediction Studio <ArrowUpRight className="size-3.5 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
