# Role Service (Port 5003)

Role management microservice: role CRUD, get by name, get users with role, assign role to user. Uses PostgreSQL via `services/shared/postgres` and calls User Service for assign/get users.

## Running

From repo root or `services/`:

```bash
cd services && ./start-all.sh
```

Or run only role-service (requires PostgreSQL and gateway for auth):

```bash
cd services/role-service
npm start
```

Set `DATABASE_URL` in `services/.env`. First run from `services/`: `npm run sync-postgres` and `npm run seed-postgres`.

## Testing

All commands below are run from **`services/role-service`** unless noted.

### Unit tests (Jest, no DB)

```bash
cd services/role-service
npm test
```

Watch mode: `npm run test:watch`

### Functional test (HTTP, gateway + role-service running)

**From role-service:**

```bash
npm run test:endpoints
```

**From repo root:**

```bash
npm run test:roles
```

Optional args: `[gatewayUrl] [email] [password]`. Defaults: `http://localhost:8000`, `admin@localknowledge.local`, `admin123`.

### Integration test (real Postgres)

Creates a temporary role, exercises CRUD, then deletes the role. Requires gateway, role-service, auth-service, Postgres.

**From role-service:**

```bash
npm run test:integration
```

**From repo root:**

```bash
npm run test:roles:integration
```

### Summary

| Test type   | Command (from role-service)   | Command (from repo root)        |
|------------|-------------------------------|----------------------------------|
| Unit       | `npm test`                    | `cd services/role-service && npm test` |
| Functional | `npm run test:endpoints`      | `npm run test:roles`            |
| Integration| `npm run test:integration`   | `npm run test:roles:integration`|
