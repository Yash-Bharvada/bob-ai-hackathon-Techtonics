import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
import { techtonicsApi, type AdhocScoreResponse } from "@/lib/techtonicsApi";
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
  Flame,
  Gauge,
  Layers,
  Loader2,
  Radio,
  RefreshCw,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Thermometer,
  Waves,
  Wrench,
  Zap,
  Flag,
} from "lucide-react";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Outage Prediction Studio · VOLTRA" },
      {
        name: "description",
        content:
          "Interactive dual ML prediction studio. Simulate DGA fault gas surges and ambient stress against real Random Forest models.",
      },
      { property: "og:title", content: "Outage Prediction Studio · VOLTRA" },
      {
        property: "og:description",
        content:
          "Run dual-model predictions (Health Index regression + DGA classification) across the Anand District grid.",
      },
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
  const [loadFactor, setLoadFactor] = useState<number>(88);
  const [ambientTemp, setAmbientTemp] = useState<number>(36);
  const [voltageDeviation, setVoltageDeviation] = useState<number>(-4.8);
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("clear");
  const [equipmentWear, setEquipmentWear] = useState<number>(85);
  const [waveformType, setWaveformType] = useState<"live" | "transient" | "harmonic">("transient");

  // DGA gas sliders (ppm)
  const [acethylenePpm, setAcethylenePpm] = useState<number>(2592);
  const [methanePpm, setMethanePpm] = useState<number>(1850);
  const [hydrogenPpm, setHydrogenPpm] = useState<number>(3280);
  const [dielectricRigidity, setDielectricRigidity] = useState<number>(28);

  const [calculating, setCalculating] = useState(false);
  const [calculationTrigger, setCalculationTrigger] = useState(0);
  const [liveResult, setLiveResult] = useState<AdhocScoreResponse | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Compute prediction results based on current sliders
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
    ],
  );

  const prediction: PredictionResult = useMemo(() => {
    return calculatePrediction(currentInputs);
  }, [currentInputs, calculationTrigger]);

  const targetAsset = useMemo(() => {
    return initialGridAssets.find((a) => a.id === selectedAssetId) || initialGridAssets[0];
  }, [selectedAssetId]);

  // Handle Preset Scenario Selection
  const applyPreset = (presetId: string) => {
    const found = presetScenarios.find((p) => p.id === presetId);
    if (!found) return;
    setActiveScenarioId(presetId);
    setSelectedAssetId(found.inputs.assetId);
    setLoadFactor(found.inputs.loadFactorPercent);
    setAmbientTemp(found.inputs.ambientTempC);
    setVoltageDeviation(found.inputs.voltageDeviationPercent);
    setWeatherCondition(found.inputs.weatherCondition);
    setEquipmentWear(found.inputs.equipmentWearPercent);

    if (found.inputs.acethylenePpm !== undefined) setAcethylenePpm(found.inputs.acethylenePpm);
    if (found.inputs.methanePpm !== undefined) setMethanePpm(found.inputs.methanePpm);
    if (found.inputs.hydrogenPpm !== undefined) setHydrogenPpm(found.inputs.hydrogenPpm);
    if (found.inputs.dielectricRigidityKv !== undefined)
      setDielectricRigidity(found.inputs.dielectricRigidityKv);

    if (presetId.includes("arcing")) setWaveformType("transient");
    else if (presetId.includes("thermal")) setWaveformType("harmonic");
    else setWaveformType("live");

    setLiveResult(null);
    toast.info(`Loaded preset: ${found.title}`);
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
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `prediction_report_${selectedAssetId}_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Prediction briefing exported as JSON.");
  };

  const displayedHI = liveResult ? liveResult.health_index : prediction.healthIndexScore;
  const displayedRUL = liveResult ? liveResult.RUL_days : prediction.rulDays;
  const displayedFault = liveResult ? liveResult.fault_type : prediction.faultType;
  const displayedRiskTier = liveResult
    ? liveResult.risk_tier
    : prediction.statusSeverity.toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Studio Header */}
      <div className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <span>VOLTRA Neural Sandbox</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Dual ML Scenario Studio</span>
          </div>
          <h1 className="mt-1 font-sans text-3xl font-bold sm:text-4xl text-foreground">
            Predictive Failure & Risk Simulation
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Evaluate equipment wear, ambient temperature, and DGA gas concentrations against Model 1
            (Health Index) and Model 2 (DGA Fault Classifier).
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
          <span className="text-[11px] text-muted-foreground">
            Select an archetype to populate sensor parameters
          </span>
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
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Left Column: Simulation Controls (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Target Asset Selector Card */}
          <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-base font-semibold text-foreground">
                Target Grid Transformer
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {targetAsset.voltageKv} kV
              </span>
            </div>

            <div className="mt-3">
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2 text-xs font-semibold text-foreground outline-none"
              >
                {initialGridAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.id} — {asset.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-surface/80 p-2.5 text-xs font-mono text-muted-foreground border border-border/40">
              <span>
                Substation: <strong className="text-foreground">{targetAsset.substation}</strong>
              </span>
              <span>
                Capacity:{" "}
                <strong className="text-foreground">{targetAsset.ratedCapacityMw} MVA</strong>
              </span>
            </div>
          </div>

          {/* Interactive Sliders Console */}
          <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-base font-semibold text-foreground">
                Stress & Gas Parameters
              </h3>
              <Sliders className="size-4 text-muted-foreground" />
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* Load Slider */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Operational Load Saturation</span>
                  <span className="font-mono text-sm font-bold text-signal">
                    {loadFactor}% ({Math.round((targetAsset.ratedCapacityMw * loadFactor) / 100)}{" "}
                    MVA)
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={140}
                  value={loadFactor}
                  onChange={(e) => setLoadFactor(Number(e.target.value))}
                  className="mt-2 w-full accent-signal cursor-pointer"
                />
              </div>

              {/* Ambient Temperature Slider */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Ambient Temperature</span>
                  <span
                    className={`font-mono text-sm font-bold ${ambientTemp > 38 ? "text-danger" : "text-foreground"}`}
                  >
                    {ambientTemp}°C
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={50}
                  value={ambientTemp}
                  onChange={(e) => setAmbientTemp(Number(e.target.value))}
                  className="mt-2 w-full accent-signal cursor-pointer"
                />
              </div>

              {/* Acetylene Gas (C2H2) */}
              <div className="border-t border-border/40 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    Dissolved Acetylene (C2H2) — Arcing Gas
                  </span>
                  <span
                    className={`font-mono text-sm font-bold ${acethylenePpm > 100 ? "text-danger" : "text-foreground"}`}
                  >
                    {acethylenePpm} ppm
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3000}
                  value={acethylenePpm}
                  onChange={(e) => setAcethylenePpm(Number(e.target.value))}
                  className="mt-2 w-full accent-danger cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>0 (Pristine)</span>
                  <span>50 (Threshold)</span>
                  <span>3,000 ppm (Arcing Alarm)</span>
                </div>
              </div>

              {/* Methane Gas (CH4) */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    Dissolved Methane (CH4) — Thermal Gas
                  </span>
                  <span
                    className={`font-mono text-sm font-bold ${methanePpm > 400 ? "text-warning" : "text-foreground"}`}
                  >
                    {methanePpm} ppm
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2500}
                  value={methanePpm}
                  onChange={(e) => setMethanePpm(Number(e.target.value))}
                  className="mt-2 w-full accent-warning cursor-pointer"
                />
              </div>

              {/* Dielectric Rigidity (kV) */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Oil Dielectric Rigidity</span>
                  <span
                    className={`font-mono text-sm font-bold ${dielectricRigidity < 35 ? "text-danger" : "text-signal"}`}
                  >
                    {dielectricRigidity} kV
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={70}
                  value={dielectricRigidity}
                  onChange={(e) => setDielectricRigidity(Number(e.target.value))}
                  className="mt-2 w-full accent-signal cursor-pointer"
                />
              </div>
            </div>

            <Button
              onClick={handleRunPrediction}
              disabled={calculating}
              className="pill mt-6 w-full bg-signal text-xs font-semibold text-signal-foreground hover:bg-signal/90 shadow-glass"
            >
              {calculating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" /> Executing Dual-Model ML
                  Inference...
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
            className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 transition-all ${
              displayedHI >= 50
                ? "border-danger/50 bg-danger/5 ring-1 ring-danger/20"
                : displayedHI >= 30
                  ? "border-warning/50 bg-warning/5"
                  : "border-signal/40 bg-signal/5"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold ${
                    displayedHI >= 50
                      ? "bg-danger text-white animate-pulse"
                      : displayedHI >= 30
                        ? "bg-warning text-foreground"
                        : "bg-signal text-signal-foreground"
                  }`}
                >
                  <AlertTriangle className="size-3.5" />
                  {displayedHI >= 50
                    ? "CRITICAL RISK · TIER 1"
                    : displayedHI >= 30
                      ? "WATCH TIER"
                      : "NOMINAL CONDITION"}
                </span>
                <span className="pill bg-ink text-cream px-2.5 py-1 text-xs font-mono font-bold">
                  {selectedAssetId}
                </span>
              </div>

              <div className="text-right">
                <span className="font-mono text-xs text-muted-foreground">Scoring Source</span>
                <p className="font-mono text-xs font-bold text-foreground">
                  {liveResult ? "FastAPI Live :8000" : "Calibrated Pipeline Heuristic"}
                </p>
              </div>
            </div>

            {/* Big Headline Output */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl bg-surface/80 p-3.5 border border-border/60">
                <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  Health Index
                </p>
                <p
                  className={`mt-1 font-mono text-2xl font-bold ${displayedHI >= 50 ? "text-danger" : displayedHI >= 30 ? "text-warning" : "text-signal"}`}
                >
                  {displayedHI.toFixed(1)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Model 1 (R²=0.72)</p>
              </div>

              <div className="rounded-2xl bg-surface/80 p-3.5 border border-border/60">
                <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  Remaining Life
                </p>
                <p
                  className={`mt-1 font-mono text-2xl font-bold ${displayedRUL < 40 ? "text-danger" : "text-signal"}`}
                >
                  {displayedRUL.toFixed(1)}d
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {Math.round(displayedRUL * 24)}h to failure
                </p>
              </div>

              <div className="rounded-2xl bg-surface/80 p-3.5 border border-border/60">
                <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  Fault Class
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                  {displayedFault}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Model 2 (90.8% acc)</p>
              </div>

              <div className="rounded-2xl bg-surface/80 p-3.5 border border-border/60">
                <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  Protected Load
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                  {targetAsset.ratedCapacityMw} MVA
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {targetAsset.region.split("·")[0]}
                </p>
              </div>
            </div>

            {/* AI Summary / Advisory */}
            <div className="mt-6 rounded-2xl border border-border/60 bg-surface/90 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1">
                <BrainCircuit className="size-4 text-signal" />
                <span>Executive Operational Assessment</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-serif italic">
                "{liveResult?.advisory_text || prediction.summary}"
              </p>
            </div>
          </div>

          {/* 24-Hour Projected Outage Risk Trajectory Curve */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-sans text-sm font-semibold text-foreground">
                  24-Hour Outage Risk Trajectory Projection
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Simulated risk escalation against 80% critical outage threshold
                </p>
              </div>
              <span className="pill bg-surface px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                Sampling: Hourly Step
              </span>
            </div>

            <div className="mt-5 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prediction.trajectory}>
                  <defs>
                    <linearGradient id="riskGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={
                          displayedHI >= 50 ? "var(--color-danger)" : "var(--color-signal)"
                        }
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          displayedHI >= 50 ? "var(--color-danger)" : "var(--color-signal)"
                        }
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
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
                    dataKey="projectedRisk"
                    name="Projected Risk %"
                    stroke={displayedHI >= 50 ? "var(--color-danger)" : "var(--color-signal)"}
                    strokeWidth={2}
                    fill="url(#riskGlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recommended Actions */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <h4 className="font-sans text-sm font-semibold text-foreground mb-3">
              Automated Prescriptive Actions
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

      {/* Community Incident Report Modal */}
      <IncidentReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        defaultZone={targetAsset.substation}
      />
    </div>
  );
}
