# Collection Service (Port 5005)

Collection management microservice: list, create, get, update, delete collections; add/remove cards. Uses PostgreSQL via `services/shared/postgres`.

## Running

From repo root or `services/`:

```bash
cd services && ./start-all.sh
```

Or run only collection-service (requires PostgreSQL and gateway for auth):

```bash
cd services/collection-service
npm start
```

Set `DATABASE_URL` in `services/.env`. First run from `services/`: `npm run sync-postgres` and `npm run seed-postgres`.

## Testing

All commands below are run from **`services/collection-service`** unless noted.

### Unit tests (Jest, no DB)

```bash
cd services/collection-service
npm test
```

Watch mode: `npm run test:watch`

### Functional test (HTTP, gateway + collection-service running)

**From collection-service:**

```bash
npm run test:endpoints
```

**From repo root:**

```bash
npm run test:collections
```

Optional args: `[gatewayUrl] [email] [password]`. Defaults: `http://localhost:8000`, `admin@localknowledge.local`, `admin123`.

### Integration test (real Postgres)

Creates a temporary collection, GET/PUT, then deletes (cleanup). Requires gateway, auth-service, collection-service, Postgres.

**From collection-service:**

```bash
npm run test:integration
```

**From repo root:**

```bash
npm run test:collections:integration
```

### Summary

| Test type   | Command (from collection-service) | Command (from repo root)        |
|------------|-----------------------------------|----------------------------------|
| Unit       | `npm test`                        | `cd services/collection-service && npm test` |
| Functional | `npm run test:endpoints`          | `npm run test:collections`       |
| Integration| `npm run test:integration`        | `npm run test:collections:integration` |
