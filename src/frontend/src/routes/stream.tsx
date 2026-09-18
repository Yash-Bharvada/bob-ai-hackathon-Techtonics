import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  techtonicsApi,
  type StreamAssetMetadata,
  type StreamTickResponse,
  type StreamHistoryPoint,
} from "@/lib/techtonicsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Activity,
  Zap,
  Flame,
  AlertTriangle,
  Clock,
  Home,
  ShieldAlert,
  Sliders,
  Terminal,
  ArrowRight,
  Radio,
  Gauge,
  Thermometer,
  Maximize2,
  Minimize2,
  X,
  Info,
  Sparkles,
  MousePointerClick,
} from "lucide-react";

export const Route = createFileRoute("/stream")({
  head: () => ({
    meta: [
      { title: "VOLTRA — Live Sensor Stream & Real-Time ML Inference" },
      {
        name: "description",
        content:
          "Real-time sensor telemetry streaming from actual dataset at configurable speed, drawing live time-series graphs and computing live ML health index & DGA diagnostics on the fly.",
      },
    ],
  }),
  component: LiveStreamPage,
});

interface InferenceLogEntry {
  id: string;
  day: number;
  timestamp: string;
  assetId: string;
  h2: number;
  c2h2: number;
  temp: number;
  healthIndex: number;
  faultType: string;
  confidence: number;
  blackoutProb: number;
  etrMins: number;
}

