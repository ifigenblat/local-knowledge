# Local AI Setup for LocalKnowledge

This guide installs and runs the local AI options integrated in the app: **Ollama**, **LocalAI**, **llama.cpp**, and **LM Studio**. Use **Administration → AI Settings** in the app to select one.

## Quick reference

| Provider    | Port | API key | How to run |
|------------|------|---------|------------|
| **Ollama** | 11434 | No | Install + `ollama serve` + `ollama pull phi` |
| **LocalAI** | 8080 | No | Docker or `./scripts/local-ai/start-localai.sh` |
| **llama.cpp** | 8081 | No | Docker + GGUF model or `./scripts/local-ai/start-llamacpp.sh` |
| **LM Studio** | 1234 | No | Install app, load model, start local server |

---

## 1. Ollama (local, recommended for Mac)

Runs on your machine; no API key, no Docker required.

### Install

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS:**
- Download: [Ollama for Mac](https://ollama.com/download/Ollama-darwin.zip) and open the app, or
- Homebrew: `brew install ollama`

**Or use the project script:**
```bash
cd services
./scripts/local-ai/install-ollama.sh
```

### Run

1. Start the server:
   ```bash
   ollama serve
   ```
   (On macOS the app may start the server automatically.)

2. Pull a small model (one-time):
   ```bash
   ollama pull phi
   ```
   Or: `ollama pull llama3.2`, `ollama pull mistral`, etc.

3. In LocalKnowledge: **Administration → AI Settings** → **Provider**: **Ollama (local)**. Save.  
   Ensure `OLLAMA_ENABLED=true` in `ai-service` (or set in env when starting services).

---

## 2. LocalAI (Docker, port 8080)

OpenAI-compatible API via Docker; no API key.

### Run with script

```bash
cd services
chmod +x scripts/local-ai/start-localai.sh
./scripts/local-ai/start-localai.sh
```

### Run with Docker Compose

```bash
cd services
docker-compose -f docker-compose.local-ai.yml up -d localai
```

### Run with Docker directly

```bash
docker run -d -p 8080:8080 --name localknowledge-localai quay.io/go-skynet/local-ai:latest
```

### In the app

**Administration → AI Settings** → **Provider**: **Cloud** → **Cloud provider**: **LocalAI (local, Docker)**.  
Base URL: `http://localhost:8080/v1`. Set **Model** to the model name you use in LocalAI (e.g. `llama-3-8b`). No API key.

You may need to load a model in LocalAI first (WebUI at http://localhost:8080 or CLI; see [LocalAI docs](https://localai.io/)).

---

## 3. llama.cpp (Docker, port 8081)

OpenAI-compatible server; needs a GGUF model. No API key.

### Prepare a model

1. Create a directory and download a GGUF model, e.g.:
   ```bash
   mkdir -p services/.models/llamacpp
   cd services/.models/llamacpp
   # Example: small model from Hugging Face (adjust URL to your chosen model)
   # wget -O model.gguf "https://huggingface.co/.../model.Q4_K_M.gguf"
   ```

2. Set the model filename:
   ```bash
   export LLAMACPP_MODEL_NAME=model.gguf
   ```

### Run with script

```bash
cd services
chmod +x scripts/local-ai/start-llamacpp.sh
./scripts/local-ai/start-llamacpp.sh
```

### Run with Docker directly

```bash
docker run -d -p 8081:8080 --name localknowledge-llamacpp \
  -v "$(pwd)/services/.models/llamacpp:/models" \
  ghcr.io/ggml-org/llama.cpp:server \
  --host 0.0.0.0 --port 8080 -m /models/YOUR_MODEL.gguf
```

Replace `YOUR_MODEL.gguf` with your file name.

### In the app

**Administration → AI Settings** → **Provider**: **Cloud** → **Cloud provider**: **llama.cpp (local server)**.  
Base URL: `http://localhost:8081/v1`. **Model**: the name your server reports (often the model filename). No API key.

---

## 4. LM Studio (GUI app, port 1234)

Best on Windows/Linux with GPU; also works on Mac. No API key.

### Install

1. Download: [LM Studio](https://lmstudio.ai/)
2. Install and open the app.
3. In LM Studio: download a model (e.g. Llama 3, Phi), then **Start Server** (default port 1234).

### In the app

**Administration → AI Settings** → **Provider**: **Cloud** → **Cloud provider**: **LM Studio (local, GPU-friendly)**.  
Base URL: `http://localhost:1234/v1`. **Model**: the model name shown in LM Studio. No API key.

---

## Scripts summary

From `services/`:

| Script | Purpose |
|--------|--------|
| `./scripts/local-ai/install-ollama.sh` | Install Ollama (Linux/Mac) |
| `./scripts/local-ai/start-localai.sh` | Start LocalAI container on 8080 |
| `./scripts/local-ai/start-llamacpp.sh` | Start llama.cpp container on 8081 (requires GGUF in `.models/llamacpp/`) |

Make scripts executable once: `chmod +x scripts/local-ai/*.sh`

---

## Troubleshooting

- **Ollama**: Ensure `ollama serve` is running and `ollama pull phi` (or your model) has completed. In LocalKnowledge use **Provider: Ollama** and set `OLLAMA_ENABLED=true` for ai-service.
- **LocalAI / llama.cpp**: “Local server not reachable” → check the process is running (e.g. `docker ps`) and the URL in AI Settings (e.g. `http://localhost:8080/v1` or `http://localhost:8081/v1`).
- **LM Studio**: Start the in-app server and use Base URL `http://localhost:1234/v1` and the exact model name shown in LM Studio.
