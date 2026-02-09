FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY files-service/package*.json ./
RUN npm ci --only=production
COPY files-service .
EXPOSE 5012
CMD ["node", "src/index.js"]
