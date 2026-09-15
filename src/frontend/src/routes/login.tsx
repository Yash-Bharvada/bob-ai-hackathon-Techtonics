import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Eye,
  EyeOff,
  Gauge,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { authSession, type OperatorProfile, type UserLocationState } from "@/lib/authSession";
import { toast } from "sonner";
import { VoltraLogo } from "@/components/VoltraLogo";
import { LocationOnboarding } from "@/components/LocationOnboarding";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In · VOLTRA Grid Intelligence" },
      { name: "description", content: "Authenticate to access VOLTRA predictive grid telemetry, live asset monitoring, and AI maintenance advisories." },
    ],
  }),
  component: LoginPage,
});

// Operator role presets — mirrors the grid's criticality tiers
const ROLE_PRESETS = [
  {
    id: "dispatch",
    label: "Dispatch Engineer",
    sub: "Live grid + fault alerts",
    zone: "Zone-B · Heavy Manufacturing Corridor",
    icon: Zap,
  },
  {
    id: "analyst",
    label: "Grid Analyst",
    sub: "Reports + trend analysis",
    zone: "Zone-A · Urban Core Corridor",
    icon: Activity,
  },
  {
    id: "supervisor",
    label: "Field Supervisor",
    sub: "Crew dispatch + planning",
    zone: "Zone-D · Bulk Transmission Corridor",
    icon: Gauge,
  },
  {
    id: "admin",
    label: "Admin / SCADA",
    sub: "Full platform access",
    zone: "Zone-C · Agro-Industrial Feeder",
    icon: ShieldCheck,
  },
] as const;

// Live stats ticker — real metrics from the pipeline
const LIVE_STATS = [
  { value: "18", label: "Transformers Monitored" },
  { value: "90.8%", label: "DGA Model Accuracy" },
  { value: "7.7d", label: "Peak RUL TX-115" },
  { value: "R²=0.72", label: "Health Index Model" },
];

// Terminal log lines that animate in — reflects real system context
const TERMINAL_LINES = [
  { cmd: "> model.load", args: "--artifact=risk_model.pkl dga_fault_model.pkl", delay: 0 },
  { cmd: "> score.run", args: "--assets=18 --day=89 --shap=true", delay: 400 },
  { cmd: "> rank.grid", args: "--weights=HI:35%,RUL:25%,fault:20%", delay: 800 },
  { cmd: "> advisory.gen", args: "--model=ibm-bob --fallback=deterministic", delay: 1200 },
  { cmd: "> TX-115.status", args: "--rul=97d --recovered=true ✓", delay: 1600, highlight: true },
];

