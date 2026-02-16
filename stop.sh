#!/bin/bash
# LocalKnowledge: stop client, services, then containers
# Run from project root: ./stop.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "🛑 Stopping LocalKnowledge"
echo "=========================="
echo ""

# 1. Client (React)
echo -n "1. Client... "
if pkill -f 'react-scripts' 2>/dev/null || lsof -ti:3000 | xargs kill -9 2>/dev/null; then
  echo -e "${GREEN}✓${NC}"
else
  echo "not running"
fi

# 2. Services
echo "2. Microservices..."
(cd services && ./stop-all.sh 2>/dev/null) || true

# 3. Containers (PostgreSQL)
echo ""
echo -n "3. PostgreSQL container... "
if command -v docker &>/dev/null; then
  if docker ps -q --filter "name=localknowledge-postgres" 2>/dev/null | grep -q .; then
    docker stop localknowledge-postgres 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo "could not stop"
  else
    echo "not running (or different name)"
  fi
else
  echo "Docker not available"
fi

echo ""
echo -e "${GREEN}✅ All stopped${NC}"
echo ""
