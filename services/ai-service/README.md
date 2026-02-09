# AI Service

Card generation via **OpenAI-compatible API** (OpenAI, Groq, etc.) or **Ollama** (local).  
If `OPENAI_API_KEY` is set, the cloud API is used; otherwise Ollama is used when `OLLAMA_ENABLED=true`.

**Port:** 5008

## Endpoints

- `GET /health` – Health check
- `GET /status` – AI provider availability (OpenAI or Ollama)
- `POST /regenerate` – Generate card from snippet (body: `{ snippet, sourceFileName? }`)
- `POST /generate-cards` – Generate cards from document text (body: `{ text, sourceFileName? }`)

## Environment

### Option A: OpenAI-compatible API (recommended)

Faster and more stable than local Ollama. Works with OpenAI, **Groq** (free tier), Together, Azure, etc.

- `OPENAI_API_KEY` – API key (if set, cloud API is used)
- `OPENAI_API_URL` – Default `https://api.openai.com/v1`. For Groq: `https://api.groq.com/openai/v1`
- `OPENAI_MODEL` – Default `gpt-4o-mini`. For Groq: `llama-3.1-8b-instant` or `mixtral-8x7b-32768`

### Option B: Ollama (local)

No API key; can hit resource limits or “model runner stopped” on smaller machines.

- `OLLAMA_API_URL` – Default http://localhost:11434
- `OLLAMA_MODEL` – Default phi (or llama2)
- `OLLAMA_ENABLED` – Set to `true` to use Ollama when `OPENAI_API_KEY` is not set

## Quick setup: Groq (free, fast)

1. Get a free API key at [console.groq.com](https://console.groq.com).
2. In `ai-service/.env`:
   ```
   OPENAI_API_KEY=gsk_xxxx
   OPENAI_API_URL=https://api.groq.com/openai/v1
   OPENAI_MODEL=llama-3.1-8b-instant
   ```
3. Restart the AI service (or run `./stop-all.sh` then `./start-all.sh`).

## Run

```bash
cd services/ai-service
npm install
PORT=5008 npm start
```

## Test

```bash
npm run test:endpoints
# or from repo root:
npm run test:ai
```
