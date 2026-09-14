import cv2
import numpy as np

img = cv2.imread("public/assets/cinematic/first-frame.webp")

# Target watermark center
cx, cy = 1157, 592
w, h = 60, 70

# Source grass patch right next to it:
# x: 1205 to 1265 (same y: 557 to 627)
src_patch = img[cy - h//2 : cy + h//2, 1200 : 1200 + w]

# Create an elliptical mask for seamless blending
clone_mask = np.full((h, w, 3), 255, dtype=np.uint8)

# Seamless clone
cloned = cv2.seamlessClone(src_patch, img, clone_mask, (cx, cy), cv2.NORMAL_CLONE)

# Also test Mixed clone
mixed = cv2.seamlessClone(src_patch, img, clone_mask, (cx, cy), cv2.MIXED_CLONE)

cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/clone_normal.png", cloned[500:710, 1000:1270])
cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/clone_mixed.png", mixed[500:710, 1000:1270])
print("Clone tests saved.")
