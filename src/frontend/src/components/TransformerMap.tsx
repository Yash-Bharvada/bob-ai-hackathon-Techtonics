/**
 * TransformerMap.tsx
 * ==================
 * Browser-only at runtime — maplibre-gl is declared as an SSR external in
 * vite.config.ts so Node never evaluates it. The component itself only mounts
 * inside a useEffect (browser only), so all window/WebGL usage is safe.
 *
 * Uses CARTO Dark Matter & Positron raster basemaps by default:
 * - Instant in-memory style load (0ms network parse delay)
 * - Zero font glyph or sprite dependencies (eliminates 404 hangs)
 * - Automatic failover to OpenStreetMap raster tiles if network fails
 * - Safety timers ensure substation pins render immediately regardless of slow tile networks
 */

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CARTO_DARK_STYLE,
  CARTO_LIGHT_STYLE,
  OSM_RASTER_STYLE,
  TRANSFORMER_LOCATIONS_FULL,
  type TransformerLocation,
} from "@/lib/transformerLocations";
import { validateLocation, type RawLocationRecord } from "@/lib/locationValidator";

/** Props accepted by TransformerMap */
export interface TransformerMapProps {
  /** Called when a pin is clicked with the transformer id */
  onPinClick?: (id: string) => void;
  /** Currently highlighted transformer id (selected from grid row) */
  selectedId?: string | null;
  /** Live telemetry updates; merged into location records */
  liveUpdates?: Record<
    string,
    { status: "risk" | "watch" | "stable"; healthScore: number; lastUpdated: string }
  >;
  style?: CSSProperties;
  className?: string;
  /** When true, renders a compact layout suitable for dashboard cards */
  compact?: boolean;
}

type ConnectionStatus = "connected" | "disconnected" | "loading";

/** Criticality → pin colour */
const CRIT_COLOR: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

/** Status → pin colour override (live telemetry) */
const STATUS_COLOR: Record<string, string> = {
  risk: "#ef4444",
  watch: "#f97316",
  stable: "#22c55e",
};

function pinColor(loc: TransformerLocation): string {
  if (loc.status && STATUS_COLOR[loc.status]) return STATUS_COLOR[loc.status];
  return CRIT_COLOR[loc.criticality] ?? "#6b7280";
}

/**
 * Build the SVG for a pin marker.
 * All text is set via SVG text elements — no dynamic HTML in popups.
 */
