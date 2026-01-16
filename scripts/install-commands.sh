#!/bin/bash

#===============================================================================
# AI-SDLC - Install Commands Only
#===============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "⚡ Installing AI-SDLC Commands..."
echo ""

mkdir -p ~/.claude/commands

for cmd in "$SCRIPT_DIR/../commands/"*.md; do
    if [ -f "$cmd" ]; then
        filename=$(basename "$cmd")
        cp "$cmd" ~/.claude/commands/
        echo "   ✓ $filename"
    fi
done

echo ""
echo "✅ Commands installed to ~/.claude/commands/"
echo "   Restart Claude Code to load commands."
