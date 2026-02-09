#!/usr/bin/env bash
# Start only the AI service (port 5008). Use this when you need AI file processing
# and the full start-all.sh isn't running or the AI service stopped.
# Run from the services/ folder: ./scripts/start-ai-service.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_PATH="${CONFIG_PATH:-$SERVICES_DIR/config}"
mkdir -p "$SERVICES_DIR/logs"

echo "Starting AI service (port 5008)..."
echo "  CONFIG_PATH=$CONFIG_PATH"
echo "  Log: $SERVICES_DIR/logs/ai-service.log"

cd "$SERVICES_DIR/ai-service"
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

CONFIG_PATH="$CONFIG_PATH" PORT=5008 node --max-old-space-size=4096 src/index.js >> ../logs/ai-service.log 2>&1 &
PID=$!
echo $PID > ../logs/ai-service.pid
echo "  PID: $PID"
echo "  Health: curl http://localhost:5008/health"
sleep 2
if kill -0 $PID 2>/dev/null; then
  echo "AI service is running. You can now use 'Use AI' on the Upload page."
else
  echo "AI service may have failed to start. Check: tail -50 $SERVICES_DIR/logs/ai-service.log"
  exit 1
fi
