import cv2
import numpy as np

img = cv2.imread("public/assets/cinematic/first-frame.webp")
h, w, _ = img.shape

# Let's inspect the house silhouette region
# In 2560x1440:
# Left eave of slanted roof: ~ x: 300 to 450, y: 700 to 800
# Slanted roof peak: ~ x: 1550 to 1650, y: 400 to 500
# Chimney: ~ x: 790 to 950, y: 450 to 650
# Flat roof: ~ x: 1600 to 2300, y: 650 to 750

# Let's crop the roofline area and detect edges
roof_crop = img[350:900, 250:2350].copy()
cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/roof_crop.png", roof_crop)
print("Saved roof_crop.png")
