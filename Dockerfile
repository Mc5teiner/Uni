# ─── Stage 1: Build frontend ─────────────────────────────────────────────────
FROM node:22-bookworm-slim as frontend-builder

WORKDIR /app/study-tool
COPY study-tool/package*.json ./
RUN npm ci --prefer-offline

COPY study-tool/ ./
RUN npm run build

# ─── Stage 2: Build backend ───────────────────────────────────────────────────
FROM node:22-slim AS backend-builder

WORKDIR /app/server
COPY server/package*.json ./
# Install all deps (including dev for TypeScript compilation)
RUN npm ci --prefer-offline

COPY server/ ./
RUN npm run build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:22-slim AS production

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install only production dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev --prefer-offline

# Copy built artifacts
COPY --from=backend-builder /app/server/dist ./server/dist
COPY --from=frontend-builder /app/study-tool/dist ./study-tool/dist

# Data directory for SQLite + secrets file
RUN mkdir -p /data && chown appuser:appgroup /data

# Drop privileges
USER appuser

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

EXPOSE 3000

# Healthcheck: verify server is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/auth/check-setup || exit 1

CMD ["node", "server/dist/index.js"]
