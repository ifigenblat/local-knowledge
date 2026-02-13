#!/bin/bash

# LocalKnowledge - Backend & frontend health check
# Checks gateway (port 8000), frontend (3000), and suggests fixes.

set -e

echo "🔍 Checking LocalKnowledge (microservices + frontend)..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_ok()     { echo -e "${GREEN}[✓]${NC} $1"; }
print_warn()   { echo -e "${YELLOW}[⚠]${NC} $1"; }
print_err()    { echo -e "${RED}[✗]${NC} $1"; }

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

ERRORS=0

# 1. Gateway (backend)
print_status "Checking API gateway (http://localhost:8000)..."
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
  print_ok "Gateway is up"
else
  print_err "Gateway not reachable"
  ((ERRORS++)) || true
  print_status "Start backend: npm run backend   (or: cd services && ./start-all.sh)"
fi

# 2. Frontend
print_status "Checking frontend (http://localhost:3000)..."
if curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q 200; then
  print_ok "Frontend is up"
else
  print_warn "Frontend not reachable"
  print_status "Start frontend: npm run client   (or: cd client && npm start)"
fi

# 3. Dependencies
print_status "Checking dependencies..."
[ ! -d "node_modules" ]          && print_warn "Root: run npm install"
[ ! -d "client/node_modules" ]   && print_warn "Client: run cd client && npm install"
[ ! -d "services/gateway/node_modules" ] && print_warn "Services: run cd services && npm install"

# 4. PostgreSQL (optional note)
if command -v nc &>/dev/null; then
  if nc -z localhost 5432 2>/dev/null; then
    print_ok "PostgreSQL is listening on 5432"
  else
    print_warn "PostgreSQL not detected on 5432 (required for microservices)"
    print_status "Start Postgres, then: cd services && ./start-all.sh"
  fi
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "Fix the issues above, then start with:"
  echo "  npm run backend    # in one terminal"
  echo "  npm run client     # in another"
  exit 1
fi
echo "Backend and frontend are running. Open http://localhost:3000"
exit 0
