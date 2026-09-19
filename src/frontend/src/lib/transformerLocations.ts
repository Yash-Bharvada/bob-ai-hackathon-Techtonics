/**
 * transformerLocations.ts
 * =======================
 * Single source of truth for all 18 Anand District transformer locations.
 * Sourced directly from: src/data/transformer_locations.csv (and the root-level
 * transformer_locations.csv), cross-referenced against initialGridAssets in gridData.ts.
 *
 * The MAP_STYLE_URL is the one place in the codebase where the tile style URL lives.
 * All other code imports it from here.
 */

import { validateLocationBatch, type RawLocationRecord } from "@/lib/locationValidator";
import type { ValidatedLocation } from "@/lib/locationValidator";

import type { StyleSpecification } from "maplibre-gl";

/** Ultra-reliable CARTO Dark Matter raster style — loads in 0ms without external JSON/sprite dependencies */
export const CARTO_DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

/** High-contrast CARTO Positron light raster style */
export const CARTO_LIGHT_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "carto-light": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-light-layer",
      type: "raster",
      source: "carto-light",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

/** Secondary fallback: Standard OpenStreetMap raster style */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/** OpenFreeMap style URL — retained for vector option */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const MAP_STYLE_DARK_URL = "https://tiles.openfreemap.org/styles/dark";

/**
 * Raw CSV data from src/data/transformer_locations.csv
 * Columns used: asset_id, substation_name, latitude, longitude, criticality, archetype, grid_zone
 */
const RAW_LOCATIONS: RawLocationRecord[] = [
  {
    id: "TX-101",
    name: "TX-101 · Anand City Civil Hospital Substation",
    lat: 22.559,
    lng: 72.948,
    iconKey: "transformer",
    gridZone: "Zone-A",
    criticality: "Medium",
    archetype: "Stable",
    feederLine: "Feeder Line-1",
    voltageKv: "11kV",
    mvRating: 25.0,
  },
  {
    id: "TX-102",
    name: "TX-102 · Anand Substation #2",
    lat: 22.562,
    lng: 72.945,
    iconKey: "transformer",
    gridZone: "Zone-A",
    criticality: "Low",
    archetype: "Stable",
    feederLine: "Feeder Line-2",
    voltageKv: "33kV",
    mvRating: 63.0,
  },
  {
    id: "TX-103",
    name: "TX-103 · Anand Substation #3",
    lat: 22.553,
    lng: 72.954,
    iconKey: "transformer",
    gridZone: "Zone-A",
    criticality: "Low",
    archetype: "Stable",
    feederLine: "Feeder Line-3",
    voltageKv: "66kV",
    mvRating: 40.0,
  },
  {
    id: "TX-104",
    name: "TX-104 · Anand Central Transmission Substation",
    lat: 22.5567,
    lng: 72.9512,
    iconKey: "transformer",
    gridZone: "Zone-A",
    criticality: "Critical",
    archetype: "Progressive_Thermal",
    feederLine: "Feeder Line-4",
    voltageKv: "132kV",
    mvRating: 100.0,
  },
  {
    id: "TX-105",
    name: "TX-105 · Vitthal Udyognagar Feeder Substation",
    lat: 22.5678,
    lng: 72.962,
    iconKey: "transformer",
    gridZone: "Zone-B",
    criticality: "High",
    archetype: "Stable",
    feederLine: "Feeder Line-5",
    voltageKv: "11kV",
    mvRating: 100.0,
  },
  {
    id: "TX-106",
    name: "TX-106 · GIDC Phase-1 Industrial Substation",
    lat: 22.5615,
    lng: 72.9645,
    iconKey: "transformer",
    gridZone: "Zone-B",
    criticality: "Medium",
    archetype: "Stable",
    feederLine: "Feeder Line-6",
    voltageKv: "33kV",
    mvRating: 160.0,
  },
  {
    id: "TX-107",
    name: "TX-107 · GIDC Industrial Phase-2 Substation",
    lat: 22.5645,
    lng: 72.9589,
    iconKey: "transformer",
    gridZone: "Zone-B",
    criticality: "Critical",
    archetype: "Electrical_Arcing",
    feederLine: "Line-B Feeder",
    voltageKv: "66kV",
    mvRating: 25.0,
  },
  {
    id: "TX-108",
    name: "TX-108 · GIDC North Belt Substation",
    lat: 22.5702,
    lng: 72.9595,
    iconKey: "transformer",
    gridZone: "Zone-B",
    criticality: "Low",
    archetype: "Stable",
    feederLine: "Feeder Line-8",
    voltageKv: "132kV",
    mvRating: 100.0,
  },
  {
    id: "TX-109",
    name: "TX-109 · Anand-Borsad Highway Junction Substation",
    lat: 22.423,
    lng: 72.911,
    iconKey: "transformer",
    gridZone: "Zone-C",
    criticality: "Medium",
    archetype: "Stable",
    feederLine: "Feeder Line-9",
    voltageKv: "11kV",
    mvRating: 63.0,
  },
  {
    id: "TX-110",
    name: "TX-110 · Borsad Town Primary Substation",
    lat: 22.411,
    lng: 72.9023,
    iconKey: "transformer",
    gridZone: "Zone-C",
    criticality: "High",
    archetype: "Stable",
    feederLine: "Feeder Line-10",
    voltageKv: "33kV",
    mvRating: 25.0,
  },
  {
    id: "TX-111",
    name: "TX-111 · Borsad Rural Interconnect Substation",
    lat: 22.405,
    lng: 72.898,
    iconKey: "transformer",
    gridZone: "Zone-C",
    criticality: "Low",
    archetype: "Stable",
    feederLine: "Feeder Line-11",
    voltageKv: "66kV",
    mvRating: 160.0,
  },
  {
    id: "TX-112",
    name: "TX-112 · Borsad Industrial Feeder Substation",
    lat: 22.415,
    lng: 72.9045,
    iconKey: "transformer",
    gridZone: "Zone-C",
    criticality: "Critical",
    archetype: "Shock_PD",
    feederLine: "Feeder Line-12",
    voltageKv: "132kV",
    mvRating: 25.0,
  },
  {
    id: "TX-113",
    name: "TX-113 · Borsad Gate South Pump Area Substation",
    lat: 22.525,
    lng: 72.938,
    iconKey: "transformer",
    gridZone: "Zone-D",
    criticality: "Low",
    archetype: "Stable",
    feederLine: "Feeder Line-13",
    voltageKv: "11kV",
    mvRating: 100.0,
  },
  {
    id: "TX-114",
    name: "TX-114 · Station Road South Corridor Substation",
    lat: 22.5205,
    lng: 72.946,
    iconKey: "transformer",
    gridZone: "Zone-D",
    criticality: "Low",
    archetype: "Stable",
    feederLine: "Feeder Line-14",
    voltageKv: "33kV",
    mvRating: 63.0,
  },
  {
    id: "TX-115",
    name: "TX-115 · Anand South Bulk Substation",
    lat: 22.5312,
    lng: 72.9421,
    iconKey: "transformer",
    gridZone: "Zone-D",
    criticality: "Critical",
    archetype: "Intervention_Recovery",
    feederLine: "Feeder-1",
    voltageKv: "66kV",
    mvRating: 100.0,
  },
  {
    id: "TX-116",
    name: "TX-116 · Anand University Feeder Substation",
    lat: 22.538,
    lng: 72.928,
    iconKey: "transformer",
    gridZone: "Zone-D",
    criticality: "High",
    archetype: "Stable",
    feederLine: "Feeder Line-16",
    voltageKv: "132kV",
    mvRating: 40.0,
  },
  {
    id: "TX-117",
    name: "TX-117 · West Anand Urban Sector Substation",
    lat: 22.551,
    lng: 72.947,
    iconKey: "transformer",
    gridZone: "Zone-A",
    criticality: "Low",
    archetype: "Stable",
    feederLine: "Feeder Line-17",
    voltageKv: "11kV",
    mvRating: 63.0,
  },
  {
    id: "TX-118",
    name: "TX-118 · North Anand Link Road Substation",
    lat: 22.568,
    lng: 72.953,
    iconKey: "transformer",
    gridZone: "Zone-A",
    criticality: "Low",
    archetype: "Stable",
    feederLine: "Feeder Line-18",
    voltageKv: "33kV",
    mvRating: 160.0,
  },
];

