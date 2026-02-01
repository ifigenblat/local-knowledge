# AI Service

Ollama-powered AI for card regeneration. Provides status checks and card generation from text snippets.

**Port:** 5008

## Endpoints

- `GET /health` – Health check
- `GET /status` – Ollama availability and configuration
- `POST /regenerate` – Generate card data from snippet (body: `{ snippet, sourceFileName? }`)

## Environment

- `PORT` – Default 5008
- `OLLAMA_API_URL` – Default http://localhost:11434
- `OLLAMA_MODEL` – Default llama2
- `OLLAMA_ENABLED` – Set to `true` to enable (default: false)

## Backend integration

Set in backend (server) `.env` to use this service for card regeneration:

```
AI_SERVICE_URL=http://localhost:5008
```

If not set, the backend uses its local aiProcessor.

## Run

```bash
cd services/ai-service
npm install
PORT=5008 npm start
```

For AI to work: `OLLAMA_ENABLED=true` and run `ollama serve` (with model: `ollama pull llama2`).

## Test

```bash
npm run test:endpoints
# or from repo root:
npm run test:ai
```
