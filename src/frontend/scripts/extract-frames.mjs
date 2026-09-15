import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Configuration with sensible defaults and environment/CLI overrides
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultValue;
}

const sourceVideo = getArg(
  "--video",
  process.env.SOURCE_VIDEO || path.join(projectRoot, "Untitled.mp4"),
);
const outputDir = getArg("--out", path.join(projectRoot, "public", "assets", "cinematic"));
const framesDir = path.join(outputDir, "frames");
const fps = parseInt(getArg("--fps", "24"), 10);
const quality = parseInt(getArg("--quality", "82"), 10);

console.log("==================================================");
console.log("  Cinematic Day/Night Frame Extraction Pipeline   ");
console.log("==================================================");
console.log(`Source Video: ${sourceVideo}`);
console.log(`Output Directory: ${outputDir}`);
console.log(`Frame Rate: ${fps} FPS | Quality: ${quality}`);

// 1. Verify source video exists
if (!fs.existsSync(sourceVideo)) {
  console.error(`\n[ERROR] Source video not found at: ${sourceVideo}`);
  process.exit(1);
}

// 2. Locate FFmpeg binary
function findFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  // Try system PATH
  const checkCmd = process.platform === "win32" ? "where.exe ffmpeg" : "which ffmpeg";
  try {
    const out = execSync(checkCmd, { stdio: ["pipe", "pipe", "ignore"], encoding: "utf-8" }).trim();
    if (out) return out.split("\r\n")[0].split("\n")[0];
  } catch {}

  // Check known WinGet package directory on Windows
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || "";
    const wingetDir = path.join(localAppData, "Microsoft", "WinGet", "Packages");
    if (fs.existsSync(wingetDir)) {
      const walk = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const full = path.join(dir, file);
          try {
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
              const res = walk(full);
              if (res) return res;
            } else if (file.toLowerCase() === "ffmpeg.exe") {
              return full;
            }
          } catch {}
        }
        return null;
      };
      const found = walk(wingetDir);
      if (found) return found;
    }
  }

  return null;
}

const ffmpegPath = findFfmpeg();
if (!ffmpegPath) {
  console.error("\n[ERROR] FFmpeg was not found in PATH or standard package directories.");
  console.error("Please install FFmpeg or specify the path via FFMPEG_PATH environment variable.");
  process.exit(1);
}
console.log(`FFmpeg located: ${ffmpegPath}`);

// 3. Ensure target directories exist
fs.mkdirSync(framesDir, { recursive: true });

// 4. Extract frames as WebP
console.log(`\n[Extracting] Generating WebP frame sequence...`);
const pattern = path.join(framesDir, "frame_%04d.webp");

// Note: %04d in FFmpeg is 1-indexed by default, so frame_0001.webp to frame_0240.webp.
// We can also generate zero-indexed or standard 0000-based frames.
const ffmpegArgs = [
  "-y",
  "-i",
  sourceVideo,
  "-vf",
  `fps=${fps}`,
  "-c:v",
  "libwebp",
  "-quality",
  quality.toString(),
  "-compression_level",
  "4",
  "-fps_mode",
  "vfr",
  "-start_number",
  "0",
  pattern,
];

const res = spawnSync(ffmpegPath, ffmpegArgs, { stdio: "inherit" });
if (res.status !== 0) {
  console.error(`\n[ERROR] FFmpeg extraction failed with exit code ${res.status}`);
  process.exit(res.status || 1);
}

// 5. Count extracted frames and find first & last
const generatedFiles = fs
  .readdirSync(framesDir)
  .filter((f) => f.endsWith(".webp"))
  .sort();

const totalFrames = generatedFiles.length;
console.log(`[Extracted] Successfully generated ${totalFrames} frames.`);

if (totalFrames === 0) {
  console.error("\n[ERROR] No frames were generated.");
  process.exit(1);
}

const firstFrameFile = path.join(framesDir, generatedFiles[0]);
const lastFrameFile = path.join(framesDir, generatedFiles[totalFrames - 1]);

// 6. Copy dedicated static first-frame and last-frame assets
const firstFrameTarget = path.join(outputDir, "first-frame.webp");
const lastFrameTarget = path.join(outputDir, "last-frame.webp");

fs.copyFileSync(firstFrameFile, firstFrameTarget);
fs.copyFileSync(lastFrameFile, lastFrameTarget);

console.log(`[Static Assets] Created first-frame.webp (${generatedFiles[0]})`);
console.log(`[Static Assets] Created last-frame.webp (${generatedFiles[totalFrames - 1]})`);

// 7. Write metadata.json
const metadata = {
  sourceVideo: path.basename(sourceVideo),
  totalFrames,
  fps,
  aspectRatio: "16:9",
  width: 1280,
  height: 720,
  firstFrame: "first-frame.webp",
  lastFrame: "last-frame.webp",
  framesPattern: "frames/frame_%04d.webp",
  firstIndex: 0,
  lastIndex: totalFrames - 1,
  generatedAt: new Date().toISOString(),
};

const metadataPath = path.join(outputDir, "metadata.json");
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
console.log(`[Metadata] Generated ${metadataPath}`);

// 8. Automatically remove watermark from all frames using Python
const pythonScript = path.join(__dirname, "remove_watermark_all_frames.py");
if (fs.existsSync(pythonScript)) {
  console.log("\n[Post-Processing] Removing watermark from all extracted frames...");
  const pyRes = spawnSync("C:\\ProgramData\\anaconda3\\python.exe", [pythonScript], {
    stdio: "inherit",
  });
  if (pyRes.status !== 0) {
    console.warn(`[Warning] Watermark removal script exited with code ${pyRes.status}`);
  }
}

console.log("\nCinematic Day/Night frame extraction completed successfully!\n");
