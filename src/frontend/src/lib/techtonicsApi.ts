/**
 * techtonicsApi.ts
 * Typed client connecting the VOLTRA frontend to the Techtonics FastAPI backend.
 * Endpoints default to http://localhost:8000 with graceful fallback handling.
 */

import {
  chatWithGridAdvisor,
  checkRagHealth,
  getRagApiBase,
  type RagChatResponse,
  type RagChatSource,
} from "./ragApi";

// Import lazily to avoid a circular dependency (authSession imports API_BASE from here)
function _getAuthHeaders(): Record<string, string> {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("voltra_operator_session") : null;
    if (!raw) return {};
    const session = JSON.parse(raw);
    const token = session?.sessionToken;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

// ─── Incident Reporting Types (POST /events/report) ──────────────────────────

export interface EventReportRequest {
  zone_name: string;
  event_description: string;
  reporter_note?: string;
  reporter_type: "citizen" | "field_technician" | "municipal_dispatcher";
}

export interface EventReportResponse {
  status: "accepted" | "rejected";
  incident_id?: string;
  category?: string;
  risk_multiplier?: number;
  disclaimer?: string;
  /** Only present on rejection */
  matched_pattern?: string;
  message: string;
}

export function getApiBase(): string {
  if (import.meta.env.VITE_API_BASE) {
    return (import.meta.env.VITE_API_BASE as string).replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    // Local dev: if frontend is on Vite dev ports (5173/3000/3001), target FastAPI on 8000
    if (isLocal && (window.location.port === "5173" || window.location.port === "3000" || window.location.port === "3001")) {
      return "http://localhost:8000";
    }
    // Production / Railway: target current origin
    return window.location.origin;
  }
  return "http://localhost:8000";
}

export const API_BASE = getApiBase();

export interface RankedAsset {
  rank: number;
  asset_id: string;
  substation_name?: string;
  grid_zone?: string;
  criticality_tier?: string;
  /** Normalised from health_index_score by backend /api/ranked */
  health_index: number;
  RUL_days: number;
  fault_type: string;
  /** Normalised from fault_confidence by backend */
  fault_prob?: number;
  risk_tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  composite_score: number;
  mva_rating?: number;
  voltage_kv?: string;
  customer_count_served?: number;
  /** Normalised from top3_shap_features by backend */
  top_3_shap?: [string, number][];
  archetype?: string;
  core_temp_c?: number;
  load_pct?: number;
  current_load_mw?: number;
}

export interface RankedResponse {
  count: number;
  weights: {
    health_index: number;
    rul: number;
    fault_severity: number;
    mva_rating: number;
    incident_history: number;
  };
  ranked_assets: RankedAsset[];
}

export interface AssetDetailResponse {
  asset_id: string;
  /** Normalised from health_index_score by backend /api/asset/{id} */
  health_index: number;
  RUL_days: number;
  risk_tier: string;
  fault_type: string;
  /** Normalised from fault_confidence (0–1 fraction) by backend */
  fault_prob: number;
  fault_probabilities?: Record<string, number>;
  /** Normalised from top3_shap_features by backend */
  top_3_shap: [string, number][];
  /** Raw sensor readings from the latest timeseries snapshot — used to pre-fill predict sliders */
  sensor_readings?: {
    Hydrogen?: number;
    Methane?: number;
    Acethylene?: number;
    Ethylene?: number;
    Ethane?: number;
    CO?: number;
    CO2?: number;
    "Dielectric rigidity"?: number;
    top_oil_temp_c?: number;
    load_pct?: number;
    [key: string]: number | null | undefined;
  };
  advisory_text: string;
  /** "ibm_bob_llm" when Anthropic key present, "deterministic_fallback" otherwise */
  advisory_source: "ibm_bob_llm" | "deterministic_fallback";
  registry?: {
    asset_id?: string;
    substation_name?: string;
    grid_zone?: string;
    rated_mva?: number;
    voltage_kv?: string;
    age_years?: number;
    manufacturer?: string;
    customer_count_served?: number;
    criticality?: string;
    criticality_tier?: string;
    critical_infrastructure_nearby?: string;
    degradation_profile?: string;
    [key: string]: unknown;
  };
  composite_score?: number;
  rank?: number;
}

export interface TimeseriesPoint {
  day: number;
  date: string;
  asset_id: string;
  Hydrogen: number;
  Methane: number;
  Acethylene: number;
  Ethylene: number;
  Ethane: number;
  top_oil_temp_c?: number;
  temperature?: number;
  vibration?: number;
  load_pct?: number;
  load_percentage?: number;
  "Health index"?: number;
  health_index?: number;
  RUL_days?: number;
  rul_days?: number;
  fault_mode?: string;
  degradation_status?: string;
}

export interface TimeseriesResponse {
  asset_id: string;
  days: number;
  timeseries: TimeseriesPoint[];
}

export interface MaintenanceAction {
  rank: number;
  asset_id: string;
  substation_name: string;
  grid_zone: string;
  risk_tier: string;
  fault_type: string;
  action_code: string;
  short_action: string;
  detail: string;
  urgency_window: string;
  crew_assignment: string;
  crew_conflict: boolean;
  sequencing_note?: string;
  advisory_summary?: string;
}

export interface MaintenancePlanResponse {
  generated_date?: string;
  total_actions?: number;
  top_10_actions: MaintenanceAction[];
  crew_schedule: Record<string, unknown>;
  tx115_narrative: {
    asset_id: string;
    story: string;
    degradation_peak: string;
    intervention: string;
    recovery_outcome: string;
    rul_recovered_days: number;
  };
}

export interface AdhocScoreRequest {
  asset_id?: string;
  Hydrogen?: number;
  Oxigen?: number;
  Nitrogen?: number;
  Methane?: number;
  CO?: number;
  CO2?: number;
  Ethylene?: number;
  Ethane?: number;
  Acethylene?: number;
  DBDS?: number;
  Power_factor?: number;
  Interfacial_V?: number;
  Dielectric_rigidity?: number;
  Water_content?: number;
  top_oil_temp_c?: number;
  generate_advisory?: boolean;
}

export interface AdhocScoreResponse {
  asset_id: string;
  /** Normalised from health_index_score by backend /api/score */
  health_index: number;
  RUL_days: number;
  risk_tier: string;
  fault_type: string;
  /** Normalised from fault_confidence (0–1) by backend */
  fault_prob: number;
  fault_probabilities?: Record<string, number>;
  /** Normalised from top3_shap_features by backend */
  top_3_shap: [string, number][];
  advisory_text?: string;
  advisory_source?: "ibm_bob_llm" | "deterministic_fallback";
}

async function requestWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  // Merge auth headers into every outgoing request
  const authHeaders = _getAuthHeaders();
  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers as Record<string, string> | undefined),
    },
    signal: controller.signal,
  };
  try {
    const res = await fetch(url, mergedOptions);
    clearTimeout(id);
    // If server returns 401 the token is expired — clear session so UI re-directs to login
    if (res.status === 401) {
      try { localStorage.removeItem("voltra_operator_session"); } catch {}
    }
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export const techtonicsApi = {
  async checkHealth(): Promise<{ live: boolean; message: string }> {
    try {
      const res = await requestWithTimeout(`${API_BASE}/health`, {}, 2000);
      if (res.ok) {
        const data = await res.json();
        return {
          live: true,
          message: `FastAPI online · Models loaded: ${data.models_loaded ?? true}`,
        };
      }
      return { live: false, message: `FastAPI returned HTTP ${res.status}` };
    } catch {
      return {
        live: false,
        message: "FastAPI offline (run: uvicorn src.backend.main:app --port 8000)",
      };
    }
  },

  async getRanked(): Promise<RankedResponse> {
    const res = await requestWithTimeout(`${API_BASE}/api/ranked`);
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/ranked`);
    return res.json();
  },

  async getAssetDetail(assetId: string, generateAdvisory = true): Promise<AssetDetailResponse> {
    const res = await requestWithTimeout(
      `${API_BASE}/api/asset/${encodeURIComponent(assetId)}?generate_advisory=${generateAdvisory}`,
      {},
      8000,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/asset/${assetId}`);
    return res.json();
  },

  async getTimeseries(assetId: string): Promise<TimeseriesResponse> {
    const res = await requestWithTimeout(
      `${API_BASE}/api/timeseries/${encodeURIComponent(assetId)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/timeseries/${assetId}`);
    return res.json();
  },

  async getPlan(): Promise<MaintenancePlanResponse> {
    const res = await requestWithTimeout(`${API_BASE}/api/plan`);
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/plan`);
    return res.json();
  },

  async scoreAdhoc(reading: AdhocScoreRequest): Promise<AdhocScoreResponse> {
    const res = await requestWithTimeout(
      `${API_BASE}/api/score`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reading),
      },
      10000,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/score`);
    return res.json();
  },

  /**
   * POST /events/report
   * Submit a community or field-technician ground-hazard report.
   * The backend applies a second-pass injection filter, saves accepted events
   * to user_reported_events.csv and rejected attempts to rejected_submissions_log.csv.
   */
  async reportEvent(report: EventReportRequest): Promise<EventReportResponse> {
    const res = await requestWithTimeout(
      `${API_BASE}/events/report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      },
      6000,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} from /events/report`);
    return res.json();
  },

  /**
   * POST /api/groq-report
   * Generates live plain-English maintenance directives and trajectory forecasting using Groq LPU API.
   */
  async generateGroqReport(payload: {
    asset_id: string;
    health_index: number;
    rul_days: number;
    fault_type: string;
    ambient_temp_c: number;
    load_mw?: number;
    rated_mva?: number;
    substation?: string;
    c2h2_ppm?: number;
    ch4_ppm?: number;
    h2_ppm?: number;
  }): Promise<{
    status: string;
    provider: string;
    asset_id: string;
    executive_summary: string;
    thermal_analysis: string;
    weather_correlation: string;
    trajectory_forecast?: string;
    recommended_actions: Array<{
      priority: "HIGH" | "MEDIUM" | "LOW";
      action: string;
      impact: string;
      timeline: string;
    }>;
  }> {
    const res = await requestWithTimeout(`${API_BASE}/api/groq-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 15000);
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/groq-report`);
    return res.json();
  },

  /**
   * POST /api/events/search
   * Semantic geospatial area hazard search & dynamic risk multiplier retrieval powered by Google Gemini 3.6 Flash.
   */
  async searchPastEvents(query = "", zone = ""): Promise<{
    status: string;
    provider?: string;
    query?: string;
    zone?: string;
    search_area?: string;
    threat_severity?: "CRITICAL" | "ELEVATED" | "NOMINAL";
    total_matched: number;
    active_risk_multiplier: number;
    geospatial_summary?: string;
    affected_assets?: string[];
    cascading_risk_assessment?: string;
    containment_protocols?: string[];
    events: Array<{
      incident_id: string;
      received_at: string;
      zone_name: string;
      event_description: string;
      category: string;
      risk_multiplier: string;
      disclaimer: string;
    }>;
  }> {
    const res = await requestWithTimeout(`${API_BASE}/api/events/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, zone }),
    }, 12000);
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/events/search`);
    return res.json();
  },

  /**
   * GET /api/weather/live
   * Fetches real-time weather from Open-Meteo for coordinates and returns thermal stress index.
   */
  async fetchLiveWeather(lat = 22.56, lon = 72.95): Promise<{
    status: string;
    latitude: number;
    longitude: number;
    temperature_c: number;
    humidity_pct: number;
    wind_speed_kmh: number;
    thermal_stress_pct: number;
    cooling_efficiency_pct: number;
    forecast_24h: Array<{ time: string; temp: number; hour: number }>;
  }> {
    const res = await requestWithTimeout(`${API_BASE}/api/weather/live?lat=${lat}&lon=${lon}`, {}, 6000);
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/weather/live`);
    return res.json();
  },

  /**
   * GET /api/events/stats
   * Returns real-time security pipeline counts from actual event files.
   */
  async getEventStats(): Promise<{
    processed: number;
    verified: number;
    quarantined: number;
    blocked: number;
  }> {
    const res = await requestWithTimeout(`${API_BASE}/api/events/stats`, {}, 4000);
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/events/stats`);
    return res.json();
  },

  /**
   * POST /api/score/csv
   * Upload a CSV of sensor readings → ML pipeline → scored results.
   */
  async scoreCSV(file: File): Promise<CsvScoreResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const authHeaders = _getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/score/csv`, {
      method: "POST",
      headers: { ...authHeaders },   // do NOT set Content-Type — browser does multipart boundary
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.detail ?? `HTTP ${res.status} from /api/score/csv`);
    }
    return res.json();
  },

  /** GET /api/sample/csv — returns the URL to trigger a browser download */
  getSampleCsvUrl(): string {
    return `${API_BASE}/api/sample/csv`;
  },

  /** GET /api/blackout/estimate/{asset_id} */
  async getBlackoutEstimate(assetId: string): Promise<BlackoutEstimateResponse> {
    const authHeaders = _getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/blackout/estimate/${encodeURIComponent(assetId)}`, {
      headers: { ...authHeaders },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching blackout estimate for ${assetId}`);
    }
    return res.json();
  },

  /** GET /api/blackout/permit */
  async getContractorPermit(): Promise<ContractorPermitState> {
    const authHeaders = _getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/blackout/permit`, {
      headers: { ...authHeaders },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching contractor permit`);
    }
    return res.json();
  },

  /** POST /api/blackout/permit */
  async updateContractorPermit(permitted: boolean, authorizedBy?: string): Promise<ContractorPermitState> {
    const authHeaders = _getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/blackout/permit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ permitted, authorized_by: authorizedBy }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} updating contractor permit`);
    }
    return res.json();
  },

  /** POST /api/blackout/broadcast-sms */
  async broadcastOutageSms(assetId: string): Promise<SmsBroadcastResponse> {
    const authHeaders = _getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/blackout/broadcast-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ asset_id: assetId }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.detail || `HTTP ${res.status} broadcasting SMS`);
    }
    return res.json();
  },

  /** POST /api/blackout/send-single-sms */
  async sendSingleConsumerSms(params: {
    consumer_id: string;
    consumer_name: string;
    mobile_number: string;
    category: string;
    asset_id: string;
    address_area?: string;
  }): Promise<{ status: string; dispatch: SmsDispatchRecord; message: string }> {
    const authHeaders = _getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/blackout/send-single-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.detail || `HTTP ${res.status} dispatching SMS`);
    }
    return res.json();
  },

  /** GET /api/blackout/sms-logs */
  async getSmsLogs(): Promise<SmsLogsResponse> {
    const authHeaders = _getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/blackout/sms-logs`, {
      headers: { ...authHeaders },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching SMS logs`);
    }
    return res.json();
  },

  /** GET /api/blackout/consumers/{asset_id} */
  async getFeederConsumers(assetId: string): Promise<FeederConsumersResponse> {
    const authHeaders = _getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/blackout/consumers/${encodeURIComponent(assetId)}`, {
      headers: { ...authHeaders },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching feeder consumers for ${assetId}`);
    }
    return res.json();
  },

  /** GET /api/blackout/consumers/{asset_id}/csv — returns direct download URL */
  getFeederConsumerCsvUrl(assetId: string): string {
    return `${API_BASE}/api/blackout/consumers/${encodeURIComponent(assetId)}/csv`;
  },

  /** GET /api/blackout/consumers/sample-template — returns direct sample template CSV URL */
  getSampleConsumerCsvUrl(): string {
    return `${API_BASE}/api/blackout/consumers/sample-template`;
  },

  /** POST /api/blackout/consumers/upload */
  async uploadFeederConsumersCsv(file: File, defaultAssetId: string = "TX-107"): Promise<{ status: string; message: string; uploaded_count: number; consumers: FeederConsumerRecord[] }> {
    const formData = new FormData();
    formData.append("file", file);
    const authHeaders = _getAuthHeaders();
    
    // Remove Content-Type header if present so browser sets boundary for multipart
    const headers = { ...authHeaders };
    delete headers["Content-Type"];

    const res = await fetch(`${API_BASE}/api/blackout/consumers/upload?default_asset_id=${encodeURIComponent(defaultAssetId)}`, {
      method: "POST",
      headers,
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} uploading consumer CSV: ${errText}`);
    }
    return res.json();
  },

  /** GET /api/stream/assets */
  async getStreamAssets(): Promise<{ assets: StreamAssetMetadata[] }> {
    const res = await fetch(`${API_BASE}/api/stream/assets`, {
      headers: _getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching streaming assets`);
    return res.json();
  },

  /** GET /api/stream/tick/{asset_id}/{day} */
  async getStreamTick(assetId: string, day: number): Promise<StreamTickResponse> {
    const res = await fetch(`${API_BASE}/api/stream/tick/${encodeURIComponent(assetId)}/${day}`, {
      headers: _getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching stream tick for ${assetId} day ${day}`);
    return res.json();
  },

  /** GET /api/stream/history/{asset_id}?up_to_day={upToDay} */
  async getStreamHistory(assetId: string, upToDay: number = 89): Promise<StreamHistoryResponse> {
    const res = await fetch(`${API_BASE}/api/stream/history/${encodeURIComponent(assetId)}?up_to_day=${upToDay}`, {
      headers: _getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching stream history for ${assetId}`);
    return res.json();
  },

  /** RAG Chatbot Integration: chatWithGridAdvisor */
  chatWithGridAdvisor,
  checkRagHealth,
  getRagApiBase,
};

