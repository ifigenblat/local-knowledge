FROM node:20-alpine
WORKDIR /app
COPY preview-service/package*.json ./
RUN npm ci --only=production
COPY preview-service .
EXPOSE 5011
CMD ["node", "src/index.js"]
