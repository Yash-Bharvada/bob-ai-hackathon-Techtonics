import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  Clock3,
  CloudLightning,
  Database,
  Gauge,
  Radio,
  ShieldCheck,
  Zap,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GridDiagram } from "@/components/GridDiagram";
import { TX115InterventionBanner } from "@/components/TX115InterventionBanner";
import homeImage from "@/assets/voltra-home.jpg";
import gridImage from "@/assets/voltra-grid.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VOLTRA — Predictive Grid Intelligence · Techtonics" },
      {
        name: "description",
        content:
          "VOLTRA combines two trained ML models (Health Index regression + DGA classification) to forecast outages before equipment failure.",
      },
      { property: "og:title", content: "VOLTRA — Predictive Grid Intelligence" },
      {
        property: "og:description",
        content: "The lights have not gone out yet. VOLTRA sees that they are going to.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const history = [
  { time: "Day 60", load: 65, health: 86 },
  { time: "Day 68", load: 72, health: 81 },
  { time: "Day 75", load: 84, health: 64 },
  { time: "Day 78", load: 92, health: 28 }, // TX-115 Peak degradation
  { time: "Day 80", load: 60, health: 45 }, // Maintenance
  { time: "Day 85", load: 62, health: 62 },
  { time: "Day 89", load: 62, health: 64 }, // Stabilized
];

function Home() {
  return (
    <div className="overflow-hidden pt-5">
      <Hero />
      <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
        <TX115InterventionBanner />
      </div>
      <Problem />
      <Pipeline />
      <CinematicGrid />
      <Dashboard />
      <FaultAnalysis />
      <Analytics />
      <Action />
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto mt-5 w-full max-w-6xl px-4 sm:px-6">
      <div className="relative min-h-[650px] overflow-hidden rounded-[2rem] md:min-h-[700px]">
        <img
          src={homeImage}
          alt="A powered modern home beside monitored transmission lines at dusk"
          width={1600}
          height={1050}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--ink)_42%,transparent),color-mix(in_oklab,var(--ink)_6%,transparent)_50%,color-mix(in_oklab,var(--ink)_70%,transparent))]" />
        <div className="relative flex min-h-[650px] flex-col justify-between p-6 text-cream sm:p-10 md:min-h-[700px] md:p-14">
          <div className="flex items-center justify-between text-xs">
            <span className="glass-dark pill inline-flex items-center gap-2 px-3 py-1.5 font-mono">
              <span className="size-1.5 animate-pulse rounded-full bg-signal" />
              ANAND DISTRICT GRID · 18 TRANSFORMERS ACTIVE
            </span>
            <span className="hidden text-cream/70 sm:block font-mono">
              Techtonics · Bobathon AI Submission
            </span>
          </div>

          <div className="max-w-3xl">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-cream/70 font-mono">
              See the failure before it happens
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] sm:text-6xl md:text-7xl">
              Power shouldn't fail
              <br />
              <span className="font-display font-normal italic text-signal">
                before you're warned.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-cream/80 sm:text-base">
              VOLTRA combines two machine learning models trained on Kaggle transformer datasets —
              Health Index regression (R²=0.72) and DGA Fault Classification (90.8% accuracy) — with
              IBM Bob plain-English advisories to turn catastrophic failures into scheduled
              interventions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="pill h-12 bg-signal px-6 text-signal-foreground hover:bg-signal/90 font-semibold shadow-glow"
              >
                <Link to="/grid">
                  Explore Live Grid Console <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="pill h-12 border-cream/20 bg-cream/10 px-6 text-cream backdrop-blur hover:bg-cream/20 hover:text-cream"
              >
                <Link to="/predict">
                  Run Dual ML Prediction <Activity className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["90.8%", "DGA Model Accuracy (Model 2)"],
              ["R² = 0.72", "Health Index Regression (Model 1)"],
              ["+89 Days", "TX-115 Rescued RUL"],
            ].map(([v, l]) => (
              <div key={l} className="glass-dark rounded-2xl p-4">
                <p className="text-2xl font-bold font-mono">{v}</p>
                <p className="mt-1 text-xs text-cream/70">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-6">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            The problem
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            Yesterday's grid tools respond{" "}
            <span className="font-display font-normal italic">after the dark.</span>
          </h2>
          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
            Calendar-based maintenance dispatches crews reactively at 3-7x the cost of planned
            intervention, while transformer sensors show warning signatures weeks before
            catastrophic breakdown.
          </p>
        </div>
        <div className="grid gap-4 md:col-span-8 md:grid-cols-2">
          <FlowPanel
            title="Traditional response"
            tone="muted"
            items={[
              "Winding arcing or overheating initiates",
              "Insulation breaks down; blackout occurs",
              "Outage registered by customer calls",
              "Emergency crew dispatched at $1M+/hr",
            ]}
            footer="The outage has already happened."
          />
          <FlowPanel
            title="The VOLTRA approach"
            tone="signal"
            items={[
              "Continuous DGA telemetry monitoring",
              "Model 1 predicts Health Index damage",
              "Model 2 classifies exact fault mode (D1/T1)",
              "IBM Bob advises targeted intervention",
            ]}
            footer="Downtime prevented. 89 days recovered on TX-115."
          />
        </div>
      </div>
    </section>
  );
}

