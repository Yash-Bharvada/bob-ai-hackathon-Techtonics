import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Theme } from "./types.ts";

interface CinematicLandingProps {
  children: React.ReactNode;
  isHomePage?: boolean;
}

const HOUSE_POINTS =
  "0,1440 0,1160 176,1160 176,1070 415,1070 415,792 360,792 335,772 333,760 806,636 806,488 954,488 954,574 1635,422 1638,432 1634,462 1629,482 1619,502 1609,522 1598,542 1588,562 1583,582 1583,694 2283,694 2305,712 2280,718 2315,737 2277,749 2272,1070 2285,1070 2285,1160 2560,1160 2560,1440";

const LETTERS = [
  { char: "V", x: 185, y: 615 },
  { char: "O", x: 600, y: 615 },
  { char: "L", x: 1005, y: 615 },
  { char: "T", x: 1250, y: 615 },
  { char: "R", x: 1580, y: 615 },
  { char: "A", x: 1960, y: 615 },
];

export function CinematicLanding({ children, isHomePage = true }: CinematicLandingProps) {
  if (!isHomePage) {
    return <>{children}</>;
  }

  const [theme, setTheme] = useState<Theme>("light");
  const [isSliceOpen, setIsSliceOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

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

  return (
    <div
      id="cinematicLandingLayer"
      className={`cinematic-landing-root ${isSliceOpen ? "slice-is-active" : ""}`}
    >
      {/* 3D Canvas + SVG Depth Mask Typography */}
      <div
        ref={containerRef}
        id="cinematicContainer"
        className="fullscreen-cinematic"
        aria-hidden={isSliceOpen}
      >
        {/* Instant first-frame fallback image so screen is never black */}
        <img
          src={theme === "dark" ? "/assets/cinematic/last-frame.webp" : "/assets/cinematic/first-frame.webp"}
          alt="VOLTRA Architectural Scene"
          className="cinematic-fallback-frame"
        />

        {/* Crisp SVG Depth Typography with Roofline Occlusion Mask */}
        <svg
          viewBox="0 0 2560 1440"
          preserveAspectRatio="xMidYMid slice"
          className={`voltra-depth-svg voltra-theme-${theme}`}
          aria-hidden="true"
        >
          <defs>
            <mask id="houseOcclusionMask">
              <rect x="0" y="0" width="2560" height="1440" fill="#ffffff" />
              <polygon points={HOUSE_POINTS} fill="#000000" />
            </mask>
          </defs>

          {/* Subtitles */}
          <g className="voltra-subtitles">
            <text x="185" y="208" textAnchor="start" className="voltra-subtitle-text" fontSize="28">
              <tspan x="185" dy="0">Smarter predictions.</tspan>
              <tspan x="185" dy="36">More reliable power.</tspan>
            </text>
            <text x="1250" y="208" textAnchor="middle" className="voltra-subtitle-text" fontSize="28">
              <tspan x="1250" dy="0">AI-powered</tspan>
              <tspan x="1250" dy="36">grid intelligence.</tspan>
            </text>
            <text x="2310" y="208" textAnchor="end" className="voltra-subtitle-text" fontSize="28">
              <tspan x="2310" dy="0">A more stable</tspan>
              <tspan x="2310" dy="36">tomorrow.</tspan>
            </text>
          </g>

          {/* VOLTRA Masked Typography */}
          <g className="voltra-brand-group" mask="url(#houseOcclusionMask)">
            {LETTERS.map((item) => (
              <text
                key={item.char + item.x}
                x={item.x}
                y={item.y}
                className="voltra-letter"
                fontFamily="'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                fontWeight="800"
                fontSize="410"
              >
                {item.char}
              </text>
            ))}
          </g>
        </svg>
      </div>

      {/* Minimal Glassmorphic Day/Night Theme Controls */}
      <div className={`theme-controls ${isSliceOpen ? "theme-controls-slice-open" : ""}`}>
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
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg
              className="theme-svg transition-transform duration-300 group-hover:-rotate-12"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </div>

      {/* ================================================================
          VOLTRA "SLICE & DICER" APPROACHING SYSTEM
          Contains 5 vertical sliced strips.
          DIRECTLY inside this sliced dice page, the React frontend starts!
         ================================================================ */}
      <div
        ref={sliceOverlayRef}
        id="voltraSliceOverlay"
        className={`voltra-slice-overlay slice-theme-${theme} ${
          isSliceOpen ? "slice-approaching" : isLeaving ? "slice-leaving" : ""
        }`}
        role="region"
        aria-label="VOLTRA Grid Intelligence Platform"
      >
        {/* 5 Vertical Slices */}
        <div className="voltra-slice-strips">
          <div className="slice-strip strip-1" />
          <div className="slice-strip strip-2" />
          <div className="slice-strip strip-3" />
          <div className="slice-strip strip-4" />
          <div className="slice-strip strip-5" />
        </div>

        {/* Foreground Content Layer — DIRECTLY STARTS THE FRONTEND! */}
        <div ref={sliceContentRef} className="voltra-slice-content">

          {/* ================================================================
              DIRECTLY THE SECOND IMAGE PART: The React Frontend Starts Here!
             ================================================================ */}
          <div id="voltra-frontend-app" className="voltra-frontend-content-boundary">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
