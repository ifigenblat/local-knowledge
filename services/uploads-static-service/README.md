# Uploads Static Service

Serves static uploaded files (PDFs, images, etc.) for LocalKnowledge. Files are stored by upload-service; this service only serves them.

**Port:** 5013

## Environment

- `PORT` – Default 5013
- `UPLOAD_DIR` – Path to uploads directory (same as upload-service)

## Run

```bash
PORT=5013 npm start
# Or: PORT=5013 UPLOAD_DIR=/path/to/uploads npm start
```
