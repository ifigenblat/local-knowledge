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
    echo "   Start MongoDB first: docker run -d -p 27017:27017 mongo:7  (or: docker start mongodb)"
    echo "   Continuing anyway; services will connect when MongoDB is up."
fi

# Start services in background
echo ""
echo "Starting services..."
echo ""

# Create logs directory if it doesn't exist (before starting)
mkdir -p logs

# Auth Service
echo -e "${YELLOW}Starting Auth Service...${NC}"
cd auth-service
PORT=5001 npm run dev > ../logs/auth-service.log 2>&1 &
AUTH_PID=$!
echo "  Auth Service PID: $AUTH_PID (port 5001)"
cd ..

sleep 2

# User Service
echo -e "${YELLOW}Starting User Service...${NC}"
cd user-service
PORT=5002 npm run dev > ../logs/user-service.log 2>&1 &
USER_PID=$!
echo "  User Service PID: $USER_PID (port 5002)"
cd ..

sleep 2

# Role Service
echo -e "${YELLOW}Starting Role Service...${NC}"
cd role-service
PORT=5003 npm run dev > ../logs/role-service.log 2>&1 &
ROLE_PID=$!
echo "  Role Service PID: $ROLE_PID (port 5003)"
cd ..

sleep 2

# Card Service (use npm start so nodemon is not required)
echo -e "${YELLOW}Starting Card Service...${NC}"
if [ ! -d card-service/node_modules ]; then
    echo -e "  ${YELLOW}Installing card-service dependencies...${NC}"
    (cd card-service && npm install)
fi
cd card-service
PORT=5004 npm start > ../logs/card-service.log 2>&1 &
CARD_PID=$!
echo "  Card Service PID: $CARD_PID (port 5004)"
cd ..

sleep 2

# Collection Service
echo -e "${YELLOW}Starting Collection Service...${NC}"
if [ ! -d collection-service/node_modules ]; then
    echo -e "  ${YELLOW}Installing collection-service dependencies...${NC}"
    (cd collection-service && npm install)
fi
cd collection-service
PORT=5005 npm start > ../logs/collection-service.log 2>&1 &
COLLECTION_PID=$!
echo "  Collection Service PID: $COLLECTION_PID (port 5005)"
cd ..

sleep 2

# Upload Service
echo -e "${YELLOW}Starting Upload Service...${NC}"
if [ ! -d upload-service/node_modules ]; then
    echo -e "  ${YELLOW}Installing upload-service dependencies...${NC}"
    (cd upload-service && npm install)
fi
cd upload-service
PORT=5006 npm start > ../logs/upload-service.log 2>&1 &
UPLOAD_PID=$!
echo "  Upload Service PID: $UPLOAD_PID (port 5006)"
cd ..

sleep 2

# API Gateway
echo -e "${YELLOW}Starting API Gateway...${NC}"
cd gateway
PORT=8000 npm run dev > ../logs/gateway.log 2>&1 &
GATEWAY_PID=$!
echo "  API Gateway PID: $GATEWAY_PID (port 8000)"
cd ..

sleep 2

# Backend (monolith: upload, preview, AI - cards on card-service, collections on collection-service)
echo -e "${YELLOW}Starting Backend (collections, upload, preview, AI)...${NC}"
cd ../server
PORT=5010 npm run dev > ../services/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID (port 5010)"
cd ../services

# Save PIDs
echo "$AUTH_PID" > logs/auth-service.pid
echo "$USER_PID" > logs/user-service.pid
echo "$ROLE_PID" > logs/role-service.pid
echo "$CARD_PID" > logs/card-service.pid
echo "$COLLECTION_PID" > logs/collection-service.pid
echo "$UPLOAD_PID" > logs/upload-service.pid
echo "$GATEWAY_PID" > logs/gateway.pid
echo "$BACKEND_PID" > logs/backend.pid

sleep 3

echo ""
echo "========================================"
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "Services:"
echo "  - Auth Service:    http://localhost:5001"
echo "  - User Service:    http://localhost:5002"
echo "  - Role Service:    http://localhost:5003"
echo "  - Card Service:    http://localhost:5004"
echo "  - Collection Service: http://localhost:5005"
echo "  - Upload Service:     http://localhost:5006"
echo "  - API Gateway:     http://localhost:8000"
echo "  - Backend:         http://localhost:5010 (preview, AI, process-uploaded-file)"
echo ""
echo "Logs:"
echo "  - Auth Service:    services/logs/auth-service.log"
echo "  - User Service:    services/logs/user-service.log"
echo "  - Role Service:    services/logs/role-service.log"
echo "  - Card Service:    services/logs/card-service.log"
echo "  - Collection Service: services/logs/collection-service.log"
echo "  - Upload Service:     services/logs/upload-service.log"
echo "  - API Gateway:     services/logs/gateway.log"
echo "  - Backend:         services/logs/backend.log"
echo ""
echo "To stop all services: ./stop-all.sh"
echo "To test services: ./test-services.sh"
echo ""
