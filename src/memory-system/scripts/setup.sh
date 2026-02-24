#!/bin/bash

# Memory System Setup Script

set -e

echo "🚀 Setting up RAG Memory System..."
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required. Current version: $(node --version)"
    exit 1
fi
echo "✓ Node.js $(node --version)"
echo ""

# Check for OpenAI API key
echo "Checking environment variables..."
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set"
    echo "   Set it with: export OPENAI_API_KEY='your-key'"
    echo ""
else
    echo "✓ OPENAI_API_KEY is set"
    echo ""
fi

# Install dependencies
echo "Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Build TypeScript
echo "Building TypeScript..."
npm run build
echo "✓ Build complete"
echo ""

# Create directory structure
echo "Creating directory structure..."
mkdir -p ~/.claude/governance/memory/chromadb
mkdir -p ~/.claude/governance/memory/source/code-patterns
mkdir -p ~/.claude/governance/memory/source/security-findings
mkdir -p ~/.claude/governance/memory/source/architecture-decisions
mkdir -p ~/.claude/governance/memory/source/test-strategies
mkdir -p ~/.claude/governance/memory/source/deployment-patterns
mkdir -p ~/.claude/governance/memory/source/compliance-rules
mkdir -p ~/.claude/governance/memory/source/failed-approaches
mkdir -p ~/.claude/governance/memory/source/vintiq-knowledge
echo "✓ Directory structure created"
echo ""

# Run tests
echo "Running tests..."
npm test
echo "✓ All tests passed"
echo ""

# Check health
echo "Checking system health..."
node -e "
const { createMemorySystem } = require('./dist/memory-system');
(async () => {
  try {
    const system = await createMemorySystem();
    const health = await system.healthCheck();
    console.log('✓ Health check:', health.status);
    console.log('  Collections:', health.details.collections);
    console.log('  Total memories:', health.details.totalMemories);
    await system.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
})();
"
echo ""

echo "✨ Setup complete!"
echo ""
echo "Try these commands:"
echo "  npm run search -- \"authentication patterns\""
echo "  memory stats"
echo "  memory recent"
echo ""
echo "See README.md for full documentation."