export {
  chatWithGridAdvisor,
  checkRagHealth,
  getRagApiBase,
  type RagChatResponse,
  type RagChatSource,
};

// ─── CSV scoring types ────────────────────────────────────────────────────────

export interface CsvScoreRow {
  row: number;
  asset_id: string;
  health_index: number;
  RUL_days: number;
  risk_tier: string;
  fault_type: string;
  fault_prob: number;
  fault_probabilities?: Record<string, number>;
  top_3_shap?: [string, number][];
  advisory_text?: string;
}

export interface CsvScoreResponse {
  status: string;
  total_rows: number;
  scored: number;
  errors: number;
  error_details: Array<{ row: number; asset_id: string; error: string }>;
  results: CsvScoreRow[];
}

// ─── Blackout Estimator & Contractor SMS Dispatch Types ────────────────────────

export interface BlackoutEstimateResponse {
  asset_id: string;
  substation: string;
  voltage_kv: string;
  health_index: number;
  fault_type: string;
  blackout_probability_pct: number;
  predicted_outage_time: string;
  time_to_failure_hours: number;
  estimated_time_to_restore_mins: number;
  current_load_mw: number;
  mva_rating: number;
  affected_households: number;
  estimated_residents: number;
  critical_facilities: string[];
  contractor_permitted: boolean;
  recommended_action: string;
}

