import { useState } from "react";
import { X, MapPin, Navigation, Loader2, CheckCircle2, AlertTriangle, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authSession, type UserLocationState } from "@/lib/authSession";
import { toast } from "sonner";

interface LocationPromptModalProps {
  open: boolean;
  onClose: () => void;
  onLocationSelected?: (loc: UserLocationState) => void;
}

const PRESET_LOCATIONS: { name: string; region: string; lat: number; lon: number }[] = [
  { name: "GIDC Industrial Phase-2", region: "Anand, Gujarat (Zone-B)", lat: 22.5645, lon: 72.9589 },
  { name: "Anand Central Transmission Hub", region: "Anand Urban Core (Zone-A)", lat: 22.5567, lon: 72.9512 },
  { name: "Anand South Bulk Substation", region: "Anand South Corridor (Zone-D)", lat: 22.5312, lon: 72.9421 },
  { name: "Borsad Rural Interconnect", region: "Borsad Agricultural (Zone-C)", lat: 22.4110, lon: 72.9023 },
];

export function LocationPromptModal({ open, onClose, onLocationSelected }: LocationPromptModalProps) {
  const [detecting, setDetecting] = useState(false);
  const [detectedLoc, setDetectedLoc] = useState<UserLocationState | null>(null);

  if (!open) return null;

  const handleDetectBrowserLocation = async () => {
    setDetecting(true);
    try {
      const loc = await authSession.requestBrowserLocation();
      setDetectedLoc(loc);
      toast.success(`Location captured: ${loc.latitude}°N, ${loc.longitude}°E`);
      if (onLocationSelected) onLocationSelected(loc);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      toast.error(err.message || "Location permission denied. Select a regional substation node below.");
    } finally {
      setDetecting(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    const loc: UserLocationState = {
      latitude: preset.lat,
      longitude: preset.lon,
      city: preset.name,
      region: preset.region,
      autoDetected: false,
      timestamp: new Date().toISOString(),
    };
    authSession.saveLocation(loc);
    toast.info(`Regional node set: ${preset.name}`);
    if (onLocationSelected) onLocationSelected(loc);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/65 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-glass transition-all">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-signal">
          <Compass className="size-4" />
          <span>Regional Grid Geolocation</span>
        </div>

        <h2 className="mt-2 font-sans text-2xl font-bold text-foreground">
          Select Your Transmission Sub-Zone
        </h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Allow Chrome to access your live location to fetch real Open-Meteo ambient temperature telemetry, or pick your assigned Anand District substation corridor.
        </p>

        {/* GPS Detect Button */}
        <div className="mt-6 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-signal text-signal-foreground">
              <Navigation className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Automatic Browser Geolocation</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Chrome will prompt: <em>"Allow voltra.energy to access your location"</em>
              </p>
            </div>
          </div>

          <Button
            onClick={handleDetectBrowserLocation}
            disabled={detecting}
            className="pill mt-3 w-full bg-signal text-xs font-semibold text-signal-foreground hover:bg-signal/90 shadow-sm"
          >
            {detecting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" /> Requesting GPS Coordinates…
              </>
            ) : (
              <>
                <MapPin className="size-3.5 mr-1.5" /> Allow Location & Sync Live Telemetry
              </>
            )}
          </Button>
        </div>

        {/* Preset Regional Sub-Zones */}
        <div className="mt-5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Or Choose Substation Node:
          </p>
          <div className="mt-2.5 space-y-2">
            {PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="w-full flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 text-left transition-all hover:bg-muted/50 hover:border-signal/50"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">{preset.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{preset.region}</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {preset.lat.toFixed(2)}°N, {preset.lon.toFixed(2)}°E
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
