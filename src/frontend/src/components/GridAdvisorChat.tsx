import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useRouterState } from "@tanstack/react-router";
import {
  chatWithGridAdvisor,
  checkRagHealth,
  getActiveDataset,
  type RagChatResponse,
  type RagChatSource,
  type ActiveDatasetInfo,
} from "@/lib/ragApi";
import { gridDataSource } from "@/lib/gridDataSource";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoltraLogo } from "@/components/VoltraLogo";
import {
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  Sun,
  Wind,
  Zap,
  ChevronDown,
  ChevronUp,
  Trash2,
  Activity,
  Layers,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Flame,
  X,
  Database,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sources?: RagChatSource[];
  timestamp: string;
  isError?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  "What pages and features are available on this website?",
  "How do I run a what-if simulation on the Predict page?",
  "What does the 7-day maintenance plan on the Dashboard show?",
  "What is the status of TX-107 in the active dataset?",
  "How do I inspect an asset on the Live Grid map?",
];

export function GridAdvisorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeDataset, setActiveDataset] = useState<ActiveDatasetInfo>(() =>
    gridDataSource.getActiveDatasetInfo()
  );
  const [systemCsvInfo, setSystemCsvInfo] = useState<{
    filename: string;
    assets: string[];
    count: number;
  } | null>(null);
  const [customSuggestions, setCustomSuggestions] = useState<string[]>([]);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [focusedAssetId, setFocusedAssetId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const routerState = useRouterState();
  const currentPath = routerState?.location?.pathname ?? "";
  const isGridRoute = currentPath === "/grid";

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Periodic health check (every 30 seconds when drawer is open, and once on mount)
  useEffect(() => {
    let active = true;
    const verifyHealth = async () => {
      const ok = await checkRagHealth();
      if (active) setApiOnline(ok);
    };

    verifyHealth();
    const timer = setInterval(() => {
      if (isOpen) {
        verifyHealth();
      }
    }, 30000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isOpen]);

  // Listen for custom global events from other components (e.g. /grid asset inspector)
  useEffect(() => {
    const handleOpenChat = (event: CustomEvent<{ assetId?: string; prompt?: string }>) => {
      setIsOpen(true);
      if (event.detail?.assetId) {
        setFocusedAssetId(event.detail.assetId);
      }
      if (event.detail?.prompt) {
        setInputQuery(event.detail.prompt);
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    };

    const handleAssetFocused = (event: CustomEvent<{ assetId: string }>) => {
      if (event.detail?.assetId) {
        setFocusedAssetId(event.detail.assetId);
      }
    };

    const handleSystemCsv = (
      event: CustomEvent<{ filename: string; assets: string[]; count: number }>
    ) => {
      const { filename, assets, count } = event.detail || {};
      setSystemCsvInfo({ filename, assets: assets || [], count: count || 0 });

      if (assets && assets.length > 0) {
        const first = assets[0];
        const newSuggestions = [
          `What is the operational status of ${first}?`,
          assets.length > 1 ? `Compare ${assets[0]} and ${assets[1]}.` : `Explain ${first}'s telemetry readings.`,
          "What are the highest risk assets in this CSV?",
          "Summarize findings from the uploaded CSV.",
        ];
        setCustomSuggestions(newSuggestions);
        setInputQuery(`What is the operational status of ${first}?`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-csv-${Date.now()}`,
          sender: "assistant",
          text: `📊 **System Telemetry Synchronized**:\n\nLoaded **${count || 0} records** from your analyzed CSV (\`${filename}\`).\n\n• **Assets:** ${assets && assets.length > 0 ? assets.join(", ") : "Analyzed records"}\n\nGrid Advisor is now synchronized with your uploaded CSV data. Ask me anything about these assets!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    };

    // Fetch active dataset from backend on mount
    getActiveDataset()
      .then((info) => {
        if (info) {
          setActiveDataset(info);
          gridDataSource.setActiveDatasetInfo(info);
        }
      })
      .catch(() => {});

    const handleDatasetActivated = (e: any) => {
      if (e.detail) {
        setActiveDataset(e.detail);
      }
    };

    window.addEventListener("open-grid-advisor" as any, handleOpenChat);
    window.addEventListener("open-voltrics-ai" as any, handleOpenChat);
    window.addEventListener("voltra-grid-asset-focused" as any, handleAssetFocused);
    window.addEventListener("voltra-system-csv-ingested" as any, handleSystemCsv);
    window.addEventListener("voltra-dataset-activated" as any, handleDatasetActivated);

    return () => {
      window.removeEventListener("open-grid-advisor" as any, handleOpenChat);
      window.removeEventListener("open-voltrics-ai" as any, handleOpenChat);
      window.removeEventListener("voltra-grid-asset-focused" as any, handleAssetFocused);
      window.removeEventListener("voltra-system-csv-ingested" as any, handleSystemCsv);
      window.removeEventListener("voltra-dataset-activated" as any, handleDatasetActivated);
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Contextual suggestion chips based on active dataset, dynamic uploads, and selected asset
  const dynamicSuggestions = (() => {
    if (customSuggestions.length > 0) {
      return customSuggestions;
    }
    if (activeDataset?.assets && activeDataset.assets.length > 0) {
      const a0 = activeDataset.assets[0];
      const a1 = activeDataset.assets.length > 1 ? activeDataset.assets[1] : a0;
      return [
        `What is the operational status and risk tier of ${a0}?`,
        `Explain ${a0}'s telemetry readings and diagnostic indicators.`,
        `Compare ${a0} and ${a1} in the active dataset.`,
        "How does VOLTRA evaluate asset anomalies?",
      ];
    }
    if (isGridRoute && focusedAssetId) {
      return [
        `What is the risk score and RUL of ${focusedAssetId}?`,
        `Explain ${focusedAssetId}'s dissolved gas ratios and fault class.`,
        `What maintenance actions are needed for ${focusedAssetId}?`,
        "Compare this asset against fleet mean health index.",
      ];
    }
    return DEFAULT_SUGGESTIONS;
  })();

  const handleSend = async (overridePrompt?: string) => {
    const query = (overridePrompt ?? inputQuery).trim();
    if (!query || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      // Build conversation history from previous turns (exclude error alerts)
      const historyPayload = messages
        .filter((m) => !m.isError && m.text)
        .slice(-6)
        .map((m) => ({
          role: m.sender,
          content: m.text,
        }));

      // Send inquiry to RAG service
      const response: RagChatResponse = await chatWithGridAdvisor(query, undefined, historyPayload);

      if (response.dataset) {
        setActiveDataset((prev) => ({
          ...prev,
          dataset_id: response.dataset?.id || prev.dataset_id,
          name: response.dataset?.name || prev.name,
          asset_count: response.dataset?.asset_count ?? prev.asset_count,
        }));
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        text: response.answer,
        sources: response.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setApiOnline(true);
    } catch (err: any) {
      // Zero mock: truthfully report connection status or missing data
      const assistantMsg: ChatMessage = {
        id: `asst-err-${Date.now()}`,
        sender: "assistant",
        text: `⚠️ **Advisory Notice**: ${err?.message || "Voltrics AI is currently unavailable. Please ensure the backend server is running."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setApiOnline(false);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleClearHistory = () => {
    setMessages([]);
    setExpandedSources({});
  };

  return (
    <>
      {/* ── Global Floating Trigger Button (Voltrics AI) ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          type="button"
          aria-label="Open Voltrics AI Copilot"
          className="group relative flex items-center gap-2.5 rounded-full border border-border bg-card/95 text-foreground shadow-xl backdrop-blur-xl px-4 py-2 text-xs font-medium hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.25)] transition-all duration-300 hover:scale-[1.03] active:scale-95 dark:border-white/[0.14] dark:bg-[#0c0d12]/95 dark:text-white dark:hover:border-[#d2f831]/50 dark:hover:shadow-[0_0_24px_rgba(210,248,49,0.25)] cursor-pointer"
        >
          {/* Animated beacon ring */}
          <span className="relative flex size-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                apiOnline === false ? "bg-amber-400" : "bg-emerald-500"
              }`}
            />
            <span
              className={`relative inline-flex size-2 rounded-full ${
                apiOnline === false
                  ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                  : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
              }`}
            />
          </span>

          <VoltraLogo size={20} showText={false} variant="auto" />
          <span className="font-mono text-xs font-bold tracking-tight text-foreground dark:text-white">
            Voltrics AI
          </span>

          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-700 dark:text-[#d2f831] border border-emerald-500/20 dark:border-lime-500/25">
            COPILOT
          </span>

          {focusedAssetId && isGridRoute && (
            <span className="hidden md:inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-[#d2f831]">
              {focusedAssetId}
            </span>
          )}
        </button>
      </div>

      {/* ── Slide-Over Chat Drawer / Sheet ── */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md lg:max-w-lg p-0 flex flex-col bg-background/98 backdrop-blur-2xl border-l border-border shadow-2xl z-50 overflow-hidden dark:bg-[#0c0d12]/98 dark:border-white/[0.1]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border bg-card/60 dark:border-white/[0.08] dark:bg-[#111216]/80 backdrop-blur-md">
            <SheetHeader className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative grid place-items-center">
                    <VoltraLogo size={32} showText={false} variant="auto" />
                  </div>
                  <div>
                    <SheetTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground dark:text-white flex items-center gap-2 font-display">
                      Voltrics AI
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-700 dark:text-[#d2f831]">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {apiOnline === false ? "READY · COPILOT" : "ONLINE · RAG"}
                      </span>
                    </SheetTitle>
                    <p className="text-[11px] font-mono text-muted-foreground dark:text-neutral-400">
                      Autonomous Grid Telemetry & Maintenance Copilot
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClearHistory}
                      title="Clear conversation"
                      className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.08]"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    title="Close"
                    className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.08]"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Active Dataset context banner */}
              <div className="mt-2.5 flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-[#d2f831] font-medium animate-in fade-in">
                <div className="flex items-center gap-1.5 truncate">
                  <Database className="size-3.5 shrink-0 text-emerald-600 dark:text-[#d2f831]" />
                  <span className="truncate">Active Data: <strong>{activeDataset.name}</strong> ({activeDataset.asset_count} assets)</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wider rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-[#d2f831]">
                  {activeDataset.status || "active"}
                </span>
              </div>

              {/* Context bar if on /grid or asset focused */}
              {isGridRoute && (
                <div className="mt-2.5 flex items-center justify-between rounded-xl bg-muted/60 dark:bg-white/[0.03] px-3 py-1.5 border border-border dark:border-white/[0.06] text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground dark:text-neutral-400 font-mono">
                    <Layers className="size-3 text-emerald-700 dark:text-[#d2f831]" />
                    <span>Corridor: <strong className="text-foreground dark:text-white">Anand Transmission Grid</strong></span>
                  </div>
                  {focusedAssetId && (
                    <Badge variant="secondary" className="text-[10px] font-mono font-bold text-emerald-700 dark:text-[#d2f831] bg-emerald-500/10 border-emerald-500/20 dark:bg-[#d2f831]/10 dark:border-[#d2f831]/25">
                      Asset: {focusedAssetId}
                    </Badge>
                  )}
                </div>
              )}
            </SheetHeader>
          </div>

          {/* Conversation Body */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm"
          >
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="h-full flex flex-col justify-center items-center text-center py-6 px-2">
                <div className="relative mb-3 flex items-center justify-center">
                  <div className="absolute -inset-2 rounded-full bg-emerald-500/20 blur-xl dark:bg-[#d2f831]/20" />
                  <VoltraLogo size={48} showText={false} variant="auto" />
                </div>
                <h3 className="font-display font-bold text-foreground dark:text-white text-base">
                  Voltrics AI Operational Copilot
                </h3>
                <p className="mt-1 text-xs text-muted-foreground dark:text-neutral-400 max-w-sm leading-relaxed">
                  Evidence-grounded operational assistant synthesizing real-time transformer SCADA telemetry, IEEE C57.104 gas standards, and maintenance advisories.
                </p>

                {/* Quick Prompts */}
                <div className="mt-6 w-full space-y-2 text-left">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground dark:text-neutral-400 uppercase tracking-wider px-1">
                    Suggested Inquiries
                  </span>
                  <div className="grid gap-2">
                    {dynamicSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(suggestion)}
                        disabled={isLoading}
                        className="w-full text-left rounded-xl border border-border bg-card/70 dark:border-white/[0.08] dark:bg-[#121318]/90 p-3 text-xs text-foreground dark:text-neutral-200 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:hover:border-[#d2f831]/40 dark:hover:bg-[#d2f831]/5 hover:translate-x-0.5 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="line-clamp-1 font-medium">{suggestion}</span>
                          <Sparkles className="size-3 text-emerald-700 dark:text-[#d2f831] shrink-0 opacity-70" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message Stream */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.sender === "user"
                      ? "bg-foreground text-background dark:bg-white dark:text-neutral-950 rounded-tr-xs shadow-md"
                      : msg.isError
                      ? "bg-danger/10 border border-danger/30 text-danger rounded-tl-xs"
                      : "bg-card dark:bg-[#121318] border border-border dark:border-white/[0.08] text-foreground dark:text-neutral-200 rounded-tl-xs shadow-sm"
                  }`}
                >
                  {/* Sender Header */}
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] opacity-75 font-mono">
                    {msg.sender === "assistant" ? (
                      <>
                        <VoltraLogo size={14} showText={false} variant="auto" />
                        <span className="font-bold text-emerald-700 dark:text-[#d2f831]">
                          Voltrics AI
                        </span>
                      </>
                    ) : (
                      <span className="font-medium">Operator</span>
                    )}
                    <span>·</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Content */}
                  {msg.sender === "user" ? (
                    // User bubble — plain text, inherits the bubble's text-background colour
                    <div className="whitespace-pre-wrap leading-relaxed break-words text-xs sm:text-sm font-sans">
                      {msg.text}
                    </div>
                  ) : (
                    // Assistant bubble — full markdown rendering
                    <div className="leading-relaxed break-words text-xs sm:text-sm font-sans prose prose-sm dark:prose-invert max-w-none
                      [&_p]:my-1 [&_p]:leading-relaxed
                      [&_strong]:font-bold [&_strong]:text-foreground dark:[&_strong]:text-white
                      [&_em]:italic
                      [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc
                      [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal
                      [&_li]:my-0.5
                      [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] dark:[&_code]:bg-white/10
                      [&_pre]:rounded-lg [&_pre]:bg-muted dark:[&_pre]:bg-white/5 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:text-[11px]
                      [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1
                      [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-0.5
                      [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-1.5 [&_h3]:mb-0.5
                      [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                      [&_table]:text-[11px] [&_th]:font-semibold [&_th]:text-left [&_th]:py-1 [&_td]:py-1
                      [&_a]:text-emerald-600 dark:[&_a]:text-emerald-400 [&_a]:underline">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}

                  {/* Sources Section (if available) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-border/70 dark:border-white/[0.08]">
                      <button
                        onClick={() => toggleSources(msg.id)}
                        className="flex items-center justify-between w-full text-[10px] font-mono font-bold text-emerald-700 dark:text-[#d2f831] hover:underline cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Activity className="size-3" />
                          Retrieved Operational Evidence ({msg.sources.length})
                        </span>
                        {expandedSources[msg.id] ? (
                          <ChevronUp className="size-3" />
                        ) : (
                          <ChevronDown className="size-3" />
                        )}
                      </button>

                      {expandedSources[msg.id] && (
                        <div className="mt-2 space-y-2">
                          {msg.sources.map((src, sIdx) => {
                            const isProject = src.knowledge_type === "project";
                            const dev = src.deviation_pct;

                            if (isProject) {
                              // ── Project / documentation source card ──
                              const sourceFile = String(src.source_file || "");
                              const fileName = sourceFile.split("/").pop() || sourceFile;
                              const section = src.section ? String(src.section) : null;
                              const docType = String(src.doc_type || "doc").toUpperCase();
                              const score = typeof src.relevance_score === "number"
                                ? src.relevance_score.toFixed(3)
                                : null;
                              return (
                                <div
                                  key={sIdx}
                                  className="rounded-lg border border-violet-500/30 dark:border-violet-400/25 bg-violet-500/5 dark:bg-violet-900/10 p-2.5 text-[11px] space-y-1"
                                >
                                  {/* File name + doc-type badge */}
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5 font-mono font-bold text-violet-700 dark:text-violet-300 min-w-0">
                                      <Cpu className="size-3 shrink-0" />
                                      <span className="truncate" title={sourceFile}>{fileName}</span>
                                    </div>
                                    <span className="shrink-0 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                                      {docType}
                                    </span>
                                  </div>

                                  {/* Full relative path */}
                                  {sourceFile !== fileName && (
                                    <div className="font-mono text-[10px] text-muted-foreground dark:text-neutral-500 truncate" title={sourceFile}>
                                      {sourceFile}
                                    </div>
                                  )}

                                  {/* Section heading (nearest markdown heading in chunk) */}
                                  {section && (
                                    <div className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                                      <ShieldCheck className="size-3 shrink-0" />
                                      <span className="truncate">{section}</span>
                                    </div>
                                  )}

                                  {/* Relevance score */}
                                  {score && (
                                    <div className="font-mono text-[10px] text-muted-foreground dark:text-neutral-500">
                                      Relevance: {score}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // ── Operational telemetry source card ──
                            return (
                              <div
                                key={sIdx}
                                className="rounded-lg border border-border dark:border-white/[0.08] bg-muted/40 dark:bg-white/[0.02] p-2.5 text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 font-mono font-bold text-foreground dark:text-white">
                                    {src.asset_type?.toLowerCase().includes("wind") ? (
                                      <Wind className="size-3 text-signal" />
                                    ) : src.asset_type?.toLowerCase().includes("transformer") ? (
                                      <Zap className="size-3 text-amber-400 dark:text-[#d2f831]" />
                                    ) : (
                                      <Sun className="size-3 text-amber-500" />
                                    )}
                                    <span>{src.asset_id || "Asset"}</span>
                                  </div>
                                  {typeof dev === "number" && dev !== 0 ? (
                                    <span
                                      className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                        dev < 0
                                          ? "bg-danger/15 text-danger"
                                          : "bg-lime/15 text-lime dark:bg-[#d2f831]/15 dark:text-[#d2f831]"
                                      }`}
                                    >
                                      Dev: {dev > 0 ? `+${dev.toFixed(1)}` : dev.toFixed(1)}%
                                    </span>
                                  ) : src.risk_tier ? (
                                    <span
                                      className={`font-mono font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                                        String(src.risk_tier).toUpperCase().includes("CRIT")
                                          ? "bg-danger/15 text-danger"
                                          : String(src.risk_tier).toUpperCase().includes("HIGH")
                                          ? "bg-amber-500/15 text-amber-500"
                                          : "bg-lime/15 text-lime dark:bg-[#d2f831]/15 dark:text-[#d2f831]"
                                      }`}
                                    >
                                      {String(src.risk_tier)}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="text-muted-foreground dark:text-neutral-400 text-[10px] font-mono flex flex-wrap gap-x-2">
                                  {src.site_name && <span>{src.site_name}</span>}
                                  {src.date && <span>· {src.date}</span>}
                                </div>

                                {(src.actual_kwh !== undefined || src.expected_kwh !== undefined) && (
                                  <div className="text-[10px] text-muted-foreground flex gap-2 font-mono">
                                    {src.actual_kwh !== undefined && (
                                      <span>Act: {Number(src.actual_kwh).toLocaleString()} kWh</span>
                                    )}
                                    {src.expected_kwh !== undefined && (
                                      <span>Exp: {Number(src.expected_kwh).toLocaleString()} kWh</span>
                                    )}
                                  </div>
                                )}

                                {(src.health_index !== undefined || src.fault_type !== undefined) && (
                                  <div className="text-[10px] text-muted-foreground flex gap-2 font-mono">
                                    {src.health_index !== undefined && <span>HI: {Number(src.health_index)}</span>}
                                    {src.fault_type && <span>Fault: {String(src.fault_type)}</span>}
                                    {src.rul_days !== undefined && <span>RUL: {Number(src.rul_days)}d</span>}
                                  </div>
                                )}
                                {src.weather && (
                                  <div className="text-[10px] text-muted-foreground dark:text-neutral-400 italic">
                                    Obs: {src.weather}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start">
                <div className="rounded-2xl rounded-tl-xs bg-card dark:bg-[#121318] border border-border dark:border-white/[0.08] p-3.5 shadow-sm max-w-[85%] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-700 dark:text-[#d2f831]">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Voltrics AI synthesizing grid telemetry...</span>
                  </div>
                  <div className="h-1.5 w-40 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-600 dark:bg-[#d2f831] animate-pulse w-3/4" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Input Area */}
          <div className="p-3 sm:p-4 border-t border-border bg-card/80 dark:border-white/[0.08] dark:bg-[#0c0d12]/90 backdrop-blur-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2"
            >
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Voltrics AI about Anand grid telemetry, DGA gases, or transformer health..."
                  rows={2}
                  disabled={isLoading}
                  className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 font-sans dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                />
              </div>

              <Button
                type="submit"
                size="default"
                disabled={!inputQuery.trim() || isLoading}
                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#d2f831] dark:hover:bg-[#c2ea24] dark:text-neutral-950 font-bold disabled:opacity-40 shadow-sm shrink-0 cursor-pointer transition-all"
                title="Send inquiry"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground dark:text-neutral-400 px-1 font-mono">
              <span>Press <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for newline</span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                RAG Grounded
              </span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
