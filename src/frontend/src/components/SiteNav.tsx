import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Zap, CheckCircle2, AlertCircle, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { techtonicsApi } from "@/lib/techtonicsApi";
import { VoltraLogo } from "@/components/VoltraLogo";

const links = [
  { to: "/", label: "Home" },
  { to: "/grid", label: "Live Grid" },
  { to: "/predict", label: "Prediction" },
  { to: "/technology", label: "Technology" },
] as const;

export function SiteNav() {
  const { location } = useRouterState();
  const path = location.pathname;
  const [open, setOpen] = useState(false);
  const [backendLive, setBackendLive] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        localStorage.getItem("cinematic-theme") === "dark" ||
        localStorage.getItem("blackout-theme") === "dark";
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof document !== "undefined") {
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("cinematic-theme", next);
      localStorage.setItem("blackout-theme", next);
    }
  };

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
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90" onClick={() => setOpen(false)}>
            <VoltraLogo size={36} showText={true} subtitle="Grid Risk Advisor" />
          </Link>

          {/* Backend live status indicator */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] shadow-sm">
            {backendLive === true ? (
              <>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-foreground">FastAPI Online :8000</span>
                <span className="text-muted-foreground font-mono">(Real ML Models)</span>
              </>
            ) : backendLive === false ? (
              <>
                <span className="size-2 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Local Snapshot Mode</span>
              </>
            ) : (
              <>
                <span className="size-2 rounded-full bg-muted-foreground animate-ping" />
                <span className="text-muted-foreground">Connecting…</span>
              </>
            )}
          </div>
        </div>

        <nav className="pill hidden items-center gap-1 rounded-full border border-border/60 bg-muted/60 p-1 md:flex">
          {links.map((l) => {
            const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`pill px-4 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            to="/predict"
            className="pill hidden rounded-full border border-border/80 bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted sm:inline-flex"
          >
            Run prediction
          </Link>
          <Link
            to="/grid"
            className="pill hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] sm:inline-flex"
          >
            Open live grid
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
            title={theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
            className="grid size-9 place-items-center rounded-full border border-border/80 bg-card/80 backdrop-blur-md text-foreground shadow-sm transition-all hover:scale-105 hover:bg-muted"
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
            ) : (
              <Moon className="size-4 text-slate-700 transition-transform duration-300 hover:-rotate-12" />
            )}
          </button>
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-xl border border-border/60 bg-card md:hidden shadow-sm"
          >
            <Menu className="size-4 text-foreground" />
          </button>
        </div>
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
