/**
 * incidentReport.ts
 * Community Incident Reporting — Cybersecurity Defense Layer
 *
 * Architecture (per context.md Feature 2):
 *  1. Deterministic prompt-injection regex filter (first-pass, synchronous)
 *  2. Closed-category classification for clean submissions
 *  3. Bounded risk multiplier cap (max 1.25×, never lowers risk tier)
 *  4. Audit trail helpers — accepted → user_reported_events.csv
 *                           rejected → rejected_submissions_log.csv
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type HazardCategory =
  | "excavation"
  | "storm_damage"
  | "wildfire"
  | "collision"
  | "explosion"
  | "grid_incident"
  | "other";

export interface IncidentReportPayload {
  zone_name: string;
  event_description: string;
  reporter_note?: string;
  reporter_type: "citizen" | "field_technician" | "municipal_dispatcher";
}

export interface AcceptedIncidentRecord extends IncidentReportPayload {
  incident_id: string;
  received_at: string; // ISO-8601
  category: HazardCategory;
  risk_multiplier: number; // 1.00 – 1.25
  disclaimer: "Unverified — user reported";
}

export interface RejectedSubmissionRecord {
  incident_id: string;
  received_at: string;
  zone_name: string;
  matched_pattern: string;
  raw_description_excerpt: string; // first 80 chars only — no full payload stored
  reporter_type: string;
}

export type FilterResult = { blocked: true; matched_pattern: string } | { blocked: false };

export type ReportResult =
  | { status: "accepted"; record: AcceptedIncidentRecord }
  | { status: "rejected"; reason: string; matched_pattern: string };

// ─── Prompt-Injection Pattern Catalogue ──────────────────────────────────────

/**
 * Deterministic first-pass regex patterns.
 * If any pattern fires, the submission is immediately quarantined.
 * Never reaches any model or asset database.
 */
const INJECTION_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "ignore_previous_instructions", re: /ignore\s+previous\s+instructions?/i },
  { label: "system_prompt_override", re: /system\s+prompt\s*(override|:)/i },
  { label: "you_are_now", re: /you\s+are\s+now\b/i },
  { label: "disregard_all", re: /disregard\s+all\b/i },
  { label: "override_keyword", re: /\boverride\b.*\b(safe|healthy|pristine|alert|alarm)\b/i },
  { label: "jailbreak", re: /\bjailbreak\b/i },
  { label: "dan_mode", re: /\bDAN\s+mode\b/i },
  { label: "mark_as_safe", re: /mark\s+(all\s+)?transformers?\s+(as\s+)?(safe|healthy|pristine)/i },
  { label: "suppress_alerts", re: /suppress\s+(all\s+)?(alerts?|alarms?|warnings?)/i },
  { label: "disregard_arcing", re: /disregard\s+(all\s+)?arc(ing)?\s+alerts?/i },
  { label: "act_as", re: /\bact\s+as\b/i },
  { label: "new_instructions", re: /new\s+(instructions?|directive)/i },
  { label: "forget_previous", re: /forget\s+(all\s+)?(previous|prior|earlier)/i },
];

// ─── Closed-Category Classifier ──────────────────────────────────────────────

const CATEGORY_RULES: { category: HazardCategory; keywords: RegExp }[] = [
  {
    category: "excavation",
    keywords: /\b(excavat|backhoe|dig(ger|ging)?|trench|drill(ing)?|bore)\b/i,
  },
  {
    category: "wildfire",
    keywords: /\b(fire|wildfire|grass\s+fire|blaze|burn(ing)?|flame|smoke)\b/i,
  },
  {
    category: "storm_damage",
    keywords: /\b(storm|lightning|thunder|flood|wind|tree|fallen|debris|hail)\b/i,
  },
  { category: "explosion", keywords: /\b(explos(ion|ive)?|blast|boom|bang)\b/i },
  { category: "collision", keywords: /\b(collision|crash|vehicle|truck|car|hit|struck)\b/i },
  {
    category: "grid_incident",
    keywords:
      /\b(spark(ing|s)?|humm(ing)?|arc(ing)?|flash|bushing|transformers?|cable|conductor|wire)\b/i,
  },
];

function classifyCategory(text: string): HazardCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(text)) return rule.category;
  }
  return "other";
}

// ─── Risk Multiplier (Bounded, Fail-Safe) ────────────────────────────────────

const CATEGORY_MULTIPLIERS: Record<HazardCategory, number> = {
  excavation: 1.2,
  wildfire: 1.25, // max allowed
  explosion: 1.25,
  collision: 1.15,
  storm_damage: 1.1,
  grid_incident: 1.18,
  other: 1.05,
};

/**
 * Returns a supplementary risk multiplier bounded to [1.00, 1.25].
 * A community report can NEVER lower a risk tier or override sensor data.
 */
export function getBoundedRiskMultiplier(category: HazardCategory): number {
  const raw = CATEGORY_MULTIPLIERS[category] ?? 1.0;
  return Math.min(Math.max(raw, 1.0), 1.25);
}

// ─── Core Filter ─────────────────────────────────────────────────────────────

/**
 * Synchronous prompt-injection filter.
 * Returns { blocked: false } if clean, or { blocked: true, matched_pattern } if malicious.
 */
export function runInjectionFilter(payload: IncidentReportPayload): FilterResult {
  const textToScan = [
    payload.zone_name,
    payload.event_description,
    payload.reporter_note ?? "",
  ].join(" ");

  for (const { label, re } of INJECTION_PATTERNS) {
    if (re.test(textToScan)) {
      return { blocked: true, matched_pattern: label };
    }
  }
  return { blocked: false };
}

// ─── Unique ID helper ─────────────────────────────────────────────────────────

function generateIncidentId(): string {
  return `INC-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

// ─── Main Processing Entry Point ──────────────────────────────────────────────

/**
 * Process an incoming incident report through the full defense pipeline.
 * Returns a typed ReportResult — caller decides what to do with audit records.
 *
 * Fail-safe rules enforced here:
 *  • If blocked → quarantine record goes to rejected_submissions_log.csv (via backend)
 *  • If clean   → bounded multiplier applied, saved to user_reported_events.csv
 */
export function processIncidentReport(payload: IncidentReportPayload): ReportResult {
  const filterResult = runInjectionFilter(payload);

  if (filterResult.blocked) {
    const rejected: RejectedSubmissionRecord = {
      incident_id: generateIncidentId(),
      received_at: new Date().toISOString(),
      zone_name: payload.zone_name,
      matched_pattern: filterResult.matched_pattern,
      raw_description_excerpt: payload.event_description.slice(0, 80),
      reporter_type: payload.reporter_type,
    };
    return {
      status: "rejected",
      reason: "Prompt injection pattern detected — submission quarantined.",
      matched_pattern: filterResult.matched_pattern,
    };
  }

  const category = classifyCategory(payload.event_description);
  const risk_multiplier = getBoundedRiskMultiplier(category);

  const record: AcceptedIncidentRecord = {
    ...payload,
    incident_id: generateIncidentId(),
    received_at: new Date().toISOString(),
    category,
    risk_multiplier,
    disclaimer: "Unverified — user reported",
  };

  return { status: "accepted", record };
}
