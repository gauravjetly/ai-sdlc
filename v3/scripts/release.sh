#!/bin/bash

#===============================================================================
# AI-SDLC Release Builder
# Build and package new releases with automatic version management
#===============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Get current version from manifest
get_version() {
    python3 -c "
import json
with open('$ROOT_DIR/manifest.json') as f:
    print(json.load(f)['version'])
"
}

# Set new version in all files
set_version() {
    local new_version="$1"
    
    # Update manifest.json
    python3 << PYTHON
import json
from datetime import date

with open('$ROOT_DIR/manifest.json', 'r') as f:
    m = json.load(f)

m['version'] = '$new_version'
m['releaseDate'] = str(date.today())

with open('$ROOT_DIR/manifest.json', 'w') as f:
    json.dump(m, f, indent=2)
PYTHON

    # Update VERSION file
    echo "$new_version" > "$ROOT_DIR/VERSION"
    
    # Update install.sh header
    sed -i "s/Installation Script v[0-9.]*/Installation Script v$new_version/" "$ROOT_DIR/install.sh" 2>/dev/null || true
    sed -i "s/Framework v[0-9.]* -/Framework v$new_version -/" "$ROOT_DIR/install.sh" 2>/dev/null || true
    
    echo -e "${GREEN}✓${NC} Version updated to $new_version"
}

# Add deprecated file to manifest
add_deprecation() {
    local type="$1"      # agents, commands, scripts
    local file="$2"
    local replaced_by="$3"
    local reason="$4"
    local version=$(get_version)
    
    python3 << PYTHON
import json

with open('$ROOT_DIR/manifest.json', 'r') as f:
    m = json.load(f)

m['$type']['deprecated'].append({
    'file': '$file',
    'replacedBy': '$replaced_by',
    'version': '$version',
    'reason': '$reason'
})

with open('$ROOT_DIR/manifest.json', 'w') as f:
    json.dump(m, f, indent=2)
PYTHON

    echo -e "${GREEN}✓${NC} Added deprecation: $file → $replaced_by"
}

# Build release package
build_release() {
    local version=$(get_version)
    local pkg_name="aisdlc-$version"
    local output_dir="${1:-$(pwd)}"
    
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         Building AI-SDLC Release v$version                      ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Create temp build directory
    local build_dir=$(mktemp -d)
    local pkg_dir="$build_dir/$pkg_name"
    
    echo -e "${YELLOW}📦 Packaging...${NC}"
    
    # Copy all files
    mkdir -p "$pkg_dir"
    cp -r "$ROOT_DIR/agents" "$pkg_dir/"
    cp -r "$ROOT_DIR/commands" "$pkg_dir/"
    cp -r "$ROOT_DIR/scripts" "$pkg_dir/"
    cp -r "$ROOT_DIR/docs" "$pkg_dir/"
    cp -r "$ROOT_DIR/dashboard" "$pkg_dir/"
    cp -r "$ROOT_DIR/project-template" "$pkg_dir/"
    cp "$ROOT_DIR/install.sh" "$pkg_dir/"
    cp "$ROOT_DIR/manifest.json" "$pkg_dir/"
    cp "$ROOT_DIR/VERSION" "$pkg_dir/"
    cp "$ROOT_DIR/README.md" "$pkg_dir/"
    cp "$ROOT_DIR/CHANGELOG.md" "$pkg_dir/"
    
    # Make scripts executable
    chmod +x "$pkg_dir/install.sh"
    chmod +x "$pkg_dir/scripts/"*.sh
    
    # Create zip
    cd "$build_dir"
    zip -r "$pkg_name.zip" "$pkg_name/"
    
    # Move to output
    mv "$pkg_name.zip" "$output_dir/"
    
    # Cleanup
    rm -rf "$build_dir"
    
    echo ""
    echo -e "${GREEN}✅ Release built: $output_dir/$pkg_name.zip${NC}"
    echo ""
}

