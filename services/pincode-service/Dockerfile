# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace support
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./

# Copy shared package
COPY shared ./shared

# Copy service
COPY services/pincode-service ./services/pincode-service

# Install dependencies
RUN npm ci

# Build the service
RUN npx tsc -p services/pincode-service/tsconfig.json

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY services/pincode-service/package*.json ./services/pincode-service/

# Install production dependencies only
RUN npm ci --omit=dev

COPY --from=builder /app/services/pincode-service/dist ./services/pincode-service/dist
COPY --from=builder /app/shared/dist ./shared/dist

EXPOSE 8011

CMD ["node", "services/pincode-service/dist/index.js"]
