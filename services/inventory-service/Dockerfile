# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files for workspace support
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./

# Copy shared package
COPY shared ./shared

# Copy service
COPY services/inventory-service ./services/inventory-service

# Install dependencies
RUN npm ci

# Build the service
RUN npx tsc -p services/inventory-service/tsconfig.json

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY services/inventory-service/package*.json ./services/inventory-service/

# Install production dependencies only
RUN npm ci --omit=dev

COPY --from=builder /app/services/inventory-service/dist ./services/inventory-service/dist
COPY --from=builder /app/shared/dist ./shared/dist

EXPOSE 8004

CMD ["node", "services/inventory-service/dist/index.js"]
