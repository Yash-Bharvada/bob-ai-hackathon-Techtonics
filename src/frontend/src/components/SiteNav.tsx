import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  Sun,
  Moon,
  LogIn,
  LogOut,
  User,
  ArrowUpRight,
  X,
  Zap,
  Home,
  Activity,
  LayoutDashboard,
  MapPin,
  ShieldAlert,
  Cpu,
  Layers,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { VoltraLogo } from "@/components/VoltraLogo";
import { authSession, type OperatorProfile } from "@/lib/authSession";
import { toast } from "sonner";

const NAV_LINKS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/stream", label: "Stream", icon: Activity },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/grid", label: "Grid", icon: Zap },
  { to: "/map", label: "Map", icon: MapPin },
  { to: "/blackout", label: "Blackout", icon: ShieldAlert },
  { to: "/predict", label: "Prediction", icon: Cpu },
  { to: "/technology", label: "Technology", icon: Layers },
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

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      {/* ── Floating Premium Aerodynamic Top Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-2 sm:top-3.5 z-50 mx-auto w-[calc(100%-1.25rem)] sm:w-[calc(100%-2rem)] max-w-6xl rounded-2xl sm:rounded-full border border-white/[0.12] bg-[#0c0d11]/90 shadow-[0_12px_36px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl transition-all mb-3 sm:mb-4">
        <div className="flex h-12 sm:h-13 w-full items-center justify-between px-3.5 sm:px-5 lg:px-6 gap-2 sm:gap-3">
          {/* Left: Brand - Voltra Logo with Name */}
          <Link
            to="/"
            aria-label="Voltra Home"
            className="flex items-center gap-2.5 transition-transform hover:scale-105 shrink-0"
          >
            <VoltraLogo size={26} showText={false} variant="dark" />
            <span className="text-sm sm:text-base font-bold leading-none tracking-tight text-white font-mono">
              VOLTRA
            </span>
          </Link>

          {/* Center: Capsule Nav (lg:flex for 1024px+, sleek single-line pills) */}
          <nav className="hidden items-center gap-0.5 xl:gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 lg:flex shadow-inner backdrop-blur-md">
            {NAV_LINKS.map((l) => {
              const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
              const isStream = l.to === "/stream";
              const isGrid = l.to === "/grid";
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`rounded-full px-2.5 py-1.5 xl:px-3.5 xl:py-1.5 text-xs transition-all whitespace-nowrap ${
                    active
                      ? "bg-white/[0.14] text-white shadow-xs font-bold border border-white/[0.1]"
                      : isStream
                        ? "text-red-400 font-semibold hover:bg-white/[0.06] hover:text-red-300"
                        : isGrid
                          ? "text-[#d2f831] font-semibold hover:bg-white/[0.06] hover:text-[#e4ff54]"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.06] font-medium"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isStream && (
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
                      </span>
                    )}
                    {isGrid && (
                      <span className="size-1.5 rounded-full bg-[#d2f831] shadow-[0_0_6px_#d2f831] animate-pulse" />
                    )}
                    {l.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Operator Pill & Control Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

            {/* Mobile Hamburger (visible on screens < lg) */}
            <button
              type="button"
              aria-label={open ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid size-8.5 place-items-center rounded-full border border-white/[0.12] bg-white/[0.06] lg:hidden shadow-xs text-white transition-all hover:bg-white/[0.14] active:scale-95 cursor-pointer"
            >
              {open ? <X className="size-4 text-white" /> : <Menu className="size-4 text-white" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile & Tablet Glassmorphic Overlay Drawer ──────────────────────────────── */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Dropdown Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-x-3 sm:inset-x-6 top-16 sm:top-18.5 z-50 max-w-lg mx-auto lg:hidden transition-all duration-300 ease-out ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto scale-100"
            : "opacity-0 -translate-y-3 pointer-events-none scale-98"
        }`}
      >
        <div className="overflow-hidden rounded-3xl border border-white/[0.14] bg-[#0c0d11]/95 text-white shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl">
          {/* Header Status Bar in Mobile Menu */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              </span>
              <span className="text-[11px] font-mono font-medium text-neutral-300 tracking-wider uppercase">
                Anand Corridor Active
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">VOLTRA v2.4</span>
          </div>

          {/* Navigation Links Grid (2 columns for rapid thumb reach) */}
          <div className="grid grid-cols-2 gap-1.5 p-3">
            {NAV_LINKS.map((l) => {
              const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
              const isStream = l.to === "/stream";
              const isGrid = l.to === "/grid";
              const Icon = l.icon;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-xs font-semibold transition-all ${
                    active
                      ? "bg-white/[0.16] text-white border border-white/[0.14] shadow-sm font-bold"
                      : isStream
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                        : isGrid
                          ? "bg-[#d2f831]/10 text-[#d2f831] border border-[#d2f831]/20 hover:bg-[#d2f831]/20"
                          : "bg-white/[0.03] text-neutral-300 border border-transparent hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 ${
                      active
                        ? "text-white"
                        : isStream
                          ? "text-red-400"
                          : isGrid
                            ? "text-[#d2f831]"
                            : "text-neutral-400"
                    }`}
                  />
                  <span className="truncate">{l.label}</span>
                  {isStream && (
                    <span className="ml-auto size-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  )}
                  {isGrid && (
                    <span className="ml-auto size-1.5 rounded-full bg-[#d2f831] animate-pulse shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Live Grid Action CTA */}
          <div className="px-3 pb-2">
            <Link
              to="/grid"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#d2f831]/20 via-[#d2f831]/10 to-transparent border border-[#d2f831]/30 px-4 py-2.5 text-xs font-bold text-[#d2f831] transition-all hover:bg-[#d2f831]/25 active:scale-[0.99]"
            >
              <span className="flex items-center gap-2">
                <Zap className="size-4 text-[#d2f831]" />
                <span>Launch Live SCADA Command</span>
              </span>
              <ArrowUpRight className="size-4 text-[#d2f831]" />
            </Link>
          </div>

          {/* Operator Profile & Quick Settings */}
          <div className="border-t border-white/[0.08] p-3 bg-white/[0.02]">
            {isAuthenticated ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <User className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{profile!.name}</div>
                    <div className="text-[10px] font-mono text-neutral-400 truncate">
                      {profile!.role} · {profile!.zone}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all shrink-0 cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Exit</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.06] py-2.5 text-xs font-bold text-white transition-all hover:bg-white/[0.12]"
              >
                <LogIn className="size-4" />
                <span>Sign In to Operator Console</span>
              </Link>
            )}

            {/* Theme Switcher in Drawer */}
            <div className="mt-2.5 flex items-center justify-between px-1">
              <span className="text-[11px] text-neutral-400 font-medium">Appearance</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-xs font-medium text-white hover:bg-white/[0.1] transition-all cursor-pointer"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="size-3.5 text-amber-400" />
                    <span>Day Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="size-3.5 text-neutral-300" />
                    <span>Night Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
