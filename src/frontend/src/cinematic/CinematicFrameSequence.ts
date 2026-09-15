import type {
  Direction,
  CinematicMetadata,
  CinematicPlayerOptions,
  PlaybackState,
  Theme,
} from "./types.ts";
import {
  DEFAULT_BASE_PATH,
  DEFAULT_CINEMATIC_METADATA,
  formatFrameUrl,
  getStaticFrameUrl,
} from "./config.ts";

export class CinematicFrameSequence {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: CinematicPlayerOptions;
  private metadata: CinematicMetadata;
  private basePath: string;

  // Frame Cache
  private frames: (HTMLImageElement | null)[] = [];
  private loadedCount: number = 0;
  private isPreloading: boolean = false;

  // Playback State
  private _currentFrame: number = 0;
  private _direction: Direction = "idle";
  private _isPlaying: boolean = false;
  private _targetTheme: Theme = "light";
  private _targetFrame: number = 0;

  // Timing
  private lastTime: number = 0;
  private frameDurationMs: number = 1000 / 24;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Listeners
  private onFrameChange?: (state: PlaybackState) => void;
  private onTransitionComplete?: (theme: Theme) => void;
  private onPreloadProgress?: (loaded: number, total: number) => void;

  constructor(container: HTMLElement, options: CinematicPlayerOptions = {}) {
    this.container = container;
    this.options = options;
    this.basePath = options.basePath || DEFAULT_BASE_PATH;
    this.metadata = options.metadata || DEFAULT_CINEMATIC_METADATA;
    this.frameDurationMs = 1000 / (options.fps || this.metadata.fps || 24);
    this._targetTheme = options.initialTheme || "light";
    this._currentFrame = this._targetTheme === "dark" ? this.metadata.lastIndex : 0;
    this._targetFrame = this._currentFrame;

    this.onFrameChange = options.onFrameChange;
    this.onTransitionComplete = options.onTransitionComplete;
    this.onPreloadProgress = options.onPreloadProgress;

    // Allocate frame cache slots
    this.frames = new Array(this.metadata.totalFrames).fill(null);

    // Setup Canvas
    this.canvas = document.createElement("canvas");
    this.canvas.className = "cinematic-canvas";
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.objectFit = options.fit || "cover";

    const context = this.canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Unable to obtain 2D rendering context for Cinematic canvas.");
    }
    this.ctx = context;

    this.container.appendChild(this.canvas);

    // Handle high-DPI and responsive layout
    this.setupResizeObserver();

