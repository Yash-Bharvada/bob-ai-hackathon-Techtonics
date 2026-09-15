import os
import sys
import glob
import time
import subprocess
import cv2
import json

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cinematic_dir = os.path.join(project_root, "public", "assets", "cinematic")
    original_dir = os.path.join(cinematic_dir, "original")
    master_dir = os.path.join(cinematic_dir, "upscaled-master")
    web_dir = os.path.join(cinematic_dir, "web")
    bin_dir = os.path.join(project_root, "bin", "realesrgan")
    exe_path = os.path.join(bin_dir, "realesrgan-ncnn-vulkan.exe")
    models_dir = os.path.join(bin_dir, "models")

    print("==========================================================")
    print("  Cinematic 2x AI Upscaling Pipeline (1280x720 -> 2560x1440) ")
    print("==========================================================")

    # 1. Validation of dependencies
    if not os.path.exists(exe_path):
        print(f"[ERROR] Real-ESRGAN binary not found at: {exe_path}")
        sys.exit(1)

    if not os.path.exists(original_dir):
        print(f"[ERROR] Original frames directory not found: {original_dir}")
        sys.exit(1)

    input_files = sorted(glob.glob(os.path.join(original_dir, "frame_*.webp")))
    total_input = len(input_files)
    print(f"[Input] Found {total_input} source frames in: {original_dir}")

    if total_input == 0:
        print("[ERROR] No input frames found!")
        sys.exit(1)

    os.makedirs(master_dir, exist_ok=True)
    os.makedirs(web_dir, exist_ok=True)

    # 2. Batch AI Upscaling to 2560x1440 Master Lossless PNGs
    print(f"\n[AI Upscale] Running 2x Upscale (native 2x video model with Vulkan)...")
    print(f"[Model] realesr-animevideov3-x2 (temporally stable, zero GAN hallucinations)")
    print(f"[Target] 2560 x 1440 Lossless PNGs -> {master_dir}")

    cmd = [
        exe_path,
        "-i", original_dir,
        "-o", master_dir,
        "-s", "2",
        "-n", "realesr-animevideov3-x2",
        "-m", models_dir,
        "-t", "0",
        "-f", "png"
    ]

    start_time = time.time()
    res = subprocess.run(cmd)
    if res.returncode != 0:
        print(f"[ERROR] AI Upscaler failed with return code {res.returncode}")
        sys.exit(res.returncode)

    elapsed = time.time() - start_time
    print(f"[AI Upscale Completed] Elapsed time: {elapsed:.1f}s ({elapsed/total_input:.2f}s per frame)")

    # 3. Master Frame Verification
    master_files = sorted(glob.glob(os.path.join(master_dir, "frame_*.png")))
    if len(master_files) != total_input:
        print(f"[ERROR] Frame count mismatch! Expected {total_input} frames, found {len(master_files)} master files.")
        sys.exit(1)

    print(f"\n[Verification] Validating {len(master_files)} master PNG frames...")
    for idx, f in enumerate(master_files):
        img = cv2.imread(f)
        if img is None:
            print(f"[ERROR] Failed to read master frame: {f}")
            sys.exit(1)
        h, w, _ = img.shape
        if w != 2560 or h != 1440:
            print(f"[ERROR] Frame {f} has unexpected dimensions: {w}x{h} (expected 2560x1440)")
            sys.exit(1)

    print("[Verification Passed] All 169 master PNGs are verified at exactly 2560x1440 pixels.")

    # 4. Generate Web-Optimized 2560x1440 WebP Delivery Assets
    print(f"\n[Web Optimization] Encoding 2560x1440 WebP delivery frames (Quality: 85)...")
    web_start = time.time()

    for idx, f in enumerate(master_files):
        base_name = os.path.splitext(os.path.basename(f))[0]
        out_webp = os.path.join(web_dir, f"{base_name}.webp")
        img = cv2.imread(f)
        cv2.imwrite(out_webp, img, [cv2.IMWRITE_WEBP_QUALITY, 85])
        if (idx + 1) % 25 == 0 or (idx + 1) == total_input:
            print(f"Encoded {idx + 1}/{total_input} web frames...")

    web_elapsed = time.time() - web_start
    print(f"[Web Optimization Completed] Elapsed time: {web_elapsed:.1f}s")

    # 5. Create Dedicated Static First & Last Frames
    first_web = os.path.join(web_dir, "frame_0000.webp")
    last_web = os.path.join(web_dir, f"frame_{total_input-1:04d}.webp")

    static_first = os.path.join(cinematic_dir, "first-frame.webp")
    static_last = os.path.join(cinematic_dir, "last-frame.webp")

    first_img = cv2.imread(first_web)
    last_img = cv2.imread(last_web)

    cv2.imwrite(static_first, first_img, [cv2.IMWRITE_WEBP_QUALITY, 88])
    cv2.imwrite(static_last, last_img, [cv2.IMWRITE_WEBP_QUALITY, 88])

    print(f"\n[Static Assets] Updated 2560x1440 first-frame.webp and last-frame.webp")

    # 6. Update metadata.json
    metadata = {
        "sourceVideo": "Untitled.mp4",
        "totalFrames": total_input,
        "fps": 24,
        "aspectRatio": "16:9",
        "width": 2560,
        "height": 1440,
        "scale": 2,
        "firstFrame": "first-frame.webp",
        "lastFrame": "last-frame.webp",
        "framesPattern": "web/frame_%04d.webp",
        "masterPattern": "upscaled-master/frame_%04d.png",
        "originalPattern": "original/frame_%04d.webp",
        "firstIndex": 0,
        "lastIndex": total_input - 1,
        "model": "realesr-animevideov3-x2",
        "upscaledAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    meta_path = os.path.join(cinematic_dir, "metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Metadata] Updated {meta_path}")
    print("\n[SUCCESS] Entire 2x AI upscaling pipeline finished successfully!\n")

if __name__ == "__main__":
    main()
