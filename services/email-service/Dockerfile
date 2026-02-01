FROM node:20-alpine
WORKDIR /app
COPY email-service/package*.json ./
RUN npm ci --only=production
COPY email-service .
EXPOSE 5009
CMD ["node", "src/index.js"]
