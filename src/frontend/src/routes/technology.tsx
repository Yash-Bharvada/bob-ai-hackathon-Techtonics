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
import engineerImg from "@/assets/pipeline-engineer.jpg";
import substationImg from "@/assets/pipeline-substation.jpg";

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
      accent: "text-cyan-400",
      border: "hover:border-cyan-500/40",
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
      accent: "text-[#d2f831]",
      border: "hover:border-[#d2f831]/40",
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
      accent: "text-amber-400",
      border: "hover:border-amber-500/40",
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
      accent: "text-rose-400",
      border: "hover:border-rose-500/40",
    },
  ];

  const models = [
    {
      num: "01",
      label: "Model 1 — Health Index Regressor",
      icon: Activity,
      color: "text-[#d2f831]",
      accent: "bg-[#d2f831]",
      border: "border-[#d2f831]/40",
      bg: "bg-[#d2f831]/[0.04]",
      ring: "ring-[#d2f831]",
      badge: "R² = 0.72",
      badgeBg: "bg-[#d2f831]/15 text-[#d2f831] border border-[#d2f831]/30",
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
      color: "text-cyan-400",
      accent: "bg-cyan-400",
      border: "border-cyan-500/40",
      bg: "bg-cyan-500/[0.04]",
      ring: "ring-cyan-400",
      badge: "90.8% Acc",
      badgeBg: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
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
      icon: Zap,
      name: "IBM Bob",
      sub: "Claude 3.5 Haiku via Anthropic",
      desc: "Primary AI advisory engine. Given SHAP attribution + fault class + RUL, Bob generates structured plain-English operator directives: what to do, why, and in what time window. Grounded in the scored data — never hallucinated.",
      tags: ["Asset Advisory", "Maintenance Narrative", "SHAP Explanation"],
      source: "ibm_bob_llm",
      accent: "border-[#d2f831]/40 bg-[#d2f831]/10 text-[#d2f831]",
    },
    {
      icon: Cpu,
      name: "Groq LPU Reports",
      sub: "Llama-3.3-70B-Versatile via Groq API",
      desc: "Ultra-fast structured reports for the Grid Inspector panel. Groq's LPU inference produces thermal analysis, weather correlation, trajectory forecast, and 3 prioritised recommended actions in under 2 seconds.",
      tags: ["Thermal Analysis", "Trajectory Forecast", "Live Grid Inspector"],
      source: "groq_llm",
      accent: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
    },
    {
      icon: Network,
      name: "Gemini 3.6 Flash",
      sub: "Google Gemini via REST API",
      desc: "Geospatial area hazard search. Given a zone name and text query, Gemini performs semantic retrieval across the community incident log, computes a dynamic risk multiplier, and returns an affected-asset map with cascading risk assessment.",
      tags: ["Geospatial Search", "Risk Multiplier", "Community Events"],
      source: "gemini_llm",
      accent: "border-purple-500/40 bg-purple-500/10 text-purple-400",
    },
    {
      icon: CloudLightning,
      name: "Open-Meteo",
      sub: "Free weather API — no key required",
      desc: "Real-time ambient temperature, humidity, and wind speed for the operator's GPS-detected or manual coordinates. Thermal stress index computed from live data and fed into the ML pipeline as a load-modifier.",
      tags: ["Live Weather", "Thermal Stress", "GPS-Aware"],
      source: "open_meteo",
      accent: "border-amber-500/40 bg-amber-500/10 text-amber-400",
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
    <div className="mx-auto mt-6 w-full max-w-6xl px-4 pb-28 sm:px-6">
      {/* Sleek Floating Glass Breadcrumb Header */}
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-border dark:border-white/[0.08] bg-card/90 dark:bg-[#111215]/80 px-4 py-2 text-xs font-mono backdrop-blur-md w-fit shadow-xs">
        <span className="rounded-full bg-emerald-600 text-white dark:bg-[#d2f831] dark:text-neutral-950 px-2.5 py-0.5 text-[11px] font-bold">
          Technology
        </span>
        <span className="text-muted-foreground/30 dark:text-white/20">/</span>
        <span className="text-muted-foreground dark:text-neutral-400">Sensing Streams</span>
        <span className="text-muted-foreground/30 dark:text-white/20">/</span>
        <span className="text-muted-foreground dark:text-neutral-400">Dual ML Pipeline</span>
        <span className="text-muted-foreground/30 dark:text-white/20">/</span>
        <span className="text-muted-foreground dark:text-neutral-400">AI Advisory Layer</span>
        <span className="text-muted-foreground/30 dark:text-white/20">/</span>
        <span className="text-muted-foreground dark:text-neutral-400">Empirical Benchmarks</span>
      </div>

      {/* Hero Section */}
      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831] animate-pulse" />
            Defensible Power Grid Intelligence · Techtonics × IBM Bobathon
          </p>
          <h1 className="mt-3 font-sans text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Machine learning grounded in{" "}
            <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">physical chemistry.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            VOLTRA pairs two real machine learning models trained on Kaggle transformer datasets with dissolved gas
            analysis (DGA), IBM Bob plain-English advisories, Groq LPU inference, and Gemini geospatial hazard search
            to turn catastrophic failures into scheduled, low-cost interventions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:col-span-4 md:justify-end">
          <Button
            asChild
            className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#d2f831] dark:text-neutral-950 dark:hover:bg-[#c7f023] px-5 py-2.5 text-xs font-bold shadow-sm transition-all hover:shadow-md"
          >
            <Link to="/grid">
              Explore Live Grid <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-border bg-card text-foreground hover:bg-muted dark:border-white/[0.12] dark:bg-[#141519] dark:text-white dark:hover:bg-white/[0.08] px-5 py-2.5 text-xs font-semibold shadow-xs"
          >
            <Link to="/predict">
              Launch Studio <ArrowUpRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          {
            icon: ShieldCheck,
            value: "90.8%",
            label: "DGA Fault Accuracy",
            dotColor: "bg-cyan-500 dark:bg-cyan-400",
            tag: "7 IEC 60599 CLASSES",
          },
          {
            icon: Activity,
            value: "R² 0.72",
            label: "Health Index R²",
            dotColor: "bg-emerald-500 dark:bg-[#d2f831]",
            tag: "470 UNITS TESTED",
          },
          {
            icon: Radio,
            value: "18",
            label: "Transformers Monitored",
            dotColor: "bg-emerald-500 dark:bg-emerald-400",
            tag: "4 ANAND SUB-ZONES",
          },
          {
            icon: Zap,
            value: "545 MVA",
            label: "Total Fleet Capacity",
            dotColor: "bg-amber-500 dark:bg-amber-400",
            tag: "132kV / 220kV GRID",
          },
        ].map(({ icon: Icon, value, label, dotColor, tag }) => (
          <div
            key={label}
            className="group relative flex flex-col justify-between rounded-2xl sm:rounded-[1.75rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:border-border/80 dark:hover:border-white/20 min-h-[135px] sm:min-h-[155px]"
          >
            <div className="text-muted-foreground dark:text-neutral-400">
              <Icon className="size-5 stroke-[1.75]" />
            </div>
            <div className="my-auto py-1">
              <p className="font-sans text-3xl sm:text-4xl font-bold tracking-tight text-foreground dark:text-white font-mono">
                {value}
              </p>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground dark:text-neutral-400 mt-1 truncate">
                {label}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-muted-foreground dark:text-neutral-300">
              <span className={`size-1.5 rounded-full ${dotColor} shadow-[0_0_8px_rgba(255,255,255,0.4)]`} />
              <span className="uppercase tracking-wider">{tag}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Hero Visual & Decoupled Architecture Card */}
      <div className="mt-8 grid gap-4 lg:grid-cols-12 items-stretch">
        <div className="relative overflow-hidden rounded-[2rem] border border-border dark:border-white/[0.08] bg-[#111215] shadow-lg lg:col-span-8 group min-h-[300px] sm:min-h-[360px]">
          <img
            src={gridImg}
            alt="Transmission towers monitored with automated power line telemetry"
            width={1600}
            height={900}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-3 text-white">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#d2f831]">
                Monitored Transmission Asset
              </span>
              <p className="font-sans text-lg sm:text-xl font-bold mt-0.5">
                132 kV Transmission Corridor · Anand Sub-Zone
              </p>
            </div>
            <span className="rounded-full border border-white/20 bg-black/60 px-3.5 py-1 font-mono text-xs font-semibold text-[#d2f831] backdrop-blur-md">
              18 Transformers Mapped
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-8 text-foreground dark:text-white shadow-sm dark:shadow-lg lg:col-span-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:bg-[#d2f831]/15 dark:border-[#d2f831]/30 dark:text-[#d2f831] px-3 py-1 font-mono text-[10px] font-bold tracking-wider uppercase">
                ARCHITECTURE
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
            <h3 className="mt-4 font-sans text-xl font-bold leading-snug text-foreground dark:text-white">
              FastAPI + Isolated LLM Layer
            </h3>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground dark:text-neutral-300/80">
              Scoring and ranking endpoints are fully decoupled from external LLM API availability.
              If IBM Bob API keys are absent, the system falls back to deterministic engineering templates.
              Scoring <em className="text-foreground dark:text-white font-semibold">never breaks</em>.
            </p>
          </div>
          <div className="mt-6 border-t border-border dark:border-white/[0.08] pt-4 flex items-center justify-between text-xs text-muted-foreground dark:text-neutral-400 font-mono">
            <span className="inline-flex items-center gap-1.5 text-foreground dark:text-white">
              <Lock className="size-3.5 text-emerald-600 dark:text-[#d2f831]" /> Fully Auditable
            </span>
            <span>FastAPI REST Engine</span>
          </div>
        </div>
      </div>

      {/* ── 4 Real Sensing Pillars ── */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Real Telemetry Streams
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            The 4 Physical Data Streams in{" "}
            <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">VOLTRA</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
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
                className={`group cursor-pointer rounded-[1.75rem] border p-6 transition-all duration-300 flex flex-col justify-between ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-600/30 text-emerald-950 dark:border-[#d2f831] dark:bg-[#d2f831]/[0.08] dark:ring-1 dark:ring-[#d2f831]/50 dark:text-white shadow-md"
                    : "border-border bg-card hover:bg-muted/40 text-foreground dark:border-white/[0.08] dark:bg-[#111215]/85 dark:hover:border-white/20 dark:hover:bg-[#15161a] dark:text-white shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-muted-foreground dark:text-neutral-400">{pillar.num}</span>
                    <span className="rounded-full border border-border dark:border-white/[0.08] bg-muted/60 dark:bg-black/40 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground dark:text-neutral-300">
                      {pillar.tag}
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 dark:bg-white/[0.05] border border-border dark:border-white/[0.08] text-foreground dark:text-white transition-transform group-hover:scale-105">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-sans text-base font-bold leading-tight text-foreground dark:text-white">
                      {pillar.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground dark:text-neutral-400">{pillar.summary}</p>
                </div>
                <div className="mt-5 border-t border-border dark:border-white/[0.08] pt-4 space-y-2">
                  {pillar.details.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/90 dark:text-neutral-300">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-[#d2f831]" />
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
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Trained ML Models
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Two Real Models. <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">Zero Shortcuts.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Both models were trained on real Kaggle transformer datasets, cross-validated, and their limitations documented transparently. No simulated accuracy, no inflated benchmarks.
          </p>
        </div>

        {/* Model selector tabs */}
        <div className="mt-8 flex flex-wrap gap-2.5">
          {models.map((m, idx) => (
            <button
              key={m.num}
              type="button"
              onClick={() => setActiveModel(idx)}
              className={`rounded-full border px-5 py-2 text-xs font-semibold font-mono transition-all duration-300 cursor-pointer ${
                activeModel === idx
                  ? "border-emerald-600 bg-emerald-600 text-white font-bold shadow-sm dark:border-[#d2f831] dark:bg-[#d2f831] dark:text-neutral-950"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80 dark:border-white/[0.1] dark:bg-[#111215] dark:text-neutral-400 dark:hover:text-white dark:hover:border-white/20"
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
            <div
              key={m.num}
              className="mt-5 rounded-[2rem] border border-border dark:border-white/[0.1] bg-card dark:bg-[#111215]/95 p-6 sm:p-10 shadow-sm dark:shadow-2xl transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border dark:border-white/[0.08]">
                <div className="flex items-center gap-3.5">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 dark:bg-white/[0.05] border border-border dark:border-white/[0.08] text-emerald-700 dark:text-[#d2f831]">
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 dark:bg-[#d2f831]/15 dark:text-[#d2f831] dark:border-[#d2f831]/30">
                      {m.badge}
                    </span>
                    <h3 className="mt-1 font-sans text-xl font-bold text-foreground dark:text-white">{m.title}</h3>
                  </div>
                </div>
              </div>

              <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground dark:text-neutral-300/90">{m.description}</p>

              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                {/* Metrics grid */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground dark:text-neutral-400 font-mono mb-3.5">
                    Verified Performance Metrics
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {m.metrics.map(({ label, value, note }) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-4 transition-all hover:border-border/80 dark:hover:border-white/20"
                      >
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground dark:text-neutral-400 font-mono">{label}</p>
                        <p className="mt-1.5 font-mono text-2xl font-bold text-foreground dark:text-white">{value}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground dark:text-neutral-400 leading-tight">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature importance bars */}
                <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-5 sm:p-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground dark:text-neutral-400 font-mono mb-4">
                    Top SHAP Feature Drivers
                  </p>
                  <div className="space-y-3.5">
                    {m.topFeatures.map(({ name, pct }) => (
                      <div key={name}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-foreground dark:text-neutral-300 font-mono">{name}</span>
                          <span className="font-bold font-mono text-emerald-700 dark:text-[#d2f831]">{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted dark:bg-white/[0.08]">
                          <div
                            className="h-full rounded-full bg-emerald-600 dark:bg-[#d2f831] transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 border-t border-border dark:border-white/[0.08] pt-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground dark:text-neutral-400 font-mono mb-2">
                      Model Outputs
                    </p>
                    {m.outputs.map((o, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground dark:text-neutral-300">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-[#d2f831]" />
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

      {/* ── 7-Stage Pipeline (Continuous Endless Flowing Marquee Carousel) ── */}
      <section className="mt-28 rounded-[2.5rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/95 p-6 sm:p-10 shadow-sm dark:shadow-2xl overflow-hidden relative">
        <div className="max-w-2xl">
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:bg-[#d2f831]/15 dark:border-[#d2f831]/30 dark:text-[#d2f831] px-3 py-1 font-mono text-xs font-bold">
            STAGE-BY-STAGE PIPELINE
          </span>
          <h2 className="mt-4 font-sans text-3xl font-semibold sm:text-4xl text-foreground dark:text-white">
            The 7-Stage <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">Dual ML Architecture</span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground dark:text-neutral-400 sm:text-sm">
            Continuous end-to-end automated pipeline from physical sensor ppm to calibrated Remaining Useful Life (RUL) and plain-English dispatch advisories.
          </p>
        </div>

        {/* Endless Marquee Carousel */}
        <div className="relative mt-8 sm:mt-10 overflow-hidden w-full select-none">
          {/* Edge gradient fade masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-20 bg-gradient-to-r from-card dark:from-[#111215] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-20 bg-gradient-to-l from-card dark:from-[#111215] to-transparent z-10" />

          {/* Flowing Track with duplicate array for 100% infinite seamless loop */}
          <div className="animate-marquee-flow flex gap-3.5 sm:gap-4 py-2 hover:[animation-play-state:paused]">
            {[...pipelineStages, ...pipelineStages].map((st, i) => {
              const Icon = st.icon;
              return (
                <div
                  key={`${st.step}-${i}`}
                  className="w-[240px] sm:w-[270px] shrink-0 rounded-2xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 dark:hover:border-[#d2f831]/40 hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-[#d2f831]/10 dark:text-[#d2f831]">
                        <Icon className="size-4" />
                      </div>
                      <span className="font-mono text-xs font-bold text-muted-foreground dark:text-neutral-400">{st.step}</span>
                    </div>
                    <h4 className="mt-4 font-sans text-sm sm:text-base font-bold text-foreground dark:text-white leading-tight">{st.title}</h4>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground dark:text-neutral-400">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SHAP Explanation Section (Third Image Fix) ── */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Explainability by Design
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Why SHAP — not just a <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">black box score.</span>
          </h2>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-12 items-stretch">
          <div className="rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-8 lg:col-span-8 shadow-sm dark:shadow-lg">
            <h3 className="text-base sm:text-lg font-bold text-foreground dark:text-white">SHapley Additive exPlanations (SHAP)</h3>
            <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-muted-foreground dark:text-neutral-300">
              SHAP values decompose each model prediction into the additive contribution of every input feature.
              For a transformer with Health Index 67.3, SHAP tells you that Acetylene contributed +12.4 HI points,
              Methane +9.1 points, and Hydrogen +5.6 points — not just that the score is high.
            </p>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground dark:text-neutral-400">
              This grounds every advisory. IBM Bob receives the top-3 SHAP features alongside the score, so its
              narrative says "Acetylene surge indicates active electrical arcing in the main tank" — not a
              generic risk statement. Operators can defend every maintenance decision to regulators.
            </p>

            <div className="mt-6 space-y-3">
              {[
                { gas: "Acetylene (C₂H₂)", shap: "+12.4 HI", color: "bg-rose-500", pct: 92, note: "Active electrical arcing indicator" },
                { gas: "Methane (CH₄)", shap: "+9.1 HI", color: "bg-amber-500", pct: 74, note: "Low-temp thermal decomposition" },
                { gas: "Hydrogen (H₂)", shap: "+5.6 HI", color: "bg-cyan-500 dark:bg-cyan-400", pct: 56, note: "Partial discharge / dielectric stress" },
              ].map(({ gas, shap, color, pct, note }) => (
                <div key={gas} className="rounded-xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-semibold text-foreground dark:text-white">{gas}</span>
                    <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">{shap}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted dark:bg-white/[0.08]">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground dark:text-neutral-400 font-mono">{note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 lg:col-span-4 justify-between">
            {[
              { icon: CheckCircle2, title: "Auditable", desc: "Every advisory can be traced back to a specific gas reading and SHAP score — not an opaque neural activation." },
              { icon: ShieldCheck, title: "Defensible", desc: "Utility engineers can present SHAP attribution to regulatory bodies as scientific evidence for maintenance decisions." },
              { icon: Sparkles, title: "Operator-Friendly", desc: "IBM Bob translates SHAP features into plain English: gas name, physical mechanism, and urgency window." },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-[1.75rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-5 flex-1 shadow-xs dark:shadow-sm flex flex-col justify-center"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-[#d2f831]/10 dark:text-[#d2f831]">
                  <Icon className="size-5" />
                </div>
                <h4 className="mt-3 font-sans text-sm font-bold text-foreground dark:text-white">{title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground dark:text-neutral-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Integration Layer ── */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Multi-AI Integration
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Four AI systems.{" "}
            <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">One coherent operator experience.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each AI is used for what it does best — not as a catch-all. Scoring logic is never delegated to an LLM.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {aiIntegrations.map((ai) => {
            const Icon = ai.icon;
            return (
              <div
                key={ai.name}
                className="rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-7 shadow-xs dark:shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-muted/60 dark:bg-white/[0.05] border border-border dark:border-white/[0.08] text-emerald-700 dark:text-[#d2f831]">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="font-sans text-base font-bold text-foreground dark:text-white">{ai.name}</p>
                        <p className="text-[10px] text-muted-foreground dark:text-neutral-400 font-mono">{ai.sub}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-border dark:border-white/[0.08] bg-muted/60 dark:bg-black/40 px-2.5 py-0.5 font-mono text-[9px] text-muted-foreground dark:text-neutral-300 shrink-0">
                      {ai.source}
                    </span>
                  </div>
                  <p className="mt-4 text-xs sm:text-sm leading-relaxed text-muted-foreground dark:text-neutral-300">{ai.desc}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {ai.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border dark:border-white/[0.08] bg-muted/50 dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground dark:text-neutral-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Isolation guarantee */}
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="size-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground dark:text-white">LLM Isolation Guarantee</p>
              <p className="mt-1 text-xs text-muted-foreground dark:text-neutral-300 leading-relaxed">
                All four AI integrations are wrapped in try/except isolation. If any API key is missing or the external service is unreachable,
                VOLTRA's core scoring, ranking, and maintenance planning pipeline continues without interruption. The{" "}
                <code className="font-mono text-[11px] text-amber-600 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-950/40 px-1 py-0.5 rounded">
                  advisory_source
                </code>{" "}
                field in API responses tells you whether a real LLM or the deterministic fallback was used.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Empirical Benchmarks ── */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Actual Verified Metrics
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Empirical Model Performance{" "}
            <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">Benchmarks</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Trained and cross-validated on real Kaggle transformer datasets without simulated shortcuts.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-7 shadow-xs dark:shadow-sm transition-all duration-300 hover:border-border/80 dark:hover:border-white/20">
            <ShieldCheck className="size-6 text-emerald-700 dark:text-[#d2f831]" />
            <p className="mt-8 font-sans text-4xl sm:text-5xl font-bold tracking-tight text-foreground dark:text-white font-mono">
              90.8%
            </p>
            <p className="mt-3 font-sans text-sm font-bold text-foreground dark:text-white">DGA Fault Classification</p>
            <p className="mt-1 text-xs text-muted-foreground dark:text-neutral-400 leading-relaxed">
              Random Forest Classifier across 7 IEC 60599 fault categories (F1 = 0.896 on 4,151 rows).
            </p>
          </div>

          <div className="group rounded-[2rem] bg-emerald-600 text-white dark:bg-[#d2f831] dark:text-neutral-950 p-6 sm:p-7 shadow-md transition-all duration-300 hover:bg-emerald-700 dark:hover:bg-[#c7f023]">
            <Activity className="size-6 text-white dark:text-neutral-950" />
            <p className="mt-8 font-sans text-4xl sm:text-5xl font-bold tracking-tight font-mono text-white dark:text-neutral-950">
              R² = 0.72
            </p>
            <p className="mt-3 font-sans text-sm font-bold text-white dark:text-neutral-950">Health Index Regression</p>
            <p className="mt-1 text-xs text-white/85 dark:text-neutral-900/80 leading-relaxed">
              Random Forest Regressor (MAE = 5.88) predicting continuous damage score on 470 Kaggle units.
            </p>
          </div>

          <div className="group rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-7 shadow-xs dark:shadow-sm transition-all duration-300 hover:border-border/80 dark:hover:border-white/20">
            <Clock3 className="size-6 text-emerald-600 dark:text-emerald-400" />
            <p className="mt-8 font-sans text-4xl sm:text-5xl font-bold tracking-tight text-foreground dark:text-white font-mono">
              +89d
            </p>
            <p className="mt-3 font-sans text-sm font-bold text-foreground dark:text-white">TX-115 Rescued Life</p>
            <p className="mt-1 text-xs text-muted-foreground dark:text-neutral-400 leading-relaxed">
              Pre-failure intervention at Day 78 (RUL 7.7d) recovered useful operating life to 97 days.
            </p>
          </div>

          <div className="group rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-7 shadow-xs dark:shadow-sm transition-all duration-300 hover:border-border/80 dark:hover:border-white/20">
            <Zap className="size-6 text-amber-500 dark:text-amber-400" />
            <p className="mt-8 font-sans text-4xl sm:text-5xl font-bold tracking-tight text-foreground dark:text-white font-mono">
              545 MVA
            </p>
            <p className="mt-3 font-sans text-sm font-bold text-foreground dark:text-white">Total Fleet Monitored</p>
            <p className="mt-1 text-xs text-muted-foreground dark:text-neutral-400 leading-relaxed">
              18 active transformers mapped across Anand District regional transmission corridors.
            </p>
          </div>
        </div>
      </section>

      {/* ── TX-115 Intervention Story ── */}
      <section className="mt-28 rounded-[2.5rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-10 shadow-sm dark:shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-[#d2f831]">
              Key Demo Narrative
            </span>
            <h3 className="mt-1 font-sans text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
              TX-115 · The Intervention Story
            </h3>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-1 font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold">
            +89d RUL Recovered
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              day: "Day 60–78",
              label: "Degradation Phase",
              color: "border-rose-500/30 bg-rose-500/[0.04] dark:bg-rose-500/[0.05]",
              textColor: "text-rose-600 dark:text-rose-400",
              desc: "TX-115 operated in Zone-C at progressive thermal overload. Health Index climbed from 28 → 72.3. Acetylene surge (C₂H₂ > 1400 ppm) flagged D2 high-energy arcing. RUL fell to 7.7 days at Day 78.",
            },
            {
              day: "Day 78–79",
              label: "VOLTRA Intervention",
              color: "border-amber-500/30 bg-amber-500/[0.04] dark:bg-amber-500/[0.05]",
              textColor: "text-amber-600 dark:text-amber-400",
              desc: "Composite risk score of 0.94 triggered highest-priority maintenance dispatch. IBM Bob advisory: 'Immediate DGA syringe sampling and load curtailment below 60% nameplate rating.' Crew deployed within 16 hours.",
            },
            {
              day: "Day 80–89",
              label: "Recovery & Stabilisation",
              color: "border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.05]",
              textColor: "text-emerald-700 dark:text-emerald-400",
              desc: "Post-maintenance, gas levels stabilised. Health Index dropped to 29.4 (healthy range). RUL recovered from 7.7 days → 97+ days at Day 89. Transformer returned to normal service, preventing an estimated ₹4.2Cr outage cost.",
            },
          ].map(({ day, label, color, textColor, desc }) => (
            <div key={day} className={`rounded-2xl border p-5 ${color}`}>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400">{day}</p>
              <p className={`mt-1 font-sans text-base font-bold ${textColor}`}>{label}</p>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground dark:text-neutral-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full Tech Stack ── */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Complete Technology Stack
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Built end-to-end. <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">Nothing off-the-shelf.</span>
          </h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stackRows.map(({ layer, items }) => (
            <div
              key={layer}
              className="rounded-[1.75rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 shadow-xs dark:shadow-sm flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-[#d2f831] mb-4">
                  {layer}
                </p>
                <div className="space-y-3">
                  {items.map(({ name, role }) => (
                    <div key={name} className="flex items-start gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-[#d2f831]" />
                      <div>
                        <p className="text-xs font-bold text-foreground dark:text-white">{name}</p>
                        <p className="text-[11px] text-muted-foreground dark:text-neutral-400 mt-0.5">{role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Transparent Limitations ── */}
      <section className="mt-28 rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-9 shadow-xs dark:shadow-lg">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-[#d2f831] font-semibold">
          <Info className="size-4" /> TRANSPARENT ENGINEERING LIMITATIONS
        </div>
        <h3 className="mt-2 font-sans text-2xl font-bold sm:text-3xl text-foreground dark:text-white">
          Known Boundaries & Academic Defense
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground dark:text-neutral-400 sm:text-sm max-w-3xl">
          To maintain scientific integrity for judges and utility engineers, we document the specific domain constraints of real dissolved gas analysis datasets:
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-4 sm:p-5">
            <p className="font-bold text-foreground dark:text-white font-mono text-xs">1. Furan / Paper Insulation Gap</p>
            <p className="mt-2 text-muted-foreground dark:text-neutral-400 leading-relaxed text-[11px]">
              The Health Index model achieves R² = 0.717 because public DGA datasets omit furan 2-FAL and degree of polymerisation (DP) measurements (IEEE C57.104, CIGRE TB 296). This is a known dataset gap, not a modeling flaw.
            </p>
          </div>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-4 sm:p-5">
            <p className="font-bold text-foreground dark:text-white font-mono text-xs">2. T2 Fault Class Recall (74.3%)</p>
            <p className="mt-2 text-muted-foreground dark:text-neutral-400 leading-relaxed text-[11px]">
              The T2 class (moderate thermal fault 300°C–700°C) shares overlapping gas ratios with T1 and T3 boundary states. The system flags this uncertainty explicitly in operator advisories.
            </p>
          </div>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-4 sm:p-5">
            <p className="font-bold text-foreground dark:text-white font-mono text-xs">3. Calibrated RUL Estimation</p>
            <p className="mt-2 text-muted-foreground dark:text-neutral-400 leading-relaxed text-[11px]">
              Because utility datasets do not provide run-to-destruction ground truth labels, Remaining Useful Life is modeled through a calibrated piecewise function validated against transformer thermal dissipation curves.
            </p>
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Techtonics · IBM Bobathon AI Hackathon
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Built by <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">Team Techtonics.</span>
          </h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {team.map(({ name, role, email, lead, branch }) => (
            <div
              key={name}
              className="flex items-center gap-4 rounded-[1.75rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-5 transition-all duration-300 hover:border-emerald-600/40 dark:hover:border-[#d2f831]/40 shadow-xs dark:shadow-sm"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:bg-[#d2f831]/10 dark:text-[#d2f831] font-mono text-xl font-bold border border-emerald-500/20 dark:border-[#d2f831]/20">
                {name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-sans text-sm font-bold text-foreground dark:text-white truncate">{name}</p>
                  {lead && (
                    <span className="rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 dark:bg-[#d2f831]/20 dark:text-[#d2f831] dark:border-[#d2f831]/30 px-2 py-0.5 font-mono text-[9px] font-bold">
                      Lead
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground dark:text-neutral-400 mt-0.5 leading-snug">{role}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground dark:text-neutral-400">
                  <span className="text-foreground/90 dark:text-neutral-300">{email}</span>
                  <span className="opacity-40">·</span>
                  <span className="text-emerald-700 dark:text-[#d2f831]/80">branch: {branch}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="mt-28 overflow-hidden rounded-[2.5rem] bg-[#d2f831] p-8 text-neutral-950 sm:p-14 shadow-2xl">
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-mono font-bold text-neutral-950/70">
              Techtonics · Bobathon AI
            </p>
            <h2 className="mt-2 font-sans text-3xl font-bold tracking-tight sm:text-5xl text-neutral-950">
              Grounded predictions <span className="font-display font-normal italic">before the dark.</span>
            </h2>
            <p className="mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-neutral-900/85">
              Inspect all 18 ranked transformers, live SHAP explanations, and the 7-day maintenance plan on the operator console.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-neutral-950 px-6 text-xs font-bold text-white hover:bg-neutral-900 shadow-md"
            >
              <Link to="/grid">
                Open Live Grid <ArrowRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-neutral-950/30 bg-transparent px-6 text-xs font-bold text-neutral-950 hover:bg-neutral-950/10"
            >
              <Link to="/predict">
                Launch Prediction Studio <ArrowUpRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