/** Validation result — computed once at module load */
const _batchResult = validateLocationBatch(RAW_LOCATIONS);

/** All 18 valid transformer locations, guaranteed to pass all validation rules */
export const TRANSFORMER_LOCATIONS: ValidatedLocation[] = _batchResult.valid;

/** Any records that failed validation (should be empty for the static set) */
export const REJECTED_LOCATIONS = _batchResult.rejected;

/** Any warnings produced during validation */
export const LOCATION_WARNINGS = _batchResult.warnings;

// Emit console warnings in development so they are visible during dev/test
if (import.meta.env.DEV) {
  if (REJECTED_LOCATIONS.length > 0) {
    console.warn("[transformerLocations] Rejected locations:", REJECTED_LOCATIONS);
  }
  if (LOCATION_WARNINGS.length > 0) {
    console.warn("[transformerLocations] Location warnings:", LOCATION_WARNINGS);
  }
}

/**
 * Extended location record that also carries criticality/zone metadata
 * so the map and grid components can colour-code pins.
 */
export interface TransformerLocation extends ValidatedLocation {
  gridZone: string;
  criticality: "Critical" | "High" | "Medium" | "Low";
  archetype: string;
  feederLine: string;
  voltageKv: string;
  mvRating: number;
  /** Populated at runtime by the live grid merge */
  status?: "risk" | "watch" | "stable";
  healthScore?: number;
  lastUpdated?: string;
}

/** Full metadata locations (used by grid + map for richer pins) */
export const TRANSFORMER_LOCATIONS_FULL: TransformerLocation[] = RAW_LOCATIONS.filter(
  (
    r,
  ): r is RawLocationRecord & {
    id: string;
    name: string;
    lat: number;
    lng: number;
    gridZone: string;
    criticality: string;
    archetype: string;
    feederLine: string;
    voltageKv: string;
    mvRating: number;
  } => _batchResult.valid.some((v) => v.id === r.id),
).map((r) => ({
  id: r.id as string,
  name: r.name as string,
  lat: typeof r.lat === "number" ? r.lat : parseFloat(r.lat as string),
  lng: typeof r.lng === "number" ? r.lng : parseFloat(r.lng as string),
  iconKey: "transformer",
  gridZone: r.gridZone as string,
  criticality: r.criticality as TransformerLocation["criticality"],
  archetype: r.archetype as string,
  feederLine: r.feederLine as string,
  voltageKv: r.voltageKv as string,
  mvRating: r.mvRating as number,
}));
