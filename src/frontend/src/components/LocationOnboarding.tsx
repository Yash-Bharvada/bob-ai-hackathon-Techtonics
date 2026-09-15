/**
 * LocationOnboarding.tsx
 * ======================
 * Full-screen post-login wizard that:
 *  1. Asks the user for their operational area (text)
 *  2. Requests Chrome GPS access and reverse-geocodes to a full address
 *  3. Saves the resolved location to authSession and kicks off Open-Meteo fetch
 *  4. On confirm → calls onComplete() so the parent can navigate to dashboard
 */

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Compass,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Zap,
} from "lucide-react";
import { authSession, type UserLocationState } from "@/lib/authSession";
import { toast } from "sonner";

interface LocationOnboardingProps {
  userName: string;
  onComplete: (loc: UserLocationState) => void;
  onSkip: () => void;
}

const PRESET_NODES = [
  { name: "GIDC Industrial Phase-2", region: "Anand, Gujarat (Zone-B)", lat: 22.5645, lon: 72.9589 },
  { name: "Anand Central Transmission", region: "Anand Urban Core (Zone-A)", lat: 22.5567, lon: 72.9512 },
  { name: "Anand South Bulk Substation", region: "Anand South Corridor (Zone-D)", lat: 22.5312, lon: 72.9421 },
  { name: "Borsad Rural Interconnect", region: "Borsad Agricultural (Zone-C)", lat: 22.4110, lon: 72.9023 },
] as const;

type Step = "area" | "gps" | "confirm";

async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; region: string; display: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) throw new Error("Geocode failed");
    const data = await res.json();
    const addr = data.address ?? {};
    const city   = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "Unknown City";
    const state  = addr.state ?? "";
    const country = addr.country ?? "";
    const road   = addr.road ?? "";
    const suburb = addr.suburb ?? addr.neighbourhood ?? "";
    const display = [road, suburb, city, state, country].filter(Boolean).join(", ");
    return { city, region: [state, country].filter(Boolean).join(", "), display };
  } catch {
    return { city: "Detected", region: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`, display: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E` };
  }
}

