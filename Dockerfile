# ─────────────────────────────────────────────────────────────────────
# Dockerfile — MemoryWeaver multi-stage build for Google Cloud Run
#
# Stage 1 (builder) : Installs deps and builds the React SPA
# Stage 2 (runtime) : Lightweight Node 20 image with only production deps
#
# Environment variables are injected at runtime via Cloud Run secrets or
# the --set-env-vars flag.  Never bake secrets into the image.
# ─────────────────────────────────────────────────────────────────────

# ── Stage 1: Build the React SPA ────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy and install client dependencies
COPY client/package*.json ./client/
RUN cd client && npm ci --prefer-offline

# Copy client source and build
COPY client/ ./client/
RUN cd client && npm run build
# Output: /app/client/dist

# ── Stage 2: Production runtime ─────────────────────────────────────
FROM node:20-alpine AS runtime

# Security: run as non-root user
RUN addgroup -S memweaver && adduser -S memweaver -G memweaver

WORKDIR /app

# Copy and install server production dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production --prefer-offline

# Copy server source
COPY server/ ./server/

# Copy built SPA from builder stage
COPY --from=builder /app/client/dist ./client/dist

# Cloud Run injects PORT (default 8080)
ENV NODE_ENV=production
ENV PORT=8080

# Switch to non-root user
USER memweaver

# Expose the server port
EXPOSE 8080

# Healthcheck — Cloud Run / load balancer verification
# Uses Node directly to avoid relying on wget/curl, which may not be present on Alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start the Express server
CMD ["node", "server/index.js"]
