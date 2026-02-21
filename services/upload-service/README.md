# Upload Service (Port 5006)

File upload microservice for LocalKnowledge. Accepts multipart uploads, forwards to content-processing and card services.

## Endpoints

- `GET /health` – Health check
- `POST /api/upload` – Upload file (multipart; requires gateway auth)

## Environment

- `PORT` – Default 5006
- `CONTENT_SERVICE_URL`, `CARD_SERVICE_URL`, `AI_SERVICE_URL` – Backend services
- `UPLOAD_DIR` – Path to store uploads

## Run

```bash
cd services/upload-service
npm install
PORT=5006 npm start
```

Or use `./start-all.sh` from `services/`.

## Testing

- **Unit** (Jest): `npm test` or `npm run test:watch`
- **Functional** (gateway + upload + backend services running): `npm run test:endpoints`
- **Integration**: `npm run test:integration`

From repo root: `npm run test:uploads` (functional), `npm run test:uploads:integration` (integration). Full upload flow: `npm run test:integration`.
