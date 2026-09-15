"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { signIn } from "next-auth/react"
import { motion } from "motion/react"
import { ArrowRight, BriefcaseBusiness, Building2, Check, Eye, EyeOff, Grid2X2, LockKeyhole, Mail, Moon, ShieldCheck, Sun, UserRound } from "lucide-react"
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme"

type AuthMode = "login" | "register"
type AuthPayload = { mode: AuthMode; email: string; password: string; zone: string; name?: string; designation?: string }

const zones = [
  { value: "zone-b", label: "Zone-B · GIDC Heavy Manufacturing Corridor (TX-107, TX-109)" },
  { value: "zone-a", label: "Zone-A · Anand Central Transmission (TX-104, TX-101)" },
  { value: "zone-d", label: "Zone-D · Anand South Bulk Substation (TX-115, TX-116)" },
  { value: "zone-c", label: "Zone-C · Borsad Agricultural Interconnect (TX-112)" },
] as const

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export function AuthPage({ mode: initialMode = "login", onSubmit }: { mode?: AuthMode; onSubmit?: (payload: AuthPayload) => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [theme, setTheme] = useState<Theme>("light")
  useEffect(() => setTheme(getStoredTheme()), [])
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [values, setValues] = useState({ email: "", password: "", zone: zones[0].value, name: "", designation: "" })

  const copy = useMemo(() => mode === "login"
    ? { title: "Sign in to Dispatch", button: "Access Regional Console", footer: "Forgot password?" }
    : { title: "Create Operator Profile", button: "Initialize Operator Profile", footer: "Already have access? Sign in" }, [mode])

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode); setStatus("idle"); setError("")
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError("")
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch {
      setError("Google sign-in failed. Please try again.")
      setGoogleLoading(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("")
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
    const zoneValid = zones.some((zone) => zone.value === values.zone)
    if (!emailValid || values.password.length < 8 || !zoneValid || (mode === "register" && (!values.name.trim() || !values.designation.trim()))) {
      setStatus("error"); setError("Authentication failed. Verify credentials and zone assignment."); return
    }
    setStatus("loading")
    const payload: AuthPayload = { mode, email: values.email, password: values.password, zone: values.zone, ...(mode === "register" ? { name: values.name, designation: values.designation } : {}) }
    onSubmit?.(payload)
    window.setTimeout(() => setStatus("success"), 650)
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero" aria-label="Voltra grid operations overview">
        <div className="hero-content">
          <div className="brand-mark" aria-hidden="true"><Grid2X2 /></div>
          <p className="wordmark">VOLTRA</p>
          <p className="tagline">Intelligence for the living grid.</p>
          <div className="stat-list">
            <Stat value="18 Transformers" label="Live Monitored" />
            <Stat value="90.8%" label="DGA Fault Accuracy" />
            <Stat value="R² = 0.72" label="Health Index Regression" />
          </div>
          <p className="grid-status"><span className="status-dot" /> ANAND DISTRICT GRID · LIVE</p>
        </div>
      </section>

      <section className="auth-panel">
        <button className="theme-toggle" type="button" aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`} onClick={(event) => { const next = theme === "dark" ? "light" : "dark"; applyTheme(next, event.currentTarget); setTheme(next) }}>
          <motion.span key={theme} initial={{ opacity: 0, rotate: -90, scale: .6 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 20 }} className="theme-icon"><>{theme === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</></motion.span>
        </button>
        <div className="auth-form-wrap">
          <header className="auth-header">
            <div className="kicker"><span /> OPERATOR ACCESS</div>
            <h1>{copy.title}</h1>
            <p>Authenticate your regional dispatch session to view localized telemetry and live AI reports.</p>
          </header>
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <motion.div className={`auth-tab-pill ${mode === "register" ? "register" : "login"}`} layoutId="auth-tab-pill" transition={{ type: "spring", stiffness: 420, damping: 32 }} />
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>Sign In</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>Create Account</button>
          </div>

          {/* ── Google OAuth Button ── */}
          <motion.button
            id="google-signin-btn"
            type="button"
            className="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.985 }}
          >
            {googleLoading
              ? <motion.span key="g-loading" className="loading-dots" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><i /><i /><i /></motion.span>
              : <motion.span key="g-idle" className="google-btn-inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <GoogleIcon />
                  Continue with Google
                </motion.span>
            }
          </motion.button>

          <div className="auth-divider" aria-hidden="true">
            <span />
            <p>or continue with email</p>
            <span />
          </div>

          <form onSubmit={submit} className={status === "error" ? "auth-form form-shake" : "auth-form"} noValidate>
            {mode === "register" && <>
              <Field icon={<UserRound />} label="Operator Full Name" id="name" value={values.name} placeholder="e.g. Yash Bhaskar" autoComplete="name" onChange={(value) => setValues({ ...values, name: value })} />
              <Field icon={<BriefcaseBusiness />} label="Designation / Role" id="designation" value={values.designation} placeholder="e.g. Regional Dispatch Engineer" autoComplete="organization-title" onChange={(value) => setValues({ ...values, designation: value })} />
            </>}
            <Field icon={<Mail />} label="Grid Email Address" id="email" value={values.email} placeholder="operator@anand-grid.gov.in" autoComplete="email" onChange={(value) => setValues({ ...values, email: value })} type="email" />
            <div className="field-group"><label htmlFor="password"><LockKeyhole /> Password</label><div className="input-wrap"><input id="password" type={showPassword ? "text" : "password"} value={values.password} placeholder="Enter secure passphrase" autoComplete={mode === "login" ? "current-password" : "new-password"} onChange={(event) => setValues({ ...values, password: event.target.value })} /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}><motion.span key={showPassword ? "visible" : "hidden"} initial={{ opacity: 0, rotate: -20, scale: .75 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} transition={{ duration: .18 }}>{showPassword ? <EyeOff /> : <Eye />}</motion.span></button></div></div>
            <div className="field-group"><label htmlFor="zone"><Building2 /> Regional Zone</label><div className="input-wrap"><select id="zone" value={values.zone} onChange={(event) => setValues({ ...values, zone: event.target.value })}>{zones.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</select></div></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <motion.button className="submit-button" type="submit" disabled={status === "loading"} whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: .985 }}>{status === "loading" ? <motion.span key="loading" className="loading-dots" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><i /><i /><i /></motion.span> : status === "success" ? <motion.span key="success" className="submit-state" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}><Check /> Access confirmed</motion.span> : <motion.span key="idle" className="submit-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{copy.button}<ArrowRight /></motion.span>}</motion.button>
          </form>
          <div className="auth-footer"><button type="button" onClick={() => setError("Password recovery is handled by your grid administrator.")}>{copy.footer}</button></div>
          <div className="security-badge"><ShieldCheck /><span>Secured by prompt-injection-hardened pipeline · audit-logged.</span></div>
        </div>
      </section>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="stat-chip"><strong>{value}</strong><span>{label}</span></div> }
function Field({ icon, label, id, value, placeholder, autoComplete, onChange, type = "text" }: { icon: React.ReactNode; label: string; id: string; value: string; placeholder: string; autoComplete: string; onChange: (value: string) => void; type?: string }) { return <div className="field-group"><label htmlFor={id}>{icon} {label}</label><div className="input-wrap"><input id={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} /></div></div> }
export function LoginPage(props: Omit<React.ComponentProps<typeof AuthPage>, "mode">) { return <AuthPage {...props} mode="login" /> }
export function SignUpPage(props: Omit<React.ComponentProps<typeof AuthPage>, "mode">) { return <AuthPage {...props} mode="register" /> }
