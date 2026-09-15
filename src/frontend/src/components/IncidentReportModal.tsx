/**
 * IncidentReportModal.tsx
 *
 * Community Incident Reporting modal — Feature 2 (context.md).
 *
 * Security pipeline (all client-side, mirrored server-side):
 *  1. Prompt-injection regex filter before anything reaches the API
 *  2. Closed-category classification
 *  3. Bounded risk multiplier (max 1.25×, never lowers risk)
 *  4. Audit trail: accepted → user_reported_events.csv
 *                  rejected → rejected_submissions_log.csv  (via backend)
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  processIncidentReport,
  type HazardCategory,
  type IncidentReportPayload,
} from "@/lib/incidentReport";
import { techtonicsApi } from "@/lib/techtonicsApi";

// ─── Props ────────────────────────────────────────────────────────────────────

interface IncidentReportModalProps {
  /** Controlled visibility */
  open: boolean;
  onClose: () => void;
  /** Pre-populate zone from context (e.g. selected asset's substation) */
  defaultZone?: string;
}

// ─── Hazard category display labels ──────────────────────────────────────────

const CATEGORY_LABELS: Record<HazardCategory, string> = {
  excavation: "Excavation / Digging",
  wildfire: "Wildfire / Grass Fire",
  storm_damage: "Storm Damage / Fallen Tree",
  collision: "Vehicle Collision",
  explosion: "Explosion / Blast",
  grid_incident: "Sparking / Arcing / Humming",
  other: "Other Ground Hazard",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function IncidentReportModal({ open, onClose, defaultZone = "" }: IncidentReportModalProps) {
  const [zoneName, setZoneName] = useState(defaultZone);
  const [description, setDescription] = useState("");
  const [reporterNote, setReporterNote] = useState("");
  const [reporterType, setReporterType] =
    useState<IncidentReportPayload["reporter_type"]>("citizen");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { phase: "accepted"; incidentId: string; category: string; multiplier: number }
    | { phase: "rejected"; matchedPattern: string }
    | null
  >(null);

  if (!open) return null;

  const resetAndClose = () => {
    setZoneName(defaultZone);
    setDescription("");
    setReporterNote("");
    setReporterType("citizen");
    setResult(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim() || !description.trim()) {
      toast.error("Zone name and event description are required.");
      return;
    }

    setSubmitting(true);

    const payload: IncidentReportPayload = {
      zone_name: zoneName.trim(),
      event_description: description.trim(),
      reporter_note: reporterNote.trim() || undefined,
      reporter_type: reporterType,
    };

    // ── Step 1: Client-side injection filter (instant, no API call) ───────────
    const clientResult = processIncidentReport(payload);

    if (clientResult.status === "rejected") {
      setResult({
        phase: "rejected",
        matchedPattern: clientResult.matched_pattern,
      });
      setSubmitting(false);
      toast.error("Submission blocked — potential injection attack detected.");
      // Still fire the backend so it can log to rejected_submissions_log.csv
      techtonicsApi.reportEvent(payload).catch(() => {
        /* best-effort */
      });
      return;
    }

    // ── Step 2: Send clean payload to backend POST /events/report ─────────────
    try {
      const apiResult = await techtonicsApi.reportEvent(payload);
      setResult({
        phase: "accepted",
        incidentId: apiResult.incident_id ?? clientResult.record.incident_id,
        category: CATEGORY_LABELS[clientResult.record.category],
        multiplier: clientResult.record.risk_multiplier,
      });
      toast.success("Incident report submitted and logged.");
    } catch {
      // Backend offline — accept locally (client-side record is valid)
      setResult({
        phase: "accepted",
        incidentId: clientResult.record.incident_id,
        category: CATEGORY_LABELS[clientResult.record.category],
        multiplier: clientResult.record.risk_multiplier,
      });
      toast.info("Backend offline — report recorded locally (demo mode).");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-black/65 backdrop-blur-md p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && resetAndClose()}
    >
      {/* Panel */}
      <div className="relative my-auto w-full max-w-lg rounded-[2rem] border border-border/70 bg-card shadow-2xl">

        {/* Close button */}
        <button
          type="button"
          onClick={resetAndClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted text-muted-foreground"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="border-b border-border/50 px-6 py-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-signal" />
            <h2 className="font-sans text-lg font-bold text-foreground">Report Ground Hazard</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Submit a physical hazard near a substation or cable corridor. Reports are
            injection-filtered, classified, and logged for field crew dispatch.
            <span className="ml-1 font-semibold text-warning">
              Cannot override sensor data or lower risk tiers.
            </span>
          </p>
        </div>

        {/* Accepted result panel */}
        {result?.phase === "accepted" && (
          <div className="m-6 rounded-2xl border border-signal/40 bg-signal/10 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-signal" />
              <p className="font-semibold text-signal">Report Accepted & Logged</p>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-foreground font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Incident ID</span>
                <span className="font-bold">{result.incidentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span>{result.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Multiplier</span>
                <span className="text-warning font-bold">{result.multiplier.toFixed(2)}×</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disclaimer</span>
                <span className="text-muted-foreground italic">Unverified — user reported</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CSV Log</span>
                <span>user_reported_events.csv</span>
              </div>
            </div>
            <Button
              onClick={resetAndClose}
              className="pill mt-4 w-full bg-signal text-xs font-semibold text-signal-foreground hover:bg-signal/90"
            >
              Done
            </Button>
          </div>
        )}

        {/* Rejected result panel */}
        {result?.phase === "rejected" && (
          <div className="m-6 rounded-2xl border border-danger/50 bg-danger/10 p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-danger" />
              <p className="font-semibold text-danger">Submission Blocked</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground">
              Your submission contained a pattern consistent with a{" "}
              <strong>prompt injection attack</strong>. The text was not processed and has been
              quarantined.
            </p>
            <div className="mt-3 rounded-xl bg-danger/10 px-4 py-2 text-xs font-mono">
              <span className="text-muted-foreground">Pattern matched: </span>
              <span className="font-bold text-danger">{result.matchedPattern}</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Attempt logged to <span className="font-mono">rejected_submissions_log.csv</span> for
              forensic review.
            </div>
            <Button
              onClick={resetAndClose}
              variant="outline"
              className="pill mt-4 w-full text-xs border-border/70"
            >
              Close
            </Button>
          </div>
        )}

        {/* Form — only shown before submission result */}
        {!result && (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {/* Zone Name */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Grid Zone / Substation Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g. GIDC Industrial Phase-2, Borsad Substation"
                className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-signal"
                required
                maxLength={100}
              />
            </div>

            {/* Event Description */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Event Description <span className="text-danger">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Construction backhoe struck an underground cable trench near the north fence."
                rows={3}
                className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-signal resize-none"
                required
                maxLength={500}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                {description.length}/500 characters
              </p>
            </div>

            {/* Reporter Note (optional) */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Additional Notes{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={reporterNote}
                onChange={(e) => setReporterNote(e.target.value)}
                placeholder="e.g. Smoke visible, crew already on-site"
                className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-signal"
                maxLength={200}
              />
            </div>

            {/* Reporter Type */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Reporter Type
              </label>
              <select
                value={reporterType}
                onChange={(e) =>
                  setReporterType(e.target.value as IncidentReportPayload["reporter_type"])
                }
                className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-signal"
              >
                <option value="citizen">Citizen / Public</option>
                <option value="field_technician">Field Technician</option>
                <option value="municipal_dispatcher">Municipal Dispatcher</option>
              </select>
            </div>

            {/* Security notice */}
            <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-[11px] text-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0 text-warning" />
              <span>
                All submissions pass a <strong>prompt-injection filter</strong> before processing.
                Reports can raise awareness but <strong>cannot override sensor data</strong> or
                lower existing risk tiers. Risk influence is bounded at <strong>1.25×</strong>.
              </span>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || !zoneName.trim() || !description.trim()}
              className="pill w-full bg-signal text-xs font-semibold text-signal-foreground hover:bg-signal/90 shadow-glass"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Running security filter & submitting…
                </>
              ) : (
                <>
                  <ShieldCheck className="size-3.5 mr-1.5" />
                  Submit Hazard Report
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
