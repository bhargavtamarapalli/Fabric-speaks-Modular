# services/cart-service/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY shared/package.json ./shared/
COPY services/cart-service/package.json ./services/cart-service/
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY shared/package.json ./shared/
COPY services/cart-service/package.json ./services/cart-service/
RUN npm ci
COPY shared/ ./shared/
COPY services/cart-service/ ./services/cart-service/
RUN npx tsc -p shared/tsconfig.json
RUN npx tsc -p services/cart-service/tsconfig.json

FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeapp
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/services/cart-service/dist ./services/cart-service/dist
COPY --from=builder /app/services/cart-service/package.json ./services/cart-service/package.json
USER nodeapp
EXPOSE 8080
ENV PORT=8080
CMD ["node", "services/cart-service/dist/index.js"]
