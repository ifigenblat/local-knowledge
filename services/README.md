# Microservices Architecture

This directory contains the microservices implementation for LocalKnowledge.

## Services

- **gateway** (Port 8000): API Gateway
- **auth-service** (Port 5001): Authentication and authorization
- **user-service** (Port 5002): User management
- **role-service** (Port 5003): Role and permission management
- **card-service** (Port 5004): Card CRUD
- **collection-service** (Port 5005): Collections
- **upload-service**, **content-processing-service**, **ai-service**, **email-service**, **preview-service**, **files-service**, **uploads-static-service**: Supporting services

## Shared Modules

- **shared/postgres**: PostgreSQL connection and Sequelize models (User, Role, Card, Collection)
- **shared/postgres/repositories**: Postgres repositories used by auth, user, role, card, collection, files services

## Running Services

### Start all (recommended)

```bash
cd services
./start-all.sh
```

Requires PostgreSQL on port 5432 (e.g. Docker: `docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge postgres:16-alpine`).

First run: create schema and seed data from `services/`:

```bash
npm run sync-postgres
npm run seed-postgres
```

### Environment Variables

Set in `services/.env` or export:

- `DATABASE_URL` – PostgreSQL connection (e.g. `postgresql://localknowledge:localknowledge@localhost:5432/localknowledge`)
- `JWT_SECRET` – Shared across auth and gateway
- `UPLOAD_DIR` – Path to uploads directory
- Service-specific `PORT` (or use defaults from start-all.sh)

## Architecture

```
Frontend → API Gateway (8000) → Services (5001–5013) → PostgreSQL
```

## Testing

```bash
# Gateway
curl http://localhost:8000/health
curl http://localhost:8000/services/health

# Individual services (when running)
curl http://localhost:5001/health
curl http://localhost:5002/health
# etc.
```
