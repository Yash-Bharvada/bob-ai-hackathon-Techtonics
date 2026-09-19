import { Database, FileSpreadsheet, RefreshCw, Upload, X } from "lucide-react";
import { gridDataSource, type DataSourceType } from "@/lib/gridDataSource";

interface DataSourceBadgeProps {
  dataSource: DataSourceType;
  assetCount: number;
  datasetName?: string;
  onReset: () => void;
  onUploadClick?: () => void;
}

export function DataSourceBadge({
  dataSource,
  assetCount,
  datasetName,
  onReset,
  onUploadClick,
}: DataSourceBadgeProps) {
  if (dataSource === "none") return null;

  const displayName = datasetName || (dataSource === "anand" ? "Anand Corridor (Sample)" : "Custom Upload");

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/90 px-3 py-1.5 text-xs shadow-xs">
      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
        {dataSource === "anand" ? (
          <>
            <Database className="size-3.5 text-emerald-400" />
            <span>Dataset: <strong className="text-foreground">{displayName} ({assetCount} Assets)</strong></span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="size-3.5 text-blue-400" />
            <span>Dataset: <strong className="text-foreground">{displayName} ({assetCount} Assets)</strong></span>
          </>
        )}
      </span>

      <span className="text-border">|</span>

      {onUploadClick && (
        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          <Upload className="size-3" />
          Upload CSV
        </button>
      )}

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-400 transition-colors ml-1"
        title="Switch data source or clear current fleet"
      >
        <RefreshCw className="size-3" />
        Change
      </button>
    </div>
  );
}
