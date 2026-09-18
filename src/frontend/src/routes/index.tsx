import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Activity, AlertTriangle, ArrowRight, ArrowUpRight, BrainCircuit, Check, ChevronDown, Clock3, CloudLightning, Database, Gauge, LogIn, Radio, ShieldCheck, Zap, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GridDiagram } from "@/components/GridDiagram";
import { TX115InterventionBanner } from "@/components/TX115InterventionBanner";
import { techtonicsApi, type RankedAsset } from "@/lib/techtonicsApi";
import { authSession } from "@/lib/authSession";
import { safeParseShap } from "@/lib/gridData";
import homeImage from "@/assets/voltra-home.jpeg";
import gridImage from "@/assets/voltra-grid.jpg";
import engineerImg from "@/assets/pipeline-engineer.jpg";
import substationImg from "@/assets/pipeline-substation.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "VOLTRA — Predictive Grid Intelligence · Techtonics" },
    { name: "description", content: "VOLTRA combines two trained ML models (Health Index regression + DGA classification) to forecast outages before equipment failure." },
    { property: "og:title", content: "VOLTRA — Predictive Grid Intelligence" },
    { property: "og:description", content: "The lights have not gone out yet. VOLTRA sees that they are going to." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Home,
});

const defaultHistory = [
  { time: "Day 03", load: 58, health: 95 },
  { time: "Day 09", load: 59, health: 94 },
  { time: "Day 15", load: 60, health: 94 },
  { time: "Day 21", load: 62, health: 93 },
  { time: "Day 27", load: 61, health: 93 },
  { time: "Day 33", load: 63, health: 92 },
  { time: "Day 39", load: 64, health: 91 },
  { time: "Day 45", load: 63, health: 90 },
  { time: "Day 51", load: 66, health: 89 },
  { time: "Day 57", load: 68, health: 87 },
  { time: "Day 63", load: 72, health: 84 },
  { time: "Day 69", load: 78, health: 76 },
  { time: "Day 75", load: 86, health: 52 },
  { time: "Day 78", load: 92, health: 26 }, // Peak thermal arcing event
  { time: "Day 81", load: 62, health: 58 }, // Load curtailment & fan overhaul
  { time: "Day 85", load: 60, health: 76 },
  { time: "Day 89", load: 59, health: 86 }, // Stabilized
];

function Home() {
  const [txHistory, setTxHistory] = useState(defaultHistory);
  const [topAsset, setTopAsset] = useState<RankedAsset | null>(null);
  const [gridMetrics, setGridMetrics] = useState({
    assetsMonitored: "18",
    criticalCount: "02",
    criticalAssets: "TX-107, TX-112",
    watchCount: "02",
    meanRul: "89.4d",
  });

  useEffect(() => {
    techtonicsApi.getTimeseries("TX-115").then((res) => {
      if (res.timeseries?.length) {
        const sampled = res.timeseries
          .filter((_, i) => i % 3 === 0 || i === res.timeseries.length - 1)
          .map((pt) => ({
            time: `Day ${pt.day}`,
            load: Math.round(pt.load_percentage || 60),
            health: Math.round(Math.max(5, Math.min(99, 100 - (pt["Health index"] ?? pt.health_index ?? 36)))),
          }));
        setTxHistory(sampled);
      }
    }).catch(() => {});

    techtonicsApi.getRanked().then((res) => {
      if (res.ranked_assets?.length) {
        const assets = res.ranked_assets;
        setTopAsset(assets[0]);
        const critical = assets.filter((a) => a.risk_tier === "HIGH" || a.risk_tier === "CRITICAL");
        const watch = assets.filter((a) => a.risk_tier === "MEDIUM");
        const avgRul = assets.reduce((s, a) => s + (a.RUL_days || 0), 0) / assets.length;
        setGridMetrics({
          assetsMonitored: String(assets.length).padStart(2, "0"),
          criticalCount: String(critical.length).padStart(2, "0"),
          criticalAssets: critical.slice(0, 2).map((a) => a.asset_id).join(", ") || "None",
          watchCount: String(watch.length).padStart(2, "0"),
          meanRul: `${avgRul.toFixed(1)}d`,
        });
      }
    }).catch(() => {});
  }, []);

  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => { setIsAuthed(authSession.isAuthenticated()); }, []);

  return (
    <div className="overflow-x-clip pt-3">
      <Hero />
      <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
        <TX115InterventionBanner />
      </div>
      <Problem />
      <Pipeline />
      <CinematicGrid />
      <Dashboard metrics={gridMetrics} />
      <FaultAnalysis topAsset={topAsset} />
      <Analytics historyData={txHistory} />
      <PlatformModules />
      <Action />
    </div>
  );
}

