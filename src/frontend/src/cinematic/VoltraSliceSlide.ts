import type { Theme } from "./types.ts";

export interface VoltraSliceSlideConfig {
  sliceCount?: number;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * VoltraSliceSlide — Premium "Slice & Dicer" approaching branded slide.
 * Magazine-style editorial two-column layout with staggered vertical strip entrance.
 */
export class VoltraSliceSlide {
  private rootContainer: HTMLElement;
  private slideElement: HTMLElement | null = null;
  private isOpen = false;
  private currentTheme: Theme = "light";
  private sliceCount: number;
  private onOpenCallback?: () => void;
  private onCloseCallback?: () => void;

  constructor(rootContainer: HTMLElement, config?: VoltraSliceSlideConfig) {
    this.rootContainer = rootContainer;
    this.sliceCount = config?.sliceCount ?? 5;
    this.onOpenCallback = config?.onOpen;
    this.onCloseCallback = config?.onClose;

    this.mount();
    this.bindEvents();
  }

  private mount(): void {
    const slide = document.createElement("div");
    slide.className = `voltra-slice-overlay slice-theme-${this.currentTheme}`;
    slide.id = "voltraSliceOverlay";
    slide.setAttribute("aria-hidden", "true");
    slide.setAttribute("role", "dialog");
    slide.setAttribute("aria-modal", "true");
    slide.setAttribute("aria-label", "VOLTRA Grid Intelligence");

    // Vertical slice strips (the "dice" backdrop)
    const sliceContainer = document.createElement("div");
    sliceContainer.className = "voltra-slice-strips";
    for (let i = 0; i < this.sliceCount; i++) {
      const strip = document.createElement("div");
      strip.className = `slice-strip strip-${i + 1}`;
      sliceContainer.appendChild(strip);
    }
    slide.appendChild(sliceContainer);

    // Foreground editorial content
    const content = document.createElement("div");
    content.className = "voltra-slice-content";
    content.innerHTML = `
      <!-- Navigation Bar -->
      <nav class="slice-nav">
        <div class="slice-nav-brand">
          <span class="slice-nav-pulse"></span>
          <span class="slice-nav-wordmark">VOLTRA</span>
        </div>
        <button class="slice-close-btn" id="sliceCloseBtn" aria-label="Return to Cinematic View">
          <span class="slice-close-label">Close</span>
          <span class="slice-close-x" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </span>
        </button>
      </nav>

      <!-- Main Two-Column Layout -->
      <div class="slice-body">

        <!-- Left: Editorial Column -->
        <section class="slice-editorial">
          <div class="slice-kicker">
            <span class="slice-kicker-line"></span>
            <span class="slice-kicker-text">PREDICTIVE GRID INTELLIGENCE · TEAM TECHTONICS</span>
          </div>

          <h1 class="slice-headline">
            The Grid,<br/>
            <span class="slice-headline-accent">Protected.</span>
          </h1>

          <p class="slice-lead">
            VOLTRA combines two machine learning models trained on Kaggle transformer datasets —
            Health Index regression (R²=0.72) and DGA Fault classification (90.8% accuracy) —
            with IBM Bob plain-English advisories to turn catastrophic failures into scheduled interventions.
          </p>

          <!-- Horizontal Stats Bar -->
          <div class="slice-stats-bar">
            <div class="slice-stat">
              <span class="slice-stat-value">90.8<small>%</small></span>
              <span class="slice-stat-name">DGA Accuracy</span>
            </div>
            <div class="slice-stat-sep"></div>
            <div class="slice-stat">
              <span class="slice-stat-value">0.72<small>R²</small></span>
              <span class="slice-stat-name">Health Index</span>
            </div>
            <div class="slice-stat-sep"></div>
            <div class="slice-stat">
              <span class="slice-stat-value">+89<small>d</small></span>
              <span class="slice-stat-name">TX-115 Saved</span>
            </div>
            <div class="slice-stat-sep"></div>
            <div class="slice-stat">
              <span class="slice-stat-value">18</span>
              <span class="slice-stat-name">Fleet Assets</span>
            </div>
          </div>

          <!-- CTA -->
          <div class="slice-cta-row">
            <button class="slice-cta-primary" id="sliceCtaBtn">
              Explore Platform
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M2.5 7.5h10m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <div class="slice-live-badge">
              <span class="slice-live-dot"></span>
              FastAPI :8000 Ready
            </div>
          </div>
        </section>

        <!-- Right: Capability Cards -->
        <aside class="slice-cards-col">
          <div class="slice-capability-card">
            <div class="slice-cap-num">01</div>
            <h3 class="slice-cap-title">Dual-Model ML Pipeline</h3>
            <p class="slice-cap-body">Random Forest Health Index regression (MAE=5.88) paired with 7-class IEC 60599 DGA fault classification.</p>
          </div>
          <div class="slice-capability-card">
            <div class="slice-cap-num">02</div>
            <h3 class="slice-cap-title">Intervention Tracking</h3>
            <p class="slice-cap-body">Tracks degradation trajectories and validates post-maintenance recovery, as proven on TX-115 (+89 days).</p>
          </div>
          <div class="slice-capability-card">
            <div class="slice-cap-num">03</div>
            <h3 class="slice-cap-title">IBM Bob Advisories</h3>
            <p class="slice-cap-body">Generates actionable plain-English operator advice grounded in SHAP feature contributions and sensor readings.</p>
          </div>
        </aside>
      </div>

      <!-- Footer Strip -->
      <footer class="slice-footer">
        <span class="slice-footer-copy">© VOLTRA Intelligence Systems · Techtonics</span>
        <span class="slice-footer-tagline">Predict before equipment failure.</span>
        <span class="slice-footer-scroll-hint">Scroll up to return ↑</span>
      </footer>
    `;

    slide.appendChild(content);
    this.rootContainer.appendChild(slide);
    this.slideElement = slide;
  }

