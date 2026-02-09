#!/usr/bin/env bash
# Download a small GGUF model for llama.cpp (LocalKnowledge).
# Puts the file in services/.models/llamacpp/ so start-llamacpp.sh can use it.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODELS_DIR="${LLAMACPP_MODELS_DIR:-$SCRIPT_DIR/../../.models/llamacpp}"
# Small Llama 3.2 1B Q4_K_M (~0.7GB) – good for local use
DEFAULT_URL="${LLAMACPP_MODEL_URL:-https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf}"
OUTPUT_NAME="${LLAMACPP_MODEL_NAME:-Llama-3.2-1B-Instruct-Q4_K_M.gguf}"

echo "=== Downloading GGUF model for llama.cpp ==="
echo "Directory: $MODELS_DIR"
echo "URL: $DEFAULT_URL"
mkdir -p "$MODELS_DIR"
OUTPUT_PATH="$MODELS_DIR/$OUTPUT_NAME"

if [ -f "$OUTPUT_PATH" ]; then
  echo "Model already exists: $OUTPUT_PATH"
  echo "To re-download, remove the file first."
  exit 0
fi

if command -v curl &>/dev/null; then
  echo "Downloading with curl (this may take a few minutes)..."
  curl -fL -o "$OUTPUT_PATH" "$DEFAULT_URL"
elif command -v wget &>/dev/null; then
  echo "Downloading with wget (this may take a few minutes)..."
  wget -O "$OUTPUT_PATH" "$DEFAULT_URL"
else
  echo "Install curl or wget to download the model."
  exit 1
fi

echo "Done. Model saved to: $OUTPUT_PATH"
echo "You can now run 'Start server' for llama.cpp in AI Settings."
