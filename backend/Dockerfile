# ==============================================================================
# AuraMarket Multi-Vendor Platform — Enterprise Backend Dockerfile
# Multi-stage optimized Node.js 20 Alpine container with zero-root security
# ==============================================================================

# STAGE 1: Dependency resolution & pruning
FROM node:20-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# STAGE 2: Production runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install wget for healthcheck and curl
RUN apk add --no-cache wget

# Create non-privileged service user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S auramarket -u 1001 -G nodejs

# Copy dependencies and application source
COPY --from=dependencies --chown=auramarket:nodejs /app/node_modules ./node_modules
COPY --chown=auramarket:nodejs . .

# Ensure storage directories exist with proper permissions
RUN mkdir -p uploads logs && chown -R auramarket:nodejs uploads logs

USER auramarket

EXPOSE 5000

# Continuous health monitoring check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "src/server.js"]
