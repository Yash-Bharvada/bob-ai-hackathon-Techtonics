import { useState, useRef } from "react";
import {
  Database,
  Upload,
  FileSpreadsheet,
  Download,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sliders,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { techtonicsApi, type RankedAsset, type CsvScoreRow } from "@/lib/techtonicsApi";
import { gridDataSource } from "@/lib/gridDataSource";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

interface EmptyWorkspaceChoiceProps {
  userName?: string;
  userCity?: string;
  onSelectAnand: () => void;
  onCustomDataLoaded: (assets: RankedAsset[]) => void;
}

export function EmptyWorkspaceChoice({
  userName = "Operator",
  userCity = "Detected Location",
  onSelectAnand,
  onCustomDataLoaded,
}: EmptyWorkspaceChoiceProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a valid .csv file");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const res = await techtonicsApi.scoreCSV(file);
      if (!res.results || res.results.length === 0) {
        throw new Error("No readable transformer records found in CSV.");
      }

      // Convert scored CSV rows to RankedAssets for the dashboard & grid views
      const convertedAssets: RankedAsset[] = res.results.map((row: CsvScoreRow, idx: number) => {
        const hi = row.health_index;
        const rul = row.RUL_days;
        const composite = Number(
          (0.35 * (hi / 100) + 0.25 * Math.max(0, 1 - rul / 120) + 0.20 * (row.fault_prob || 0.8)).toFixed(3)
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
          substation_name: `${userCity.split(",")[0].trim()} Substation`,
          grid_zone: `${userCity.split(",")[0].trim()} Corridor`,
          criticality_tier: tier === "CRITICAL" ? "Critical" : tier === "HIGH" ? "High" : "Standard",
          health_index: hi,
          RUL_days: rul,
          fault_type: row.fault_type || "NF",
          fault_prob: row.fault_prob || 0.9,
          risk_tier: tier,
          composite_score: composite,
          mva_rating: 25.0,
          voltage_kv: "66kV",
          top_3_shap: row.top_3_shap || [["Hydrogen", 18.5], ["Water content", 14.2], ["Power factor", 9.1]],
          core_temp_c: 65.0,
          load_pct: 70.0,
          current_load_mw: 17.5,
        };
      });

      gridDataSource.setCustomAssets(convertedAssets);
      toast.success(`Successfully loaded & scored ${convertedAssets.length} custom transformers!`);
      onCustomDataLoaded(convertedAssets);
    } catch (err: any) {
      const msg = err.message || "Failed to parse and score CSV.";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-8">
      {/* Decorative gradient orb */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono font-semibold text-amber-400 mb-2">
            <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            WORKSPACE EMPTY · NO REGION SELECTED
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Welcome, {userName}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-2xl">
            Location detected: <span className="font-semibold text-foreground">{userCity}</span>. 
            Because pre-loaded telemetry is calibrated specifically to the <span className="text-emerald-400 font-semibold">Anand Transmission Corridor</span>, 
            your workspace is empty until you select your data source below:
          </p>
        </div>
      </div>

      {/* Choice Grid */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Option 1: Anand Sample Data */}
        <div className="rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 p-6 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="grid size-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                <Database className="size-6" />
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                18 TRANSFORMERS
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              Load Pre-loaded Anand Fleet Data
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Populate the platform with calibrated Anand zone telemetry: 18 high-voltage transformers (TX-101 to TX-118), 
              live Health Index regression, RUL forecasts, and DGA fault classifications.
            </p>
          </div>

          <button
            type="button"
            onClick={onSelectAnand}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-ink hover:bg-emerald-400 transition-colors shadow-md hover:shadow-emerald-500/20"
          >
            <Zap className="size-3.5 fill-current" />
            Load Pre-loaded Anand Data (Sample)
            <ArrowRight className="size-3.5" />
          </button>
        </div>

        {/* Option 2: Upload Custom CSV */}
        <div className="rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 p-6 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="grid size-12 place-items-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="size-6" />
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                CUSTOM FLEET SCORING
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              Enter / Upload Your Own Data (CSV)
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Upload your own substation DGA readings, oil parameters, and temperatures. 
              Our trained ML models (Model 1 & 2) will calculate Health Index, RUL, and fault modes for each row.
            </p>

            {uploadError && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-400 flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Scoring via ML Pipeline...
                </>
              ) : (
                <>
                  <Upload className="size-3.5" />
                  Upload Your Sensor CSV
                </>
              )}
            </button>

            <a
              href={techtonicsApi.getSampleCsvUrl()}
              download="voltra_sample_readings.csv"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors text-center"
              title="Download CSV format template"
            >
              <Download className="size-3.5 text-muted-foreground" />
              Template
            </a>
          </div>
        </div>
      </div>

      {/* Manual Reading Hint */}
      <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Sliders className="size-3.5 text-emerald-400" />
          Want to test an individual transformer with interactive sliders?
        </span>
        <Link to="/predict" className="font-semibold text-emerald-400 hover:underline flex items-center gap-1">
          Open Prediction Sandbox <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
