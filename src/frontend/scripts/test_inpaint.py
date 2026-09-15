import cv2
import numpy as np

img_day = cv2.imread("public/assets/cinematic/first-frame.webp")
img_night = cv2.imread("public/assets/cinematic/last-frame.webp")

# Create a mask covering the watermark
mask = np.zeros(img_day.shape[:2], dtype=np.uint8)

# The watermark is a 4-point star with center at (1157, 592)
# Top: (1157, 560), Bottom: (1157, 624), Left: (1136, 592), Right: (1180, 592)
# Let's draw a slightly dilated 4-point star / diamond polygon:
pts = np.array([
    [1157, 555],
    [1168, 580],
    [1184, 592],
    [1168, 604],
    [1157, 629],
    [1146, 604],
    [1130, 592],
    [1146, 580]
], np.int32)
pts = pts.reshape((-1, 1, 2))

cv2.fillPoly(mask, [pts], 255)
# Dilate by 3 pixels to ensure soft boundary coverage
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
mask = cv2.dilate(mask, kernel, iterations=1)

# Inpaint using Telea and Navier-Stokes
inpainted_telea_day = cv2.inpaint(img_day, mask, 5, cv2.INPAINT_TELEA)
inpainted_ns_day = cv2.inpaint(img_day, mask, 5, cv2.INPAINT_NS)

inpainted_telea_night = cv2.inpaint(img_night, mask, 5, cv2.INPAINT_TELEA)

cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/inpaint_telea_day.png", inpainted_telea_day[500:710, 1000:1270])
cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/inpaint_ns_day.png", inpainted_ns_day[500:710, 1000:1270])
cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/inpaint_telea_night.png", inpainted_telea_night[500:710, 1000:1270])
print("Inpainting test complete.")
