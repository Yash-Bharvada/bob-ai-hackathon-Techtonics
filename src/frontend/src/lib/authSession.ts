/**
 * authSession.ts
 * Manages user operator sessions, location state, and localStorage persistence.
 */

export interface OperatorProfile {
  name: string;
  email: string;
  role: string;
  zone: string;
  substation: string;
}

export interface UserLocationState {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  autoDetected: boolean;
  timestamp: string;
}

const STORAGE_KEY_USER = "voltra_operator_profile";
const STORAGE_KEY_LOC = "voltra_user_location";

const DEFAULT_PROFILE: OperatorProfile = {
  name: "Operator Dev",
  email: "operator@anand-grid.gov.in",
  role: "Regional Dispatch Engineer",
  zone: "Zone-B · Industrial",
  substation: "GIDC Industrial Phase-2",
};

const DEFAULT_LOCATION: UserLocationState = {
  latitude: 22.5645,
  longitude: 72.9589,
  city: "Anand",
  region: "Gujarat, India",
  autoDetected: false,
  timestamp: new Date().toISOString(),
};

export const authSession = {
  getProfile(): OperatorProfile {
    if (typeof window === "undefined") return DEFAULT_PROFILE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      return stored ? JSON.parse(stored) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: OperatorProfile): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
  },

  isLoggedIn(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(STORAGE_KEY_USER);
  },

  logout(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY_USER);
  },

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
        (err) => {
          reject(err);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  },
};