    // Initial immediate load of static first/last frame
    this.loadInitialFrames();
  }

  public get currentFrame(): number {
    return this._currentFrame;
  }

  public get totalFrames(): number {
    return this.metadata.totalFrames;
  }

  public get direction(): Direction {
    return this._direction;
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public get progress(): number {
    if (this.metadata.lastIndex <= 0) return 0;
    return this._currentFrame / this.metadata.lastIndex;
  }

  public get targetTheme(): Theme {
    return this._targetTheme;
  }

  public get isSettled(): boolean {
    if (this._targetTheme === "light") {
      return this._currentFrame === 0 && !this._isPlaying;
    }
    return this._currentFrame === this.metadata.lastIndex && !this._isPlaying;
  }

  public getState(): PlaybackState {
    return {
      currentFrame: this._currentFrame,
      totalFrames: this.totalFrames,
      progress: this.progress,
      direction: this._direction,
      isPlaying: this._isPlaying,
      targetTheme: this._targetTheme,
      isSettled: this.isSettled,
    };
  }

  /**
   * Load priority frames immediately:
   * First frame (Day) and Last frame (Night)
   */
  private loadInitialFrames(): void {
    const firstUrl = getStaticFrameUrl(this.basePath, "first", this.metadata);
    const lastUrl = getStaticFrameUrl(this.basePath, "last", this.metadata);

    const firstImg = new Image();
    firstImg.src = firstUrl;
    firstImg.onload = () => {
      this.frames[0] = firstImg;
      this.loadedCount++;
      if (this._currentFrame === 0) {
        this.renderFrame(0);
      }
      this.options.onReady?.();
    };

    const lastImg = new Image();
    lastImg.src = lastUrl;
    lastImg.onload = () => {
      this.frames[this.metadata.lastIndex] = lastImg;
      this.loadedCount++;
      if (this._currentFrame === this.metadata.lastIndex) {
        this.renderFrame(this.metadata.lastIndex);
      }
    };

    // Begin background preloading of full sequence
    this.startBackgroundPreload();
  }

  /**
   * Asynchronously preloads all frames in chunks without freezing the main thread.
   */
  public startBackgroundPreload(): void {
    if (this.isPreloading) return;
    this.isPreloading = true;

    const concurrency = 6;
    let nextIndex = 0;
    const total = this.metadata.totalFrames;

    const loadNext = () => {
      if (nextIndex >= total) return;
      const index = nextIndex++;
      if (this.frames[index]) {
        loadNext();
        return;
      }

      const img = new Image();
      img.decoding = "async";
      img.src = formatFrameUrl(this.basePath, this.metadata.framesPattern, index);
      img.onload = () => {
        this.frames[index] = img;
        this.loadedCount++;
        this.onPreloadProgress?.(this.loadedCount, total);
        loadNext();
      };
      img.onerror = () => {
        this.log(`Failed to load frame ${index}`);
        loadNext();
      };
    };

    for (let i = 0; i < concurrency; i++) {
      loadNext();
    }
  }

  /**
   * Play forward towards the last frame (Dark mode).
   */
  public playForward(): void {
    this._targetTheme = "dark";
    this._targetFrame = this.metadata.lastIndex;
    this._direction = "forward";
    this.log(`[Cinematic] Forward playback started from frame ${this._currentFrame}`);
    this.startLoop();
  }

  /**
   * Play in reverse towards frame 0 (Light mode).
   */
  public playReverse(): void {
    this._targetTheme = "light";
    this._targetFrame = 0;
    this._direction = "reverse";
    this.log(`[Cinematic] Reverse playback started from frame ${this._currentFrame}`);
    this.startLoop();
  }

  /**
   * Immediately jump to a specific frame without animation.
   */
  public seek(frameIndex: number): void {
    this.pause();
    this._currentFrame = Math.max(0, Math.min(frameIndex, this.metadata.lastIndex));
    this._targetFrame = this._currentFrame;
    this.renderFrame(this._currentFrame);
    this.notifyState();
  }

  public resetToFirstFrame(): void {
    this.seek(0);
    this._targetTheme = "light";
    this._direction = "idle";
    this.notifyState();
  }

  public resetToLastFrame(): void {
    this.seek(this.metadata.lastIndex);
    this._targetTheme = "dark";
    this._direction = "idle";
    this.notifyState();
  }

  public pause(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this._isPlaying = false;
    this._direction = "idle";
    this.notifyState();
  }

  /**
   * Starts the requestAnimationFrame loop if not already running.
   */
  private startLoop(): void {
    if (this._isPlaying) return;
    this._isPlaying = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
    this.notifyState();
  }

  /**
   * Main animation tick driven by performance.now() elapsed time.
   * Ensures strict 24 FPS pacing regardless of screen refresh rate (60Hz, 120Hz, etc.)
   */
  private tick = (timestamp: number): void => {
    if (!this._isPlaying) return;

    const elapsed = timestamp - this.lastTime;

    if (elapsed >= this.frameDurationMs) {
      const framesToAdvance = Math.floor(elapsed / this.frameDurationMs);
      this.lastTime = timestamp - (elapsed % this.frameDurationMs);

      if (this._direction === "forward") {
        this._currentFrame += framesToAdvance;
        if (this._currentFrame >= this._targetFrame) {
          this._currentFrame = this._targetFrame;
          this.completePlayback();
          return;
        }
      } else if (this._direction === "reverse") {
        this._currentFrame -= framesToAdvance;
        if (this._currentFrame <= this._targetFrame) {
          this._currentFrame = this._targetFrame;
          this.completePlayback();
          return;
        }
      }

      this.renderFrame(this._currentFrame);
      this.notifyState();
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Invoked when animation finishes reaching target boundary.
   */
  private completePlayback(): void {
    this.renderFrame(this._currentFrame);
    this.pause();

    const reachedTheme: Theme = this._currentFrame === 0 ? "light" : "dark";
    this.log(
      `[Cinematic] Reached ${reachedTheme.toUpperCase()} frame (${this._currentFrame}). Loop stopped.`,
    );
    this.onTransitionComplete?.(reachedTheme);
  }

  /**
   * Renders the requested frame to canvas using aspect-ratio preserving cover logic.
   */
  public renderFrame(index: number): void {
    const clampedIndex = Math.max(0, Math.min(index, this.metadata.lastIndex));
    let img = this.frames[clampedIndex];

    // Fallback search to nearest cached frame if current frame hasn't finished loading
    if (!img || !img.complete) {
      img = this.findNearestLoadedFrame(clampedIndex);
    }

    if (!img || !img.complete) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    if (canvasWidth === 0 || canvasHeight === 0) return;

    const imgWidth = img.naturalWidth || this.metadata.width;
    const imgHeight = img.naturalHeight || this.metadata.height;

    // Cover math: center crop while maintaining aspect ratio
    const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const offsetX = (canvasWidth - drawWidth) / 2;
    const offsetY = (canvasHeight - drawHeight) / 2;

    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  private findNearestLoadedFrame(target: number): HTMLImageElement | null {
    // Check first/last frame first
    if (this.frames[0]?.complete) {
      if (target <= 20) return this.frames[0];
    }
    if (this.frames[this.metadata.lastIndex]?.complete) {
      if (target >= this.metadata.lastIndex - 20) return this.frames[this.metadata.lastIndex];
    }

    // Search outwards from target
    let radius = 1;
    while (target - radius >= 0 || target + radius < this.metadata.totalFrames) {
      if (target - radius >= 0 && this.frames[target - radius]?.complete) {
        return this.frames[target - radius];
      }
      if (target + radius < this.metadata.totalFrames && this.frames[target + radius]?.complete) {
        return this.frames[target + radius];
      }
      radius++;
    }
    return this.frames[0] || this.frames[this.metadata.lastIndex] || null;
  }

  private setupResizeObserver(): void {
    const updateSize = () => {
      const rect = this.container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
      const newWidth = Math.round(rect.width * dpr);
      const newHeight = Math.round(rect.height * dpr);

      if (this.canvas.width !== newWidth || this.canvas.height !== newHeight) {
        this.canvas.width = newWidth || 1280;
        this.canvas.height = newHeight || 720;
        this.renderFrame(this._currentFrame);
      }
    };

    updateSize();
    this.resizeObserver = new ResizeObserver(() => updateSize());
    this.resizeObserver.observe(this.container);
  }

  private notifyState(): void {
    this.onFrameChange?.(this.getState());
  }

  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[CinematicFrameSequence] ${message}`);
    }
  }

  public destroy(): void {
    this.pause();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.frames = [];
  }
}
