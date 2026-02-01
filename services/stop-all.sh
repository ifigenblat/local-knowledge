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

if [ -f logs/upload-service.pid ]; then
    PID=$(cat logs/upload-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Upload Service (PID: $PID)"
    fi
    rm logs/upload-service.pid
fi

if [ -f logs/content-processing-service.pid ]; then
    PID=$(cat logs/content-processing-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Content Processing Service (PID: $PID)"
    fi
    rm logs/content-processing-service.pid
fi

if [ -f logs/ai-service.pid ]; then
    PID=$(cat logs/ai-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped AI Service (PID: $PID)"
    fi
    rm logs/ai-service.pid
fi

if [ -f logs/email-service.pid ]; then
    PID=$(cat logs/email-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Email Service (PID: $PID)"
    fi
    rm logs/email-service.pid
fi

if [ -f logs/files-service.pid ]; then
    PID=$(cat logs/files-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Files Service (PID: $PID)"
    fi
    rm logs/files-service.pid
fi

if [ -f logs/preview-service.pid ]; then
    PID=$(cat logs/preview-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Preview Service (PID: $PID)"
    fi
    rm logs/preview-service.pid
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

if [ -f logs/uploads-static-service.pid ]; then
    PID=$(cat logs/uploads-static-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✓${NC} Stopped Uploads Static Service (PID: $PID)"
    fi
    rm logs/uploads-static-service.pid
fi

# Also kill any remaining node processes on these ports
for port in 5001 5002 5003 5004 5005 5006 5007 5008 5009 5010 5011 5012 5013 8000; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        kill $PID 2>/dev/null
        echo -e "${GREEN}✓${NC} Stopped process on port $port"
    fi
done

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"
echo ""
