# Files Service

Lists and deletes uploaded files for LocalKnowledge. Files are derived from cards (attachments, provenance). Deleting a file removes it from disk and deletes all associated cards.

**Port:** 5012

## Endpoints

- `GET /health` – Health check
- `GET /` – List files (query: page, limit, search)
- `DELETE /:filename` – Delete file and associated cards

## Environment

- `PORT` – Default 5012
- `MONGODB_URI` – MongoDB connection
- `UPLOAD_DIR` – Path to uploads directory (default: ../../server/uploads)

## Run

```bash
cd services/files-service
npm install
PORT=5012 UPLOAD_DIR=/path/to/server/uploads npm start
```

## Test

```bash
npm run test:endpoints
# or from repo root:
npm run test:files
```
