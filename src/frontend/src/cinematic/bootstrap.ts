/**
 * bootstrap.ts
 * Initialises the cinematic landing layer on top of the React app.
 *
 * Flow:
 *   1. A fixed fullscreen #cinematic-landing div is injected over the React root.
 *   2. The frame-sequence, depth text and slice-slide are mounted inside it.
 *   3. When the user clicks "Explore Platform" (or the slice CTA), a
 *      "voltra:enter-platform" CustomEvent is fired.
 *   4. The cinematic layer fades out and is removed; the React root fades in.
 */

import { CinematicThemeTransition } from "./CinematicThemeTransition.ts";
import { VoltraDepthText } from "./VoltraDepthText.ts";
import { VoltraSliceSlide } from "./VoltraSliceSlide.ts";
import type { Theme } from "./types.ts";

export function mountCinematicLanding(): void {
  // ── 1. Create fullscreen landing shell ────────────────────────────────────
  const shell = document.createElement("div");
  shell.id = "cinematic-landing";
  shell.style.cssText =
    "position:fixed;inset:0;z-index:9000;background:#000;opacity:1;" +
    "transition:opacity 0.65s cubic-bezier(0.4,0,0.2,1);";

  // Cinematic canvas container
  const container = document.createElement("main");
  container.id = "cinematicContainer";
  container.className = "fullscreen-cinematic";
  shell.appendChild(container);

  // Floating theme toggle
  const themeControls = document.createElement("div");
  themeControls.className = "theme-controls";
  themeControls.innerHTML = `
    <button id="themeToggle" class="theme-toggle-btn" aria-label="Toggle Day / Night theme">
      <span class="theme-icon" id="themeIcon">☾</span>
      <span class="theme-label" id="themeLabel">Night Mode</span>
    </button>`;
  shell.appendChild(themeControls);

  // Bottom explore pill
  const exploreContainer = document.createElement("div");
  exploreContainer.className = "explore-indicator-container";
  exploreContainer.innerHTML = `
    <button id="exploreTrigger" class="explore-trigger-btn" aria-label="Explore VOLTRA Grid Intelligence">
      <span class="explore-pulse"></span>
      <span class="explore-text">Explore Grid Intelligence</span>
      <span class="explore-arrow">↓</span>
    </button>`;
  shell.appendChild(exploreContainer);

  document.body.insertBefore(shell, document.body.firstChild);

  // ── 2. Grab DOM refs ───────────────────────────────────────────────────────
  const themeToggle = shell.querySelector<HTMLButtonElement>("#themeToggle")!;
  const themeIcon = shell.querySelector<HTMLElement>("#themeIcon")!;
  const themeLabel = shell.querySelector<HTMLElement>("#themeLabel")!;
  const exploreTrigger = shell.querySelector<HTMLButtonElement>("#exploreTrigger")!;

  // ── 3. Saved theme ─────────────────────────────────────────────────────────
  const savedTheme = (localStorage.getItem("cinematic-theme") ||
    localStorage.getItem("blackout-theme") ||
    "light") as Theme;

  // ── 4. Boot cinematic modules ──────────────────────────────────────────────
  const cinematic = new CinematicThemeTransition(container, {
    initialTheme: savedTheme,
    fit: "cover",
    storageKey: "cinematic-theme",
    onFrameChange: (state) => {
      if (themeToggle) {
        themeToggle.setAttribute(
          "aria-label",
          state.targetTheme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode",
        );
      }
    },
    onThemeSettled: (settledTheme) => {
      updateToggleButton(settledTheme);
      voltraDepthText.setTheme(settledTheme);
      voltraSliceSlide.setTheme(settledTheme);
    },
  });

  const voltraDepthText = new VoltraDepthText(container);
  voltraDepthText.setTheme(savedTheme);

  const voltraSliceSlide = new VoltraSliceSlide(shell, {
    sliceCount: 5,
    onOpen: () => exploreTrigger.classList.add("explore-hidden"),
    onClose: () => exploreTrigger.classList.remove("explore-hidden"),
  });
  voltraSliceSlide.setTheme(savedTheme);

  exploreTrigger.addEventListener("click", () => voltraSliceSlide.open());

  themeToggle.addEventListener("click", () => {
    const next = cinematic.toggleTheme();
    updateToggleButton(next);
  });

  updateToggleButton(savedTheme);

  // ── 5. Listen for "enter-platform" event ──────────────────────────────────
  window.addEventListener("voltra:enter-platform", () => {
    // Fade out the cinematic shell
    shell.style.opacity = "0";
    shell.style.pointerEvents = "none";

    // Reveal the React root (it is hidden with opacity:0 by styles.css initially)
    const reactRoot = document.getElementById("root");
    if (reactRoot) {
      reactRoot.style.transition = "opacity 0.65s cubic-bezier(0.4,0,0.2,1)";
      reactRoot.style.opacity = "1";
    }

    // Destroy cinematic layer after transition
    setTimeout(() => {
      cinematic.destroy();
      voltraDepthText.destroy();
      voltraSliceSlide.destroy();
      shell.remove();
      // Restore normal body scroll
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }, 700);
  });

  // ── helper ─────────────────────────────────────────────────────────────────
  function updateToggleButton(theme: Theme): void {
    const isDark = theme === "dark";
    themeIcon.textContent = isDark ? "☀" : "☾";
    themeLabel.textContent = isDark ? "Day Mode" : "Night Mode";
    themeToggle.setAttribute("aria-label", isDark ? "Switch to Day Mode" : "Switch to Night Mode");
  }
}
