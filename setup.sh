#!/bin/bash

# LocalKnowledge - Setup (microservices + Postgres + client)
# No legacy server or MongoDB.

set -e

echo "🚀 Setting up LocalKnowledge (microservices + Postgres)..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status()  { echo -e "${BLUE}[INFO]${NC} $1"; }
print_ok()      { echo -e "${GREEN}[✓]${NC} $1"; }
print_warn()    { echo -e "${YELLOW}[⚠]${NC} $1"; }
print_error()   { echo -e "${RED}[✗]${NC} $1"; }

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# 1. Node
check_node() {
  print_status "Checking Node.js..."
  if command -v node &>/dev/null; then
    print_ok "Node.js $(node --version)"
  else
    print_error "Node.js not found. Install Node 16+."
    exit 1
  fi
}

# 2. Docker (optional, for Postgres)
check_docker() {
  print_status "Checking Docker..."
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    print_ok "Docker is running"
  else
    print_warn "Docker not running (optional). Postgres can be run via Docker or locally."
  fi
}

# 3. Dependencies
install_deps() {
  print_status "Installing dependencies..."
  npm install
  (cd client && npm install)
  (cd services && npm install)
  print_ok "Dependencies installed"
}

# 4. Postgres (optional)
setup_postgres() {
  print_status "Checking PostgreSQL..."
  if command -v nc &>/dev/null && nc -z localhost 5432 2>/dev/null; then
    print_ok "PostgreSQL is running on 5432"
    return
  fi
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q postgres; then
      print_ok "PostgreSQL container is running"
      return
    fi
    print_warn "PostgreSQL not detected. Start it for microservices:"
    echo "  docker run -d -p 5432:5432 -e POSTGRES_USER=localknowledge -e POSTGRES_PASSWORD=localknowledge -e POSTGRES_DB=localknowledge postgres:16-alpine"
  else
    print_warn "Start PostgreSQL on port 5432 (see services/README.md or QUICK_START.md)"
  fi
}

# 5. services/.env
create_env() {
  if [ -f "services/.env" ]; then
    print_ok "services/.env exists"
    return
  fi
  print_status "Creating services/.env..."
  JWT="$(openssl rand -base64 32 2>/dev/null || echo 'change-me-in-production')"
  cat > services/.env << EOF
DATABASE_URL=postgresql://localknowledge:localknowledge@localhost:5432/localknowledge
JWT_SECRET=$JWT
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MAILHOG_HOST=127.0.0.1
MAILHOG_PORT=1025
EOF
  print_ok "Created services/.env (edit DATABASE_URL if needed)"
}

# 6. Schema and seed (from services/)
seed_db() {
  if ! nc -z localhost 5432 2>/dev/null; then
    print_warn "PostgreSQL not running; skipping schema/seed. Run later: cd services && npm run sync-postgres && npm run seed-postgres"
    return
  fi
  print_status "Syncing schema and seeding (roles + admin user)..."
  (cd services && npm run sync-postgres 2>/dev/null) || true
  if (cd services && npm run seed-postgres 2>/dev/null); then
    print_ok "Database synced and seeded (admin@localknowledge.local / admin123)"
  else
    print_warn "Seed failed or already done. Run manually: cd services && npm run seed-postgres"
  fi
}

# 7. Verify
verify() {
  print_status "Verifying..."
  for f in client/package.json services/gateway/index.js services/start-all.sh; do
    [ -e "$f" ] && print_ok "$f" || print_error "Missing: $f"
  done
}

# Main
main() {
  check_node
  check_docker
  install_deps
  setup_postgres
  create_env
  seed_db
  verify

  echo ""
  echo "🎉 Setup complete."
  echo ""
  echo "Start the app:"
  echo "  1. Backend:  npm run backend   (or: cd services && ./start-all.sh)"
  echo "  2. Frontend: npm run client   (or: cd client && npm start)"
  echo "  3. Open      http://localhost:3000"
  echo "  Default login: admin@localknowledge.local / admin123"
  echo ""
}

main "$@"
