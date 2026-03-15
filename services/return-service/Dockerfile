FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared package
COPY shared ./shared

# Copy service
COPY services/return-service ./services/return-service

# Install dependencies and build
RUN npm install
RUN npm run build -w shared
RUN npm run build -w @fs/return-service

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/services/return-service/dist ./services/return-service/dist
COPY --from=builder /app/services/return-service/package.json ./services/return-service/package.json

RUN npm install --omit=dev

EXPOSE 8080

CMD ["npm", "start", "-w", "@fs/return-service"]
