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
  BarChart2,
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

      {/* ══════════════════════════════════════════════════════
          NEW SECTION 1: Formula Reference Panel
          ══════════════════════════════════════════════════════ */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Mathematical Engine
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Every score is{" "}
            <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">a real formula.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No hidden coefficients, no black-box outputs. Every number shown to an operator is traceable to a specific
            equation implemented in the Python pipeline and verifiable against IEC/IEEE standards.
          </p>
        </div>

        {/* Formula cards grid */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">

          {/* RUL */}
          <div className="rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-8 shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-[#d2f831]/10 dark:text-[#d2f831]">
                  <Clock3 className="size-4.5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400">score_asset_risk.py · lines 53–59</p>
                  <h3 className="font-sans text-base font-bold text-foreground dark:text-white">Remaining Useful Life (RUL)</h3>
                </div>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">days</span>
            </div>
            <pre className="rounded-xl bg-neutral-950 dark:bg-black/60 border border-white/[0.06] p-4 text-[11px] leading-relaxed font-mono text-neutral-200 overflow-x-auto">
{`# Piecewise calibrated from thermal dissipation curves
if HI >= 70:   # CRITICAL tier
    RUL = max(1.0, 8.0 - (HI - 70) * 0.2)

elif HI >= 50: # HIGH tier
    RUL = max(8.0, 45.0 - (HI - 50) * 1.85)

else:          # LOW / MEDIUM tier
    RUL = max(45.0, 180.0 - (HI - 13.4) * 3.65)`}
            </pre>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { tier: "LOW", range: "HI < 30", rul: "≥ 45d", color: "text-emerald-600 dark:text-emerald-400" },
                { tier: "MEDIUM", range: "30–49", rul: "45–80d", color: "text-cyan-600 dark:text-cyan-400" },
                { tier: "HIGH", range: "50–69", rul: "8–45d", color: "text-amber-600 dark:text-amber-400" },
                { tier: "CRITICAL", range: "≥ 70", rul: "1–8d", color: "text-rose-600 dark:text-rose-400" },
              ].map(({ tier, range, rul, color }) => (
                <div key={tier} className="rounded-xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-2.5 text-center">
                  <p className={`font-mono text-[10px] font-bold ${color}`}>{tier}</p>
                  <p className="font-mono text-[9px] text-muted-foreground dark:text-neutral-400 mt-0.5">{range}</p>
                  <p className="font-mono text-xs font-bold text-foreground dark:text-white mt-1">{rul}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Composite Grid Impact Score */}
          <div className="rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-8 shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
                  <BarChart2 className="size-4.5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400">grid_impact_ranker.py · lines 86–113</p>
                  <h3 className="font-sans text-base font-bold text-foreground dark:text-white">Composite Grid Impact Score</h3>
                </div>
              </div>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">0–1.0</span>
            </div>
            <pre className="rounded-xl bg-neutral-950 dark:bg-black/60 border border-white/[0.06] p-4 text-[11px] leading-relaxed font-mono text-neutral-200 overflow-x-auto">
{`# 5-factor weighted composite
hi_norm   = HI / 100
rul_norm  = 1.0 - (RUL / 180.0)
fault_sev = base * fault_conf + 0.5 * (1 - fault_conf)
mva_norm  = log(1 + MVA) / log(1 + 160)
inc_norm  = incident_rate / 3.0

raw = (0.35 * hi_norm  + 0.25 * rul_norm +
       0.20 * fault_sev + 0.10 * mva_norm +
       0.10 * inc_norm)

# Criticality multipliers: CRITICAL=2.0, HIGH=1.5
#                           MEDIUM=1.1, LOW=0.8
composite = min(1.0, raw * criticality_mult)`}
            </pre>
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {[
                { factor: "HI", weight: "35%", color: "bg-emerald-500 dark:bg-[#d2f831]" },
                { factor: "RUL", weight: "25%", color: "bg-cyan-500" },
                { factor: "Fault", weight: "20%", color: "bg-amber-500" },
                { factor: "MVA", weight: "10%", color: "bg-purple-500" },
                { factor: "Incidents", weight: "10%", color: "bg-rose-500" },
              ].map(({ factor, weight, color }) => (
                <div key={factor} className="flex flex-col items-center gap-1">
                  <div className="w-full rounded-full bg-muted dark:bg-white/[0.08] h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: weight }} />
                  </div>
                  <p className="font-mono text-[10px] font-bold text-foreground dark:text-white">{weight}</p>
                  <p className="font-mono text-[9px] text-muted-foreground dark:text-neutral-400">{factor}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Blackout Probability */}
          <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/[0.03] dark:bg-[#111215]/90 p-6 sm:p-8 shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Zap className="size-4.5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400">main.py · line 1114</p>
                  <h3 className="font-sans text-base font-bold text-foreground dark:text-white">Blackout Probability</h3>
                </div>
              </div>
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[10px] text-rose-600 dark:text-rose-400 font-bold">2.5–99.5 %</span>
            </div>
            <pre className="rounded-xl bg-neutral-950 dark:bg-black/60 border border-white/[0.06] p-4 text-[11px] leading-relaxed font-mono text-neutral-200 overflow-x-auto">
{`P(blackout) = min(99.5,
               max(2.5,
                   HI * 0.9 + dga_prob * 35.0))`}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground dark:text-neutral-400 leading-relaxed">
              <span className="font-semibold text-foreground dark:text-white">HI</span> = Health Index (0–100) ·{" "}
              <span className="font-semibold text-foreground dark:text-white">dga_prob</span> = dominant fault class probability (0–1). Clamped to [2.5, 99.5] to avoid false certainty in either direction.
            </p>
          </div>

          {/* Time to Failure */}
          <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/[0.03] dark:bg-[#111215]/90 p-6 sm:p-8 shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-4.5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400">main.py · line 1165</p>
                  <h3 className="font-sans text-base font-bold text-foreground dark:text-white">Time to Failure (TTF)</h3>
                </div>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">hours</span>
            </div>
            <pre className="rounded-xl bg-neutral-950 dark:bg-black/60 border border-white/[0.06] p-4 text-[11px] leading-relaxed font-mono text-neutral-200 overflow-x-auto">
{`TTF_hours = max(0.3,
              ((100 - HI) / 11.5)
              * (1.0 - dga_prob * 0.45))`}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground dark:text-neutral-400 leading-relaxed">
              A transformer at HI = 80 with fault probability 0.6 has TTF ≈{" "}
              <span className="font-mono font-semibold text-foreground dark:text-white">
                ((100-80)/11.5) × (1-0.27) ≈ <strong>1.27 hours</strong>
              </span>. Minimum floor of 0.3 hours prevents false "immediate failure" signals.
            </p>
          </div>

          {/* ETR */}
          <div className="rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-8 shadow-sm dark:shadow-lg lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Wrench className="size-4.5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400">main.py · lines 1128–1162</p>
                  <h3 className="font-sans text-base font-bold text-foreground dark:text-white">Estimated Time to Restore (ETR)</h3>
                </div>
              </div>
              <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold">25–360 min</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <pre className="rounded-xl bg-neutral-950 dark:bg-black/60 border border-white/[0.06] p-4 text-[11px] leading-relaxed font-mono text-neutral-200 overflow-x-auto">
{`# Fault base times (minutes):
# D2=150  D1=120  T3=135
# T2=100  T1=70   PD=55
# Normal=35

hi_penalty  = HI * 1.15
dga_penalty = dga_prob * 35.0
mva_factor  = (MVA / 25.0) * 12.0
site_offset = (asset_num * 7) % 23 - 11

ETR = clamp(base + hi_penalty
          + dga_penalty + mva_factor
          + site_offset, 25, 360)`}
              </pre>
              <div className="space-y-2">
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400 mb-3">Base Fault Restoration Times</p>
                {[
                  { fault: "D2 · High-energy arcing", base: "150 min", color: "bg-rose-500" },
                  { fault: "T3 · Thermal > 700°C", base: "135 min", color: "bg-orange-500" },
                  { fault: "D1 · Low-energy discharge", base: "120 min", color: "bg-amber-500" },
                  { fault: "T2 · Thermal 300–700°C", base: "100 min", color: "bg-yellow-500" },
                  { fault: "T1 · Thermal < 300°C", base: "70 min", color: "bg-lime-500" },
                  { fault: "PD · Partial Discharge", base: "55 min", color: "bg-cyan-500" },
                  { fault: "Normal · No fault", base: "35 min", color: "bg-emerald-500" },
                ].map(({ fault, base, color }) => (
                  <div key={fault} className="flex items-center gap-2.5">
                    <div className="w-full max-w-[120px] rounded-full bg-muted dark:bg-white/[0.08] h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${(parseInt(base) / 150) * 100}%` }} />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-foreground dark:text-white w-14 shrink-0">{base}</span>
                    <span className="text-[10px] text-muted-foreground dark:text-neutral-400">{fault}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Thermal Stress */}
          <div className="rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-8 shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Thermometer className="size-4.5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400">main.py · lines 510–513</p>
                  <h3 className="font-sans text-base font-bold text-foreground dark:text-white">Thermal Stress Index</h3>
                </div>
              </div>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 font-mono text-[10px] text-orange-600 dark:text-orange-400 font-bold">0–100</span>
            </div>
            <pre className="rounded-xl bg-neutral-950 dark:bg-black/60 border border-white/[0.06] p-4 text-[11px] leading-relaxed font-mono text-neutral-200 overflow-x-auto">
{`base_stress = max(0, (temp_c - 25) / 55) * 100
hum_penalty = max(0, (humidity - 60) / 10) * 2
wind_bonus  = max(0, (wind_kmh - 10) / 40) * 5

thermal_stress = min(100,
    base_stress + hum_penalty - wind_bonus)`}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground dark:text-neutral-400 leading-relaxed">
              Temperature above 25°C linearly drives stress toward 100 at 80°C. Humidity above 60% adds a
              penalty; wind above 10 km/h improves radiator cooling (bonus up to 5 points). Data sourced live from Open-Meteo API.
            </p>
          </div>

          {/* Affected Households */}
          <div className="rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-8 shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Network className="size-4.5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400">main.py · lines 1117–1124</p>
                  <h3 className="font-sans text-base font-bold text-foreground dark:text-white">Affected Households Estimate</h3>
                </div>
              </div>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">households</span>
            </div>
            <pre className="rounded-xl bg-neutral-950 dark:bg-black/60 border border-white/[0.06] p-4 text-[11px] leading-relaxed font-mono text-neutral-200 overflow-x-auto">
{`load_factor     = clamp(0.65 + HI/200,
                        0.40, 0.95)
current_load_mw = MVA * load_factor * 0.90
residential_mw  = current_load_mw * 0.45

households = (residential_mw * 1000) / 0.70
# 0.70 kW = avg Indian household consumption`}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground dark:text-neutral-400 leading-relaxed">
              45% of transformer output assumed residential (per DISCOM load mix data). Indian average household
              consumption of 0.70 kW converts MW load to household count for operator situational awareness.
            </p>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          NEW SECTION 2: Duval Triangle Visualization
          ══════════════════════════════════════════════════════ */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> IEC 60599 / Duval Method
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Duval Triangle —{" "}
            <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">fault zone geometry.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Duval Triangle maps normalised gas ratios of CH₄, C₂H₄, and C₂H₂ to a fault zone.
            Each vertex of the equilateral triangle represents 100% of one gas. Points falling near different vertices
            are classified by the zone they land in, verified against boundaries in <code className="font-mono text-xs text-emerald-700 dark:text-[#d2f831]">duval.py</code>.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12 items-start">
          {/* SVG Triangle diagram */}
          <div className="rounded-[2rem] border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/90 p-6 sm:p-8 shadow-sm dark:shadow-lg lg:col-span-7">
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400 mb-5">
              Duval Triangle 1 — Ternary Fault Map (CH₄ · C₂H₄ · C₂H₂)
            </p>
            <svg viewBox="0 0 500 460" className="w-full max-w-lg mx-auto" aria-label="Duval Triangle fault zone diagram">
              {/* Background */}
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Main triangle outline */}
              {/* Vertices: top=CH4 (250,30), bottom-left=C2H2 (30,420), bottom-right=C2H4 (470,420) */}

              {/* PD zone — top apex: CH4 >= 98% */}
              <polygon points="250,30 210,100 290,100" fill="#818cf8" fillOpacity="0.35" stroke="#818cf8" strokeWidth="1" />

              {/* T1 zone — lower-left region: C2H2<4%, C2H4<20% */}
              <polygon points="210,100 30,420 150,420 230,260 290,100" fill="#34d399" fillOpacity="0.28" stroke="#34d399" strokeWidth="1" />

              {/* T2 zone — middle thermal: C2H2<4%, 20<=C2H4<=50% */}
              <polygon points="230,260 150,420 270,420" fill="#fbbf24" fillOpacity="0.28" stroke="#fbbf24" strokeWidth="1" />

              {/* T3 zone — right thermal: C2H2<15%, C2H4>50% */}
              <polygon points="270,420 390,420 310,260 230,260" fill="#f97316" fillOpacity="0.28" stroke="#f97316" strokeWidth="1" />

              {/* D2 zone — upper right: C2H2>=29%, C2H4>=23% */}
              <polygon points="290,100 470,420 390,420 310,260" fill="#f43f5e" fillOpacity="0.30" stroke="#f43f5e" strokeWidth="1" />

              {/* D1 zone — middle right: C2H2>=13%, C2H4<23% */}
              <polygon points="230,260 310,260 280,200 240,180" fill="#fb923c" fillOpacity="0.28" stroke="#fb923c" strokeWidth="1" />

              {/* DT mixed — center region */}
              <polygon points="240,180 280,200 310,260 270,420 150,420 230,260" fill="#a78bfa" fillOpacity="0.20" stroke="#a78bfa" strokeWidth="1" />

              {/* Outer triangle border */}
              <polygon points="250,30 30,420 470,420" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />

              {/* Zone labels */}
              <text x="250" y="78" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#a5b4fc" fontWeight="bold">PD</text>
              <text x="145" y="280" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#6ee7b7">T1</text>
              <text x="218" y="370" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#fde68a">T2</text>
              <text x="330" y="370" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#fed7aa">T3</text>
              <text x="380" y="280" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#fda4af">D2</text>
              <text x="268" y="230" textAnchor="middle" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#fdba74">D1</text>
              <text x="245" y="320" textAnchor="middle" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#c4b5fd">DT</text>

              {/* Vertex labels */}
              <text x="250" y="20" textAnchor="middle" fontSize="12" fontFamily="IBM Plex Mono, monospace" fill="currentColor" fontWeight="bold">CH₄</text>
              <text x="14" y="435" textAnchor="middle" fontSize="12" fontFamily="IBM Plex Mono, monospace" fill="currentColor" fontWeight="bold">C₂H₂</text>
              <text x="486" y="435" textAnchor="middle" fontSize="12" fontFamily="IBM Plex Mono, monospace" fill="currentColor" fontWeight="bold">C₂H₄</text>

              {/* Example TX-107 D2 point */}
              <circle cx="365" cy="245" r="6" fill="#f43f5e" stroke="white" strokeWidth="2" filter="url(#glow)" />
              <text x="378" y="240" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="#fda4af">TX-107</text>

              {/* Example TX-115 T3 point (post-intervention) */}
              <circle cx="305" cy="400" r="5" fill="#f97316" stroke="white" strokeWidth="2" />
              <text x="315" y="400" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="#fed7aa">TX-115</text>
            </svg>
          </div>

          {/* Zone definitions */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400 mb-4">
              Zone Boundary Logic — duval.py
            </p>
            {[
              {
                code: "PD",
                name: "Partial Discharge",
                rule: "%CH₄ ≥ 98%",
                detail: "Corona discharge in gas pockets; methane completely dominates gas mix",
                color: "border-indigo-500/40 bg-indigo-500/[0.06]",
                dot: "bg-indigo-400",
                text: "text-indigo-600 dark:text-indigo-400",
              },
              {
                code: "T1",
                name: "Thermal < 300°C",
                rule: "%C₂H₂ < 4% AND %C₂H₄ < 20%",
                detail: "Low-temperature paper/oil degradation; mostly methane, little ethylene",
                color: "border-emerald-500/40 bg-emerald-500/[0.06]",
                dot: "bg-emerald-400",
                text: "text-emerald-600 dark:text-emerald-400",
              },
              {
                code: "T2",
                name: "Thermal 300–700°C",
                rule: "%C₂H₂ < 4% AND 20% ≤ %C₂H₄ ≤ 50%",
                detail: "Mid-range overheating; rising ethylene from oil cracking",
                color: "border-amber-500/40 bg-amber-500/[0.06]",
                dot: "bg-amber-400",
                text: "text-amber-600 dark:text-amber-400",
              },
              {
                code: "T3",
                name: "Thermal > 700°C",
                rule: "%C₂H₂ < 15% AND %C₂H₄ > 50%",
                detail: "Severe overheating; ethylene dominant, acetylene just entering range",
                color: "border-orange-500/40 bg-orange-500/[0.06]",
                dot: "bg-orange-400",
                text: "text-orange-600 dark:text-orange-400",
              },
              {
                code: "D2",
                name: "High-energy Arcing",
                rule: "%C₂H₂ ≥ 29% AND %C₂H₄ ≥ 23%",
                detail: "Active arc between electrodes; acetylene + ethylene surge — most severe fault",
                color: "border-rose-500/40 bg-rose-500/[0.06]",
                dot: "bg-rose-500",
                text: "text-rose-600 dark:text-rose-400",
              },
              {
                code: "D1",
                name: "Low-energy Discharge",
                rule: "%C₂H₂ ≥ 13% AND %C₂H₄ < 23%",
                detail: "Intermittent sparking; acetylene elevated but ethylene still low",
                color: "border-red-500/40 bg-red-500/[0.06]",
                dot: "bg-red-400",
                text: "text-red-600 dark:text-red-400",
              },
              {
                code: "DT",
                name: "Mixed Fault",
                rule: "else (all other points)",
                detail: "Thermal + discharge co-existing; ambiguous zone requiring further sampling",
                color: "border-purple-500/40 bg-purple-500/[0.06]",
                dot: "bg-purple-400",
                text: "text-purple-600 dark:text-purple-400",
              },
            ].map(({ code, name, rule, detail, color, dot, text }) => (
              <div key={code} className={`rounded-xl border p-3.5 ${color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`size-2 rounded-full shrink-0 ${dot}`} />
                  <span className={`font-mono text-xs font-bold ${text}`}>{code}</span>
                  <span className="font-sans text-xs font-semibold text-foreground dark:text-white">{name}</span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground dark:text-neutral-400 mb-1 ml-4">{rule}</p>
                <p className="text-[10px] text-muted-foreground dark:text-neutral-400 ml-4 leading-snug">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          NEW SECTION 3: Gas-to-Fault Fingerprint Charts
          ══════════════════════════════════════════════════════ */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Gas Fingerprint Library
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            Which gas{" "}
            <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">drives which fault.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each fault type produces a distinct dissolved gas fingerprint. These signatures, derived from IEC 60599
            and validated on our Kaggle training set, are what the SHAP attribution translates into operator language.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              fault: "D2 — High-energy Arcing",
              sev: 0.90,
              color: "bg-rose-500",
              border: "border-rose-500/30",
              bg: "bg-rose-500/[0.04]",
              tag: "Fault Severity 0.90",
              tagColor: "text-rose-600 dark:text-rose-400",
              gases: [
                { name: "C₂H₂", ppm: 1800, rel: 100, note: "PRIMARY — active arcing indicator" },
                { name: "C₂H₄", ppm: 620, rel: 34, note: "Secondary — oil carbonisation" },
                { name: "H₂", ppm: 420, rel: 23, note: "Arc plasma dissociation" },
                { name: "CH₄", ppm: 110, rel: 6, note: "Trace thermal background" },
                { name: "C₂H₆", ppm: 35, rel: 2, note: "Minimal" },
              ],
            },
            {
              fault: "T3 — Thermal > 700°C",
              sev: 0.85,
              color: "bg-orange-500",
              border: "border-orange-500/30",
              bg: "bg-orange-500/[0.04]",
              tag: "Fault Severity 0.85",
              tagColor: "text-orange-600 dark:text-orange-400",
              gases: [
                { name: "C₂H₄", ppm: 2200, rel: 100, note: "PRIMARY — high-temp oil cracking" },
                { name: "CH₄", ppm: 980, rel: 45, note: "Thermal decomposition" },
                { name: "H₂", ppm: 650, rel: 30, note: "Oil pyrolysis" },
                { name: "C₂H₂", ppm: 280, rel: 13, note: "Trace (below D2 threshold)" },
                { name: "C₂H₆", ppm: 190, rel: 9, note: "Moderate" },
              ],
            },
            {
              fault: "D1 — Low-energy Discharge",
              sev: 0.75,
              color: "bg-amber-500",
              border: "border-amber-500/30",
              bg: "bg-amber-500/[0.04]",
              tag: "Fault Severity 0.75",
              tagColor: "text-amber-600 dark:text-amber-400",
              gases: [
                { name: "C₂H₂", ppm: 480, rel: 100, note: "PRIMARY — intermittent sparking" },
                { name: "H₂", ppm: 380, rel: 79, note: "Dielectric stress discharge" },
                { name: "C₂H₄", ppm: 95, rel: 20, note: "Below D2 ethylene threshold" },
                { name: "CH₄", ppm: 72, rel: 15, note: "Low thermal" },
                { name: "C₂H₆", ppm: 28, rel: 6, note: "Minimal" },
              ],
            },
            {
              fault: "T2 — Thermal 300–700°C",
              sev: 0.65,
              color: "bg-yellow-500",
              border: "border-yellow-500/30",
              bg: "bg-yellow-500/[0.04]",
              tag: "Fault Severity 0.65",
              tagColor: "text-yellow-600 dark:text-yellow-500",
              gases: [
                { name: "C₂H₄", ppm: 1100, rel: 100, note: "PRIMARY — mid-range thermal" },
                { name: "CH₄", ppm: 760, rel: 69, note: "Oil degradation" },
                { name: "H₂", ppm: 310, rel: 28, note: "Moderate" },
                { name: "C₂H₆", ppm: 140, rel: 13, note: "Oil cracking" },
                { name: "C₂H₂", ppm: 18, rel: 2, note: "Below 4% threshold (not D class)" },
              ],
            },
            {
              fault: "T1 — Thermal < 300°C",
              sev: 0.55,
              color: "bg-lime-500",
              border: "border-lime-500/30",
              bg: "bg-lime-500/[0.04]",
              tag: "Fault Severity 0.55",
              tagColor: "text-lime-600 dark:text-lime-400",
              gases: [
                { name: "CH₄", ppm: 850, rel: 100, note: "PRIMARY — low-temp overheating" },
                { name: "C₂H₆", ppm: 320, rel: 38, note: "Paper insulation degradation" },
                { name: "H₂", ppm: 180, rel: 21, note: "Moderate partial discharge" },
                { name: "C₂H₄", ppm: 75, rel: 9, note: "Low (below 20% threshold)" },
                { name: "C₂H₂", ppm: 6, rel: 1, note: "Negligible" },
              ],
            },
            {
              fault: "PD — Partial Discharge",
              sev: 0.50,
              color: "bg-indigo-500",
              border: "border-indigo-500/30",
              bg: "bg-indigo-500/[0.04]",
              tag: "Fault Severity 0.50",
              tagColor: "text-indigo-600 dark:text-indigo-400",
              gases: [
                { name: "H₂", ppm: 2400, rel: 100, note: "PRIMARY — corona discharge" },
                { name: "CH₄", ppm: 1960, rel: 82, note: "CH₄ ≥ 98% of C gases" },
                { name: "C₂H₆", ppm: 120, rel: 5, note: "Low" },
                { name: "C₂H₄", ppm: 40, rel: 2, note: "Very low" },
                { name: "C₂H₂", ppm: 8, rel: 0.3, note: "Negligible" },
              ],
            },
          ].map(({ fault, sev, color, border, bg, tag, tagColor, gases }) => (
            <div key={fault} className={`rounded-[2rem] border p-6 shadow-xs ${border} ${bg}`}>
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p className="font-sans text-sm font-bold text-foreground dark:text-white leading-tight">{fault}</p>
                  <p className={`font-mono text-[10px] font-bold mt-0.5 ${tagColor}`}>{tag}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="w-12 rounded-full bg-muted dark:bg-white/[0.08] h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${sev * 100}%` }} />
                  </div>
                  <span className={`font-mono text-[10px] font-bold ${tagColor}`}>{sev.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {gases.map(({ name, ppm, rel, note }) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-foreground dark:text-white">{name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground dark:text-neutral-400">{ppm} ppm</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted dark:bg-white/[0.08]">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${rel}%` }} />
                    </div>
                    <p className="mt-0.5 text-[9px] text-muted-foreground dark:text-neutral-500 italic">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          NEW SECTION 4: 4 Asset Archetypes
          ══════════════════════════════════════════════════════ */}
      <section className="mt-28">
        <div className="flex flex-col gap-2 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831]" /> Training Archetypes
          </p>
          <h2 className="font-sans text-3xl font-semibold sm:text-4xl text-foreground">
            4 Behavioural Archetypes in{" "}
            <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">the dataset.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The 18-transformer Anand District dataset was seeded with 4 distinct degradation patterns drawn from{" "}
            <code className="font-mono text-xs text-emerald-700 dark:text-[#d2f831]">generation_config.json</code>.
            Each archetype exercises a different combination of ML model inputs and validates the pipeline against
            a known expected trajectory.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            {
              id: "TX-107",
              archetype: "Electrical_Arcing",
              zone: "Zone-B",
              faultClass: "D2",
              hi: 81.4,
              rul: "3.7d",
              composite: 0.94,
              color: "border-rose-500/40 bg-rose-500/[0.04]",
              accentColor: "text-rose-600 dark:text-rose-400",
              accentBg: "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
              dot: "bg-rose-500",
              timeline: [
                { day: "Day 1", hi: 18.2, note: "Clean baseline" },
                { day: "Day 30", hi: 31.4, note: "C₂H₂ first detected" },
                { day: "Day 60", hi: 58.7, note: "D2 classification triggered" },
                { day: "Day 90", hi: 81.4, note: "CRITICAL — 3.7d RUL" },
              ],
              desc: "Characterized by a continuous, accelerating C₂H₂ surge indicative of persistent arc between LV and HV winding turns. No intervention in the dataset — used to train the failure-trajectory endpoint. Composite score 0.94 at Day 90.",
              primaryGas: "C₂H₂ → 1,840 ppm",
              secondaryGas: "C₂H₄ → 620 ppm",
            },
            {
              id: "TX-104",
              archetype: "Progressive_Thermal",
              zone: "Zone-A",
              faultClass: "T3",
              hi: 73.2,
              rul: "5.4d",
              composite: 0.87,
              color: "border-orange-500/40 bg-orange-500/[0.04]",
              accentColor: "text-orange-600 dark:text-orange-400",
              accentBg: "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400",
              dot: "bg-orange-500",
              timeline: [
                { day: "Day 1", hi: 21.0, note: "Normal operating temperature" },
                { day: "Day 25", hi: 35.6, note: "Summer load factor climbing" },
                { day: "Day 55", hi: 52.8, note: "T2 → T3 transition" },
                { day: "Day 90", hi: 73.2, note: "CRITICAL thermal — 5.4d RUL" },
              ],
              desc: "Thermal degradation driven by sustained overloading and summer ambient heat. C₂H₄ dominates the gas profile as ethylene rises above the 50% threshold. T3 class confirmed at Day 55 and sustained through Day 90.",
              primaryGas: "C₂H₄ → 2,140 ppm",
              secondaryGas: "CH₄ → 930 ppm",
            },
            {
              id: "TX-115",
              archetype: "Intervention_Recovery",
              zone: "Zone-C",
              faultClass: "D2 → Normal",
              hi: "71.3 → 36.1",
              rul: "7.7d → 97d",
              composite: "0.94 → 0.28",
              color: "border-emerald-500/40 bg-emerald-500/[0.04]",
              accentColor: "text-emerald-700 dark:text-emerald-400",
              accentBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
              dot: "bg-emerald-500",
              timeline: [
                { day: "Day 60", hi: 52.1, note: "D2 arcing first flagged HIGH" },
                { day: "Day 78", hi: 71.3, note: "CRITICAL — IBM Bob advisory issued" },
                { day: "Day 79", hi: 67.8, note: "Crew deployed · oil drained" },
                { day: "Day 89", hi: 36.1, note: "Recovery complete · 97d RUL" },
              ],
              desc: "The showcase archetype. Pre-failure intervention at Day 78 when VOLTRA issued a CRITICAL D2 advisory. Oil drainage and insulation inspection reversed the degradation trajectory. RUL recovered +89.4 days — representing an estimated ₹4.2Cr avoided outage cost.",
              primaryGas: "C₂H₂: 1,420 → 48 ppm",
              secondaryGas: "H₂: 810 → 95 ppm",
            },
            {
              id: "TX-112",
              archetype: "Shock_PD",
              zone: "Zone-D",
              faultClass: "PD",
              hi: 44.8,
              rul: "63d",
              composite: 0.51,
              color: "border-indigo-500/40 bg-indigo-500/[0.04]",
              accentColor: "text-indigo-600 dark:text-indigo-400",
              accentBg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400",
              dot: "bg-indigo-500",
              timeline: [
                { day: "Day 1", hi: 16.4, note: "Normal baseline" },
                { day: "Day 18", hi: 28.9, note: "H₂ spike — lightning storm" },
                { day: "Day 42", hi: 38.2, note: "PD classification → MEDIUM" },
                { day: "Day 90", hi: 44.8, note: "Stable HIGH · watch mode" },
              ],
              desc: "Partial discharge triggered by a transient over-voltage event (lightning). H₂ and CH₄ dominate the gas profile (%CH₄ > 95%). The transformer stabilises at MEDIUM-HIGH risk without progressive worsening — validating that PD without thermal co-factor has lower urgency.",
              primaryGas: "H₂ → 2,380 ppm",
              secondaryGas: "CH₄ → 1,950 ppm",
            },
          ].map(({ id, archetype, zone, faultClass, hi, rul, composite, color, accentColor, accentBg, dot, timeline, desc, primaryGas, secondaryGas }) => (
            <div key={id} className={`rounded-[2rem] border p-6 sm:p-8 shadow-sm ${color}`}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`size-2.5 rounded-full ${dot}`} />
                    <p className="font-mono text-sm font-bold text-foreground dark:text-white">{id}</p>
                    <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold ${accentBg}`}>
                      {archetype}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-neutral-400 font-mono">{zone} · Fault: {faultClass}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-xl font-bold ${accentColor}`}>HI: {hi}</p>
                  <p className="font-mono text-[10px] text-muted-foreground dark:text-neutral-400">RUL: {rul}</p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground dark:text-neutral-300 mb-5">{desc}</p>

              {/* Gas highlights */}
              <div className="flex gap-3 mb-5">
                <div className="flex-1 rounded-xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground dark:text-neutral-400 mb-1">Primary Gas</p>
                  <p className={`font-mono text-xs font-bold ${accentColor}`}>{primaryGas}</p>
                </div>
                <div className="flex-1 rounded-xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-black/40 p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground dark:text-neutral-400 mb-1">Secondary Gas</p>
                  <p className="font-mono text-xs font-bold text-foreground dark:text-white">{secondaryGas}</p>
                </div>
              </div>

              {/* 90-day timeline */}
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground dark:text-neutral-400 mb-3">90-Day Trajectory</p>
                <div className="relative pl-4">
                  <div className="absolute left-1.5 top-1.5 bottom-1.5 w-px bg-border dark:bg-white/[0.08]" />
                  <div className="space-y-3">
                    {timeline.map(({ day, hi: tHi, note }) => (
                      <div key={day} className="relative flex items-start gap-3">
                        <div className={`absolute -left-3 mt-1 size-2 rounded-full border-2 border-card dark:border-[#111215] ${dot}`} />
                        <div className="ml-3">
                          <p className="font-mono text-[10px] font-bold text-foreground dark:text-white">{day} · HI = {tHi}</p>
                          <p className="text-[10px] text-muted-foreground dark:text-neutral-400">{note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border dark:border-white/[0.08] flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground dark:text-neutral-400">Composite score</span>
                <span className={`font-bold ${accentColor}`}>{composite}</span>
              </div>
            </div>
          ))}
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
