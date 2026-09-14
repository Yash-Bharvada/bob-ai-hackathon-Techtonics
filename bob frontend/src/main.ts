import { CinematicThemeTransition, VoltraDepthText, VoltraSliceSlide } from "./cinematic/index.ts";
import type { Theme } from "./cinematic/types.ts";

declare global {
  interface Window {
    cinematicTransition?: CinematicThemeTransition;
    voltraDepthText?: VoltraDepthText;
    voltraSliceSlide?: VoltraSliceSlide;
  }
}

const container = document.getElementById("cinematicContainer");
const themeToggle = document.getElementById("themeToggle") as HTMLButtonElement | null;
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");
const exploreTrigger = document.getElementById("exploreTrigger") as HTMLButtonElement | null;

let cinematic: CinematicThemeTransition | null = null;
let voltraDepthText: VoltraDepthText | null = null;
let voltraSliceSlide: VoltraSliceSlide | null = null;

if (container) {
  // Read saved theme or default to light
  const savedTheme = (localStorage.getItem("cinematic-theme") || localStorage.getItem("blackout-theme") || "light") as Theme;

  // Initialize the Frame Player
  cinematic = new CinematicThemeTransition(container, {
    initialTheme: savedTheme,
    fit: "cover",
    storageKey: "cinematic-theme",
    onFrameChange: (state) => {
      if (voltraDepthText && state.targetTheme !== voltraDepthText.getTheme()) {
        voltraDepthText.setTheme(state.targetTheme);
      }
      if (voltraSliceSlide && state.targetTheme !== voltraSliceSlide.getTheme()) {
        voltraSliceSlide.setTheme(state.targetTheme);
      }
      if (themeToggle) {
        themeToggle.setAttribute(
          "aria-label",
          state.targetTheme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"
        );
      }
    },
    onThemeSettled: (settledTheme) => {
      updateToggleButton(settledTheme);
      voltraDepthText?.setTheme(settledTheme);
      voltraSliceSlide?.setTheme(settledTheme);
      console.log(`[Cinematic] Settled at ${settledTheme.toUpperCase()} mode.`);
    },
  });

  // Initialize the Architectural Typography Depth Layer
  voltraDepthText = new VoltraDepthText(container);
  voltraDepthText.setTheme(savedTheme);

  // Initialize the Slice & Dicer Approaching Branded Slide
  voltraSliceSlide = new VoltraSliceSlide(document.body, {
    sliceCount: 5,
    onOpen: () => {
      if (exploreTrigger) {
        exploreTrigger.classList.add("explore-hidden");
      }
    },
    onClose: () => {
      if (exploreTrigger) {
        exploreTrigger.classList.remove("explore-hidden");
      }
    },
  });
  voltraSliceSlide.setTheme(savedTheme);

  if (exploreTrigger) {
    exploreTrigger.addEventListener("click", () => {
      voltraSliceSlide?.open();
    });
  }

  window.cinematicTransition = cinematic;
  window.voltraDepthText = voltraDepthText;
  window.voltraSliceSlide = voltraSliceSlide;
}

function updateToggleButton(theme: Theme): void {
  const isDark = theme === "dark";
  if (themeIcon) {
    themeIcon.textContent = isDark ? "☀" : "☾";
  }
  if (themeLabel) {
    themeLabel.textContent = isDark ? "Day Mode" : "Night Mode";
  }
  if (themeToggle) {
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to Day Mode" : "Switch to Night Mode"
    );
  }
}

// Set initial toggle button text
const currentTheme = (localStorage.getItem("cinematic-theme") || localStorage.getItem("blackout-theme") || "light") as Theme;
updateToggleButton(currentTheme);

if (themeToggle && cinematic) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = cinematic!.toggleTheme();
    updateToggleButton(nextTheme);
  });
}

console.log("[Cinematic] Fullscreen Day/Night theme system ready.");
