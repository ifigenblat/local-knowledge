FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY collection-service/package*.json ./
RUN npm ci --only=production
COPY collection-service .
EXPOSE 5005
CMD ["node", "src/index.js"]