function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const voltraContainerRef = useRef<HTMLDivElement>(null);
  const voltraTextRef = useRef<HTMLHeadingElement>(null);
  const voltraSubtitleRef = useRef<HTMLParagraphElement>(null);
  const voltraBloomRef = useRef<HTMLDivElement>(null);
  const voltraFlareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const updateScrollAnimation = () => {
      if (!containerRef.current || !cardRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalScrollDistance = containerRef.current.offsetHeight - viewportHeight;

      if (totalScrollDistance <= 0) return;

      // Progress through the locked track: 0 to 1
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollDistance));

      // 1. Zoom phase (0.02 -> 0.30):
      // Expands the initial card into full screen
      const zoomStart = 0.02;
      const zoomEnd = 0.30;
      const normZoom = Math.max(0, Math.min(1, (progress - zoomStart) / (zoomEnd - zoomStart)));
      const easeZoom =
        normZoom < 0.5
          ? 4 * normZoom * normZoom * normZoom
          : 1 - Math.pow(-2 * normZoom + 2, 3) / 2;

      cardRef.current.style.setProperty("--hero-zoom", easeZoom.toFixed(4));

      // 2. Initial text fade out (0.02 -> 0.22):
      const textFade = Math.max(0, 1 - Math.max(0, (progress - 0.02) / 0.20));
      if (textRef.current) {
        textRef.current.style.opacity = textFade.toFixed(3);
        textRef.current.style.transform = `translateY(${-((1 - textFade) * 28).toFixed(1)}px)`;
        textRef.current.style.pointerEvents = textFade < 0.1 ? "none" : "auto";
      }

      // 3. Image parallax camera push-in:
      if (imgRef.current) {
        const imgScale = (1 + progress * 0.14).toFixed(4);
        imgRef.current.style.transform = `scale(${imgScale})`;
      }

      // 4. VOLTRA text appearance in the sky (0.28 -> 0.48):
      const appearStart = 0.28;
      const appearEnd = 0.48;
      const rawAppear = Math.max(0, Math.min(1, (progress - appearStart) / (appearEnd - appearStart)));
      const easeAppear = rawAppear * rawAppear * (3 - 2 * rawAppear); // smooth hermite interpolation

      // 5. Emitted light glow surge (0.46 -> 0.78):
      const glowStart = 0.46;
      const glowEnd = 0.78;
      const rawGlow = Math.max(0, Math.min(1, (progress - glowStart) / (glowEnd - glowStart)));
      const easeGlow = rawGlow < 0.5 ? 2 * rawGlow * rawGlow : 1 - Math.pow(-2 * rawGlow + 2, 2) / 2;

      // 6. Exit fade to next section (0.84 -> 0.98):
      const exitStart = 0.84;
      const exitEnd = 0.98;
      const exitFade = progress <= exitStart ? 1 : Math.max(0, 1 - (progress - exitStart) / (exitEnd - exitStart));

      // Master opacity for VOLTRA sky element
      const masterOpacity = (easeAppear * exitFade).toFixed(3);
      const exitTranslateY = progress > exitStart ? -((1 - exitFade) * 50).toFixed(1) : "0";

      if (voltraContainerRef.current) {
        voltraContainerRef.current.style.opacity = masterOpacity;
        voltraContainerRef.current.style.transform = `translate3d(0, ${exitTranslateY}px, 0)`;
        voltraContainerRef.current.style.pointerEvents = Number(masterOpacity) < 0.05 ? "none" : "auto";
      }

      // 7. Dynamic emitted light styling:
      if (voltraTextRef.current) {
        const g = easeGlow;
        // Subtle letter spacing breathing out as energy emits
        const trackingValue = (0.35 + g * 0.10).toFixed(3);
        voltraTextRef.current.style.letterSpacing = `${trackingValue}em`;
        voltraTextRef.current.style.paddingLeft = `${trackingValue}em`; // keeps optical center

        if (g > 0.01) {
          const s1 = (14 * g).toFixed(1);
          const s2 = (35 * g).toFixed(1);
          const s3 = (75 * g).toFixed(1);
          const s4 = (140 * g).toFixed(1);
          const s5 = (220 * g).toFixed(1);
          const a1 = (0.95 * g).toFixed(2);
          const a2 = (0.85 * g).toFixed(2);
          const a3 = (0.75 * g).toFixed(2);
          const a4 = (0.55 * g).toFixed(2);
          const a5 = (0.35 * g).toFixed(2);

          voltraTextRef.current.style.textShadow = `
            0 0 ${s1}px rgba(255, 255, 255, ${a1}),
            0 0 ${s2}px rgba(224, 242, 254, ${a2}),
            0 0 ${s3}px rgba(56, 189, 248, ${a3}),
            0 0 ${s4}px rgba(14, 165, 233, ${a4}),
            0 0 ${s5}px rgba(2, 132, 199, ${a5})
          `;
          voltraTextRef.current.style.color = "#ffffff";
        } else {
          voltraTextRef.current.style.textShadow = "0 4px 30px rgba(0, 0, 0, 0.7)";
          voltraTextRef.current.style.color = "rgba(255, 255, 255, 0.95)";
        }
      }

      // Radiant sky bloom:
      if (voltraBloomRef.current) {
        const g = easeGlow;
        voltraBloomRef.current.style.opacity = (g * 0.85).toFixed(3);
        const scale = (0.85 + g * 0.4).toFixed(3);
        voltraBloomRef.current.style.transform = `translate(-50%, 0) scale(${scale})`;
      }

      // Anamorphic horizontal flare:
      if (voltraFlareRef.current) {
        const g = easeGlow;
        voltraFlareRef.current.style.opacity = (g * 0.8).toFixed(3);
        const flareScaleX = (0.5 + g * 0.8).toFixed(3);
        voltraFlareRef.current.style.transform = `translate(-50%, 0) scaleX(${flareScaleX})`;
      }

      // Subtitle glow:
      if (voltraSubtitleRef.current) {
        const g = easeGlow;
        voltraSubtitleRef.current.style.opacity = (0.6 + g * 0.4).toFixed(3);
        if (g > 0.05) {
          voltraSubtitleRef.current.style.textShadow = `0 0 ${(16 * g).toFixed(1)}px rgba(56, 189, 248, ${(0.85 * g).toFixed(2)})`;
        } else {
          voltraSubtitleRef.current.style.textShadow = "none";
        }
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollAnimation);
        ticking = true;
      }
    };

    // Find any scrolling ancestor (.voltra-slice-content or window)
    const findScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
      let curr = node?.parentElement;
      while (curr) {
        const overflowY = window.getComputedStyle(curr).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          return curr;
        }
        curr = curr.parentElement;
      }
      return window;
    };

    const scrollParent = findScrollParent(containerRef.current);
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    // Initial calculation
    updateScrollAnimation();

    return () => {
      scrollParent.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  return (
    <section ref={containerRef} className="relative h-[400vh] w-full">
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        <div
          ref={cardRef}
          className="relative overflow-hidden border border-border/70 shadow-2xl transition-[border-radius,width,height] duration-75 ease-out"
          style={{
            width:
              "calc(min(1152px, 100vw - 3rem) + (100vw - min(1152px, 100vw - 3rem)) * var(--hero-zoom, 0))",
            height:
              "calc(min(650px, 75vh) + (100vh - min(650px, 75vh)) * var(--hero-zoom, 0))",
            borderRadius: "calc(2rem * (1 - var(--hero-zoom, 0)))",
            borderWidth: "calc(1px * (1 - var(--hero-zoom, 0)))",
            maxWidth: "100vw",
            maxHeight: "100vh",
          }}
        >
          <img
            ref={imgRef}
            src={homeImage}
            alt="A powered modern home beside monitored transmission lines at dusk"
            width={1600}
            height={1050}
            className="absolute inset-0 size-full object-cover origin-center will-change-transform"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--ink)_42%,transparent),color-mix(in_oklab,var(--ink)_6%,transparent)_50%,color-mix(in_oklab,var(--ink)_70%,transparent))]" />

          {/* Initial Hero Content (Fades out on initial scroll) */}
          <div
            ref={textRef}
            className="relative flex min-h-[580px] flex-col justify-start p-6 text-cream sm:min-h-[620px] sm:p-10 md:min-h-[660px] md:p-14 will-change-[opacity,transform] z-10"
          >
            <div className="flex items-center justify-end text-xs">
              <span className="hidden text-cream/70 sm:block font-mono">Techtonics · Bobathon AI Submission</span>
            </div>

            <div className="mt-4 max-w-3xl sm:mt-6">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cream/70 font-mono">
                See the failure before it happens
              </p>
              <h1 className="text-4xl font-semibold leading-[1.04] sm:text-5xl md:text-6xl">
                Power shouldn't fail<br />
                <span className="font-display font-normal italic text-signal">before you're warned.</span>
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="pill h-8.5 border-cream/25 bg-cream/10 px-4 text-xs font-medium text-cream backdrop-blur-md transition-all hover:border-cream/40 hover:bg-cream/20 hover:text-white"
                >
                  <Link to="/grid" className="inline-flex items-center gap-1.5">
                    <span>Explore Live Grid</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="pill h-8.5 border-cream/15 bg-transparent px-4 text-xs font-medium text-cream/80 backdrop-blur-md transition-all hover:border-cream/30 hover:bg-cream/10 hover:text-white"
                >
                  <Link to="/predict" className="inline-flex items-center gap-1.5">
                    <span>Run Prediction</span>
                    <Activity className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Cinematic Large VOLTRA in Sky (appears when scrolled, emits glowing light) */}
          <div
            ref={voltraContainerRef}
            className="pointer-events-none absolute inset-x-0 top-0 flex h-full flex-col items-center justify-start pt-[18vh] sm:pt-[20vh] md:pt-[22vh] will-change-[opacity,transform] z-20"
            style={{ opacity: 0 }}
          >
            {/* Atmospheric Sky Bloom behind VOLTRA */}
            <div
              ref={voltraBloomRef}
              className="pointer-events-none absolute top-[15vh] sm:top-[17vh] md:top-[19vh] left-1/2 -translate-x-1/2 h-[340px] sm:h-[420px] w-[540px] sm:w-[820px] rounded-full opacity-0 blur-3xl transition-transform duration-75"
              style={{
                background:
                  "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(224, 242, 254, 0.45) 0%, rgba(56, 189, 248, 0.32) 35%, rgba(14, 165, 233, 0.16) 65%, transparent 80%)",
              }}
            />

            {/* Horizontal Anamorphic Light Streak */}
            <div
              ref={voltraFlareRef}
              className="pointer-events-none absolute top-[24vh] sm:top-[27vh] md:top-[29vh] left-1/2 -translate-x-1/2 h-[2px] w-[650px] sm:w-[980px] opacity-0 blur-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.4) 20%, rgba(255, 255, 255, 0.95) 50%, rgba(56, 189, 248, 0.4) 80%, transparent 100%)",
              }}
            />

            {/* Large Top-Centered Spaced-Out VOLTRA Title */}
            <div className="relative flex flex-col items-center justify-center px-4 text-center">
              <h1
                ref={voltraTextRef}
                className="select-none font-sans text-6xl sm:text-7xl md:text-8xl lg:text-[7.5rem] xl:text-[8.5rem] font-bold uppercase leading-none text-white transition-all duration-75 will-change-[text-shadow,letter-spacing,transform]"
                style={{
                  letterSpacing: "0.35em",
                  paddingLeft: "0.35em",
                  textShadow: "0 4px 30px rgba(0, 0, 0, 0.7)",
                }}
              >
                VOLTRA
              </h1>

              <p
                ref={voltraSubtitleRef}
                className="mt-4 sm:mt-5 text-[11px] sm:text-xs md:text-sm font-mono uppercase tracking-[0.6em] text-cyan-100/80 transition-all duration-75"
                style={{ paddingLeft: "0.6em" }}
              >
                AI-Powered Grid Intelligence
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

