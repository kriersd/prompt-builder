# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copy manifests first for layer caching
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Non-root user for security
RUN addgroup -S promptforge && adduser -S promptforge -G promptforge

WORKDIR /app

# Copy dependencies from build stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY --chown=promptforge:promptforge . .

# Ensure data directory exists and is writable by the app user
RUN mkdir -p /data && chown promptforge:promptforge /data

USER promptforge

EXPOSE 3000

# DATA_DIR points outside /app so it can be mounted as a volume
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data

CMD ["node", "server.js"]