// Google "G" icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [selectedRole, setSelectedRole] = useState<string>("dispatch");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [error, setError] = useState("");
  // Post-login location onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<OperatorProfile | null>(null);

  const selectedRolePreset = ROLE_PRESETS.find((r) => r.id === selectedRole)!;

  // ── On mount: consume Google OAuth callback params (?token=…&name=…&email=…)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // OAuth error from backend
    const oauthError = params.get("error");
    if (oauthError) {
      setError(`Google sign-in failed: ${oauthError.replace(/_/g, " ")}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    // Successful OAuth callback
    if (params.get("token")) {
      const consumed = authSession.consumeGoogleCallbackParams(params);
      if (consumed) {
        const profile = authSession.getProfile();
        toast.success(`Welcome, ${profile?.name ?? "Operator"}`, {
          description: "Signed in with Google · Session active",
        });
        // Show location onboarding before dashboard
        if (profile) {
          setPendingProfile(profile);
          setShowOnboarding(true);
        } else {
          navigate({ to: "/" });
        }
        return;
      }
    }

    // Already authenticated — go home (skip onboarding since location is already saved)
    if (authSession.isAuthenticated()) {
      navigate({ to: "/" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate terminal lines in
  useEffect(() => {
    TERMINAL_LINES.forEach((line, i) => {
      setTimeout(() => setVisibleLines((v) => Math.max(v, i + 1)), line.delay + 200);
    });
  }, []);

  // ── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setError("");
    authSession.startGoogleOAuth();
    // browser will redirect — no further handling needed here
  };

  // ── Email / Password submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    if (tab === "register" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      let profile: OperatorProfile;

      if (tab === "register") {
        const res = await authSession.register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          zone: selectedRolePreset.zone,
          role: selectedRolePreset.label,
        });
        profile = res.profile;
        toast.success(`Account created — welcome, ${profile.name}`, {
          description: `${profile.role} · ${selectedRolePreset.zone.split("·")[0].trim()}`,
        });
      } else {
        const res = await authSession.loginWithCredentials({
          email: email.trim().toLowerCase(),
          password,
        });
        profile = res.profile;
        toast.success(`Welcome back, ${profile.name}`, {
          description: `${profile.role} · Session active`,
        });
      }

      // Show location onboarding wizard before navigating to dashboard
      setPendingProfile(profile);
      setShowOnboarding(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Onboarding callbacks ─────────────────────────────────────────────────────
  const handleOnboardingComplete = (_loc: UserLocationState) => {
    setShowOnboarding(false);
    navigate({ to: "/dashboard" });
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    navigate({ to: "/dashboard" });
  };

  return (
    <>
    <div className="min-h-screen w-full bg-background flex flex-col">
      {/* ── Top Logo Bar ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <VoltraLogo size={30} showText subtitle="Grid Risk Advisor" />
        </Link>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500 font-semibold">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          MongoDB Connected
        </span>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col lg:flex-row">

        {/* ══ LEFT PANEL: Context (hidden on mobile, visible lg+) ══ */}
        <div className="hidden lg:flex lg:w-[46%] xl:w-[52%] flex-col justify-between bg-ink text-cream p-10 xl:p-14 border-r border-border/20 relative overflow-hidden">
          {/* Background grid texture */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          {/* Top: Headline */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono font-semibold text-emerald-400 mb-6">
              <BrainCircuit className="size-3" /> IBM Bobathon · Team Techtonics
            </span>

            <h1 className="font-sans text-4xl xl:text-5xl font-bold leading-[1.15] text-cream">
              The lights have<br />
              not gone out<br />
              <span className="text-emerald-400">yet.</span>
            </h1>
            <p className="mt-4 text-sm text-cream/60 leading-relaxed max-w-sm">
              VOLTRA combines two trained ML models — Health Index regression and DGA Fault Classification — to predict transformer failures before they become outages.
            </p>

            {/* Stats row */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              {LIVE_STATS.map((s) => (
                <div key={s.label} className="rounded-2xl border border-cream/10 bg-cream/5 px-4 py-3">
                  <p className="font-mono text-xl font-bold text-cream">{s.value}</p>
                  <p className="text-[11px] text-cream/50 mt-0.5 font-mono">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Terminal */}
          <div className="relative z-10 mt-10 rounded-2xl border border-cream/10 bg-black/40 p-4 font-mono text-[11px] backdrop-blur">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="size-2.5 rounded-full bg-red-500/70" />
              <span className="size-2.5 rounded-full bg-yellow-500/70" />
              <span className="size-2.5 rounded-full bg-green-500/70" />
              <span className="ml-2 text-cream/30 text-[10px]">voltra · pipeline · day-89</span>
            </div>
            <div className="space-y-1.5">
              {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
                <div key={i} className={`flex gap-2 ${line.highlight ? "text-emerald-400" : "text-cream/70"}`}>
                  <span className="shrink-0">{line.cmd}</span>
                  <span className="text-cream/40">{line.args}</span>
                </div>
              ))}
              {visibleLines < TERMINAL_LINES.length && (
                <span className="inline-block w-2 h-3 bg-emerald-400 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL: Login Form ══ */}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
          <div className="w-full max-w-sm">

            {/* Header */}
            <div className="mb-7">
              <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1.5">PLATFORM ACCESS</p>
              <h2 className="font-sans text-3xl font-bold text-foreground">Sign In</h2>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Authenticate to access live grid telemetry, ML predictions, and AI maintenance advisories.
              </p>
            </div>

            {/* Tab toggle */}
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/50 p-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => { setTab("signin"); setError(""); }}
                className={`rounded-lg py-2 transition-all ${
                  tab === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab("register"); setError(""); }}
                className={`rounded-lg py-2 transition-all ${
                  tab === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border/70 bg-card py-3 text-sm font-semibold text-foreground shadow-xs transition-all hover:bg-muted hover:border-border disabled:opacity-60 disabled:cursor-wait"
            >
              {googleLoading ? (
                <>
                  <span className="size-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
                  Redirecting to Google…
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </button>

            {/* Divider */}
            <div className="mb-5 flex items-center gap-3">
              <span className="flex-1 h-px bg-border/60" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">or continue with email</span>
              <span className="flex-1 h-px bg-border/60" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Name field (register only) */}
              {tab === "register" && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Yash Bhaskar"
                      autoComplete="name"
                      className="w-full rounded-xl border border-border bg-muted/30 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Grid Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@anand-grid.gov.in"
                    autoComplete="email"
                    inputMode="email"
                    className="w-full rounded-xl border border-border bg-muted/30 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete={tab === "register" ? "new-password" : "current-password"}
                    className="w-full rounded-xl border border-border bg-muted/30 pl-10 pr-11 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Role Picker (register only — sign-in keeps last saved role) */}
              {tab === "register" && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Operator Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_PRESETS.map((role) => {
                      const Icon = role.icon;
                      const active = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRole(role.id)}
                          className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                            active
                              ? "border-primary/60 bg-primary/8 ring-1 ring-primary/20"
                              : "border-border/60 bg-muted/20 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon className={`size-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-[11px] font-bold leading-tight ${active ? "text-foreground" : "text-foreground/80"}`}>
                              {role.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground leading-tight">{role.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-500">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-bold text-background transition-all hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="size-4 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                    {tab === "register" ? "Creating account…" : "Authenticating…"}
                  </>
                ) : (
                  <>
                    {tab === "signin" ? "Sign In to Console" : "Create Operator Account"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            {/* Security note */}
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-border/40 bg-muted/20 p-3.5 text-[11px] text-muted-foreground leading-relaxed">
              <ShieldCheck className="size-3.5 shrink-0 mt-0.5 text-emerald-500" />
              <span>
                Accounts are stored in MongoDB Atlas. Passwords are bcrypt-hashed. Sessions use signed JWTs — never plaintext credentials.
              </span>
            </div>

            {/* What you get access to */}
            <div className="mt-6 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">After signing in you can access</p>
              {[
                "Live 18-asset Anand District grid monitor",
                "ML Health Index + DGA Fault predictions",
                "IBM Bob AI maintenance advisories",
                "Community incident reporting pipeline",
                "7-day maintenance crew planning",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-xs text-foreground/80">
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ── Post-login Location Onboarding Wizard ── */}
    {showOnboarding && (
      <LocationOnboarding
        userName={pendingProfile?.name ?? "Operator"}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    )}
  </>
  );
}
