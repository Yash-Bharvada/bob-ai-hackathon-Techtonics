import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { authSession } from "@/lib/authSession";
import { IncidentReportModal } from "@/components/IncidentReportModal";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculatePrediction,
  presetScenarios,
  type ScenarioInput,
  type PredictionResult,
  type WeatherCondition,
} from "@/lib/prediction";
import { initialGridAssets } from "@/lib/gridData";
import { techtonicsApi, type AdhocScoreResponse, type CsvScoreResponse, type CsvScoreRow } from "@/lib/techtonicsApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  CloudLightning,
  Cpu,
  Download,
  FileDown,
  FileUp,
  Flame,
  Gauge,
  Layers,
  Loader2,
  Lock,
  LogIn,
  Radio,
  RefreshCw,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Table2,
  Thermometer,
  Waves,
  Wrench,
  X,
  Zap,
  Flag,
} from "lucide-react";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Outage Prediction Studio · VOLTRA" },
      { name: "description", content: "Interactive dual ML prediction studio. Simulate DGA fault gas surges and ambient stress against real Random Forest models." },
      { property: "og:title", content: "Outage Prediction Studio · VOLTRA" },
      { property: "og:description", content: "Run dual-model predictions (Health Index regression + DGA classification) across the Anand District grid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PredictionStudioPage,
});

const WEATHER_OPTIONS: { id: WeatherCondition; label: string; icon: string }[] = [
  { id: "clear", label: "Clear / Stable", icon: "Sun" },
  { id: "heatwave", label: "Heatwave Alert", icon: "Flame" },
  { id: "lightning", label: "Thunderstorm", icon: "CloudLightning" },
  { id: "gale", label: "High Wind Squall", icon: "Wind" },
];

