FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY role-service/package*.json ./
RUN npm ci --only=production
COPY role-service .
EXPOSE 5003
CMD ["node", "src/index.js"]
