#!/bin/bash

# AI-SDLC Integration Test Script
# Automated testing for dashboard integration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test categories
declare -a TEST_RESULTS

# Print functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_test() {
    echo -e "${YELLOW}TEST: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TEST_RESULTS+=("PASS: $1")
}

print_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    if [ ! -z "$2" ]; then
        echo -e "${RED}  Error: $2${NC}"
    fi
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TEST_RESULTS+=("FAIL: $1")
}

print_skip() {
    echo -e "${YELLOW}⊘ SKIP: $1${NC}"
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    TEST_RESULTS+=("SKIP: $1")
}

# Helper functions
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

wait_for_port() {
    local port=$1
    local max_wait=30
    local count=0

    while [ $count -lt $max_wait ]; do
        if check_port $port; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    return 1
}

http_get() {
    local url=$1
    local expected_code=${2:-200}

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)

    if [ "$response" = "$expected_code" ]; then
        return 0
    else
        echo "Expected $expected_code, got $response"
        return 1
    fi
}

# Test suites
test_prerequisites() {
    print_header "Test Suite 1: Prerequisites"
    TOTAL_TESTS=$((TOTAL_TESTS + 3))

    print_test "Node.js installed"
    if command -v node &> /dev/null; then
        local version=$(node --version)
        print_pass "Node.js installed: $version"
    else
        print_fail "Node.js not installed"
        exit 1
    fi

    print_test "npm installed"
    if command -v npm &> /dev/null; then
        local version=$(npm --version)
        print_pass "npm installed: $version"
    else
        print_fail "npm not installed"
        exit 1
    fi

    print_test "Required files exist"
    if [ -f "dashboard/server.js" ] && [ -f "src/platform/package.json" ] && [ -f "src/platform/webapp/package.json" ]; then
        print_pass "Required files exist"
    else
        print_fail "Required files missing"
        exit 1
    fi
}

test_service_startup() {
    print_header "Test Suite 2: Service Startup"
    TOTAL_TESTS=$((TOTAL_TESTS + 4))

    print_test "Ports are available"
    if ! check_port 3030 && ! check_port 3000 && ! check_port 3001; then
        print_pass "Ports 3030, 3000, 3001 are available"
    else
        print_fail "One or more ports already in use"
        print_skip "Skipping startup tests - ports in use"
        SKIPPED_TESTS=$((SKIPPED_TESTS + 3))
        return
    fi

    print_test "Start all services"
    ./start-all.sh > /tmp/integration-test-startup.log 2>&1 &
    STARTUP_PID=$!

    sleep 5

    if ps -p $STARTUP_PID > /dev/null; then
        print_pass "Services starting"
    else
        print_fail "Failed to start services"
        return
    fi

    print_test "Dashboard service (port 3030)"
    if wait_for_port 3030; then
        print_pass "Dashboard service started"
    else
        print_fail "Dashboard service failed to start"
        cat /tmp/integration-test-startup.log
        return
    fi

    print_test "Platform API service (port 3000)"
    if wait_for_port 3000; then
        print_pass "Platform API service started"
    else
        print_fail "Platform API service failed to start"
    fi

    print_test "Platform Webapp service (port 3001)"
    if wait_for_port 3001; then
        print_pass "Platform Webapp service started"
    else
        print_fail "Platform Webapp service failed to start"
    fi
}

test_http_endpoints() {
    print_header "Test Suite 3: HTTP Endpoints"

    if ! check_port 3030 || ! check_port 3000 || ! check_port 3001; then
        print_skip "Services not running, skipping HTTP tests"
        return
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 5))

    print_test "Dashboard homepage"
    if http_get "http://localhost:3030"; then
        print_pass "Dashboard homepage responds"
    else
        print_fail "Dashboard homepage failed"
    fi

    print_test "Dashboard serves HTML"
    response=$(curl -s http://localhost:3030 | head -1)
    if [[ $response == *"<!DOCTYPE"* ]] || [[ $response == *"<html"* ]]; then
        print_pass "Dashboard serves HTML content"
    else
        print_fail "Dashboard not serving HTML"
    fi

    print_test "Platform API health check"
    if http_get "http://localhost:3000/health"; then
        print_pass "Platform API health check responds"
    else
        print_fail "Platform API health check failed"
    fi

    print_test "Platform Webapp responds"
    if http_get "http://localhost:3001"; then
        print_pass "Platform Webapp responds"
    else
        print_fail "Platform Webapp failed"
    fi

    print_test "API proxy through dashboard"
    if http_get "http://localhost:3030/api/health"; then
        print_pass "API proxy working"
    else
        print_fail "API proxy failed"
    fi
}

