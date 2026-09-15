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

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("Yash Bhaskar");
  const [email, setEmail] = useState("operator@anand-grid.gov.in");
  const [password, setPassword] = useState("••••••••");
  const [zone, setZone] = useState("Zone-B · Heavy Manufacturing Corridor");
  const [role, setRole] = useState("Regional Dispatch Engineer");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile: OperatorProfile = {
      name: name.trim() || "Grid Operator",
      email: email.trim() || "operator@anand-grid.gov.in",
      role,
      zone,
      substation: zone.includes("Zone-B")
        ? "GIDC Industrial Phase-2 Substation"
        : zone.includes("Zone-A")
        ? "Anand Central Transmission Substation"
        : zone.includes("Zone-D")
        ? "Anand South Bulk Substation"
        : "Borsad Rural Interconnect",
    };

    authSession.saveProfile(profile);
    toast.success(isRegister ? "Operator account created!" : "Signed in to Regional Console");
    if (onSuccess) onSuccess(profile);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/65 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-glass transition-all">
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
          Authenticate your regional dispatch session to view localized telemetry and live Groq reports.
        </p>

        {/* Tab Toggle */}
        <div className="mt-5 grid grid-cols-2 rounded-xl border border-border/70 bg-muted/40 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`rounded-lg py-1.5 transition-all ${
              !isRegister ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`rounded-lg py-1.5 transition-all ${
              isRegister ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
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
                  required
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
                placeholder="••••••••"
                className="w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-signal"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Regional Transmission Jurisdiction</label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-signal cursor-pointer"
              >
                <option value="Zone-B · Heavy Manufacturing Corridor">Zone-B · GIDC Heavy Manufacturing (TX-107, TX-109)</option>
                <option value="Zone-A · Urban Core Corridor">Zone-A · Anand Central Transmission (TX-104, TX-101)</option>
                <option value="Zone-D · Bulk Transmission Corridor">Zone-D · Anand South Bulk Substation (TX-115, TX-116)</option>
                <option value="Zone-C · Agro-Industrial Feeder">Zone-C · Borsad Agricultural Interconnect (TX-112)</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            className="pill mt-5 w-full bg-signal text-xs font-semibold text-signal-foreground hover:bg-signal/90 shadow-sm"
          >
            {isRegister ? "Initialize Operator Profile" : "Access Regional Console"} <ArrowRight className="ml-1 size-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
