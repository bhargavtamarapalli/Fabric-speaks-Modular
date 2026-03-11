FROM node:20-alpine AS builder
WORKDIR /app

# Copy root configurations
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Copy shared package
COPY shared ./shared

# Copy notification service
COPY services/notification-service ./services/notification-service

# Install dependencies and build shared
RUN npm ci
RUN npm run build -w @fs/shared

# Build the service
RUN npm run build -w @fs/notification-service

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/services/notification-service/dist ./services/notification-service/dist
COPY --from=builder /app/services/notification-service/package.json ./services/notification-service/package.json

EXPOSE 3006
CMD ["npm", "start", "-w", "@fs/notification-service"]
