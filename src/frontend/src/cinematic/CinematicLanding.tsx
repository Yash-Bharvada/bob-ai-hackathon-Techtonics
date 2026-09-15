import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Theme } from "./types.ts";

interface CinematicLandingProps {
  children: React.ReactNode;
  isHomePage?: boolean;
}

/**
 * HOUSE_POINTS — polygon tracing the house roofline + base in the 2560×1440 SVG coordinate space.
 * Used for two purposes:
 *   1. clip-path on the "house foreground layer" — clips the photo copy to show only the house.
 *   2. No longer used as an occlusion mask on the text (that approach hid letters inside the house
 *      but still left them visually on top in the z-order).
 *
 * The polygon is expressed as a percentage-based clip-path string for the CSS layer so it
 * scales correctly with the viewport. We keep the raw numeric coords for reference.
 */
const HOUSE_POLYGON_COORDS: [number, number][] = [
  [0, 1440], [0, 1160], [176, 1160], [176, 1070], [415, 1070], [415, 792],
  [360, 792], [335, 772], [333, 760], [806, 636], [806, 488], [954, 488],
  [954, 574], [1635, 422], [1638, 432], [1634, 462], [1629, 482], [1619, 502],
  [1609, 522], [1598, 542], [1588, 562], [1583, 582], [1583, 694],
  [2283, 694], [2305, 712], [2280, 718], [2315, 737], [2277, 749],
  [2272, 1070], [2285, 1070], [2285, 1160], [2560, 1160], [2560, 1440],
];

const W = 2560;
const H = 1440;

/** Convert the polygon to CSS clip-path percentage values. */
const HOUSE_CLIP_PATH =
  "polygon(" +
  HOUSE_POLYGON_COORDS.map(([x, y]) => `${((x / W) * 100).toFixed(3)}% ${((y / H) * 100).toFixed(3)}%`).join(", ") +
  ")";

/** SVG polygon points string (same coords) for the SVG layer. */
const HOUSE_SVG_POINTS = HOUSE_POLYGON_COORDS.map(([x, y]) => `${x},${y}`).join(" ");

/*
 * LETTER POSITIONING — 2560×1440 SVG coordinate space.
 *
 * Target: match reference Image 2 — VOLTRA spans ≈86% of the 2560px viewBox
 * width (≈179px margin each side), at fontSize=340.
 *
 * Plus Jakarta Sans ExtraBold 800 advance widths at fontSize=340
 * (scaled from measured 420px values × 340/420 = 0.810):
 *   V ≈ 235   O ≈ 268   L ≈ 195   T ≈ 211   R ≈ 235   A ≈ 251
 *   Total glyph width ≈ 1395
 *   Total span goal = 2202px  →  5 inter-letter gaps × 161px each
 *
 * Positions (textAnchor="start"):
 *   V  x=179            ends ≈  414
 *   O  x=575            ends ≈  843   gap from V end: 161
 *   L  x=1004           ends ≈ 1199   gap from O end: 161
 *   T  x=1360           ends ≈ 1571   gap from L end: 161
 *   R  x=1732           ends ≈ 1967   gap from T end: 161
 *   A  x=2128           ends ≈ 2379   gap from R end: 161
 *
 * y=610 positions the baseline slightly higher in frame so the house
 * roof intersects the lower portion of the letters (matches reference).
 */
const FONT_SIZE = 340;
const LETTERS = [
  { char: "V", x: 179,  y: 610 },
  { char: "O", x: 575,  y: 610 },
  { char: "L", x: 1004, y: 610 },
  { char: "T", x: 1360, y: 610 },
  { char: "R", x: 1732, y: 610 },
  { char: "A", x: 2128, y: 610 },
];

export function CinematicLanding({ children, isHomePage = true }: CinematicLandingProps) {
  if (!isHomePage) {
    return <>{children}</>;
  }
  return <CinematicLandingInner>{children}</CinematicLandingInner>;
}

