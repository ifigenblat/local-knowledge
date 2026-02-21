# User Service (Port 5002)

User management microservice: user CRUD, settings (AI provider), assign role. Uses PostgreSQL via `services/shared/postgres` and validates roles via Role Service (5003).

## Running

From repo root or `services/`:

```bash
cd services && ./start-all.sh
```

Or run only user-service (requires PostgreSQL and gateway for auth):

```bash
cd services/user-service
npm start
```

Set `DATABASE_URL` in `services/.env` (e.g. `postgresql://localknowledge:localknowledge@localhost:5432/localknowledge`). First run from `services/`: `npm run sync-postgres` and `npm run seed-postgres`.

## Testing

All commands below are run from **`services/user-service`** unless noted.

### Unit tests (Jest, no DB)

Runs in-process with mocks; no gateway or Postgres needed.

```bash
cd services/user-service
npm test
```

Watch mode (re-run on file changes):

```bash
npm run test:watch
```

### Functional test (HTTP, gateway + user-service running)

Hits real API via gateway; no DB writes except optional settings restore. Start gateway and user-service first (e.g. `cd services && ./start-all.sh`).

**From user-service directory:**

```bash
cd services/user-service
npm run test:endpoints
```

**From repo root:**

```bash
npm run test:users
```

Optional args: `[gatewayUrl] [email] [password]`. Defaults: `http://localhost:8000`, `admin@localknowledge.local`, `admin123`.

### Integration test (real Postgres + Role Service)

Creates a temporary user, exercises user-service + Postgres + Role Service, then deletes the user and restores settings. Requires full stack running (gateway, user-service, auth-service, role-service, Postgres). Run as admin/superadmin.

**From user-service directory:**

```bash
cd services/user-service
npm run test:integration
```

**From repo root:**

```bash
npm run test:users:integration
```

Optional args: `[gatewayUrl] [email] [password]`. Defaults: `http://localhost:8000`, `admin@localknowledge.local`, `admin123`.

## Summary

| Test type   | Command (from user-service)   | Command (from repo root)        | Requires                    |
|------------|-------------------------------|----------------------------------|-----------------------------|
| Unit       | `npm test`                    | `cd services/user-service && npm test` | Nothing (mocks)            |
| Functional | `npm run test:endpoints`      | `npm run test:users`            | Gateway + user-service      |
| Integration| `npm run test:integration`    | `npm run test:users:integration`| Full stack (gateway, auth, user, role, Postgres) |