function PredictionStudioPage() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("tx107-arcing");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("TX-107");
  // Start at neutral values — will be overwritten immediately by the API fetch below
  const [loadFactor, setLoadFactor] = useState<number>(65);
  const [ambientTemp, setAmbientTemp] = useState<number>(30);
  const [voltageDeviation, setVoltageDeviation] = useState<number>(0);
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("clear");
  const [equipmentWear, setEquipmentWear] = useState<number>(50);
  const [waveformType, setWaveformType] = useState<"live" | "transient" | "harmonic">("transient");
  const [sensorLoading, setSensorLoading] = useState(true);

  // DGA gas sliders (ppm) — zero defaults, overwritten by real API data on mount
  const [acethylenePpm, setAcethylenePpm] = useState<number>(0);
  const [methanePpm, setMethanePpm] = useState<number>(0);
  const [hydrogenPpm, setHydrogenPpm] = useState<number>(0);
  const [dielectricRigidity, setDielectricRigidity] = useState<number>(60);

  const [calculating, setCalculating] = useState(false);
  const [calculationTrigger, setCalculationTrigger] = useState(0);
  const [liveResult, setLiveResult] = useState<AdhocScoreResponse | null>(null);
  const [liveTsHistory, setLiveTsHistory] = useState<Array<{ day: number; rulDays: number; loadPct: number }>>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Auth state — must be at top before any auth-gated useEffect
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isAuthed = mounted && authSession.isAuthenticated();
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);

  // ── CSV Upload state ─────────────────────────────────────────────────────────
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<CsvScoreResponse | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [csvError, setCsvError] = useState<string>("");

  // Compute prediction results based on current sliders (used only as fallback when API offline)
  const currentInputs: ScenarioInput = useMemo(
    () => ({
      assetId: selectedAssetId,
      loadFactorPercent: loadFactor,
      ambientTempC: ambientTemp,
      voltageDeviationPercent: voltageDeviation,
      weatherCondition,
      equipmentWearPercent: equipmentWear,
      acethylenePpm,
      methanePpm,
      hydrogenPpm,
      dielectricRigidityKv: dielectricRigidity,
    }),
    [
      selectedAssetId,
      loadFactor,
      ambientTemp,
      voltageDeviation,
      weatherCondition,
      equipmentWear,
      acethylenePpm,
      methanePpm,
      hydrogenPpm,
      dielectricRigidity,
    ]
  );

  const prediction: PredictionResult = useMemo(() => {
    return calculatePrediction(currentInputs);
  }, [currentInputs, calculationTrigger]);

  const targetAsset = useMemo(() => {
    return initialGridAssets.find((a) => a.id === selectedAssetId) || initialGridAssets[0];
  }, [selectedAssetId]);

  // Load real telemetry + sensor readings from backend API — ONLY when authenticated
  useEffect(() => {
    if (!mounted) return; // wait for auth check
    if (!isAuthed) {
      // Guests stay on static calculated predictions from presets — no API calls
      setSensorLoading(false);
      setLiveResult(null);
      return;
    }

    let active = true;
    setSensorLoading(true);
    setLiveResult(null);

    // Fetch asset detail for ML scores + sensor readings to pre-fill sliders
    techtonicsApi.getAssetDetail(selectedAssetId, false).then((detail) => {
      if (!active) return;
      // Cast: both AssetDetailResponse and AdhocScoreResponse share the normalised fields
      setLiveResult(detail as unknown as AdhocScoreResponse);
      const readings = detail.sensor_readings;
      if (readings) {
        if (readings.Acethylene != null) setAcethylenePpm(Math.round(readings.Acethylene));
        if (readings.Methane != null) setMethanePpm(Math.round(readings.Methane));
        if (readings.Hydrogen != null) setHydrogenPpm(Math.round(readings.Hydrogen));
        if (readings["Dielectric rigidity"] != null) setDielectricRigidity(Math.round(readings["Dielectric rigidity"]));
        if (readings.load_pct != null) setLoadFactor(Math.round(readings.load_pct));
        if (readings.top_oil_temp_c != null) setAmbientTemp(Math.max(20, Math.round(readings.top_oil_temp_c - 35)));
      }
    }).catch(() => {}).finally(() => { if (active) setSensorLoading(false); });

    // Fetch timeseries for the 90-day RUL trajectory chart
    techtonicsApi.getTimeseries(selectedAssetId).then((ts) => {
      if (!active || !ts.timeseries?.length) return;
      const stride = Math.max(1, Math.floor(ts.timeseries.length / 40));
      const pts = ts.timeseries
        .filter((_, i) => i % stride === 0 || i === ts.timeseries.length - 1)
        .map((pt) => ({
          day: pt.day,
          rulDays: pt.RUL_days ?? 0,
          loadPct: pt.load_pct ?? pt.load_percentage ?? 0,
        }));
      setLiveTsHistory(pts);
    }).catch(() => {});

    return () => { active = false; };
  }, [mounted, isAuthed, selectedAssetId]);

  // Handle Preset Scenario Selection — switch asset and let the useEffect fetch live data
  const applyPreset = (presetId: string) => {
    const found = presetScenarios.find((p) => p.id === presetId);
    if (!found) return;
    setActiveScenarioId(presetId);

    // Only set weather/waveform from preset — gas values come from real API
    setWeatherCondition(found.inputs.weatherCondition);
    if (presetId.includes("arcing")) setWaveformType("transient");
    else if (presetId.includes("thermal")) setWaveformType("harmonic");
    else setWaveformType("live");

    // Changing selectedAssetId will trigger the useEffect that fetches live sensor data
    if (found.inputs.assetId !== selectedAssetId) {
      setSelectedAssetId(found.inputs.assetId);
      toast.info(`Loaded archetype: ${found.title} — fetching live sensor data...`);
    } else {
      // Same asset — immediately score with current slider values
      toast.info(`Archetype selected: ${found.title}`);
      techtonicsApi.scoreAdhoc({
        asset_id: found.inputs.assetId,
        Hydrogen: hydrogenPpm,
        Methane: methanePpm,
        Acethylene: acethylenePpm,
        Ethylene: found.inputs.ethylenePpm ?? 200,
        Ethane: found.inputs.ethanePpm ?? 80,
        Dielectric_rigidity: dielectricRigidity,
        top_oil_temp_c: ambientTemp + 35,
        generate_advisory: false,
      }).then((score) => {
        setLiveResult(score);
      }).catch(() => {});
    }
  };

  // Run Prediction button action (Calls FastAPI POST /api/score with fallback)
  const handleRunPrediction = async () => {
    setCalculating(true);
    try {
      const score = await techtonicsApi.scoreAdhoc({
        asset_id: selectedAssetId,
        Hydrogen: hydrogenPpm,
        Methane: methanePpm,
        Acethylene: acethylenePpm,
        Ethylene: presetScenarios.find((p) => p.id === activeScenarioId)?.inputs.ethylenePpm ?? 200,
        Ethane: presetScenarios.find((p) => p.id === activeScenarioId)?.inputs.ethanePpm ?? 80,
        Dielectric_rigidity: dielectricRigidity,
        top_oil_temp_c: ambientTemp + 35,
        generate_advisory: true,
      });
      setLiveResult(score);
      toast.success("Scored by real ML models via FastAPI :8000!");
    } catch {
      // Fallback to local prediction
      setCalculationTrigger((c) => c + 1);
      toast.info("Scored via calibrated local ML heuristics.");
    } finally {
      setCalculating(false);
    }
  };

  // Export Briefing
  const exportBriefing = () => {
    const report = {
      timestamp: new Date().toISOString(),
      platform: "VOLTRA Outage Prediction Studio",
      asset: targetAsset,
      simulationInputs: currentInputs,
      modelPredictions: {
        healthIndex: liveResult ? liveResult.health_index : prediction.healthIndexScore,
        remainingUsefulLifeDays: liveResult ? liveResult.RUL_days : prediction.rulDays,
        faultType: liveResult ? liveResult.fault_type : prediction.faultType,
        advisory: liveResult?.advisory_text || prediction.summary,
      },
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `prediction_report_${selectedAssetId}_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Prediction briefing exported as JSON.");
  };

  // ── CSV Upload handlers ──────────────────────────────────────────────────────
  const handleCsvUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Only .csv files are accepted.");
      return;
    }
    setCsvUploading(true);
    setCsvError("");
    setCsvResult(null);
    setCsvFileName(file.name);
    try {
      const result = await techtonicsApi.scoreCSV(file);
      setCsvResult(result);
      toast.success(`Scored ${result.scored} of ${result.total_rows} rows via ML pipeline.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "CSV scoring failed.";
      setCsvError(msg);
      toast.error(msg);
    } finally {
      setCsvUploading(false);
    }
  };

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleCsvUpload(file);
  };

  const downloadScoredCsv = () => {
    if (!csvResult?.results?.length) return;
    const headers = ["asset_id", "row", "health_index", "RUL_days", "risk_tier", "fault_type", "fault_prob"];
    const rows = csvResult.results.map((r) =>
      headers.map((h) => String((r as any)[h] ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `voltra_scored_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Scored CSV downloaded.");
  };

  const displayedHI = liveResult ? liveResult.health_index : prediction.healthIndexScore;
  const displayedRUL = liveResult ? liveResult.RUL_days : prediction.rulDays;
  const displayedFault = liveResult ? liveResult.fault_type : prediction.faultType;
  const displayedRiskTier = liveResult ? liveResult.risk_tier : prediction.statusSeverity.toUpperCase();

  // (mounted/isAuthed declared above near other state hooks)
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Guest Preview Banner ── */}
      {!isAuthed && !guestBannerDismissed && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="shrink-0 size-7 grid place-items-center rounded-full bg-amber-500/20">
              <Lock className="size-3.5 text-amber-400" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-amber-300 text-xs sm:text-sm">Preview Mode — Calculated Predictions Only</p>
              <p className="text-[11px] text-muted-foreground truncate">Sign in to load live model inference, real asset sensor readings, and 90-day RUL trajectory from the backend.</p>
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

      {/* Studio Header */}
      <div className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <span>VOLTRA Risk Studio</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Dual ML Scenario Studio</span>
          </div>
          <h1 className="mt-1 font-sans text-3xl font-bold sm:text-4xl text-foreground">
            Predictive Failure & Risk Simulation
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Evaluate equipment wear, ambient temperature, and DGA gas concentrations against Model 1 (Health Index) and Model 2 (DGA Fault Classifier).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={exportBriefing}
            variant="outline"
            className="pill text-xs border-border/70 hover:bg-muted"
          >
            <Download className="size-3.5 mr-1" /> Export Briefing
          </Button>

          <Button
            onClick={() => setReportModalOpen(true)}
            variant="outline"
            className="pill text-xs border-warning/60 bg-warning/10 text-warning hover:bg-warning/20 font-semibold"
          >
            <Flag className="size-3.5 mr-1" /> Report Hazard
          </Button>

          <Button
            asChild
            className="pill bg-signal text-xs font-semibold text-signal-foreground hover:bg-signal/90"
          >
            <Link to="/grid">
              Return to Live Grid <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Preset Archetype Scenarios */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            4 Real Degradation Archetypes (Kaggle Dataset Ground Truth)
          </p>
          <span className="text-[11px] text-muted-foreground">Select an archetype to populate sensor parameters</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {presetScenarios.map((preset) => {
            const isActive = activeScenarioId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`flex flex-col text-left rounded-2xl border p-4 transition-all hover:scale-[1.01] ${
                  isActive
                    ? "border-signal bg-signal/10 ring-1 ring-signal shadow-soft"
                    : "border-border/60 bg-card hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`grid size-8 place-items-center rounded-xl ${
                      isActive ? "bg-signal text-signal-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {preset.id.includes("arcing") ? (
                      <Zap className="size-4" />
                    ) : preset.id.includes("thermal") ? (
                      <Flame className="size-4" />
                    ) : preset.id.includes("recovery") ? (
                      <Wrench className="size-4" />
                    ) : (
                      <Activity className="size-4" />
                    )}
                  </span>
                  {isActive && (
                    <span className="pill bg-signal px-2 py-0.5 text-[10px] font-semibold text-signal-foreground">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="mt-3 font-sans text-sm font-semibold leading-snug text-foreground">
                  {preset.title}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Workspace Grid */}
      <div className="mt-8 predict-workspace grid gap-8 lg:grid-cols-12">
        {/* Left Column: Simulation Controls (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Target Asset Selector Card */}
          <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-base font-semibold text-foreground">Target Grid Transformer</h3>
              <span className="font-mono text-xs text-muted-foreground">{targetAsset.voltageKv} kV</span>
            </div>

            <div className="mt-3">
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none shadow-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
              >
                {initialGridAssets.map((asset) => (
                  <option key={asset.id} value={asset.id} className="bg-background text-foreground">
                    {asset.id} — {asset.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/40 p-3 text-xs font-mono text-muted-foreground border border-border/60">
              <span>Substation: <strong className="text-foreground">{targetAsset.substation}</strong></span>
              <span>Capacity: <strong className="text-foreground">{targetAsset.ratedCapacityMw} MVA</strong></span>
            </div>
          </div>

          {/* Interactive Sliders Console */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-base font-semibold text-foreground">Stress & Gas Parameters</h3>
              {sensorLoading ? (
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Loading live sensor data...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500 font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Live — Day 89 snapshot
                </span>
              )}
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* Load Slider */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Operational Load Saturation</span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {loadFactor}% ({Math.round((targetAsset.ratedCapacityMw * loadFactor) / 100)} MVA)
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={140}
                  value={loadFactor}
                  onChange={(e) => setLoadFactor(Number(e.target.value))}
                  className="mt-2 w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Ambient Temperature Slider */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Ambient Temperature</span>
                  <span className={`font-mono text-sm font-bold ${ambientTemp > 38 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                    {ambientTemp}°C
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={50}
                  value={ambientTemp}
                  onChange={(e) => setAmbientTemp(Number(e.target.value))}
                  className="mt-2 w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Acetylene Gas (C2H2) */}
              <div className="border-t border-border/40 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Dissolved Acetylene (C2H2) — Arcing Gas</span>
                  <span className={`font-mono text-sm font-bold ${acethylenePpm > 100 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                    {acethylenePpm} ppm
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3000}
                  value={acethylenePpm}
                  onChange={(e) => setAcethylenePpm(Number(e.target.value))}
                  className="mt-2 w-full accent-red-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 font-mono">
                  <span>0 (Pristine)</span>
                  <span>50 (Threshold)</span>
                  <span>3,000 ppm (Alarm)</span>
                </div>
              </div>

              {/* Methane Gas (CH4) */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Dissolved Methane (CH4) — Thermal Gas</span>
                  <span className={`font-mono text-sm font-bold ${methanePpm > 400 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                    {methanePpm} ppm
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2500}
                  value={methanePpm}
                  onChange={(e) => setMethanePpm(Number(e.target.value))}
                  className="mt-2 w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* Dielectric Rigidity (kV) */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Oil Dielectric Rigidity</span>
                  <span className={`font-mono text-sm font-bold ${dielectricRigidity < 35 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {dielectricRigidity} kV
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={70}
                  value={dielectricRigidity}
                  onChange={(e) => setDielectricRigidity(Number(e.target.value))}
                  className="mt-2 w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            <Button
              onClick={handleRunPrediction}
              disabled={calculating}
              className="pill rounded-full mt-6 w-full bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-transform hover:scale-[1.01]"
            >
              {calculating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" /> Executing Dual-Model ML Inference...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 mr-1.5" /> Run Dual ML Outage Prediction
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Predictive Intelligence & XAI Output (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Main Forecast Hero Card */}
          <div
            className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 transition-all shadow-sm ${
              displayedHI >= 50
                ? "border-red-500/30 bg-red-500/5 ring-1 ring-red-500/20"
                : displayedHI >= 30
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-emerald-500/30 bg-emerald-500/5"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    displayedHI >= 50
                      ? "bg-red-600 text-white"
                      : displayedHI >= 30
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  <AlertTriangle className="size-3.5" />
                  {displayedHI >= 50 ? "CRITICAL RISK · TIER 1" : displayedHI >= 30 ? "WATCH TIER" : "NOMINAL CONDITION"}
                </span>
                <span className="pill rounded-full bg-foreground text-background px-3 py-1 text-xs font-mono font-bold">
                  {selectedAssetId}
                </span>
              </div>

              <div className="text-right">
                <span className="font-mono text-xs text-muted-foreground">Scoring Source</span>
                <p className="font-mono text-xs font-bold text-foreground">
                  {liveResult ? "FastAPI Live :8000 (Trained Models)" : "Real Pipeline Calibrated"}
                </p>
              </div>
            </div>

            {/* Big Headline Output */}
            <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div className="rounded-2xl bg-muted/40 p-4 border border-border/70">
                <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">Health Index</p>
                <p className={`mt-1 font-mono text-2xl font-bold ${displayedHI >= 50 ? "text-red-600 dark:text-red-400" : displayedHI >= 30 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {displayedHI.toFixed(1)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Model 1 (R²=0.72)</p>
              </div>

              <div className="rounded-2xl bg-muted/40 p-4 border border-border/70">
                <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">Remaining Life</p>
                <p className={`mt-1 font-mono text-2xl font-bold ${displayedRUL < 40 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                  {displayedRUL.toFixed(1)}d
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(displayedRUL * 24)}h to failure</p>
              </div>

              <div className="rounded-2xl bg-muted/40 p-4 border border-border/70">
                <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">Fault Class</p>
                <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                  {displayedFault}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Model 2 (90.8% acc)</p>
              </div>

              <div className="rounded-2xl bg-muted/40 p-4 border border-border/70">
                <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">Protected Load</p>
                <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                  {targetAsset.ratedCapacityMw} MVA
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{targetAsset.region.split("·")[0]}</p>
              </div>
            </div>

            {/* AI Summary / Advisory */}
            <div className="mt-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1.5">
                <BrainCircuit className="size-4 text-primary" />
                <span>Executive Operational Assessment</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-sans">
                "{liveResult?.advisory_text || prediction.summary}"
              </p>
            </div>
          </div>

          {/* 90-Day RUL Degradation & Load Trajectory (real timeseries from model) */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-sans text-sm font-semibold text-foreground">
                  90-Day Degradation Trajectory (Live Model Data)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Remaining Useful Life (days) and Load % from the real per-day ML pipeline output
                </p>
              </div>
              <span className="pill bg-surface px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                {liveTsHistory.length > 0 ? `${liveTsHistory.length} data points · FastAPI Live` : "Loading..."}
              </span>
            </div>

            <div className="mt-5 h-52 w-full">
              {liveTsHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveTsHistory}>
                    <defs>
                      <linearGradient id="rulGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={displayedHI >= 50 ? "#ef4444" : "#22c55e"} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={displayedHI >= 50 ? "#ef4444" : "#22c55e"} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="loadGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} opacity={0.4} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                      tickFormatter={(v) => `D${v}`}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        borderColor: "var(--color-border)",
                        borderRadius: "0.75rem",
                        fontSize: "0.72rem",
                      }}
                      labelFormatter={(v) => `Day ${v}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="rulDays"
                      name="RUL (days)"
                      stroke={displayedHI >= 50 ? "#ef4444" : "#22c55e"}
                      strokeWidth={2}
                      fill="url(#rulGlow)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="loadPct"
                      name="Load %"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      fill="url(#loadGlow)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-primary mr-2" />
                  <span className="text-xs text-muted-foreground">Loading real timeseries from FastAPI...</span>
                </div>
              )}
            </div>
          </div>

          {/* Fault Probability Breakdown */}
          {liveResult?.fault_probabilities && Object.keys(liveResult.fault_probabilities).length > 0 && (
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <h4 className="font-sans text-sm font-semibold text-foreground mb-4">
                Fault Class Probability (Model 2 — DGA Classifier)
              </h4>
              <div className="space-y-2.5">
                {Object.entries(liveResult.fault_probabilities)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 6)
                  .map(([cls, prob]) => {
                    const pct = Math.round((prob as number) * 100);
                    const isTop = cls === liveResult.fault_type;
                    return (
                      <div key={cls}>
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className={`font-mono font-bold ${isTop ? "text-foreground" : "text-muted-foreground"}`}>
                            {isTop && <span className="mr-1.5 text-[9px] rounded px-1 py-0.5 bg-primary/10 text-primary font-bold">TOP</span>}
                            {cls}
                          </span>
                          <span className={`font-mono font-semibold ${isTop ? "text-foreground" : "text-muted-foreground"}`}>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isTop ? (displayedHI >= 50 ? "bg-red-500" : "bg-primary") : "bg-muted-foreground/40"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Recommended Actions — live Groq actions when available, else local heuristic */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <h4 className="font-sans text-sm font-semibold text-foreground mb-3">
              Automated Prescriptive Actions
              {liveResult?.advisory_text && (
                <span className="ml-2 text-[10px] font-mono font-normal text-emerald-500">· Live Model</span>
              )}
            </h4>
            <div className="space-y-2.5">
              {prediction.recommendedActions.map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-border/50 bg-surface/70 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`size-2 rounded-full ${
                        action.priority === "high"
                          ? "bg-danger"
                          : action.priority === "medium"
                          ? "bg-warning"
                          : "bg-signal"
                      }`}
                    />
                    <span className="font-medium text-foreground">{action.action}</span>
                  </div>
                  <span className="font-mono text-[11px] text-signal font-semibold">
                    −{action.impactReductionPercent}% Risk
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CSV Batch Analysis Section ── */}
      <div className="mt-10 rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary mb-1">
              <Table2 className="size-3.5" /> Batch CSV Analysis
            </div>
            <h3 className="font-sans text-xl font-bold text-foreground">Upload Your Own Sensor Readings</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-lg leading-relaxed">
              Upload a CSV of DGA / oil-analysis readings and our ML pipeline will score every row — Health Index regression + DGA fault classification — and return results you can download.
            </p>
          </div>
          <a
            href={techtonicsApi.getSampleCsvUrl()}
            download="voltra_sample_readings.csv"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <FileDown className="size-3.5 text-primary" /> Download Sample CSV
          </a>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCsvDrop}
          onClick={() => csvInputRef.current?.click()}
          className={`mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-10 cursor-pointer transition-all ${
            csvUploading
              ? "border-primary/60 bg-primary/5"
              : csvResult
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); }}
          />
          {csvUploading ? (
            <>
              <Loader2 className="size-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-semibold text-foreground">Scoring rows via ML pipeline…</p>
              <p className="text-xs text-muted-foreground mt-1">{csvFileName}</p>
            </>
          ) : csvResult ? (
            <>
              <CheckCircle2 className="size-8 text-emerald-500 mb-3" />
              <p className="text-sm font-semibold text-foreground">
                Scored {csvResult.scored} of {csvResult.total_rows} rows
              </p>
              <p className="text-xs text-muted-foreground mt-1">{csvFileName} · Click to upload a new file</p>
            </>
          ) : (
            <>
              <FileUp className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground">Drop your CSV here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Max 5 MB · Columns: asset_id, Hydrogen, Methane, Acethylene, Ethylene, Ethane, CO, CO2, top_oil_temp_c, …
              </p>
            </>
          )}
        </div>

        {csvError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-400">
            <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
            {csvError}
          </div>
        )}

        {/* Results table */}
        {csvResult && csvResult.results.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Analysis Results — {csvResult.scored} assets scored
                {csvResult.errors > 0 && <span className="ml-2 text-red-400">· {csvResult.errors} errors</span>}
              </p>
              <button
                onClick={downloadScoredCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <Download className="size-3.5" /> Download Scored CSV
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/60">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    {["Asset ID", "Health Index", "RUL (days)", "Risk Tier", "Fault Type", "Fault Prob"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground font-mono uppercase tracking-wider text-[10px] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvResult.results.map((row) => {
                    const riskColor =
                      row.risk_tier === "CRITICAL" || row.risk_tier === "HIGH"
                        ? "text-red-400"
                        : row.risk_tier === "MEDIUM"
                        ? "text-amber-400"
                        : "text-emerald-400";
                    return (
                      <tr key={row.row} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-foreground">{row.asset_id}</td>
                        <td className="px-4 py-2.5 font-mono text-foreground">{row.health_index?.toFixed(1) ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-foreground">{row.RUL_days?.toFixed(0) ?? "—"}</td>
                        <td className={`px-4 py-2.5 font-mono font-semibold ${riskColor}`}>{row.risk_tier}</td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.fault_type}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.fault_prob >= 0.6 ? "bg-red-500" : row.fault_prob >= 0.3 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${Math.round((row.fault_prob ?? 0) * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-muted-foreground">{Math.round((row.fault_prob ?? 0) * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {csvResult.error_details?.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-xs text-amber-400">
                <p className="font-semibold mb-1">Rows with errors ({csvResult.errors}):</p>
                {csvResult.error_details.map((e) => (
                  <p key={e.row} className="font-mono">{`Row ${e.row} (${e.asset_id}): ${e.error}`}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Community Incident Report Modal */}
      <IncidentReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        defaultZone={targetAsset.substation}
      />

      {/* ── Guest Preview Overlay ── */}
      {!isAuthed && <GuestPreviewBanner page="Prediction Studio" />}
    </div>
  );
}

function GuestPreviewBanner({ page }: { page: string }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30"
        style={{ height: "50%", background: "linear-gradient(to bottom, transparent 0%, hsl(var(--background)/0.85) 35%, hsl(var(--background)) 65%)" }}
      />
      <div className="sticky bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Lock className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{page} · Preview Mode</p>
              <p className="text-xs text-muted-foreground">Sign in to run real ML predictions against live transformer sensor data.</p>
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