export interface ContractorPermitState {
  permitted: boolean;
  authorized_by?: string;
  updated_at: string;
}

export interface SmsDispatchRecord {
  dispatch_id: string;
  asset_id: string;
  substation: string;
  affected_households: number;
  predicted_outage_time: string;
  etr_mins: number;
  sms_preview: string;
  status: string;
  delivered_pct: number;
  authorized_by: string;
  timestamp: string;
}

export interface SmsBroadcastResponse {
  status: string;
  dispatch: SmsDispatchRecord;
  message: string;
}

export interface SmsLogsResponse {
  logs: SmsDispatchRecord[];
  total: number;
}

export interface FeederConsumerRecord {
  consumer_id: string;
  asset_id: string;
  substation: string;
  feeder_line: string;
  consumer_name: string;
  category: string;
  mobile_number: string;
  address_area: string;
  peak_load_kw: number;
  sms_alert_status: string;
}

export interface FeederConsumersResponse {
  asset_id: string;
  substation: string;
  total_feeder_households: number;
  sample_consumers_count: number;
  consumers: FeederConsumerRecord[];
  csv_download_url: string;
}

// ─── Real-Time Telemetry Streaming & On-the-Fly ML Inference Types ─────────
export interface StreamAssetMetadata {
  asset_id: string;
  substation: string;
  voltage_kv: string;
  mva_rating: number;
  feeder_line: string;
  phenomenon: string;
  color: string;
}

