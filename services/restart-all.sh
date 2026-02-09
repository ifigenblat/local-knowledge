#!/bin/bash

# Restart all microservices: stop then start in one command.
# Run from the services/ folder: ./restart-all.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 Restarting LocalKnowledge Microservices"
echo "=========================================="
echo ""

# Stop all
./stop-all.sh

# Brief pause so ports are released
sleep 2

echo ""
echo "Starting services..."
echo ""

# Start all
./start-all.sh
