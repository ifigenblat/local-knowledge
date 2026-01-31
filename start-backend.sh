#!/bin/bash
# Start the backend (cards, collections, upload) on port 5010.
# Run from anywhere: ./start-backend.sh   or   bash start-backend.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/server" || exit 1
echo "Starting backend (cards/collections) on http://localhost:5010 ..."
echo "Leave this terminal open. Press Ctrl+C to stop."
echo ""
PORT=5010 npm run dev
