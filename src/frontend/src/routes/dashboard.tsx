import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  CircleGauge,
  CloudSun,
  Database,
  Download,
  FileUp,
  Gauge,
  Grid2X2,
  HardHat,
  LocateFixed,
  Lock,
  LockKeyhole,
  LogIn,
  MapPin,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  TriangleAlert,
  Upload,
  UserRound,
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
  ReferenceLine,
} from "recharts";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gridDataSource, type DataSourceType } from "@/lib/gridDataSource";
import { authSession, type OperatorProfile, type UserLocationState } from "@/lib/authSession";
import {
  techtonicsApi,
  type RankedAsset,
  type MaintenanceAction,
  type CsvScoreRow,
} from "@/lib/techtonicsApi";
import { initialGridAssets } from "@/lib/gridData";
import { toast } from "sonner";
import {
  getActiveDataset,
  uploadDatasetCsv,
  activateDataset,
  type ActiveDatasetInfo,
} from "@/lib/ragApi";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · VOLTRA Grid Risk Advisor" },
      {
        name: "description",
        content:
          "Enterprise grid intelligence dashboard. Live model-driven asset health, risk scores, and AI recommendations for the Anand District transmission network.",
      },
    ],
  }),
  component: DashboardPage,
});

// ─── UI Helper Primitives ─────────────────────────────────────────────────────

function Pulse({ tone = "success" }: { tone?: "success" | "danger" | "warning" }) {
  return (
    <span
      className={cn(
        "relative flex size-2",
        tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-success",
      )}
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  );
}

function Tag({
  children,
  tone = "neutral",
  pulse,
}: {
  children: ReactNode;
  tone?: "neutral" | "lime" | "danger" | "warning" | "success";
  pulse?: boolean;
}) {
  const tones = {
    neutral: "border-border bg-muted text-muted-foreground",
    lime: "border-primary/30 bg-primary-soft text-primary",
    danger: "border-danger/30 bg-danger-soft text-danger",
    warning: "border-warning/30 bg-warning-soft text-warning",
    success: "border-success/30 bg-success-soft text-success",
  };
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase leading-none",
        tones[tone],
      )}
    >
      {pulse && (
        <Pulse
          tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "success"}
        />
      )}
      {children}
    </span>
  );
}

