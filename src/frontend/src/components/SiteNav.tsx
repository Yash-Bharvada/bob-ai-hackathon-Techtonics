import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, Sun, Moon, LogIn, LogOut, User, ArrowUpRight, X, Zap } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { VoltraLogo } from "@/components/VoltraLogo";
import { authSession, type OperatorProfile } from "@/lib/authSession";
import { toast } from "sonner";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/grid", label: "Live Grid" },
  { to: "/predict", label: "Prediction" },
  { to: "/technology", label: "Technology" },
] as const;

export function SiteNav() {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const path = location.pathname;
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  // Client-side only — localStorage unavailable on server
  useEffect(() => {
    setProfile(authSession.getProfile());
    setMounted(true);
    if (typeof document !== "undefined") {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        localStorage.getItem("cinematic-theme") === "dark" ||
        localStorage.getItem("blackout-theme") === "dark";
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  // Re-sync profile when route changes (handles post-login redirect)
  useEffect(() => {
    if (mounted) {
      setProfile(authSession.getProfile());
    }
  }, [path, mounted]);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [path]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isAuthenticated = mounted && !!profile;

  const handleSignOut = useCallback(() => {
    authSession.logout();
    setProfile(null);
    setOpen(false);
    toast.success("Signed out of VOLTRA console");
    navigate({ to: "/login" });
  }, [navigate]);

  const toggleTheme = useCallback(() => {
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
  }, [theme]);

  return (
    <>
      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">

          {/* Left: Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 transition-transform hover:scale-[1.01]"
          >
            <VoltraLogo size={34} showText={true} subtitle="Grid Risk Advisor" />
          </Link>

          {/* Center: Capsule Nav (desktop only) */}
          <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-muted/50 p-1 md:flex shadow-xs backdrop-blur-md">
            {NAV_LINKS.map((l) => {
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

          {/* Right: Actions */}
          <div className="flex items-center gap-2">

            {/* Auth Pill — signed in (desktop) */}
            {isAuthenticated && (
              <div className="hidden items-center gap-1 sm:flex">
                <span
                  title={`${profile!.role} · ${profile!.zone}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs cursor-default"
                >
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="max-w-[120px] truncate">{profile!.name}</span>
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="grid size-8 place-items-center rounded-full border border-border/60 bg-card/80 text-muted-foreground hover:text-foreground hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            )}

            {/* Auth Pill — not signed in (desktop) */}
            {mounted && !isAuthenticated && (
              <Link
                to="/login"
                className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-all hover:bg-muted hover:border-border sm:inline-flex"
              >
                <LogIn className="size-3.5" />
                Sign In
              </Link>
            )}

            {/* Live Grid CTA (desktop) */}
            <Link
              to="/grid"
              className="pill hidden items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] sm:inline-flex"
            >
              Live Grid <ArrowUpRight className="size-3.5 opacity-80" />
            </Link>

            {/* Day/Night Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
              className="grid size-9 place-items-center rounded-full border border-border/70 bg-card/80 backdrop-blur-md text-foreground shadow-xs transition-all hover:scale-105 hover:bg-muted active:scale-95"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-slate-700 dark:text-slate-300" />
              )}
            </button>

            {/* Mobile Hamburger */}
            <button
              type="button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-xl border border-border/60 bg-card md:hidden shadow-xs text-foreground transition-colors hover:bg-muted"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile full-screen overlay (rendered outside header, fixed) ── */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-down panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-x-0 top-16 z-50 md:hidden transition-all duration-300 ease-out ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-3 pointer-events-none"
        }`}
      >
        <nav className="mx-3 mt-2 mb-4 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-2xl">

          {/* Nav links */}
          <div className="p-2">
            {NAV_LINKS.map((l) => {
              const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{l.label}</span>
                  {active && <span className="size-1.5 rounded-full bg-primary-foreground/70" />}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-border/60" />

          {/* Auth + Live Grid section */}
          <div className="p-2 pt-2">
            {/* Live Grid CTA */}
            <Link
              to="/grid"
              onClick={() => setOpen(false)}
              className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98]"
            >
              <Zap className="size-4" />
              Live Grid Console
              <ArrowUpRight className="size-3.5 opacity-80" />
            </Link>

            {/* Auth row */}
            {isAuthenticated ? (
              <>
                <div className="flex items-center justify-between rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <User className="size-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{profile!.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">{profile!.role}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <LogIn className="size-4" />
                Sign In to Console
              </Link>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
