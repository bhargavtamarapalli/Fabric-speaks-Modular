# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared ./shared

# Copy service files
COPY services/admin-service ./services/admin-service

# Install dependencies
RUN npm ci

# Build shared package first if needed (assuming shared has its own build or is used via tsconfig paths)
# For FsModular, we usually build the service which pulls in shared
RUN npm run build -w @fs/admin-service

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/admin-service/dist ./services/admin-service/dist
COPY --from=builder /app/services/admin-service/package.json ./services/admin-service/package.json

EXPOSE 3000

CMD ["node", "services/admin-service/dist/index.js"]
