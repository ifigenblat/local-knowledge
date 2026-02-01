FROM node:20-alpine
WORKDIR /app
COPY upload-service/package*.json ./
RUN npm ci --only=production
COPY upload-service .
EXPOSE 5006
CMD ["node", "src/index.js"]
