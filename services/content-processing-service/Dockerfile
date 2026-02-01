FROM node:20-alpine
WORKDIR /app
COPY content-processing-service/package*.json ./
RUN npm ci --only=production
COPY content-processing-service .
EXPOSE 5007
CMD ["node", "src/index.js"]
