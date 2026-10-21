# ──────────────────────────────────────────────────────────────────────────────
# PlanPro — Python AI Server (FastAPI + HorizonNet + OpenCV)
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.10-slim

# System libraries required by OpenCV (headless build)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer-cached unless requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create required runtime directories
RUN mkdir -p uploads output

# ── HorizonNet model weights ──────────────────────────────────────────────────
# The weights file (horizonnet.pth) is large (~100 MB) and should NOT be in git.
# Option A: Commit it via Git LFS (recommended for Railway/Render).
# Option B: Download at container startup — set WEIGHTS_URL env var and
#           uncomment the line below:
# RUN test -n "$WEIGHTS_URL" && wget -q -O HorizonNet/horizonnet.pth "$WEIGHTS_URL" || true
# ─────────────────────────────────────────────────────────────────────────────

EXPOSE 8000

# AI_SERVER_PUBLIC_URL is read by server.py to build panorama URLs in responses.
# Set this to your deployed domain (e.g. https://planpro-ai.up.railway.app) on the platform.
ENV AI_SERVER_PUBLIC_URL=""

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
