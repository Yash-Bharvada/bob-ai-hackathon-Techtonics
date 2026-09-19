/**
 * TransformerMap.tsx
 * ==================
 * Browser-only at runtime — maplibre-gl is declared as an SSR external in
 * vite.config.ts so Node never evaluates it. The component itself only mounts
 * inside a useEffect (browser only), so all window/WebGL usage is safe.
 */

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MAP_STYLE_URL,
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
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/>
    </filter>
  </defs>
  <path
    d="M22 2 C12.06 2 4 10.06 4 20 C4 31.5 22 54 22 54 C22 54 40 31.5 40 20 C40 10.06 31.94 2 22 2 Z"
    fill="${color}"
    stroke="${stroke}"
    stroke-width="${strokeW}"
    filter="url(#shadow-${loc.id})"
  />
  <circle cx="22" cy="20" r="7" fill="white" opacity="0.9"/>
  <path d="M24 13 L19 21 L22.5 21 L20 27 L25 19 L21.5 19 Z" fill="${color}"/>
  <rect x="2" y="42" width="40" height="12" rx="6" fill="${color}" opacity="0.92"/>
  <text x="22" y="52" text-anchor="middle" font-size="8" font-family="IBM Plex Mono,monospace" font-weight="600" fill="white">${label}</text>
</svg>`.trim();
}

export function TransformerMap({
  onPinClick,
  selectedId,
  liveUpdates,
  style,
  className,
}: TransformerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tileStatus, setTileStatus] = useState<ConnectionStatus>("loading");

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

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [72.935, 22.495] as [number, number],
      zoom: 11,
      attributionControl: { compact: false },
    });

    mapRef.current = map;

    map.on("load", () => {
      setMapReady(true);
      setTileStatus("connected");
    });

    map.on("error", (e: maplibregl.ErrorEvent) => {
      const msg: string =
        (e as unknown as { error?: { message?: string } })?.error?.message ?? "Map tile error";
      const isTileError =
        msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network");
      if (isTileError) {
        setTileStatus("disconnected");
      } else {
        setLoadError(msg);
      }
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    return () => {
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

    // Fit bounds to all valid pins on first load
    if (markersRef.current.size > 0 && !selectedId) {
      const bounds = new maplibregl.LngLatBounds();
      validLocations.forEach((loc) => bounds.extend([loc.lng, loc.lat]));
      map.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 14 });
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

    // Build popup DOM using textContent — never innerHTML for dynamic data
    const container = document.createElement("div");
    container.style.cssText = "font-family:system-ui,sans-serif;min-width:180px;padding:4px 0;";

    const title = document.createElement("p");
    title.style.cssText =
      "font-weight:700;font-size:13px;margin:0 0 6px;line-height:1.3;color:#111;";
    title.textContent = loc.name;
    container.appendChild(title);

    const rows: [string, string][] = [
      ["Lat", loc.lat.toFixed(6)],
      ["Lng", loc.lng.toFixed(6)],
      ["Zone", loc.gridZone],
      ["Voltage", loc.voltageKv],
      ["MVA", String(loc.mvRating)],
      ["Criticality", loc.criticality],
      ["Status", loc.status ?? "—"],
    ];

    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;justify-content:space-between;gap:12px;font-size:11px;padding:1px 0;";
      const lEl = document.createElement("span");
      lEl.style.color = "#6b7280";
      lEl.textContent = label;
      const vEl = document.createElement("span");
      vEl.style.cssText = "font-weight:600;color:#111;font-family:monospace;";
      vEl.textContent = value;
      row.appendChild(lEl);
      row.appendChild(vEl);
      container.appendChild(row);
    });

    const popup = new maplibregl.Popup({ offset: 10, closeButton: true, maxWidth: "260px" })
      .setLngLat([loc.lng, loc.lat])
      .setDOMContent(container)
      .addTo(map);

    popupRef.current = popup;
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
        aria-label="Transformer location map"
        role="application"
      />

      {/* Loading overlay */}
      {!mapReady && !loadError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.7)",
            borderRadius: "inherit",
            zIndex: 10,
          }}
          aria-live="polite"
        >
          <span style={{ fontSize: 13, color: "#6b7280", fontFamily: "monospace" }}>
            Loading map tiles…
          </span>
        </div>
      )}

      {/* Hard error overlay */}
      {loadError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.9)",
            borderRadius: "inherit",
            zIndex: 10,
            gap: 8,
          }}
          role="alert"
          aria-live="assertive"
        >
          <span style={{ fontSize: 14, color: "#ef4444", fontWeight: 700 }}>Map error</span>
          <span style={{ fontSize: 12, color: "#6b7280", textAlign: "center", maxWidth: 240 }}>
            {loadError}
          </span>
        </div>
      )}

      {/* Tile connection status indicator */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(255,255,255,0.9)",
          border: "1px solid #e5e7eb",
          borderRadius: 9999,
          padding: "3px 10px",
          fontSize: 11,
          fontFamily: "monospace",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          pointerEvents: "none",
        }}
        aria-live="polite"
        aria-label={`Map tile status: ${tileStatus}`}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background:
              tileStatus === "connected"
                ? "#22c55e"
                : tileStatus === "disconnected"
                  ? "#ef4444"
                  : "#f59e0b",
            display: "inline-block",
          }}
        />
        <span style={{ color: "#374151" }}>
          {tileStatus === "connected"
            ? "Tiles live"
            : tileStatus === "disconnected"
              ? "Tiles offline"
              : "Connecting…"}
        </span>
      </div>
    </div>
  );
}
