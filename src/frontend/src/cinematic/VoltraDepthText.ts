import type { Theme } from "./types.ts";

export interface VoltraSubtitlesConfig {
  left: string[];
  center: string[];
  right: string[];
}

export interface VoltraDepthTextConfig {
  word?: string;
  fontFamily?: string;
  lightFill?: string;
  darkFill?: string;
  subtitles?: Partial<VoltraSubtitlesConfig>;
}

/**
 * High-precision silhouette vertices of the modern architectural house
 * in 2560x1440 coordinate space.
 * Matches the roofline, chimney, glass pavilion apex, right flat eave, and deck.
 */
export const HOUSE_SILHOUETTE_POINTS: [number, number][] = [
  // Ground & left deck
  [0, 1440],
  [0, 1160],
  [176, 1160],
  [176, 1070],
  [415, 1070],
  [415, 792],
  [360, 792],
  [335, 772],
  [333, 760],
  // Slanted roof slope to chimney
  [806, 636],
  [806, 488],
  [954, 488],
  [954, 574],
  // Slanted roof to glass apex
  [1635, 422],
  // Apex downward profile
  [1638, 432],
  [1634, 462],
  [1629, 482],
  [1619, 502],
  [1609, 522],
  [1598, 542],
  [1588, 562],
  [1583, 582],
  [1583, 694],
  // Flat roof to right eave
  [2283, 694],
  [2305, 712],
  [2280, 718],
  [2315, 737],
  [2277, 749],
  // Right wall & deck base
  [2272, 1070],
  [2285, 1070],
  [2285, 1160],
  [2560, 1160],
  [2560, 1440],
];

/**
 * Individual letter coordinates in 2560x1440 space.
 * Carefully tuned to eliminate any O-L merging:
 * 'O' is partly occluded by the chimney on the left,
 * 'L' starts cleanly to the right of the chimney (x >= 1040),
 * perfectly matching the reference editorial layout across desktop and laptops.
 */
/**
 * Letter Y baseline = 560 in 2560x1440 space.
 * This places the top of each glyph (~240px above baseline at size 300)
 * well above the roofline (~422px), so the full upper half of each letter
 * reads cleanly against the sky.
 *
 * Letter spacing is widened to prevent O/L merge around the chimney:
 * O ends ~840, chimney is ~806-954, L starts at 1030 — clean gap.
 */
export const LETTER_LAYOUT: { char: string; x: number; y: number }[] = [
  // Symmetrically centered across the 2560x1440 canvas (spans x=185 to x=2310, center=1247.5px).
  // Aligns harmoniously with the centered architectural house (center=1245.5px).
  // Baseline y=615 ensures the house roofline, chimney, and apex naturally occlude
  // the letters for authentic architectural depth while keeping glyphs bold and legible.
  { char: "V", x: 185,  y: 615 },
  { char: "O", x: 600,  y: 615 },
  { char: "L", x: 1005, y: 615 },
  { char: "T", x: 1250, y: 615 },
  { char: "R", x: 1580, y: 615 },
  { char: "A", x: 1960, y: 615 },
];

/**
 * VoltraDepthText creates an isolated SVG compositing layer where the brand
 * typography and editorial captions sit behind the house silhouette.
 *
 * Scales responsively via preserveAspectRatio="xMidYMid slice" to perfectly
 * match the canvas object-fit: cover behavior across all screen resolutions.
 */
export class VoltraDepthText {
  private container: HTMLElement;
  private svgElement: SVGSVGElement | null = null;
  private currentTheme: Theme = "light";
  private config: {
    word: string;
    fontFamily: string;
    lightFill: string;
    darkFill: string;
    subtitles: VoltraSubtitlesConfig;
  };

  constructor(container: HTMLElement, config?: VoltraDepthTextConfig) {
    this.container = container;
    this.config = {
      word: config?.word ?? "VOLTRA",
      fontFamily:
        config?.fontFamily ??
        "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      lightFill: config?.lightFill ?? "#1c2633",
      darkFill: config?.darkFill ?? "rgba(235, 243, 255, 0.88)",
      subtitles: {
        left: config?.subtitles?.left ?? ["Smarter predictions.", "More reliable power."],
        center: config?.subtitles?.center ?? ["AI-powered", "grid intelligence."],
        right: config?.subtitles?.right ?? ["A more stable", "tomorrow."],
      },
    };

    this.mount();
  }

