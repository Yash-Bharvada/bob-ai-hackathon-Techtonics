export type Theme = "light" | "dark";

export type Direction = "forward" | "reverse" | "idle";

export interface PlaybackState {
  currentFrame: number;
  totalFrames: number;
  progress: number;
  direction: Direction;
  isPlaying: boolean;
  targetTheme: Theme;
  isSettled: boolean;
}

export interface CinematicMetadata {
  sourceVideo?: string;
  totalFrames: number;
  fps: number;
  aspectRatio: string;
  width: number;
  height: number;
  firstFrame: string;
  lastFrame: string;
  framesPattern: string;
  firstIndex: number;
  lastIndex: number;
  generatedAt?: string;
}

export interface CinematicPlayerOptions {
  basePath?: string;
  metadata?: CinematicMetadata;
  initialTheme?: Theme;
  fps?: number;
  debug?: boolean;
  fit?: "cover" | "contain";
  onFrameChange?: (state: PlaybackState) => void;
  onTransitionComplete?: (theme: Theme) => void;
  onPreloadProgress?: (loaded: number, total: number) => void;
  onReady?: () => void;
}
