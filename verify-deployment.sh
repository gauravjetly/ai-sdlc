#!/bin/bash
# Deployment Verification Script

echo "🔍 Verifying Multi-Project Scheduling Deployment..."
echo ""

# Replace with your ALB DNS
ALB_DNS="${ALB_DNS:-YOUR_ALB_DNS_HERE}"

if [ "$ALB_DNS" = "YOUR_ALB_DNS_HERE" ]; then
  echo "⚠️  Please set ALB_DNS environment variable first:"
  echo "   export ALB_DNS=your-alb-dns-name.amazonaws.com"
  exit 1
fi

BASE_URL="http://$ALB_DNS"

# Test 1: Health Check
echo "1️⃣  Testing API health..."
curl -s "$BASE_URL/health" | grep -q "ok" && echo "   ✅ API is healthy" || echo "   ❌ API health check failed"

# Test 2: Scheduling Health
echo "2️⃣  Testing scheduling module..."
curl -s "$BASE_URL/api/v1/scheduling/projects/health" && echo "   ✅ Scheduling module is up" || echo "   ❌ Scheduling module not responding"

# Test 3: Dashboard Access
echo "3️⃣  Testing dashboard endpoint..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/scheduling/projects/dashboard" | grep -q "200\|401" && echo "   ✅ Dashboard endpoint exists" || echo "   ❌ Dashboard endpoint failed"

# Test 4: Frontend
echo "4️⃣  Testing frontend..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" | grep -q "200" && echo "   ✅ Frontend is serving" || echo "   ❌ Frontend not responding"

echo ""
echo "🎉 Verification complete!"
echo ""
echo "📱 Access your dashboards at:"
echo "   - Multi-Project Scheduling: $BASE_URL/scheduling"
echo "   - Tool Adoption Analytics: $BASE_URL/analytics"
echo "   - Main Dashboard: $BASE_URL/"
