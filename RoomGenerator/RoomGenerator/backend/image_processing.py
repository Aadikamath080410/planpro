import cv2
import numpy as np
import os

# Fix for some OpenCV versions
cv2.ocl.setUseOpenCL(False)

def stitch_and_process(image_paths, output_folder="output"):
    """
    1. Stitches a list of image paths into a panorama.
    2. Resizes and pads the result to 1024x512 (Standard AI Input).
    3. Returns the path to the final processed image.
    """
    
    # --- STEP 1: LOAD IMAGES ---
    images = []
    for path in image_paths:
        img = cv2.imread(path)
        if img is not None:
            images.append(img)
        else:
            print(f"Warning: Could not load {path}")

    if len(images) < 2:
        raise ValueError("Need at least 2 valid images to stitch.")

    # --- STEP 2: STITCHING ---
    stitcher = cv2.Stitcher_create(mode=cv2.Stitcher_PANORAMA)
    status, panorama = stitcher.stitch(images)

    if status != cv2.Stitcher_OK:
        # Map error codes to messages
        errors = {
            1: "ERR_NEED_MORE_IMGS: Not enough distinctive features.",
            2: "ERR_HOMOGRAPHY_EST_FAIL: Perspective shift failure.",
            3: "ERR_CAMERA_PARAMS_ADJUST_FAIL: Alignment failed."
        }
        err_msg = errors.get(status, f"Unknown Stitching Error Code: {status}")
        raise RuntimeError(err_msg)

    # --- STEP 3: PREPARE FOR AI (Resize & Pad) ---
    # Standard AI Input Size (2:1 ratio)
    TARGET_W = 1024
    TARGET_H = 512

    h, w = panorama.shape[:2]

    # Resize to fit in the "middle band" (approx 60% of height)
    # This mimics a 360 camera's field of view
    new_h = int(TARGET_H * 0.6)
    scale = new_h / h
    new_w = int(w * scale)

    resized_stitch = cv2.resize(panorama, (new_w, new_h))

    # Create Black Canvas (Equirectangular projection needs 2:1 ratio)
    canvas = np.zeros((TARGET_H, TARGET_W, 3), dtype=np.uint8)

    # Paste stitch in the center
    y_offset = (TARGET_H - new_h) // 2
    x_offset = (TARGET_W - new_w) // 2

    # Clip if wider than canvas (rare, but safety first)
    if x_offset < 0:
        x_offset = 0
        if new_w > TARGET_W:
            resized_stitch = resized_stitch[:, :TARGET_W]
            new_w = TARGET_W

    # Place image on canvas
    canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized_stitch

    # --- STEP 4: SAVE OUTPUT ---
    # Ensure output folder exists
    os.makedirs(output_folder, exist_ok=True)
    
    # We save two files: 
    # 1. The Raw Stitch (for debugging/visuals)
    # 2. The AI Ready Image (for the model)
    
    raw_path = os.path.join(output_folder, "stitch_debug_raw.jpg")
    cv2.imwrite(raw_path, panorama)

    ai_input_path = os.path.join(output_folder, "ai_input_raw.png")
    cv2.imwrite(ai_input_path, canvas)

    return ai_input_path