#!/bin/bash
# Start microservices (gateway + auth + user + role), then start the frontend.
# Run from repo root: npm run dev:microservices

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/services" && ./start-all.sh
cd "$ROOT" && npm run client
