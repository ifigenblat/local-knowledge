FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY card-service/package*.json ./
RUN npm ci --only=production
COPY card-service .
EXPOSE 5004
CMD ["node", "src/index.js"]