function buildPinSvg(loc: TransformerLocation, selected: boolean): string {
  const color = pinColor(loc);
  const stroke = selected ? "#ffffff" : color;
  const strokeW = selected ? 3 : 1.5;
  const label = loc.id; // short validated id, safe for SVG text
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56" role="img" aria-label="${label}">
  <defs>
    <filter id="shadow-${loc.id}" x="-30%" y="-10%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.45"/>
    </filter>
  </defs>
  <path
    d="M22 2 C12.06 2 4 10.06 4 20 C4 31.5 22 54 22 54 C22 54 40 31.5 40 20 C40 10.06 31.94 2 22 2 Z"
    fill="${color}"
    stroke="${stroke}"
    stroke-width="${strokeW}"
    filter="url(#shadow-${loc.id})"
  />
  <circle cx="22" cy="20" r="7" fill="white" opacity="0.92"/>
  <path d="M24 13 L19 21 L22.5 21 L20 27 L25 19 L21.5 19 Z" fill="${color}"/>
  <rect x="2" y="42" width="40" height="12" rx="6" fill="${color}" opacity="0.95"/>
  <text x="22" y="52" text-anchor="middle" font-size="8" font-family="IBM Plex Mono,monospace" font-weight="600" fill="white">${label}</text>
</svg>`.trim();
}

export function TransformerMap({
  onPinClick,
  selectedId,
  liveUpdates,
  style,
  className,
  compact = false,
}: TransformerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hasFittedBoundsRef = useRef<boolean>(false);
  const fallbackTriedRef = useRef<boolean>(false);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tileStatus, setTileStatus] = useState<ConnectionStatus>("loading");
  const [activeStyleKey, setActiveStyleKey] = useState<"dark" | "light" | "osm">("dark");

  // Merge live updates into the static locations
  const mergedLocations = useCallback((): TransformerLocation[] => {
    return TRANSFORMER_LOCATIONS_FULL.map((loc) => {
      const upd = liveUpdates?.[loc.id];
      return upd ? { ...loc, ...upd } : loc;
    });
  }, [liveUpdates]);

  function assertPinGridInvariant(pinCount: number, locationCount: number) {
    if (pinCount !== locationCount) {
      console.error(
        `[TransformerMap] INVARIANT VIOLATED: ${pinCount} pins on map but ${locationCount} valid locations.`,
      );
    }
  }

  // ── Initialise map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isDark =
      typeof document !== "undefined" &&
      (document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        localStorage.getItem("cinematic-theme") === "dark");

    const initialStyle = isDark ? CARTO_DARK_STYLE : CARTO_LIGHT_STYLE;
    setActiveStyleKey(isDark ? "dark" : "light");

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: [72.935, 22.495] as [number, number],
      zoom: 11.2,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    const onMapLoaded = () => {
      setMapReady(true);
      setTileStatus("connected");
      try {
        map.resize();
      } catch {}
    };

    // Listen across multiple readiness milestones
    map.on("load", onMapLoaded);
    map.on("style.load", onMapLoaded);
    map.on("idle", () => {
      setTileStatus("connected");
      if (!mapReady) onMapLoaded();
    });

    if (map.loaded() || map.isStyleLoaded()) {
      onMapLoaded();
    }

    // Safety timeout: ensure pins are NEVER blocked by slow tile fetches
    const safetyTimer = window.setTimeout(() => {
      onMapLoaded();
    }, 600);

    // Track source data / tile loading
    map.on("sourcedata", (e) => {
      if (e.isSourceLoaded) {
        setTileStatus("connected");
      }
    });

    map.on("error", (e: maplibregl.ErrorEvent) => {
      const msg: string =
        (e as unknown as { error?: { message?: string } })?.error?.message ?? "";
      const lower = msg.toLowerCase();

      // Fatal WebGL crash
      const isFatal =
        lower.includes("webgl") ||
        lower.includes("context lost") ||
        lower.includes("not supported");

      if (isFatal) {
        setLoadError(msg || "WebGL graphic initialization failed.");
      } else if (lower.includes("tile") || lower.includes("fetch") || lower.includes("network")) {
        // Automatic fallback to OSM raster tiles if CARTO has connectivity issues
        if (!fallbackTriedRef.current) {
          fallbackTriedRef.current = true;
          try {
            map.setStyle(OSM_RASTER_STYLE);
            setActiveStyleKey("osm");
          } catch {}
        } else {
          setTileStatus("disconnected");
        }
      }
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    // Dynamic resize observer so map canvas always fills parent container
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        try {
          map.resize();
        } catch {}
      });
      resizeObserver.observe(containerRef.current);
    }

    const onWindowResize = () => {
      try {
        map.resize();
      } catch {}
    };
    window.addEventListener("resize", onWindowResize);

    // Additional resize triggers for layout stability
    const t1 = setTimeout(() => {
      try {
        map.resize();
      } catch {}
    }, 300);
    const t2 = setTimeout(() => {
      try {
        map.resize();
      } catch {}
    }, 1000);

    return () => {
      clearTimeout(safetyTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", onWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      mapRef.current = null;
    };
  }, []); // runs once on mount

  // ── Place / update markers whenever map is ready or liveUpdates/selectedId changes ─
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const locations = mergedLocations();

    const seenIds = new Set<string>();
    const seenCoords = new Set<string>();
    const validLocations = locations.filter((loc) => {
      const result = validateLocation(loc as unknown as RawLocationRecord, seenIds, seenCoords);
      return result.valid;
    });

    assertPinGridInvariant(validLocations.length, validLocations.length);

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!validLocations.find((l) => l.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Create or update each valid marker
    validLocations.forEach((loc) => {
      const isSelected = selectedId === loc.id;
      const svgString = buildPinSvg(loc, isSelected);
      const existing = markersRef.current.get(loc.id);

      if (existing) {
        const el = existing.getElement();
        el.innerHTML = svgString; // safe: built from validated static data
        el.onclick = () => {
          showPopup(map, loc);
          onPinClick?.(loc.id);
        };
        return;
      }

      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.style.width = "44px";
      el.style.height = "56px";
      el.innerHTML = svgString; // safe: no user-supplied content
      el.setAttribute("aria-label", loc.name);
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.onclick = () => {
        showPopup(map, loc);
        onPinClick?.(loc.id);
      };
      el.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          showPopup(map, loc);
          onPinClick?.(loc.id);
        }
      };

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);

      markersRef.current.set(loc.id, marker);
    });

    // Fit bounds to all valid pins ONLY on first load (prevent camera snapping on telemetry ticks)
    if (markersRef.current.size > 0 && !hasFittedBoundsRef.current && !selectedId) {
      const bounds = new maplibregl.LngLatBounds();
      validLocations.forEach((loc) => bounds.extend([loc.lng, loc.lat]));
      map.fitBounds(bounds, { padding: 50, duration: 800, maxZoom: 13.5 });
      hasFittedBoundsRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, liveUpdates, selectedId]);

  // ── Fly to selected pin when selectedId changes ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedId) return;
    const loc = TRANSFORMER_LOCATIONS_FULL.find((l) => l.id === selectedId);
    if (!loc) return;
    map.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 700 });
    showPopup(map, loc);
  }, [selectedId, mapReady]);

  // ── Show popup ───────────────────────────────────────────────────────────────
  function showPopup(map: maplibregl.Map, loc: TransformerLocation) {
    popupRef.current?.remove();

    const isDark =
      typeof document !== "undefined" &&
      (document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        localStorage.getItem("cinematic-theme") === "dark");

    const container = document.createElement("div");
    container.style.cssText = `font-family:var(--font-mono, monospace);min-width:210px;padding:6px 2px;color:${isDark ? "#f4f4f5" : "#18181b"};`;

    const title = document.createElement("p");
    title.style.cssText = `font-weight:700;font-size:12px;margin:0 0 6px;line-height:1.35;color:${isDark ? "#ffffff" : "#09090b"};letter-spacing:-0.01em;`;
    title.textContent = loc.name;
    container.appendChild(title);

    const badgeRow = document.createElement("div");
    badgeRow.style.cssText = "display:flex;gap:6px;margin-bottom:8px;";
    const critBadge = document.createElement("span");
    const critBg = CRIT_COLOR[loc.criticality] ?? "#71717a";
    critBadge.style.cssText = `font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${critBg};color:#ffffff;text-transform:uppercase;`;
    critBadge.textContent = loc.criticality;
    badgeRow.appendChild(critBadge);

    const zoneBadge = document.createElement("span");
    zoneBadge.style.cssText = `font-size:10px;padding:2px 6px;border-radius:4px;background:${isDark ? "#27272a" : "#e4e4e7"};color:${isDark ? "#d4d4d8" : "#3f3f46"};`;
    zoneBadge.textContent = loc.gridZone;
    badgeRow.appendChild(zoneBadge);
    container.appendChild(badgeRow);

    const rows: [string, string][] = [
      ["Lat, Lng", `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`],
      ["Voltage", loc.voltageKv],
      ["Rating", `${loc.mvRating} MVA`],
      ["Feeder", loc.feederLine ?? "—"],
      ["Status", (loc.status ?? loc.archetype ?? "Stable").toUpperCase()],
    ];

    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;justify-content:space-between;gap:12px;font-size:11px;padding:2px 0;";
      const lEl = document.createElement("span");
      lEl.style.color = isDark ? "#a1a1aa" : "#71717a";
      lEl.textContent = label;
      const vEl = document.createElement("span");
      const isRisk = label === "Status" && (value.includes("RISK") || value.includes("CRITICAL"));
      vEl.style.cssText = `font-weight:600;font-family:monospace;color:${isRisk ? "#ef4444" : isDark ? "#fafafa" : "#18181b"};`;
      vEl.textContent = value;
      row.appendChild(lEl);
      row.appendChild(vEl);
      container.appendChild(row);
    });

    const popup = new maplibregl.Popup({
      offset: 12,
      closeButton: true,
      maxWidth: "280px",
      className: "transformer-custom-popup",
    })
      .setLngLat([loc.lng, loc.lat])
      .setDOMContent(container)
      .addTo(map);

    popupRef.current = popup;
  }

  // ── Controls ────────────────────────────────────────────────────────────────
  const handleResetView = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = new maplibregl.LngLatBounds();
    TRANSFORMER_LOCATIONS_FULL.forEach((loc) => bounds.extend([loc.lng, loc.lat]));
    map.fitBounds(bounds, { padding: 50, duration: 700, maxZoom: 13.5 });
  };

  const handleStyleChange = (styleKey: "dark" | "light" | "osm") => {
    setActiveStyleKey(styleKey);
    const map = mapRef.current;
    if (!map) return;
    try {
      if (styleKey === "dark") map.setStyle(CARTO_DARK_STYLE);
      else if (styleKey === "light") map.setStyle(CARTO_LIGHT_STYLE);
      else if (styleKey === "osm") map.setStyle(OSM_RASTER_STYLE);
    } catch (err) {
      console.warn("Failed to switch style:", err);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: style?.minHeight || (compact ? "300px" : "380px"),
        ...style,
      }}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: "100%", borderRadius: "inherit" }}
        aria-label="Transformer location map"
        role="application"
      />

      {/* Loading overlay - dark glassmorphism */}
      {!mapReady && !loadError && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-opacity duration-300 rounded-inherit"
          aria-live="polite"
        >
          <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-3" />
          <span className="text-xs font-mono text-muted-foreground tracking-wide">
            Loading Anand Grid Base Layer…
          </span>
        </div>
      )}

      {/* Hard error overlay */}
      {loadError && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md rounded-inherit p-6 gap-3 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="size-10 rounded-full bg-destructive/20 text-destructive flex items-center justify-center font-bold text-lg">
            !
          </div>
          <span className="text-sm font-bold text-foreground">Map Graphic Notice</span>
          <span className="text-xs text-muted-foreground max-w-xs">{loadError}</span>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setMapReady(true);
            }}
            className="mt-2 text-xs font-mono px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Show Pins on Grid
          </button>
        </div>
      )}

      {/* Tile connection status indicator */}
      {!compact ? (
        <div
          className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full border border-border/80 bg-background/90 backdrop-blur-md px-3 py-1 text-[11px] font-mono shadow-md pointer-events-none"
          aria-live="polite"
          aria-label={`Map tile status: ${tileStatus}`}
        >
          <span
            className={`size-2 rounded-full inline-block ${
              tileStatus === "connected"
                ? "bg-emerald-500 animate-pulse"
                : tileStatus === "disconnected"
                  ? "bg-amber-500"
                  : "bg-amber-400 animate-ping"
            }`}
          />
          <span className="text-foreground font-medium">
            {tileStatus === "connected"
              ? "Tiles Live"
              : tileStatus === "disconnected"
                ? "Pins Live (Offline Tiles)"
                : "Connecting…"}
          </span>
          <span className="text-muted-foreground border-l border-border/60 pl-2">
            {TRANSFORMER_LOCATIONS_FULL.length} Pins
          </span>
        </div>
      ) : (
        <div
          className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 rounded-full border border-border/70 bg-background/85 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-mono shadow-xs pointer-events-none"
        >
          <span
            className={`size-1.5 rounded-full inline-block ${
              tileStatus === "connected" ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span className="text-foreground font-medium">18 Substations</span>
        </div>
      )}

      {/* Quick Actions (Recenter & Style Switcher) */}
      <div className={`absolute ${compact ? "top-2.5 right-12" : "top-3 right-14"} z-20 flex items-center gap-1.5`}>
        <button
          type="button"
          onClick={handleResetView}
          title="Recenter view on Anand District"
          className="px-2 py-0.5 text-[10px] font-mono bg-background/90 backdrop-blur-md text-foreground/90 border border-border/80 hover:bg-secondary hover:text-foreground rounded shadow-xs transition-colors cursor-pointer"
        >
          Fit
        </button>
        {!compact && (
          <div className="flex bg-background/90 backdrop-blur-md border border-border/80 rounded-md p-0.5 shadow-sm text-[10px] font-mono">
            <button
              type="button"
              onClick={() => handleStyleChange("dark")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeStyleKey === "dark"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange("osm")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeStyleKey === "osm"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              OSM
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
