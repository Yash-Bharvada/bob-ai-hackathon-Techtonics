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

  // Client-side only — sync with document & localStorage
  useEffect(() => {
    setProfile(authSession.getProfile());
    setMounted(true);
    if (typeof document !== "undefined") {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        localStorage.getItem("cinematic-theme") === "dark" ||
        localStorage.getItem("blackout-theme") === "dark";
      const initial = isDark ? "dark" : "light";
      setTheme(initial);
      document.documentElement.classList.toggle("dark", isDark);
      document.body.classList.toggle("dark", isDark);
    }

    const onThemeChanged = (e: any) => {
      const t = e.detail?.theme;
      if (t === "dark" || t === "light") {
        setTheme(t);
      }
    };
    window.addEventListener("voltra-theme-changed", onThemeChanged);
    return () => window.removeEventListener("voltra-theme-changed", onThemeChanged);
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
    if (typeof document === "undefined") return;
    const isCurrentlyDark =
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark");
    const next = isCurrentlyDark ? "light" : "dark";

    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.body.classList.toggle("dark", next === "dark");

    const sliceEl = document.getElementById("voltraSliceOverlay");
    if (sliceEl) {
      sliceEl.classList.remove("slice-theme-light", "slice-theme-dark");
      sliceEl.classList.add(next === "dark" ? "slice-theme-dark" : "slice-theme-light");
    }

    localStorage.setItem("cinematic-theme", next);
    localStorage.setItem("blackout-theme", next);
    window.dispatchEvent(new CustomEvent("voltra-theme-changed", { detail: { theme: next } }));
  }, []);

  return (
    <>
      {/* ── Floating Premium Compact Glassmorphic Top Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-2 sm:top-3 z-50 mx-auto w-[calc(100%-1rem)] max-w-5xl rounded-full border border-white/[0.12] bg-[#0c0d11]/90 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl transition-all mb-3 sm:mb-4">
        <div className="flex h-11 sm:h-12 w-full items-center justify-between px-3 sm:px-5 gap-3">

          {/* Left: Brand - Voltra Logo with Name */}
          <Link
            to="/"
            aria-label="Voltra Home"
            className="flex items-center transition-transform hover:scale-105 shrink-0"
          >
            <VoltraLogo size={28} showText={true} />
          </Link>

          {/* Center: Capsule Nav (desktop only) */}
          <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 md:flex shadow-inner backdrop-blur-md">
            {NAV_LINKS.map((l) => {
              const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
              const isLiveGrid = l.to === "/grid";
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`rounded-full px-3.5 py-1.5 text-xs transition-all ${
                    active
                      ? "bg-white/[0.12] text-white shadow-sm font-bold border border-white/[0.08]"
                      : isLiveGrid
                      ? "text-[#d2f831] font-bold hover:bg-white/[0.06] hover:text-[#e4ff54]"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.06] font-semibold"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isLiveGrid && (
                      <span className="size-1.5 rounded-full bg-[#d2f831] shadow-[0_0_8px_#d2f831] animate-pulse" />
                    )}
                    {l.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Auth Pill — signed in (desktop) */}
            {isAuthenticated && (
              <div className="hidden items-center gap-1 sm:flex">
                <span
                  title={`${profile!.role} · ${profile!.zone}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white shadow-xs backdrop-blur-md cursor-default"
                >
                  <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                  <span className="max-w-[120px] truncate">{profile!.name}</span>
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="grid size-8 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-rose-500/15 hover:border-rose-500/30 transition-all cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            )}

            {/* Auth Pill — not signed in (desktop) */}
            {mounted && !isAuthenticated && (
              <Link
                to="/login"
                className="hidden items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-white/[0.12] hover:border-white/20 sm:inline-flex"
              >
                <LogIn className="size-3.5" />
                Sign In
              </Link>
            )}

            {/* Day/Night Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
              className="grid size-8.5 place-items-center rounded-full border border-white/[0.1] bg-white/[0.05] backdrop-blur-md text-white shadow-xs transition-all hover:scale-105 hover:bg-white/[0.1] active:scale-95 cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-neutral-300" />
              )}
            </button>

            {/* Mobile Hamburger */}
            <button
              type="button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid size-8.5 place-items-center rounded-full border border-white/[0.1] bg-white/[0.05] md:hidden shadow-xs text-white transition-colors hover:bg-white/[0.1] cursor-pointer"
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
        className={`fixed inset-x-0 top-20 z-50 md:hidden transition-all duration-300 ease-out ${
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

          {/* Theme row in mobile drawer */}
          <div className="px-3 py-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                {theme === "dark" ? (
                  <Sun className="size-4 text-amber-400" />
                ) : (
                  <Moon className="size-4 text-slate-700 dark:text-slate-300" />
                )}
                <span>{theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}</span>
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                {theme}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="mx-3 my-1 border-t border-border/60" />

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
