/**
 * CinematicLanding.tsx
 *
 * Full-screen cinematic landing layer rendered above the React app.
 * SSR-safe: cinematic modules are loaded via dynamic import() inside useEffect,
 * so the SSR bundle never evaluates any browser-only code (HTMLElement, canvas,
 * ResizeObserver, localStorage, customElements, document, window).
 *
 * Flow:
 *  1. Server renders an empty shell div — no browser APIs touched.
 *  2. Client hydrates, useEffect fires, dynamically imports cinematic classes.
 *  3. Cinematic animation boots, frame sequence plays, slice overlay works.
 *  4. "Explore Platform" CTA fires voltra:enter-platform → onEnter() called
 *     → cinematic unmounts, dashboard fades in.
 */

import { useEffect, useRef, useState } from "react";
import type { Theme } from "./types.ts";

interface CinematicLandingProps {
  onEnter: () => void;
}

export function CinematicLanding({ onEnter }: CinematicLandingProps) {
  const [theme, setTheme] = useState<Theme>("light");

  const shellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLButtonElement>(null);
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useEffect(() => {
    // Dynamic imports — SSR never reaches this code path
    Promise.all([
      import("./CinematicThemeTransition.ts"),
      import("./VoltraDepthText.ts"),
      import("./VoltraSliceSlide.ts"),
    ]).then(([{ CinematicThemeTransition }, { VoltraDepthText }, { VoltraSliceSlide }]) => {
      const shell = shellRef.current;
      const container = containerRef.current;
      if (!shell || !container) return;

      // Read saved theme (safe — we are on the client)
      const saved = (localStorage.getItem("cinematic-theme") ||
        localStorage.getItem("blackout-theme") ||
        "light") as Theme;
      setTheme(saved);

      // Boot cinematic modules
      const cinematic = new CinematicThemeTransition(container, {
        initialTheme: saved,
        fit: "cover",
        storageKey: "cinematic-theme",
        onThemeSettled: (t: Theme) => {
          setTheme(t);
          depthText.setTheme(t);
          sliceSlide.setTheme(t);
        },
      });

      const depthText = new VoltraDepthText(container);
      depthText.setTheme(saved);

      const sliceSlide = new VoltraSliceSlide(shell, {
        sliceCount: 5,
        onOpen: () => exploreRef.current?.classList.add("explore-hidden"),
        onClose: () => exploreRef.current?.classList.remove("explore-hidden"),
      });
      sliceSlide.setTheme(saved);

      // Theme toggle wired via event
      const themeBtn = shell.querySelector<HTMLButtonElement>(".theme-toggle-btn");
      if (themeBtn) {
        themeBtn.addEventListener("click", () => {
          const next = cinematic.toggleTheme();
          setTheme(next);
          depthText.setTheme(next);
          sliceSlide.setTheme(next);
        });
      }

      // Explore pill
      const exploreBtn = exploreRef.current;
      if (exploreBtn) {
        exploreBtn.addEventListener("click", () => sliceSlide.open());
      }

      // Enter-platform event (fired by VoltraSliceSlide CTA)
      const handleEnter = () => onEnterRef.current();
      window.addEventListener("voltra:enter-platform", handleEnter);

      // Store cleanup on the shell element for the return callback
      (shell as HTMLDivElement & { _cinematicCleanup?: () => void })._cinematicCleanup = () => {
        window.removeEventListener("voltra:enter-platform", handleEnter);
        cinematic.destroy();
        depthText.destroy();
        sliceSlide.destroy();
      };
    });

    // Capture ref value at effect time for safe cleanup
    const shellEl = shellRef.current as
      (HTMLDivElement & { _cinematicCleanup?: () => void }) | null;
    return () => {
      shellEl?._cinematicCleanup?.();
    };
  }, []); // runs once on client mount only

  return (
    <div
      ref={shellRef}
      id="cinematic-landing"
      style={{ position: "fixed", inset: 0, zIndex: 9000 }}
    >
      {/* Canvas target for CinematicThemeTransition */}
      <div ref={containerRef} id="cinematicContainer" className="fullscreen-cinematic" />

      {/* Floating theme toggle */}
      <div className="theme-controls">
        <button
          className="theme-toggle-btn"
          aria-label={theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
        >
          <span className="theme-icon">{theme === "dark" ? "☀" : "☾"}</span>
          <span className="theme-label">{theme === "dark" ? "Day Mode" : "Night Mode"}</span>
        </button>
      </div>

      {/* Bottom explore pill */}
      <div className="explore-indicator-container">
        <button
          ref={exploreRef}
          className="explore-trigger-btn"
          aria-label="Explore VOLTRA Grid Intelligence"
        >
          <span className="explore-pulse" />
          <span className="explore-text">Explore Grid Intelligence</span>
          <span className="explore-arrow">↓</span>
        </button>
      </div>
    </div>
  );
}