  private bindEvents(): void {
    const closeBtn = this.slideElement?.querySelector("#sliceCloseBtn");
    closeBtn?.addEventListener("click", () => this.close());

    const ctaBtn = this.slideElement?.querySelector("#sliceCtaBtn");
    ctaBtn?.addEventListener("click", () => {
      console.log("[VOLTRA] Platform CTA clicked.");
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) this.close();
    });

    // Wheel open/close
    let wheelAcc = 0;
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener("wheel", (e) => {
      if (!this.isOpen && e.deltaY > 30) {
        wheelAcc += e.deltaY;
        if (wheelAcc > 70) { this.open(); wheelAcc = 0; }
        if (wheelTimer) clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => { wheelAcc = 0; }, 400);
      } else if (this.isOpen && e.deltaY < -40) {
        const c = this.slideElement?.querySelector(".voltra-slice-content") as HTMLElement | null;
        if (c && c.scrollTop <= 5) this.close();
      }
    }, { passive: true });

    // Touch swipe
    let touchY = 0;
    window.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener("touchend", (e) => {
      const delta = touchY - e.changedTouches[0].clientY;
      if (!this.isOpen && delta > 60) {
        this.open();
      } else if (this.isOpen && delta < -60) {
        const c = this.slideElement?.querySelector(".voltra-slice-content") as HTMLElement | null;
        if (c && c.scrollTop <= 5) this.close();
      }
    }, { passive: true });
  }

  public open(): void {
    if (this.isOpen || !this.slideElement) return;
    this.isOpen = true;
    this.slideElement.classList.add("slice-approaching");
    this.slideElement.classList.remove("slice-leaving");
    this.slideElement.setAttribute("aria-hidden", "false");
    document.body.classList.add("voltra-slide-open");
    this.onOpenCallback?.();
  }

  public close(): void {
    if (!this.isOpen || !this.slideElement) return;
    this.isOpen = false;
    this.slideElement.classList.remove("slice-approaching");
    this.slideElement.classList.add("slice-leaving");
    this.slideElement.setAttribute("aria-hidden", "true");
    document.body.classList.remove("voltra-slide-open");
    setTimeout(() => {
      if (!this.isOpen && this.slideElement) this.slideElement.classList.remove("slice-leaving");
    }, 800);
    this.onCloseCallback?.();
  }

  public toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  public setTheme(theme: Theme): void {
    this.currentTheme = theme;
    if (!this.slideElement) return;
    if (theme === "dark") {
      this.slideElement.classList.remove("slice-theme-light");
      this.slideElement.classList.add("slice-theme-dark");
    } else {
      this.slideElement.classList.remove("slice-theme-dark");
      this.slideElement.classList.add("slice-theme-light");
    }
  }

  public getTheme(): Theme { return this.currentTheme; }
  public getIsOpen(): boolean { return this.isOpen; }

  public destroy(): void {
    if (this.slideElement?.parentElement) {
      this.slideElement.parentElement.removeChild(this.slideElement);
      this.slideElement = null;
    }
    document.body.classList.remove("voltra-slide-open");
  }
}
