# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./

# Copy shared library
COPY shared ./shared

# Copy search-service
COPY services/search-service ./services/search-service

# Install dependencies
RUN npm install

# Build the shared library and search-service
RUN npm run build -w @fs/shared
RUN npm run build -w @fs/search-service

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy built files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/search-service/dist ./services/search-service/dist
COPY --from=builder /app/services/search-service/package.json ./services/search-service/package.json
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json

ENV NODE_ENV=production
ENV APP_PORT=3000

EXPOSE 3000

CMD ["node", "services/search-service/dist/index.js"]
