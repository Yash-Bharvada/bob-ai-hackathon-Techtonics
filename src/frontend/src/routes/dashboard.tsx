import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Activity,
  BrainCircuit,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Lock,
  LogIn,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  X,
  Zap,
} from "lucide-react";

import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { AuthModal } from "@/components/AuthModal";
import { LocationPromptModal } from "@/components/LocationPromptModal";
import { authSession, type OperatorProfile, type UserLocationState } from "@/lib/authSession";
import { techtonicsApi, type RankedAsset, type MaintenanceAction } from "@/lib/techtonicsApi";
import { initialGridAssets } from "@/lib/gridData";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · VOLTRA Grid Risk Advisor" },
      { name: "description", content: "Enterprise grid intelligence dashboard. Live model-driven asset health, risk scores, and AI recommendations for the Anand District transmission network." },
    ],
  }),
  component: DashboardPage,
});

function getRiskColor(score: number) {
  if (score >= 70) return "text-red-400";
  if (score >= 40) return "text-amber-400";
  return "text-emerald-400";
}

function getRiskBg(score: number) {
  if (score >= 70) return "bg-red-500/15 border-red-500/30";
  if (score >= 40) return "bg-amber-500/15 border-amber-500/30";
  return "bg-emerald-500/15 border-emerald-500/30";
}

function getRiskLabel(score: number) {
  if (score >= 70) return "High Risk";
  if (score >= 40) return "Watch";
  return "Healthy";
}

function hiToRisk(hi: number) {
  return Math.min(100, Math.round((hi / 90) * 100));
}

const DEFAULT_PROFILE: OperatorProfile = {
  name: "Grid Operator",
  email: "operator@anand-grid.gov.in",
  role: "Regional Dispatch Engineer",
  zone: "Zone-B · Industrial",
  substation: "GIDC Industrial Phase-2",
};

