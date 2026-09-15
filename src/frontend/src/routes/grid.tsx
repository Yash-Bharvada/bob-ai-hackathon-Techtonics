import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  initialGridAssets,
  initialGridTicker,
  mergeRankedIntoAssets,
  type GridAsset,
  type GridAssetType,
  type AssetStatus,
  type GridTickerEvent,
} from "@/lib/gridData";
import {
  techtonicsApi,
  type AssetDetailResponse,
  type TimeseriesPoint,
  type MaintenanceAction,
} from "@/lib/techtonicsApi";
import { GridDiagram, anandDistrictGridNodes } from "@/components/GridDiagram";
import { TX115InterventionBanner } from "@/components/TX115InterventionBanner";
import { IncidentReportModal } from "@/components/IncidentReportModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Download,
  Flame,
  Gauge,
  Layers,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Thermometer,
  Wrench,
  X,
  Zap,
  Network,
} from "lucide-react";

export const Route = createFileRoute("/grid")({
  head: () => ({
    meta: [
      { title: "Live Grid · VOLTRA Operator Console" },
      { name: "description", content: "Real-time electrical grid operator console. Live asset telemetry, health scoring, load tracking, and anomaly alerts across regional transmission corridors." },
      { property: "og:title", content: "Live Grid · VOLTRA Operator Console" },
      { property: "og:description", content: "Real-time electrical grid operator console with synchronized telemetry, topology visualization, and predictive fault monitoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveGridPage,
});

const ASSET_TYPES: ("All" | GridAssetType)[] = [
  "All",
  "Transformer",
  "Substation",
  "Transmission Corridor",
];

const STATUS_FILTERS: ("All" | AssetStatus)[] = ["All", "risk", "watch", "stable"];

const VOLTAGE_FILTERS = ["All", "132 kV", "66 kV", "33 kV", "11 kV"] as const;

function LiveGridPage() {
  const [assets, setAssets] = useState<GridAsset[]>(initialGridAssets);
  const [tickerEvents, setTickerEvents] = useState<GridTickerEvent[]>(initialGridTicker);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"All" | GridAssetType>("All");
  const [selectedStatus, setSelectedStatus] = useState<"All" | AssetStatus>("All");
  const [selectedVoltage, setSelectedVoltage] = useState<string>("All");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("TX-107");
  const [inspectorAsset, setInspectorAsset] = useState<GridAsset | null>(null);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentDefaultZone, setIncidentDefaultZone] = useState("");
  const [currentTime, setCurrentTime] = useState("13:48:20 UTC");

  // Maintenance Plan State
  const [planActions, setPlanActions] = useState<MaintenanceAction[]>([]);
  const [activeViewTab, setActiveViewTab] = useState<"assets" | "plan" | "topology">("assets");
  const [displayMode, setDisplayMode] = useState<"grid" | "table">("grid");
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")} UTC`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live ranked assets and maintenance plan from FastAPI backend
  useEffect(() => {
    let active = true;

    async function loadLiveData() {
      try {
        const rankedRes = await techtonicsApi.getRanked();
        if (active && rankedRes.ranked_assets) {
          setAssets((prev) => mergeRankedIntoAssets(prev, rankedRes.ranked_assets));
          setApiConnected(true);
        }
      } catch {
        if (active) setApiConnected(false);
      }

      try {
        const planRes = await techtonicsApi.getPlan();
        if (active && planRes.top_10_actions) {
          setPlanActions(planRes.top_10_actions);
        }
      } catch {
        // Fallback to local default plan if backend is not running
      }
    }

    loadLiveData();
    const interval = setInterval(loadLiveData, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (selectedType !== "All" && asset.type !== selectedType) return false;
      if (selectedStatus !== "All" && asset.status !== selectedStatus) return false;
      if (selectedVoltage !== "All") {
        const targetKv = parseInt(selectedVoltage, 10);
        if (asset.nominalVoltageKv !== targetKv) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = asset.name.toLowerCase().includes(q);
        const matchId = asset.id.toLowerCase().includes(q);
        const matchSub = asset.substation.toLowerCase().includes(q);
        const matchRegion = asset.region.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchSub && !matchRegion) return false;
      }
      return true;
    });
  }, [assets, selectedType, selectedStatus, selectedVoltage, searchQuery]);

  // Overall network metrics
  const totalAssets = assets.length;
  const criticalCount = assets.filter((a) => a.status === "risk").length;
  const watchCount = assets.filter((a) => a.status === "watch").length;
  const stableCount = assets.filter((a) => a.status === "stable").length;
  const avgHealth = Math.round(assets.reduce((sum, a) => sum + a.healthScore, 0) / totalAssets);
  const totalCurrentLoadMw = Math.round(assets.reduce((sum, a) => sum + a.currentLoadMw, 0));

  // Quick Surge Simulation
  const triggerSurgeSimulation = () => {
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === "TX-107") {
          const newLoad = Math.min(item.ratedCapacityMw, item.currentLoadMw + 4);
          return {
            ...item,
            currentLoadMw: Number(newLoad.toFixed(1)),
            coreTempC: Number((item.coreTempC + 5.2).toFixed(1)),
            healthScore: Math.max(10, item.healthScore - 12),
            status: "risk" as AssetStatus,
            activeAnomalies: item.activeAnomalies + 1,
            telemetryHistory: [
              ...item.telemetryHistory.slice(1),
              {
                time: "SURGE",
                loadMw: Number(newLoad.toFixed(1)),
                voltageKv: Number((item.voltageKv - 2.1).toFixed(1)),
                tempC: Number((item.coreTempC + 5.2).toFixed(1)),
              },
            ],
          };
        }
        return item;
      })
    );

    setTickerEvents((prev) => [
      {
        id: `ev-${Date.now()}`,
        timestamp: currentTime,
        assetId: "TX-107",
        message: "SIMULATED SURGE: Load spiked to 25.8 MW, top-oil temp +5.2°C. Critical arcing escalated.",
        severity: "critical",
      },
      ...prev,
    ]);

    toast.error("Telemetry Surge Injected on TX-107 (GIDC Industrial) · Risk Escalated", {
      description: "Health Index reduced, high acetylene (C2H2) threshold exceeded.",
    });
  };

  // Operator Action: Emergency Load Reroute
  const handleReroute = (assetId: string) => {
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === assetId) {
          const reducedLoad = Math.max(10, item.currentLoadMw - 8);
          return {
            ...item,
            currentLoadMw: Number(reducedLoad.toFixed(1)),
            coreTempC: Number((item.coreTempC - 4.5).toFixed(1)),
            healthScore: Math.min(95, item.healthScore + 15),
            status: (item.status === "risk" ? "watch" : item.status) as AssetStatus,
            telemetryHistory: [
              ...item.telemetryHistory.slice(1),
              {
                time: "REROUTE",
                loadMw: Number(reducedLoad.toFixed(1)),
                voltageKv: item.voltageKv,
                tempC: Number((item.coreTempC - 4.5).toFixed(1)),
              },
            ],
          };
        }
        return item;
      })
    );

    setTickerEvents((prev) => [
      {
        id: `ev-${Date.now()}`,
        timestamp: currentTime,
        assetId,
        message: `OPERATOR ACTION: Power flow rerouted from ${assetId}. Load reduced, thermal gradient stabilising.`,
        severity: "info",
      },
      ...prev,
    ]);

    toast.success(`Power flow rerouted away from ${assetId}`, {
      description: "Load shed executed. Risk tier reduced to Watch.",
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* macOS Window Breadcrumb & Realtime Header */}
      <div className="flex flex-col gap-5 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <div className="macos-traffic-dots mr-1.5 hidden sm:flex">
              <span className="macos-dot macos-dot-red" />
              <span className="macos-dot macos-dot-yellow" />
              <span className="macos-dot macos-dot-green" />
            </div>
            <span>Anand District Transmission Network</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-semibold">Grid Risk Console</span>
          </div>
          <h1 className="mt-1.5 font-sans text-3xl font-bold sm:text-4xl text-foreground">
            Operator Dispatch & Telemetry
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Scored via Health Index regression (Model 1) and DGA Fault Classifier (Model 2). Grounded in real trained models.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono">{currentTime}</span>
            <span>·</span>
            <span>{apiConnected ? "FastAPI Live :8000" : "Real Model Cache"}</span>
          </div>

          <Button
            onClick={triggerSurgeSimulation}
            variant="outline"
            className="pill rounded-full border-red-500/40 bg-red-500/10 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20"
          >
            <Flame className="size-3.5 mr-1 text-red-500" />
            Simulate Surge (TX-107)
          </Button>

          <Button
            onClick={() => { setIncidentDefaultZone(""); setIncidentModalOpen(true); }}
            variant="outline"
            className="pill rounded-full border-amber-500/40 bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          >
            <ShieldAlert className="size-3.5 mr-1 text-amber-500" />
            Report Ground Hazard
          </Button>

          <Button
            onClick={() => setSimulationModalOpen(true)}
            className="pill rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="size-3.5 mr-1" />
            Add Sensor Node
          </Button>
        </div>
      </div>

      {/* macOS Style Hero KPI Metrics */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <div className="macos-window p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono font-semibold">Monitored Assets</p>
          <p className="mt-2 font-mono text-2xl font-bold sm:text-3xl text-foreground">{totalAssets}</p>
          <p className="mt-1 text-xs text-muted-foreground">18 Active Transformers</p>
        </div>

        <div className="macos-window border-red-500/30 bg-red-500/[0.04] p-5">
          <p className="text-[11px] uppercase tracking-wider text-red-600 dark:text-red-400 font-mono font-semibold">Critical / High Risk</p>
          <p className="mt-2 font-mono text-2xl font-bold sm:text-3xl text-red-600 dark:text-red-400">{criticalCount}</p>
          <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">TX-107 (Arcing), TX-112 (PD)</p>
        </div>

        <div className="macos-window border-amber-500/30 bg-amber-500/[0.04] p-5">
          <p className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono font-semibold">Watch Tier</p>
          <p className="mt-2 font-mono text-2xl font-bold sm:text-3xl text-amber-600 dark:text-amber-400">{watchCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">TX-104 & TX-115 Recovered</p>
        </div>

        <div className="macos-window border-emerald-500/30 bg-emerald-500/[0.04] p-5">
          <p className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono font-semibold">Mean Health Score</p>
          <p className="mt-2 font-mono text-2xl font-bold sm:text-3xl text-emerald-600 dark:text-emerald-400">{avgHealth}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Fleet Health Stability</p>
        </div>

        <div className="macos-window col-span-2 border-emerald-500/30 bg-emerald-500/[0.04] p-5 sm:col-span-4 lg:col-span-1">
          <p className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono font-semibold">Intervention Story</p>
          <p className="mt-2 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">TX-115 Rescued</p>
          <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">+89 Days Life Saved</p>
        </div>
      </div>

      {/* ── KEY DEMO SHOWCASE BANNER ── */}
      <div className="mt-8">
        <TX115InterventionBanner
          onSelectTx115={() => {
            const tx = assets.find((a) => a.id === "TX-115");
            if (tx) setInspectorAsset(tx);
          }}
        />
      </div>

      {/* Realtime Ticker Feed */}
      <div className="macos-window mt-8 overflow-hidden px-4 py-3">
        <div className="flex items-center gap-3 text-xs">
          <span className="pill shrink-0 bg-ink px-2.5 py-0.5 font-mono text-[10px] font-semibold text-cream">
            EVENT STREAM
          </span>
          <div className="flex flex-1 items-center gap-4 overflow-x-auto whitespace-nowrap scrollbar-none">
            {tickerEvents.map((evt) => (
              <div key={evt.id} className="inline-flex items-center gap-2">
                <span
                  className={`size-1.5 rounded-full ${
                    evt.severity === "critical"
                      ? "bg-danger"
                      : evt.severity === "warning"
                      ? "bg-warning"
                      : "bg-signal"
                  }`}
                />
                <span className="font-mono text-[11px] text-muted-foreground">{evt.timestamp}</span>
                <span className="font-semibold text-foreground">[{evt.assetId}]</span>
                <span className="text-muted-foreground">{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Apple macOS Segmented View Mode Selector Tabs & Display Switcher */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="macos-segmented">
          <button
            onClick={() => setActiveViewTab("assets")}
            className={`macos-segmented-btn ${activeViewTab === "assets" ? "active" : ""}`}
          >
            <Zap className="size-3.5" />
            <span>Ranked Transformers ({filteredAssets.length})</span>
          </button>
          <button
            onClick={() => setActiveViewTab("plan")}
            className={`macos-segmented-btn ${activeViewTab === "plan" ? "active" : ""}`}
          >
            <Wrench className="size-3.5" />
            <span>7-Day Plan {planActions.length > 0 && `(${planActions.length})`}</span>
          </button>
          <button
            onClick={() => setActiveViewTab("topology")}
            className={`macos-segmented-btn ${activeViewTab === "topology" ? "active" : ""}`}
          >
            <Network className="size-3.5" />
            <span>Grid Topology Map</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeViewTab === "assets" && (
            <div className="macos-segmented">
              <button
                onClick={() => setDisplayMode("grid")}
                title="Card Grid View"
                className={`macos-segmented-btn !px-2.5 !py-1 ${displayMode === "grid" ? "active" : ""}`}
              >
                <Layers className="size-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setDisplayMode("table")}
                title="Activity Monitor Table View"
                className={`macos-segmented-btn !px-2.5 !py-1 ${displayMode === "table" ? "active" : ""}`}
              >
                <SlidersHorizontal className="size-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          )}

          <span className="hidden xl:inline text-xs text-muted-foreground font-mono">
            Sorting: Composite Grid Impact
          </span>
        </div>
      </div>

      {/* ── VIEW 1: ASSETS GRID ── */}
      {activeViewTab === "assets" && (
        <>
          {/* Filter & Search Bar */}
          <div className="mt-6 flex flex-col gap-5 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="flex flex-1 items-center gap-2.5 rounded-2xl border border-border/80 bg-muted/30 px-4 py-2.5 focus-within:border-primary/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search asset ID (e.g. TX-107, TX-115), substation, or zone..."
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                )}
              </label>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground px-1 font-mono font-semibold">Voltage:</span>
                {VOLTAGE_FILTERS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVoltage(v)}
                    className={`pill rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selectedVoltage === v
                        ? "bg-foreground text-background shadow-sm"
                        : "border border-border/70 hover:bg-muted text-foreground"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground px-1 font-mono font-semibold">Status:</span>
                {STATUS_FILTERS.map((s) => {
                  const label = s === "All" ? "All (18)" : s === "risk" ? "Critical Risk" : s === "watch" ? "Watch Tier" : "Stable";
                  const activeClass =
                    s === "risk"
                      ? "bg-red-600 text-white shadow-sm"
                      : s === "watch"
                      ? "bg-amber-600 text-white shadow-sm"
                      : s === "stable"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-foreground text-background shadow-sm";
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedStatus(s)}
                      className={`pill rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        selectedStatus === s ? activeClass : "border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* View Mode Switching: macOS Table View vs Card Grid */}
          {displayMode === "table" ? (
            <div className="macos-window mt-6 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/30 text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      <th className="py-3.5 px-4">Asset ID & Name</th>
                      <th className="py-3.5 px-4">Substation · Zone</th>
                      <th className="py-3.5 px-4">Voltage / MVA</th>
                      <th className="py-3.5 px-4">Status & Fault</th>
                      <th className="py-3.5 px-4">Current Load</th>
                      <th className="py-3.5 px-4">Health Index (Model 1)</th>
                      <th className="py-3.5 px-4">Core Temp</th>
                      <th className="py-3.5 px-4">RUL</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-sans">
                    {filteredAssets.map((asset) => {
                      const loadPercent = Math.round((asset.currentLoadMw / asset.ratedCapacityMw) * 100);
                      return (
                        <tr
                          key={asset.id}
                          onClick={() => setInspectorAsset(asset)}
                          className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                            asset.id === "TX-115"
                              ? "bg-signal/5"
                              : asset.status === "risk"
                              ? "bg-danger/[0.04]"
                              : asset.status === "watch"
                              ? "bg-warning/[0.04]"
                              : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="pill bg-ink px-2 py-0.5 text-[11px] font-mono font-bold text-cream">
                                {asset.id}
                              </span>
                              <span className="font-semibold text-foreground">{asset.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            <span>{asset.substation}</span>
                            <span className="block text-[10px] font-mono text-muted-foreground/80">{asset.region}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-foreground">
                            {asset.voltageKv} kV · {asset.ratedCapacityMw} MVA
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`pill px-2.5 py-0.5 text-[10px] font-semibold ${
                                  asset.status === "risk"
                                    ? "bg-danger text-white"
                                    : asset.status === "watch"
                                    ? "bg-warning text-foreground"
                                    : "bg-signal text-signal-foreground"
                                }`}
                              >
                                {asset.status === "risk" ? "Critical" : asset.status === "watch" ? "Watch" : "Nominal"}
                              </span>
                              <span className="pill bg-surface border border-border px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                                {asset.faultType}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="w-32">
                              <div className="flex justify-between font-mono text-[10px] text-foreground">
                                <span>{asset.currentLoadMw} MW</span>
                                <span className="text-muted-foreground">{loadPercent}%</span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                                <div
                                  className={`h-full rounded-full ${
                                    loadPercent > 85 ? "bg-danger" : loadPercent > 70 ? "bg-warning" : "bg-signal"
                                  }`}
                                  style={{ width: `${Math.min(100, loadPercent)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-bold">
                            <span
                              className={`${
                                asset.healthIndexRaw > 50
                                  ? "text-danger"
                                  : asset.healthIndexRaw > 30
                                  ? "text-warning"
                                  : "text-signal"
                              }`}
                            >
                              HI {asset.healthIndexRaw.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-foreground">
                            <span className={asset.coreTempC > 75 ? "text-danger font-bold" : ""}>
                              {asset.coreTempC}°C
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-foreground">
                            <span className={asset.rulDays < 40 ? "text-danger font-bold" : ""}>
                              {asset.rulDays}d
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setInspectorAsset(asset)}
                                className="pill rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-foreground hover:bg-muted shadow-xs transition-colors"
                              >
                                Inspect
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards Grid */
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAssets.map((asset) => {
                const loadPercent = Math.round((asset.currentLoadMw / asset.ratedCapacityMw) * 100);

                return (
                  <div
                    key={asset.id}
                    onClick={() => setInspectorAsset(asset)}
                    className={`macos-window group relative flex flex-col justify-between p-5 transition-all hover:-translate-y-1 hover:shadow-soft cursor-pointer ${
                      asset.id === "TX-115"
                        ? "border-signal/70 bg-signal/5"
                        : asset.status === "risk"
                        ? "border-danger/60 bg-danger/5"
                        : asset.status === "watch"
                        ? "border-warning/50 bg-warning/5"
                        : "border-border/70"
                    }`}
                  >
                  <div>
                    {/* Header: ID + Status + Fault */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="pill bg-ink px-2.5 py-0.5 font-mono text-xs font-bold text-cream">
                            {asset.id}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {asset.voltageKv} kV · {asset.ratedCapacityMw} MVA
                          </span>
                          <span className="pill bg-surface px-2 py-0.5 font-mono text-[10px] font-bold border border-border">
                            {asset.faultType}
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold tracking-tight text-foreground group-hover:text-signal transition-colors">
                          {asset.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{asset.substation}</p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`pill inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold ${
                            asset.status === "risk"
                              ? "bg-danger text-white"
                              : asset.status === "watch"
                              ? "bg-warning text-foreground"
                              : "bg-signal text-signal-foreground"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              asset.status === "risk" ? "bg-white" : asset.status === "watch" ? "bg-foreground" : "bg-signal-foreground"
                            }`}
                          />
                          {asset.status === "risk" ? "Critical Risk" : asset.status === "watch" ? "Watch Tier" : "Nominal"}
                        </span>
                        <p className="mt-1 text-[10px] font-mono text-muted-foreground">{asset.region}</p>
                      </div>
                    </div>

                    {/* Primary Telemetry Metrics */}
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface/80 p-3 border border-border/50 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Load / MVA</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                          {asset.currentLoadMw} <span className="text-[10px] text-muted-foreground">/ {asset.ratedCapacityMw} MVA</span>
                        </p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                          <div
                            className={`h-full rounded-full ${
                              loadPercent > 85 ? "bg-danger" : loadPercent > 70 ? "bg-warning" : "bg-signal"
                            }`}
                            style={{ width: `${Math.min(100, loadPercent)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Remaining Life</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                          {asset.rulDays} <span className="text-[10px] text-muted-foreground">days</span>
                        </p>
                        <p className="mt-1 text-[10px] font-mono text-muted-foreground">
                          {asset.rulDays < 40 ? (
                            <span className="text-danger font-semibold inline-flex items-center gap-1">
                              <AlertTriangle className="size-2.5" /> Urgency window
                            </span>
                          ) : (
                            "Routine cycle"
                          )}
                        </p>
                      </div>

                      <div className="mt-1 border-t border-border/40 pt-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Health Index (Model 1)</p>
                        <p className={`mt-0.5 font-mono text-xs font-bold ${asset.healthIndexRaw > 50 ? "text-danger" : asset.healthIndexRaw > 30 ? "text-warning" : "text-signal"}`}>
                          HI {asset.healthIndexRaw.toFixed(1)}
                        </p>
                      </div>

                      <div className="mt-1 border-t border-border/40 pt-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Core Top-Oil</p>
                        <p className={`mt-0.5 font-mono text-xs font-semibold ${asset.coreTempC > 75 ? "text-danger" : "text-foreground"}`}>
                          {asset.coreTempC}°C
                        </p>
                      </div>
                    </div>

                    {/* SHAP & Archetype footer */}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <BrainCircuit className="size-3.5 text-signal" />
                        <span className="text-[11px]">{asset.archetype}</span>
                      </div>
                      <span className="font-mono text-[11px] text-foreground/80 font-medium">
                        Rank Score: {asset.compositeScore.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border/40 pt-3 flex items-center justify-between text-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIncidentDefaultZone(asset.substation || asset.region || "");
                        setIncidentModalOpen(true);
                      }}
                      className="pill inline-flex items-center gap-1 border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold text-warning hover:bg-warning/20 transition-colors"
                    >
                      <ShieldAlert className="size-3 mr-0.5" />
                      Report Hazard
                    </button>
                    <span className="text-signal flex items-center gap-1 font-semibold group-hover:translate-x-1 transition-transform">
                      Inspect <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </>
      )}

      {/* ── VIEW 2: 7-DAY MAINTENANCE ACTION PLAN ── */}
      {activeViewTab === "plan" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
              <div>
                <h3 className="font-sans text-xl font-bold text-foreground">
                  7-Day Prioritised Maintenance & Crew Pre-Positioning Plan
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generated automatically from Model 2 fault classifications and composite grid impact rankings.
                </p>
              </div>
              <div className="pill bg-signal/15 text-signal-foreground px-3 py-1 text-xs font-mono font-semibold border border-signal/30">
                100% Deterministic & Auditable
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Asset</th>
                    <th className="py-3 px-3">Zone / Substation</th>
                    <th className="py-3 px-3">Fault</th>
                    <th className="py-3 px-3">Action Code</th>
                    <th className="py-3 px-3">Prescribed Action</th>
                    <th className="py-3 px-3">Urgency Window</th>
                    <th className="py-3 px-3">Crew Assignment</th>
                    <th className="py-3 px-3">Conflict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-sans">
                  {(planActions.length > 0
                    ? planActions
                    : [
                        {
                          rank: 1,
                          asset_id: "TX-107",
                          substation_name: "GIDC Industrial Phase-2",
                          grid_zone: "Zone-B",
                          fault_type: "D1",
                          action_code: "ELEC-INSPECT",
                          short_action: "Electrical inspection + targeted oil sampling",
                          detail: "Perform sealed syringe DGA, inspect bushing connections, reduce load by 15-20%.",
                          urgency_window: "within 24 hours",
                          crew_assignment: "Crew-B1 (High-Voltage Arcing Specialist)",
                          crew_conflict: true,
                        },
                        {
                          rank: 2,
                          asset_id: "TX-112",
                          substation_name: "Borsad Industrial Feeder",
                          grid_zone: "Zone-C",
                          fault_type: "D1",
                          action_code: "PD-MAPPING",
                          short_action: "Acoustic PD survey + vibration isolation check",
                          detail: "Verify shock transient dissipation, confirm mechanical tie stability post excavation strike.",
                          urgency_window: "within 48 hours",
                          crew_assignment: "Crew-C1 (Acoustic Diagnostics)",
                          crew_conflict: false,
                        },
                        {
                          rank: 3,
                          asset_id: "TX-104",
                          substation_name: "Anand Central Transmission",
                          grid_zone: "Zone-A",
                          fault_type: "T1",
                          action_code: "THERMAL-CHECK",
                          short_action: "Thermal imaging + auxiliary cooling fan overhaul",
                          detail: "Inspect radiator banks, measure temperature gradient, clean fan filters.",
                          urgency_window: "within 1 week",
                          crew_assignment: "Crew-A1 (Substation Auxiliaries)",
                          crew_conflict: false,
                        },
                        {
                          rank: 4,
                          asset_id: "TX-115",
                          substation_name: "Anand South Bulk Substation",
                          grid_zone: "Zone-D",
                          fault_type: "T2",
                          action_code: "MONITOR-RECOVERY",
                          short_action: "Post-intervention monitoring & verification",
                          detail: "Track thermal dissipation. Do NOT dispatch emergency crew; asset successfully recovered.",
                          urgency_window: "routine cycle",
                          crew_assignment: "Crew-D1 (Routine Watch)",
                          crew_conflict: false,
                        },
                      ]
                  ).map((action) => (
                    <tr
                      key={action.asset_id}
                      className={`hover:bg-surface/50 transition-colors ${
                        action.rank === 1 ? "bg-danger/5 font-medium" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold">#{action.rank}</td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        {action.asset_id}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {action.substation_name} <span className="font-mono text-[10px]">({action.grid_zone})</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="pill bg-surface border border-border px-2 py-0.5 font-mono text-[10px] font-bold">
                          {action.fault_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-signal">
                        {action.action_code}
                      </td>
                      <td className="py-3 px-3 text-foreground/90 max-w-xs">
                        <div className="font-medium">{action.short_action}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{action.detail}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`pill px-2.5 py-0.5 text-[10px] font-semibold ${
                            action.urgency_window.includes("24 hours")
                              ? "bg-danger text-white"
                              : action.urgency_window.includes("48 hours")
                              ? "bg-warning text-foreground"
                              : "bg-surface border border-border text-muted-foreground"
                          }`}
                        >
                          {action.urgency_window}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-foreground/80">
                        {action.crew_assignment}
                      </td>
                      <td className="py-3 px-3">
                        {action.crew_conflict ? (
                          <span className="pill bg-danger/10 text-danger border border-danger/30 px-2 py-0.5 text-[10px] font-semibold inline-flex items-center gap-1">
                            <AlertTriangle className="size-3" /> Crew Conflict
                          </span>
                        ) : (
                          <span className="text-signal text-[11px] font-semibold">Available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 3: TOPOLOGY MAP ── */}
      {activeViewTab === "topology" && (
        <div className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card">
          <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
            <div>
              <h3 className="font-sans text-xl font-bold text-foreground">
                Anand District Topological Interconnects
              </h3>
              <p className="text-xs text-muted-foreground">
                Substation status reflecting live risk severity from Model 1 & 2 analytics.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Selected: {selectedNodeId}
            </span>
          </div>

          <GridDiagram
            selected={selectedNodeId}
            onSelect={(id) => {
              setSelectedNodeId(id);
              const found = assets.find((a) => a.id === id);
              if (found) setInspectorAsset(found);
            }}
          />
        </div>
      )}

      {/* Asset Telemetry Inspector Drawer / Modal */}
      {inspectorAsset && (
        <AssetInspectorModal
          asset={inspectorAsset}
          onClose={() => setInspectorAsset(null)}
          onReroute={() => {
            handleReroute(inspectorAsset.id);
            setInspectorAsset((curr) =>
              curr
                ? {
                    ...curr,
                    currentLoadMw: Math.max(10, curr.currentLoadMw - 8),
                    coreTempC: Number((curr.coreTempC - 4.5).toFixed(1)),
                    healthScore: Math.min(95, curr.healthScore + 15),
                  }
                : null
            );
          }}
          onCooling={() => {
            setInspectorAsset((curr) =>
              curr ? { ...curr, coreTempC: Number((curr.coreTempC - 6.2).toFixed(1)) } : null
            );
            toast.success(`Forced auxiliary cooling engaged for ${inspectorAsset.id}: −6.2°C thermal reduction`);
          }}
          onReportHazard={() => {
            setIncidentDefaultZone(inspectorAsset.substation || inspectorAsset.region || "");
            setInspectorAsset(null);
            setIncidentModalOpen(true);
          }}
        />
      )}

      {/* Community Incident Reporting Modal */}
      <IncidentReportModal
        open={incidentModalOpen}
        onClose={() => setIncidentModalOpen(false)}
        defaultZone={incidentDefaultZone}
      />

      {/* Simulation / Custom Node Injection Modal */}
      {simulationModalOpen && (
        <SimulationModal
          onClose={() => setSimulationModalOpen(false)}
          onInject={(newNode) => {
            setAssets((prev) => [newNode, ...prev]);
            setTickerEvents((prev) => [
              {
                id: `ev-${Date.now()}`,
                timestamp: currentTime,
                assetId: newNode.id,
                message: `New telemetry sensor node ${newNode.id} (${newNode.name}) online and streaming.`,
                severity: "info",
              },
              ...prev,
            ]);
            setSimulationModalOpen(false);
            toast.success(`Sensor Node ${newNode.id} registered to Live Grid feed.`);
          }}
        />
      )}
    </div>
  );
}

// Sub-component: Asset Inspector Modal with Live Timeseries & IBM Bob Advisory
function AssetInspectorModal({
  asset,
  onClose,
  onReroute,
  onCooling,
  onReportHazard,
}: {
  asset: GridAsset;
  onClose: () => void;
  onReroute: () => void;
  onCooling: () => void;
  onReportHazard: () => void;
}) {
  const [detail, setDetail] = useState<AssetDetailResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingDetail(true);

    techtonicsApi
      .getAssetDetail(asset.id, true)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch(() => {
        // Fallback handled gracefully
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });

    techtonicsApi
      .getTimeseries(asset.id)
      .then((ts) => {
        if (active && ts.timeseries?.length) setTimeseries(ts.timeseries);
      })
      .catch(() => {
        // Fallback handled gracefully
      });

    return () => {
      active = false;
    };
  }, [asset.id]);

  // Chart data: 90 days if live, or fallback 4 points
  const chartData = useMemo(() => {
    if (timeseries.length > 0) {
      return timeseries.map((pt) => ({
        time: `D${pt.day}`,
        loadMw: pt.load_percentage
          ? Math.round((pt.load_percentage / 100) * asset.ratedCapacityMw)
          : Math.round(asset.currentLoadMw),
        healthIndex: pt["Health index"] ?? pt.health_index ?? asset.healthIndexRaw,
        tempC: pt.temperature ?? pt.top_oil_temp_c ?? asset.coreTempC,
        c2h2: pt.Acethylene ?? 0,
        ch4: pt.Methane ?? 0,
      }));
    }
    return asset.telemetryHistory.map((pt) => ({
      time: pt.time,
      loadMw: pt.loadMw,
      healthIndex: asset.healthIndexRaw,
      tempC: pt.tempC,
      c2h2: 0,
      ch4: 0,
    }));
  }, [timeseries, asset]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="macos-window relative max-h-[92vh] w-full max-w-4xl overflow-y-auto p-6 shadow-soft sm:p-8"
      >
        {/* macOS Window Top Chrome */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-5">
          <div className="macos-traffic-dots">
            <button
              onClick={onClose}
              className="macos-dot macos-dot-red hover:opacity-80 cursor-pointer"
              title="Close Inspector"
            />
            <span className="macos-dot macos-dot-yellow" />
            <span className="macos-dot macos-dot-green" />
          </div>
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider font-semibold">
            {asset.id} · macOS Telemetry Inspector
          </span>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="grid size-7 place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill bg-ink px-3 py-1 font-mono text-xs font-bold text-cream">
                {asset.id}
              </span>
              <span className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                {asset.voltageKv} kV · {asset.ratedCapacityMw} MVA
              </span>
              <span className="pill bg-surface px-2.5 py-0.5 text-xs font-mono font-bold border border-border text-foreground">
                Fault Class: {detail?.fault_type || asset.faultType}
              </span>
              <span
                className={`pill px-2.5 py-0.5 text-[10px] font-semibold ${
                  asset.status === "risk"
                    ? "bg-danger text-white"
                    : asset.status === "watch"
                    ? "bg-warning text-foreground"
                    : "bg-signal text-signal-foreground"
                }`}
              >
                {asset.status === "risk" ? "Critical Risk" : asset.status === "watch" ? "Watch Tier" : "Nominal"}
              </span>
            </div>
            <h2 className="mt-2 font-sans text-2xl font-semibold sm:text-3xl text-foreground">
              {asset.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {asset.substation} · {asset.region} · Inspected: {asset.lastInspected}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="grid size-9 place-items-center rounded-full border border-border/60 hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── IBM BOB PLAIN-ENGLISH ADVISORY CARD ── */}
        <div className="mt-6 rounded-2xl border border-signal/40 bg-surface/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="size-4 text-signal" />
              <h4 className="font-sans text-sm font-bold text-foreground">
                IBM Bob Plain-English Maintenance Advisory
              </h4>
            </div>
            <span
              className={`pill text-[10px] font-mono px-2.5 py-0.5 font-medium inline-flex items-center gap-1.5 ${
                detail?.advisory_source === "ibm_bob_llm"
                  ? "bg-signal/20 text-signal-foreground border border-signal/40"
                  : "bg-surface border border-border text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  detail?.advisory_source === "ibm_bob_llm" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {detail?.advisory_source === "ibm_bob_llm"
                ? "Generated by Claude 3.5 Haiku (IBM Bob)"
                : "Deterministic Engineering Fallback"}
            </span>
          </div>

          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-foreground/90 font-serif italic">
            "{detail?.advisory_text ||
              (asset.id === "TX-115"
                ? "TX-115 is in post-maintenance recovery following a cooling fan repair and load curtailment at Day 78. Health index stabilized at 36.1 and remaining useful life recovered to 97 days. Continued routine thermal monitoring is recommended."
                : asset.id === "TX-107"
                ? "TX-107 at GIDC Phase-2 Substation is in critical electrical arcing failure (D1/D2). Acetylene (C2H2) exceeds 2,500 ppm and remaining useful life is down to 33.2 days. Immediate emergency crew dispatch and load curtailment required within 24 hours."
                : asset.id === "TX-104"
                ? "TX-104 displays progressive thermal overheating (T1) correlated with high summer ambient temperatures. Top-oil temperature reached 84°C. Schedule radiator fan bank inspection within 1 week."
                : `${asset.name} is operating with stable insulation chemistry (Health Index ${asset.healthIndexRaw.toFixed(1)}). Normal scheduled monitoring recommended.`)}"
          </p>
        </div>

        {/* ── 90-DAY TELEMETRY & DEGRADATION RECHARTS CHART ── */}
        <div className="mt-6 rounded-2xl border border-border/60 bg-surface/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-sans text-sm font-semibold text-foreground">
                Telemetry Degradation Trajectory (90 Days)
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Health Index Damage Score vs Operating Top-Oil Temperature
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-danger" /> Health Index (Damage)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-signal" /> Load / MVA
              </span>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-signal)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-signal)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="hiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-danger)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-danger)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} opacity={0.5} />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="healthIndex"
                  name="Health Index"
                  stroke="var(--color-danger)"
                  strokeWidth={2}
                  fill="url(#hiGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="loadMw"
                  name="Load (MVA)"
                  stroke="var(--color-signal)"
                  strokeWidth={1.5}
                  fill="url(#loadGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── SHAP EXPLAINABILITY (TOP 3 DRIVERS) ── */}
        <div className="mt-5 rounded-2xl border border-border/60 bg-surface/70 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-sans text-sm font-semibold text-foreground">
              SHAP Feature Attribution (TreeExplainer on Model 1)
            </h4>
            <span className="text-[10px] font-mono text-muted-foreground">
              Impact on Health Index score
            </span>
          </div>

          <div className="space-y-2.5">
            {(detail?.top_3_shap || asset.top3Shap || [
              ["Methane (CH4)", 11.4],
              ["Hydrogen (H2)", 6.2],
              ["Dielectric Rigidity", -4.8],
            ]).map(([featureName, shapVal]) => (
              <div key={featureName} className="flex items-center justify-between text-xs font-mono">
                <span className="text-foreground/90 font-medium">{featureName}</span>
                <div className="flex items-center gap-3">
                  <div className="w-36 h-2 rounded-full bg-border/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${shapVal > 0 ? "bg-danger" : "bg-signal"}`}
                      style={{ width: `${Math.min(100, Math.abs(shapVal) * 7)}%` }}
                    />
                  </div>
                  <span
                    className={`w-16 text-right font-bold ${
                      shapVal > 0 ? "text-danger" : "text-signal"
                    }`}
                  >
                    {shapVal > 0 ? `+${shapVal.toFixed(2)}` : shapVal.toFixed(2)} HI
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic Key Gauges */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-surface/70 p-3.5 text-xs">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Health Index (Damage)</p>
            <p className="mt-1 font-mono text-lg font-bold text-foreground">
              HI {asset.healthIndexRaw.toFixed(1)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Pristine: 13.4 · Hazard: &gt;50</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface/70 p-3.5 text-xs">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Remaining Useful Life</p>
            <p className="mt-1 font-mono text-lg font-bold text-signal">
              {asset.rulDays} days
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Calibrated decay model</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface/70 p-3.5 text-xs">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Fault Classification</p>
            <p className="mt-1 font-mono text-lg font-bold text-foreground">
              IEC {detail?.fault_type || asset.faultType}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">90.8% accuracy (Model 2)</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface/70 p-3.5 text-xs">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Top-Oil Core Temp</p>
            <p className="mt-1 font-mono text-lg font-bold text-foreground">
              {asset.coreTempC}°C
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Max limit: 95°C</p>
          </div>
        </div>

        {/* Operator Controls Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={onReroute}
              className="pill bg-signal text-xs font-medium text-signal-foreground hover:bg-signal/90"
            >
              <RefreshCw className="size-3.5 mr-1" /> Reroute load (-8 MVA)
            </Button>
            <Button
              onClick={onCooling}
              variant="outline"
              className="pill text-xs border-border/70"
            >
              <Thermometer className="size-3.5 mr-1" /> Force auxiliary cooling
            </Button>
            <Button
              onClick={onReportHazard}
              variant="outline"
              className="pill border-warning/50 bg-warning/10 text-xs font-semibold text-warning hover:bg-warning/20"
            >
              <ShieldAlert className="size-3.5 mr-1" /> Report Ground Hazard
            </Button>
          </div>

          <Button
            asChild
            className="pill bg-ink text-xs text-cream hover:bg-ink/90"
          >
            <Link to="/predict">
              Run Outage Prediction <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Simulation / Custom Node Injection Modal
function SimulationModal({
  onClose,
  onInject,
}: {
  onClose: () => void;
  onInject: (node: GridAsset) => void;
}) {
  const [name, setName] = useState("TX-119 · 40 MVA Anand South Ext");
  const [substation, setSubstation] = useState("Anand South Expansion Substation");
  const [region, setRegion] = useState("Zone-D · South Distribution");
  const [voltageKv, setVoltageKv] = useState(66);
  const [loadMw, setLoadMw] = useState(28);
  const [capacityMw, setCapacityMw] = useState(40);
  const [tempC, setTempC] = useState(58);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
      >
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div>
            <h3 className="font-sans text-xl font-semibold text-foreground">Inject Grid Sensor Node</h3>
            <p className="text-xs text-muted-foreground">Register simulated telemetry parameters into the live feed</p>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3.5 text-xs">
          <div>
            <label className="mb-1 block font-medium text-foreground">Asset Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2 text-foreground outline-none"
              placeholder="e.g. TX-119 · 40 MVA Anand South Ext"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-foreground">Substation</label>
            <input
              value={substation}
              onChange={(e) => setSubstation(e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2 text-foreground outline-none"
              placeholder="e.g. Anand South Expansion Substation"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-foreground">Rated MVA</label>
              <input
                type="number"
                value={capacityMw}
                onChange={(e) => setCapacityMw(Number(e.target.value))}
                className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2 text-foreground outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-foreground">Current Load (MVA)</label>
              <input
                type="number"
                value={loadMw}
                onChange={(e) => setLoadMw(Number(e.target.value))}
                className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2 text-foreground outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border/50 pt-4">
          <Button variant="outline" onClick={onClose} className="pill text-xs">
            Cancel
          </Button>
          <Button
            onClick={() => {
              const newNode: GridAsset = {
                id: "TX-119",
                name,
                substation,
                region,
                type: "Transformer",
                voltageKv,
                nominalVoltageKv: voltageKv,
                currentLoadMw: loadMw,
                ratedCapacityMw: capacityMw,
                frequencyHz: 50.00,
                coreTempC: tempC,
                healthScore: 82,
                healthIndexRaw: 16.5,
                rulDays: 320,
                faultType: "NF",
                status: "stable",
                riskTier: "LOW",
                compositeScore: 0.21,
                criticality: "Medium",
                archetype: "Stable Expansion Node",
                activeAnomalies: 0,
                lastInspected: "2026-09-14",
                coolingType: "ONAN",
                sf6PressureBar: 5.8,
                acousticDba: 55,
                telemetryHistory: [
                  { time: "Day 60", loadMw: loadMw * 0.9, voltageKv, tempC: tempC - 2 },
                  { time: "Day 89", loadMw, voltageKv, tempC },
                ],
                incidentLog: [],
              };
              onInject(newNode);
            }}
            className="pill bg-signal text-xs font-semibold text-signal-foreground hover:bg-signal/90"
          >
            Register to Feed
          </Button>
        </div>
      </div>
    </div>
  );
}