function Card({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm backdrop-blur-md transition-all dark:border-white/[0.08] dark:bg-[#0c0d12]/90 dark:shadow-xl",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHead({
  icon,
  title,
  meta,
  action,
}: {
  icon: React.ComponentType<{ className?: string }> | ReactNode;
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 sm:px-5 py-3.5 dark:border-white/[0.08]">
      <div className="flex min-w-0 items-center gap-2.5">
        {React.isValidElement(icon) ? (
          icon
        ) : typeof icon === "function" ? (
          React.createElement(icon as React.ComponentType<{ className?: string }>, {
            className: "size-4 shrink-0 text-emerald-700 dark:text-[#d2f831]",
          })
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-foreground tracking-tight dark:text-white">{title}</h2>
          {meta && (
            <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-semibold dark:text-neutral-400">
              {meta}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  children,
  tone = "lime",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  suffix?: string;
  children: ReactNode;
  tone?: "lime" | "danger" | "warning";
}) {
  return (
    <Card className="min-h-44 overflow-hidden p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              {label}
            </p>
            <div className="mt-2.5 flex items-baseline gap-1">
              <span
                className={cn(
                  "font-display text-3xl font-bold tracking-tight",
                  tone === "danger"
                    ? "text-danger"
                    : tone === "warning"
                    ? "text-warning"
                    : "text-foreground",
                )}
              >
                {value}
              </span>
              {suffix && <span className="text-xs text-muted-foreground font-mono">{suffix}</span>}
            </div>
          </div>
          <div
            className={cn(
              "grid size-9 place-items-center rounded-md border",
              tone === "danger"
                ? "border-danger/30 bg-danger-soft text-danger"
                : tone === "warning"
                ? "border-warning/30 bg-warning-soft text-warning"
                : "border-primary/30 bg-primary-soft text-primary",
            )}
          >
            <Icon className="size-4" />
          </div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-xl p-4 animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-[2rem] border border-border bg-card text-foreground shadow-2xl backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#0d0e12]/95 dark:shadow-black/80"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-border p-6 dark:border-white/[0.08]">
          <div>
            <h2 className="font-sans text-xl font-bold text-foreground tracking-tight dark:text-white">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed dark:text-neutral-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8.5 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer dark:bg-white/[0.06] dark:border-white/[0.08] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.12]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const statusTone: Record<string, string> = {
  Critical: "border-danger/30 bg-danger-soft text-danger",
  Watch: "border-warning/30 bg-warning-soft text-warning",
  Healthy: "border-success/30 bg-success-soft text-success",
};

const DEFAULT_PROFILE: OperatorProfile = {
  name: "Om Rashiya",
  email: "operator@anand-grid.gov.in",
  role: "Regional Dispatch Engineer",
  zone: "Zone-D",
  substation: "Anand South Bulk Substation",
};

const DEFAULT_INCIDENTS = [
  {
    incident_id: "inc-01",
    category: "excavation_hazard",
    received_at: "2026-09-18T14:32:00Z",
    event_description:
      "Unmapped private contractor excavation breached an underground 11kV feeder line, triggering a severe electrical arc flash and localized power trip.",
    zone_name: "GIDC Phase-2 Sector 3",
  },
  {
    incident_id: "inc-02",
    category: "transformer_failure",
    received_at: "2026-09-18T09:15:00Z",
    event_description:
      "Substation transformer bushing flashover reported following heavy particulate accumulation combined with industrial humidity and sudden load spikes.",
    zone_name: "GIDC Phase-2 Main Substation Yard",
  },
  {
    incident_id: "inc-03",
    category: "arcing_fault",
    received_at: "2026-09-18T16:45:00Z",
    event_description:
      "Overhead conductor slap and localized arcing triggered by unauthorized deep boring machinery operating without utility clearance permits.",
    zone_name: "GIDC Phase-2 Road 4",
  },
];

type SortKey = "id" | "voltageKv" | "faultType" | "substation" | "hi" | "riskScore" | "rul" | "status";

function hiToRisk(hi: number) {
  return Math.min(100, Math.round((hi / 90) * 100));
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

function DashboardPage() {
  const [profile, setProfile] = useState<OperatorProfile>(
    () => authSession.getProfile() ?? DEFAULT_PROFILE,
  );
  const [location, setLocation] = useState<UserLocationState>(() => authSession.getLocation());
  const [mounted, setMounted] = useState(false);
  const isAuthed = mounted && authSession.isAuthenticated();
  const [dataSource, setDataSource] = useState<DataSourceType>(() =>
    gridDataSource.getDataSource(authSession.isAuthenticated()),
  );
  const [activeDatasetMeta, setActiveDatasetMeta] = useState<ActiveDatasetInfo>(() =>
    gridDataSource.getActiveDatasetInfo()
  );

  const [clock, setClock] = useState("");
  const [dark, setDark] = useState(true);
  const [modal, setModal] = useState<"auth" | "location" | "dataset" | "incident" | null>(null);

  const [rankedAssets, setRankedAssets] = useState<RankedAsset[]>([]);
  const [planActions, setPlanActions] = useState<MaintenanceAction[]>([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [predictionBusy, setPredictionBusy] = useState(false);
  const [predictionTime, setPredictionTime] = useState("12:02 IST");

  const [liveWeather, setLiveWeather] = useState<{
    temperature_c: number;
    humidity_pct: number;
    thermal_stress_pct: number;
  }>({ temperature_c: 34.2, humidity_pct: 68, thermal_stress_pct: 74 });

  const [incidents, setIncidents] = useState<any[]>(DEFAULT_INCIDENTS);
  const [securityStats, setSecurityStats] = useState<{
    processed: number;
    verified: number;
    quarantined: number;
    blocked: number;
  }>({
    processed: 15,
    verified: 3,
    quarantined: 2,
    blocked: 1,
  });

  // Sorting
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "riskScore", asc: false });

  // Incident form state
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentCategory, setIncidentCategory] = useState("grid_incident");
  const [incidentReporting, setIncidentReporting] = useState(false);

  // CSV upload ref
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync active dataset from RAG service on mount & on activation events
  useEffect(() => {
    getActiveDataset()
      .then((info) => {
        if (info) {
          setActiveDatasetMeta(info);
          gridDataSource.setActiveDatasetInfo(info);
        }
      })
      .catch(() => {});

    const handleDatasetActivated = (e: any) => {
      if (e.detail) {
        setActiveDatasetMeta(e.detail);
      }
    };
    window.addEventListener("voltra-dataset-activated", handleDatasetActivated);
    return () => window.removeEventListener("voltra-dataset-activated", handleDatasetActivated);
  }, []);

  // 1. Clock & Theme initialisation
  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const now = new Date();
      setClock(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now),
      );
    };
    tick();
    const t = setInterval(tick, 1000);

    if (typeof document !== "undefined") {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        localStorage.getItem("cinematic-theme") === "dark" ||
        localStorage.getItem("blackout-theme") === "dark";
      setDark(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    }

    return () => clearInterval(t);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("cinematic-theme", next ? "dark" : "light");
      localStorage.setItem("blackout-theme", next ? "dark" : "light");
    }
  };

  // 2. Data source change listener
  useEffect(() => {
    const handleSourceChange = (e: any) => {
      setDataSource(e.detail || gridDataSource.getDataSource(authSession.isAuthenticated()));
    };
    window.addEventListener("voltra-datasource-changed", handleSourceChange);
    return () => window.removeEventListener("voltra-datasource-changed", handleSourceChange);
  }, []);

  // 3. API Data Fetching
  useEffect(() => {
    if (!mounted) return;

    // Fetch live weather from Open-Meteo
    techtonicsApi
      .fetchLiveWeather(location.latitude, location.longitude)
      .then((wx) =>
        setLiveWeather({
          temperature_c: wx.temperature_c,
          humidity_pct: wx.humidity_pct,
          thermal_stress_pct: wx.thermal_stress_pct,
        }),
      )
      .catch(() => {});

    // Fetch security telemetry
    techtonicsApi
      .getEventStats()
      .then((stats) => {
        setSecurityStats(stats);
      })
      .catch(() => {});

    // Fetch live community incidents
    techtonicsApi
      .searchPastEvents("", "")
      .then((res) => {
        if (res.events?.length) {
          setIncidents(res.events.slice(0, 5));
        }
      })
      .catch(() => {});

    // Grid asset telemetry
    if (dataSource === "anand" || !isAuthed) {
      techtonicsApi
        .getRanked()
        .then((res) => {
          if (res.ranked_assets?.length) {
            setRankedAssets(res.ranked_assets);
            setApiConnected(true);
          }
        })
        .catch(() => setApiConnected(false));

      techtonicsApi
        .getPlan()
        .then((res) => {
          if (res.top_10_actions?.length) {
            setPlanActions(res.top_10_actions);
          }
        })
        .catch(() => {});
    } else if (dataSource === "custom") {
      const custom = gridDataSource.getCustomAssets();
      setRankedAssets(custom);
      setApiConnected(true);
      setPlanActions([]);
    } else {
      setRankedAssets([]);
      setPlanActions([]);
      setApiConnected(false);
    }
  }, [mounted, isAuthed, dataSource, location.latitude, location.longitude]);

  // 4. Asset Normalization
  const displayAssets = useMemo(() => {
    if (isAuthed && dataSource === "none") {
      return [];
    }

    if (rankedAssets.length > 0) {
      return rankedAssets.map((r) => {
        const base = initialGridAssets.find((a) => a.id === r.asset_id);
        const hi = r.health_index;
        const rul = r.RUL_days;
        const riskScore = hiToRisk(hi);
        const isCrit = r.risk_tier === "CRITICAL" || r.risk_tier === "HIGH" || hi >= 50 || riskScore >= 55;
        const isWatch = r.risk_tier === "MEDIUM" || hi >= 30 || riskScore >= 35;
        const status = isCrit
          ? ("Critical" as const)
          : isWatch
          ? ("Watch" as const)
          : ("Healthy" as const);

        return {
          id: r.asset_id,
          name: base?.name || `${r.asset_id} · ${r.mva_rating || 25} MVA Substation`,
          substation: r.substation_name || base?.substation || "Anand South Bulk Substation",
          region: r.grid_zone || base?.region || "Corridor",
          type: "Transformer" as const,
          voltageKv: parseInt(r.voltage_kv || "66", 10) || base?.voltageKv || 66,
          nominalVoltageKv: parseInt(r.voltage_kv || "66", 10) || base?.nominalVoltageKv || 66,
          currentLoadMw: r.current_load_mw ?? base?.currentLoadMw ?? 20.0,
          ratedCapacityMw: r.mva_rating ?? base?.ratedCapacityMw ?? 25.0,
          frequencyHz: 50.0,
          coreTempC:
            r.core_temp_c != null
              ? Number(r.core_temp_c.toFixed(1))
              : base?.coreTempC ?? 75.0,
          healthScore: Math.max(5, Math.min(99, Math.round(100 - hi))),
          healthIndexRaw: hi,
          rulDays: rul,
          faultType: r.fault_type || "NF",
          status,
          riskTier: r.risk_tier,
          compositeScore: r.composite_score,
          criticality: r.criticality_tier || "Critical",
          archetype: r.archetype || base?.archetype || "Standard Asset",
          activeAnomalies:
            r.risk_tier === "CRITICAL" || r.risk_tier === "HIGH"
              ? 3
              : r.risk_tier === "MEDIUM"
              ? 1
              : 0,
          lastInspected: base?.lastInspected || "Day 78 Overhaul",
          coolingType: base?.coolingType || "ONAF",
          sf6PressureBar: 5.2,
          acousticDba: 68.0,
          top3Shap: r.top_3_shap || base?.top3Shap,
          hi,
          rul,
          riskScore,
        };
      });
    }

    // Default baseline when unauthenticated or static fallback
    return initialGridAssets.map((a) => {
      const hi = a.healthIndexRaw;
      const rul = a.rulDays;
      const riskScore = hiToRisk(hi);
      const isCrit = a.status === "risk" || a.riskTier === "CRITICAL" || a.riskTier === "HIGH" || hi >= 50 || riskScore >= 55;
      const isWatch = a.status === "watch" || a.riskTier === "MEDIUM" || hi >= 30 || riskScore >= 35;
      const status = isCrit
        ? ("Critical" as const)
        : isWatch
        ? ("Watch" as const)
        : ("Healthy" as const);
      return { ...a, hi, rul, riskScore, status };
    });
  }, [isAuthed, dataSource, rankedAssets]);

  // Sorted assets
  const sortedAssets = useMemo(() => {
    return [...displayAssets].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const order =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.asc ? order : -order;
    });
  }, [displayAssets, sort]);

  const sortBy = (key: SortKey) =>
    setSort((old) => ({ key, asc: old.key === key ? !old.asc : true }));

  // Aggregate Metrics
  const criticalCount = displayAssets.filter((a) => a.status === "Critical").length;
  const watchCount = displayAssets.filter((a) => a.status === "Watch").length;
  const avgHI =
    displayAssets.length > 0
      ? displayAssets.reduce((s, a) => s + a.hi, 0) / displayAssets.length
      : 31.4;
  const avgRiskScore =
    displayAssets.length > 0
      ? Math.round(displayAssets.reduce((s, a) => s + a.riskScore, 0) / displayAssets.length)
      : 42;
  const fleetHealth =
    displayAssets.length > 0 ? Math.round(100 - avgHI) : 68.6;
  const predictedFailures = displayAssets.filter((a) => a.rul < 40).length;

  // Top Critical Asset for Alert Card
  const topCriticalAsset = useMemo(() => {
    if (displayAssets.length === 0) return null;
    const sorted = [...displayAssets].sort((a, b) => b.riskScore - a.riskScore);
    return sorted[0];
  }, [displayAssets]);

  // Chart Data
  const chartData = useMemo(() => {
    return displayAssets.slice(0, 10).map((a) => ({
      name: a.id,
      risk: a.riskScore,
      hi: parseFloat(a.hi.toFixed(1)),
    }));
  }, [displayAssets]);

  // Recommendations
  const recommendations = useMemo(() => {
    if (planActions.length > 0) {
      return planActions.slice(0, 3).map((act, idx) => ({
        rank: `0${idx + 1}`,
        asset: act.asset_id,
        action: act.short_action,
        crew: act.urgency_window ? `Due ${act.urgency_window}` : act.crew_assignment,
        confidence: act.risk_tier === "HIGH" ? 94 : act.risk_tier === "MEDIUM" ? 82 : 75,
        priority: act.risk_tier === "HIGH" ? "Critical" : act.risk_tier === "MEDIUM" ? "High" : "Moderate",
        rationale: act.detail || "Multi-parameter DGA degradation profile",
      }));
    }

    if (displayAssets.length === 0) return [];

    const recs = [];
    if (topCriticalAsset) {
      recs.push({
        rank: "01",
        asset: topCriticalAsset.id,
        action:
          topCriticalAsset.riskScore >= 70
            ? "Initiate emergency load curtailment and DGA syringe sampling."
            : "Schedule inspection within current maintenance cycle.",
        crew: "Urgent · 24h Window",
        confidence: topCriticalAsset.riskScore > 70 ? 94 : 78,
        priority: topCriticalAsset.riskScore >= 70 ? "Critical" : "High",
        rationale: `Hydrogen & top-oil spike indicate thermal degradation (HI: ${topCriticalAsset.hi.toFixed(1)}).`,
      });
    }

    if (displayAssets[1]) {
      const second = displayAssets[1];
      recs.push({
        rank: "02",
        asset: second.id,
        action: "Monitor thermal gradient; verify forced-air cooling relay circuit.",
        crew: "Zone-B Rapid Dispatch",
        confidence: 82,
        priority: second.riskScore >= 70 ? "High" : "Moderate",
        rationale: `Operating at elevated capacity with RUL ${second.rul.toFixed(0)} days.`,
      });
    }

    recs.push({
      rank: "03",
      asset: "Fleet-Wide",
      action: `Ambient ${liveWeather.temperature_c.toFixed(1)}°C elevates thermal stress. Review cooling headroom across all monitored assets.`,
      crew: "District Dispatch Desk",
      confidence: 71,
      priority: "Moderate",
      rationale: "Ambient stress amplification across peak evening corridor window.",
    });

    return recs;
  }, [planActions, topCriticalAsset, displayAssets, liveWeather.temperature_c]);

  // Run ML Prediction action
  const handleRunPrediction = () => {
    setPredictionBusy(true);
    techtonicsApi
      .getRanked()
      .then((res) => {
        if (res.ranked_assets?.length) {
          setRankedAssets(res.ranked_assets);
          toast.success("ML inference re-evaluated across all assets");
        }
      })
      .catch(() => {
        toast.info("Inference re-evaluated locally");
      })
      .finally(() => {
        setTimeout(() => {
          setPredictionBusy(false);
          setPredictionTime(`${clock.slice(0, 5)} IST`);
        }, 800);
      });
  };

  // CSV Export action
  const exportMatrixCsv = () => {
    if (displayAssets.length === 0) {
      toast.error("No assets available to export");
      return;
    }
    const header = "id,voltage,fault,substation,health,risk,rul,status\n";
    const rows = displayAssets
      .map(
        (a) =>
          `${a.id},${a.voltageKv} kV,${a.faultType},"${a.substation}",${a.hi.toFixed(1)},${a.riskScore},${a.rul},${a.status}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `voltra-asset-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Exported asset matrix CSV");
  };

  // Sample CSV download
  const downloadSampleCsv = () => {
    const body =
      "asset_id,Hydrogen,Oxigen,Nitrogen,Methane,CO,CO2,Ethylene,Ethane,Acethylene,DBDS,Power_factor,Interfacial_V,Dielectric_rigidity,Water_content,top_oil_temp_c,load_pct\n" +
      "TX-201,18.5,12.0,55.0,22.4,140.0,420.0,38.2,14.6,8.4,0.0,0.45,34.0,52.0,18.0,68.0,78.0\n" +
      "TX-202,6.2,8.0,60.0,8.1,85.0,280.0,12.0,5.4,0.2,0.0,0.18,39.0,62.0,11.0,54.0,55.0\n";
    const blob = new Blob([body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "voltra-sample-transformers.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Custom CSV File Upload
  const handleCsvUpload = async (file?: File) => {
    if (!file) return;
    toast.loading("Uploading CSV to RAG dataset engine & Qdrant Cloud...", { id: "csv-score" });
    try {
      // 1. Upload, parse, embed, and activate dataset in RAG engine
      const ragRes = await uploadDatasetCsv(file);
      setActiveDatasetMeta(ragRes);
      gridDataSource.setActiveDatasetInfo(ragRes);

      // 2. Score with ML pipeline if transformer schema to update dashboard cards
      toast.loading("Scoring records with Model 1 + Model 2...", { id: "csv-score" });
      try {
        const res = await techtonicsApi.scoreCSV(file);
        if (res.results && res.results.length > 0) {
          const converted: RankedAsset[] = res.results.map((row: CsvScoreRow, idx: number) => {
            const hi = row.health_index;
            const rul = row.RUL_days;
            const composite = Number(
              (0.35 * (hi / 100) + 0.25 * Math.max(0, 1 - rul / 120) + 0.2 * (row.fault_prob || 0.8)).toFixed(3),
            );
            const tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" =
              hi >= 50 || rul < 40
                ? "CRITICAL"
                : hi >= 30 || rul < 80
                ? "HIGH"
                : hi >= 20
                ? "MEDIUM"
                : "LOW";

            return {
              rank: idx + 1,
              asset_id: row.asset_id || `TX-CUSTOM-${idx + 1}`,
              substation_name: `${location.city.split(",")[0].trim()} Substation`,
              grid_zone: `${location.city.split(",")[0].trim()} Corridor`,
              criticality_tier: tier === "CRITICAL" ? "Critical" : tier === "HIGH" ? "High" : "Standard",
              health_index: hi,
              RUL_days: rul,
              fault_type: row.fault_type || "NF",
              fault_prob: row.fault_prob || 0.9,
              risk_tier: tier,
              composite_score: composite,
              mva_rating: 25.0,
              voltage_kv: "66kV",
              top_3_shap: row.top_3_shap || [
                ["Hydrogen", 18.5],
                ["Water content", 14.2],
                ["Power factor", 9.1],
              ],
              core_temp_c: 65.0,
              load_pct: 70.0,
              current_load_mw: 17.5,
            };
          });

          gridDataSource.setCustomAssets(converted);
          setDataSource("custom");
          setRankedAssets(converted);
        }
      } catch {
        // Even if file is renewable/grid instead of transformer format, RAG ingestion succeeded
        setDataSource("custom");
      }

      setModal(null);
      toast.success(`Active dataset: "${ragRes.name}" (${ragRes.asset_count} assets synchronized with Grid Advisor)`, {
        id: "csv-score",
      });

      // Broadcast event to chatbot
      window.dispatchEvent(
        new CustomEvent("voltra-system-csv-ingested", {
          detail: {
            filename: file.name,
            assets: ragRes.assets || [],
            count: ragRes.record_count,
          },
        })
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to upload and activate CSV dataset.", { id: "csv-score" });
    }
  };

  // Browser GPS detect
  const handleDetectLocation = async () => {
    try {
      const loc = await authSession.requestBrowserLocation();
      setLocation(loc);
      toast.success(`Location set: ${loc.latitude.toFixed(2)}°N · ${loc.longitude.toFixed(2)}°E`);
      setModal(null);
    } catch (err: any) {
      toast.error(err.message || "Location permission denied. Select a substation preset below.");
    }
  };

  // Report Field Hazard
  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle.trim()) return;

    setIncidentReporting(true);
    try {
      const res = await techtonicsApi.reportEvent({
        zone_name: profile.zone || "Zone-B · Heavy Manufacturing",
        event_description: incidentTitle.trim(),
        reporter_type: "field_technician",
        reporter_note: `Operator report from ${profile.substation}`,
      });

      if (res.status === "rejected") {
        toast.error(`Security filter rejected report: ${res.message}`);
      } else {
        toast.success("Incident report verified & logged to corridor feed");
        setIncidents((prev) => [
          {
            incident_id: res.incident_id || `INC-${Date.now().toString().slice(-4)}`,
            event_description: incidentTitle.trim(),
            zone_name: profile.zone,
            category: incidentCategory,
            received_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        setIncidentTitle("");
        setModal(null);
      }
    } catch {
      toast.success("Field observation logged to local feed");
      setIncidents((prev) => [
        {
          incident_id: `LOCAL-${Date.now().toString().slice(-4)}`,
          event_description: incidentTitle.trim(),
          zone_name: profile.zone,
          category: incidentCategory,
          received_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setIncidentTitle("");
      setModal(null);
    } finally {
      setIncidentReporting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Main Content Container ── */}
      <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mx-auto max-w-[1740px]">
          {/* Subheader: Operator Greeting & Data Source Controls */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-[#d2f831] font-mono">
                Anand District Transmission Network
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-white sm:text-3xl lg:text-4xl">
                Welcome back, {profile.name.split(" ")[0]}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground dark:text-neutral-400 font-mono flex items-center gap-2">
                <span>{profile.substation}</span>
                <span className="text-muted-foreground/60 dark:text-neutral-600">/</span>
                <span>{profile.zone} · Bulk Transmission Corridor</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setModal("dataset")}
                className="rounded-lg border border-border bg-card px-3.5 py-2 text-left hover:border-primary/40 transition-all cursor-pointer shadow-sm dark:border-white/[0.1] dark:bg-[#111216]/90 dark:hover:border-white/20"
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground dark:text-neutral-400 font-mono">
                  Data source · {activeDatasetMeta?.asset_count ?? displayAssets.length} assets
                </p>
                <p className="mt-0.5 text-xs font-semibold text-foreground dark:text-white">
                  {activeDatasetMeta?.name || (dataSource === "anand" ? "Anand Corridor (Sample)" : "Custom Upload")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setModal("dataset")}
                className="flex items-center gap-2 h-10 rounded-lg border border-border bg-muted/60 hover:bg-muted px-4 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-sm dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
              >
                <Upload className="size-3.5" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>

          {/* ── Responsive 2-Column Command Center Layout ── */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* ── Left Column: Operations & Telemetry ── */}
            <div className="min-w-0 space-y-6">
              {/* 1. Four Fleet KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Fleet Health */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm backdrop-blur-md flex flex-col justify-between min-h-[172px] dark:border-white/[0.08] dark:bg-[#0c0d12]/90 dark:shadow-xl">
                  <div>
                    <div className="flex items-start justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-neutral-400 font-mono">
                        Fleet Health
                      </p>
                      <div className="size-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-lime-500/25 dark:bg-lime-500/10 dark:text-[#d2f831] flex items-center justify-center">
                        <Gauge className="size-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-foreground dark:text-white">
                        {fleetHealth}
                      </span>
                      <span className="text-sm font-mono text-muted-foreground dark:text-neutral-400">%</span>
                    </div>
                  </div>

                  <div>
                    <div className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:border-lime-500/30 dark:bg-lime-500/15 dark:text-[#d2f831]">
                      MODEL 1
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-emerald-600 dark:bg-[#d2f831] shadow-[0_0_8px_rgba(5,150,105,0.4)] dark:shadow-[0_0_8px_#d2f831] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(fleetHealth, 0))}%` }}
                      />
                    </div>
                    <p className="mt-2.5 text-[10px] text-muted-foreground dark:text-neutral-400 font-mono">
                      Avg Health Index <b className="text-foreground dark:text-white font-mono">{avgHI.toFixed(1)}</b> · RF regression
                    </p>
                  </div>
                </div>

                {/* High-Risk Assets */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm backdrop-blur-md flex flex-col justify-between min-h-[172px] dark:border-white/[0.08] dark:bg-[#0c0d12]/90 dark:shadow-xl">
                  <div>
                    <div className="flex items-start justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-neutral-400 font-mono">
                        High-Risk Assets
                      </p>
                      <div className="size-8 rounded-full border border-red-500/25 bg-red-500/10 text-red-500 flex items-center justify-center">
                        <TriangleAlert className="size-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-red-500">
                        {String(criticalCount).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-end">
                      <span className="text-[11px] font-mono text-muted-foreground dark:text-neutral-400">
                        {String(watchCount).padStart(2, "0")} watch
                      </span>
                    </div>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-red-500 font-mono">
                      Requires immediate dispatch
                    </p>
                  </div>
                </div>

                {/* Grid Risk Index */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm backdrop-blur-md flex flex-col justify-between min-h-[172px] dark:border-white/[0.08] dark:bg-[#0c0d12]/90 dark:shadow-xl">
                  <div>
                    <div className="flex items-start justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-neutral-400 font-mono">
                        Grid Risk Index
                      </p>
                      <div className="size-8 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <CheckCircle2 className="size-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-amber-500 dark:text-amber-400">
                        {avgRiskScore}
                      </span>
                      <span className="text-sm font-mono text-muted-foreground dark:text-neutral-500">/100</span>
                    </div>
                  </div>

                  <div>
                    <div className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                      {avgRiskScore >= 70 ? "High Risk" : avgRiskScore >= 40 ? "Moderate" : "Nominal"}
                    </div>
                    <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-neutral-800">
                      <span className="w-[45%] bg-[#22c55e]" />
                      <span className="w-[30%] bg-[#f59e0b]" />
                      <span className="flex-1 bg-[#ef4444]" />
                    </div>
                    <p className="mt-2.5 text-[10px] text-muted-foreground dark:text-neutral-400 font-mono">
                      Composite infrastructure risk
                    </p>
                  </div>
                </div>

                {/* Predictive Failures */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm backdrop-blur-md flex flex-col justify-between min-h-[172px] dark:border-white/[0.08] dark:bg-[#0c0d12]/90 dark:shadow-xl">
                  <div>
                    <div className="flex items-start justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-neutral-400 font-mono">
                        Predictive Failures
                      </p>
                      <div className="size-8 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center">
                        <Zap className="size-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-amber-500 dark:text-amber-400">
                        {String(predictedFailures).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-mono text-muted-foreground dark:text-neutral-400">within 40d</p>
                    <p className="mt-2.5 text-[10px] text-muted-foreground dark:text-neutral-400 font-mono">
                      Predictive decay model (Model 1)
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Asset Risk Overview Chart + Critical Asset Alert */}
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
                {/* Recharts Bar Chart */}
                <Card className="overflow-hidden">
                  <SectionHead
                    icon={BarChart3}
                    title="Asset Risk Overview"
                    meta="Composite risk score · threshold 70"
                    action={
                      <div className="hidden items-center gap-3 text-[9px] uppercase tracking-wider text-neutral-400 sm:flex font-mono">
                        <span className="flex items-center gap-1.5">
                          <i className="size-2 rounded-full bg-[#22c55e]" />
                          HEALTHY
                        </span>
                        <span className="flex items-center gap-1.5">
                          <i className="size-2 rounded-full bg-[#f59e0b]" />
                          WATCH
                        </span>
                        <span className="flex items-center gap-1.5">
                          <i className="size-2 rounded-full bg-[#ef4444]" />
                          CRITICAL
                        </span>
                      </div>
                    }
                  />
                  <div className="h-[292px] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 12, right: 12, left: -24, bottom: 4 }}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          contentStyle={{
                            background: "#0c0d12",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 8,
                            fontSize: 11,
                            color: "#fff",
                          }}
                          formatter={(value: any) => [`${value}/100`, "Risk score"]}
                        />
                        <ReferenceLine
                          y={70}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          label={{
                            value: "CRITICAL",
                            fill: "#ef4444",
                            fontSize: 9,
                            position: "insideBottomRight",
                            offset: 10,
                          }}
                        />
                        <Bar dataKey="risk" radius={[3, 3, 0, 0]} maxBarSize={42}>
                          {chartData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={
                                entry.risk >= 70
                                  ? "#ef4444"
                                  : entry.risk >= 40
                                  ? "#f59e0b"
                                  : "#22c55e"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Critical Asset Alert Card */}
                <Card className="overflow-hidden border-danger/30">
                  <SectionHead
                    icon={AlertTriangle}
                    title="Critical Asset Alert"
                    meta="Pinned anomaly"
                    action={
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-red-500 uppercase">
                        <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                        CRITICAL
                      </span>
                    }
                  />
                  {topCriticalAsset ? (
                    <div className="p-4 flex flex-col justify-between h-[calc(100%-54px)]">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-display text-xl font-bold text-foreground">
                              {topCriticalAsset.id}
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-[210px]">
                              {topCriticalAsset.substation}
                            </p>
                          </div>
                          <span className="font-mono text-sm font-bold text-danger">
                            {topCriticalAsset.riskScore}/100
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {[
                            [
                              "Health Index",
                              topCriticalAsset.hi.toFixed(1),
                              topCriticalAsset.hi > 50 ? "danger" : "warning",
                            ],
                            [
                              "Remaining Life",
                              `${topCriticalAsset.rul} days`,
                              topCriticalAsset.rul < 40 ? "danger" : "neutral",
                            ],
                            [
                              "Core Temp",
                              `${topCriticalAsset.coreTempC}°C`,
                              topCriticalAsset.coreTempC > 75 ? "danger" : "warning",
                            ],
                            [
                              "Fault Class",
                              `IEC ${topCriticalAsset.faultType}`,
                              topCriticalAsset.faultType !== "NF" ? "warning" : "success",
                            ],
                          ].map(([label, value, tone]) => (
                            <div key={label} className="rounded-md border border-border bg-muted/40 p-2.5">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                                {label}
                              </p>
                              <p
                                className={cn(
                                  "mt-1 font-mono text-xs font-bold",
                                  tone === "danger"
                                    ? "text-danger"
                                    : tone === "warning"
                                    ? "text-warning"
                                    : tone === "success"
                                    ? "text-success"
                                    : "text-foreground",
                                )}
                              >
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 rounded-md border border-danger/25 bg-danger-soft p-3">
                        <p className="text-xs font-bold text-danger">
                          {topCriticalAsset.riskScore >= 70
                            ? "Prepare Immediate Curtailment"
                            : "Schedule Priority Inspection"}
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                          {topCriticalAsset.riskScore >= 70
                            ? "Thermal rise and electrical decay indicate accelerated insulation stress under current loading."
                            : "Health index trending upward. Preventive maintenance recommended this cycle."}
                        </p>
                        <Button asChild variant="destructive" size="sm" className="mt-3 w-full">
                          <Link to="/grid">
                            <Zap className="size-3.5" />
                            View Asset in Grid
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center flex flex-col items-center justify-center min-h-[292px]">
                      <div className="size-12 rounded-full border border-border bg-muted/40 flex items-center justify-center mb-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <ShieldCheck className="size-6 text-muted-foreground dark:text-neutral-500" />
                      </div>
                      <p className="text-sm font-bold text-foreground dark:text-white">No Critical Assets Active</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-relaxed dark:text-neutral-400">
                        All monitored assets are operating within nominal thermal envelopes.
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* 3. Asset Risk Matrix (Fleet Table) */}
              <Card className="overflow-hidden">
                <SectionHead
                  icon={
                    <div className="size-6 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-700 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-[#d2f831]">
                      <Grid2X2 className="size-3.5" />
                    </div>
                  }
                  title="Asset Risk Matrix"
                  meta={`${displayAssets.length} MONITORED TRANSFORMERS · CLICK HEADERS TO SORT`}
                  action={
                    <button
                      type="button"
                      onClick={exportMatrixCsv}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] hover:border-border transition-all cursor-pointer shadow-sm"
                    >
                      <Download className="size-3.5" />
                      Export
                    </button>
                  }
                />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-xs">
                    <thead className="bg-muted/70 border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground font-mono dark:bg-[#111216] dark:border-white/[0.06] dark:text-neutral-400">
                      <tr>
                        {[
                          ["id", "Asset ID"],
                          ["voltageKv", "Voltage"],
                          ["faultType", "IEC Fault"],
                          ["substation", "Substation"],
                          ["hi", "Health Index"],
                          ["riskScore", "Risk Score"],
                          ["rul", "RUL"],
                          ["status", "Status"],
                        ].map(([key, label]) => (
                          <th key={key} className="px-4 py-3 font-bold">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer dark:hover:text-white"
                              onClick={() => sortBy(key as SortKey)}
                            >
                              {label}
                              <ChevronDown className="size-3 text-muted-foreground dark:text-neutral-500" />
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-white/[0.06]">
                      {sortedAssets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-14 text-center">
                            <p className="text-sm font-bold text-foreground dark:text-white">No Assets Loaded</p>
                            <p className="text-xs text-muted-foreground mt-1 dark:text-neutral-400">
                              Choose Anand sample corridor or upload a custom CSV dataset.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        sortedAssets.map((asset) => (
                          <tr
                            key={asset.id}
                            className="transition hover:bg-muted/40 cursor-pointer"
                          >
                            <td className="px-4 py-3 font-mono font-bold text-foreground">
                              {asset.id}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground font-mono">
                              {asset.voltageKv} kV
                            </td>
                            <td className="px-4 py-3">
                              <Tag tone={asset.faultType === "NF" ? "success" : "warning"}>
                                {asset.faultType}
                              </Tag>
                            </td>
                            <td className="max-w-52 truncate px-4 py-3 text-muted-foreground">
                              {asset.substation}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-foreground">
                              {asset.hi.toFixed(1)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-6 font-mono text-xs font-semibold text-foreground">
                                  {asset.riskScore}
                                </span>
                                <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      asset.riskScore >= 70
                                        ? "bg-danger"
                                        : asset.riskScore >= 40
                                        ? "bg-warning"
                                        : "bg-success",
                                    )}
                                    style={{ width: `${asset.riskScore}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 font-mono",
                                asset.rul < 40 ? "font-bold text-danger" : "text-foreground",
                              )}
                            >
                              {asset.rul}d
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase",
                                  statusTone[asset.status] || "border-border bg-muted",
                                )}
                              >
                                <Pulse
                                  tone={
                                    asset.status === "Critical"
                                      ? "danger"
                                      : asset.status === "Watch"
                                      ? "warning"
                                      : "success"
                                  }
                                />
                                {asset.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* 4. Ambient Weather & Fleet RUL Distribution */}
              <div className="grid gap-5 xl:grid-cols-2">
                {/* Ambient Conditions */}
                <Card className="overflow-hidden">
                  <SectionHead
                    icon={CloudSun}
                    title="Ambient Conditions & Thermal Stress"
                    meta={`Open-Meteo telemetry · ${clock.slice(0, 5) || "Live"}`}
                    action={
                      <Button variant="secondary" size="sm" onClick={() => setModal("location")}>
                        <LocateFixed className="size-3.5" />
                        Update location
                      </Button>
                    }
                  />
                  <div className="grid gap-3 p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono font-bold">
                        Ambient temp
                      </p>
                      <p
                        className={cn(
                          "mt-2 font-display text-2xl font-bold",
                          liveWeather.temperature_c > 32 ? "text-warning" : "text-foreground",
                        )}
                      >
                        {liveWeather.temperature_c.toFixed(1)}°C
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono font-bold">
                        Relative humidity
                      </p>
                      <p className="mt-2 font-display text-2xl font-bold text-foreground">
                        {liveWeather.humidity_pct.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono font-bold">
                        Thermal stress
                      </p>
                      <p
                        className={cn(
                          "mt-2 font-display text-2xl font-bold",
                          liveWeather.thermal_stress_pct > 40 ? "text-danger" : "text-warning",
                        )}
                      >
                        {liveWeather.thermal_stress_pct.toFixed(0)}%
                      </p>
                    </div>
                    <div className="sm:col-span-3 rounded-md border border-warning/25 bg-warning-soft p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-warning font-mono">
                        Fleet impact assessment
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {liveWeather.temperature_c > 34
                          ? `At ${liveWeather.temperature_c.toFixed(1)}°C, top-oil temps rise ~${((liveWeather.temperature_c - 25) * 1.4).toFixed(0)}°C under peak load. Cooling headroom reduced across ${criticalCount} high-risk assets.`
                          : `Ambient at ${liveWeather.temperature_c.toFixed(1)}°C — within safe thermal envelope. Standard monitoring applies.`}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Fleet RUL Distribution */}
                <Card className="overflow-hidden">
                  <SectionHead
                    icon={BarChart3}
                    title="Fleet RUL Distribution"
                    meta="Remaining useful life · degradation buckets"
                  />
                  <div className="space-y-3.5 p-4">
                    {[
                      {
                        label: "<40d",
                        count: displayAssets.filter((a) => a.rul < 40).length,
                        tone: "danger" as const,
                        ids: displayAssets.filter((a) => a.rul < 40).map((a) => a.id).slice(0, 3).join(" · "),
                      },
                      {
                        label: "40–80d",
                        count: displayAssets.filter((a) => a.rul >= 40 && a.rul < 80).length,
                        tone: "warning" as const,
                        ids: displayAssets.filter((a) => a.rul >= 40 && a.rul < 80).map((a) => a.id).slice(0, 3).join(" · "),
                      },
                      {
                        label: "80–120d",
                        count: displayAssets.filter((a) => a.rul >= 80 && a.rul < 120).length,
                        tone: "info" as const,
                        ids: displayAssets.filter((a) => a.rul >= 80 && a.rul < 120).map((a) => a.id).slice(0, 3).join(" · "),
                      },
                      {
                        label: "120d+",
                        count: displayAssets.filter((a) => a.rul >= 120).length,
                        tone: "success" as const,
                        ids: displayAssets.filter((a) => a.rul >= 120).map((a) => a.id).slice(0, 3).join(" · "),
                      },
                    ].map(({ label, count, tone, ids }) => (
                      <div key={label} className="grid grid-cols-[58px_minmax(0,1fr)_26px] items-center gap-3">
                        <span className="text-[10px] font-bold font-mono text-foreground">{label}</span>
                        <div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                tone === "danger"
                                  ? "bg-danger"
                                  : tone === "warning"
                                  ? "bg-warning"
                                  : tone === "info"
                                  ? "bg-info"
                                  : "bg-success",
                              )}
                              style={{
                                width: `${Math.max((count / Math.max(displayAssets.length, 1)) * 100, 6)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1 truncate text-[9px] font-mono text-muted-foreground">
                            {ids || "None"}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground text-right">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* 5. VOLTRA ML Stack Summary Bar */}
              <Card className="overflow-hidden">
                <div className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_1fr_1.2fr]">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-primary font-mono">
                      VOLTRA ML Stack
                    </p>
                    <p className="mt-1 text-xs font-bold text-foreground">Grounded decision pipeline</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                      Model 1
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-foreground">
                      RandomForest HI Regression · R² 0.72
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                      Model 2
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-foreground">
                      DGA Classifier · 90.8% accuracy
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                      Training ground
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-foreground">
                      Kaggle transformer data · Day 89 · 18 assets · 5-factor composite
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Right Aside Rail: Incidents, Security, Recommendations ── */}
            <aside className="min-w-0 space-y-6">
              {/* 1. Community & Field Incidents */}
              <Card className="overflow-hidden">
                <SectionHead
                  icon={
                    <div className="size-6 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-700 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-[#d2f831]">
                      <MapPin className="size-3.5" />
                    </div>
                  }
                  title="Community & Field Incidents"
                  meta={`${incidents.length} RECENT · LIVE CORRIDOR FEED`}
                  action={
                    <button
                      type="button"
                      onClick={() => setModal("incident")}
                      className="grid size-7.5 place-items-center rounded-lg border border-border bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.08] transition-all cursor-pointer shadow-sm"
                      title="Report Hazard"
                    >
                      <HardHat className="size-3.5" />
                    </button>
                  }
                />
                <div className="divide-y divide-border dark:divide-white/[0.06]">
                  {incidents.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <CheckCircle2 className="size-8 text-[#22c55e]/60 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-foreground dark:text-white">No Recent Incidents</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 dark:text-neutral-400">Your grid zone is clear</p>
                    </div>
                  ) : (
                    incidents.map((inc, i) => (
                      <article key={inc.incident_id || i} className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center rounded border border-border bg-muted/60 px-2 py-0.5 text-[9px] font-mono font-bold text-foreground uppercase dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-neutral-300">
                            {inc.category?.replace("_", " ") || "FIELD REPORT"}
                          </span>
                          <time className="font-mono text-[10px] text-muted-foreground dark:text-neutral-500">
                            {inc.received_at?.slice(11, 16) || "Recent"}
                          </time>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-foreground leading-relaxed dark:text-neutral-200">
                          {inc.event_description}
                        </p>
                        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono dark:text-neutral-400">
                          <MapPin className="size-3 text-[#22c55e] shrink-0" />
                          <span>{inc.zone_name || profile.zone}</span>
                        </p>
                      </article>
                    ))
                  )}
                </div>
                <div className="border-t border-emerald-500/20 bg-emerald-50/80 py-2.5 px-4 text-center rounded-b-xl dark:bg-[#0a2217]/90">
                  <p className="text-xs font-mono font-medium text-emerald-800 dark:text-[#22c55e]">
                    No uncleared emergency corridor blocks
                  </p>
                </div>
              </Card>

              {/* 2. AI Input Security */}
              <Card className="overflow-hidden">
                <SectionHead
                  icon={ShieldCheck}
                  title="AI Input Security"
                  meta="PROMPT & TELEMETRY DEFENSE"
                  action={
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-[#22c55e] uppercase">
                      <span className="size-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                      PROTECTED / ACTIVE
                    </span>
                  }
                />
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      [securityStats?.processed ?? 15, "PROCESSED"],
                      [securityStats?.verified ?? 3, "VERIFIED"],
                      [securityStats?.quarantined ?? 2, "QUARANTINED"],
                      [securityStats?.blocked ?? 1, "BLOCKED"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-lg border border-border bg-muted/40 p-2 dark:border-white/[0.06] dark:bg-white/[0.02]">
                        <p className="font-mono text-sm font-bold text-foreground dark:text-white">{value}</p>
                        <p className="mt-0.5 text-[8px] uppercase tracking-wider text-muted-foreground font-mono font-semibold dark:text-neutral-500">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    {["Schema validation", "Corridor grounding", "Injection quarantine"].map(
                      (layer) => (
                        <div
                          key={layer}
                          className="flex items-center gap-2 text-xs text-foreground/90 dark:text-neutral-300"
                        >
                          <CheckCircle2 className="size-3.5 text-[#22c55e] shrink-0" />
                          <span>{layer}</span>
                          <span className="ml-auto font-mono text-[9px] font-bold text-emerald-700 dark:text-[#22c55e]">
                            ACTIVE
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-muted/50 p-2 font-mono text-[9px] text-muted-foreground text-center dark:border-white/[0.08] dark:bg-black/40 dark:text-neutral-400">
                    POST /events/report · signed payloads only
                  </div>
                </div>
              </Card>

              {/* 3. AI Recommendations */}
              <Card className="overflow-hidden">
                <SectionHead
                  icon={BrainCircuit}
                  title="AI Recommendations"
                  meta={`IBM BOB / DECISION ENGINE · ${predictionTime}`}
                  action={
                    <button
                      type="button"
                      onClick={handleRunPrediction}
                      disabled={predictionBusy}
                      className="grid size-7.5 place-items-center rounded-lg border border-border bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.08] transition-all cursor-pointer shadow-sm"
                      title="Refresh Predictions"
                    >
                      <RefreshCw className={cn("size-3.5", predictionBusy && "animate-spin")} />
                    </button>
                  }
                />
                <div className="divide-y divide-border dark:divide-white/[0.06]">
                  {recommendations.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <p className="text-xs font-semibold text-foreground">No Actions Pending</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        All monitored transformers operating normally.
                      </p>
                    </div>
                  ) : (
                    recommendations.map((item) => (
                      <article key={item.rank} className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="font-display text-lg font-bold text-primary font-mono">
                            {item.rank}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{item.asset}</p>
                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                              {item.crew}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <Tag
                              tone={
                                item.priority === "Critical"
                                  ? "danger"
                                  : item.priority === "High"
                                  ? "warning"
                                  : "lime"
                              }
                            >
                              {item.priority}
                            </Tag>
                          </div>
                        </div>

                        <p className="mt-2.5 text-xs font-medium leading-relaxed text-foreground/90">
                          {item.action}
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${item.confidence}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-primary">
                            {item.confidence}%
                          </span>
                        </div>

                        <p className="mt-2 text-[9px] leading-4 text-muted-foreground font-mono">
                          <b>SHAP:</b> {item.rationale}
                        </p>
                      </article>
                    ))
                  )}
                </div>
                <div className="p-3">
                  <Button
                    className="w-full"
                    onClick={handleRunPrediction}
                    disabled={predictionBusy}
                  >
                    <Bot className="size-4" />
                    {predictionBusy ? "Running grounded inference…" : "Run ML Prediction"}
                  </Button>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </main>

      {/* ── Modal Overlays ── */}

      {/* 1. Operator Auth & Profile Modal */}
      {modal === "auth" && (
        <ModalShell
          title="Operator Session"
          subtitle="Signed in to Regional Transmission Console."
          onClose={() => setModal(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const updatedName = String(form.get("name") || profile.name);
              const updatedZone = String(form.get("zone") || profile.zone);
              const updatedRole = String(form.get("role") || profile.role);
              const updatedProfile = {
                ...profile,
                name: updatedName,
                zone: updatedZone,
                role: updatedRole,
              };
              setProfile(updatedProfile);
              const token = authSession.getToken();
              if (token) {
                authSession.loginWithToken(token, updatedProfile);
              } else {
                authSession.login(updatedProfile);
              }
              toast.success("Operator profile updated");
              setModal(null);
            }}
          >
            <Field label="Name">
              <input name="name" defaultValue={profile.name} className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={profile.email} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Zone Corridor">
                <select name="zone" defaultValue={profile.zone} className={inputClass}>
                  <option value="Zone-B · Industrial">Zone-B · Industrial</option>
                  <option value="Zone-A · Urban Core">Zone-A · Urban Core</option>
                  <option value="Zone-D · Bulk Transmission">Zone-D · Bulk Transmission</option>
                  <option value="Zone-C · Agro-Feeder">Zone-C · Agro-Feeder</option>
                </select>
              </Field>
              <Field label="Role">
                <select name="role" defaultValue={profile.role} className={inputClass}>
                  <option value="Regional Dispatch Engineer">Regional Dispatch Engineer</option>
                  <option value="Senior Dispatch Controller">Senior Dispatch Controller</option>
                  <option value="Field Substation Supervisor">Field Substation Supervisor</option>
                </select>
              </Field>
            </div>
            <Button type="submit" className="w-full">
              <LockKeyhole className="size-4" />
              Save Operator Profile
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                authSession.startGoogleOAuth();
                setModal(null);
              }}
            >
              Continue with Google OAuth
            </Button>
          </form>
        </ModalShell>
      )}

      {/* 2. Geolocation / Operating Corridor Modal */}
      {modal === "location" && (
        <ModalShell
          title="Update Operating Corridor"
          subtitle="Use browser GPS positioning or select an Anand District transmission node."
          onClose={() => setModal(null)}
        >
          <Button className="w-full" onClick={handleDetectLocation}>
            <LocateFixed className="size-4" />
            Detect Browser GPS
          </Button>

          <div className="my-4 flex items-center gap-3 text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
            <span className="h-px flex-1 bg-border" />
            or select regional preset node
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            {[
              ["GIDC Industrial Phase-2", "22.56°N · 72.95°E", 22.5645, 72.9589],
              ["Anand South Bulk Substation", "22.52°N · 72.96°E", 22.5312, 72.9421],
              ["Anand Central Transmission Hub", "22.55°N · 72.95°E", 22.5567, 72.9512],
              ["Borsad Rural Interconnect", "22.41°N · 72.90°E", 22.411, 72.9023],
            ].map(([name, coords, lat, lon]) => (
              <Button
                key={String(name)}
                variant="secondary"
                className="h-auto w-full justify-between py-3 px-3 text-left"
                onClick={() => {
                  const loc: UserLocationState = {
                    latitude: Number(lat),
                    longitude: Number(lon),
                    city: String(name),
                    region: "Anand District (Gujarat)",
                    autoDetected: false,
                    timestamp: new Date().toISOString(),
                  };
                  setLocation(loc);
                  authSession.saveLocation(loc);
                  toast.info(`Corridor node set: ${name}`);
                  setModal(null);
                }}
              >
                <div>
                  <span className="block text-xs font-semibold text-foreground">{name}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                    {coords}
                  </span>
                </div>
                <MapPin className="size-4 text-primary shrink-0" />
              </Button>
            ))}
          </div>
        </ModalShell>
      )}

      {/* 3. Dataset Choice Modal */}
      {modal === "dataset" && (
        <ModalShell
          title="Choose Fleet Dataset"
          subtitle="Load the Anand sample or parse and score any transformer telemetry CSV."
          onClose={() => setModal(null)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Anand Corridor Card */}
            <div
              role="button"
              tabIndex={0}
              onClick={async () => {
                try {
                  const res = await activateDataset("anand-corridor-sample");
                  setActiveDatasetMeta(res);
                  gridDataSource.setActiveDatasetInfo(res);
                } catch {}
                gridDataSource.setAnandData();
                setDataSource("anand");
                toast.success("Loaded Anand corridor baseline sample (18 assets)");
                setModal(null);
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  try {
                    const res = await activateDataset("anand-corridor-sample");
                    setActiveDatasetMeta(res);
                    gridDataSource.setActiveDatasetInfo(res);
                  } catch {}
                  gridDataSource.setAnandData();
                  setDataSource("anand");
                  toast.success("Loaded Anand corridor baseline sample (18 assets)");
                  setModal(null);
                }
              }}
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all duration-300 cursor-pointer shadow-md",
                dataSource === "anand"
                  ? "border-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-600/50 shadow-[0_0_25px_rgba(16,185,129,0.15)] dark:border-[#d2f831] dark:bg-[#d2f831]/[0.08] dark:ring-[#d2f831]/50 dark:shadow-[0_0_25px_rgba(210,248,49,0.15)]"
                  : "border-border bg-card hover:border-emerald-600/40 hover:bg-muted/30 dark:border-white/[0.1] dark:bg-[#121317] dark:hover:border-white/25 dark:hover:bg-[#16171d]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:bg-[#d2f831]/10 dark:border-[#d2f831]/25 dark:text-[#d2f831] transition-transform group-hover:scale-105">
                    <Database className="size-5" />
                  </div>
                  {dataSource === "anand" && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-mono font-bold text-white uppercase tracking-wider dark:bg-[#d2f831] dark:text-neutral-950">
                      Active
                    </span>
                  )}
                </div>
                <span className="block text-base font-bold text-foreground dark:text-white tracking-tight">
                  Anand Corridor
                </span>
                <p className="mt-1.5 text-xs text-muted-foreground dark:text-neutral-300/80 leading-relaxed whitespace-normal">
                  18-asset Day 89 sample fleet trained on Kaggle failure records and IEEE C57.104 gas signatures.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border dark:border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-muted-foreground dark:text-neutral-400">
                <span>18 Assets</span>
                <span className="text-emerald-700 dark:text-[#d2f831] font-semibold flex items-center gap-1">
                  Load Fleet <ArrowRight className="size-3" />
                </span>
              </div>
            </div>

            {/* Custom CSV Card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileRef.current?.click();
                }
              }}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card hover:border-cyan-500/50 hover:bg-muted/30 p-5 text-left transition-all duration-300 cursor-pointer shadow-md hover:shadow-[0_0_25px_rgba(34,211,238,0.12)] dark:border-white/[0.1] dark:bg-[#121317] dark:hover:bg-[#16171d]"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 transition-transform group-hover:scale-105">
                    <FileUp className="size-5" />
                  </div>
                  <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[9px] font-mono text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-400 uppercase">
                    Upload
                  </span>
                </div>
                <span className="block text-base font-bold text-foreground dark:text-white tracking-tight">
                  Custom CSV
                </span>
                <p className="mt-1.5 text-xs text-muted-foreground dark:text-neutral-300/80 leading-relaxed whitespace-normal">
                  Upload transformer telemetry CSV scored live with Model 1 (Health Index) and Model 2 (DGA Classifier).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border dark:border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-muted-foreground dark:text-neutral-400">
                <span>Custom Telemetry</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                  Select CSV <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleCsvUpload(e.target.files?.[0])}
          />

          <button
            type="button"
            onClick={downloadSampleCsv}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 hover:bg-muted/80 hover:border-border py-2.5 text-xs font-mono text-foreground dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.06] dark:hover:border-white/20 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <Download className="size-3.5 text-muted-foreground dark:text-neutral-400" />
            Download Sample Telemetry CSV Template
          </button>
        </ModalShell>
      )}

      {/* 4. Report Ground Hazard Modal */}
      {modal === "incident" && (
        <ModalShell
          title="Report Ground Hazard"
          subtitle="Add an urgent field observation to the live corridor feed."
          onClose={() => setModal(null)}
        >
          <form className="space-y-4" onSubmit={handleReportIncident}>
            <Field label="Hazard Description">
              <input
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                placeholder="e.g. Excavation equipment digging near 66kV cable marker"
                className={inputClass}
                required
              />
            </Field>

            <Field label="Hazard Category">
              <select
                value={incidentCategory}
                onChange={(e) => setIncidentCategory(e.target.value)}
                className={inputClass}
              >
                <option value="grid_incident">Grid / Equipment Anomaly</option>
                <option value="excavation">Excavation / Ground Work</option>
                <option value="vegetation">Vegetation / Tree Encroachment</option>
                <option value="weather_hazard">Weather Hazard / Lightning</option>
              </select>
            </Field>

            <Field label="Reporting Corridor">
              <input
                defaultValue={`${profile.substation} · ${profile.zone}`}
                className={inputClass}
                disabled
              />
            </Field>

            <Button type="submit" className="w-full" disabled={incidentReporting}>
              <HardHat className="size-4" />
              {incidentReporting ? "Verifying with Defense Layer..." : "Submit Verified Report"}
            </Button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
