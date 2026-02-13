#!/bin/bash
# Start the backend (gateway + microservices) on port 8000.
# Run from anywhere: ./start-backend.sh   or   bash start-backend.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/services" || exit 1
echo "Starting backend (gateway + services) on http://localhost:8000 ..."
echo "Leave this terminal open. Press Ctrl+C to stop."
echo ""
./start-all.sh
