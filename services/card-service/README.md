# Card Service

Card CRUD and list for LocalKnowledge. Regenerate is handled by the AI service.

## First-time setup

Install dependencies (required once):

```bash
cd services/card-service
npm install
```

## Run

```bash
# From services/card-service
PORT=5004 npm start
```

Or use `./start-all.sh` from `services/` (after running `npm install` here once).

## Database

Uses PostgreSQL via shared `services/shared/postgres`. Set `DATABASE_URL` in `services/.env` (e.g. `postgresql://localknowledge:localknowledge@localhost:5432/localknowledge`). Run from `services/`: `npm run sync-postgres` (first run).

## "Card service unavailable"

If you see this in the app, the card service is not running. Install dependencies and restart:

```bash
cd services/card-service
npm install
cd ..
./stop-all.sh
./start-all.sh
```

## "Server error" (500)

Call the API **via the API Gateway** (port 8000), not directly to the card service (5004). The gateway validates the JWT and sends `X-User-Id`.

If you still get 500, check the response body `error` / `message` and card-service logs. Ensure PostgreSQL is running and `DATABASE_URL` is set.

## Testing

All commands below are run from **`services/card-service`** unless noted.

### Unit tests (Jest, no DB)

```bash
cd services/card-service
npm test
```

Watch mode: `npm run test:watch`

### Functional test (HTTP, gateway + card-service running)

**From card-service:**

```bash
npm run test:endpoints
```

**From repo root:**

```bash
npm run test:cards
```

Optional args: `[gatewayUrl] [email] [password]`.

### Integration test (real Postgres)

Creates a temporary card, GET/PUT, then deletes. Requires gateway, auth-service, card-service, Postgres.

**From card-service:**

```bash
npm run test:integration
```

**From repo root:**

```bash
npm run test:cards:integration
```

### Summary

| Test type   | Command (from card-service) | Command (from repo root)        |
|------------|------------------------------|----------------------------------|
| Unit       | `npm test`                   | `cd services/card-service && npm test` |
| Functional | `npm run test:endpoints`     | `npm run test:cards`            |
| Integration| `npm run test:integration`   | `npm run test:cards:integration`|
