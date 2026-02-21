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

### Health checks

```bash
# Gateway
curl http://localhost:8000/health
curl http://localhost:8000/services/health

# Individual services (when running)
curl http://localhost:5001/health
curl http://localhost:5002/health
# etc.
```

### Service tests (from repo root; gateway and target services must be running)

| Service     | Functional (HTTP)           | Integration / other              |
|-------------|-----------------------------|----------------------------------|
| User        | `npm run test:users`        | `npm run test:users:integration` |
| Auth        | `npm run test:auth`         | `npm run test:auth:integration` |
| Role        | `npm run test:roles`        | `npm run test:roles:integration` |
| Cards       | `npm run test:cards`        | `npm run test:cards:integration` |
| Collections | `npm run test:collections`  | `npm run test:collections:integration` |
| Upload      | `npm run test:uploads`      | `npm run test:uploads:integration`; full flow: `npm run test:integration` |
| Content     | `npm run test:content`      | `npm run test:content:integration` |
| AI          | `npm run test:ai`           | `npm run test:ai:integration` |
| Email       | `npm run test:email`        | `npm run test:email:integration` |
| Preview     | `npm run test:preview`      | `npm run test:preview:integration` |
| Files       | `npm run test:files`        | `npm run test:files:integration` |

### Unit tests (no gateway/DB)

Each microservice has Jest unit tests. User, auth, role, card, and collection services have **≥90% coverage** (statements/lines/functions). From each service directory:

```bash
cd services/user-service && npm test
cd services/auth-service && npm test
cd services/role-service && npm test
cd services/card-service && npm test
cd services/collection-service && npm test
cd services/upload-service && npm test
cd services/content-processing-service && npm test
cd services/ai-service && npm test
cd services/email-service && npm test
cd services/preview-service && npm test
cd services/files-service && npm test
```

Each service also has `npm run test:endpoints` (functional) and `npm run test:integration` where applicable. See each service’s README (e.g. `services/user-service/README.md`).
