/**
 * gridDataSource.ts
 * ==================
 * Manages data source state for authenticated operators:
 * - "none": Blank workspace (default on login) requiring user selection.
 * - "anand": Pre-loaded 18-transformer Anand zone telemetry & model scores.
 * - "custom": User's own uploaded CSV sensor readings scored by the ML pipeline.
 */

import type { RankedAsset } from "@/lib/techtonicsApi";
import type { ActiveDatasetInfo } from "@/lib/ragApi";

export type DataSourceType = "none" | "anand" | "custom";

const STORAGE_KEY_SOURCE = "voltra_data_source";
const STORAGE_KEY_CUSTOM_ASSETS = "voltra_custom_assets";
const STORAGE_KEY_DATASET_INFO = "voltra_active_dataset_info";

export const gridDataSource = {
  getDataSource(isAuthed: boolean): DataSourceType {
    if (typeof window === "undefined") return "none";
    if (!isAuthed) return "anand"; // Guests view the curated preview snapshot
    const val = localStorage.getItem(STORAGE_KEY_SOURCE);
    if (val === "anand" || val === "custom") return val;
    return "none"; // Default for authenticated operators is empty until chosen
  },

  setDataSource(source: DataSourceType) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_SOURCE, source);
    window.dispatchEvent(new CustomEvent("voltra-datasource-changed", { detail: source }));
  },

  getActiveDatasetInfo(): ActiveDatasetInfo {
    if (typeof window === "undefined") {
      return {
        dataset_id: "anand-corridor-sample",
        name: "Anand Corridor (Sample)",
        asset_count: 18,
        record_count: 18,
        status: "active",
      };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DATASET_INFO);
      return raw ? JSON.parse(raw) : {
        dataset_id: "anand-corridor-sample",
        name: "Anand Corridor (Sample)",
        asset_count: 18,
        record_count: 18,
        status: "active",
      };
    } catch {
      return {
        dataset_id: "anand-corridor-sample",
        name: "Anand Corridor (Sample)",
        asset_count: 18,
        record_count: 18,
        status: "active",
      };
    }
  },

  setActiveDatasetInfo(info: ActiveDatasetInfo) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_DATASET_INFO, JSON.stringify(info));
    window.dispatchEvent(new CustomEvent("voltra-dataset-activated", { detail: info }));
  },

  getCustomAssets(): RankedAsset[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_ASSETS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setCustomAssets(assets: RankedAsset[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_CUSTOM_ASSETS, JSON.stringify(assets));
    localStorage.setItem(STORAGE_KEY_SOURCE, "custom");
    window.dispatchEvent(new CustomEvent("voltra-datasource-changed", { detail: "custom" }));
  },

  setAnandData() {
    this.setDataSource("anand");
    this.setActiveDatasetInfo({
      dataset_id: "anand-corridor-sample",
      name: "Anand Corridor (Sample)",
      asset_count: 18,
      record_count: 18,
      status: "active",
    });
  },

  clearData() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY_SOURCE);
    localStorage.removeItem(STORAGE_KEY_CUSTOM_ASSETS);
    localStorage.removeItem(STORAGE_KEY_DATASET_INFO);
    window.dispatchEvent(new CustomEvent("voltra-datasource-changed", { detail: "none" }));
  },

  clearDataSource() {
    this.clearData();
  },
};

