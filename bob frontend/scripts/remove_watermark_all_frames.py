import os
import glob
import cv2
import numpy as np

def remove_watermark_from_image(img):
    # Watermark position: center at (1157, 592), size 60x70
    cx, cy = 1157, 592
    w, h = 60, 70

    # Source patch sampled from identical grass depth right next to it:
    # x: 1200 to 1260, y: 557 to 627
    src_patch = img[cy - h//2 : cy + h//2, 1200 : 1200 + w]
    clone_mask = np.full((h, w, 3), 255, dtype=np.uint8)

    # Perform Poisson seamless cloning to reconstruct the grass surface
    cleaned = cv2.seamlessClone(src_patch, img, clone_mask, (cx, cy), cv2.NORMAL_CLONE)
    return cleaned

def main():
    base_dir = "public/assets/cinematic"
    frames_dir = os.path.join(base_dir, "frames")
    frame_files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.webp")))
    
    print("==================================================")
    print("   Removing Watermark Across All Cinematic Frames ")
    print("==================================================")
    print(f"Total frame files found: {len(frame_files)}")

    # 1. Process all sequential frames
    for i, frame_path in enumerate(frame_files):
        img = cv2.imread(frame_path)
        if img is None:
            print(f"Warning: Could not read {frame_path}")
            continue

        cleaned = remove_watermark_from_image(img)
        # Save as WebP with high quality
        cv2.imwrite(frame_path, cleaned, [cv2.IMWRITE_WEBP_QUALITY, 85])
        if (i + 1) % 25 == 0 or (i + 1) == len(frame_files):
            print(f"Processed {i + 1}/{len(frame_files)} frames...")

    # 2. Process static first-frame.webp and last-frame.webp
    for static_name in ["first-frame.webp", "last-frame.webp"]:
        static_path = os.path.join(base_dir, static_name)
        if os.path.exists(static_path):
            img = cv2.imread(static_path)
            if img is not None:
                cleaned = remove_watermark_from_image(img)
                cv2.imwrite(static_path, cleaned, [cv2.IMWRITE_WEBP_QUALITY, 85])
                print(f"Processed static asset: {static_name}")

    print("\n[SUCCESS] Watermark successfully removed from all frames and static assets!\n")

if __name__ == "__main__":
    main()
