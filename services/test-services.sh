#!/bin/bash

# Test script for microservices.
# Uses setup/teardown: removes leftover test user at start, deletes test user (and any created data) at end.

echo "🧪 Testing Microservices Architecture"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:8000}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-test123456}"

# Extract token from auth JSON response (stdin).
get_token() {
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || echo ""
}
# Extract user id from auth JSON response (stdin).
get_user_id() {
  python3 -c "import sys,json; d=json.load(sys.stdin); u=d.get('user',{}); print(u.get('id','') or u.get('_id',''))" 2>/dev/null || echo ""
}

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
test_endpoint "Card Service" "http://localhost:5004/health"
test_endpoint "Collection Service" "http://localhost:5005/health"
test_endpoint "Upload Service" "http://localhost:5006/health"
test_endpoint "Content Processing" "http://localhost:5007/health"
test_endpoint "AI Service" "http://localhost:5008/health"
test_endpoint "Email Service" "http://localhost:5009/health"
test_endpoint "Preview Service" "http://localhost:5011/health"
test_endpoint "Files Service" "http://localhost:5012/health"
test_endpoint "Uploads Static" "http://localhost:5013/health"
test_endpoint "API Gateway" "$BASE_URL/health"
test_endpoint "Gateway Services Health" "$BASE_URL/services/health"
test_endpoint "Gateway Metrics" "$BASE_URL/metrics"
echo ""

# Test API Gateway routing
echo "2. Testing API Gateway Routing"
echo "-------------------------------"
test_endpoint "Gateway Auth Health" "$BASE_URL/api/auth/health" 401  # Auth route requires token; 401 without token
echo ""

# --- Setup: known state (remove leftover test user from a previous run) ---
echo "3. Setup (known state)"
echo "----------------------"
echo -n "Removing leftover test user if present... "
login_cleanup=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")
cleanup_token=$(echo "$login_cleanup" | get_token)
if [ -n "$cleanup_token" ]; then
  cleanup_uid=$(echo "$login_cleanup" | get_user_id)
  if [ -n "$cleanup_uid" ]; then
    del_res=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/users/$cleanup_uid" \
      -H "Authorization: Bearer $cleanup_token")
    if [ "$del_res" = "200" ]; then
      echo -e "${GREEN}✓${NC} (deleted leftover user)"
    else
      echo -e "${YELLOW}skip${NC} (delete returned HTTP $del_res)"
    fi
  else
    echo -e "${YELLOW}skip${NC} (no user id)"
  fi
else
  echo -e "${GREEN}✓${NC} (none found)"
fi
echo ""

# --- Test authentication flow (create test user) ---
echo "4. Testing Authentication Flow"
echo "-------------------------------"
echo -n "Registering test user ($TEST_EMAIL)... "
register_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test User\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

TOKEN=$(echo "$register_response" | get_token)
TEST_USER_ID=$(echo "$register_response" | get_user_id)

if [ -z "$TOKEN" ] && echo "$register_response" | grep -q "User already exists"; then
  echo -e "${YELLOW}(exists)${NC} removing leftover then retrying..."
  login_retry=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")
  retry_token=$(echo "$login_retry" | get_token)
  retry_uid=$(echo "$login_retry" | get_user_id)
  if [ -n "$retry_token" ] && [ -n "$retry_uid" ]; then
    curl -s -o /dev/null -X DELETE "$BASE_URL/api/users/$retry_uid" -H "Authorization: Bearer $retry_token"
    register_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"Test User\", \"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")
    TOKEN=$(echo "$register_response" | get_token)
    TEST_USER_ID=$(echo "$register_response" | get_user_id)
  fi
fi

if [ -n "$TOKEN" ] && [ -n "$TEST_USER_ID" ]; then
    echo -e "${GREEN}✓${NC}"
    echo "  Token: ${TOKEN:0:20}...  User id: $TEST_USER_ID"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $register_response"
    if echo "$register_response" | grep -q "User already exists"; then
      echo "  Tip: Leftover user $TEST_EMAIL may have a different password. Use same TEST_PASSWORD or remove that user (e.g. via DB or admin)."
    fi
    exit 1
fi

echo -n "Validating token... "
validate_response=$(curl -s "$BASE_URL/api/auth/validate" \
  -H "Authorization: Bearer $TOKEN")

if echo "$validate_response" | grep -q "valid"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $validate_response"
fi

echo -n "Logging in... "
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")
if echo "$login_response" | get_token | grep -q .; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $login_response"
fi
echo ""

# Test role service
echo "5. Testing Role Service"
echo "-----------------------"
echo -n "Getting roles... "
roles_response=$(curl -s "$BASE_URL/api/roles" \
  -H "Authorization: Bearer $TOKEN")

if echo "$roles_response" | grep -q "superadmin\|admin\|user"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $roles_response"
fi
echo ""

# Test user service
echo "6. Testing User Service"
echo "-----------------------"
echo -n "Getting users... "
users_response=$(curl -s "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN")

if echo "$users_response" | grep -q "users\|pagination"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $users_response"
fi
echo ""

# Test Files service
echo "7. Testing Files Service"
echo "------------------------"
echo -n "Listing files... "
files_response=$(curl -s "$BASE_URL/api/files?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")
if echo "$files_response" | grep -q '"files"'; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $files_response"
fi
echo ""

# --- Teardown: reset to known state (delete resources created by this test run) ---
echo "8. Teardown (reset to known state)"
echo "-----------------------------------"
echo -n "Deleting test user... "
if [ -n "$TOKEN" ] && [ -n "$TEST_USER_ID" ]; then
  teardown_code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/users/$TEST_USER_ID" \
    -H "Authorization: Bearer $TOKEN")
  if [ "$teardown_code" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC} (HTTP $teardown_code)"
  fi
else
  echo -e "${YELLOW}skip${NC} (no token or user id)"
fi
# If tests create cards/collections/files in the future, delete them here by id, e.g.:
# for id in "${CREATED_CARD_IDS[@]}"; do curl -s -X DELETE "$BASE_URL/api/cards/$id" -H "Authorization: Bearer $TOKEN"; done
# for id in "${CREATED_COLLECTION_IDS[@]}"; do curl -s -X DELETE "$BASE_URL/api/collections/$id" -H "Authorization: Bearer $TOKEN"; done
# for name in "${CREATED_FILE_NAMES[@]}"; do curl -s -X DELETE "$BASE_URL/api/files/$name" -H "Authorization: Bearer $TOKEN"; done
echo ""

echo "======================================"
echo -e "${GREEN}✅ Testing Complete${NC}"
echo ""
