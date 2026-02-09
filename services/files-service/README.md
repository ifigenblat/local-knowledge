# Files Service

Lists and deletes uploaded files for LocalKnowledge. Files are derived from cards (attachments, provenance). Deleting a file removes it from disk and deletes all associated cards.

**Port:** 5012

## Endpoints

- `GET /health` – Health check
- `GET /` – List files (query: page, limit, search)
- `DELETE /:filename` – Delete file and associated cards

## Environment

- `PORT` – Default 5012
- `DATABASE_URL` – PostgreSQL connection (shared with other services)
- `UPLOAD_DIR` – Path to uploads directory (default: `services/uploads`)

## Run

```bash
cd services/files-service
npm install
PORT=5012 npm start
```

Or use `./start-all.sh` from `services/`.

## Test

```bash
npm run test:endpoints
# or from repo root:
npm run test:files
```
