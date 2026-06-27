# syntax=docker/dockerfile:1

# ---- build stage: compile TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime stage: prod deps + compiled output only ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Run as the image's built-in non-root user.
USER node

# MCP servers speak JSON-RPC over stdio — no port to expose.
ENTRYPOINT ["node", "dist/index.js"]