# Show what's in manifest
show_manifest() {
    echo ""
    echo -e "${BLUE}Current Manifest:${NC}"
    echo ""
    
    python3 << 'PYTHON'
import json

with open('$ROOT_DIR/manifest.json') as f:
    m = json.load(f)

print(f"  Version: {m['version']}")
print(f"  Release: {m['releaseDate']}")
print(f"")
print(f"  Agents ({len(m['agents']['current'])}):")
for a in m['agents']['current']:
    print(f"    - {a}")
print(f"")
print(f"  Deprecated ({len(m['agents']['deprecated'])}):")
for d in m['agents']['deprecated']:
    print(f"    - {d['file']} → {d['replacedBy']} (v{d['version']})")
print(f"")
print(f"  Commands ({len(m['commands']['current'])}):")
for c in m['commands']['current']:
    print(f"    - {c}")
PYTHON
    echo ""
}

# Interactive release wizard
release_wizard() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              AI-SDLC Release Wizard                          ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    local current=$(get_version)
    echo -e "Current version: ${YELLOW}$current${NC}"
    echo ""
    
    # Parse current version
    IFS='.' read -r major minor patch <<< "$current"
    
    echo "Select release type:"
    echo "  1) Patch  ($major.$minor.$((patch + 1))) - Bug fixes"
    echo "  2) Minor  ($major.$((minor + 1)).0) - New features"
    echo "  3) Major  ($((major + 1)).0.0) - Breaking changes"
    echo "  4) Custom version"
    echo ""
    read -p "Choice [1-4]: " choice
    
    case $choice in
        1) new_version="$major.$minor.$((patch + 1))" ;;
        2) new_version="$major.$((minor + 1)).0" ;;
        3) new_version="$((major + 1)).0.0" ;;
        4) read -p "Enter version: " new_version ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
    
    echo ""
    echo -e "New version will be: ${GREEN}$new_version${NC}"
    read -p "Continue? [Y/n]: " confirm
    
    if [[ ! "$confirm" =~ ^[Nn]$ ]]; then
        set_version "$new_version"
        
        echo ""
        read -p "Add any deprecations? [y/N]: " add_dep
        
        if [[ "$add_dep" =~ ^[Yy]$ ]]; then
            while true; do
                echo ""
                echo "Deprecation type:"
                echo "  1) Agent"
                echo "  2) Command"
                echo "  3) Script"
                echo "  4) Done"
                read -p "Choice: " dep_type
                
                case $dep_type in
                    1) type="agents" ;;
                    2) type="commands" ;;
                    3) type="scripts" ;;
                    4) break ;;
                    *) continue ;;
                esac
                
                read -p "File to deprecate: " dep_file
                read -p "Replaced by: " dep_replaced
                read -p "Reason: " dep_reason
                
                add_deprecation "$type" "$dep_file" "$dep_replaced" "$dep_reason"
            done
        fi
        
        echo ""
        read -p "Build release package now? [Y/n]: " build_now
        
        if [[ ! "$build_now" =~ ^[Nn]$ ]]; then
            read -p "Output directory [.]: " output_dir
            output_dir="${output_dir:-.}"
            build_release "$output_dir"
        fi
    fi
}

# Main
case "${1:-}" in
    version)
        echo $(get_version)
        ;;
    set-version)
        if [ -z "$2" ]; then
            echo "Usage: release.sh set-version X.Y.Z"
            exit 1
        fi
        set_version "$2"
        ;;
    deprecate)
        if [ -z "$4" ]; then
            echo "Usage: release.sh deprecate <type> <file> <replacement> <reason>"
            echo "  type: agents, commands, scripts"
            exit 1
        fi
        add_deprecation "$2" "$3" "$4" "$5"
        ;;
    build)
        build_release "${2:-.}"
        ;;
    manifest)
        show_manifest
        ;;
    wizard|"")
        release_wizard
        ;;
    help|--help|-h)
        echo ""
        echo "AI-SDLC Release Builder"
        echo ""
        echo "Usage: release.sh <command> [options]"
        echo ""
        echo "Commands:"
        echo "  wizard              Interactive release wizard (default)"
        echo "  version             Show current version"
        echo "  set-version X.Y.Z   Set new version"
        echo "  deprecate           Add deprecated file"
        echo "  build [dir]         Build release package"
        echo "  manifest            Show manifest contents"
        echo ""
        echo "Examples:"
        echo "  ./release.sh wizard"
        echo "  ./release.sh set-version 2.2.0"
        echo "  ./release.sh deprecate agents old.md new.md 'Renamed'"
        echo "  ./release.sh build ~/releases/"
        echo ""
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run './release.sh help' for usage"
        exit 1
        ;;
esac
