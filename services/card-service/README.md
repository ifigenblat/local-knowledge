# Card Service

Card CRUD and list for LocalKnowledge. Regenerate is proxied to the backend (monolith).

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
# or
npm start
```

Or use `./start-all.sh` from `services/` (after running `npm install` here once).

## "Command find requires authentication"

MongoDB is running with auth enabled, but the card service was connecting without credentials. A `services/card-service/.env` file was added with `MONGODB_URI` including username/password (same as auth-service). If you use different MongoDB credentials, set `MONGODB_URI` in `.env` to e.g. `mongodb://USER:PASSWORD@localhost:27017/local-knowledge?authSource=admin`. Restart the card service after changing `.env`.

## "Card service unavailable"

If you see this in the app, the card service is not running. Usually because dependencies were never installed:

```bash
cd services/card-service
npm install
```

Then restart all services: `cd services && ./stop-all.sh && ./start-all.sh`.

## "Server error" (500)

Call the API **via the API Gateway** (port 8000), not directly to the card service (5004). The gateway validates the JWT and sends `X-User-Id`; the card service expects those headers.

If you still get 500, the response body now includes the real error in the `error` and `message` fields. Check:

1. **Postman / Network tab** – Response body `error` or `message` (e.g. "Invalid user id", "MongoServerError", "connect ECONNREFUSED").
2. **Card service logs** – Terminal where the card service runs shows the full stack trace.
3. **MongoDB** – Running and `MONGODB_URI` points at the same DB as the monolith (e.g. `mongodb://localhost:27017/local-knowledge`).

## Test all card endpoints

With the API Gateway and card service running (and a user that can log in), run:

```bash
cd services/card-service
npm run test:endpoints
```

Or with custom gateway/credentials:

```bash
node test-card-endpoints.js http://localhost:8000 your@email.com yourpassword
```

The script logs in, then exercises: list cards, list with query, by category, by type, create, get, update, review, rate, regenerate, delete.
