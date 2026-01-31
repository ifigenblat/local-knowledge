#!/bin/bash

# Stop all microservices

echo "🛑 Stopping LocalKnowledge Microservices"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Stop services by PID
if [ -f logs/auth-service.pid ]; then
    PID=$(cat logs/auth-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Auth Service (PID: $PID)"
    fi
    rm logs/auth-service.pid
fi

if [ -f logs/user-service.pid ]; then
    PID=$(cat logs/user-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped User Service (PID: $PID)"
    fi
    rm logs/user-service.pid
fi

if [ -f logs/role-service.pid ]; then
    PID=$(cat logs/role-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Role Service (PID: $PID)"
    fi
    rm logs/role-service.pid
fi

if [ -f logs/card-service.pid ]; then
    PID=$(cat logs/card-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Card Service (PID: $PID)"
    fi
    rm logs/card-service.pid
fi

if [ -f logs/collection-service.pid ]; then
    PID=$(cat logs/collection-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Collection Service (PID: $PID)"
    fi
    rm logs/collection-service.pid
fi

if [ -f logs/gateway.pid ]; then
    PID=$(cat logs/gateway.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped API Gateway (PID: $PID)"
    fi
    rm logs/gateway.pid
fi

if [ -f logs/backend.pid ]; then
    PID=$(cat logs/backend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Backend (PID: $PID)"
    fi
    rm logs/backend.pid
fi

# Also kill any remaining node processes on these ports
for port in 5001 5002 5003 5004 5005 5006 5010 8000; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        kill $PID 2>/dev/null
        echo -e "${GREEN}✓${NC} Stopped process on port $port"
    fi
done

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"
echo ""
