import { useState, useEffect, useRef, useId } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  chatWithGridAdvisor,
  checkRagHealth,
  ingestCsvFile,
  type RagChatResponse,
  type RagChatSource,
  type IngestResponse,
} from "@/lib/ragApi";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sun,
  Wind,
  Zap,
  ChevronDown,
  ChevronUp,
  Trash2,
  MessageSquare,
  Activity,
  Layers,
  UploadCloud,
  CheckCircle2,
  FileSpreadsheet,
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
  "Why is SOL-001 underperforming?",
  "Compare SOL-001 and SOL-002.",
  "Which asset has the largest deviation?",
  "Explain today's renewable performance.",
];

export function GridAdvisorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error";
    message: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }, 25000);

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
        // Auto-focus input
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    };

    const handleAssetFocused = (event: CustomEvent<{ assetId: string }>) => {
      if (event.detail?.assetId) {
        setFocusedAssetId(event.detail.assetId);
      }
    };

    window.addEventListener("open-grid-advisor" as any, handleOpenChat);
    window.addEventListener("voltra-grid-asset-focused" as any, handleAssetFocused);

    return () => {
      window.removeEventListener("open-grid-advisor" as any, handleOpenChat);
      window.removeEventListener("voltra-grid-asset-focused" as any, handleAssetFocused);
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Contextual suggestion chips based on dynamic uploads, active route and selected asset
  const dynamicSuggestions = (() => {
    if (customSuggestions.length > 0) {
      return customSuggestions;
    }
    if (isGridRoute && focusedAssetId) {
      return [
        `Why is ${focusedAssetId} underperforming?`,
        `Explain ${focusedAssetId}'s latest deviation.`,
        `What could explain ${focusedAssetId}'s performance?`,
        "Which asset has the largest deviation?",
      ];
    }
    if (isGridRoute) {
      return [
        "Why is SOL-001 underperforming?",
        "Compare SOL-001 and SOL-002.",
        "Which asset has the largest deviation?",
        "Summarize solar vs wind output today.",
      ];
    }
    return DEFAULT_SUGGESTIONS;
  })();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    event.target.value = "";

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const res: IngestResponse = await ingestCsvFile(file);
      if (res.status === "success") {
        const assetList = res.assets.length > 0 ? res.assets.join(", ") : "telemetry data";

        setUploadStatus({
          type: "success",
          message: `Ingested ${res.documents_indexed} rows (${assetList})`,
        });

        // Add assistant system announcement to conversation
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: "assistant",
            text: `📊 **Dynamic Telemetry Ingested**:\n\nSuccessfully indexed **${res.documents_indexed} records** from \`${res.filename}\`.\n\n• **Assets:** ${assetList}\n• **Recorded Dates:** ${res.dates.slice(0, 3).join(", ")}${res.dates.length > 3 ? "..." : ""}\n\nThe vector knowledge base has been dynamically updated. You can immediately ask questions about these records!`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

        if (res.assets.length > 0) {
          const newSuggestions = [
            `Why is ${res.assets[0]} underperforming?`,
            `Summarize performance for ${res.assets.join(" and ")}.`,
            `What is the weather impact on ${res.assets[0]}?`,
            "Which asset has the largest deviation?",
          ];
          setCustomSuggestions(newSuggestions);
          setInputQuery(`Why is ${res.assets[0]} underperforming?`);
        }
      } else {
        setUploadStatus({
          type: "error",
          message: res.message || "Failed to ingest telemetry CSV.",
        });
      }
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: err?.message || "Failed to upload and ingest CSV.",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
      const response: RagChatResponse = await chatWithGridAdvisor(query);

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
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: err?.message || "Grid Advisor is currently unavailable. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
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
      {/* ── Global Floating Trigger Button ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          type="button"
          aria-label="Open VOLTRA Grid Advisor AI Assistant"
          className="group relative flex items-center gap-2.5 rounded-full bg-surface/95 dark:bg-card/90 px-4 py-2.5 text-xs font-medium text-foreground border border-signal/30 shadow-[0_8px_30px_rgb(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 hover:scale-[1.03] hover:border-signal/60 hover:shadow-[0_10px_35px_rgba(14,165,233,0.25)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-signal/50"
        >
          {/* Animated beacon ring */}
          <span className="relative flex size-2.5">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                apiOnline === false ? "bg-destructive" : "bg-signal"
              }`}
            />
            <span
              className={`relative inline-flex size-2.5 rounded-full ${
                apiOnline === false ? "bg-destructive" : "bg-signal"
              }`}
            />
          </span>

          <Sparkles className="size-4 text-signal transition-transform group-hover:rotate-12" />
          <span className="font-semibold tracking-wide">Grid Advisor</span>

          {focusedAssetId && isGridRoute && (
            <span className="hidden md:inline-flex items-center rounded-full bg-signal/15 px-2 py-0.5 text-[10px] font-mono font-medium text-signal">
              {focusedAssetId}
            </span>
          )}
        </button>
      </div>

      {/* ── Slide-Over Chat Drawer / Sheet ── */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md lg:max-w-lg p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 bg-surface/60 dark:bg-card/40">
            <SheetHeader className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-signal/15 border border-signal/30 text-signal shadow-sm">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <SheetTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-2 font-sans">
                      VOLTRA Grid Advisor
                      <span
                        className={`size-2 rounded-full inline-block ${
                          apiOnline === false ? "bg-danger" : "bg-lime"
                        }`}
                        title={apiOnline === false ? "RAG API Offline" : "RAG API Connected"}
                      />
                    </SheetTitle>
                    <p className="text-[11px] text-muted-foreground">
                      Evidence-Grounded Operational RAG Assistant
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="h-7 text-[11px] font-medium gap-1.5 px-2.5 rounded-lg border-border/80 hover:bg-signal/10 hover:text-signal transition-colors"
                    title="Upload and dynamically index CSV telemetry data"
                  >
                    {isUploading ? (
                      <Loader2 className="size-3 animate-spin text-signal" />
                    ) : (
                      <UploadCloud className="size-3 text-signal" />
                    )}
                    <span>{isUploading ? "Ingesting..." : "Ingest CSV"}</span>
                  </Button>

                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClearHistory}
                      title="Clear conversation"
                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Context bar if on /grid or asset focused */}
              {isGridRoute && (
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-surface/80 dark:bg-card/80 px-2.5 py-1.5 border border-border/60 text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Layers className="size-3 text-signal" />
                    <span>Mode: <strong className="text-foreground">Live Grid Console</strong></span>
                  </div>
                  {focusedAssetId && (
                    <Badge variant="secondary" className="text-[10px] font-mono font-medium text-signal bg-signal/10 border-signal/20">
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
                <div className="size-12 rounded-2xl bg-signal/10 border border-signal/25 flex items-center justify-center text-signal mb-3 shadow-inner">
                  <Bot className="size-6" />
                </div>
                <h3 className="font-semibold text-foreground text-sm font-sans">
                  Grid & Renewable Operations Desk
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Ask about grid load, renewable performance, asset anomalies, or historical observations.
                </p>

                {apiOnline === false && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-danger/10 border border-danger/30 px-3 py-1.5 text-[11px] text-danger">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>RAG API (port 8001) is offline. Start the service to enable live inference.</span>
                  </div>
                )}

                {/* Quick Prompts */}
                <div className="mt-6 w-full space-y-2 text-left">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                    Suggested Queries
                  </span>
                  <div className="grid gap-2">
                    {dynamicSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(suggestion)}
                        disabled={isLoading}
                        className="w-full text-left rounded-xl border border-border/80 bg-surface/70 dark:bg-card/60 p-2.5 text-xs text-foreground transition-all hover:border-signal/40 hover:bg-signal/5 hover:translate-x-0.5 active:scale-[0.99] disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="line-clamp-1">{suggestion}</span>
                          <Sparkles className="size-3 text-signal shrink-0 opacity-60" />
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
                  className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm"
                      : msg.isError
                      ? "bg-danger/10 border border-danger/30 text-danger rounded-tl-none"
                      : "bg-surface dark:bg-card border border-border/80 text-foreground rounded-tl-none shadow-sm"
                  }`}
                >
                  {/* Sender Header */}
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] opacity-70">
                    {msg.sender === "assistant" ? (
                      <>
                        <Sparkles className="size-3 text-signal" />
                        <span className="font-semibold text-signal">Grid Advisor</span>
                      </>
                    ) : (
                      <span className="font-medium">Operator</span>
                    )}
                    <span>·</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap leading-relaxed break-words text-xs sm:text-sm font-sans">
                    {msg.text}
                  </div>

                  {/* Sources Section (if available) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-border/60">
                      <button
                        onClick={() => toggleSources(msg.id)}
                        className="flex items-center justify-between w-full text-[11px] font-medium text-signal hover:underline"
                      >
                        <span className="flex items-center gap-1.5">
                          <Activity className="size-3" />
                          Retrieved Operational Sources ({msg.sources.length})
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
                            const dev = src.deviation_pct;
                            const isNeg = typeof dev === "number" && dev < 0;
                            return (
                              <div
                                key={sIdx}
                                className="rounded-lg border border-border/70 bg-background/80 p-2.5 text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                                    {src.asset_type?.toLowerCase().includes("wind") ? (
                                      <Wind className="size-3 text-signal" />
                                    ) : (
                                      <Sun className="size-3 text-amber-500" />
                                    )}
                                    <span>{src.asset_id || "Asset"}</span>
                                  </div>
                                  {typeof dev === "number" && (
                                    <span
                                      className={`font-mono font-semibold px-1.5 py-0.2 rounded ${
                                        isNeg
                                          ? "bg-danger/15 text-danger"
                                          : "bg-lime/15 text-lime"
                                      }`}
                                    >
                                      Dev: {dev > 0 ? `+${dev.toFixed(1)}` : dev.toFixed(1)}%
                                    </span>
                                  )}
                                </div>

                                <div className="text-muted-foreground flex flex-wrap gap-x-2">
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

                                {src.weather && (
                                  <div className="text-[10px] text-muted-foreground italic truncate">
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
                <div className="rounded-2xl rounded-tl-none bg-surface dark:bg-card border border-border/80 p-3 shadow-sm max-w-[85%] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-signal">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Analyzing grid data...</span>
                  </div>
                  <div className="h-2 w-36 rounded-full bg-muted/60 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Footer Input Area */}
          <div className="p-3 sm:p-4 border-t border-border/80 bg-surface/80 dark:bg-card/60 backdrop-blur-md">
            {/* Hidden CSV file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Ingestion status banner */}
            {uploadStatus && (
              <div
                className={`mb-2.5 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium animate-in fade-in duration-150 ${
                  uploadStatus.type === "success"
                    ? "bg-lime/10 text-lime border border-lime/25"
                    : "bg-destructive/10 text-destructive border border-destructive/25"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {uploadStatus.type === "success" ? (
                    <CheckCircle2 className="size-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{uploadStatus.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadStatus(null)}
                  className="text-muted-foreground hover:text-foreground text-[10px] ml-1 p-0.5"
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2"
            >
              <Button
                type="button"
                variant="outline"
                size="default"
                disabled={isLoading || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-10 w-10 p-0 rounded-xl border-border/80 hover:bg-muted/60 text-muted-foreground hover:text-signal shrink-0"
                title="Upload telemetry CSV to dynamically ingest into RAG"
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin text-signal" />
                ) : (
                  <UploadCloud className="size-4" />
                )}
              </Button>

              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Grid Advisor (e.g. Why is SOL-001 underperforming?)..."
                  rows={2}
                  disabled={isLoading}
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-signal/40 disabled:opacity-50 font-sans"
                />
              </div>

              <Button
                type="submit"
                size="default"
                disabled={!inputQuery.trim() || isLoading}
                className="h-10 px-3.5 rounded-xl bg-signal text-signal-foreground hover:bg-signal/90 disabled:opacity-40 shadow-sm shrink-0"
                title="Send inquiry"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground px-1">
              <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
              <span className="font-mono">Port 8001</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
