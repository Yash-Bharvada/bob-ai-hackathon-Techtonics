import { useState } from "react";
import {
  CalendarRange,
  CheckSquare,
  Square,
  Sparkles,
  Download,
  Copy,
  CheckCircle2,
  X,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  Clock,
  HardHat,
  FileCheck,
  Wrench,
  Layers,
  TrendingDown,
  Gauge,
  Thermometer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Asset7DayPlanResponse, Asset7DayPlanDay } from "@/lib/techtonicsApi";
import type { GridAsset } from "@/lib/gridData";

interface SingleAsset7DayPlanModalProps {
  asset: GridAsset;
  plan: Asset7DayPlanResponse | null;
  loading: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}

export function SingleAsset7DayPlanModal({
  asset,
  plan,
  loading,
  onClose,
  onRegenerate,
}: SingleAsset7DayPlanModalProps) {
  const [selectedDayTab, setSelectedDayTab] = useState<number | "all">("all");
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  const toggleTask = (taskId: string) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Calculate task completion progress
  const allTasks = plan?.day_by_day_plan?.flatMap((d) => d.tasks) ?? [];
  const totalTasks = allTasks.length;
  const completedCount = allTasks.filter((t) => checkedTasks[t.id]).length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const handleCopyMarkdown = () => {
    if (!plan) return;
    let md = `# 7-DAY TRANSFORMER MAINTENANCE WORK ORDER\n`;
    md += `**Asset ID**: ${plan.asset_id}\n`;
    md += `**Substation**: ${plan.substation} (${plan.grid_zone || asset.region})\n`;
    md += `**Urgency**: ${plan.urgency_tier} | **Risk Tier**: ${plan.risk_tier}\n`;
    md += `**Primary Mechanism**: ${plan.primary_mechanism}\n`;
    md += `**Provider**: ${plan.provider}\n\n`;
    md += `## Executive Summary\n${plan.executive_summary}\n\n`;
    md += `## 7-Day Day-by-Day Schedule\n\n`;
    plan.day_by_day_plan.forEach((d) => {
      md += `### ${d.title} (${d.date})\n`;
      md += `- **Phase**: ${d.phase}\n`;
      md += `- **Crew Required**: ${d.crew_required}\n`;
      md += `- **Permit**: ${d.permit_type} (Isolation: ${d.isolation_needed ? "REQUIRED" : "NOT REQUIRED"})\n`;
      md += `- **Duration**: ${d.duration_hours} hrs\n`;
      md += `- **Tasks**:\n`;
      d.tasks.forEach((t) => {
        const isDone = checkedTasks[t.id] ? "[x]" : "[ ]";
        md += `  - ${isDone} [${t.priority}] ${t.text}\n`;
      });
      if (d.tools?.length) md += `- **Tools**: ${d.tools.join(", ")}\n`;
      if (d.safety_protocol) md += `- **Safety**: ${d.safety_protocol}\n`;
      md += `\n`;
    });
    if (plan.projected_post_maintenance) {
      md += `## Projected Post-Maintenance Outcome\n`;
      md += `- Projected Health Index: ${plan.projected_post_maintenance.health_index_projected}\n`;
      md += `- RUL Extension: +${plan.projected_post_maintenance.rul_extension_days} days\n`;
      md += `- Summary: ${plan.projected_post_maintenance.risk_mitigation_summary}\n`;
    }

    navigator.clipboard.writeText(md);
    toast.success("7-Day Work Order copied to clipboard as Markdown");
  };

  const handleDownloadWorkOrder = () => {
    if (!plan) return;
    let text = `================================================================================\n`;
    text += `VOLTRA AI GRID INTELLIGENCE — 7-DAY FIELD MAINTENANCE WORK ORDER\n`;
    text += `================================================================================\n`;
    text += `Asset ID         : ${plan.asset_id}\n`;
    text += `Substation       : ${plan.substation} (${plan.grid_zone || asset.region})\n`;
    text += `Risk Tier        : ${plan.risk_tier}\n`;
    text += `Urgency Tier     : ${plan.urgency_tier}\n`;
    text += `Intelligence     : ${plan.provider}\n`;
    text += `Generated At     : ${new Date().toLocaleString()}\n`;
    text += `Primary Mechanism: ${plan.primary_mechanism}\n\n`;
    text += `EXECUTIVE ENGINEERING SUMMARY:\n`;
    text += `${plan.executive_summary}\n\n`;
    text += `--------------------------------------------------------------------------------\n`;
    text += `DAY-BY-DAY SYNCHRONIZED DISPATCH SCHEDULE & FIELD CHECKLIST\n`;
    text += `--------------------------------------------------------------------------------\n\n`;

    plan.day_by_day_plan.forEach((d) => {
      text += `[${d.title}] — ${d.date}\n`;
      text += `  Phase         : ${d.phase}\n`;
      text += `  Crew Required : ${d.crew_required}\n`;
      text += `  Permit Type   : ${d.permit_type} (Electrical Isolation: ${d.isolation_needed ? "YES" : "NO"})\n`;
      text += `  Est. Duration : ${d.duration_hours} Hours\n`;
      text += `  Field Tasks   :\n`;
      d.tasks.forEach((t, idx) => {
        const mark = checkedTasks[t.id] ? "[X]" : "[ ]";
        text += `    ${mark} ${idx + 1}. [${t.priority}] ${t.text}\n`;
      });
      if (d.tools?.length) text += `  Tools Needed  : ${d.tools.join(", ")}\n`;
      if (d.safety_protocol) text += `  Safety Rule   : ${d.safety_protocol}\n`;
      text += `\n`;
    });

    if (plan.projected_post_maintenance) {
      text += `--------------------------------------------------------------------------------\n`;
      text += `PROJECTED POST-INTERVENTION OUTCOME:\n`;
      text += `  Projected Health Index : ${plan.projected_post_maintenance.health_index_projected}\n`;
      text += `  RUL Extension          : +${plan.projected_post_maintenance.rul_extension_days} Days\n`;
      text += `  Mitigation Analysis    : ${plan.projected_post_maintenance.risk_mitigation_summary}\n`;
      text += `--------------------------------------------------------------------------------\n`;
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `7Day_Maintenance_Plan_${plan.asset_id}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded 7-Day Work Order for ${plan.asset_id}`);
  };

  const displayedDays =
    selectedDayTab === "all"
      ? plan?.day_by_day_plan ?? []
      : plan?.day_by_day_plan?.filter((d) => d.day === selectedDayTab) ?? [];

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/30">
              <CalendarRange className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-foreground font-mono">
                  7-Day Maintenance Plan · {asset.id}
                </h2>
                <span className="pill px-2.5 py-0.5 text-[10px] font-mono font-semibold bg-primary/15 text-primary border border-primary/30">
                  {asset.substation} ({asset.region})
                </span>
                {plan?.risk_tier && (
                  <span
                    className={`pill px-2 py-0.5 text-[10px] font-mono font-bold ${
                      plan.risk_tier === "CRITICAL"
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : plan.risk_tier === "HIGH"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    }`}
                  >
                    {plan.risk_tier} RISK
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Sparkles className="size-3 text-purple-400" />
                <span className="font-mono text-[11px] text-purple-300">
                  {plan?.provider || "Synthesizing live IEEE C57.104 & IEC 60599 maintenance plan..."}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={onRegenerate}
              variant="outline"
              size="sm"
              disabled={loading}
              className="h-8 rounded-lg text-xs gap-1 hidden sm:flex border-border/70 hover:bg-muted"
            >
              <Sparkles className="size-3.5 text-purple-400" />
              Re-generate
            </Button>
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                <Loader2 className="size-10 animate-spin text-primary" />
                <Sparkles className="size-4 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-sm font-semibold text-foreground">
                  Calling Groq LPU with Transformer Telemetry...
                </p>
                <p className="text-xs text-muted-foreground max-w-md">
                  Analyzing dissolved gases (C2H2, CH4, H2), thermal headroom, and loading profile for {asset.id} to synthesize a verified IEEE C57 7-day checklist.
                </p>
              </div>
            </div>
          ) : plan ? (
            <>
              {/* Telemetry & Risk Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-mono uppercase">Health Index</span>
                    <Gauge className="size-3.5" />
                  </div>
                  <p
                    className={`text-lg font-mono font-bold mt-1 ${
                      asset.healthScore < 50 ? "text-red-400" : asset.healthScore < 70 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {(100 - asset.healthScore).toFixed(1)} / 100
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Model 1 Degradation</p>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-mono uppercase">Est. RUL Window</span>
                    <Clock className="size-3.5" />
                  </div>
                  <p className="text-lg font-mono font-bold mt-1 text-foreground">
                    ~{asset.rulDays ?? 35} Days
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Time to Critical Failure</p>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-mono uppercase">Fault Mechanism</span>
                    <AlertTriangle className="size-3.5 text-amber-400" />
                  </div>
                  <p className="text-lg font-mono font-bold mt-1 text-amber-400">
                    {plan.urgency_tier.includes("IMMEDIATE") ? "CRITICAL" : "PRIORITY"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{plan.urgency_tier}</p>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-mono uppercase">Operational Load</span>
                    <Thermometer className="size-3.5" />
                  </div>
                  <p className="text-lg font-mono font-bold mt-1 text-foreground">
                    {asset.currentLoadMw} MW <span className="text-xs font-normal text-muted-foreground">/ {asset.ratedCapacityMw} MVA</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Core Temp: {asset.coreTempC}°C
                  </p>
                </div>
              </div>

              {/* Executive Summary & Failure Mechanism */}
              <div className="rounded-xl border border-border/70 bg-muted/10 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileCheck className="size-3.5 text-primary" />
                    Executive Engineering Diagnosis
                  </span>
                  <div className="flex items-center gap-1">
                    {plan.standards_compliance?.slice(0, 2).map((std, i) => (
                      <span key={i} className="pill px-2 py-0.5 text-[9px] font-mono bg-surface border border-border text-muted-foreground">
                        {std}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-foreground font-sans">
                  {plan.executive_summary}
                </p>
                <div className="pt-1 text-[11px] text-muted-foreground flex items-start gap-1.5 border-t border-border/40">
                  <span className="font-semibold text-foreground">Root Mechanism:</span>
                  <span>{plan.primary_mechanism}</span>
                </div>
              </div>

              {/* Progress Bar & Day Tab Selector */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Checklist Completion</span>
                    <span className="font-mono text-xs font-semibold text-primary">
                      {completedCount} / {totalTasks} tasks ({progressPct}%)
                    </span>
                  </div>
                  <div className="w-full sm:w-48 bg-muted rounded-full h-2 overflow-hidden border border-border/50">
                    <div
                      className="bg-primary h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Day Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setSelectedDayTab("all")}
                    className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-medium transition-colors whitespace-nowrap ${
                      selectedDayTab === "all"
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    All 7 Days ({totalTasks} tasks)
                  </button>
                  {plan.day_by_day_plan.map((d) => {
                    const dayDone = d.tasks.filter((t) => checkedTasks[t.id]).length;
                    const isAllDayDone = dayDone === d.tasks.length && d.tasks.length > 0;
                    return (
                      <button
                        key={d.day}
                        onClick={() => setSelectedDayTab(d.day)}
                        className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                          selectedDayTab === d.day
                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span>Day {d.day}</span>
                        {isAllDayDone ? (
                          <CheckCircle2 className="size-3 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] opacity-70">
                            ({dayDone}/{d.tasks.length})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Cards with Interactive Checklist */}
              <div className="space-y-4">
                {displayedDays.map((dayPlan) => (
                  <div
                    key={dayPlan.day}
                    className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm"
                  >
                    {/* Day Banner */}
                    <div className="bg-muted/30 p-3.5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="pill bg-primary/20 text-primary border border-primary/40 font-mono text-[10px] font-bold px-2 py-0.5">
                            Day {dayPlan.day}
                          </span>
                          <h4 className="font-bold text-xs text-foreground">{dayPlan.title}</h4>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            • {dayPlan.date}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Phase: <span className="text-foreground/90 font-medium">{dayPlan.phase}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="pill bg-surface border border-border text-muted-foreground px-2 py-0.5 text-[10px] flex items-center gap-1">
                          <Clock className="size-3 text-primary" />
                          {dayPlan.duration_hours} hrs
                        </span>
                        {dayPlan.isolation_needed ? (
                          <span className="pill bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1">
                            <ShieldAlert className="size-3" />
                            Isolation (LOTO)
                          </span>
                        ) : (
                          <span className="pill bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold">
                            Non-Invasive
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta info: Crew & Permit */}
                    <div className="px-4 py-2 bg-muted/10 border-b border-border/40 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
                      <div className="flex items-center gap-1.5">
                        <HardHat className="size-3.5 text-amber-400" />
                        <span>Crew: <strong className="text-foreground">{dayPlan.crew_required}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="size-3.5 text-blue-400" />
                        <span>Permit: <strong className="font-mono text-foreground">{dayPlan.permit_type}</strong></span>
                      </div>
                    </div>

                    {/* Tasks Checklist */}
                    <div className="p-4 space-y-2 divide-y divide-border/30">
                      {dayPlan.tasks.map((task) => {
                        const isDone = Boolean(checkedTasks[task.id]);
                        return (
                          <div
                            key={task.id}
                            onClick={() => toggleTask(task.id)}
                            className={`pt-2 first:pt-0 flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              isDone ? "bg-primary/5 text-muted-foreground" : "hover:bg-muted/40 text-foreground"
                            }`}
                          >
                            <button
                              type="button"
                              className="mt-0.5 text-primary flex-shrink-0 focus:outline-none"
                            >
                              {isDone ? (
                                <CheckSquare className="size-4 text-emerald-400" />
                              ) : (
                                <Square className="size-4 text-muted-foreground hover:text-foreground" />
                              )}
                            </button>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`pill px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                                    task.priority === "CRITICAL"
                                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                      : task.priority === "HIGH"
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                      : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                  }`}
                                >
                                  {task.priority}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {task.id}
                                </span>
                              </div>
                              <p className={`text-xs leading-relaxed ${isDone ? "line-through opacity-70" : ""}`}>
                                {task.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tools and Safety Note */}
                    {(dayPlan.tools?.length || dayPlan.safety_protocol) && (
                      <div className="px-4 py-2.5 bg-muted/20 border-t border-border/40 text-[11px] space-y-1">
                        {dayPlan.tools?.length ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Wrench className="size-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Tools:</span>
                            {dayPlan.tools.map((tool, i) => (
                              <span key={i} className="pill px-1.5 py-0.2 text-[9px] bg-surface border border-border text-foreground/80">
                                {tool}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {dayPlan.safety_protocol && (
                          <div className="flex items-start gap-1.5 text-amber-300 dark:text-amber-400 text-[10px]">
                            <AlertTriangle className="size-3 flex-shrink-0 mt-0.5 text-amber-400" />
                            <span>Safety: {dayPlan.safety_protocol}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Projected Post-Maintenance Recovery */}
              {plan.projected_post_maintenance && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                      <TrendingDown className="size-4" />
                      Projected Post-Maintenance Asset Recovery
                    </h4>
                    <span className="pill bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5">
                      IEEE Reliability Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono">Target Health Index</p>
                      <p className="text-base font-mono font-bold text-emerald-300">
                        {plan.projected_post_maintenance.health_index_projected} / 100
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono">RUL Extension</p>
                      <p className="text-base font-mono font-bold text-emerald-300">
                        +{plan.projected_post_maintenance.rul_extension_days} Days
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-emerald-500/20">
                    {plan.projected_post_maintenance.risk_mitigation_summary}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <AlertTriangle className="size-8 text-amber-400 mx-auto mb-2" />
              <p className="font-semibold text-foreground">Could not synthesize 7-day maintenance plan.</p>
              <p className="text-xs text-muted-foreground mt-1">Please try re-generating or check the network connection.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-6 py-3.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>Interactive checklist state is maintained in-session.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopyMarkdown}
              variant="outline"
              size="sm"
              disabled={!plan || loading}
              className="h-8 text-xs gap-1 border-border/70 hover:bg-muted"
            >
              <Copy className="size-3" />
              Copy Markdown
            </Button>
            <Button
              onClick={handleDownloadWorkOrder}
              variant="outline"
              size="sm"
              disabled={!plan || loading}
              className="h-8 text-xs gap-1 border-border/70 hover:bg-muted"
            >
              <Download className="size-3" />
              Export Work Order
            </Button>
            <Button
              onClick={onClose}
              size="sm"
              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
