import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Sun, Moon, User, ArrowUpRight, X } from "lucide-react";
import { useState, useEffect } from "react";
import { VoltraLogo } from "@/components/VoltraLogo";
import { AuthModal } from "@/components/AuthModal";
import { authSession, type OperatorProfile } from "@/lib/authSession";

const links = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/grid", label: "Live Grid" },
  { to: "/predict", label: "Prediction" },
  { to: "/technology", label: "Technology" },
] as const;

export function SiteNav() {
  const { location } = useRouterState();
  const path = location.pathname;
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profile, setProfile] = useState<OperatorProfile>(authSession.getProfile());
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

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Left: Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 transition-transform hover:scale-[1.01]"
            onClick={() => setOpen(false)}
          >
            <VoltraLogo size={34} showText={true} subtitle="Grid Risk Advisor" />
          </Link>

          {/* Center: Clean Capsule Navigation */}
          <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-muted/50 p-1 md:flex shadow-xs backdrop-blur-md">
            {links.map((l) => {
              const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-card text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Operator Session Pill */}
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              title={`Signed in as ${profile.name} (${profile.zone.split("·")[0]})`}
              className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-all hover:bg-muted hover:border-border sm:inline-flex"
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="max-w-[110px] truncate">{profile.name}</span>
            </button>

            {/* Primary Console CTA */}
            <Link
              to="/grid"
              className="pill hidden items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] sm:inline-flex"
            >
              Live Grid <ArrowUpRight className="size-3.5 opacity-80" />
            </Link>

            {/* Glassmorphic Minimal Day/Night Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
              title={theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
              className="grid size-9 place-items-center rounded-full border border-border/70 bg-card/80 backdrop-blur-md text-foreground shadow-xs transition-all hover:scale-105 hover:bg-muted active:scale-95"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
              ) : (
                <Moon className="size-4 text-slate-700 dark:text-slate-300 transition-transform duration-300 hover:-rotate-12" />
              )}
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              aria-label="Toggle navigation"
              onClick={() => setOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-xl border border-border/60 bg-card md:hidden shadow-xs text-foreground"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {open && (
          <nav className="glass absolute inset-x-4 top-16 grid gap-1 rounded-2xl p-3 md:hidden shadow-lg border border-border z-50">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-muted text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAuthOpen(true);
              }}
              className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-muted text-left flex items-center justify-between text-foreground border-t border-border/40 mt-1 pt-3"
            >
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Operator: {profile.name}</span>
              </span>
              <span className="text-xs text-muted-foreground font-mono">{profile.zone.split("·")[0]}</span>
            </button>
          </nav>
        )}
      </header>

      {/* Auth Modal Portaled cleanly */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(p) => setProfile(p)}
      />
    </>
  );
}

