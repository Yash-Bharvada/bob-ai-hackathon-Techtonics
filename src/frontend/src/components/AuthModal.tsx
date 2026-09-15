import { useState } from "react";
import { X, Lock, Mail, User, ShieldCheck, ArrowRight, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authSession, type OperatorProfile } from "@/lib/authSession";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (profile: OperatorProfile) => void;
}

// Google "G" icon
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

const ZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Zone-B · Heavy Manufacturing Corridor", label: "Zone-B · GIDC Heavy Manufacturing (TX-107, TX-109)" },
  { value: "Zone-A · Urban Core Corridor",          label: "Zone-A · Anand Central Transmission (TX-104, TX-101)" },
  { value: "Zone-D · Bulk Transmission Corridor",   label: "Zone-D · Anand South Bulk Substation (TX-115, TX-116)" },
  { value: "Zone-C · Agro-Industrial Feeder",       label: "Zone-C · Borsad Agricultural Interconnect (TX-112)" },
];

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zone, setZone] = useState(ZONE_OPTIONS[0].value);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setError("");
    authSession.startGoogleOAuth();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (isRegister && !name.trim()) {
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

      if (isRegister) {
        const res = await authSession.register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          zone,
          role: "Regional Dispatch Engineer",
        });
        profile = res.profile;
        toast.success("Operator account created!");
      } else {
        const res = await authSession.loginWithCredentials({
          email: email.trim().toLowerCase(),
          password,
        });
        profile = res.profile;
        toast.success("Signed in to Regional Console");
      }

      if (onSuccess) onSuccess(profile);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-black/65 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="auth-modal-card relative my-auto w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xl transition-all">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-signal">
          <ShieldCheck className="size-4" />
          <span>Operator Verification</span>
        </div>

        <h2 className="mt-2 font-sans text-2xl font-bold text-foreground">
          {isRegister ? "Create Operator Profile" : "Sign In to Dispatch"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Authenticate your regional dispatch session to view localized telemetry and live AI reports.
        </p>

        {/* Tab Toggle */}
        <div className="mt-5 grid grid-cols-2 rounded-xl border border-border/70 bg-muted/40 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(""); }}
            className={`rounded-lg py-1.5 transition-all ${
              !isRegister ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(""); }}
            className={`rounded-lg py-1.5 transition-all ${
              isRegister ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-muted disabled:opacity-60 disabled:cursor-wait"
        >
          {googleLoading ? (
            <>
              <span className="size-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
              Redirecting…
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        <div className="my-4 flex items-center gap-3">
          <span className="flex-1 h-px bg-border/60" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">or email</span>
          <span className="flex-1 h-px bg-border/60" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Operator Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Yash Bhaskar"
                  className="w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-signal"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Grid Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@anand-grid.gov.in"
                className="w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-signal"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-signal"
                required
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Regional Transmission Jurisdiction</label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-signal cursor-pointer"
                >
                  {ZONE_OPTIONS.map((z) => (
                    <option key={z.value} value={z.value}>{z.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || googleLoading}
            className="pill mt-5 w-full bg-signal text-xs font-semibold text-signal-foreground hover:bg-signal/90 shadow-sm disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="size-3.5 rounded-full border-2 border-signal-foreground/30 border-t-signal-foreground animate-spin mr-1" />
                {isRegister ? "Creating…" : "Signing in…"}
              </>
            ) : (
              <>
                {isRegister ? "Initialize Operator Profile" : "Access Regional Console"} <ArrowRight className="ml-1 size-3.5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
