import cv2
import numpy as np

# Load first frame and last frame
img_day = cv2.imread("public/assets/cinematic/first-frame.webp")
img_night = cv2.imread("public/assets/cinematic/last-frame.webp")

h, w, _ = img_day.shape
print(f"Image shape: {w}x{h}")

# The watermark is in the bottom right corner.
# Let's crop x: 1000 to 1270, y: 500 to 710
crop_day = img_day[500:710, 1000:1270]
crop_night = img_night[500:710, 1000:1270]

cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/crop_day.png", crop_day)
cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/crop_night.png", crop_night)
print("Saved crops successfully.")
