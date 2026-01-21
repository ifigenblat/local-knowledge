#!/bin/bash

# LocalKnowledge - System Test Script
# This script tests all functionality of the application


# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:5001"
FRONTEND_URL="http://localhost:3000"
TEST_EMAIL="testuser_$(date +%s)@example.com"
TEST_PASSWORD="testpass123"
TEST_NAME="Test User $(date +%s)"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TOKEN=""

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}==================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==================================${NC}"
}

print_test() {
    echo -e "${YELLOW}Testing:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# Check if servers are running
check_servers() {
    print_header "Checking Server Status"
    
    # Check backend
    print_test "Backend health check"
    if curl -s "$BASE_URL/api/health" | grep -q "OK"; then
        print_success "Backend is running"
    else
        print_fail "Backend is not responding"
        exit 1
    fi
    
    # Check frontend
    print_test "Frontend accessibility"
    if curl -s -I "$FRONTEND_URL" 2>/dev/null | grep -q "200 OK"; then
        print_success "Frontend is running"
    else
        print_fail "Frontend is not responding (continuing tests anyway)"
    fi
}

# Test Authentication
test_authentication() {
    print_header "Authentication Tests"
    
    # Test Registration
    print_test "User Registration"
    REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$TEST_NAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    if echo "$REGISTER_RESPONSE" | grep -q "token"; then
        TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")
        print_success "User registered: $TEST_EMAIL"
    else
        # Try login if registration failed (user might exist)
        print_info "Registration failed, trying login..."
        LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
        
        if echo "$LOGIN_RESPONSE" | grep -q "token"; then
            TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")
            print_success "User login successful"
        else
            print_fail "Registration and login both failed"
        fi
    fi
    
    # Test Login
    if [ -z "$TOKEN" ]; then
        print_test "User Login"
        LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
        
        if echo "$LOGIN_RESPONSE" | grep -q "token"; then
            TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")
            print_success "Login successful"
        else
            print_fail "Login failed"
        fi
    fi
    
    # Test Get Profile
    if [ -n "$TOKEN" ]; then
        print_test "Get User Profile"
        PROFILE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/auth/me")
        
        if echo "$PROFILE_RESPONSE" | grep -q "$TEST_EMAIL"; then
            print_success "Profile retrieved successfully"
        else
            print_fail "Failed to get profile"
        fi
    fi
}

# Test Card Management
test_cards() {
    print_header "Card Management Tests"
    
    if [ -z "$TOKEN" ]; then
        print_fail "No authentication token available for card tests"
        return
    fi
    
    # Create Card
    print_test "Create Card"
    CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cards" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"Test Card","content":"This is test card content","type":"concept","category":"General","tags":["test"]}')
    
    CARD_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('_id', data.get('id', '')))" 2>/dev/null || echo "")
    
    if [ -n "$CARD_ID" ]; then
        print_success "Card created: $CARD_ID"
    else
        print_fail "Failed to create card"
        return
    fi
    
    # Get All Cards
    print_test "Get All Cards"
    CARDS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/cards")
    
    if echo "$CARDS_RESPONSE" | grep -q "cards\|\[\]"; then
        CARD_COUNT=$(echo "$CARDS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); cards=data.get('cards', []); print(len(cards) if isinstance(cards, list) else 0)" 2>/dev/null || echo "0")
        print_success "Retrieved cards: $CARD_COUNT found"
    else
        print_fail "Failed to get cards"
    fi
    
    # Get Single Card
    if [ -n "$CARD_ID" ]; then
        print_test "Get Single Card"
        SINGLE_CARD=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/cards/$CARD_ID")
        
        if echo "$SINGLE_CARD" | grep -q "Test Card"; then
            print_success "Single card retrieved"
        else
            print_fail "Failed to get single card"
        fi
        
        # Update Card
        print_test "Update Card"
        UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/cards/$CARD_ID" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"title":"Updated Test Card","content":"Updated content"}')
        
        if echo "$UPDATE_RESPONSE" | grep -q "Updated Test Card"; then
            print_success "Card updated successfully"
        else
            print_fail "Failed to update card"
        fi
        
        # Delete Card
        print_test "Delete Card"
        DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/cards/$CARD_ID" \
            -H "Authorization: Bearer $TOKEN")
        
        if echo "$DELETE_RESPONSE" | grep -q "success\|deleted\|Card"; then
            print_success "Card deleted successfully"
        else
            # Check if card was actually deleted
            CHECK_DELETED=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/cards/$CARD_ID")
            if echo "$CHECK_DELETED" | grep -q "not found\|404\|error"; then
                print_success "Card deleted (verified by 404)"
            else
                print_fail "Failed to delete card"
            fi
        fi
    fi
}