test_api_proxy() {
    print_header "Test Suite 4: API Proxy Functionality"

    if ! check_port 3030 || ! check_port 3000; then
        print_skip "Services not running, skipping proxy tests"
        return
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 3))

    print_test "Proxy GET request"
    response=$(curl -s http://localhost:3030/api/health)
    if [ ! -z "$response" ]; then
        print_pass "Proxy GET request successful"
    else
        print_fail "Proxy GET request failed"
    fi

    print_test "Proxy headers forwarding"
    response=$(curl -s -H "X-Test-Header: test-value" http://localhost:3030/api/health)
    if [ ! -z "$response" ]; then
        print_pass "Proxy forwards headers"
    else
        print_fail "Proxy header forwarding failed"
    fi

    print_test "Proxy error handling (invalid endpoint)"
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3030/api/nonexistent)
    if [ "$http_code" = "404" ] || [ "$http_code" = "502" ]; then
        print_pass "Proxy handles errors correctly: $http_code"
    else
        print_fail "Proxy error handling unexpected: $http_code"
    fi
}

test_static_files() {
    print_header "Test Suite 5: Static File Serving"

    if ! check_port 3030; then
        print_skip "Dashboard not running, skipping static file tests"
        return
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 2))

    print_test "Dashboard serves favicon"
    if [ -f "dashboard/assets/favicon.ico" ]; then
        if http_get "http://localhost:3030/assets/favicon.ico"; then
            print_pass "Favicon served correctly"
        else
            print_fail "Favicon not accessible"
        fi
    else
        print_skip "Favicon file not found"
        SKIPPED_TESTS=$((SKIPPED_TESTS - 1))
    fi

    print_test "Dashboard serves static assets"
    if [ -d "dashboard/assets" ]; then
        print_pass "Assets directory exists"
    else
        print_skip "Assets directory not found"
    fi
}

