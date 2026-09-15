import type { CinematicMetadata } from "./types.ts";

export const DEFAULT_CINEMATIC_METADATA: CinematicMetadata = {
  totalFrames: 169,
  fps: 24,
  aspectRatio: "16:9",
  width: 2560,
  height: 1440,
  firstFrame: "first-frame.webp",
  lastFrame: "last-frame.webp",
  framesPattern: "web/frame_%04d.webp",
  firstIndex: 0,
  lastIndex: 168,
};

export const DEFAULT_BASE_PATH = "/assets/cinematic";

export function formatFrameUrl(basePath: string, pattern: string, index: number): string {
  const paddedIndex = String(index).padStart(4, "0");
  const relativePath = pattern.replace("%04d", paddedIndex);
  return `${basePath.replace(/\/$/, "")}/${relativePath}`;
}

export function getStaticFrameUrl(
  basePath: string,
  type: "first" | "last",
  metadata: CinematicMetadata = DEFAULT_CINEMATIC_METADATA,
): string {
  const fileName = type === "first" ? metadata.firstFrame : metadata.lastFrame;
  return `${basePath.replace(/\/$/, "")}/${fileName}`;
}
