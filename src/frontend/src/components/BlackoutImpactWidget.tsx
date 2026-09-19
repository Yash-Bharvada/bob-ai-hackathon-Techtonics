import React, { useState, useEffect, useRef } from "react";
import {
  techtonicsApi,
  type BlackoutEstimateResponse,
  type ContractorPermitState,
  type SmsDispatchRecord,
  type FeederConsumerRecord,
  type FeederConsumersResponse,
} from "@/lib/techtonicsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Zap,
  AlertTriangle,
  Home,
  Users,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Send,
  Loader2,
  Building2,
  History,
  CheckCircle2,
  XCircle,
  Download,
  FileSpreadsheet,
  Search,
  Check,
  Upload,
  Eye,
  X,
  MessageSquare,
  Smartphone,
  Sparkles,
} from "lucide-react";

interface BlackoutImpactWidgetProps {
  assetId: string;
  substationName?: string;
  onSmsSent?: (dispatch: SmsDispatchRecord) => void;
}

export function BlackoutImpactWidget({
  assetId,
  substationName,
  onSmsSent,
}: BlackoutImpactWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [estimate, setEstimate] = useState<BlackoutEstimateResponse | null>(null);
  const [permit, setPermit] = useState<ContractorPermitState | null>(null);
  const [consumerData, setConsumerData] = useState<FeederConsumersResponse | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [updatingPermit, setUpdatingPermit] = useState(false);
  const [recentLogs, setRecentLogs] = useState<SmsDispatchRecord[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showConsumerTable, setShowConsumerTable] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchConsumer, setSearchConsumer] = useState<string>("");
  const [smsDispatchedMap, setSmsDispatchedMap] = useState<Record<string, boolean>>({});
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [showSmsPreviewModal, setShowSmsPreviewModal] = useState(false);
  const [sendingSingleId, setSendingSingleId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [estRes, permitRes, logsRes, consumerRes] = await Promise.all([
        techtonicsApi.getBlackoutEstimate(assetId),
        techtonicsApi.getContractorPermit(),
        techtonicsApi.getSmsLogs().catch(() => ({ logs: [], total: 0 })),
        techtonicsApi.getFeederConsumers(assetId).catch(() => null),
      ]);
      setEstimate(estRes);
      setPermit(permitRes);
      setRecentLogs(logsRes.logs || []);
      setConsumerData(consumerRes);
    } catch (err: any) {
      toast.error(err.message || "Failed to load backend blackout estimate");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setSmsDispatchedMap({});
  }, [assetId]);

  const handleTogglePermit = async () => {
    if (!permit) return;
    const nextState = !permit.permitted;
    setUpdatingPermit(true);
    try {
      const updated = await techtonicsApi.updateContractorPermit(
        nextState,
        "Er. Vikramaditya Parmar (MGVCL Contractor Desk)"
      );
      setPermit(updated);
      toast.success(
        nextState
          ? "Contractor permit ENABLED. Emergency SMS warnings are now authorized."
          : "Contractor permit BLOCKED. Automated citizen SMS broadcasts restricted."
      );
    } catch (err: any) {
      toast.error(err.message || "Could not update contractor permit");
    } finally {
      setUpdatingPermit(false);
    }
  };

  const handleBroadcastSms = async () => {
    if (!estimate || !permit?.permitted) return;
    setBroadcasting(true);
    try {
      const res = await techtonicsApi.broadcastOutageSms(assetId);
      toast.success(`Outage SMS Broadcast Dispatched! ${res.message}`);
      setRecentLogs((prev) => [res.dispatch, ...prev]);

      // Mark all consumers in table as DISPATCHED
      const newMap: Record<string, boolean> = { ...smsDispatchedMap };
      consumerData?.consumers.forEach((c) => {
        newMap[c.consumer_id] = true;
      });
      setSmsDispatchedMap(newMap);

      if (onSmsSent) onSmsSent(res.dispatch);
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast emergency SMS warning");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSendSingleSms = async (consumer: FeederConsumerRecord) => {
    if (!permit?.permitted) {
      toast.error("Enable Contractor Permit toggle first to send SMS alerts!");
      return;
    }
    setSendingSingleId(consumer.consumer_id);
    try {
      const res = await techtonicsApi.sendSingleConsumerSms({
        consumer_id: consumer.consumer_id,
        consumer_name: consumer.consumer_name,
        mobile_number: consumer.mobile_number,
        category: consumer.category,
        asset_id: assetId,
        address_area: consumer.address_area,
      });
      toast.success(`Personalized SMS sent directly to ${consumer.consumer_name} (${consumer.mobile_number})!`);
      setSmsDispatchedMap((prev) => ({ ...prev, [consumer.consumer_id]: true }));
      setRecentLogs((prev) => [res.dispatch, ...prev]);
    } catch (err: any) {
      toast.error(err.message || "Failed to send SMS to consumer");
    } finally {
      setSendingSingleId(null);
    }
  };

  const handleDownloadCsv = () => {
    const csvUrl = techtonicsApi.getFeederConsumerCsvUrl(assetId);
    window.open(csvUrl, "_blank");
    toast.success(`Downloading feeder consumer CSV directory for ${assetId}...`);
  };

  const handleDownloadSampleTemplate = () => {
    const templateUrl = techtonicsApi.getSampleConsumerCsvUrl();
    window.open(templateUrl, "_blank");
    toast.success("Downloading sample consumer CSV template...");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a valid .csv file.");
      return;
    }

    setUploadingCsv(true);
    try {
      const result = await techtonicsApi.uploadFeederConsumersCsv(file, assetId);
      toast.success(`CSV Import Successful! Loaded ${result.uploaded_count} consumer contacts into ${assetId}.`);
      
      // Refresh feeder directory list from backend
      const updatedConsumerRes = await techtonicsApi.getFeederConsumers(assetId);
      setConsumerData(updatedConsumerRes);
      setShowConsumerTable(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse and upload consumer CSV file.");
    } finally {
      setUploadingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-[#121318] p-5 shadow-sm space-y-3 font-sans">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-700 dark:text-[#d2f831]">
          <Loader2 className="size-4 animate-spin" />
          <span>Computing backend blackout risk & loading feeder directory for {assetId}...</span>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  const isHighRisk = estimate.blackout_probability_pct > 50;
  const isModerateRisk = estimate.blackout_probability_pct > 25;

  const consumersList = consumerData?.consumers || [];
  const filteredConsumers = consumersList.filter((c) => {
    const catStr = (c.category || "").toLowerCase();
    const nameStr = (c.consumer_name || "").toLowerCase();
    const idStr = (c.consumer_id || "").toLowerCase();
    const mobileStr = String(c.mobile_number || "");
    const searchStr = (searchConsumer || "").toLowerCase();

    const matchesCat =
      categoryFilter === "ALL" ||
      catStr.includes(categoryFilter.toLowerCase());
    const matchesSearch =
      !searchConsumer ||
      nameStr.includes(searchStr) ||
      idStr.includes(searchStr) ||
      mobileStr.includes(searchConsumer);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-[#121318] p-5 shadow-sm space-y-4 font-sans transition-all relative">
      {/* ── Hidden File Input for CSV Upload ── */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        className="hidden"
      />

      {/* ── Widget Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 dark:border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              isHighRisk
                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                : isModerateRisk
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-[#d2f831] border border-emerald-500/20"
            }`}
          >
            <Zap className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground dark:text-white flex items-center gap-2">
              Blackout Risk & Feeder SMS Broadcast Engine
              <Badge
                variant="outline"
                className="font-mono text-[10px] font-bold border-emerald-500/30 text-emerald-700 dark:text-[#d2f831] bg-emerald-500/10"
              >
                LIVE ML BACKEND
              </Badge>
            </h4>
            <p className="text-[11px] font-mono text-muted-foreground dark:text-neutral-400">
              Feeder Line: {estimate.substation} ({estimate.voltage_kv})
            </p>
          </div>
        </div>

        {/* Contractor Permit Governance Toggle */}
        <div className="flex items-center gap-2 bg-muted/50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-border dark:border-white/[0.06]">
          <span className="text-[11px] font-mono font-semibold text-muted-foreground dark:text-neutral-300 flex items-center gap-1.5">
            {permit?.permitted ? (
              <ShieldCheck className="size-3.5 text-emerald-600 dark:text-[#d2f831]" />
            ) : (
              <ShieldAlert className="size-3.5 text-red-400" />
            )}
            Contractor Permit:
          </span>
          <button
            type="button"
            onClick={handleTogglePermit}
            disabled={updatingPermit}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              permit?.permitted
                ? "bg-emerald-600 dark:bg-[#d2f831]"
                : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                permit?.permitted ? "translate-x-4 dark:bg-neutral-950" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-[10px] font-mono font-bold ${
              permit?.permitted
                ? "text-emerald-700 dark:text-[#d2f831]"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {permit?.permitted ? "PERMITTED" : "BLOCKED"}
          </span>
        </div>
      </div>

      {/* ── Key Calculation Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Blackout Risk Probability */}
        <div className="rounded-xl border border-border/80 dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02] p-3 space-y-1">
          <div className="text-[10px] font-mono font-bold text-muted-foreground dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="size-3 text-amber-500" />
            Blackout Probability
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                isHighRisk
                  ? "text-red-500 dark:text-red-400"
                  : isModerateRisk
                  ? "text-amber-500"
                  : "text-emerald-600 dark:text-[#d2f831]"
              }`}
            >
              {estimate.blackout_probability_pct}%
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {estimate.time_to_failure_hours}h to TTF
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isHighRisk ? "bg-red-500" : isModerateRisk ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, estimate.blackout_probability_pct)}%` }}
            />
          </div>
        </div>

        {/* 2. Calculated Affected Households */}
        <div className="rounded-xl border border-border/80 dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02] p-3 space-y-1">
          <div className="text-[10px] font-mono font-bold text-muted-foreground dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Home className="size-3 text-emerald-700 dark:text-[#d2f831]" />
            Affected Households
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-foreground dark:text-white">
              {estimate.affected_households.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
              <Users className="size-3" />
              ~{(estimate.estimated_residents / 1000).toFixed(1)}k
            </span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground truncate">
            Based on {estimate.current_load_mw} MW active feeder load
          </p>
        </div>

        {/* 3. ETR & Outage Window */}
        <div className="rounded-xl border border-border/80 dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02] p-3 space-y-1">
          <div className="text-[10px] font-mono font-bold text-muted-foreground dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="size-3 text-blue-500" />
            Est. Time to Restore (ETR)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
              {estimate.estimated_time_to_restore_mins}m
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              (ETR Window)
            </span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground truncate">
            Target: {estimate.predicted_outage_time}
          </p>
        </div>
      </div>

      {/* ── Critical Infrastructure Affected ── */}
      {estimate.critical_facilities.length > 0 && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 space-y-1.5">
          <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            Impacted Critical Facilities & Emergency Services ({estimate.critical_facilities.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {estimate.critical_facilities.map((fac, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-[10px] font-mono bg-card dark:bg-[#16181f] text-foreground dark:text-neutral-200 border-amber-500/30"
              >
                {fac}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ── Action Toolbar: Upload CSV, Download CSV, Preview SMS & Broadcast ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-muted-foreground dark:text-neutral-400 font-mono">
          {permit?.permitted ? (
            <span className="text-emerald-700 dark:text-[#d2f831] font-semibold flex items-center gap-1">
              <CheckCircle2 className="size-3.5" />
              Contractor Authorized — Dispatches via Exotel SMS API
            </span>
          ) : (
            <span className="text-red-500 dark:text-red-400 font-semibold flex items-center gap-1">
              <XCircle className="size-3.5" />
              Contractor Permit OFF — Enable toggle to authorize SMS warnings
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Upload Custom CSV Button */}
          <Button
            variant="outline"
            size="sm"
            disabled={uploadingCsv}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3 rounded-xl border-dashed border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10 text-xs font-mono text-emerald-700 dark:text-[#d2f831] cursor-pointer"
          >
            {uploadingCsv ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <Upload className="size-3.5 mr-1.5" />
            )}
            Upload Consumer CSV
          </Button>

          {/* Download Sample CSV Template */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSampleTemplate}
            className="h-9 px-3 rounded-xl border-border text-xs font-mono dark:border-white/[0.12] dark:text-neutral-300 cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5 mr-1.5 text-amber-500" />
            Sample Template CSV
          </Button>

          {/* Download Feeder CSV Direct Link */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="h-9 px-3 rounded-xl border-border text-xs font-mono dark:border-white/[0.12] dark:text-neutral-300 cursor-pointer"
          >
            <Download className="size-3.5 mr-1.5 text-blue-500" />
            Download Feeder CSV ({assetId})
          </Button>

          {/* Preview SMS Modal Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSmsPreviewModal(true)}
            className="h-9 px-3 rounded-xl border-border text-xs font-mono dark:border-white/[0.12] dark:text-neutral-300 cursor-pointer"
          >
            <Eye className="size-3.5 mr-1.5 text-purple-400" />
            Preview Structured SMS
          </Button>

          {recentLogs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
              className="h-9 px-3 rounded-xl border-border text-xs font-mono dark:border-white/[0.12] dark:text-neutral-300 cursor-pointer"
            >
              <History className="size-3.5 mr-1.5 text-emerald-700 dark:text-[#d2f831]" />
              Logs ({recentLogs.length})
            </Button>
          )}

          {/* Bulk Broadcast Button */}
          <Button
            onClick={handleBroadcastSms}
            disabled={!permit?.permitted || broadcasting}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#d2f831] dark:hover:bg-[#c2ea24] dark:text-neutral-950 font-bold text-xs shadow-md disabled:opacity-40 transition-all cursor-pointer"
          >
            {broadcasting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                Broadcasting SMS...
              </>
            ) : (
              <>
                <Send className="size-3.5 mr-1.5" />
                Dispatch Bulk SMS ({estimate.affected_households.toLocaleString()} Homes)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── FEEDER CONSUMER DIRECTORY & UPLOAD TABLE ── */}
      {showConsumerTable && (
        <div className="mt-4 pt-4 border-t border-border dark:border-white/[0.08] space-y-3 bg-muted/20 dark:bg-white/[0.01] p-4 rounded-2xl border">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h5 className="text-sm font-bold text-foreground dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-emerald-700 dark:text-[#d2f831]" />
                Consumer Directory & Uploaded Feeder List ({assetId})
              </h5>
              <p className="text-[11px] font-mono text-muted-foreground">
                Loaded {consumersList.length} contact records for feeder {estimate.substation}. Upload your own custom CSV above to add custom phone numbers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-[#d2f831] font-bold text-xs cursor-pointer"
              >
                <Upload className="size-3.5 mr-1" />
                Upload CSV
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleDownloadCsv}
                className="h-8 px-3 rounded-xl bg-emerald-600 text-white dark:bg-[#d2f831] dark:text-neutral-950 font-bold text-xs cursor-pointer"
              >
                <Download className="size-3.5 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Search & Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {["ALL", "Hospital", "Industrial", "Residential", "Water Supply"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-foreground text-background dark:bg-white dark:text-neutral-950 shadow-xs"
                      : "bg-muted dark:bg-white/[0.05] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat === "ALL" ? "All Categories" : cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-2 text-muted-foreground" />
              <input
                type="text"
                value={searchConsumer}
                onChange={(e) => setSearchConsumer(e.target.value)}
                placeholder="Search name, mobile, ID..."
                className="h-7 w-48 rounded-xl border border-border bg-background px-2.5 pl-8 text-[11px] outline-none dark:border-white/[0.1] dark:bg-white/[0.04]"
              />
            </div>
          </div>

          {/* Interactive Consumer Table with Single SMS Trigger Button */}
          <div className="overflow-x-auto rounded-xl border border-border dark:border-white/[0.08] max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="sticky top-0 bg-muted dark:bg-[#181a22] text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-2.5">Consumer ID</th>
                  <th className="p-2.5">Name & Address</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Mobile Number</th>
                  <th className="p-2.5">Peak Load</th>
                  <th className="p-2.5">SMS Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 dark:divide-white/[0.06] bg-card dark:bg-[#121318]">
                {filteredConsumers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground text-xs font-mono">
                      No consumer records match filter. Upload a custom CSV to load consumers for this feeder!
                    </td>
                  </tr>
                ) : (
                  filteredConsumers.map((c) => {
                    const isDispatched = smsDispatchedMap[c.consumer_id] || c.sms_alert_status === "DISPATCHED";
                    const isHospital = (c.category || "").includes("Hospital") || (c.category || "").includes("Critical");
                    const isIndustrial = (c.category || "").includes("Industrial");
                    const isSendingThis = sendingSingleId === c.consumer_id;

                    return (
                      <tr key={c.consumer_id} className="hover:bg-muted/50 dark:hover:bg-white/[0.03]">
                        <td className="p-2.5 font-bold text-foreground dark:text-white">
                          {c.consumer_id}
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-foreground dark:text-neutral-100">
                            {c.consumer_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {c.address_area}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-mono ${
                              isHospital
                                ? "bg-red-500/10 text-red-500 border-red-500/30"
                                : isIndustrial
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-[#d2f831] border-emerald-500/30"
                            }`}
                          >
                            {c.category}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-muted-foreground dark:text-neutral-300 font-bold">
                          {c.mobile_number}
                        </td>
                        <td className="p-2.5 font-bold">
                          {c.peak_load_kw} kW
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            {isDispatched ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-[#d2f831]">
                                <Check className="size-3" />
                                DISPATCHED
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!permit?.permitted || isSendingThis}
                                onClick={() => handleSendSingleSms(c)}
                                className="h-7 px-2.5 text-[10px] font-mono font-bold border-emerald-500/40 text-emerald-700 dark:text-[#d2f831] hover:bg-emerald-500/10 cursor-pointer"
                              >
                                {isSendingThis ? (
                                  <Loader2 className="size-3 animate-spin mr-1" />
                                ) : (
                                  <Smartphone className="size-3 mr-1" />
                                )}
                                Send SMS
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Expandable Dispatched SMS Logs ── */}
      {showLogs && recentLogs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border dark:border-white/[0.08] space-y-2">
          <span className="text-[11px] font-mono font-bold text-muted-foreground dark:text-neutral-400 uppercase tracking-wider">
            Recent Emergency SMS Dispatch Receipts & Delivery Log
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentLogs.map((log, lIdx) => (
              <div
                key={lIdx}
                className="p-2.5 rounded-xl border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-white/[0.02] text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-emerald-700 dark:text-[#d2f831]">
                    {log.dispatch_id} · {log.substation}
                  </span>
                  <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-[#d2f831]">
                    {log.delivered_pct}% Delivered
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground dark:text-neutral-200 bg-background dark:bg-white/[0.04] p-2 rounded-lg border border-border/60 dark:border-white/[0.06] italic">
                  "{log.sms_preview}"
                </p>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Authorized by: {log.authorized_by}</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SMS PREVIEW MODAL ── */}
      {showSmsPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border dark:border-white/[0.12] bg-card dark:bg-[#121318] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border dark:border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground dark:text-white flex items-center gap-2 font-display">
                    Structured Emergency SMS Templates
                    <Badge variant="outline" className="font-mono text-[10px] border-purple-500/30 text-purple-400">
                      EXOTEL REST READY
                    </Badge>
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    Target Feeder: {estimate.substation} ({assetId})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSmsPreviewModal(false)}
                className="p-1.5 rounded-xl hover:bg-muted dark:hover:bg-white/[0.1] text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Template 1: Hospital & Critical Infrastructure */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-red-500">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" />
                  1. High Priority: Hospital / Critical Facility Advisory
                </span>
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 text-[9px]">
                  IMMEDIATE DISPATCH
                </Badge>
              </div>
              <div className="p-3.5 rounded-2xl bg-muted/60 dark:bg-white/[0.03] border border-border/80 dark:border-white/[0.08] font-mono text-xs text-foreground dark:text-neutral-200 leading-relaxed">
                <p className="font-semibold text-emerald-700 dark:text-[#d2f831] mb-1">
                  [URGENT MGVCL GRID ADVISORY]
                </p>
                <p>
                  Dear <span className="font-bold underline">Anand General Hospital</span>, grid telemetry flags a high risk blackout window at feeder <span className="font-bold">{estimate.substation} ({assetId})</span>.
                </p>
                <p className="mt-1 text-muted-foreground text-[11px]">
                  Estimated Start: <span className="text-foreground dark:text-white font-bold">{estimate.predicted_outage_time}</span> | Est. ETR: <span className="text-foreground dark:text-white font-bold">{estimate.estimated_time_to_restore_mins} mins</span>.
                </p>
                <p className="mt-1.5 text-[11px] text-amber-500 font-bold">
                  Action Required: Please verify emergency generator backup fuel and essential ICU power isolation. Emergency Line: +91 98250 14210.
                </p>
              </div>
            </div>

            {/* Template 2: General Residential / Industrial Consumer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-700 dark:text-[#d2f831]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  2. Standard Priority: Residential / Commercial Advisory
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-[#d2f831] border-emerald-500/30 text-[9px]">
                  FEEDS {estimate.affected_households.toLocaleString()} HOMES
                </Badge>
              </div>
              <div className="p-3.5 rounded-2xl bg-muted/60 dark:bg-white/[0.03] border border-border/80 dark:border-white/[0.08] font-mono text-xs text-foreground dark:text-neutral-200 leading-relaxed">
                <p className="font-semibold text-emerald-700 dark:text-[#d2f831] mb-1">
                  [MGVCL POWER OUTAGE NOTICE]
                </p>
                <p>
                  Dear <span className="font-bold underline">Valued Consumer</span>, an emergency preventive maintenance outage is scheduled for transformer <span className="font-bold">{assetId}</span> serving <span className="font-bold">{estimate.substation}</span>.
                </p>
                <p className="mt-1 text-muted-foreground text-[11px]">
                  Outage Window: <span className="text-foreground dark:text-white font-bold">{estimate.predicted_outage_time}</span>. Est Restoration: <span className="text-foreground dark:text-white font-bold">{estimate.estimated_time_to_restore_mins} mins</span>.
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  We apologize for the inconvenience. Regulated by MGVCL Smart Grid Ops.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border dark:border-white/[0.08]">
              <div className="text-[10px] font-mono text-muted-foreground">
                Exotel SMS API Endpoint: <span className="text-foreground dark:text-neutral-300 font-bold">https://api.exotel.com/v1/Accounts/Sms/send.json</span>
              </div>
              <Button
                size="sm"
                onClick={() => setShowSmsPreviewModal(false)}
                className="h-8 px-4 rounded-xl bg-emerald-600 text-white dark:bg-[#d2f831] dark:text-neutral-950 font-bold text-xs cursor-pointer"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
