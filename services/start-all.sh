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

# Content Processing Service
echo -e "${YELLOW}Starting Content Processing Service...${NC}"
if [ ! -d content-processing-service/node_modules ]; then
    echo -e "  ${YELLOW}Installing content-processing-service dependencies...${NC}"
    (cd content-processing-service && npm install)
fi
cd content-processing-service
PORT=5007 npm start > ../logs/content-processing-service.log 2>&1 &
CONTENT_PID=$!
echo "  Content Processing Service PID: $CONTENT_PID (port 5007)"
cd ..

sleep 2

# AI Service
echo -e "${YELLOW}Starting AI Service...${NC}"
if [ ! -d ai-service/node_modules ]; then
    echo -e "  ${YELLOW}Installing ai-service dependencies...${NC}"
    (cd ai-service && npm install)
fi
cd ai-service
PORT=5008 npm start > ../logs/ai-service.log 2>&1 &
AI_PID=$!
echo "  AI Service PID: $AI_PID (port 5008)"
cd ..

sleep 2

# Email Service
echo -e "${YELLOW}Starting Email Service...${NC}"
if [ ! -d email-service/node_modules ]; then
    echo -e "  ${YELLOW}Installing email-service dependencies...${NC}"
    (cd email-service && npm install)
fi
cd email-service
PORT=5009 npm start > ../logs/email-service.log 2>&1 &
EMAIL_PID=$!
echo "  Email Service PID: $EMAIL_PID (port 5009)"
cd ..

sleep 2

# Files Service
echo -e "${YELLOW}Starting Files Service...${NC}"
if [ ! -d files-service/node_modules ]; then
    echo -e "  ${YELLOW}Installing files-service dependencies...${NC}"
    (cd files-service && npm install)
fi
SCRIPT_DIR_FILES="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT_FILES="$(cd "$SCRIPT_DIR_FILES/.." && pwd)"
cd files-service
PORT=5012 UPLOAD_DIR="$PROJECT_ROOT_FILES/server/uploads" npm start > ../logs/files-service.log 2>&1 &
FILES_PID=$!
echo "  Files Service PID: $FILES_PID (port 5012)"
cd ..

sleep 2

# Preview Service
echo -e "${YELLOW}Starting Preview Service...${NC}"
if [ ! -d preview-service/node_modules ]; then
    echo -e "  ${YELLOW}Installing preview-service dependencies...${NC}"
    (cd preview-service && npm install)
fi
cd preview-service
PORT=5011 UPLOAD_DIR="$PROJECT_ROOT_FILES/server/uploads" npm start > ../logs/preview-service.log 2>&1 &
PREVIEW_PID=$!
echo "  Preview Service PID: $PREVIEW_PID (port 5011)"
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

# Backend (card regenerate - rule-based + AI; card-service proxies to it)
echo -e "${YELLOW}Starting Backend (regenerate only)...${NC}"
cd ../server
PORT=5010 npm run dev > ../services/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID (port 5010 - regenerate)"
cd ../services

sleep 2

# Uploads Static Service (serves /uploads files)
echo -e "${YELLOW}Starting Uploads Static Service...${NC}"
if [ ! -d uploads-static-service/node_modules ]; then
    echo -e "  ${YELLOW}Installing uploads-static-service dependencies...${NC}"
    (cd uploads-static-service && npm install)
fi
cd uploads-static-service
PORT=5013 UPLOAD_DIR="$PROJECT_ROOT_FILES/server/uploads" npm start > ../logs/uploads-static-service.log 2>&1 &
UPLOADS_STATIC_PID=$!
echo "  Uploads Static Service PID: $UPLOADS_STATIC_PID (port 5013)"
cd ..

# Save PIDs
echo "$AUTH_PID" > logs/auth-service.pid
echo "$USER_PID" > logs/user-service.pid
echo "$ROLE_PID" > logs/role-service.pid
echo "$CARD_PID" > logs/card-service.pid
echo "$COLLECTION_PID" > logs/collection-service.pid
echo "$UPLOAD_PID" > logs/upload-service.pid
echo "$CONTENT_PID" > logs/content-processing-service.pid
echo "$AI_PID" > logs/ai-service.pid
echo "$EMAIL_PID" > logs/email-service.pid
echo "$FILES_PID" > logs/files-service.pid
echo "$PREVIEW_PID" > logs/preview-service.pid
echo "$GATEWAY_PID" > logs/gateway.pid
echo "$BACKEND_PID" > logs/backend.pid
echo "$UPLOADS_STATIC_PID" > logs/uploads-static-service.pid

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
echo "  - Content Processing Service: http://localhost:5007"
echo "  - AI Service:      http://localhost:5008"
echo "  - Email Service:   http://localhost:5009"
echo "  - Preview Service: http://localhost:5011"
echo "  - Files Service:   http://localhost:5012"
echo "  - API Gateway:     http://localhost:8000"
echo "  - Backend:         http://localhost:5010 (regenerate)"
echo "  - Uploads Static:  http://localhost:5013 (static /uploads)"
echo ""
echo "Logs:"
echo "  - Auth Service:    services/logs/auth-service.log"
echo "  - User Service:    services/logs/user-service.log"
echo "  - Role Service:    services/logs/role-service.log"
echo "  - Card Service:    services/logs/card-service.log"
echo "  - Collection Service: services/logs/collection-service.log"
echo "  - Upload Service:     services/logs/upload-service.log"
echo "  - Content Processing Service: services/logs/content-processing-service.log"
echo "  - AI Service:      services/logs/ai-service.log"
echo "  - Email Service:   services/logs/email-service.log"
echo "  - Files Service:   services/logs/files-service.log"
echo "  - Preview Service: services/logs/preview-service.log"
echo "  - API Gateway:     services/logs/gateway.log"
echo "  - Backend:         services/logs/backend.log"
echo "  - Uploads Static:  services/logs/uploads-static-service.log"
echo ""
echo "To stop all services: ./stop-all.sh"
echo "To test services: ./test-services.sh"
echo ""
