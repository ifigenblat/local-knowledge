# Auth Service (Port 5001)

Authentication microservice: register, login, validate token, forgot/reset password, change password. Uses PostgreSQL (via User repository), User Service, Role Service, and optionally Email Service.

## Running

From repo root or `services/`:

```bash
cd services && ./start-all.sh
```

Or run only auth-service (requires PostgreSQL, User Service, Role Service):

```bash
cd services/auth-service
npm start
```

Set `DATABASE_URL`, `USER_SERVICE_URL`, `ROLE_SERVICE_URL` in `services/.env` (or env). First run: run user-service and role-service migrations/seeds.

## Testing

All commands below are run from **`services/auth-service`** unless noted.

### Unit tests (Jest, no DB)

```bash
cd services/auth-service
npm test
```

Watch mode: `npm run test:watch`

### Functional test (HTTP, gateway + auth-service running)

**From auth-service:**

```bash
npm run test:endpoints
```

**From repo root:**

```bash
npm run test:auth
```

Optional args: `[gatewayUrl] [email] [password]`. Defaults: `http://localhost:8000`, `admin@localknowledge.local`, `admin123`.

### Integration test (real DB and services)

Login and validate token against real DB. Requires gateway, auth-service, user-service, role-service, Postgres.

**From auth-service:**

```bash
npm run test:integration
```

**From repo root:**

```bash
npm run test:auth:integration
```

### Summary

| Test type   | Command (from auth-service)   | Command (from repo root)        |
|------------|-------------------------------|----------------------------------|
| Unit       | `npm test`                    | `cd services/auth-service && npm test` |
| Functional | `npm run test:endpoints`      | `npm run test:auth`             |
| Integration| `npm run test:integration`   | `npm run test:auth:integration` |