export function LocationOnboarding({ userName, onComplete, onSkip }: LocationOnboardingProps) {
  const [step, setStep] = useState<Step>("area");
  const [areaText, setAreaText] = useState("");
  const [gpsState, setGpsState] = useState<"idle" | "requesting" | "success" | "denied">("idle");
  const [resolvedLoc, setResolvedLoc] = useState<UserLocationState | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<typeof PRESET_NODES[number] | null>(null);

  // ── Step 1: area text submitted ─────────────────────────────────────────────
  const handleAreaNext = () => {
    if (!areaText.trim()) {
      toast.error("Please enter your operational area or city before continuing.");
      return;
    }
    setStep("gps");
  };

  // ── Step 2a: GPS request ────────────────────────────────────────────────────
  const handleRequestGPS = async () => {
    setGpsState("requesting");
    setGpsError("");
    try {
      const loc = await authSession.requestBrowserLocation();
      // Reverse-geocode to full address
      const geo = await reverseGeocode(loc.latitude, loc.longitude);
      const resolved: UserLocationState = {
        ...loc,
        // Store full reverse-geocoded address in city field for display
        city: geo.display || geo.city,
        region: geo.region,
      };
      authSession.saveLocation(resolved);
      setResolvedLoc(resolved);
      setSelectedPreset(null);
      setGpsState("success");
      setStep("confirm");
    } catch (err: any) {
      setGpsState("denied");
      setGpsError(err.message ?? "Location permission denied.");
    }
  };

  // ── Step 2b: Preset node selected ──────────────────────────────────────────
  const handlePresetSelect = (preset: typeof PRESET_NODES[number]) => {
    const loc: UserLocationState = {
      latitude: preset.lat,
      longitude: preset.lon,
      city: preset.name,
      region: preset.region,
      autoDetected: false,
      timestamp: new Date().toISOString(),
    };
    authSession.saveLocation(loc);
    setResolvedLoc(loc);
    setSelectedPreset(preset);
    setGpsState("idle");
    setStep("confirm");
  };

  // ── Step 3: Confirm & proceed ───────────────────────────────────────────────
  const handleConfirm = () => {
    if (!resolvedLoc) return;
    toast.success(`Location set · Open-Meteo weather syncing for ${resolvedLoc.city}`);
    onComplete(resolvedLoc);
  };

  const firstName = userName.split(" ")[0];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg">

        {/* ── Progress pip ── */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["area", "gps", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`size-2 rounded-full transition-all ${
                s === step ? "bg-primary scale-125" :
                (["area", "gps", "confirm"].indexOf(step) > i) ? "bg-primary/50" : "bg-border"
              }`} />
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Area Input ── */}
        {step === "area" && (
          <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary mb-1">
              <Zap className="size-3.5" /> Step 1 of 3
            </div>
            <h2 className="text-2xl font-bold text-foreground mt-1">
              Welcome, {firstName} 👋
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Tell us your operational area so VOLTRA can fetch live weather data from Open-Meteo and calibrate the thermal stress index for your grid zone.
            </p>

            <div className="mt-6">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Your City / Operational Area
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={areaText}
                  onChange={(e) => setAreaText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAreaNext()}
                  placeholder="e.g. Anand, Gujarat · GIDC Phase-2"
                  className="w-full rounded-xl border border-border bg-muted/30 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all"
                  autoFocus
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                This is used as context alongside GPS coordinates for weather lookups.
              </p>
            </div>

            <button
              onClick={handleAreaNext}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-bold text-background hover:bg-foreground/90 transition-all active:scale-[0.98]"
            >
              Continue to Location <ChevronRight className="size-4" />
            </button>
            <button
              onClick={onSkip}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── STEP 2: GPS / Preset ── */}
        {step === "gps" && (
          <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary mb-1">
              <Compass className="size-3.5" /> Step 2 of 3
            </div>
            <h2 className="text-2xl font-bold text-foreground mt-1">Share Your Location</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Allow Chrome to access your coordinates — VOLTRA uses them to fetch real-time ambient temperature and humidity from Open-Meteo, which feeds directly into the thermal stress calculation.
            </p>

            {/* GPS button */}
            <button
              onClick={handleRequestGPS}
              disabled={gpsState === "requesting"}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-primary/40 bg-primary/8 py-4 text-sm font-semibold text-foreground hover:bg-primary/12 transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {gpsState === "requesting" ? (
                <><Loader2 className="size-4 animate-spin text-primary" /> Requesting GPS Access…</>
              ) : gpsState === "success" ? (
                <><CheckCircle2 className="size-4 text-emerald-500" /> Location Captured</>
              ) : (
                <><Navigation className="size-4 text-primary" /> Allow Location Access (Chrome Prompt)</>
              )}
            </button>

            {gpsError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-400">
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                <span>{gpsError} — or pick a node below.</span>
              </div>
            )}

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <span className="flex-1 h-px bg-border/60" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">or select substation node</span>
              <span className="flex-1 h-px bg-border/60" />
            </div>

            {/* Preset nodes */}
            <div className="space-y-2">
              {PRESET_NODES.map((node) => (
                <button
                  key={node.name}
                  onClick={() => handlePresetSelect(node)}
                  className="w-full flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left hover:bg-muted/50 hover:border-primary/40 transition-all"
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground">{node.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{node.region}</p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {node.lat.toFixed(2)}°N
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={onSkip}
              className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── STEP 3: Confirm ── */}
        {step === "confirm" && resolvedLoc && (
          <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-500 mb-1">
              <CheckCircle2 className="size-3.5" /> Step 3 of 3
            </div>
            <h2 className="text-2xl font-bold text-foreground mt-1">Location Confirmed</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Open-Meteo will now fetch live weather data for your exact coordinates every time you load the dashboard.
            </p>

            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4 space-y-2">
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">{resolvedLoc.city}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{resolvedLoc.region}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {resolvedLoc.latitude.toFixed(4)}°N, {resolvedLoc.longitude.toFixed(4)}°E
                </span>
                {resolvedLoc.autoDetected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <Navigation className="size-2.5" /> GPS
                  </span>
                )}
              </div>
              {areaText && (
                <p className="text-[11px] text-muted-foreground pl-6">Operational area: <span className="text-foreground font-medium">{areaText}</span></p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
              ⚡ Live weather will feed into the thermal stress index on your dashboard and pre-fill the ambient temperature in the Prediction Studio.
            </div>

            <button
              onClick={handleConfirm}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 transition-all active:scale-[0.98]"
            >
              <Zap className="size-4" /> Enter VOLTRA Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
