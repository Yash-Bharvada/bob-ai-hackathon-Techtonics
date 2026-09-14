import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { techtonicsApi } from "@/lib/techtonicsApi";
import { VoltraLogo } from "@/components/VoltraLogo";

const links = [
  { to: "/", label: "Home" },
  { to: "/grid", label: "Live Grid" },
  { to: "/predict", label: "Prediction" },
  { to: "/technology", label: "Technology" },
] as const;

/** The cinematic landing is always at the root of the host — one level above /app */
const LANDING_URL = "/";

export function SiteNav() {
  const { location } = useRouterState();
  const path = location.pathname;
  const [open, setOpen] = useState(false);
  const [backendLive, setBackendLive] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const res = await techtonicsApi.checkHealth();
      if (mounted) setBackendLive(res.live);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-3 z-50 mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Logo clicks navigate back to the cinematic landing page */}
        <a href={LANDING_URL} className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <VoltraLogo size={36} showText={true} subtitle="Grid Risk Advisor" />
        </a>

        {/* Backend live status indicator */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/80 px-2.5 py-1 text-[11px] backdrop-blur">
          {backendLive === true ? (
            <>
              <span className="size-2 rounded-full bg-signal animate-pulse" />
              <span className="font-medium text-foreground/80">FastAPI Online :8000</span>
            </>
          ) : backendLive === false ? (
            <>
              <span className="size-2 rounded-full bg-warning" />
              <span className="text-muted-foreground">Demo Snapshot Mode</span>
            </>
          ) : (
            <>
              <span className="size-2 rounded-full bg-muted-foreground animate-ping" />
              <span className="text-muted-foreground">Connecting…</span>
            </>
          )}
        </div>
      </div>

      <nav className="glass pill hidden items-center gap-1 px-2 py-1.5 md:flex">
        {links.map((l) => {
          const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`pill px-4 py-2 text-sm transition-colors ${
                active ? "bg-ink text-cream" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          to="/predict"
          className="pill hidden border border-border/70 bg-surface/60 px-4 py-2 text-sm backdrop-blur sm:inline-flex hover:bg-surface"
        >
          Run prediction
        </Link>
        <Link
          to="/grid"
          className="pill hidden items-center gap-1.5 bg-signal px-4 py-2 text-sm font-medium text-signal-foreground shadow-glass sm:inline-flex hover:bg-signal/90"
        >
          Open live grid
        </Link>
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="glass grid size-10 place-items-center rounded-full md:hidden"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {open && (
        <nav className="glass absolute inset-x-4 top-14 grid gap-1 rounded-2xl p-3 md:hidden shadow-lg border border-border">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-xs text-muted-foreground px-3">
            <span>FastAPI Backend</span>
            <span className={backendLive ? "text-signal font-medium" : "text-warning"}>
              {backendLive ? "Online (:8000)" : "Snapshot Mode"}
            </span>
          </div>
        </nav>
      )}
    </header>
  );
}
