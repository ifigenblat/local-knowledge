# LocalKnowledge Microservices – Quick Start

## Prerequisites

- Node.js 18+
- MongoDB (local or Docker)
- npm

## Start (local)

```bash
# 1. Start MongoDB (if using Docker)
docker run -d -p 27017:27017 --name mongodb mongo:7

# 2. Initialize roles (first run only)
cd server && node scripts/init-roles.js && node scripts/create-admin-user.js
cd ..

# 3. Start all services
cd services
./start-all.sh

# 4. Start frontend (separate terminal)
cd client
npm start
```

Access: http://localhost:3000 (frontend), http://localhost:8000 (API Gateway)

## Start (Docker)

```bash
cd services
docker-compose up -d
```

## Stop

```bash
cd services
./stop-all.sh
```

## Test

```bash
cd services
./test-services.sh

# Integration test (upload + files)
node test-integration-upload-files.js
```

## Environment

Copy `.env.example` to `.env` in each service as needed. Key vars:

- `MONGODB_URI` – MongoDB connection (use auth if required)
- `JWT_SECRET` – Shared across auth and gateway
- `UPLOAD_DIR` – Path to uploads (default: ../../server/uploads)

## Observability

- `GET /health` – Gateway health
- `GET /services/health` – All service health
- `GET /metrics` – Prometheus-format metrics