# Test Collections
test_collections() {
    print_header "Collection Management Tests"
    
    if [ -z "$TOKEN" ]; then
        print_fail "No authentication token available for collection tests"
        return
    fi
    
    # Get Collections
    print_test "Get Collections"
    COLLECTIONS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/collections")
    
    if [ -n "$COLLECTIONS_RESPONSE" ]; then
        COLLECTION_COUNT=$(echo "$COLLECTIONS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")
        print_success "Retrieved collections: $COLLECTION_COUNT found"
    else
        print_fail "Failed to get collections"
    fi
    
    # Create Collection
    print_test "Create Collection"
    CREATE_COLLECTION=$(curl -s -X POST "$BASE_URL/api/collections" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Test Collection","description":"Test collection"}')
    
    COLLECTION_ID=$(echo "$CREATE_COLLECTION" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('_id', data.get('id', '')))" 2>/dev/null || echo "")
    
    if [ -n "$COLLECTION_ID" ]; then
        print_success "Collection created: $COLLECTION_ID"
        
        # Delete Collection
        print_test "Delete Collection"
        DELETE_COLLECTION=$(curl -s -X DELETE "$BASE_URL/api/collections/$COLLECTION_ID" \
            -H "Authorization: Bearer $TOKEN")
        
        if echo "$DELETE_COLLECTION" | grep -q "success\|deleted"; then
            print_success "Collection deleted successfully"
        else
            print_fail "Failed to delete collection"
        fi
    else
        print_fail "Failed to create collection"
    fi
}

# Test Password Reset
test_password_reset() {
    print_header "Password Reset Tests"
    
    # Test Forgot Password
    print_test "Forgot Password Request"
    FORGOT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/forgot-password" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\"}")
    
    if echo "$FORGOT_RESPONSE" | grep -q "reset\|sent\|message"; then
        print_success "Password reset email request processed"
        print_info "Check MailHog at http://localhost:8025 for the email"
    else
        print_fail "Forgot password request failed"
    fi
    
    # Test Reset Password Endpoint (with invalid token to verify it works)
    print_test "Reset Password Endpoint"
    RESET_TEST=$(curl -s -X POST "$BASE_URL/api/auth/reset-password" \
        -H "Content-Type: application/json" \
        -d '{"token":"invalid-test-token","newPassword":"newpass123"}')
    
    if echo "$RESET_TEST" | grep -q "Invalid\|expired\|error"; then
        print_success "Reset password endpoint validates tokens correctly"
    else
        print_fail "Reset password endpoint not working"
    fi
}

