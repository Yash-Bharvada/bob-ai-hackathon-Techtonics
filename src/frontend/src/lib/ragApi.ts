/**
 * ragApi.ts
 * Dedicated client utility for the Standalone RAG Chatbot API.
 * Connects to the FastAPI service running at VITE_RAG_API_URL (default: http://localhost:8001).
 */

export interface RagChatSource {
  asset_id?: string;
  asset_type?: string;
  site_name?: string;
  date?: string;
  actual_kwh?: number;
  expected_kwh?: number;
  deviation_pct?: number;
  grid_load_mw?: number;
  weather?: string;
  relevance_score?: number;
  health_index?: number;
  fault_type?: string;
  rul_days?: number;
  risk_tier?: string;
  dga_status?: string;
  [key: string]: unknown;
}

export interface RagChatResponse {
  answer: string;
  sources: RagChatSource[];
}

export function getRagApiBase(): string {
  if (import.meta.env.VITE_RAG_API_URL) {
    return (import.meta.env.VITE_RAG_API_URL as string).replace(/\/$/, "");
  }
  return "http://localhost:8001";
}

/**
 * Check if the standalone RAG Chatbot FastAPI service is reachable.
 */
export async function checkRagHealth(signal?: AbortSignal): Promise<boolean> {
  const base = getRagApiBase();
  try {
    const timeoutSignal = signal || AbortSignal.timeout(3000);
    const res = await fetch(`${base}/health`, {
      method: "GET",
      signal: timeoutSignal,
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Send an inquiry to the RAG Chatbot API.
 * Sends POST /chat with { "message": message, "top_k": topK }
 */
export async function chatWithGridAdvisor(
  message: string,
  topK?: number,
  signal?: AbortSignal
): Promise<RagChatResponse> {
  const cleanMessage = message.trim();
  if (!cleanMessage) {
    throw new Error("Message cannot be empty.");
  }

  const base = getRagApiBase();
  const timeoutSignal = signal || AbortSignal.timeout(60000);

  const payload: { message: string; top_k?: number } = { message: cleanMessage };
  if (typeof topK === "number" && topK > 0) {
    payload.top_k = topK;
  }

  let res: Response;
  try {
    res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: timeoutSignal,
    });
  } catch (err: any) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      throw new Error("The request timed out. Please try again.");
    }
    throw new Error("Voltrics AI is currently unavailable. Please try again.");
  }

  if (!res.ok) {
    let errorDetail = "";
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || "";
    } catch {
      // Ignore body parsing failure
    }
    // Clean user-safe error message, avoid leaking internal URLs or secrets
    if (res.status === 503) {
      throw new Error(errorDetail || "RAG retrieval or inference service is temporarily unavailable.");
    }
    throw new Error(errorDetail || "Voltrics AI is currently unavailable. Please try again.");
  }

  return res.json();
}

export interface IngestResponse {
  status: string;
  filename: string;
  documents_indexed: number;
  assets: string[];
  dates: string[];
  message: string;
}

/**
 * Upload and ingest a custom operational telemetry CSV into Qdrant Cloud.
 * Sends POST /ingest/csv as multipart/form-data.
 */
export async function ingestCsvFile(
  file: File,
  recreate: boolean = false,
  signal?: AbortSignal
): Promise<IngestResponse> {
  const base = getRagApiBase();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("recreate", String(recreate));

  const timeoutSignal = signal || AbortSignal.timeout(90000);
  let res: Response;
  try {
    res = await fetch(`${base}/ingest/csv`, {
      method: "POST",
      body: formData,
      signal: timeoutSignal,
    });
  } catch (err: any) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      throw new Error("CSV ingestion timed out. The file may be too large.");
    }
    throw new Error("Unable to connect to RAG Ingestion Service.");
  }

  if (!res.ok) {
    let errorDetail = "";
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || "";
    } catch {}
    throw new Error(errorDetail || `HTTP ${res.status}: CSV ingestion failed.`);
  }

  return res.json();
}
