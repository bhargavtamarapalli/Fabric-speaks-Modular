# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./
COPY vitest.workspace.ts ./

# Copy shared package
COPY shared ./shared

# Copy service files
COPY services/catalog-service ./services/catalog-service

# Install dependencies
RUN npm ci

# Build shared package
RUN npm run build -w @fs/shared

# Build service
RUN npm run build -w services/catalog-service

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/services/catalog-service/dist ./services/catalog-service/dist
COPY --from=builder /app/services/catalog-service/package.json ./services/catalog-service/package.json

EXPOSE 3003

CMD ["node", "services/catalog-service/dist/index.js"]
