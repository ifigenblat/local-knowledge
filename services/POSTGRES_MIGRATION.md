# PostgreSQL Migration – Completed

## Overview

**MongoDB has been completely removed.** All microservices now use PostgreSQL exclusively.

## Services Using PostgreSQL

- **auth-service** – User authentication, JWT
- **user-service** – User CRUD
- **role-service** – Role management
- **card-service** – Cards CRUD, search
- **collection-service** – Collections and card associations
- **files-service** – File listing, delete

## Quick Start

### 1. Start PostgreSQL

```bash
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=localknowledge \
  -e POSTGRES_PASSWORD=localknowledge \
  -e POSTGRES_DB=localknowledge \
  --name localknowledge-postgres \
  postgres:16-alpine

# Or: cd services && docker-compose up -d postgres
```

### 2. Sync Schema

```bash
cd services
DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge \
  npm run sync-postgres
```

### 3. Seed Roles and Admin User

```bash
cd services
DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge \
  ADMIN_EMAIL=admin@localknowledge.local \
  ADMIN_PASSWORD=admin123 \
  npm run seed-postgres
```

### 4. Start Services

```bash
cd services
export DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge
./start-all.sh
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localknowledge:localknowledge@localhost:5432/localknowledge` |
| `POSTGRES_URI` | Alias for DATABASE_URL | - |
| `ADMIN_EMAIL` | Admin user email (seed script) | `admin@localknowledge.local` |
| `ADMIN_PASSWORD` | Admin user password (seed script) | `admin123` |

## Schema

- **roles**: id (UUID), name, displayName, description, permissions (JSONB), isSystem, isImmutable, isActive
- **users**: id (UUID), name, email, password, roleId, preferences (JSONB), ...
- **cards**: id (UUID), cardId, title, content, userId, metadata (JSONB), attachments (JSONB), provenance (JSONB), ...
- **collections**: id (UUID), name, description, userId; many-to-many with cards via `collection_cards`

The app runs on microservices only. The `server/` directory is deprecated; use `services/` and `./start-all.sh`.
