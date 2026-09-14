import cv2
import numpy as np

# In crop_day (270 width x 210 height, origin at x=1000, y=500):
# The star center is approximately at x_local ~ 155, y_local ~ 100
# Let's inspect coordinates precisely:
# Full image coordinates:
# x: 1000 + 130 = 1130 to 1000 + 185 = 1185 (width ~55px)
# y: 500 + 70 = 570 to 500 + 130 = 630 (height ~60px)

img = cv2.imread("public/assets/cinematic/first-frame.webp")

# Let's draw a rectangle around the estimated box and save to scratch
test_rect = img.copy()
x1, y1, x2, y2 = 1130, 565, 1185, 630
cv2.rectangle(test_rect, (x1, y1), (x2, y2), (0, 0, 255), 2)
cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/test_box.png", test_rect[500:710, 1000:1270])
print(f"Bounding box: x=({x1}, {x2}), y=({y1}, {y2})")