interface KavachStage {
  id: string;
  step: string;
  badge: string;
  titlePrefix: string;
  titleEmphasis: string;
  emphasisClass: string;
  description: string;
  meta: {
    label: string;
    value: string;
    sub: string;
  };
  dotColor: string;
  glowColor: string;
}

const KAVACH_STAGES: KavachStage[] = [
  {
    id: "legacy",
    step: "01",
    badge: "THE LEGACY BLINDSPOT",
    titlePrefix: "Yesterday's grid tools respond",
    titleEmphasis: "after the dark.",
    emphasisClass:
      "font-display italic font-normal text-rose-500 dark:text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.35)]",
    description:
      "Reactive maintenance costs 5× more than planned action. Traditional utilities wait until physical insulation collapses or frantic customer calls flood dispatch — long after catastrophic blackout has already struck.",
    meta: {
      label: "FAILURE LATENCY",
      value: "Post-Incident Dispatch",
      sub: "5× Emergency Crew Cost",
    },
    dotColor: "bg-rose-500",
    glowColor: "rgba(244, 63, 94, 0.16)",
  },
  {
    id: "shield",
    step: "02",
    badge: "AUTONOMOUS SHIELD",
    titlePrefix: "An autonomous neural shield",
    titleEmphasis: "guarding every megawatt.",
    emphasisClass:
      "font-display italic font-normal text-lime-500 dark:text-lime-400 drop-shadow-[0_0_25px_rgba(132,204,22,0.4)]",
    description:
      "VOLTRA Blackout Defense acts as an impenetrable digital armor over the power grid. Streaming dissolved gas telemetry at sub-second frequency, it isolates dielectric stress and winding arcing weeks before heat or smoke appear.",
    meta: {
      label: "TELEMETRY PULSE",
      value: "Sub-Second DGA Stream",
      sub: "18 Anand Sub-stations Shielded",
    },
    dotColor: "bg-lime-500",
    glowColor: "rgba(132, 204, 22, 0.18)",
  },
  {
    id: "intelligence",
    step: "03",
    badge: "PREDICTIVE FORESIGHT",
    titlePrefix: "Dual neural classifiers forecast",
    titleEmphasis: "exact remaining useful life.",
    emphasisClass:
      "font-display italic font-normal text-cyan-400 dark:text-cyan-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.4)]",
    description:
      "Model 1 computes continuous Health Index decay trajectories (R²=0.72) to project true remaining asset life, while Model 2 maps IEC 60599 & Duval triangle fault signatures (D1/T1) to auto-generate preventive orders.",
    meta: {
      label: "AI PRECISION",
      value: "R² = 0.72 Decay Slope",
      sub: "Duval & IEC 60599 Fault Modes",
    },
    dotColor: "bg-cyan-400",
    glowColor: "rgba(34, 211, 238, 0.18)",
  },
  {
    id: "resilience",
    step: "04",
    badge: "TOTAL GRID RESILIENCE",
    titlePrefix: "Zero unplanned blackouts.",
    titleEmphasis: "A grid that heals before it breaks.",
    emphasisClass:
      "font-display italic font-normal bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(52,211,153,0.4)]",
    description:
      "Shielding Anand District with +89 downtime days recovered per operational cycle. Millions in critical equipment salvage, zero operator hazard, and 99.98% unshakeable power delivery across every line.",
    meta: {
      label: "PROVEN OUTCOME",
      value: "+89 Days Uptime Saved",
      sub: "99.98% Anand Grid Reliability",
    },
    dotColor: "bg-emerald-400",
    glowColor: "rgba(16, 185, 129, 0.2)",
  },
];