function DashboardPage() {
  const [profile, setProfile] = useState<OperatorProfile>(() => authSession.getProfile() ?? DEFAULT_PROFILE);
  const [location, setLocation] = useState<UserLocationState>(() => authSession.getLocation());
  const [mounted, setMounted] = useState(false);
  // isAuthed derived from mounted — placed here so auth-gated useEffect can reference it
  const isAuthed = mounted && authSession.isAuthenticated();
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [rankedAssets, setRankedAssets] = useState<RankedAsset[]>([]);
  const [planActions, setPlanActions] = useState<MaintenanceAction[]>([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [liveWeather, setLiveWeather] = useState<{
    temperature_c: number;
    humidity_pct: number;
    thermal_stress_pct: number;
  }>({ temperature_c: 33.4, humidity_pct: 61, thermal_stress_pct: 22 });
  const [incidents, setIncidents] = useState<any[]>([]);
  const [securityStats, setSecurityStats] = useState<{ processed: number; verified: number; quarantined: number; blocked: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!mounted) return; // wait for auth check
    if (!isAuthed) return; // guests see static curated data

    techtonicsApi.getRanked().then((res) => {
      if (res.ranked_assets?.length) { setRankedAssets(res.ranked_assets); setApiConnected(true); }
    }).catch(() => setApiConnected(false));

    techtonicsApi.getPlan().then((res) => {
      if (res.top_10_actions?.length) { setPlanActions(res.top_10_actions); }
    }).catch(() => {});

    techtonicsApi.getEventStats().then((stats) => {
      setSecurityStats(stats);
    }).catch(() => {});

    techtonicsApi.fetchLiveWeather(location.latitude, location.longitude)
      .then((wx) => setLiveWeather({ temperature_c: wx.temperature_c, humidity_pct: wx.humidity_pct, thermal_stress_pct: wx.thermal_stress_pct }))
      .catch(() => {});

    techtonicsApi.searchPastEvents("", "").then((res) => {
      if (res.events?.length) setIncidents(res.events.slice(0, 3));
    }).catch(() => {});
  }, [mounted, isAuthed, location.latitude, location.longitude]);

  const displayAssets = useMemo(() => {
    if (rankedAssets.length > 0) {
      return rankedAssets.map((r) => {
        const base = initialGridAssets.find((a) => a.id === r.asset_id);
        const hi = r.health_index;
        const rul = r.RUL_days;
        const riskScore = hiToRisk(hi);
        return {
          id: r.asset_id,
          name: base?.name || `${r.asset_id} · ${r.mva_rating || 25} MVA Substation`,
          substation: r.substation_name || base?.substation || "Anand Substation",
          region: r.grid_zone || base?.region || "Anand Zone",
          type: "Transformer" as const,
          voltageKv: parseInt(r.voltage_kv || "66", 10) || base?.voltageKv || 66,
          nominalVoltageKv: parseInt(r.voltage_kv || "66", 10) || base?.nominalVoltageKv || 66,
          currentLoadMw: r.current_load_mw ?? base?.currentLoadMw ?? 20.0,
          ratedCapacityMw: r.mva_rating ?? base?.ratedCapacityMw ?? 25.0,
          frequencyHz: 50.0,
          coreTempC: r.core_temp_c != null ? Number(r.core_temp_c.toFixed(1)) : (base?.coreTempC ?? 75.0),
          healthScore: Math.max(5, Math.min(99, Math.round(100 - hi))),
          healthIndexRaw: hi,
          rulDays: rul,
          faultType: r.fault_type,
          status: (r.risk_tier === "CRITICAL" || r.risk_tier === "HIGH") ? ("risk" as const) : r.risk_tier === "MEDIUM" ? ("watch" as const) : ("stable" as const),
          riskTier: r.risk_tier,
          compositeScore: r.composite_score,
          criticality: r.criticality_tier || "Critical",
          archetype: r.archetype || base?.archetype || "Standard Asset",
          activeAnomalies: (r.risk_tier === "CRITICAL" || r.risk_tier === "HIGH") ? 3 : r.risk_tier === "MEDIUM" ? 1 : 0,
          lastInspected: base?.lastInspected || "Not on record",
          coolingType: base?.coolingType || "ONAF",
          sf6PressureBar: 5.2,
          acousticDba: 68.0,
          top3Shap: r.top_3_shap || base?.top3Shap,
          telemetryHistory: base?.telemetryHistory || [],
          incidentLog: base?.incidentLog || [],
          hi,
          rul,
          riskScore,
        };
      }).sort((a, b) => b.riskScore - a.riskScore);
    }

    return initialGridAssets.map((a) => {
      const hi = a.healthIndexRaw;
      const rul = a.rulDays;
      const riskScore = hiToRisk(hi);
      return { ...a, hi, rul, riskScore };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, [rankedAssets]);

  const criticalCount = displayAssets.filter((a) => a.riskScore >= 70).length;
  const watchCount = displayAssets.filter((a) => a.riskScore >= 40 && a.riskScore < 70).length;
  const avgHI = displayAssets.reduce((s, a) => s + a.hi, 0) / (displayAssets.length || 1);
  const avgRiskScore = Math.round(displayAssets.reduce((s, a) => s + a.riskScore, 0) / (displayAssets.length || 1));
  const fleetHealth = Math.round(100 - avgHI);
  const predictedFailures = displayAssets.filter((a) => a.rul < 40).length;
  const topCriticalAsset = displayAssets[0];

  const chartData = useMemo(() => {
    return displayAssets.slice(0, 8).map((a) => ({
      name: a.id.replace("TX-", ""),
      risk: a.riskScore,
      hi: parseFloat(a.hi.toFixed(1)),
    }));
  }, [displayAssets]);

  const recommendations = useMemo(() => {
    if (planActions.length > 0) {
      return planActions.slice(0, 3).map((act, idx) => ({
        rank: `0${idx + 1}`,
        asset: act.asset_id,
        action: `${act.short_action} (${act.urgency_window ? "Due " + act.urgency_window : act.crew_assignment})`,
        confidence: act.risk_tier === "HIGH" ? 94 : act.risk_tier === "MEDIUM" ? 82 : 75,
        priority: (act.risk_tier === "HIGH" ? "HIGH" : act.risk_tier === "MEDIUM" ? "MEDIUM" : "LOW") as "HIGH" | "MEDIUM" | "LOW",
        detail: act.detail,
      }));
    }
    return [
      topCriticalAsset && {
        rank: "01", asset: topCriticalAsset.id,
        action: topCriticalAsset.riskScore >= 70 ? "Initiate emergency load curtailment and DGA syringe sampling." : "Schedule inspection within this maintenance cycle.",
        confidence: topCriticalAsset.riskScore > 70 ? 94 : 78,
        priority: (topCriticalAsset.riskScore > 70 ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
      },
      displayAssets[1] && {
        rank: "02", asset: displayAssets[1].id,
        action: "Monitor thermal gradient; verify forced-air cooling relay circuit.",
        confidence: 82, priority: (displayAssets[1].riskScore > 70 ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
      },
      {
        rank: "03", asset: "Fleet-Wide",
        action: `Ambient ${liveWeather.temperature_c.toFixed(1)}°C elevates thermal stress. Review cooling headroom across all monitored assets.`,
        confidence: 71, priority: "LOW" as const,
      },
    ].filter(Boolean) as { rank: string; asset: string; action: string; confidence: number; priority: "HIGH" | "MEDIUM" | "LOW" }[];
  }, [planActions, topCriticalAsset, displayAssets, liveWeather.temperature_c]);

  // (isAuthed + guestBannerDismissed declared above near mounted)

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">

      {/* ── Guest Preview Banner ── */}
      {!isAuthed && !guestBannerDismissed && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="shrink-0 size-7 grid place-items-center rounded-full bg-amber-500/20">
              <Lock className="size-3.5 text-amber-400" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-amber-300 text-xs sm:text-sm">Preview Mode — Curated ML Snapshot Data</p>
              <p className="text-[11px] text-muted-foreground truncate">Sign in to unlock live model inference, Groq AI reports, and real-time grid telemetry.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-amber-400 transition-colors">
              <LogIn className="size-3" /> Sign In
            </Link>
            <button onClick={() => setGuestBannerDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-500">Operational</span>
            {currentTime && <><span className="text-muted-foreground/40 text-xs">·</span><span className="text-[11px] font-mono text-muted-foreground">{currentTime}</span></>}
            {apiConnected && <><span className="text-muted-foreground/40 text-xs">·</span><span className="text-[11px] font-mono text-emerald-500/80">FastAPI Live</span></>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {profile.name.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {profile.substation} · {profile.zone.split("·")[0].trim()} · Anand District Transmission Network
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setLocationModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <Compass className="size-3.5 text-primary" />{location.autoDetected ? "GPS" : "Manual"} · {location.latitude.toFixed(2)}°N
          </button>
          <button onClick={() => setAuthModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
            <User className="size-3.5" />{profile.role}
          </button>
          <Link to="/grid" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            <Zap className="size-3.5" />Live Grid
          </Link>
        </div>
      </div>

      {/* ── 4 KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Fleet Health</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="font-mono text-2xl font-bold text-emerald-400">{fleetHealth}%</p>
            <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5"><TrendingUp className="size-3" />Model 1</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${fleetHealth}%` }} />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Avg Health Index: {avgHI.toFixed(1)}</p>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4">
          <p className="text-[10px] uppercase tracking-widest text-red-400 font-mono">High-Risk Assets</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="font-mono text-2xl font-bold text-red-400">{String(criticalCount).padStart(2, "0")}</p>
            <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-0.5"><AlertTriangle className="size-3" />{watchCount} Watch</span>
          </div>
          <div className="mt-2.5 flex gap-1">
            {displayAssets.filter(a => a.riskScore >= 70).slice(0, 4).map(a => (
              <span key={a.id} className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-400">{a.id}</span>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-red-400/80">Requires immediate dispatch</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Grid Risk Index</p>
          <div className="mt-2 flex items-end justify-between">
            <p className={`font-mono text-2xl font-bold ${getRiskColor(avgRiskScore)}`}>{avgRiskScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${getRiskBg(avgRiskScore)} ${getRiskColor(avgRiskScore)}`}>
              {avgRiskScore >= 70 ? "HIGH" : avgRiskScore >= 40 ? "MODERATE" : "LOW"}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${avgRiskScore >= 70 ? "bg-red-500" : avgRiskScore >= 40 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${avgRiskScore}%` }} />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Composite infrastructure risk</p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
          <p className="text-[10px] uppercase tracking-widest text-amber-400 font-mono">RUL &lt; 40 Days</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="font-mono text-2xl font-bold text-amber-400">{String(predictedFailures).padStart(2, "0")}</p>
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-0.5"><Clock className="size-3" />within 40d</span>
          </div>
          <div className="mt-2.5 flex gap-1">
            {displayAssets.filter(a => a.rul < 40).slice(0, 3).map(a => (
              <span key={a.id} className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-400">{a.id}</span>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-amber-400/80">Predictive decay model (Model 1)</p>
        </div>
      </div>

      {/* ── Main: Chart + Critical Asset ── */}
      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Asset Risk Overview</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Composite risk score per transformer (0–100) · Model 1 + Model 2</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground"><span className="size-2 rounded-full bg-red-500" />Critical</span>
              <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground"><span className="size-2 rounded-full bg-amber-500" />Watch</span>
              <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground"><span className="size-2 rounded-full bg-emerald-500" />Healthy</span>
            </div>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem", fontSize: "0.7rem" }} formatter={(v: any) => [v, "Risk Score"]} />
                <Bar dataKey="risk" radius={[3, 3, 0, 0]}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.risk >= 70 ? "#ef4444" : e.risk >= 40 ? "#f59e0b" : "#10b981"} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
            <div className="flex-1 h-px border-t border-dashed border-red-500/40" />
            <span className="text-[9px] font-mono text-red-400/60 whitespace-nowrap">Critical Risk Threshold (70)</span>
            <div className="flex-1 h-px border-t border-dashed border-red-500/40" />
          </div>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Critical Asset Alert</h2>
            <span className="relative flex size-2"><span className="absolute animate-ping size-full rounded-full bg-red-400 opacity-75" /><span className="relative size-2 rounded-full bg-red-500" /></span>
          </div>
          {topCriticalAsset && (
            <div className="flex flex-col flex-1">
              <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-foreground">{topCriticalAsset.id}</span>
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${getRiskBg(topCriticalAsset.riskScore)} ${getRiskColor(topCriticalAsset.riskScore)}`}>
                    {getRiskLabel(topCriticalAsset.riskScore).toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{topCriticalAsset.substation}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: "Health Index", value: topCriticalAsset.hi.toFixed(1), unit: "HI", danger: topCriticalAsset.hi > 50 },
                  { label: "Remaining Life", value: String(topCriticalAsset.rul), unit: "days", danger: topCriticalAsset.rul < 40 },
                  { label: "Core Temp", value: `${topCriticalAsset.coreTempC}°C`, unit: "", danger: topCriticalAsset.coreTempC > 75 },
                  { label: "Fault Class", value: `IEC ${topCriticalAsset.faultType}`, unit: "", danger: topCriticalAsset.faultType !== "NF" },
                ].map(({ label, value, unit, danger }) => (
                  <div key={label} className="rounded-lg bg-muted/40 p-2.5">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">{label}</p>
                    <p className={`mt-0.5 font-mono text-sm font-bold ${danger ? "text-red-400" : "text-foreground"}`}>
                      {value}{unit && <span className="text-[10px] font-normal text-muted-foreground ml-1">{unit}</span>}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 mb-3">
                <p className="text-[9px] uppercase tracking-widest text-amber-400 font-mono mb-1">Recommended Action</p>
                <p className="text-xs font-semibold text-foreground">
                  {topCriticalAsset.riskScore >= 70 ? "Prepare Immediate Curtailment" : "Schedule Priority Inspection"}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground leading-relaxed">
                  {topCriticalAsset.riskScore >= 70
                    ? "Elevated thermal and electrical stress. Asset becomes critical under peak load."
                    : "Health index trending upward. Preventive maintenance recommended this cycle."}
                </p>
              </div>
              <Link to="/grid" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                View Asset in Grid <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Weather + Fleet Table ── */}
      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Ambient Conditions</h2>
            <span className="text-[9px] font-mono text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">Open-Meteo</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Ambient Temp", value: `${liveWeather.temperature_c.toFixed(1)}°C`, pct: Math.min(100, (liveWeather.temperature_c / 50) * 100), danger: liveWeather.temperature_c > 38, warn: liveWeather.temperature_c > 32 },
              { label: "Humidity", value: `${liveWeather.humidity_pct.toFixed(0)}%`, pct: liveWeather.humidity_pct, danger: false, warn: liveWeather.humidity_pct > 75, blue: true },
              { label: "Thermal Stress Index", value: `${liveWeather.thermal_stress_pct.toFixed(0)}%`, pct: Math.min(100, liveWeather.thermal_stress_pct), danger: liveWeather.thermal_stress_pct > 40, warn: true },
            ].map(({ label, value, pct, danger, warn, blue }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</p>
                  <p className={`font-mono text-base font-bold ${danger ? "text-red-400" : warn ? "text-amber-400" : "text-foreground"}`}>{value}</p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${blue ? "bg-blue-500/60" : danger ? "bg-red-500" : warn ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-muted/40 p-3 border border-border/40">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono mb-1">Fleet Impact</p>
            <p className="text-[11px] text-foreground/80 leading-snug">
              {liveWeather.temperature_c > 36
                ? `At ${liveWeather.temperature_c.toFixed(1)}°C, top-oil temps rise ~${((liveWeather.temperature_c - 25) * 1.4).toFixed(0)}°C under peak load. Monitor ${criticalCount} high-risk assets.`
                : `Ambient at ${liveWeather.temperature_c.toFixed(1)}°C — within safe margins. Standard monitoring applies.`}
            </p>
          </div>
          <button onClick={() => setLocationModalOpen(true)} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <Compass className="size-3" />Update Location
          </button>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Asset Risk Matrix</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ranked by composite score · {displayAssets.length} assets</p>
            </div>
            <Link to="/grid" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              Full Grid <ChevronRight className="size-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  {["Asset", "Substation", "Health Index", "Risk Score", "RUL", "Status"].map(h => (
                    <th key={h} className={`py-2.5 px-4 text-left text-[9px] uppercase tracking-widest text-muted-foreground font-mono font-semibold ${h === "Substation" ? "hidden sm:table-cell" : h === "RUL" ? "hidden md:table-cell" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {displayAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-foreground">{asset.id}</div>
                      <div className="text-[10px] text-muted-foreground">{asset.voltageKv} kV · {asset.faultType}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell text-[11px] max-w-[110px] truncate">{asset.substation}</td>
                    <td className="py-3 px-4">
                      <span className={`font-mono font-bold text-sm ${asset.hi > 50 ? "text-red-400" : asset.hi > 30 ? "text-amber-400" : "text-emerald-400"}`}>{asset.hi.toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${asset.riskScore >= 70 ? "bg-red-500" : asset.riskScore >= 40 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${asset.riskScore}%` }} />
                        </div>
                        <span className="font-mono text-[11px] text-foreground">{asset.riskScore}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] hidden md:table-cell">
                      <span className={asset.rul < 40 ? "text-red-400 font-bold" : "text-foreground"}>{asset.rul}d</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold border ${getRiskBg(asset.riskScore)} ${getRiskColor(asset.riskScore)}`}>
                        {asset.riskScore >= 70 && <span className="relative flex size-1.5"><span className="absolute animate-ping size-full rounded-full bg-red-400 opacity-75" /><span className="relative size-1.5 rounded-full bg-red-400" /></span>}
                        {getRiskLabel(asset.riskScore)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Row 3: Incidents + Security + AI Recs ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-5">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Community & Field Incidents</h2>
            <span className="text-[9px] font-mono text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">{incidents.length} recent</span>
          </div>
          {incidents.length > 0 ? (
            <div className="space-y-3">
              {incidents.map((inc, i) => (
                <div key={inc.incident_id || i} className="rounded-lg border border-border/40 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{inc.event_description}</p>
                    <span className="shrink-0 text-[9px] font-mono text-muted-foreground">{inc.received_at?.slice(11, 16) || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground truncate">{inc.zone_name}</span>
                    <span className={`ml-auto text-[9px] font-mono font-semibold rounded px-1.5 py-0.5 ${inc.category === "grid_incident" ? "bg-red-500/15 text-red-400" : inc.category === "excavation" ? "bg-amber-500/15 text-amber-400" : "bg-muted text-muted-foreground"}`}>
                      {inc.category?.replace("_", " ") || "field report"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="size-8 text-emerald-400/50 mb-2" />
              <p className="text-xs text-muted-foreground">No recent incidents</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Your zone is clear</p>
            </div>
          )}
          <Link to="/grid" className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ShieldAlert className="size-3" />Report Ground Hazard
          </Link>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">AI Input Security</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono font-semibold text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />Protected
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {securityStats === null ? (
              [1,2,3,4].map(i => (
                <div key={i} className="rounded-lg bg-muted/40 p-2.5 animate-pulse">
                  <div className="h-2 w-14 rounded bg-muted mb-2" />
                  <div className="h-5 w-8 rounded bg-muted" />
                </div>
              ))
            ) : (
              [
                { label: "Processed", value: securityStats.processed, color: "text-foreground" },
                { label: "Verified", value: securityStats.verified, color: "text-emerald-400" },
                { label: "Quarantined", value: securityStats.quarantined, color: "text-amber-400" },
                { label: "Blocked", value: securityStats.blocked, color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">{label}</p>
                  <p className={`mt-0.5 font-mono text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            {["Deterministic Input Filter", "Decision Model Isolation", "Audit Logging"].map(label => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                <span className="text-[11px] text-muted-foreground">{label}</span>
                <span className="text-[9px] font-mono font-bold text-emerald-400">ACTIVE</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-muted/30 border border-border/40 px-3 py-2">
            <p className="text-[9px] font-mono text-muted-foreground">POST /events/report</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Injection filter active on all field-submitted reports</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">AI Recommendations</h2>
            <BrainCircuit className="size-4 text-primary" />
          </div>
          <div className="space-y-3">
            {recommendations.map((rec: any) => (
              <div key={rec.rank} className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">{rec.rank}</span>
                    <span className="font-mono text-xs font-bold text-foreground">{rec.asset}</span>
                  </div>
                  <span className={`text-[9px] font-mono font-semibold rounded px-1.5 py-0.5 border ${rec.priority === "HIGH" ? "border-red-500/30 bg-red-500/10 text-red-400" : rec.priority === "MEDIUM" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-border/40 text-muted-foreground"}`}>
                    {rec.priority}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.action}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[9px] font-mono text-muted-foreground">Confidence: {rec.confidence}%</p>
                  <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${rec.confidence}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/predict" className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            <Activity className="size-3.5" />Run ML Prediction
          </Link>
        </div>
      </div>

      {/* ── RUL Distribution Histogram ── */}
      <div className="rounded-xl border border-border/60 bg-card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Fleet RUL Distribution</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Remaining Useful Life buckets across all {displayAssets.length} assets</p>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">Model 1 Output</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(() => {
            const buckets = [
              { label: "< 40d", range: [0, 40], color: "bg-red-500", text: "text-red-400", border: "border-red-500/30" },
              { label: "40–80d", range: [40, 80], color: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30" },
              { label: "80–120d", range: [80, 120], color: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/30" },
              { label: "120d+", range: [120, Infinity], color: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30" },
            ];
            const maxCount = Math.max(...buckets.map(b => displayAssets.filter(a => a.rul >= b.range[0] && a.rul < b.range[1]).length), 1);
            return buckets.map(b => {
              const count = displayAssets.filter(a => a.rul >= b.range[0] && a.rul < b.range[1]).length;
              const ids = displayAssets.filter(a => a.rul >= b.range[0] && a.rul < b.range[1]).slice(0, 3).map(a => a.id);
              const barH = Math.max(8, Math.round((count / maxCount) * 64));
              return (
                <div key={b.label} className={`rounded-lg border ${b.border} bg-muted/20 p-3 flex flex-col items-center gap-2`}>
                  <div className="flex items-end justify-center h-16 w-full">
                    <div className={`w-8 rounded-t-md ${b.color} opacity-80 transition-all`} style={{ height: `${barH}px` }} />
                  </div>
                  <p className={`font-mono text-xl font-bold ${b.text}`}>{count}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{b.label}</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {ids.map(id => <span key={id} className="text-[8px] font-mono bg-muted/60 rounded px-1 text-muted-foreground">{id}</span>)}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ── Model Info Bar ── */}
      <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">VOLTRA ML Stack</span>
        </div>
        {[
          ["Model 1", "Health Index Regression · R² 0.72 · RandomForest"],
          ["Model 2", "DGA Fault Classifier · 90.8% acc · RandomForest"],
          ["Dataset", "Kaggle transformer dataset · Day 89 snapshot · 18 assets"],
          ["Pipeline", "score → rank → plan · 5-factor composite score"],
        ].map(([name, detail]) => (
          <div key={name} className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{name}: </span>{detail}</span>
          </div>
        ))}
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onSuccess={(p) => setProfile(p)} />
      <LocationPromptModal open={locationModalOpen} onClose={() => setLocationModalOpen(false)} onLocationSelected={(loc) => setLocation(loc)} />

      {/* ── Guest Preview Overlay ── */}
      {!isAuthed && <GuestPreviewBanner page="Command Dashboard" />}

      {/* ── Sticky Guest Sign-In Footer ── */}
      {!isAuthed && (
        <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between gap-4 border-t border-amber-500/30 bg-background/95 backdrop-blur-md px-4 py-3 sm:px-8 shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 size-8 grid place-items-center rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/40">
              <Lock className="size-4 text-amber-400" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-xs text-foreground sm:text-sm">You are viewing a curated preview</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Sign in to access live telemetry, real-time ML scoring, and Groq AI reports.</p>
            </div>
          </div>
          <Link
            to="/login"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-black shadow-lg hover:from-amber-400 hover:to-orange-400 transition-all hover:scale-[1.02]"
          >
            <LogIn className="size-3.5" />
            Sign In to Unlock
          </Link>
        </div>
      )}
    </div>
  );
}


function GuestPreviewBanner({ page }: { page: string }) {
  return (
    <>
      {/* Gradient fade over bottom content */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30"
        style={{ height: "55%", background: "linear-gradient(to bottom, transparent 0%, hsl(var(--background)/0.85) 35%, hsl(var(--background)) 65%)" }}
      />
      {/* Sticky sign-in bar */}
      <div className="sticky bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Lock className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{page} · Preview Mode</p>
              <p className="text-xs text-muted-foreground">Sign in to access live model data, real-time alerts, and AI advisories.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-xs font-bold text-background transition-colors hover:bg-foreground/90"
            >
              <LogIn className="size-3.5" /> Sign In to Access
            </Link>
            <Link
              to="/technology"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ShieldCheck className="size-3.5" /> How It Works
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

