# Troubleshooting: "Failed to fetch cards" / "Backend unavailable" / Cards not loading

## Quick fix (most common)

**"Backend unavailable"** or **"Error loading cards"** usually means the microservices are not running or the gateway cannot reach them.

**Start all services** from `services/`:

```bash
cd services
./start-all.sh
```

Ensure PostgreSQL is running on port 5432 (e.g. Docker: `docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge postgres:16-alpine`).

---

1. **Restart all services:**
   ```bash
   cd services
   ./stop-all.sh
   ./start-all.sh
   ```

2. **Check gateway and services:**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/services/health
   ```
   All services should show healthy.

3. **Card service (port 5004)** – If cards still don't load, ensure card-service dependencies are installed:
   ```bash
   cd services/card-service
   npm install
   cd ..
   ./stop-all.sh
   ./start-all.sh
   ```

4. **Invalid token / 401** – Use the same `JWT_SECRET` in `services/.env`, `services/gateway`, and `services/auth-service`.

5. **PostgreSQL** – Cards and users are in PostgreSQL. Start it (e.g. Docker above) and run from `services/`:
   ```bash
   npm run sync-postgres   # first run only
   npm run seed-postgres   # optional: default roles and admin user
   ```

## Ports summary

| Port  | Service            | Purpose              |
|-------|--------------------|----------------------|
| 3000  | Frontend           | React app            |
| 8000  | API Gateway        | Single entry for API |
| 5001  | Auth service       | Login, register       |
| 5002  | User service       | User CRUD             |
| 5003  | Role service       | Roles                 |
| 5004  | Card service       | Cards CRUD            |
| 5005  | Collection service | Collections CRUD      |
| 5432  | PostgreSQL         | Database              |
