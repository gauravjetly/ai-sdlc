#!/bin/bash

echo "🚀 Starting Platform Services..."
echo ""

# Start API Server
echo "Starting REST API Server..."
npm run api:start > logs/api-server.log 2>&1 &
API_PID=$!
echo "✓ API Server started (PID: $API_PID)"

# Wait for API to be ready
echo "Waiting for API server to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ API Server is ready!"
    break
  fi
  echo -n "."
  sleep 1
done
echo ""

# Start MCP Server
echo "Starting MCP Server..."
npm run mcp:start > logs/mcp-server.log 2>&1 &
MCP_PID=$!
echo "✓ MCP Server started (PID: $MCP_PID)"
echo ""

echo "════════════════════════════════════════════════════"
echo "✅ All Services Running"
echo "════════════════════════════════════════════════════"
echo ""
echo "Process IDs:"
echo "  • API Server: $API_PID"
echo "  • MCP Server: $MCP_PID"
echo ""
echo "Logs:"
echo "  • tail -f logs/api-server.log"
echo "  • tail -f logs/mcp-server.log"
echo ""
echo "Stop services: kill $API_PID $MCP_PID"
echo ""

# Save PIDs
echo "$API_PID" > logs/api-server.pid
echo "$MCP_PID" > logs/mcp-server.pid
