# LocalKnowledge Microservices – Quick Start

## Prerequisites

- Node.js 18+
- PostgreSQL (local or Docker)
- npm

## Start (local)

```bash
# 1. Start PostgreSQL (if using Docker)
docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge --name postgres postgres:16-alpine

# 2. Create schema and seed data (first run only)
cd services
npm run sync-postgres
npm run seed-postgres

# 3. Start all services
./start-all.sh

# 4. Start frontend (separate terminal)
cd client
npm start
```

Access: http://localhost:3000 (frontend), http://localhost:8000 (API Gateway)

## Start (Docker)

```bash
cd services
docker-compose up -d
```

## Stop

```bash
cd services
./stop-all.sh
```

## Test

```bash
cd services
./test-services.sh

# Integration test (upload + files)
node test-integration-upload-files.js
```

## Environment

Copy `.env.example` to `.env` in `services/` as needed. Key vars:

- `DATABASE_URL` – PostgreSQL connection (e.g. `postgresql://localknowledge:localknowledge@localhost:5432/localknowledge`)
- `JWT_SECRET` – Shared across auth and gateway
- `UPLOAD_DIR` – Path to uploads (default: `services/uploads`)

## AI (optional)

For **“Use AI to create cards”** on the Upload page:

- **Recommended:** OpenAI-compatible API (faster and more stable). In `services/ai-service/.env` set:
  - `OPENAI_API_KEY` – e.g. from [Groq](https://console.groq.com) (free) or OpenAI
  - `OPENAI_API_URL` – e.g. `https://api.groq.com/openai/v1` for Groq
  - `OPENAI_MODEL` – e.g. `llama-3.1-8b-instant` (Groq) or `gpt-4o-mini` (OpenAI)
- **Local AI (no API key):** See **[LOCAL_AI_SETUP.md](./LOCAL_AI_SETUP.md)**. Quick: Ollama → `npm run local-ai:install-ollama` then `ollama serve` + `ollama pull phi`; LocalAI → `npm run local-ai:start-localai`; llama.cpp → put GGUF in `.models/llamacpp/` then `npm run local-ai:start-llamacpp`; LM Studio → install from [lmstudio.ai](https://lmstudio.ai) and start server. In AI Settings choose Provider and Cloud provider.

## Observability

- `GET /health` – Gateway health
- `GET /services/health` – All service health
- `GET /metrics` – Prometheus-format metrics
