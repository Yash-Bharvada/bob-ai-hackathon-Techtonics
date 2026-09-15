import { CinematicFrameSequence } from "./CinematicFrameSequence.ts";
import type { Theme, PlaybackState } from "./types.ts";

export interface ThemeTransitionOptions {
  storageKey?: string;
  bodyDarkClass?: string;
  onThemeSettled?: (theme: Theme) => void;
  onFrameChange?: (state: PlaybackState) => void;
  syncThemeProgress?: boolean;
}

export class ThemeTransitionController {
  private player: CinematicFrameSequence;
  private options: ThemeTransitionOptions;
  private _targetTheme: Theme;
  private storageKey: string;
  private bodyDarkClass: string;
  private reducedMotionMediaQuery: MediaQueryList;

  constructor(player: CinematicFrameSequence, options: ThemeTransitionOptions = {}) {
    this.player = player;
    this.options = options;
    this.storageKey = options.storageKey || "blackout-theme";
    this.bodyDarkClass = options.bodyDarkClass || "dark";

    // Read initial theme from storage or system preference
    const savedTheme = localStorage.getItem(this.storageKey) as Theme | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    this._targetTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

    this.reducedMotionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Apply initial state to DOM immediately
    this.applyDomTheme(this._targetTheme);

    // If starting in dark mode, set player to last frame statically
    if (this._targetTheme === "dark") {
      this.player.resetToLastFrame();
    } else {
      this.player.resetToFirstFrame();
    }
  }

  public get targetTheme(): Theme {
    return this._targetTheme;
  }

  public get currentTheme(): Theme {
    return this.player.currentFrame === 0 ? "light" : "dark";
  }

  public get isReducedMotion(): boolean {
    return this.reducedMotionMediaQuery.matches;
  }

  /**
   * Request a theme change (light or dark).
   * Seamlessly reverses from current frame if interrupted mid-playback.
   */
  public setTheme(newTheme: Theme): void {
    if (this._targetTheme === newTheme && this.player.isSettled) {
      return;
    }

    this._targetTheme = newTheme;
    localStorage.setItem(this.storageKey, newTheme);

    // If prefers-reduced-motion is active, skip the cinematic animation
    if (this.isReducedMotion) {
      if (newTheme === "dark") {
        this.player.resetToLastFrame();
      } else {
        this.player.resetToFirstFrame();
      }
      this.applyDomTheme(newTheme);
      this.options.onThemeSettled?.(newTheme);
      return;
    }

    // Apply website styling ambiance smoothly
    this.applyDomTheme(newTheme);

    // Drive the physical timeline towards target frame from wherever currentFrame currently is
    if (newTheme === "dark") {
      // Forward playback: currentFrame -> lastIndex
      this.player.playForward();
    } else {
      // Reverse playback: currentFrame -> 0
      this.player.playReverse();
    }
  }

  /**
   * Toggle between light and dark themes.
   */
  public toggleTheme(): Theme {
    const nextTheme: Theme = this._targetTheme === "dark" ? "light" : "dark";
    this.setTheme(nextTheme);
    return nextTheme;
  }

  private applyDomTheme(theme: Theme): void {
    const isDark = theme === "dark";
    document.body.classList.toggle(this.bodyDarkClass, isDark);
    document.documentElement.setAttribute("data-theme", theme);
  }

  public destroy(): void {
    this.player.destroy();
  }
}
