#!/usr/bin/env bash
# Start llama.cpp server (OpenAI-compatible API) on port 8081 for LocalKnowledge.
# Requires a GGUF model. In the app: AI Settings → Cloud provider → llama.cpp (local server).

set -e
IMAGE="${LLAMACPP_IMAGE:-ghcr.io/ggml-org/llama.cpp:server}"
CONTAINER_NAME="${LLAMACPP_CONTAINER_NAME:-localknowledge-llamacpp}"
PORT="${PORT:-8081}"
# Directory for GGUF models (create and put your .gguf file here, or set LLAMACPP_MODEL_PATH)
MODELS_DIR="${LLAMACPP_MODELS_DIR:-$(dirname "$0")/../../.models/llamacpp}"
MODEL_NAME="${LLAMACPP_MODEL_NAME:-}"

echo "=== Starting llama.cpp server for LocalKnowledge (port $PORT) ==="

if ! command -v docker &>/dev/null; then
  echo "Docker is required. Install from https://docs.docker.com/get-docker/"
  exit 1
fi

mkdir -p "$MODELS_DIR"

if [ -z "$MODEL_NAME" ]; then
  # Try to find any .gguf in the models dir
  MODEL_NAME=$(find "$MODELS_DIR" -maxdepth 1 -name "*.gguf" -type f 2>/dev/null | head -1)
  if [ -z "$MODEL_NAME" ]; then
    echo "No GGUF model found in $MODELS_DIR"
    echo "Download a model (e.g. Llama-3.2-1B or phi-2) and place the .gguf file in: $MODELS_DIR"
    echo "Example: wget -O $MODELS_DIR/model.gguf 'https://huggingface.co/.../model.Q4_K_M.gguf'"
    echo "Then set LLAMACPP_MODEL_NAME to the filename, e.g. export LLAMACPP_MODEL_NAME=model.gguf"
    exit 1
  fi
  MODEL_NAME=$(basename "$MODEL_NAME")
fi

MODEL_PATH="/models/$MODEL_NAME"
echo "Using model: $MODEL_NAME"

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing container to apply model/port..."
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
fi

echo "Pulling image (if needed): $IMAGE"
docker pull "$IMAGE"
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$PORT:8080" \
  -v "$(cd "$MODELS_DIR" && pwd):/models" \
  "$IMAGE" \
  --host 0.0.0.0 \
  --port 8080 \
  -m "$MODEL_PATH"

echo "llama.cpp server is starting. API base URL: http://localhost:$PORT/v1"
echo "In LocalKnowledge: Administration → AI Settings → Cloud provider → llama.cpp, Model: $MODEL_NAME (or the name your server reports)."
