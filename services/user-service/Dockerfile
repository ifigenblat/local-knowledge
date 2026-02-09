FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY user-service/package*.json ./
RUN npm ci --only=production
COPY user-service .
EXPOSE 5002
CMD ["node", "src/index.js"]
