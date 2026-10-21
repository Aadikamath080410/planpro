# ──────────────────────────────────────────────────────────────────────────────
# PlanPro — Express Backend (Node.js + TypeScript)
# Includes Python 3 runtime for the comparison engine's intra_RC.py script.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-slim

# Python 3 is required for child_process.exec("python intra_RC.py ...")
# in comparison.routes.ts
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Node dependencies ──────────────────────────────────────────────
COPY package*.json ./
RUN npm ci --omit=dev

# ── Build TypeScript ───────────────────────────────────────────────────────
COPY tsconfig.json .
COPY . .
RUN npm run build

# ── Copy the comparison engine (needed by child_process.exec at runtime) ───
# The real_compare folder lives one level up from /backend in the repo.
# We copy it in during the Docker build so the absolute path used in
# comparison.routes.ts resolves correctly inside the container.
COPY ../real_compare ./real_compare

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
