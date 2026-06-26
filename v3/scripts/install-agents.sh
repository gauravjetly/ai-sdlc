#!/bin/bash

#===============================================================================
# AI-SDLC - Install Agents Only
#===============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🤖 Installing AI-SDLC Agents..."
echo ""

mkdir -p ~/.claude/agents

for agent in "$SCRIPT_DIR/../agents/"*.md; do
    if [ -f "$agent" ]; then
        filename=$(basename "$agent")
        cp "$agent" ~/.claude/agents/
        echo "   ✓ $filename"
    fi
done

echo ""
echo "✅ Agents installed to ~/.claude/agents/"
echo "   Restart Claude Code to load agents."
