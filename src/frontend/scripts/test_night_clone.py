import cv2
import numpy as np

img_night = cv2.imread("public/assets/cinematic/last-frame.webp")
cx, cy = 1157, 592
w, h = 60, 70

src_patch = img_night[cy - h//2 : cy + h//2, 1200 : 1200 + w]
clone_mask = np.full((h, w, 3), 255, dtype=np.uint8)

cloned_night = cv2.seamlessClone(src_patch, img_night, clone_mask, (cx, cy), cv2.NORMAL_CLONE)
cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/clone_night.png", cloned_night[500:710, 1000:1270])
print("Night clone complete.")