function CinematicLandingInner({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [isSliceOpen, setIsSliceOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );

  // containerRef — the div that receives the canvas from CinematicFrameSequence
  const containerRef = useRef<HTMLDivElement>(null);
  const sliceOverlayRef = useRef<HTMLDivElement>(null);
  const sliceContentRef = useRef<HTMLDivElement>(null);
  const cinematicRef = useRef<any>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("cinematic-theme", newTheme);
    }
  }, []);

  const handleOpenSlice = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsLeaving(false);
    setIsSliceOpen(true);
  }, []);

  const handleCloseSlice = useCallback(() => {
    setIsLeaving(true);
    setIsSliceOpen(false);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setIsLeaving(false);
    }, 850);
  }, []);

  const handleToggleTheme = useCallback(() => {
    if (cinematicRef.current) {
      const nextTheme = cinematicRef.current.toggleTheme();
      updateTheme(nextTheme);
    } else {
      updateTheme(theme === "dark" ? "light" : "dark");
    }
  }, [theme, updateTheme]);

  // Track mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Initialize interactive frame player on client
  useEffect(() => {
    const savedTheme = (typeof localStorage !== "undefined" &&
      (localStorage.getItem("cinematic-theme") ||
        localStorage.getItem("blackout-theme") ||
        "light")) as Theme;

    updateTheme(savedTheme);

    let isCleanedUp = false;

    import("./CinematicThemeTransition.ts")
      .then(({ CinematicThemeTransition }) => {
        if (isCleanedUp || !containerRef.current) return;

        const cinematic = new CinematicThemeTransition(containerRef.current, {
          initialTheme: savedTheme,
          fit: "cover",
          storageKey: "cinematic-theme",
          onFrameChange: (state) => {
            if (state.targetTheme !== theme) {
              setTheme(state.targetTheme);
            }
          },
          onThemeSettled: (settledTheme: Theme) => {
            updateTheme(settledTheme);
          },
        });

        cinematicRef.current = cinematic;
      })
      .catch((err) => {
        console.error("[Cinematic] Failed to load frame transition engine:", err);
      });

    return () => {
      isCleanedUp = true;
      if (cinematicRef.current) {
        cinematicRef.current.destroy();
        cinematicRef.current = null;
      }
    };
  }, [updateTheme]);

  // Window wheel / touch scroll listener for slice transition
  useEffect(() => {
    let wheelAcc = 0;
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;

    const handleWheel = (e: WheelEvent) => {
      if (!isSliceOpen && e.deltaY > 20) {
        wheelAcc += e.deltaY;
        if (wheelAcc > 40) {
          handleOpenSlice();
          wheelAcc = 0;
        }
        if (wheelTimer) clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          wheelAcc = 0;
        }, 350);
      } else if (isSliceOpen && e.deltaY < -30) {
        const content = sliceContentRef.current;
        if (content && content.scrollTop <= 5) {
          handleCloseSlice();
        }
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const delta = touchStartY - e.changedTouches[0].clientY;
      if (!isSliceOpen && delta > 40) {
        handleOpenSlice();
      } else if (isSliceOpen && delta < -40) {
        const content = sliceContentRef.current;
        if (content && content.scrollTop <= 5) {
          handleCloseSlice();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSliceOpen) {
        handleCloseSlice();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
      if (wheelTimer) clearTimeout(wheelTimer);
    };
  }, [isSliceOpen, handleOpenSlice, handleCloseSlice]);

  /* ── Shared theme-toggle button ── */
  const themeToggle = (
    <button
      id="themeToggle"
      className="theme-toggle-btn group"
      aria-label={theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
      title={theme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
      onClick={handleToggleTheme}
    >
      {theme === "dark" ? (
        <svg
          className="theme-svg transition-transform duration-300 group-hover:rotate-45"
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          className="theme-svg transition-transform duration-300 group-hover:-rotate-12"
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );

  /* ── Current frame image src ── */
  const frameSrc = theme === "dark"
    ? "/assets/cinematic/last-frame.webp"
    : "/assets/cinematic/first-frame.webp";

  /*
   * ═══════════════════════════════════════════════════════════════════
   * CORRECT LAYER ORDER (bottom → top):
   *
   *  Layer 1  [z-index: 1]  Canvas (animated photo — full bleed)
   *  Layer 2  [z-index: 2]  Fallback img (static first/last frame — full bleed,
   *                          shown until canvas is ready)
   *  Layer 3  [z-index: 3]  VOLTRA SVG typography (BEHIND the house)
   *  Layer 4  [z-index: 4]  House foreground img — same photo, clipped to the
   *                          house polygon via clip-path so ONLY the house shows.
   *                          This makes the house appear IN FRONT of the letters.
   *  Layer 5  [z-index: 5]  Subtitles SVG overlay
   *  Layer 6  [z-index: 6]  Theme toggle / UI
   *
   * The "house foreground" layer is the key addition. It is the identical
   * fallback image cropped to the house outline. The canvas is NOT clipped —
   * it shows the full scene. The clipped copy sits on top of VOLTRA so the
   * house literally occludes the letters.
   * ═══════════════════════════════════════════════════════════════════
   */
  const cinematicScene = (mobileMode: boolean) => (
    <div
      ref={mobileMode === isMobile ? containerRef : undefined}
      id="cinematicContainer"
      className="fullscreen-cinematic"
      aria-hidden={isSliceOpen}
    >
      {/*
       * LAYER 1+2: Canvas (injected by CinematicFrameSequence) + static fallback.
       * Both are absolute, inset-0, z-index 1/2, object-fit cover.
       * The canvas gets z=1, the fallback img gets z=2 so it shows immediately.
       * Once the canvas paints its first frame, the fallback is behind it.
       * We actually want the fallback OVER the canvas initially:
       * we give fallback z=2 and canvas itself (via JS class) z=1.
       */}
      <img
        src={frameSrc}
        alt=""
        aria-hidden="true"
        className="cinematic-fallback-frame"
      />

      {/*
       * LAYER 3: VOLTRA giant typography — sits ABOVE the photo canvas but
       * BELOW the house clip layer. Letters are pure dark fills, no opacity tricks.
       */}
      <svg
        viewBox="0 0 2560 1440"
        preserveAspectRatio="xMidYMid slice"
        className={`voltra-letters-svg voltra-theme-${theme}`}
        aria-hidden="true"
      >
        <g className="voltra-brand-group">
          {LETTERS.map((item) => (
            <text
              key={item.char + item.x}
              x={item.x}
              y={item.y}
              className="voltra-letter"
              fontFamily="'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              fontWeight="800"
              fontSize={FONT_SIZE}
              textAnchor="start"
            >
              {item.char}
            </text>
          ))}
        </g>
      </svg>

      {/*
       * LAYER 4: House foreground — the SAME image clipped to the house polygon.
       * This is the critical layer that makes the house appear IN FRONT of VOLTRA.
       * clip-path uses the same polygon converted to percentages so it scales
       * correctly as the container resizes.
       */}
      <img
        src={frameSrc}
        alt=""
        aria-hidden="true"
        className="cinematic-house-layer"
        style={{ clipPath: HOUSE_CLIP_PATH }}
      />

      {/*
       * LAYER 5: Supporting subtitle text in the sky area.
       * Positioned above the house layer so it appears in the sky.
       */}
      <svg
        viewBox="0 0 2560 1440"
        preserveAspectRatio="xMidYMid slice"
        className={`voltra-subtitles-svg voltra-theme-${theme}`}
        aria-hidden="true"
      >
        <g className="voltra-subtitles">
          <text x="5.5%" y="14%" textAnchor="start" className="voltra-subtitle-text" fontSize="28">
            <tspan x="5.5%" dy="0">Smarter predictions.</tspan>
            <tspan x="5.5%" dy="38">More reliable power.</tspan>
          </text>
          <text x="50%" y="14%" textAnchor="middle" className="voltra-subtitle-text" fontSize="28">
            <tspan x="50%" dy="0">AI-powered</tspan>
            <tspan x="50%" dy="38">grid intelligence.</tspan>
          </text>
          <text x="94.5%" y="14%" textAnchor="end" className="voltra-subtitle-text" fontSize="28">
            <tspan x="94.5%" dy="0">A more stable</tspan>
            <tspan x="94.5%" dy="38">tomorrow.</tspan>
          </text>
        </g>
      </svg>
    </div>
  );

  /* ── Slice overlay ── */
  const sliceOverlay = (
    <div
      ref={sliceOverlayRef}
      id="voltraSliceOverlay"
      className={`voltra-slice-overlay slice-theme-${theme} ${
        isSliceOpen ? "slice-approaching" : isLeaving ? "slice-leaving" : ""
      }`}
      role="region"
      aria-label="VOLTRA Grid Intelligence Platform"
    >
      <div className="voltra-slice-strips">
        <div className="slice-strip strip-1" />
        <div className="slice-strip strip-2" />
        <div className="slice-strip strip-3" />
        <div className="slice-strip strip-4" />
        <div className="slice-strip strip-5" />
      </div>
      <div ref={sliceContentRef} className="voltra-slice-content">
        <div id="voltra-frontend-app" className="voltra-frontend-content-boundary">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div
      id="cinematicLandingLayer"
      className={`cinematic-landing-root ${isSliceOpen ? "slice-is-active" : ""}`}
    >
      {/* ── MOBILE shell (≤640 px) ─────────────────────────────────────── */}
      <div className="cinematic-mobile-shell">
        {/* Top branding band */}
        <div className="cinematic-mobile-top">
          <span className="cinematic-mobile-wordmark">Voltra</span>
          <div className="cinematic-mobile-bolt-line">
            <span className="line-seg" />
            <svg className="cinematic-mobile-bolt" width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">
              <path d="M8 0L0 11h6l-1 9 8-12H7L8 0z" fill="currentColor" opacity="0.7" />
            </svg>
            <span className="line-seg" />
          </div>
          <p className="cinematic-mobile-tagline">Predict&nbsp;/&nbsp;Balance&nbsp;/&nbsp;Power</p>
          <p className="cinematic-mobile-tagline" style={{ marginTop: 0, letterSpacing: "2px" }}>AI for a more resilient grid</p>
        </div>

        {/* 16:9 framed card with correct layer order */}
        <div className="cinematic-mobile-frame">
          {cinematicScene(true)}
          <div style={{ position: "absolute", top: 10, right: 10, zIndex: 20 }}>
            {themeToggle}
          </div>
          {!isSliceOpen && (
            <div className="cinematic-mobile-swipe">
              <span>swipe up</span>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
                <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Bottom branding band */}
        <div className="cinematic-mobile-bottom">
          <div className="cinematic-mobile-bolt-line">
            <span className="line-seg" />
            <svg width="120" height="16" viewBox="0 0 120 16" fill="none" aria-hidden="true" style={{ opacity: 0.22 }}>
              <path d="M60 8 H40 V2 H10" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
              <path d="M60 8 H80 V2 H110" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
              <circle cx="60" cy="8" r="2" fill="white" opacity="0.7" />
            </svg>
            <span className="line-seg" />
          </div>
          <p className="cinematic-mobile-bottom-copy">
            Cleaner energy.<br />Stronger communities.
          </p>
          <div className="cinematic-mobile-bolt-line">
            <span className="line-seg" />
            <svg className="cinematic-mobile-bolt" width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">
              <path d="M8 0L0 11h6l-1 9 8-12H7L8 0z" fill="currentColor" opacity="0.6" />
            </svg>
            <span className="line-seg" />
          </div>
          <span className="cinematic-mobile-bottom-wordmark">Voltra</span>
        </div>
      </div>

      {/* ── DESKTOP shell (>640 px) ────────────────────────────────────── */}
      <div className="cinematic-desktop-shell">
        {cinematicScene(false)}
        <div className={`theme-controls ${isSliceOpen ? "theme-controls-slice-open" : ""}`}>
          {themeToggle}
        </div>
      </div>

      {sliceOverlay}
    </div>
  );
}

/* Export polygon string for potential use by other modules */
export { HOUSE_SVG_POINTS, HOUSE_CLIP_PATH };
