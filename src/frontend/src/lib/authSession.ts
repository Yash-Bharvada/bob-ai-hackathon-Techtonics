/**
 * authSession.ts
 * ==============
 * Manages authenticated operator sessions.
 *
 * Auth flow:
 *   Email/Password  →  POST /api/auth/register or /api/auth/login
 *                       ← { token, profile }  stored in localStorage
 *   Google OAuth    →  browser redirected to /api/auth/google
 *                       ← callback lands on /login?token=…&name=…&email=…
 *                          LoginPage picks up query params and calls authSession.loginWithToken()
 *
 * Every protected API call attaches the token as:
 *   Authorization: Bearer <token>
 */

import { API_BASE, getApiBase } from "@/lib/techtonicsApi";

export interface OperatorProfile {
  name: string;
  email: string;
  role: string;
  zone: string;
  substation: string;
  /** User's DB _id — populated after real auth */
  id?: string;
  image?: string | null;
  designation?: string;
  provider?: "credentials" | "google";
}

export interface OperatorSession {
  profile: OperatorProfile;
  /** JWT returned by /api/auth/login or /api/auth/register */
  sessionToken: string | null;
  /** ISO timestamp of last sign-in */
  signedInAt: string;
}

export interface UserLocationState {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  autoDetected: boolean;
  timestamp: string;
}

// ─── Auth API request / response types ────────────────────────────────────────

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  zone?: string;
  role?: string;
  designation?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  profile: OperatorProfile & {
    id: string;
    substation?: string;
    createdAt?: string;
    lastLoginAt?: string;
  };
}

// ─── Storage keys ──────────────────────────────────────────────────────────────

const STORAGE_KEY_SESSION = "voltra_operator_session";
const STORAGE_KEY_LOC     = "voltra_user_location";

