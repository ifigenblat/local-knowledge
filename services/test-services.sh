#!/bin/bash

# Test script for microservices

echo "🧪 Testing Microservices Architecture"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $http_code)"
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $http_code, expected $expected_status)"
        echo "  Response: $body"
        return 1
    fi
}

# Test service health checks
echo "1. Testing Service Health Checks"
echo "---------------------------------"
test_endpoint "Auth Service" "http://localhost:5001/health"
test_endpoint "User Service" "http://localhost:5002/health"
test_endpoint "Role Service" "http://localhost:5003/health"
test_endpoint "API Gateway" "http://localhost:8000/health"
test_endpoint "Gateway Services Health" "http://localhost:8000/services/health"
echo ""

# Test API Gateway routing
echo "2. Testing API Gateway Routing"
echo "-------------------------------"
test_endpoint "Gateway Auth Health" "http://localhost:8000/api/auth/health" 404  # Should route to auth service
echo ""

# Test authentication flow
echo "3. Testing Authentication Flow"
echo "-------------------------------"
echo -n "Registering test user... "
register_response=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123456"
  }')

if echo "$register_response" | grep -q "token"; then
    echo -e "${GREEN}✓${NC}"
    TOKEN=$(echo "$register_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "  Token received: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $register_response"
    exit 1
fi

echo -n "Validating token... "
validate_response=$(curl -s http://localhost:8000/api/auth/validate \
  -H "Authorization: Bearer $TOKEN")

if echo "$validate_response" | grep -q "valid"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $validate_response"
fi

echo -n "Logging in... "
login_response=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }')

if echo "$login_response" | grep -q "token"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $login_response"
fi
echo ""

# Test role service
echo "4. Testing Role Service"
echo "-----------------------"
echo -n "Getting roles... "
roles_response=$(curl -s http://localhost:8000/api/roles \
  -H "Authorization: Bearer $TOKEN")

if echo "$roles_response" | grep -q "superadmin\|admin\|user"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $roles_response"
fi
echo ""

# Test user service
echo "5. Testing User Service"
echo "-----------------------"
echo -n "Getting users... "
users_response=$(curl -s http://localhost:8000/api/users \
  -H "Authorization: Bearer $TOKEN")

if echo "$users_response" | grep -q "users\|pagination"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $users_response"
fi
echo ""

echo "======================================"
echo -e "${GREEN}✅ Testing Complete${NC}"
echo ""