export interface StreamSensorTelemetry {
  hydrogen: number;
  oxygen: number;
  nitrogen: number;
  methane: number;
  co: number;
  co2: number;
  ethylene: number;
  ethane: number;
  acetylene: number;
  top_oil_temp_c: number;
  load_pct: number;
  vibration_g: number;
  dielectric_rigidity: number;
  water_content: number;
}

export interface StreamLiveMlOutput {
  health_index: number;
  risk_tier: string;
  rul_days: number;
  fault_type: string;
  fault_confidence_pct: number;
  all_fault_probs: Record<string, number>;
  blackout_probability_pct: number;
  etr_mins: number;
  ttf_hours: number;
  current_load_mw: number;
  affected_households: number;
}

export interface StreamTickResponse {
  asset_id: string;
  day: number;
  date: string;
  total_days: number;
  metadata: StreamAssetMetadata;
  sensor_telemetry: StreamSensorTelemetry;
  live_ml_output: StreamLiveMlOutput;
}

export interface StreamHistoryPoint {
  day: number;
  date: string;
  hydrogen: number;
  acetylene: number;
  methane: number;
  ethylene: number;
  co: number;
  top_oil_temp_c: number;
  load_pct: number;
  health_index: number;
}

export interface StreamHistoryResponse {
  asset_id: string;
  history: StreamHistoryPoint[];
  count: number;
}