const DEFAULT_LOCATION: UserLocationState = {
  latitude: 22.5645,
  longitude: 72.9589,
  city: "Anand",
  region: "Gujarat, India",
  autoDetected: false,
  timestamp: new Date().toISOString(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _zoneToSubstation(zone: string): string {
  if (zone.includes("Zone-B")) return "GIDC Industrial Phase-2 Substation";
  if (zone.includes("Zone-A")) return "Anand Central Transmission Substation";
  if (zone.includes("Zone-D")) return "Anand South Bulk Substation";
  return "Borsad Rural Interconnect";
}

function _apiProfileToOperatorProfile(p: AuthResponse["profile"]): OperatorProfile {
  return {
    id:          p.id,
    name:        p.name,
    email:       p.email,
    role:        p.role ?? "Regional Dispatch Engineer",
    zone:        p.zone ?? "Zone-B · Heavy Manufacturing Corridor",
    substation:  p.substation ?? _zoneToSubstation(p.zone ?? ""),
    image:       p.image ?? null,
    designation: p.designation ?? "",
    provider:    p.provider ?? "credentials",
  };
}

// ─── authSession singleton ────────────────────────────────────────────────────

export const authSession = {

  // ── Session ──────────────────────────────────────────────────────────────────

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (!raw) return false;
      const session: OperatorSession = JSON.parse(raw);
      return !!session?.profile?.email;
    } catch {
      return false;
    }
  },

  getSession(): OperatorSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (!raw) return null;
      return JSON.parse(raw) as OperatorSession;
    } catch {
      return null;
    }
  },

  getProfile(): OperatorProfile | null {
    return this.getSession()?.profile ?? null;
  },

  getToken(): string | null {
    return this.getSession()?.sessionToken ?? null;
  },

  /**
   * Persist a session after receiving a JWT + profile from the backend.
   */
  loginWithToken(token: string, profile: OperatorProfile): void {
    if (typeof window === "undefined") return;
    const session: OperatorSession = {
      profile,
      sessionToken: token,
      signedInAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  },

  /**
   * Legacy method kept for AuthModal compatibility — stores profile without a token.
   * Will be replaced once AuthModal is wired to the API.
   */
  login(profile: OperatorProfile): void {
    if (typeof window === "undefined") return;
    const session: OperatorSession = {
      profile,
      sessionToken: null,
      signedInAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  },

  logout(): void {
    if (typeof window === "undefined") return;
    const token = this.getToken();
    if (token) {
      const base = getApiBase();
      fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {/* ignore — token is already stateless */});
    }
    localStorage.removeItem(STORAGE_KEY_SESSION);
  },

  // ── Remote API calls ─────────────────────────────────────────────────────────

  /**
   * Permanent demo account — works even when MongoDB Atlas is unreachable.
   * Credentials are matched client-side; a local session is created.
   * Once Atlas is reachable the same credentials are also stored in MongoDB.
   */
  _tryDemoBypass(email: string, password: string): AuthResponse | null {
    if (
      email.toLowerCase().trim() === "rashiyaom@gmail.com" &&
      password === "Romashiya@123"
    ) {
      const profile: OperatorProfile = {
        id:          "demo-admin-001",
        name:        "Om Vipul Bhairashiya",
        email:       "rashiyaom@gmail.com",
        role:        "Admin / SCADA",
        zone:        "Zone-D · Bulk Transmission Corridor",
        substation:  "Anand South Bulk Substation",
        designation: "Platform Administrator",
        provider:    "credentials",
      };
      // Mint a pseudo-token (not JWT-verified by server, but sufficient for localStorage session)
      const pseudoToken = `demo.${btoa(JSON.stringify({ sub: profile.email, id: profile.id }))}.bypass`;
      this.loginWithToken(pseudoToken, profile);
      return { token: pseudoToken, profile: profile as OperatorProfile & { id: string } };
    }
    return null;
  },

  /**
   * Register a new operator account.
   * Throws on validation / duplicate email errors.
   */
  async register(req: RegisterRequest): Promise<AuthResponse> {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      if (!res.ok) throw new Error(data?.detail ?? "Registration failed.");
      const profile = _apiProfileToOperatorProfile(data.profile);
      this.loginWithToken(data.token, profile);
      return { token: data.token, profile: data.profile };
    } catch (err: any) {
      // If server is unreachable in local offline demo mode, create client-side session so operator isn't blocked
      if (err?.message?.includes("Failed to fetch") || err?.name === "TypeError") {
        const profile: OperatorProfile = {
          id: `local-${Date.now()}`,
          name: req.name,
          email: req.email,
          role: req.role || "Regional Dispatch Engineer",
          zone: req.zone || "Zone-B · Heavy Manufacturing Corridor",
          substation: _zoneToSubstation(req.zone || ""),
          designation: req.designation || "",
          provider: "credentials",
        };
        const localToken = `local.${btoa(JSON.stringify({ sub: profile.email, id: profile.id }))}.sig`;
        this.loginWithToken(localToken, profile);
        return { token: localToken, profile: profile as OperatorProfile & { id: string } };
      }
      throw err;
    }
  },

  /**
   * Sign in with email + password.
   * Falls back to demo bypass if MongoDB Atlas is unreachable.
   */
  async loginWithCredentials(req: LoginRequest): Promise<AuthResponse> {
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      if (!res.ok) throw new Error(data?.detail ?? "Sign-in failed.");
      const profile = _apiProfileToOperatorProfile(data.profile);
      this.loginWithToken(data.token, profile);
      return { token: data.token, profile: data.profile };
    } catch (err: any) {
      // If API is offline or Atlas is unreachable, try the demo bypass
      const bypass = this._tryDemoBypass(req.email, req.password);
      if (bypass) return bypass;
      if (err?.message?.includes("Failed to fetch") || err?.name === "TypeError") {
        const name = req.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const profile: OperatorProfile = {
          id: `local-${Date.now()}`,
          name,
          email: req.email,
          role: "Regional Dispatch Engineer",
          zone: "Zone-B · Heavy Manufacturing Corridor",
          substation: "GIDC Industrial Phase-2 Substation",
          provider: "credentials",
        };
        const localToken = `local.${btoa(JSON.stringify({ sub: profile.email, id: profile.id }))}.sig`;
        this.loginWithToken(localToken, profile);
        return { token: localToken, profile: profile as OperatorProfile & { id: string } };
      }
      throw err;
    }
  },

  /**
   * Initiate Google OAuth — redirects the browser to the FastAPI handler.
   */
  startGoogleOAuth(): void {
    const base = getApiBase();
    window.location.href = `${base}/api/auth/google`;
  },

  /**
   * Called by LoginPage after the Google OAuth callback redirects back
   * with ?token=…&name=…&email=… in the URL.
   * Returns true if a token was found and consumed.
   */
  consumeGoogleCallbackParams(searchParams: URLSearchParams): boolean {
    const token = searchParams.get("token");
    const name  = searchParams.get("name");
    const email = searchParams.get("email");
    if (!token || !email) return false;

    const profile: OperatorProfile = {
      name:       name ?? email.split("@")[0],
      email,
      role:       "Regional Dispatch Engineer",
      zone:       "Zone-B · Heavy Manufacturing Corridor",
      substation: "GIDC Industrial Phase-2 Substation",
      provider:   "google",
    };
    this.loginWithToken(token, profile);

    // Strip the token from the URL bar without a page reload
    if (typeof window !== "undefined") {
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
    return true;
  },

  /**
   * Fetch the current user's profile from the server using the stored JWT.
   * Returns null if not authenticated or if the token is expired.
   */
  async fetchMe(): Promise<OperatorProfile | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return _apiProfileToOperatorProfile(data);
    } catch {
      return null;
    }
  },

  // ── Location ──────────────────────────────────────────────────────────────────

  getLocation(): UserLocationState {
    if (typeof window === "undefined") return DEFAULT_LOCATION;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOC);
      return stored ? JSON.parse(stored) : DEFAULT_LOCATION;
    } catch {
      return DEFAULT_LOCATION;
    }
  },

  saveLocation(loc: UserLocationState): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_LOC, JSON.stringify(loc));
  },

  requestBrowserLocation(): Promise<UserLocationState> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: UserLocationState = {
            latitude: Number(pos.coords.latitude.toFixed(4)),
            longitude: Number(pos.coords.longitude.toFixed(4)),
            city: "Detected Coordinates",
            region: `${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°E`,
            autoDetected: true,
            timestamp: new Date().toISOString(),
          };
          this.saveLocation(loc);
          resolve(loc);
        },
        (err) => reject(err),
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  },
};
