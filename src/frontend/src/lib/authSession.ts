/**
 * authSession.ts
 * Manages authenticated operator sessions with localStorage persistence.
 *
 * MongoDB-ready architecture:
 *   - sessionToken field reserved for a real JWT/session token from MongoDB Atlas Auth
 *   - All read/write functions are synchronous localStorage stubs that can be swapped
 *     for async API calls when MongoDB is integrated.
 *   - The shape of OperatorSession mirrors a MongoDB "sessions" collection document.
 */

export interface OperatorProfile {
  name: string;
  email: string;
  role: string;
  zone: string;
  substation: string;
}

export interface OperatorSession {
  profile: OperatorProfile;
  /** Reserved for MongoDB JWT token — populated by backend login endpoint when integrated */
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

export const authSession = {
  // ─── Session ──────────────────────────────────────────────────────────────

  /**
   * Returns true only when a valid session exists in localStorage.
   * After MongoDB integration: also validate the JWT expiry.
   */
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

  /**
   * Retrieve the active session, or null if not signed in.
   */
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

  /**
   * Convenience: get just the OperatorProfile from the active session.
   */
  getProfile(): OperatorProfile | null {
    return this.getSession()?.profile ?? null;
  },

  /**
   * Persist a new session after successful login.
   * When MongoDB is integrated: call the backend /api/auth/login endpoint,
   * receive a JWT, and store it in sessionToken.
   */
  login(profile: OperatorProfile): void {
    if (typeof window === "undefined") return;
    const session: OperatorSession = {
      profile,
      sessionToken: null, // TODO: populate from MongoDB /api/auth/login response
      signedInAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  },

  /**
   * Clear the active session (sign out).
   * When MongoDB is integrated: also call /api/auth/logout to revoke the token.
   */
  logout(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY_SESSION);
  },

  // ─── Location ─────────────────────────────────────────────────────────────

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
