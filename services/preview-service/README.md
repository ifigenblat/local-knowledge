# Preview Service

Generates file previews for LocalKnowledge. Converts DOCX/XLSX to HTML, streams PDF/images/text.

**Port:** 5011

## Endpoints

- `GET /health` – Health check
- `GET /status` – Upload directory status
- `GET /:filename` – Preview file (DOCX→HTML, XLSX→HTML, PDF, images, TXT/MD/JSON)

## Environment

- `PORT` – Default 5011
- `UPLOAD_DIR` – Path to uploads directory. Default: `../../server/uploads` (relative to cwd). Set absolute path in production.

## Supported formats

- DOCX/DOC → HTML (mammoth)
- XLSX/XLS → HTML table (xlsx)
- PDF, PNG, JPG, GIF → streamed
- TXT, MD, JSON → plain text
- Other → download

## Run

```bash
cd services/preview-service
npm install
PORT=5011 UPLOAD_DIR=/path/to/server/uploads npm start
```

From start-all.sh, UPLOAD_DIR is set automatically to `$PROJECT_ROOT/server/uploads`.

## Test

```bash
npm run test:endpoints
# or from repo root:
npm run test:preview
```
