#!/bin/bash
# Verify Scheduling Integration
# Tests that all files are in place and imports are correct

echo "================================================"
echo "Scheduling Integration Verification"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check files exist
echo "1. Checking files exist..."

if [ -f "src/pages/Scheduling.tsx" ]; then
    echo -e "${GREEN}✓${NC} Scheduling page exists"
else
    echo -e "${RED}✗${NC} Scheduling page missing"
    exit 1
fi

if [ -f "src/components/scheduling/MultiProjectDashboard.tsx" ]; then
    echo -e "${GREEN}✓${NC} MultiProjectDashboard component exists"
else
    echo -e "${RED}✗${NC} MultiProjectDashboard component missing"
    exit 1
fi

if [ -f "src/App.tsx" ]; then
    echo -e "${GREEN}✓${NC} App.tsx exists"
else
    echo -e "${RED}✗${NC} App.tsx missing"
    exit 1
fi

if [ -f "src/components/Sidebar.tsx" ]; then
    echo -e "${GREEN}✓${NC} Sidebar.tsx exists"
else
    echo -e "${RED}✗${NC} Sidebar.tsx missing"
    exit 1
fi

echo ""
echo "2. Checking imports in App.tsx..."

if grep -q "import Scheduling from './pages/Scheduling'" src/App.tsx; then
    echo -e "${GREEN}✓${NC} Scheduling import found"
else
    echo -e "${RED}✗${NC} Scheduling import missing"
    exit 1
fi

if grep -q '<Route path="/scheduling" element={<Scheduling />} />' src/App.tsx; then
    echo -e "${GREEN}✓${NC} Scheduling route found"
else
    echo -e "${RED}✗${NC} Scheduling route missing"
    exit 1
fi

echo ""
echo "3. Checking Sidebar navigation..."

if grep -q "import ScheduleIcon from '@mui/icons-material/Schedule'" src/components/Sidebar.tsx; then
    echo -e "${GREEN}✓${NC} ScheduleIcon import found"
else
    echo -e "${RED}✗${NC} ScheduleIcon import missing"
    exit 1
fi

if grep -q "path: '/scheduling'" src/components/Sidebar.tsx; then
    echo -e "${GREEN}✓${NC} Scheduling menu item found"
else
    echo -e "${RED}✗${NC} Scheduling menu item missing"
    exit 1
fi

echo ""
echo "4. Checking component structure..."

if grep -q "import MultiProjectDashboard from '../components/scheduling/MultiProjectDashboard'" src/pages/Scheduling.tsx; then
    echo -e "${GREEN}✓${NC} MultiProjectDashboard import found"
else
    echo -e "${RED}✗${NC} MultiProjectDashboard import missing"
    exit 1
fi

if grep -q "export default MultiProjectDashboard" src/components/scheduling/MultiProjectDashboard.tsx; then
    echo -e "${GREEN}✓${NC} MultiProjectDashboard has default export"
else
    echo -e "${RED}✗${NC} MultiProjectDashboard missing default export"
    exit 1
fi

echo ""
echo "5. Backend API availability check..."

# Check if backend directory exists
if [ -d "../../scheduling/presentation/routes" ]; then
    echo -e "${GREEN}✓${NC} Backend scheduling routes directory exists"
else
    echo -e "${YELLOW}⚠${NC} Backend scheduling routes directory not found (expected location)"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✓ All integration checks passed!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Start the webapp: npm run dev"
echo "2. Navigate to http://localhost:5173/scheduling"
echo "3. Verify the dashboard loads"
echo "4. Ensure backend API is running at /api/v1/scheduling/*"
echo ""
echo "For more details, see: docs/SCHEDULING-INTEGRATION.md"
