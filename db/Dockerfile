# db/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY db/package.json ./
RUN npm install
COPY db/migrations ./migrations
CMD ["npm", "run", "migrate"]
