#!/bin/bash
# LocalKnowledge: start containers, services, then client
# Run from project root: ./start.sh

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "🚀 Starting LocalKnowledge"
echo "=========================="
echo ""

# 1. Containers: ensure PostgreSQL is running
echo -n "1. PostgreSQL... "
if nc -z localhost 5432 2>/dev/null; then
  echo -e "${GREEN}✓${NC} already running"
else
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    # Prefer starting existing container (avoids "name already in use" after stop.sh)
    if docker ps -a -q --filter "name=localknowledge-postgres" 2>/dev/null | grep -q .; then
      echo -e "${BLUE}starting existing container...${NC}"
      docker start localknowledge-postgres 2>/dev/null || true
    elif [ -f services/docker-compose.yml ]; then
      echo -e "${BLUE}creating and starting via docker-compose...${NC}"
      (cd services && (docker compose up -d postgres 2>/dev/null || docker-compose up -d postgres 2>/dev/null)) || true
    else
      echo -e "${YELLOW}creating postgres container...${NC}"
      docker run -d --name localknowledge-postgres \
        -p 5432:5432 \
        -e POSTGRES_USER=localknowledge \
        -e POSTGRES_PASSWORD=localknowledge \
        -e POSTGRES_DB=localknowledge \
        postgres:16-alpine 2>/dev/null || docker start localknowledge-postgres 2>/dev/null || true
    fi
    echo -n "   Waiting for PostgreSQL..."
    for i in {1..30}; do
      if nc -z localhost 5432 2>/dev/null; then
        echo -e " ${GREEN}✓${NC}"
        break
      fi
      sleep 1
      echo -n "."
    done
    if ! nc -z localhost 5432 2>/dev/null; then
      echo -e " ${YELLOW}⚠${NC} Timeout. Start PostgreSQL manually and run again."
    fi
  else
    echo -e "${YELLOW}⚠${NC} Not running. Start PostgreSQL on port 5432 (Docker or native)."
  fi
fi
echo ""

# 2. Services
echo "2. Microservices..."
(cd services && ./start-all.sh)
echo ""

# 3. Client
echo "3. Client (React) – http://localhost:3000"
echo "   Press Ctrl+C to stop the client. Run ./stop.sh to stop everything."
echo ""
exec npm run client
