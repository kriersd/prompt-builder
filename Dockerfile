# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copy manifests first for layer caching
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --loglevel=error --no-update-notifier; else npm install --omit=dev --loglevel=error --no-update-notifier; fi

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Non-root user for security
RUN addgroup -S promptforge && adduser -S promptforge -G promptforge

WORKDIR /app

# Copy dependencies from build stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY --chown=promptforge:promptforge . .

# Create the data directory at the path used by docker-compose volumes (/data).
# Initialising it here ensures the named volume inherits the correct ownership
# on first mount, so the non-root user can write to it.
RUN mkdir -p /app/data && chown promptforge:promptforge /app/data

USER promptforge

EXPOSE 3000

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/app/data

CMD ["node", "server.js"]