function Problem() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const auraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const findScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
      let curr = node?.parentElement;
      while (curr) {
        const overflowY = window.getComputedStyle(curr).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          return curr;
        }
        curr = curr.parentElement;
      }
      return window;
    };

    const updateScrollStory = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalScrollDistance = containerRef.current.offsetHeight - viewportHeight;
      const rawProgress = -rect.top / (totalScrollDistance > 0 ? totalScrollDistance : 1);
      const progress = Math.max(0, Math.min(1, rawProgress));

      const continuousIdx = progress * 3;
      const currentNearest = Math.min(3, Math.max(0, Math.round(continuousIdx)));

      if (auraRef.current) {
        const activeColor = KAVACH_STAGES[currentNearest].glowColor;
        auraRef.current.style.background = `radial-gradient(ellipse 60% 45% at 50% 50%, ${activeColor} 0%, transparent 70%)`;
      }

      textElementsRef.current.forEach((el, idx) => {
        if (!el) return;
        const dist = continuousIdx - idx;
        const absDist = Math.abs(dist);

        const transY = -dist * 80;
        const scale = Math.max(0.9, 1 - absDist * 0.08);
        const opacity = Math.max(0, 1 - absDist * 1.5);
        const blur = Math.min(6, absDist * 4);

        el.style.transform = `translate3d(0, ${transY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        el.style.opacity = opacity.toFixed(3);
        el.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : "none";
        el.style.pointerEvents = absDist < 0.4 ? "auto" : "none";
        el.style.visibility = absDist > 1.2 ? "hidden" : "visible";
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollStory);
        ticking = true;
      }
    };

    const scrollParent = findScrollParent(containerRef.current);
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    updateScrollStory();

    return () => {
      scrollParent.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  return (
    <section ref={containerRef} className="relative h-[320vh] w-full">
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6 md:px-12">
        
        {/* Soft background aura */}
        <div
          ref={auraRef}
          className="pointer-events-none absolute inset-0 z-0 opacity-40 transition-all duration-700 blur-3xl"
        />

        {/* Ultra-minimal text story layout */}
        <div className="relative z-10 w-full max-w-4xl text-center">
          <div className="relative min-h-[320px] sm:min-h-[360px] w-full flex items-center justify-center">
            {KAVACH_STAGES.map((stage, idx) => (
              <div
                key={stage.id}
                ref={(el) => {
                  textElementsRef.current[idx] = el;
                }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center will-change-[transform,opacity,filter]"
              >
                {/* Minimal Step Label */}
                <p className="mb-4 text-xs font-mono tracking-[0.25em] text-muted-foreground uppercase flex items-center gap-2">
                  <span className={`size-1.5 rounded-full ${stage.dotColor}`} />
                  <span>{stage.step} / 04 · {stage.badge}</span>
                </p>

                {/* Story Headline */}
                <h2 className="max-w-3xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl text-foreground">
                  {stage.titlePrefix}{" "}
                  <span className={stage.emphasisClass}>{stage.titleEmphasis}</span>
                </h2>

                {/* Narrative Text */}
                <p className="mt-6 max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-muted-foreground font-normal">
                  {stage.description}
                </p>

                {/* Minimal Meta Stat Line */}
                <p className="mt-8 text-xs font-mono text-muted-foreground/80 tracking-wide">
                  <span className="font-semibold text-foreground">{stage.meta.label}:</span> {stage.meta.value} <span className="mx-2 opacity-40">•</span> {stage.meta.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

function Pipeline() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    const cards = Array.from(container.children) as HTMLElement[];
    let closestIdx = 0;
    let minDistance = Infinity;
    cards.slice(0, 4).forEach((card, idx) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(containerCenter - cardCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });
    setActiveSlide(closestIdx);
  };

  const scrollToSlide = (idx: number) => {
    if (!scrollContainerRef.current) return;
    const cards = scrollContainerRef.current.children;
    if (cards[idx]) {
      (cards[idx] as HTMLElement).scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      setActiveSlide(idx);
    }
  };

  return (
    <section className="mx-auto mt-28 w-full max-w-6xl px-4 sm:px-6">
      <div className="mb-8 sm:mb-10 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-signal font-mono">The intelligence layer</p>
        <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
          From raw gas ppm to an <span className="font-display font-normal italic text-signal">actionable forecast.</span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
          Dual machine learning classifiers synthesize continuous dissolved gas chromatography and electrical load dynamics to safeguard regional grid stability.
        </p>
      </div>

      {/* Touch Carousel on Mobile (<md), 4-Column Grid on Desktop (md+) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none gap-4 md:grid-cols-4 sm:gap-5 pb-3 md:pb-0 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 scrollbar-none"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* Card 1: Photo Card (Technician field inspection) */}
        <div className="w-[82vw] max-w-[320px] md:w-auto shrink-0 md:shrink snap-center group relative overflow-hidden rounded-[2rem] border border-border/40 bg-card shadow-sm h-[360px] sm:h-[400px]">
          <img
            src={engineerImg}
            alt="Electrical utility technician inspecting high-voltage substation transformer"
            width={600}
            height={800}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <span className="text-[10px] font-mono uppercase tracking-widest text-lime-400">Substation Telemetry</span>
            <p className="mt-1 text-sm font-semibold leading-snug">Continuous Gas Chromatography Monitoring</p>
          </div>
        </div>

        {/* Card 2: Clean Stat Card */}
        <Link
          to="/grid"
          className="w-[82vw] max-w-[320px] md:w-auto shrink-0 md:shrink snap-center group relative flex flex-col justify-between rounded-[2rem] border border-border/70 bg-card p-6 sm:p-7 md:p-8 shadow-sm transition-all duration-300 hover:border-border hover:shadow-md h-[360px] sm:h-[400px]"
        >
          <div>
            <div className="flex items-start justify-between">
              <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-sans">
                4,151+
              </span>
              <div className="size-10 rounded-full bg-foreground text-background flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shadow-sm">
                <ArrowUpRight className="size-5" />
              </div>
            </div>
            <h3 className="mt-6 sm:mt-8 text-base sm:text-lg font-bold text-foreground leading-snug">
              Field DGA Failure Records Analyzed
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">
            With 4,151 historical transformer failure samples and streaming telemetry across 18 Anand District substations, VOLTRA eliminates blindspots weeks before thermal breakdown occurs.
          </p>
        </Link>

        {/* Card 3: Photo Card (Substation Infrastructure) */}
        <div className="w-[82vw] max-w-[320px] md:w-auto shrink-0 md:shrink snap-center group relative overflow-hidden rounded-[2rem] border border-border/40 bg-card shadow-sm h-[360px] sm:h-[400px]">
          <img
            src={substationImg}
            alt="Modern electrical substation transformers and transmission lines"
            width={600}
            height={800}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <span className="text-[10px] font-mono uppercase tracking-widest text-lime-400">Regional Transmission</span>
            <p className="mt-1 text-sm font-semibold leading-snug">18 Sub-stations Actively Shielded</p>
          </div>
        </div>

        {/* Card 4: Vibrant Electric Lime Stat Card */}
        <Link
          to="/predict"
          className="w-[82vw] max-w-[320px] md:w-auto shrink-0 md:shrink snap-center group relative flex flex-col justify-between rounded-[2rem] bg-[#d2f831] p-6 sm:p-7 md:p-8 shadow-sm transition-all duration-300 hover:bg-[#c7f023] hover:shadow-lg h-[360px] sm:h-[400px] text-neutral-950"
        >
          <div>
            <div className="flex items-start justify-between">
              <span className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-950 font-sans">
                90.8%
              </span>
              <div className="size-10 rounded-full bg-neutral-950 text-white flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shadow-sm">
                <ArrowUpRight className="size-5" />
              </div>
            </div>
            <h3 className="mt-6 sm:mt-8 text-base sm:text-lg font-bold text-neutral-950 leading-snug">
              IEC 60599 Classification Rate
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-neutral-900/85 leading-relaxed font-normal line-clamp-3 sm:line-clamp-none">
            With a 90.8% accuracy rate across 7 electrical fault archetypes and Duval triangle gas ratios, grid dispatchers receive actionable plain-English advisories and prescriptive work orders with zero guesswork.
          </p>
        </Link>
      </div>

      {/* Mobile Carousel Indicator Dots (Hidden on md+) */}
      <div className="flex md:hidden items-center justify-center gap-2 mt-4">
        {[0, 1, 2, 3].map((idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Slide ${idx + 1}`}
            onClick={() => scrollToSlide(idx)}
            className={`transition-all duration-300 rounded-full ${
              activeSlide === idx
                ? "w-6 h-1.5 bg-[#d2f831]"
                : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function CinematicGrid() {
  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831] animate-pulse" /> A fault, caught upstream
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Power is still flowing. <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">VOLTRA is already watching.</span>
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
          Critical arcing gas (C2H2) detected at TX-107 before downstream feeder trips occur.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] shadow-2xl">
        <img
          src={gridImage}
          alt="Transmission towers monitored during an approaching electrical anomaly"
          width={1600}
          height={900}
          loading="lazy"
          className="h-[520px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="absolute inset-x-[12%] top-[46%] h-0.5 power-line" />
        <div className="absolute bottom-6 left-6 right-6 grid gap-3 sm:grid-cols-3">
          {/* Card 1: Highest Impact Asset */}
          <div className="group rounded-2xl border border-white/[0.12] bg-[#0c0d10]/85 backdrop-blur-xl p-4 sm:p-5 shadow-2xl transition-all duration-300 hover:border-white/25 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] uppercase tracking-widest font-mono text-neutral-400 font-semibold">
                Highest Impact Asset
              </span>
              <AlertTriangle className="size-4 text-amber-400" />
            </div>
            <p className="mt-2 text-base sm:text-lg font-bold text-white tracking-tight">
              TX-107 · Electrical Arcing
            </p>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
              C2H2 Arcing Detected · 66kV Primary
            </p>
          </div>

          {/* Card 2: Substation Node */}
          <div className="group rounded-2xl border border-white/[0.12] bg-[#0c0d10]/85 backdrop-blur-xl p-4 sm:p-5 shadow-2xl transition-all duration-300 hover:border-white/25 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] uppercase tracking-widest font-mono text-neutral-400 font-semibold">
                Substation Node
              </span>
              <Radio className="size-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-base sm:text-lg font-bold text-white tracking-tight">
              GIDC Industrial Phase-2
            </p>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
              Heavy Industry Corridor · Anand District
            </p>
          </div>

          {/* Card 3: Failure Urgency (Complementary violet/amethyst glow, NOT green and NOT flat red) */}
          <div className="group rounded-2xl border border-purple-500/40 bg-[#160d24]/90 backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.25)] transition-all duration-300 hover:border-purple-400/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-purple-300/90">
                Failure Urgency
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-[9px] font-mono font-bold text-purple-200">
                <span className="size-1.5 rounded-full bg-purple-400 animate-pulse" /> Critical
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white">
              RUL 33.2 Days
            </p>
            <p className="text-[11px] text-purple-300/80 font-mono mt-0.5">
              Calibrated Piecewise · HI 56.4 Damage · 78.4°C Core
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dashboard({
  metrics = {
    assetsMonitored: "18",
    criticalCount: "02",
    criticalAssets: "TX-107, TX-112",
    watchCount: "02",
    meanRul: "89.4d",
  },
}: {
  metrics?: {
    assetsMonitored: string;
    criticalCount: string;
    criticalAssets: string;
    watchCount: string;
    meanRul: string;
  };
}) {
  return (
    <section className="mx-auto mt-28 w-full max-w-6xl px-4 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 items-stretch">
        {/* Left Column: Heading & Sleek Compact Stat Cards */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:space-y-0">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-[#d2f831] font-mono flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-[#d2f831] animate-pulse" /> Live Grid Topology
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
              A clear view of <span className="font-display font-normal italic text-emerald-700 dark:text-[#d2f831]">what changes next.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Healthy substations stay quiet. Emerging equipment risks rise into view with SHAP feature explainability and IBM Bob plain-English advisories.
            </p>
          </div>

          {/* 4 Sleek Compact Stat Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
            {/* Box 1: Fleet Assets Monitored */}
            <div className="group relative flex flex-col justify-between rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/85 hover:bg-muted/50 dark:hover:bg-[#15161a] backdrop-blur-xl p-3.5 sm:p-4 shadow-xs transition-all duration-300 hover:border-border/80 dark:hover:border-white/20">
              <div className="flex items-center justify-between">
                <ShieldCheck className="size-4 text-muted-foreground dark:text-neutral-400 stroke-[1.75]" />
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground dark:text-neutral-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span className="uppercase tracking-wider">ONLINE</span>
                </div>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground dark:text-white">
                  {metrics.assetsMonitored}
                </p>
                <p className="text-xs font-medium text-muted-foreground dark:text-neutral-400 mt-0.5 truncate">
                  Assets Monitored
                </p>
              </div>
            </div>

            {/* Box 2: Critical High Risk */}
            <div className="group relative flex flex-col justify-between rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/85 hover:bg-muted/50 dark:hover:bg-[#15161a] backdrop-blur-xl p-3.5 sm:p-4 shadow-xs transition-all duration-300 hover:border-border/80 dark:hover:border-white/20">
              <div className="flex items-center justify-between">
                <AlertTriangle className="size-4 text-rose-500 dark:text-rose-400 stroke-[1.75]" />
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground dark:text-neutral-400 truncate max-w-[105px]">
                  <span className="size-1.5 shrink-0 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                  <span className="truncate">{metrics.criticalAssets || "TX-107, TX-112"}</span>
                </div>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground dark:text-white">
                  {metrics.criticalCount}
                </p>
                <p className="text-xs font-medium text-muted-foreground dark:text-neutral-400 mt-0.5 truncate">
                  Critical High Risk
                </p>
              </div>
            </div>

            {/* Box 3: Watch Tier */}
            <div className="group relative flex flex-col justify-between rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/85 hover:bg-muted/50 dark:hover:bg-[#15161a] backdrop-blur-xl p-3.5 sm:p-4 shadow-xs transition-all duration-300 hover:border-border/80 dark:hover:border-white/20">
              <div className="flex items-center justify-between">
                <Activity className="size-4 text-amber-500 dark:text-amber-400 stroke-[1.75]" />
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground dark:text-neutral-400">
                  <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                  <span className="uppercase tracking-wider">ELEVATED</span>
                </div>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground dark:text-white">
                  {metrics.watchCount}
                </p>
                <p className="text-xs font-medium text-muted-foreground dark:text-neutral-400 mt-0.5 truncate">
                  Watch Tier
                </p>
              </div>
            </div>

            {/* Box 4: Mean RUL */}
            <div className="group relative flex flex-col justify-between rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-[#111215]/85 hover:bg-muted/50 dark:hover:bg-[#15161a] backdrop-blur-xl p-3.5 sm:p-4 shadow-xs transition-all duration-300 hover:border-border/80 dark:hover:border-white/20">
              <div className="flex items-center justify-between">
                <Clock3 className="size-4 text-muted-foreground dark:text-neutral-400 stroke-[1.75]" />
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground dark:text-neutral-400">
                  <span className="size-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                  <span className="uppercase tracking-wider">FLEET WIDE</span>
                </div>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground dark:text-white">
                  {metrics.meanRul}
                </p>
                <p className="text-xs font-medium text-muted-foreground dark:text-neutral-400 mt-0.5 truncate">
                  Mean RUL
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Anand District Sub-Transmission Telemetry Map */}
        <div className="lg:col-span-7 w-full h-full">
          <GridDiagram />
        </div>
      </div>
    </section>
  );
}

function FaultAnalysis({ topAsset }: { topAsset?: RankedAsset | null }) {
  const assetId = topAsset?.asset_id || "TX-107";
  const archetype = (topAsset?.archetype || "Electrical Arcing").replace(/_/g, " ");
  const substation = topAsset?.substation_name || "GIDC Phase-2 Heavy Industry";
  const hi = topAsset?.health_index != null ? topAsset.health_index.toFixed(1) : "56.4";
  const rul = topAsset?.RUL_days != null ? `${topAsset.RUL_days.toFixed(1)}d` : "33.2d";
  const capacity = topAsset?.mva_rating ? `${topAsset.mva_rating} MVA` : "25 MVA";

  const factors = useMemo(() => {
    const shap = safeParseShap(topAsset?.top_3_shap);
    if (shap.length) {
      const maxVal = Math.max(...shap.map(([, v]) => Math.abs(v)), 1);
      return shap.map(([name, v]) => [
        `${name} Driver (SHAP Model 1)`,
        Math.min(99, Math.max(20, Math.round((Math.abs(v) / maxVal) * 94))),
      ] as [string, number]);
    }
    return [
      ["Acetylene Arcing Gas (C2H2)", 92],
      ["Methane Thermal Concentration (CH4)", 78],
      ["Hydrogen Surge (H2)", 68],
      ["Dielectric Rigidity Breakdown", 54],
    ] as [string, number][];
  }, [topAsset?.top_3_shap]);

  return (
    <section className="mx-auto mt-28 w-full max-w-6xl px-4 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card p-7 sm:p-10 md:p-12 shadow-sm">
        <div className="grid gap-10 md:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-mono font-semibold text-rose-500">
              <AlertTriangle className="size-3.5" />
              <span>CRITICAL FAULT DETECTED</span>
            </div>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {assetId} · {archetype}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              DGA sensors detect high-energy electrical discharge (D1/D2) inside the main tank at {substation}.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-2xl sm:text-3xl font-bold font-mono text-rose-500">HI {hi}</p>
                <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1">DAMAGE SCORE</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">{rul}</p>
                <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1">REMAINING LIFE</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-500">{capacity}</p>
                <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1">RATED CAPACITY</p>
              </div>
            </div>
            <Button asChild className="pill mt-8 bg-[#d2f831] text-neutral-950 hover:bg-[#c7f023] font-bold shadow-sm px-6 py-2.5 rounded-full inline-flex items-center gap-2">
              <Link to="/predict">
                Simulate in Outage Studio <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-[1.75rem] border border-border/60 bg-muted/25 p-6 sm:p-7">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <p className="text-xs uppercase font-mono font-semibold text-muted-foreground">
                SHAP Feature Impact on Risk
              </p>
              <span className="rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-mono font-bold px-2 py-0.5">
                Top Drivers
              </span>
            </div>
            <div className="mt-6 space-y-5">
              {factors.map(([name, v]) => (
                <div key={name}>
                  <div className="mb-2 flex justify-between text-xs font-mono">
                    <span className="text-foreground">{name}</span>
                    <span className="font-bold text-foreground">{v}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#d2f831] transition-all duration-500"
                      style={{ width: `${v}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Analytics({ historyData = defaultHistory }: { historyData?: Array<{ time: string; load: number; health: number }> }) {
  return (
    <section className="mx-auto mt-28 w-full max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-signal font-mono">Fleet Trajectory</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Track degradation & <span className="font-display font-normal italic text-signal">maintenance recovery.</span>
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Continuous 90-day degradation curve and timely recovery telemetry for transformer TX-115.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[2fr_1fr] items-stretch">
        {/* Continuous Flow Graph Card */}
        <div className="rounded-[2rem] border border-border/70 bg-card p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <p className="text-sm font-semibold text-foreground">TX-115 Trajectory: Peak Degradation to Rebound</p>
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" /> HEALTH %
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-muted-foreground/50" /> LOAD %
              </span>
            </div>
          </div>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {/* Fluid ambient continuous glow under the curve */}
                  <linearGradient id="continuousFlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "1rem",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
                  }}
                />
                {/* Secondary gentle load baseline */}
                <Area
                  type="natural"
                  dataKey="load"
                  name="Load (%)"
                  stroke="var(--color-muted-foreground)"
                  strokeOpacity={0.4}
                  strokeDasharray="4 4"
                  fill="transparent"
                  strokeWidth={1.5}
                />
                {/* Primary Continuous Flowing Health Curve */}
                <Area
                  type="natural"
                  dataKey="health"
                  name="Health %"
                  stroke="#10b981"
                  fill="url(#continuousFlowGrad)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#d2f831", stroke: "#10b981", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Green Highlight Metric Card (Changed to Green as requested) */}
        <div className="rounded-[2rem] bg-[#d2f831] p-7 sm:p-8 text-neutral-950 flex flex-col justify-between shadow-sm min-h-[340px]">
          <div>
            <div className="size-11 rounded-full bg-neutral-950 text-white flex items-center justify-center shadow-sm">
              <Wrench className="size-5" />
            </div>
            <p className="mt-8 text-5xl sm:text-6xl font-bold font-sans tracking-tight text-neutral-950">+89d</p>
            <p className="mt-2 text-base font-bold text-neutral-950">Asset Life Recovered</p>
          </div>
          <p className="mt-6 text-xs sm:text-sm leading-relaxed text-neutral-900/85 font-normal">
            Timely fan overhaul and 20% load curtailment on Day 78 prevented a blackout on TX-115, returning RUL from 7.7 to 97 days.
          </p>
        </div>
      </div>
    </section>
  );
}

