#!/usr/bin/env bash
# Start LocalAI (OpenAI-compatible API) on port 8080 for LocalKnowledge.
# In the app: AI Settings → Cloud provider → LocalAI (local, Docker).

set -e
IMAGE="${LOCALAI_IMAGE:-quay.io/go-skynet/local-ai:latest}"
CONTAINER_NAME="${LOCALAI_CONTAINER_NAME:-localknowledge-localai}"
PORT="${PORT:-8080}"

echo "=== Starting LocalAI for LocalKnowledge (port $PORT) ==="

if ! command -v docker &>/dev/null; then
  echo "Docker is required. Install from https://docs.docker.com/get-docker/"
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Container $CONTAINER_NAME exists. Starting if stopped..."
  docker start "$CONTAINER_NAME" 2>/dev/null || true
else
  echo "Pulling image (may take a few minutes): $IMAGE"
  docker pull "$IMAGE"
  echo "Creating and starting container..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:8080" \
    "$IMAGE"
fi

echo "LocalAI is starting. API base URL: http://localhost:$PORT/v1"
echo "In LocalKnowledge: Administration → AI Settings → Cloud provider → LocalAI."
echo "You may need to load a model in LocalAI (see LOCAL_AI_SETUP.md)."
