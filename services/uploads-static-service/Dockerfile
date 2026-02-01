FROM node:20-alpine
WORKDIR /app
COPY uploads-static-service/package*.json ./
RUN npm ci --only=production
COPY uploads-static-service .
EXPOSE 5013
CMD ["node", "src/index.js"]
