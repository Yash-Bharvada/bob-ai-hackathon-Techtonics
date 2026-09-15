import { CinematicFrameSequence } from "./CinematicFrameSequence.ts";
import {
  ThemeTransitionController,
  type ThemeTransitionOptions,
} from "./ThemeTransitionController.ts";
import type { CinematicPlayerOptions, PlaybackState, Theme } from "./types.ts";

export interface CinematicThemeTransitionProps
  extends CinematicPlayerOptions, ThemeTransitionOptions {
  showDebugHud?: boolean;
}

export class CinematicThemeTransition {
  public player: CinematicFrameSequence;
  public controller: ThemeTransitionController;
  private container: HTMLElement;
  private debugHud: HTMLElement | null = null;

  constructor(container: HTMLElement, props: CinematicThemeTransitionProps = {}) {
    this.container = container;

    // Check debug flag or URL query ?debug=1
    const isDebugUrl = typeof window !== "undefined" && window.location.search.includes("debug=1");
    const isDebug = props.debug || props.showDebugHud || isDebugUrl;

    // Initialize core Frame Sequence player
    this.player = new CinematicFrameSequence(container, {
      ...props,
      debug: isDebug,
      onFrameChange: (state) => {
        this.updateDebugHud(state);
        props.onFrameChange?.(state);
      },
      onTransitionComplete: (theme) => {
        props.onTransitionComplete?.(theme);
        props.onThemeSettled?.(theme);
      },
    });

    // Initialize Theme Controller
    this.controller = new ThemeTransitionController(this.player, {
      ...props,
      onThemeSettled: (theme) => {
        props.onThemeSettled?.(theme);
        props.onTransitionComplete?.(theme);
      },
    });

    if (isDebug) {
      this.initDebugHud();
    }
  }

  public setTheme(theme: Theme): void {
    this.controller.setTheme(theme);
  }

  public toggleTheme(): Theme {
    return this.controller.toggleTheme();
  }

  public getState(): PlaybackState {
    return this.player.getState();
  }

  private initDebugHud(): void {
    if (this.debugHud) return;

    this.debugHud = document.createElement("div");
    this.debugHud.className = "cinematic-debug-hud";
    this.debugHud.style.position = "absolute";
    this.debugHud.style.bottom = "12px";
    this.debugHud.style.left = "12px";
    this.debugHud.style.padding = "6px 12px";
    this.debugHud.style.background = "rgba(0, 0, 0, 0.75)";
    this.debugHud.style.color = "#00ffcc";
    this.debugHud.style.fontFamily = "monospace";
    this.debugHud.style.fontSize = "11px";
    this.debugHud.style.borderRadius = "6px";
    this.debugHud.style.zIndex = "999";
    this.debugHud.style.pointerEvents = "none";
    this.debugHud.style.backdropFilter = "blur(4px)";
    this.container.appendChild(this.debugHud);

    this.updateDebugHud(this.player.getState());
  }

  private updateDebugHud(state: PlaybackState): void {
    if (!this.debugHud) return;
    this.debugHud.innerHTML = `
      <div><strong>[Cinematic HUD]</strong></div>
      <div>Frame: ${state.currentFrame} / ${state.totalFrames - 1} (${Math.round(state.progress * 100)}%)</div>
      <div>Direction: ${state.direction} | Playing: ${state.isPlaying}</div>
      <div>Target Theme: ${state.targetTheme} | Settled: ${state.isSettled}</div>
    `;
  }

  public destroy(): void {
    if (this.debugHud && this.debugHud.parentElement) {
      this.debugHud.parentElement.removeChild(this.debugHud);
    }
    this.controller.destroy();
  }
}

/**
 * Reusable Web Component definition <cinematic-theme-transition>
 */
export class CinematicThemeTransitionElement extends HTMLElement {
  private instance: CinematicThemeTransition | null = null;

  static get observedAttributes() {
    return ["theme", "debug"];
  }

  connectedCallback() {
    if (!this.instance) {
      const initialTheme = (this.getAttribute("theme") as Theme) || "light";
      const isDebug = this.hasAttribute("debug");

      this.style.display = "block";
      this.style.position = "relative";
      this.style.overflow = "hidden";

      this.instance = new CinematicThemeTransition(this, {
        initialTheme,
        debug: isDebug,
      });
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue || !this.instance) return;

    if (name === "theme" && (newValue === "light" || newValue === "dark")) {
      this.instance.setTheme(newValue);
    }
  }

  disconnectedCallback() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
}

if (typeof customElements !== "undefined" && !customElements.get("cinematic-theme-transition")) {
  customElements.define("cinematic-theme-transition", CinematicThemeTransitionElement);
}
