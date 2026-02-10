#!/bin/bash

# Smoke Test Script for Multi-Project Scheduling System v2
# Tests the deployed scheduling v2 endpoints in staging environment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

echo "================================================"
echo "Scheduling v2 Smoke Test"
echo "================================================"
echo "Base URL: $BASE_URL"
echo "================================================"
echo ""

# Helper function for HTTP requests
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4

  echo -n "Testing $method $endpoint ... "

  if [ -z "$AUTH_TOKEN" ]; then
    if [ -z "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json")
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    fi
  else
    if [ -z "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "$data")
    fi
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
    return 0
  else
    echo -e "${RED}FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
    echo "Response body: $body"
    return 1
  fi
}

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Health Check
echo "Test 1: Health Check"
if make_request "GET" "/api/v1/scheduling/projects/health" "" "200"; then
  ((TESTS_PASSED++))
else
  ((TESTS_FAILED++))
fi
echo ""

# Test 2: Dashboard Endpoint (without auth - should fail if auth is required)
echo "Test 2: Dashboard Endpoint"
if make_request "GET" "/api/v1/scheduling/projects/dashboard" "" "200"; then
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}Note: If this fails with 401, authentication is required${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Test 3: Agent Pool Status
echo "Test 3: Agent Pool Status"
if make_request "GET" "/api/v1/scheduling/projects/agents/pool" "" "200"; then
  ((TESTS_PASSED++))
else
  ((TESTS_FAILED++))
fi
echo ""

# Test 4: List Projects (should return empty array initially)
echo "Test 4: List Projects"
if make_request "GET" "/api/v1/scheduling/projects" "" "200"; then
  ((TESTS_PASSED++))
else
  ((TESTS_FAILED++))
fi
echo ""

# Test 5: Create Project (without auth)
echo "Test 5: Create Project"
PROJECT_DATA='{
  "name": "Smoke Test Project",
  "deliveryDate": "2026-03-15T00:00:00Z",
  "priority": "NORMAL",
  "description": "Automated smoke test project"
}'

if make_request "POST" "/api/v1/scheduling/projects" "$PROJECT_DATA" "201"; then
  ((TESTS_PASSED++))
  echo "Project created successfully"
else
  echo -e "${YELLOW}Note: If this fails with 401, authentication is required${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Test 6: Database Tables Exist
echo "Test 6: Verify Database Tables"
if [ -n "$DATABASE_URL" ]; then
  echo "Checking scheduled_projects table..."
  psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM scheduled_projects;" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}PASS${NC} - scheduled_projects table exists"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}FAIL${NC} - scheduled_projects table not found"
    ((TESTS_FAILED++))
  fi

  echo "Checking project_phases table..."
  psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM project_phases;" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}PASS${NC} - project_phases table exists"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}FAIL${NC} - project_phases table not found"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}SKIP${NC} - DATABASE_URL not set"
fi
echo ""

# Test 7: Redis Connection (if Redis is available)
echo "Test 7: Redis Connection"
if command -v redis-cli > /dev/null 2>&1; then
  if redis-cli -u "${REDIS_URL:-redis://localhost:6379}" ping > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC} - Redis connection successful"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}FAIL${NC} - Redis connection failed"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}SKIP${NC} - redis-cli not available"
fi
echo ""

# Summary
echo "================================================"
echo "Smoke Test Summary"
echo "================================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "================================================"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please review the output above.${NC}"
  exit 1
fi