  private mount(): void {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 2560 1440");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("class", "voltra-depth-svg voltra-theme-light");
    svg.setAttribute("aria-hidden", "true");

    // Definitions: only house occlusion mask needed (fills are CSS solid colors now)
    const defs = document.createElementNS(svgNS, "defs");

    // House Occlusion Mask
    const mask = document.createElementNS(svgNS, "mask");
    mask.setAttribute("id", "houseOcclusionMask");

    // White base: everything outside the house is fully visible
    const baseRect = document.createElementNS(svgNS, "rect");
    baseRect.setAttribute("x", "0");
    baseRect.setAttribute("y", "0");
    baseRect.setAttribute("width", "2560");
    baseRect.setAttribute("height", "1440");
    baseRect.setAttribute("fill", "#ffffff");
    mask.appendChild(baseRect);

    // Black house polygon: cuts out the house silhouette so the text is occluded
    const poly = document.createElementNS(svgNS, "polygon");
    const pointsStr = HOUSE_SILHOUETTE_POINTS.map((p) => `${p[0]},${p[1]}`).join(" ");
    poly.setAttribute("points", pointsStr);
    poly.setAttribute("fill", "#000000");
    mask.appendChild(poly);

    defs.appendChild(mask);
    svg.appendChild(defs);

    // Subtitles Layer (Unmasked, crisp editorial captions directly above letters)
    const subtitlesGroup = document.createElementNS(svgNS, "g");
    subtitlesGroup.setAttribute("class", "voltra-subtitles");

    // Left Subtitle (Aligned with 'V' at x=185)
    subtitlesGroup.appendChild(
      this.createSubtitleElement(svgNS, 185, 208, this.config.subtitles.left, "start")
    );
    // Center Subtitle (Symmetrically centered at x=1250 across house apex and viewport)
    subtitlesGroup.appendChild(
      this.createSubtitleElement(svgNS, 1250, 208, this.config.subtitles.center, "middle")
    );
    // Right Subtitle (Aligned with 'A' right edge at x=2310)
    subtitlesGroup.appendChild(
      this.createSubtitleElement(svgNS, 2310, 208, this.config.subtitles.right, "end")
    );

    svg.appendChild(subtitlesGroup);

    // VOLTRA Depth Typography Group (Masked by House Silhouette)
    const typographyGroup = document.createElementNS(svgNS, "g");
    typographyGroup.setAttribute("class", "voltra-brand-group");
    typographyGroup.setAttribute("mask", "url(#houseOcclusionMask)");

    for (const item of LETTER_LAYOUT) {
      const textEl = document.createElementNS(svgNS, "text");
      textEl.setAttribute("x", item.x.toString());
      textEl.setAttribute("y", item.y.toString());
      textEl.setAttribute("class", "voltra-letter");
      textEl.setAttribute("font-family", this.config.fontFamily);
      textEl.setAttribute("font-weight", "800");
      textEl.setAttribute("font-size", "410");
      textEl.textContent = item.char;
      typographyGroup.appendChild(textEl);
    }

    svg.appendChild(typographyGroup);

    this.container.appendChild(svg);
    this.svgElement = svg;
  }

  private createSubtitleElement(
    ns: string,
    x: number,
    y: number,
    lines: string[],
    textAnchor: "start" | "middle" | "end"
  ): SVGTextElement {
    const text = document.createElementNS(ns, "text") as SVGTextElement;
    text.setAttribute("x", x.toString());
    text.setAttribute("y", y.toString());
    text.setAttribute("class", "voltra-subtitle-text");
    text.setAttribute("text-anchor", textAnchor);
    text.setAttribute("font-family", this.config.fontFamily);
    text.setAttribute("font-size", "28");
    text.setAttribute("font-weight", "500");
    text.setAttribute("letter-spacing", "0.5");

    lines.forEach((line, index) => {
      const tspan = document.createElementNS(ns, "tspan");
      tspan.setAttribute("x", x.toString());
      if (index > 0) {
        tspan.setAttribute("dy", "34");
      }
      tspan.textContent = line;
      text.appendChild(tspan);
    });

    return text;
  }

  /**
   * Set theme state ('light' | 'dark').
   * Smoothly updates fill and styles.
   */
  public setTheme(theme: Theme): void {
    this.currentTheme = theme;
    if (!this.svgElement) return;

    if (theme === "dark") {
      this.svgElement.classList.remove("voltra-theme-light");
      this.svgElement.classList.add("voltra-theme-dark");
    } else {
      this.svgElement.classList.remove("voltra-theme-dark");
      this.svgElement.classList.add("voltra-theme-light");
    }
  }

  public getTheme(): Theme {
    return this.currentTheme;
  }

  public destroy(): void {
    if (this.svgElement && this.svgElement.parentElement) {
      this.svgElement.parentElement.removeChild(this.svgElement);
      this.svgElement = null;
    }
  }
}
