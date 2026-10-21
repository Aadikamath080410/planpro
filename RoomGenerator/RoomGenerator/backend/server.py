import os
import sys
import shutil
import json
import subprocess
import cv2
import numpy as np
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response
# Fix for some OpenCV versions (from your image_processing.py)
cv2.ocl.setUseOpenCL(False)

app = FastAPI()

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


# 1. Create a custom class to force CORS headers on images
class CORSStaticFiles(StaticFiles):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

# 2. Replace your old app.mount with this one:
app.mount("/output", CORSStaticFiles(directory=OUTPUT_DIR), name="output")

# --- INTEGRATED STITCHING LOGIC (from your image_processing.py) ---
def stitch_and_process(image_paths, output_folder="output"):
    images = []
    for path in image_paths:
        img = cv2.imread(path)
        if img is not None: images.append(img)
    
    if len(images) < 2:
        raise ValueError("Need at least 2 images to stitch.")

    stitcher = cv2.Stitcher_create(mode=cv2.Stitcher_PANORAMA)
    status, panorama = stitcher.stitch(images)

    if status != cv2.Stitcher_OK:
        # FALLBACK: If automatic stitching fails, tile the captured images evenly across the panorama
        if len(images) >= 2:
            print(f"Auto-stitch failed (status {status}). Falling back to manual {len(images)}-wall concatenation.")
            TARGET_W, TARGET_H = 1024, 512
            canvas = np.zeros((TARGET_H, TARGET_W, 3), dtype=np.uint8)
            
            seg_w = TARGET_W // len(images)
            for i, img in enumerate(images):
                # Resize each image to fit segment width and 75% height to allow padding
                wall_img = cv2.resize(img, (seg_w, 384))
                # Place in the center vertically
                canvas[64:448, i*seg_w:(i+1)*seg_w] = wall_img
                
            ai_input_path = os.path.join(output_folder, "ai_input_raw.png")
            cv2.imwrite(ai_input_path, canvas)
            return ai_input_path

        errors = {
            1: "FEATURE_MATCH_FAILED: Try taking photos with more overlap between them.",
            2: "GEOMETRY_ERROR: Orientation of photos is too distorted.",
            3: "CAMERA_PARAMS_ERROR: Camera metadata is incompatible."
        }
        raise RuntimeError(errors.get(status, f"Stitching Error: {status}"))

    # Prepare for AI (Resize & Pad)
    TARGET_W, TARGET_H = 1024, 512
    h, w = panorama.shape[:2]
    new_h = int(TARGET_H * 0.6)  # The "60% height" logic from your script
    scale = new_h / h
    new_w = int(w * scale)
    
    resized_stitch = cv2.resize(panorama, (new_w, new_h))
    canvas = np.zeros((TARGET_H, TARGET_W, 3), dtype=np.uint8)
    
    y_offset = (TARGET_H - new_h) // 2
    x_offset = (TARGET_W - new_w) // 2

    # Clipping/Centering logic from your script
    if x_offset < 0:
        x_offset = 0
        if new_w > TARGET_W:
            resized_stitch = resized_stitch[:, :TARGET_W]
            new_w = TARGET_W

    canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized_stitch
    
    ai_input_path = os.path.join(output_folder, "ai_input_raw.png")
    cv2.imwrite(ai_input_path, canvas)
    return ai_input_path

# --- INTEGRATED MATH LOGIC (from your calc_dimensions.py) ---
def calculate_room_dimensions(json_data, camera_height=1.5, ceiling_height=3.0):
    raw_points = sorted(json_data['uv'], key=lambda p: p[0])
    image_width, corners = 1024, []

    if raw_points:
        curr_x, curr_ys = [raw_points[0][0]], [raw_points[0][1]]
        for i in range(1, len(raw_points)):
            if (raw_points[i][0] * image_width - curr_x[-1] * image_width) < 20:
                curr_x.append(raw_points[i][0]); curr_ys.append(raw_points[i][1])
            else:
                corners.append({'x': sum(curr_x)/len(curr_x), 'ceil': min(curr_ys), 'floor': max(curr_ys)})
                curr_x, curr_ys = [raw_points[i][0]], [raw_points[i][1]]
        corners.append({'x': sum(curr_x)/len(curr_x), 'ceil': min(curr_ys), 'floor': max(curr_ys)})

    h_upper = ceiling_height - camera_height
    wall_depths = []
    for i in range(len(corners)):
        c1, c2 = corners[i], corners[(i + 1) % len(corners)]
        ang_f = ((c1['floor'] + c2['floor'])/2.0 - 0.5) * np.pi
        ang_u = (0.5 - (c1['ceil'] + c2['ceil'])/2.0) * np.pi
        
        d_f = camera_height / np.tan(ang_f) if ang_f > 0.01 else 0
        d_c = h_upper / np.tan(ang_u) if ang_u > 0.01 else 0
        
        # 0.6 Floor / 0.4 Ceiling Weighted Average from your file
        if abs(d_f - d_c) > 2.0: final_d = min(d_f, d_c)
        else: final_d = (d_f * 0.6) + (d_c * 0.4)
        wall_depths.append(min(final_d, 12.0))

    if len(wall_depths) >= 4:
        l, b = wall_depths[0] + wall_depths[2], wall_depths[1] + wall_depths[3]
        return {"length": round(l, 2), "breadth": round(b, 2), "area": round(l*b, 2)}
    return {"perimeter": round(sum(wall_depths), 2)}

@app.post("/process-room")
async def process_room(files: List[UploadFile] = File(...), ceilingHeight: float = Form(3.0), cameraHeight: float = Form(1.5)):
    try:
        # 1. Clear old uploads
        for f in os.listdir(UPLOAD_DIR): 
            os.remove(os.path.join(UPLOAD_DIR, f))
        
        # 2. Clear old outputs to prevent stale results (INSERTED HERE)
        for f in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, f)
            if os.path.isfile(file_path):
                os.remove(file_path)

        paths = []
        for file in files:
            p = os.path.join(UPLOAD_DIR, file.filename)
            with open(p, "wb") as b: 
                shutil.copyfileobj(file.file, b)
            paths.append(p)

        # 3. Stitch & Prep
        ai_img = stitch_and_process(paths, OUTPUT_DIR)
        
        # 2. AI Inference
        
        try:
            result = subprocess.run(
                [sys.executable, "inference.py", "--pth", "horizonnet.pth", "--img_glob", os.path.abspath(ai_img), "--output_dir", os.path.abspath(OUTPUT_DIR)],
                cwd="HorizonNet",
                capture_output=True, # Captures stdout and stderr
                text=True,
                check=True
            )
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"AI Inference failed: {e.stderr}")

        # 3. Load Results
        json_path = os.path.join(OUTPUT_DIR, "ai_input_raw.json")
        with open(json_path, 'r') as f: ai_data = json.load(f)

        # 4. Calculate Dimensions
        result = calculate_room_dimensions(ai_data, cameraHeight, ceilingHeight)
        
        # Determine the public base URL for serving output files.
        # In production set the AI_SERVER_PUBLIC_URL environment variable to your deployed domain.
        base_url = os.environ.get("AI_SERVER_PUBLIC_URL", "http://localhost:8000")
        return {
            "status": "success", 
            "results": result, 
            "panorama_url": f"{base_url}/output/ai_input_raw.png"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)