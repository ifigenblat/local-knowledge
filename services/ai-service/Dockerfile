FROM node:20-alpine
WORKDIR /app
COPY ai-service/package*.json ./
RUN npm ci --only=production
COPY ai-service .
EXPOSE 5008
CMD ["node", "src/index.js"]
