# Content Processing Service

Extracts content from uploaded files (PDF, DOCX, XLSX, TXT, MD, JSON, images) and returns structured items for card creation. Used by the backend when processing uploads.

**Port:** 5007

## Endpoints

- `GET /health` – Health check
- `POST /process` – Extract content by file path (JSON body: `filePath`, `originalName`, `filename`, `mimetype?`). Used by backend.
- `POST /extract` – Extract content from uploaded file (multipart `file`). For testing and direct use.

## Environment

- `PORT` – Default 5007
- `UPLOAD_DIR` – Optional. If set, `filePath` in `/process` must start with this path (security).

## Backend integration

Set in backend (server) `.env` to use this service for upload processing:

```
CONTENT_SERVICE_URL=http://localhost:5007
```

If not set, the backend uses its local content processor.

## Run

```bash
cd services/content-processing-service
npm install
PORT=5007 npm start
```

## Testing

- **Unit** (Jest, no DB): `npm test` or `npm run test:watch`
- **Functional** (gateway + service running): `npm run test:endpoints`
- **Integration**: `npm run test:integration`

From repo root: `npm run test:content` (functional), `npm run test:content:integration` (integration).

## Test endpoints (functional)

```bash
npm run test:endpoints
# or from repo root:
npm run test:content
```