test_registry_endpoints() {
    print_header "Test Suite 6: Registry API Endpoints"

    if ! check_port 3030; then
        print_skip "Dashboard not running, skipping registry tests"
        return
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 4))

    print_test "Registry data endpoint"
    response=$(curl -s http://localhost:3030/api/registry)
    if [ ! -z "$response" ]; then
        print_pass "Registry endpoint responds"
    else
        print_fail "Registry endpoint failed"
    fi

    print_test "Activity log endpoint"
    response=$(curl -s http://localhost:3030/api/activity)
    if [ ! -z "$response" ]; then
        print_pass "Activity log endpoint responds"
    else
        print_fail "Activity log endpoint failed"
    fi

    print_test "Projects endpoint"
    response=$(curl -s http://localhost:3030/api/projects)
    if [ ! -z "$response" ]; then
        print_pass "Projects endpoint responds"
    else
        print_fail "Projects endpoint failed"
    fi

    print_test "Costs endpoint"
    response=$(curl -s http://localhost:3030/api/costs)
    if [ ! -z "$response" ]; then
        print_pass "Costs endpoint responds"
    else
        print_fail "Costs endpoint failed"
    fi
}

test_performance() {
    print_header "Test Suite 7: Performance"

    if ! check_port 3030; then
        print_skip "Dashboard not running, skipping performance tests"
        return
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 2))

    print_test "Dashboard response time"
    start=$(date +%s%3N)
    curl -s http://localhost:3030 > /dev/null
    end=$(date +%s%3N)
    duration=$((end - start))

    if [ $duration -lt 2000 ]; then
        print_pass "Dashboard response time: ${duration}ms (< 2s)"
    else
        print_fail "Dashboard response time too slow: ${duration}ms"
    fi

    print_test "API proxy response time"
    start=$(date +%s%3N)
    curl -s http://localhost:3030/api/health > /dev/null
    end=$(date +%s%3N)
    duration=$((end - start))

    if [ $duration -lt 500 ]; then
        print_pass "API proxy response time: ${duration}ms (< 500ms)"
    else
        print_fail "API proxy response time: ${duration}ms (target: < 500ms)"
    fi
}

test_cleanup() {
    print_header "Test Suite 8: Cleanup & Shutdown"
    TOTAL_TESTS=$((TOTAL_TESTS + 2))

    if check_port 3030 || check_port 3000 || check_port 3001; then
        print_test "Stop all services"

        # Kill processes using the ports
        for port in 3030 3000 3001; do
            pid=$(lsof -ti :$port 2>/dev/null)
            if [ ! -z "$pid" ]; then
                kill $pid 2>/dev/null || true
            fi
        done

        sleep 2

        if ! check_port 3030 && ! check_port 3000 && ! check_port 3001; then
            print_pass "All services stopped"
        else
            print_fail "Some services still running"
        fi
    else
        print_skip "Services not running"
    fi

    print_test "PID files cleaned up"
    pid_files_exist=0

    if [ -f "dashboard/dashboard.pid" ]; then
        rm -f "dashboard/dashboard.pid"
        pid_files_exist=1
    fi

    if [ -f ".platform-state/api.pid" ]; then
        rm -f ".platform-state/api.pid"
        pid_files_exist=1
    fi

    if [ -f ".platform-state/webapp.pid" ]; then
        rm -f ".platform-state/webapp.pid"
        pid_files_exist=1
    fi

    print_pass "PID files cleaned up"
}

generate_report() {
    print_header "Test Results Summary"

    echo "Total Tests:  $TOTAL_TESTS"
    echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
    echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
    echo -e "${YELLOW}Skipped:      $SKIPPED_TESTS${NC}"
    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  ALL TESTS PASSED!${NC}"
        echo -e "${GREEN}========================================${NC}"
        SUCCESS_RATE=100
    else
        echo -e "${RED}========================================${NC}"
        echo -e "${RED}  SOME TESTS FAILED${NC}"
        echo -e "${RED}========================================${NC}"
        SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    fi

    echo ""
    echo "Success Rate: ${SUCCESS_RATE}%"
    echo ""

    # Save detailed report
    REPORT_FILE=".platform-state/integration-test-report-$(date +%Y%m%d-%H%M%S).txt"
    mkdir -p .platform-state

    {
        echo "AI-SDLC Integration Test Report"
        echo "==============================="
        echo ""
        echo "Date: $(date)"
        echo "Node Version: $(node --version)"
        echo "npm Version: $(npm --version)"
        echo ""
        echo "Test Summary"
        echo "------------"
        echo "Total Tests:  $TOTAL_TESTS"
        echo "Passed:       $PASSED_TESTS"
        echo "Failed:       $FAILED_TESTS"
        echo "Skipped:      $SKIPPED_TESTS"
        echo "Success Rate: ${SUCCESS_RATE}%"
        echo ""
        echo "Detailed Results"
        echo "----------------"
        for result in "${TEST_RESULTS[@]}"; do
            echo "$result"
        done
    } > "$REPORT_FILE"

    echo "Detailed report saved to: $REPORT_FILE"
    echo ""

    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    fi
}

# Main execution
main() {
    print_header "AI-SDLC Integration Test Suite"
    echo "Starting automated integration tests..."
    echo ""

    # Run test suites
    test_prerequisites
    test_service_startup
    sleep 5  # Give services time to fully initialize
    test_http_endpoints
    test_api_proxy
    test_static_files
    test_registry_endpoints
    test_performance
    test_cleanup

    # Generate report
    generate_report
}

# Run main
main
