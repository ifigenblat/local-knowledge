# Troubleshooting: "Failed to fetch cards" / "Backend unavailable" / Cards not loading

## Quick fix (most common)

**"Backend unavailable"** or **"Error loading cards"** means the backend (cards/collections server) is not running on port 5010.

**Start the backend** in a separate terminal:

```bash
# From repo root:
npm run backend
```

Or:

```bash
cd server
PORT=5010 npm run dev
```

Leave that terminal open. Then refresh the app; cards should load.

---

1. **Restart all services** (includes backend) so everything is running:
   ```bash
   cd services
   ./stop-all.sh
   ./start-all.sh
   ```

2. **Start only the backend** if you run gateway/auth/user/role manually:
   ```bash
   npm run backend
   ```
   (from repo root)

3. **Check backend is up:**
   ```bash
   curl http://localhost:5010/api/health
   ```
   Should return `{"status":"OK",...}`.

4. **Check gateway sees backend:**
   ```bash
   curl http://localhost:8000/services/health
   ```
   `backend` should show `"status":"healthy"`.

## If you still see "Failed to fetch cards"

- **"Card service unavailable" / 502**  
  Card service (port 5004) is not running. **Install its dependencies once**, then restart:
  ```bash
  cd services/card-service
  npm install
  cd ..
  ./stop-all.sh
  ./start-all.sh
  ```
  If you see `Cannot find module 'cors'` in `services/logs/card-service.log`, run `npm install` in `services/card-service`.

- **"Backend unavailable" / "Service cards unavailable" / 502**  
  Backend (monolith) is not running on port 5010. Start it: `npm run backend` (from repo root) or `cd server && PORT=5010 npm run dev`.

- **"Route not found"**  
  Gateway is old (no backend proxy). Restart the gateway: stop it, then from `services/gateway` run `PORT=8000 npm run dev`, or run `./start-all.sh` from `services/`.

- **"Invalid token" / 401**  
  JWT secret must match everywhere. Use the same `JWT_SECRET` in:
  - `server/.env`
  - `services/gateway/.env`
  - `services/auth-service/.env`  
  Example: `JWT_SECRET=your-secret-key-here-make-this-secure-in-production`

- **MongoDB**  
  Cards and users are in MongoDB. Start it: `docker start mongodb` or `docker run -d -p 27017:27017 mongo:7`.

- **"Command find requires authentication" / 500 from collection-service or card-service**  
  MongoDB is configured with authentication, but the service is connecting without credentials. Create a `.env` file in the service directory with `MONGODB_URI` including your MongoDB user and password (same as in `server/.env` or card-service):
  ```bash
  # Collection service (port 5005)
  cd services/collection-service
  cp .env.example .env
  # Edit .env and set:
  # MONGODB_URI=mongodb://YOUR_USER:YOUR_PASSWORD@localhost:27017/local-knowledge?authSource=admin
  ```
  Do the same for **card-service** (port 5004) if you see the same error there: create `services/card-service/.env` with the same `MONGODB_URI`. Then restart the service(s).

## Ports summary

| Port | Service           | Purpose                    |
|------|-------------------|----------------------------|
| 3000 | Frontend          | React app                  |
| 5010 | Backend           | Upload, preview, AI       |
| 5001 | Auth service      | Login, register            |
| 5002 | User service      | User CRUD                  |
| 5003 | Role service      | Roles                      |
| 5004 | Card service      | Cards CRUD                 |
| 5005 | Collection service| Collections CRUD           |
| 5006 | Upload service    | File upload (backend processes) |
| 8000 | API Gateway       | Single entry for frontend  |
| 27017| MongoDB           | Database                   |
