# syntax=docker/dockerfile:1

# One image runs the whole app: the API serves the built frontend from ./public,
# so the reverse proxy in front of it only needs a single upstream.

ARG NODE_VERSION=22

# ---- Build the frontend ----
FROM node:${NODE_VERSION}-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Build the API ----
FROM node:${NODE_VERSION}-alpine AS backend-build
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---- Production dependencies only ----
FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app
COPY --chown=node:node backend/package.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /build/backend/dist ./dist
COPY --from=frontend-build --chown=node:node /build/frontend/dist ./public

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["node", "dist/server.js"]
