# Testing Microservices with UI

## Setup

### 1. Start PostgreSQL and create schema

```bash
# Start PostgreSQL (e.g. Docker)
docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge postgres:16-alpine

# First run: create schema and seed
cd services
npm run sync-postgres
npm run seed-postgres
```

### 2. Start microservices and frontend

```bash
# Terminal 1: Microservices
cd services
./start-all.sh

# Terminal 2: Frontend
cd client
npm start
```

### 3. Test in browser

Open http://localhost:3000

## What You Can Test

- **Login/Register** – Auth service
- **User Management** – User service
- **Role Management** – Role service
- **Cards** – Card service
- **Collections** – Collection service
- **Upload** – Upload + content-processing + card service
- **Dashboard** – Cards and collections

Frontend uses the API Gateway (port 8000). All services use PostgreSQL.