function FlowPanel({
  title,
  tone,
  items,
  footer,
}: {
  title: string;
  tone: "muted" | "signal";
  items: string[];
  footer: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-border/60 p-6 ${tone === "signal" ? "bg-signal/20" : "glass"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span
          className={`size-2 rounded-full ${tone === "signal" ? "bg-signal" : "bg-muted-foreground"}`}
        />
      </div>
      <div className="mt-8 space-y-2">
        {items.map((item, i) => (
          <div key={item}>
            <div className="flex items-center gap-3 rounded-xl bg-surface/70 px-4 py-3 text-sm">
              <span className="grid size-6 place-items-center rounded-full bg-ink text-[10px] text-cream font-mono">
                {i + 1}
              </span>
              {item}
            </div>
            {i < items.length - 1 && <div className="ml-7 h-3 w-px bg-border" />}
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">{footer}</p>
    </div>
  );
}

function Pipeline() {
  const steps = [
    {
      i: Database,
      t: "Real DGA Data",
      d: "Kaggle failure analysis (4,151 rows) & Health Index reference.",
    },
    { i: Radio, t: "Telemetry Stream", d: "18 transformers across 4 Anand District sub-zones." },
    {
      i: Activity,
      t: "Model 1 Regression",
      d: "Health Index damage score (R²=0.72) + calibrated RUL.",
    },
    {
      i: BrainCircuit,
      t: "Model 2 Classifier",
      d: "7 IEC fault types with Duval triangle gas ratios (90.8% acc).",
    },
    {
      i: Gauge,
      t: "Composite Ranking",
      d: "Defensible 5-factor impact formula + IBM Bob advisories.",
    },
  ];
  return (
    <section className="mt-24 border-y border-border/60 bg-ink py-20 text-cream">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.18em] text-signal font-mono">
            The intelligence layer
          </p>
          <h2 className="mt-4 text-4xl font-semibold md:text-5xl">
            From raw gas ppm to an{" "}
            <span className="font-display font-normal italic">actionable forecast.</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-3 md:grid-cols-5">
          {steps.map(({ i: Icon, t, d }, idx) => (
            <div key={t} className="relative rounded-2xl border border-cream/10 bg-cream/5 p-5">
              <div className="flex items-center justify-between">
                <Icon className="size-5 text-signal" />
                <span className="text-[10px] text-cream/40 font-mono">0{idx + 1}</span>
              </div>
              <p className="mt-10 font-semibold">{t}</p>
              <p className="mt-2 text-xs leading-relaxed text-cream/55">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CinematicGrid() {
  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            A fault, caught upstream
          </p>
          <h2 className="mt-3 text-4xl font-semibold md:text-5xl">
            Power is still flowing.{" "}
            <span className="font-display font-normal italic">VOLTRA is already watching.</span>
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Critical arcing gas (C2H2) detected at TX-107 before downstream feeder trips occur.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-[2rem]">
        <img
          src={gridImage}
          alt="Transmission towers monitored during an approaching electrical anomaly"
          width={1600}
          height={900}
          loading="lazy"
          className="h-[520px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/10" />
        <div className="absolute inset-x-[12%] top-[46%] h-0.5 power-line" />
        <div className="absolute bottom-6 left-6 right-6 grid gap-3 sm:grid-cols-3">
          <div className="glass-dark rounded-2xl p-4">
            <p className="text-[10px] uppercase text-cream/50 font-mono">Highest Impact Asset</p>
            <p className="mt-1 text-sm text-cream font-bold">TX-107 · Electrical Arcing</p>
          </div>
          <div className="glass-dark rounded-2xl p-4">
            <p className="text-[10px] uppercase text-cream/50 font-mono">Substation Node</p>
            <p className="mt-1 text-sm text-cream">GIDC Industrial Phase-2</p>
          </div>
          <div className="rounded-2xl bg-danger p-4 text-white">
            <p className="text-[10px] uppercase opacity-70 font-mono">Failure Urgency</p>
            <p className="mt-1 text-2xl font-bold font-mono">RUL 33.2 Days</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dashboard() {
  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-6">
      <div className="grid gap-8 lg:grid-cols-[.85fr_1.6fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            Live Grid Topology
          </p>
          <h2 className="mt-4 text-4xl font-semibold">
            A clear view of{" "}
            <span className="font-display font-normal italic">what changes next.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Healthy substations stay quiet. Emerging equipment risks rise into view with SHAP
            feature explainability and IBM Bob plain-English advisories.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Metric icon={ShieldCheck} value="18" label="Assets Monitored" status="Online" />
            <Metric
              icon={AlertTriangle}
              value="02"
              label="Critical High Risk"
              status="TX-107, TX-112"
            />
            <Metric icon={Activity} value="02" label="Watch Tier" status="TX-104, TX-115" />
            <Metric icon={Clock3} value="89.4d" label="Mean RUL" status="Fleet Wide" />
          </div>
        </div>
        <div className="glass rounded-3xl p-3">
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm font-semibold">Anand District Regional Sub-Transmission</p>
              <p className="text-[10px] text-muted-foreground font-mono">LIVE · 5 NODES MAPPED</p>
            </div>
            <span className="pill bg-signal/20 px-3 py-1 text-[10px] font-medium font-mono">
              SYNCHRONIZED
            </span>
          </div>
          <GridDiagram />
        </div>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  status,
}: {
  icon: typeof Activity;
  value: string;
  label: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-4 text-2xl font-bold font-mono text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-[10px] uppercase font-mono text-foreground">● {status}</p>
    </div>
  );
}

function FaultAnalysis() {
  const factors = [
    ["Acetylene Arcing Gas (C2H2)", 92],
    ["Methane Thermal Concentration (CH4)", 78],
    ["Hydrogen Surge (H2)", 68],
    ["Dielectric Rigidity Breakdown", 54],
  ] as const;

  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-6">
      <div className="glass-dark overflow-hidden rounded-[2rem] p-6 md:p-10">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-signal font-mono">
              <AlertTriangle className="size-4 text-danger" />
              <span className="text-danger font-semibold">CRITICAL FAULT DETECTED</span>
            </div>
            <h2 className="mt-5 text-4xl font-semibold text-cream">TX-107 · Electrical Arcing</h2>
            <p className="mt-3 text-sm text-cream/65">
              DGA sensors detect high-energy electrical discharge (D1/D2) inside the main tank at
              GIDC Phase-2 Heavy Industry.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div>
                <p className="text-3xl font-bold font-mono text-danger">HI 56.4</p>
                <p className="text-[10px] text-cream/45 font-mono">DAMAGE SCORE</p>
              </div>
              <div>
                <p className="text-3xl font-bold font-mono text-cream">33.2d</p>
                <p className="text-[10px] text-cream/45 font-mono">REMAINING LIFE</p>
              </div>
              <div>
                <p className="text-3xl font-bold font-mono text-signal">25 MVA</p>
                <p className="text-[10px] text-cream/45 font-mono">RATED CAPACITY</p>
              </div>
            </div>
            <Button
              asChild
              className="pill mt-8 bg-signal text-signal-foreground hover:bg-signal/90 font-semibold shadow-glow"
            >
              <Link to="/predict">
                Simulate in Outage Studio <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl bg-cream/5 p-5">
            <p className="text-xs uppercase text-cream/45 font-mono">SHAP Feature Impact on Risk</p>
            <div className="mt-6 space-y-5">
              {factors.map(([name, v]) => (
                <div key={name}>
                  <div className="mb-2 flex justify-between text-xs text-cream/80 font-mono">
                    <span>{name}</span>
                    <span>{v}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cream/10">
                    <div className="h-full rounded-full bg-signal" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Analytics() {
  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            Fleet Trajectory
          </p>
          <h2 className="mt-4 text-4xl font-semibold">
            Track degradation &{" "}
            <span className="font-display font-normal italic">maintenance recovery.</span>
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Demonstrating TX-115 recovery trajectory over the 90-day monitoring window.
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              TX-115 Trajectory: Peak Degradation to Rebound
            </p>
            <span className="text-[10px] font-mono text-muted-foreground">HEALTH % / LOAD MVA</span>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="load" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-signal)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-signal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="health"
                  name="Health %"
                  stroke="var(--color-signal)"
                  fill="url(#load)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="load"
                  name="Load (MVA)"
                  stroke="var(--color-foreground)"
                  fill="transparent"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-3xl bg-signal p-6 text-signal-foreground flex flex-col justify-between">
          <div>
            <Wrench className="size-6" />
            <p className="mt-8 text-5xl font-bold font-mono">+89d</p>
            <p className="mt-2 text-sm font-semibold">Asset Life Recovered</p>
          </div>
          <p className="mt-4 text-xs leading-relaxed opacity-75">
            Timely fan overhaul and 20% load curtailment on Day 78 prevented a blackout on TX-115,
            returning RUL from 7.7 to 97 days.
          </p>
        </div>
      </div>
    </section>
  );
}

function Action() {
  const [sent, setSent] = useState(false);
  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-6 pb-16">
      <div className="rounded-[2rem] border border-border/60 bg-signal p-8 text-signal-foreground md:p-14">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] opacity-70 font-mono">
              Grid Risk Advisor · Team Techtonics
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold md:text-6xl">
              Make sure the lights <span className="font-display font-normal italic">stay on.</span>
            </h2>
          </div>
          <div>
            <p className="text-sm leading-relaxed opacity-80">
              Explore the live operator console to inspect all 18 transformers and the 7-day
              maintenance plan.
            </p>
            <Button
              asChild
              className="pill mt-6 bg-ink text-cream hover:bg-ink/90 font-semibold shadow-soft"
            >
              <Link to="/grid">
                Open Operator Console <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