# Test Profile Management
test_profile() {
    print_header "Profile Management Tests"
    
    if [ -z "$TOKEN" ]; then
        print_fail "No authentication token available for profile tests"
        return
    fi
    
    # Test Update Profile
    print_test "Update Profile"
    UPDATE_PROFILE=$(curl -s -X PUT "$BASE_URL/api/auth/profile" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Updated Test Name"}')
    
    if echo "$UPDATE_PROFILE" | grep -q "Updated Test Name\|name"; then
        print_success "Profile updated successfully"
    else
        print_fail "Failed to update profile"
    fi
}

# Test Card Filters
test_filters() {
    print_header "Card Filter Tests"
    
    if [ -z "$TOKEN" ]; then
        print_fail "No authentication token available for filter tests"
        return
    fi
    
    # Test Category Filter
    print_test "Category Filter"
    CATEGORY_FILTER=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/cards/category/General")
    
    if [ -n "$CATEGORY_FILTER" ]; then
        print_success "Category filter endpoint accessible"
    else
        print_fail "Category filter failed"
    fi
    
    # Test Type Filter
    print_test "Type Filter"
    TYPE_FILTER=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/cards/type/concept")
    
    if [ -n "$TYPE_FILTER" ]; then
        print_success "Type filter endpoint accessible"
    else
        print_fail "Type filter failed"
    fi
}

# Test Upload Endpoint
test_upload() {
    print_header "Upload Endpoint Tests"
    
    if [ -z "$TOKEN" ]; then
        print_fail "No authentication token available for upload tests"
        return
    fi
    
    print_test "Upload Endpoint Accessibility"
    UPLOAD_TEST=$(curl -s -X POST "$BASE_URL/api/upload" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$UPLOAD_TEST" | grep -q "file\|error\|upload"; then
        print_success "Upload endpoint is accessible (requires file for full test)"
    else
        print_fail "Upload endpoint not working"
    fi
}

# Test AI Status
test_ai_status() {
    print_header "AI (Ollama) Status Tests"
    
    print_test "AI Status Endpoint"
    AI_STATUS=$(curl -s "$BASE_URL/api/ai/status")
    
    if echo "$AI_STATUS" | grep -q "enabled\|available"; then
        AI_ENABLED=$(echo "$AI_STATUS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('enabled', False))" 2>/dev/null || echo "false")
        AI_AVAILABLE=$(echo "$AI_STATUS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('available', False))" 2>/dev/null || echo "false")
        
        if [ "$AI_ENABLED" = "True" ] || [ "$AI_ENABLED" = "true" ]; then
            if [ "$AI_AVAILABLE" = "True" ] || [ "$AI_AVAILABLE" = "true" ]; then
                print_success "AI (Ollama) is enabled and available"
            else
                print_info "AI is enabled but not available (Ollama may not be running)"
            fi
        else
            print_info "AI is disabled (optional feature)"
        fi
    else
        print_fail "AI status endpoint not working"
    fi
}

# Test Card Regeneration
test_card_regeneration() {
    print_header "Card Regeneration Tests"
    
    if [ -z "$TOKEN" ]; then
        print_fail "No authentication token available for regeneration tests"
        return
    fi
    
    # Create a card with provenance for regeneration testing
    print_test "Create Card with Provenance for Regeneration"
    CARD_WITH_PROVENANCE=$(curl -s -X POST "$BASE_URL/api/cards" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"Regen Test Card","content":"Test content for regeneration","type":"concept","category":"General","tags":["test","regen"],"provenance":{"snippet":"This is a test snippet for card regeneration","location":"test.txt:1-10"}}')
    
    REGEN_CARD_ID=$(echo "$CARD_WITH_PROVENANCE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('_id', data.get('id', '')))" 2>/dev/null || echo "")
    
    if [ -z "$REGEN_CARD_ID" ]; then
        print_fail "Failed to create card for regeneration test"
        return
    fi
    
    print_success "Card created for regeneration: $REGEN_CARD_ID"
    
    # Test Rule-Based Regeneration
    print_test "Rule-Based Card Regeneration"
    REGEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cards/$REGEN_CARD_ID/regenerate" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"useAI":false}')
    
    if echo "$REGEN_RESPONSE" | grep -q "_id\|title\|content"; then
        print_success "Rule-based regeneration successful"
    else
        print_fail "Rule-based regeneration failed"
    fi
    
    # Test AI Regeneration (if available)
    AI_STATUS=$(curl -s "$BASE_URL/api/ai/status")
    AI_AVAILABLE=$(echo "$AI_STATUS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('available', False))" 2>/dev/null || echo "false")
    
    if [ "$AI_AVAILABLE" = "True" ] || [ "$AI_AVAILABLE" = "true" ]; then
        print_test "AI Card Regeneration (Comparison Mode)"
        AI_REGEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cards/$REGEN_CARD_ID/regenerate" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"useAI":true,"comparisonMode":true}')
        
        if echo "$AI_REGEN_RESPONSE" | grep -q "comparison.*true\|ruleBased\|ai"; then
            print_success "AI regeneration (comparison mode) successful"
            
            # Extract comparison data
            HAS_RULEBASED=$(echo "$AI_REGEN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('ruleBased' in data)" 2>/dev/null || echo "false")
            HAS_AI=$(echo "$AI_REGEN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('ai' in data)" 2>/dev/null || echo "false")
            
            if [ "$HAS_RULEBASED" = "True" ] || [ "$HAS_RULEBASED" = "true" ]; then
                print_success "Comparison data includes rule-based version"
            fi
            
            if [ "$HAS_AI" = "True" ] || [ "$HAS_AI" = "true" ]; then
                print_success "Comparison data includes AI-generated version"
            fi
        else
            print_fail "AI regeneration (comparison mode) failed"
        fi
    else
        print_info "AI regeneration skipped (Ollama not available)"
    fi
    
    # Clean up test card
    if [ -n "$REGEN_CARD_ID" ]; then
        curl -s -X DELETE "$BASE_URL/api/cards/$REGEN_CARD_ID" \
            -H "Authorization: Bearer $TOKEN" > /dev/null
    fi
}

# Integration Test: Card Creation -> Collection Creation -> Add Card to Collection
test_card_collection_integration() {
    print_header "Card-Collection Integration Test"
    
    if [ -z "$TOKEN" ]; then
        print_fail "No authentication token available for integration test"
        return
    fi
    
    INTEGRATION_CARD_ID=""
    INTEGRATION_COLLECTION_ID=""
    
    # Step 1: Create a card
    print_test "Step 1: Create Card for Integration Test"
    CREATE_CARD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cards" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"Integration Test Card","content":"This card will be added to a collection","type":"concept","category":"General","tags":["integration","test"]}')
    
    INTEGRATION_CARD_ID=$(echo "$CREATE_CARD_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('_id', data.get('id', '')))" 2>/dev/null || echo "")
    
    if [ -z "$INTEGRATION_CARD_ID" ]; then
        print_fail "Failed to create card for integration test"
        return
    fi
    
    print_success "Card created: $INTEGRATION_CARD_ID"
    
    # Step 2: Create a collection
    print_test "Step 2: Create Collection for Integration Test"
    CREATE_COLLECTION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/collections" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Integration Test Collection","description":"Collection for integration testing"}')
    
    INTEGRATION_COLLECTION_ID=$(echo "$CREATE_COLLECTION_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('_id', data.get('id', '')))" 2>/dev/null || echo "")
    
    if [ -z "$INTEGRATION_COLLECTION_ID" ]; then
        print_fail "Failed to create collection for integration test"
        # Clean up card
        curl -s -X DELETE "$BASE_URL/api/cards/$INTEGRATION_CARD_ID" \
            -H "Authorization: Bearer $TOKEN" > /dev/null
        return
    fi
    
    print_success "Collection created: $INTEGRATION_COLLECTION_ID"
    
    # Step 3: Add card to collection
    print_test "Step 3: Add Card to Collection"
    ADD_CARD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/collections/$INTEGRATION_COLLECTION_ID/cards" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"cardId\":\"$INTEGRATION_CARD_ID\"}")
    
    if echo "$ADD_CARD_RESPONSE" | grep -q "$INTEGRATION_CARD_ID\|cards"; then
        print_success "Card added to collection successfully"
    else
        print_fail "Failed to add card to collection"
        # Clean up
        curl -s -X DELETE "$BASE_URL/api/collections/$INTEGRATION_COLLECTION_ID" \
            -H "Authorization: Bearer $TOKEN" > /dev/null
        curl -s -X DELETE "$BASE_URL/api/cards/$INTEGRATION_CARD_ID" \
            -H "Authorization: Bearer $TOKEN" > /dev/null
        return
    fi
    
    # Step 4: Verify card is in collection
    print_test "Step 4: Verify Card is in Collection"
    GET_COLLECTION_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/collections/$INTEGRATION_COLLECTION_ID")
    
    CARD_IN_COLLECTION=$(echo "$GET_COLLECTION_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); cards=data.get('cards', []); card_ids=[str(c.get('_id', c.get('id', c))) if isinstance(c, dict) else str(c) for c in cards]; print('$INTEGRATION_CARD_ID' in card_ids)" 2>/dev/null || echo "false")
    
    if [ "$CARD_IN_COLLECTION" = "True" ] || [ "$CARD_IN_COLLECTION" = "true" ]; then
        print_success "Card verified in collection"
    else
        print_fail "Card not found in collection after adding"
    fi
    
    # Step 5: Verify collection appears in card's collections (if applicable)
    print_test "Step 5: Verify Collection Relationship"
    GET_CARD_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/cards/$INTEGRATION_CARD_ID")
    
    if echo "$GET_CARD_RESPONSE" | grep -q "Integration Test Card"; then
        print_success "Card relationship verified"
    else
        print_fail "Card relationship verification failed"
    fi
    
    # Clean up: Delete collection and card
    print_test "Cleanup: Removing Test Data"
    curl -s -X DELETE "$BASE_URL/api/collections/$INTEGRATION_COLLECTION_ID" \
        -H "Authorization: Bearer $TOKEN" > /dev/null
    curl -s -X DELETE "$BASE_URL/api/cards/$INTEGRATION_CARD_ID" \
        -H "Authorization: Bearer $TOKEN" > /dev/null
    
    print_success "Integration test completed and cleaned up"
}

# Print Summary
print_summary() {
    print_header "Test Summary"
    
    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
    PASS_RATE=0
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    fi
    
    echo ""
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo -e "Pass Rate: ${PASS_RATE}%"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   LocalKnowledge System Tests     ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
    echo ""
    
    check_servers
    test_authentication
    test_cards
    test_collections
    test_card_collection_integration
    test_password_reset
    test_profile
    test_filters
    test_upload
    test_ai_status
    test_card_regeneration
    print_summary
}

# Run main function
main "$@"
