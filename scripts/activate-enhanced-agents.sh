#!/bin/bash

echo "🚀 Activating Enhanced Agents with Regression Prevention"
echo "========================================================"
echo ""

cd /Users/gauravjetly/aisdlc-2.1.0/agents/

# Backup current versions
echo "📦 Backing up current agent definitions..."
cp qa-agent.md qa-agent.backup.md 2>/dev/null || true
cp customer-agent.md customer-agent.backup.md 2>/dev/null || true
cp software-engineer.md software-engineer.backup.md 2>/dev/null || true
echo "✅ Backups created"
echo ""

# Activate enhanced versions
echo "🔄 Activating enhanced agents..."
cp qa-agent-enhanced.md qa-agent.md
cp customer-agent-enhanced.md customer-agent.md
cp software-engineer-enhanced.md software-engineer.md
echo "✅ Enhanced agents activated!"
echo ""

echo "========================================="
echo "  Enhanced Agents Now Active!"
echo "========================================="
echo ""
echo "Changes:"
echo "  • QA Agent: MUST run baseline tests first"
echo "  • Customer Agent: MUST verify existing workflows first"
echo "  • Software Engineer: MUST analyze impact before coding"
echo ""
echo "Quality Gates:"
echo "  • Existing tests must pass"
echo "  • Coverage cannot decrease"
echo "  • Critical workflows must work"
echo "  • Performance cannot degrade >10%"
echo ""
echo "Next Steps:"
echo "  1. Create regression test structure:"
echo "     mkdir -p tests/regression/{critical-journeys,bug-regression,integration-regression}"
echo ""
echo "  2. Document critical workflows:"
echo "     vi docs/acceptance/baseline-workflows.md"
echo ""
echo "  3. Run your first baseline:"
echo "     npm run test:all"
echo ""
echo "  4. Use enhanced agents:"
echo "     /sdlc-start [your next feature]"
echo ""
echo "📚 Read full guide: docs/REGRESSION-PREVENTION-GUIDE.md"
echo ""
echo "✅ Done! Your agents now prevent regressions automatically."
