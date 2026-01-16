#!/bin/bash

#===============================================================================
# AI-SDLC - Setup Project Structure Only
#===============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "📂 Setting up AI-SDLC project structure..."
echo ""

# Create SDLC output directories
mkdir -p docs/sdlc/requirements
mkdir -p docs/sdlc/architecture
mkdir -p docs/sdlc/tracking

echo "   ✓ docs/sdlc/requirements/"
echo "   ✓ docs/sdlc/architecture/"
echo "   ✓ docs/sdlc/tracking/"

# Copy CLAUDE.md if not exists
if [ ! -f "CLAUDE.md" ]; then
    if [ -f "$SCRIPT_DIR/../project-template/CLAUDE.md" ]; then
        cp "$SCRIPT_DIR/../project-template/CLAUDE.md" ./CLAUDE.md
        echo "   ✓ CLAUDE.md created"
    fi
else
    echo "   ℹ CLAUDE.md already exists, skipping"
fi

echo ""
echo "✅ Project structure ready!"
echo ""
echo "Output locations:"
echo "   Requirements: docs/sdlc/requirements/"
echo "   Architecture: docs/sdlc/architecture/"
echo "   Tracking:     docs/sdlc/tracking/"
