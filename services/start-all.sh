#!/bin/bash

# Start all microservices

echo "🚀 Starting LocalKnowledge Microservices"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if MongoDB is running
echo -n "Checking MongoDB... "
if nc -z localhost 27017 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} MongoDB not running on port 27017"
    echo "   Please start MongoDB first: docker run -d -p 27017:27017 mongo:7"
    exit 1
fi

# Start services in background
echo ""
echo "Starting services..."
echo ""

# Auth Service
echo -e "${YELLOW}Starting Auth Service...${NC}"
cd auth-service
npm run dev > ../logs/auth-service.log 2>&1 &
AUTH_PID=$!
echo "  Auth Service PID: $AUTH_PID (port 5001)"
cd ..

sleep 2

# User Service
echo -e "${YELLOW}Starting User Service...${NC}"
cd user-service
npm run dev > ../logs/user-service.log 2>&1 &
USER_PID=$!
echo "  User Service PID: $USER_PID (port 5002)"
cd ..

sleep 2

# Role Service
echo -e "${YELLOW}Starting Role Service...${NC}"
cd role-service
npm run dev > ../logs/role-service.log 2>&1 &
ROLE_PID=$!
echo "  Role Service PID: $ROLE_PID (port 5003)"
cd ..

sleep 2

# API Gateway
echo -e "${YELLOW}Starting API Gateway...${NC}"
cd gateway
npm run dev > ../logs/gateway.log 2>&1 &
GATEWAY_PID=$!
echo "  API Gateway PID: $GATEWAY_PID (port 8000)"
cd ..

# Create logs directory if it doesn't exist
mkdir -p logs

# Save PIDs
echo "$AUTH_PID" > logs/auth-service.pid
echo "$USER_PID" > logs/user-service.pid
echo "$ROLE_PID" > logs/role-service.pid
echo "$GATEWAY_PID" > logs/gateway.pid

sleep 3

echo ""
echo "========================================"
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "Services:"
echo "  - Auth Service:    http://localhost:5001"
echo "  - User Service:    http://localhost:5002"
echo "  - Role Service:    http://localhost:5003"
echo "  - API Gateway:     http://localhost:8000"
echo ""
echo "Logs:"
echo "  - Auth Service:    services/logs/auth-service.log"
echo "  - User Service:    services/logs/user-service.log"
echo "  - Role Service:    services/logs/role-service.log"
echo "  - API Gateway:     services/logs/gateway.log"
echo ""
echo "To stop all services: ./stop-all.sh"
echo "To test services: ./test-services.sh"
echo ""