function LiveStreamPage() {
  const [assets, setAssets] = useState<StreamAssetMetadata[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("TX-107");
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMs, setSpeedMs] = useState<number>(2000); // Default: 1 row per 2 seconds
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTick, setCurrentTick] = useState<StreamTickResponse | null>(null);
  const [historyData, setHistoryData] = useState<StreamHistoryPoint[]>([]);
  const [logs, setLogs] = useState<InferenceLogEntry[]>([]);
  const [fullscreenChart, setFullscreenChart] = useState<"dga" | "thermal" | null>(null);
  const [visibleGases, setVisibleGases] = useState({
    hydrogen: true,
    acetylene: true,
    methane: true,
    ethylene: false,
    co: false,
  });

  const logsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial assets
  useEffect(() => {
    techtonicsApi
      .getStreamAssets()
      .then((res) => {
        if (res.assets?.length) {
          setAssets(res.assets);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch full history and initial tick when selected asset changes or on first load
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    Promise.all([
      techtonicsApi.getStreamTick(selectedAssetId, currentDay),
      techtonicsApi.getStreamHistory(selectedAssetId, 89),
    ])
      .then(([tickRes, histRes]) => {
        if (!isCancelled) {
          setCurrentTick(tickRes);
          setHistoryData(histRes.history || []);
          setLoading(false);
          addLogEntry(tickRes);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          toast.error(`Error loading stream for ${selectedAssetId}: ${err.message}`);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedAssetId]);

  const addLogEntry = (tick: StreamTickResponse) => {
    const timeStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const entry: InferenceLogEntry = {
      id: `${tick.asset_id}-${tick.day}-${Date.now()}`,
      day: tick.day,
      timestamp: timeStr,
      assetId: tick.asset_id,
      h2: tick.sensor_telemetry.hydrogen,
      c2h2: tick.sensor_telemetry.acetylene,
      temp: tick.sensor_telemetry.top_oil_temp_c,
      healthIndex: tick.live_ml_output.health_index,
      faultType: tick.live_ml_output.fault_type,
      confidence: tick.live_ml_output.fault_confidence_pct,
      blackoutProb: tick.live_ml_output.blackout_probability_pct,
      etrMins: tick.live_ml_output.etr_mins,
    };
    setLogs((prev) => [entry, ...prev.slice(0, 49)]);
  };

  // Playback timer effect
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentDay((prevDay) => {
        const nextDay = prevDay >= 89 ? 0 : prevDay + 1;
        fetchTickForDay(nextDay);
        return nextDay;
      });
    }, speedMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speedMs, selectedAssetId]);

  const fetchTickForDay = async (day: number) => {
    try {
      const tick = await techtonicsApi.getStreamTick(selectedAssetId, day);
      setCurrentTick(tick);
      addLogEntry(tick);
    } catch {
      // Ignore background tick glitch
    }
  };

  const handleSeek = (day: number) => {
    const clamped = Math.max(0, Math.min(89, day));
    setCurrentDay(clamped);
    fetchTickForDay(clamped);
  };

  const handleChartClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const clickedDay = Number(e.activePayload[0].payload.day);
      if (!isNaN(clickedDay)) {
        handleSeek(clickedDay);
        toast.info(`Scrubbed to Day ${clickedDay} (${e.activePayload[0].payload.date}) · ML Models Re-evaluated`);
      }
    }
  };

  const handleReset = () => {
    setCurrentDay(0);
    fetchTickForDay(0);
    toast.info(`Stream reset to Day 0 (2026-06-15) for ${selectedAssetId}`);
  };

  const activeMeta = assets.find((a) => a.asset_id === selectedAssetId) || {
    asset_id: selectedAssetId,
    substation: "Anand GIDC Substation",
    voltage_kv: "66 kV",
    mva_rating: 25.0,
    feeder_line: "Line-B Feeder",
    phenomenon: "Electrical Discharge & Arcing Degradation (D1/D2 Surge)",
    color: "#ef4444",
  };

  // Filter history up to current day for real-time live progression chart
  const liveFilteredHistory = historyData.slice(0, currentDay + 1);

  const isCritical =
    currentTick?.live_ml_output.risk_tier === "CRITICAL" ||
    (currentTick?.live_ml_output.health_index || 0) > 50;
  const isModerate =
    currentTick?.live_ml_output.risk_tier === "HIGH" ||
    currentTick?.live_ml_output.risk_tier === "MEDIUM";

  return (
    <div className="min-h-screen bg-background text-foreground pt-6 pb-20 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">

        {/* ── Global Dual Mode Switcher Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-[#121318]/70 backdrop-blur-md p-3 px-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Operation Mode:
            </span>
            <div className="flex items-center gap-1 bg-muted/60 dark:bg-white/[0.05] p-1 rounded-xl border border-border/60 dark:border-white/[0.06]">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-600 text-white dark:bg-[#d2f831] dark:text-neutral-950 shadow-xs cursor-default"
              >
                <span className="size-2 rounded-full bg-white dark:bg-neutral-950 animate-pulse" />
                Live Sensor Stream (Dataset Replay)
              </button>
              <Link
                to="/blackout"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>District Snapshot Overview</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <Radio className="size-3.5 text-emerald-700 dark:text-[#d2f831] animate-pulse" />
              Telemetry Source: <strong className="text-foreground dark:text-white">transformer_timeseries.csv (90 Days)</strong>
            </span>
            <span>·</span>
            <span>Inference: <strong className="text-foreground dark:text-white">Live On-the-Fly</strong></span>
          </div>
        </div>

        {/* ── Engineering Context Banner ── */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 px-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-emerald-600 dark:text-[#d2f831] shrink-0" />
            <span>
              <strong className="text-foreground dark:text-white">Accelerated SCADA Replay Mode:</strong> Chemical DGA insulation breakdown develops across weeks. This stream replays 90 days of sensor readings at 1 day per 2 seconds, proving the ML model detects dielectric arcing and calculates blackout ETR dynamically.
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-700 dark:text-[#d2f831] shrink-0">
            IEEE C57.104 & IEC 60599 ALIGNED
          </Badge>
        </div>

        {/* ── Page Hero Header & Transformer Focus Switcher ── */}
        <div className="rounded-3xl border border-border/80 dark:border-white/[0.1] bg-card dark:bg-[#0c0d12] p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/10 text-red-500 border border-red-500/30 font-mono text-xs font-bold px-3 py-1">
                  <span className="size-2 rounded-full bg-red-500 animate-ping mr-1.5 inline-block" />
                  REAL-TIME TELEMETRY STREAM · ACTIVE
                </Badge>
                <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-border">
                  Rate: 1 row / {(speedMs / 1000).toFixed(1)}s
                </Badge>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground dark:text-white font-display">
                Live Sensor Telemetry Stream
              </h1>
              <p className="text-sm text-muted-foreground dark:text-neutral-300 leading-relaxed">
                Replaying real sensor time-series rows sequentially into the VOLTRA ML inference pipeline. Watch Dissolved Gas concentrations evolve and observe the model recalculate Health Index, DGA fault classifications, and Blackout Risk in real time.
              </p>
            </div>

            {/* Transformer Selection Tabs (2 Focus Assets) */}
            <div className="space-y-2 shrink-0">
              <div className="text-[11px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                Select Focus Transformer (2 Primary Models):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. TX-107 */}
                <button
                  type="button"
                  onClick={() => setSelectedAssetId("TX-107")}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedAssetId === "TX-107"
                      ? "border-red-500 bg-red-500/10 shadow-md ring-2 ring-red-500/30"
                      : "border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] hover:border-red-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-sm font-extrabold text-foreground dark:text-white flex items-center gap-1.5">
                      <Zap className="size-4 text-red-500" />
                      TX-107
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono bg-red-500/15 text-red-500 border-red-500/30">
                      ARCING (D1/D2)
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-muted-foreground">
                    Anand GIDC Substation
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                    Severe DGA spike & degradation curve
                  </div>
                </button>

                {/* 2. TX-115 */}
                <button
                  type="button"
                  onClick={() => setSelectedAssetId("TX-115")}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedAssetId === "TX-115"
                      ? "border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/30"
                      : "border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-sm font-extrabold text-foreground dark:text-white flex items-center gap-1.5">
                      <Flame className="size-4 text-amber-500" />
                      TX-115
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono bg-amber-500/15 text-amber-500 border-amber-500/30">
                      THERMAL (T2)
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-muted-foreground">
                    Anand South Substation
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                    Thermal stress & peak load variations
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Playback Control Console Bar ── */}
        <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 dark:border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`h-9 px-4 rounded-xl font-bold font-mono text-xs shadow-sm transition-all cursor-pointer ${
                  isPlaying
                    ? "bg-amber-500 hover:bg-amber-600 text-neutral-950"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#d2f831] dark:text-neutral-950"
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="size-4 mr-1.5" /> Pause Stream
                  </>
                ) : (
                  <>
                    <Play className="size-4 mr-1.5" /> Resume Stream
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSeek(Math.max(0, currentDay - 1))}
                className="h-9 px-2.5 rounded-xl border-border dark:border-white/[0.12] text-xs font-mono cursor-pointer"
                title="Step Backward 1 Row"
              >
                <SkipBack className="size-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSeek(Math.min(89, currentDay + 1))}
                className="h-9 px-2.5 rounded-xl border-border dark:border-white/[0.12] text-xs font-mono cursor-pointer"
                title="Step Forward 1 Row"
              >
                <SkipForward className="size-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-9 px-3 rounded-xl border-border dark:border-white/[0.12] text-xs font-mono cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5 mr-1" />
                Reset (Day 0)
              </Button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1.5 bg-muted/40 dark:bg-white/[0.03] p-1 rounded-xl border border-border/60 dark:border-white/[0.06]">
              <span className="text-[10px] font-mono text-muted-foreground px-1.5 font-bold">
                RATE:
              </span>
              {[
                { label: "0.5s", ms: 500 },
                { label: "1.0s", ms: 1000 },
                { label: "2.0s (Default)", ms: 2000 },
                { label: "3.0s", ms: 3000 },
                { label: "5.0s", ms: 5000 },
              ].map((s) => (
                <button
                  key={s.ms}
                  onClick={() => setSpeedMs(s.ms)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    speedMs === s.ms
                      ? "bg-foreground text-background dark:bg-white dark:text-neutral-950 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Scrubber Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-foreground dark:text-white flex items-center gap-1.5">
                <Sliders className="size-3.5 text-emerald-700 dark:text-[#d2f831]" />
                Sensor Timeline Scrubber: Day {currentDay} of 89
              </span>
              <span className="text-muted-foreground">
                Date: <strong className="text-foreground dark:text-neutral-200">{currentTick?.date || "2026-06-15"}</strong>
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={89}
              value={currentDay}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-muted dark:bg-neutral-800 accent-emerald-600 dark:accent-[#d2f831] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>Day 0 (Start: 2026-06-15)</span>
              <span>Day 45 (Mid-Point: 2026-07-30)</span>
              <span>Day 89 (Final: 2026-09-12)</span>
            </div>
          </div>
        </div>

        {/* ── Real-Time ML KPI HUD (4 Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Live Health Index */}
          <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] p-4 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                <Gauge className="size-3.5 text-emerald-700 dark:text-[#d2f831]" />
                Live Health Index
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] font-mono font-bold ${
                  isCritical
                    ? "bg-red-500/10 text-red-500 border-red-500/30"
                    : isModerate
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-[#d2f831] border-emerald-500/30"
                }`}
              >
                {currentTick?.live_ml_output.risk_tier || "NORMAL"}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  isCritical
                    ? "text-red-500"
                    : isModerate
                    ? "text-amber-500"
                    : "text-emerald-700 dark:text-[#d2f831]"
                }`}
              >
                {currentTick?.live_ml_output.health_index.toFixed(1) || "--"}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                RUL: {currentTick?.live_ml_output.rul_days || "--"} days
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCritical ? "bg-red-500" : isModerate ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(5, (currentTick?.live_ml_output.health_index || 20) * 1.5))}%`,
                }}
              />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground truncate">
              Evaluated by Model 1 Regression
            </p>
          </div>

          {/* Card 2: Live DGA Fault Classifier */}
          <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                <Activity className="size-3.5 text-blue-500" />
                Live DGA Fault Class
              </span>
              <Badge variant="outline" className="text-[9px] font-mono bg-blue-500/10 text-blue-400 border-blue-500/30">
                MODEL 2
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono tracking-tight text-foreground dark:text-white">
                {currentTick?.live_ml_output.fault_type || "NF"}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {currentTick?.live_ml_output.fault_confidence_pct.toFixed(1)}% conf
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
              <span>H₂: {currentTick?.sensor_telemetry.hydrogen} ppm</span>
              <span>·</span>
              <span>C₂H₂: {currentTick?.sensor_telemetry.acetylene} ppm</span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground truncate">
              Multi-gas ratio signature analysis
            </p>
          </div>

          {/* Card 3: Live Blackout Risk & ETR */}
          <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                <ShieldAlert className="size-3.5 text-amber-500" />
                Blackout Risk & ETR
              </span>
              <Badge variant="outline" className="text-[9px] font-mono bg-amber-500/10 text-amber-400 border-amber-500/30">
                LIVE COMPUTE
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  (currentTick?.live_ml_output.blackout_probability_pct || 0) > 50
                    ? "text-red-500"
                    : "text-foreground dark:text-white"
                }`}
              >
                {currentTick?.live_ml_output.blackout_probability_pct.toFixed(1)}%
              </span>
              <span className="text-xs font-mono text-blue-500 font-bold">
                ETR: {currentTick?.live_ml_output.etr_mins}m
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              TTF: ~{currentTick?.live_ml_output.ttf_hours}h to failure
            </div>
            <p className="text-[10px] font-mono text-muted-foreground truncate">
              Dynamic restoration calculation
            </p>
          </div>

          {/* Card 4: Feeder Thermal & Citizen Load */}
          <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                <Thermometer className="size-3.5 text-red-400" />
                Thermal & Feeder Load
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {activeMeta.voltage_kv}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono tracking-tight text-foreground dark:text-white">
                {currentTick?.sensor_telemetry.top_oil_temp_c.toFixed(1)}°C
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {currentTick?.live_ml_output.current_load_mw} MW
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
              <Home className="size-3 text-emerald-700 dark:text-[#d2f831]" />
              Feeds ~{currentTick?.live_ml_output.affected_households.toLocaleString()} homes
            </div>
            <p className="text-[10px] font-mono text-muted-foreground truncate">
              {activeMeta.feeder_line}
            </p>
          </div>
        </div>

        {/* ── Live Streaming Graphs (2 Interactive Charts) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Chart 1: Combustible Gas Concentrations */}
          <div className="rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 dark:border-white/[0.06] pb-3">
              <div>
                <h4 className="text-sm font-bold text-foreground dark:text-white flex items-center gap-2">
                  <Activity className="size-4 text-emerald-700 dark:text-[#d2f831]" />
                  Dissolved Combustible Gases Stream (ppm)
                </h4>
                <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <MousePointerClick className="size-3 text-emerald-700 dark:text-[#d2f831]" />
                  Tap any point on chart to scrub time · Day {currentDay}/89
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Gas Toggle Buttons */}
                <div className="flex items-center gap-1">
                  {[
                    { key: "hydrogen", label: "H₂", color: "#3b82f6" },
                    { key: "acetylene", label: "C₂H₂", color: "#ef4444" },
                    { key: "methane", label: "CH₄", color: "#10b981" },
                  ].map((g) => (
                    <button
                      key={g.key}
                      onClick={() =>
                        setVisibleGases((prev: any) => ({ ...prev, [g.key]: !prev[g.key] }))
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        (visibleGases as any)[g.key]
                          ? "bg-white/10 text-white border-white/20"
                          : "text-muted-foreground border-transparent opacity-40"
                      }`}
                      style={{ borderColor: (visibleGases as any)[g.key] ? g.color : "transparent" }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Fullscreen Modal Trigger */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenChart("dga")}
                  className="h-7 px-2 text-[10px] font-mono border-border dark:border-white/[0.12] cursor-pointer"
                  title="Fullscreen Interactive View"
                >
                  <Maximize2 className="size-3 mr-1 text-emerald-700 dark:text-[#d2f831]" />
                  Fullscreen
                </Button>
              </div>
            </div>

            <div className="h-64 w-full cursor-pointer">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={liveFilteredHistory}
                  onClick={handleChartClick}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorH2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorC2H2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCH4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888888" }} tickFormatter={(d) => `D${d}`} />
                  <YAxis tick={{ fontSize: 10, fill: "#888888" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#121318",
                      borderColor: "#ffffff15",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                  />
                  {visibleGases.hydrogen && (
                    <Area type="monotone" dataKey="hydrogen" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorH2)" name="H₂ (Hydrogen ppm)" />
                  )}
                  {visibleGases.acetylene && (
                    <Area type="monotone" dataKey="acetylene" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorC2H2)" name="C₂H₂ (Acetylene ppm)" />
                  )}
                  {visibleGases.methane && (
                    <Area type="monotone" dataKey="methane" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCH4)" name="CH₄ (Methane ppm)" />
                  )}
                  <ReferenceLine x={currentDay} stroke="#d2f831" strokeDasharray="3 3" label={{ value: "NOW", fill: "#d2f831", fontSize: 9 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Thermal & Health Index Trajectory */}
          <div className="rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 dark:border-white/[0.06] pb-3">
              <div>
                <h4 className="text-sm font-bold text-foreground dark:text-white flex items-center gap-2">
                  <Thermometer className="size-4 text-amber-500" />
                  Thermal Stress & Health Index Evolution
                </h4>
                <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <MousePointerClick className="size-3 text-emerald-700 dark:text-[#d2f831]" />
                  Tap to scrub · Oil temp (°C) & Health Index
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenChart("thermal")}
                  className="h-7 px-2 text-[10px] font-mono border-border dark:border-white/[0.12] cursor-pointer"
                  title="Fullscreen Interactive View"
                >
                  <Maximize2 className="size-3 mr-1 text-emerald-700 dark:text-[#d2f831]" />
                  Fullscreen
                </Button>
              </div>
            </div>

            <div className="h-64 w-full cursor-pointer">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={liveFilteredHistory}
                  onClick={handleChartClick}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888888" }} tickFormatter={(d) => `D${d}`} />
                  <YAxis tick={{ fontSize: 10, fill: "#888888" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#121318",
                      borderColor: "#ffffff15",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                  <Line type="monotone" dataKey="top_oil_temp_c" stroke="#f59e0b" strokeWidth={2} dot={false} name="Top Oil Temp (°C)" />
                  <Line type="monotone" dataKey="health_index" stroke="#d2f831" strokeWidth={2.5} dot={false} name="Health Index Score" />
                  <Line type="monotone" dataKey="load_pct" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Load %" />
                  <ReferenceLine x={currentDay} stroke="#d2f831" strokeDasharray="3 3" label={{ value: "NOW", fill: "#d2f831", fontSize: 9 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Real-Time SCADA Model Inference Event Feed (Terminal Style) ── */}
        <div className="rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#0c0d12] p-5 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-border/60 dark:border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-[#d2f831]">
                <Terminal className="size-4" />
              </div>
              <h4 className="text-sm font-bold text-foreground dark:text-white">
                Live SCADA Ingestion & ML Model Inference Feed
              </h4>
              <Badge variant="outline" className="text-[9px] bg-white/[0.03] text-muted-foreground border-white/[0.08]">
                {logs.length} EVENTS RECORDED
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogs([])}
              className="h-7 px-2.5 rounded-xl border-border text-[10px] dark:border-white/[0.12] dark:text-neutral-400 cursor-pointer"
            >
              Clear Log
            </Button>
          </div>

          <div className="bg-[#07080b] rounded-2xl p-3 border border-white/[0.04] max-h-56 overflow-y-auto space-y-1.5 text-xs">
            {logs.length === 0 ? (
              <div className="text-neutral-500 text-center py-4">
                Listening for incoming sensor stream ticks...
              </div>
            ) : (
              logs.map((log) => {
                const isWarn = log.healthIndex > 50 || log.faultType.includes("D");
                return (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-1.5 px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 text-[10px]">[{log.timestamp}]</span>
                      <span className="font-bold text-foreground dark:text-white">
                        Day #{log.day} · {log.assetId}
                      </span>
                      <span className="text-neutral-400 text-[11px]">
                        H₂: {log.h2} ppm | C₂H₂: {log.c2h2} ppm | Temp: {log.temp}°C
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isWarn
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        HI: {log.healthIndex.toFixed(1)} ({log.faultType})
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Blackout Risk: {log.blackoutProb.toFixed(1)}% (ETR {log.etrMins}m)
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>

      {/* ── FULLSCREEN INTERACTIVE MODAL ── */}
      {fullscreenChart && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/[0.1] pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-[#d2f831] border border-emerald-500/20">
                <Activity className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
                  {fullscreenChart === "dga"
                    ? "Full-Screen DGA Gas Telemetry Analyzer (ppm)"
                    : "Full-Screen Thermal & Health Index Analyzer"}
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-[#d2f831]">
                    INTERACTIVE SCRUBBER ACTIVE
                  </Badge>
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  Target Asset: {activeMeta.asset_id} ({activeMeta.substation}) · Tap anywhere on chart to seek timeline
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-mono text-neutral-300 bg-white/[0.05] px-3 py-1.5 rounded-xl border border-white/[0.1]">
                Current Stream Day: <strong className="text-emerald-400">Day #{currentDay}</strong> ({currentTick?.date})
              </div>
              <button
                onClick={() => setFullscreenChart(null)}
                className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white transition-colors cursor-pointer"
                title="Close Fullscreen"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Chart Body */}
          <div className="flex-1 w-full min-h-0 bg-[#0d0e14] rounded-3xl p-5 border border-white/[0.08]">
            <ResponsiveContainer width="100%" height="100%">
              {fullscreenChart === "dga" ? (
                <AreaChart
                  data={liveFilteredHistory}
                  onClick={handleChartClick}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="fsColorH2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fsColorC2H2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fsColorCH4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#aaaaaa" }} tickFormatter={(d) => `Day ${d}`} />
                  <YAxis tick={{ fontSize: 12, fill: "#aaaaaa" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d0e14",
                      borderColor: "#ffffff25",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "monospace", paddingTop: "10px" }} />
                  <Area type="monotone" dataKey="hydrogen" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#fsColorH2)" name="Hydrogen H₂ (ppm)" />
                  <Area type="monotone" dataKey="acetylene" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#fsColorC2H2)" name="Acetylene C₂H₂ (ppm)" />
                  <Area type="monotone" dataKey="methane" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#fsColorCH4)" name="Methane CH₄ (ppm)" />
                  <ReferenceLine x={currentDay} stroke="#d2f831" strokeWidth={2} strokeDasharray="4 4" label={{ value: `DAY ${currentDay} (PLAYHEAD)`, fill: "#d2f831", fontSize: 11 }} />
                  {/* IEEE C57.104 Reference Threshold for Acetylene (Arced threshold > 2 ppm) */}
                  <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "IEEE C57.104 C2H2 LIMIT (2 ppm)", fill: "#ef4444", fontSize: 10 }} />
                </AreaChart>
              ) : (
                <LineChart
                  data={liveFilteredHistory}
                  onClick={handleChartClick}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#aaaaaa" }} tickFormatter={(d) => `Day ${d}`} />
                  <YAxis tick={{ fontSize: 12, fill: "#aaaaaa" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d0e14",
                      borderColor: "#ffffff25",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "monospace", paddingTop: "10px" }} />
                  <Line type="monotone" dataKey="top_oil_temp_c" stroke="#f59e0b" strokeWidth={3} dot={false} name="Top Oil Temp (°C)" />
                  <Line type="monotone" dataKey="health_index" stroke="#d2f831" strokeWidth={3.5} dot={false} name="Health Index Score" />
                  <Line type="monotone" dataKey="load_pct" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Load %" />
                  <ReferenceLine x={currentDay} stroke="#d2f831" strokeWidth={2} strokeDasharray="4 4" label={{ value: `DAY ${currentDay} (PLAYHEAD)`, fill: "#d2f831", fontSize: 11 }} />
                  <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "OIL OVERHEAT LIMIT (85°C)", fill: "#ef4444", fontSize: 10 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-4 text-xs font-mono text-neutral-400">
            <span>Tip: Click on any point on the chart to instantly jump the telemetry playhead to that day.</span>
            <Button
              size="sm"
              onClick={() => setFullscreenChart(null)}
              className="h-8 px-4 rounded-xl bg-emerald-600 text-white dark:bg-[#d2f831] dark:text-neutral-950 font-bold text-xs cursor-pointer"
            >
              Close Fullscreen View
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