function PlatformModules() {
  const modules = [
    {
      to: "/grid",
      badge: "LIVE GRID & BLACKOUT SHIELD",
      title: "Grid Corridor Inspector",
      desc: "Interactive SCADA telemetry map, DGA gas ratios, Duval pentagons, and real-time consumer blackout estimator for all 18 Anand transformers.",
      accent: "text-emerald-700 dark:text-[#d2f831] border-emerald-500/30 bg-emerald-500/10",
    },
    {
      to: "/dashboard",
      badge: "EXECUTIVE DASHBOARD",
      title: "Grid Command Operations",
      desc: "High-level fleet health index analytics, RUL degradation distributions, risk breakdown, and live event ticker.",
      accent: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10",
    },
    {
      to: "/predict",
      badge: "ML RISK PREDICTION ENGINE",
      title: "Ad-hoc Telemetry Risk Scoring",
      desc: "Upload custom CSV readings or test synthetic transformer parameters to run our dual ML models (HI Regression + DGA Fault Classifier).",
      accent: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10",
    },
    {
      to: "/technology",
      badge: "SYSTEM ARCHITECTURE",
      title: "ML Pipeline & Science Deep Dive",
      desc: "Technical post-mortem on dataset features, XGBoost/RandomForest model specs, Duval triangle ratio math, and SHAP explainability.",
      accent: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
    },
  ];

  return (
    <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-[#d2f831]">
          Explore Full VOLTRA Console
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground dark:text-white font-display">
          All 5 Platform Views
        </h2>
        <p className="text-sm text-muted-foreground dark:text-neutral-400">
          Switch seamlessly across live grid corridor telemetry, executive fleet analytics, ad-hoc ML scoring, and architecture documentation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m, idx) => (
          <Link
            key={idx}
            to={m.to}
            className="group relative rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card dark:bg-[#121318] p-6 shadow-xs hover:border-emerald-500/40 dark:hover:border-[#d2f831]/40 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold ${m.accent}`}>
                {m.badge}
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-foreground dark:text-white group-hover:text-emerald-700 dark:group-hover:text-[#d2f831] transition-colors">
              {m.title}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground dark:text-neutral-400 leading-relaxed">
              {m.desc}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Action() {
  return (
    <section className="mx-auto mt-28 w-full max-w-6xl px-4 sm:px-6 pb-20">
      {/* Green CTA Banner (Changed to Green as requested) */}
      <div className="rounded-[2.25rem] bg-[#d2f831] p-8 sm:p-12 md:p-16 text-neutral-950 shadow-md">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-mono font-bold text-neutral-900/70">
              Grid Risk Advisor · Team Techtonics
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-neutral-950">
              Make sure the lights <span className="font-display font-normal italic">stay on.</span>
            </h2>
          </div>
          <div>
            <p className="text-sm sm:text-base leading-relaxed text-neutral-900/85 font-normal">
              Explore the live operator console to inspect all 18 transformers and the 7-day maintenance plan.
            </p>
            <Button asChild className="pill mt-6 bg-neutral-950 text-white hover:bg-neutral-900 font-semibold shadow-sm px-6 py-3 rounded-full text-sm inline-flex items-center gap-2">
              <Link to="/grid">
                Open Operator Console <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
