# ==============================================================================
# AuraMarket Multi-Vendor Platform — Enterprise Frontend Dockerfile
# Multi-stage Vite production build + High-performance Nginx Alpine server
# ==============================================================================

# STAGE 1: Vite application build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# STAGE 2: Lightweight production Nginx web server
FROM nginx:1.25-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized enterprise Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
