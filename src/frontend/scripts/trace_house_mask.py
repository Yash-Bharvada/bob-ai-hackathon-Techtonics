import cv2
import numpy as np

img = cv2.imread("public/assets/cinematic/first-frame.webp")
h, w, _ = img.shape

# Let's find edges in the roof area by thresholding or Canny, and plotting candidate points:
test_img = img.copy()

# Candidate polygon points for the house silhouette (including chimney, roof slant, right flat wing, deck)
poly_pts = [
    # Left deck and ground
    [0, 1440],
    [0, 1070],
    [170, 1070],
    [180, 805],
    [180, 785],
    [210, 780],
    # Slanted roof to chimney
    [792, 600],
    [792, 425],
    [955, 425],
    [955, 545],
    # Slanted roof to top peak
    [1642, 238],
    [1648, 252],
    # Peak angled back to flat roof junction
    [1582, 530],
    [1582, 780],
    # Flat roof to right eave
    [2242, 780],
    [2242, 825],
    # Right wall and deck
    [2075, 825],
    [2075, 1070],
    [2270, 1070],
    [2270, 1160],
    [2560, 1160],
    [2560, 1440]
]

pts = np.array(poly_pts, np.int32).reshape((-1, 1, 2))
cv2.polylines(test_img, [pts], isClosed=True, color=(0, 0, 255), thickness=3)

# Save cropped visualization of the roofline
crop_vis = test_img[200:1200, 100:2350]
cv2.imwrite("C:/Users/Administrator/.gemini/antigravity-ide/brain/56ca83b8-ad93-4d48-a11e-02032ebace15/scratch/poly_test.png", crop_vis)
print("Saved poly_test.png")
