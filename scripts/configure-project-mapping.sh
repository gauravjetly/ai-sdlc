#!/bin/bash

# Configure Project Mapping Helper Script
# Maps SDLC projects to their main projects (e.g., Claude-Admin)

set -e

REGISTRY_DIR="$HOME/.claude/sdlc-registry"
PROJECTS_DIR="$REGISTRY_DIR/projects"
MAPPING_FILE="$REGISTRY_DIR/project-mapping.json"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== AI-SDLC Project Mapping Configuration ===${NC}\n"

# Function to list all projects
list_projects() {
    echo -e "${GREEN}Available Projects:${NC}"
    echo ""
    local i=1
    for file in "$PROJECTS_DIR"/*.json; do
        if [ -f "$file" ]; then
            local id=$(jq -r '.id' "$file")
            local desc=$(jq -r '.description // .name // .id' "$file")
            local mainProj=$(jq -r '.mainProject // "Not Set"' "$file")
            printf "  ${YELLOW}%2d${NC}. %s\n" "$i" "$id"
            printf "      Description: %s\n" "$desc"
            printf "      Main Project: %s\n\n" "$mainProj"
            ((i++))
        fi
    done
}

# Function to show project mappings
show_mappings() {
    if [ ! -f "$MAPPING_FILE" ]; then
        echo -e "${RED}No project mappings file found.${NC}"
        return
    fi

    echo -e "${GREEN}Registered Main Projects:${NC}\n"
    jq -r 'to_entries[] | "  • \(.value.name)\n    Repo: \(.value.repository)\n    Key: \(.key)\n"' "$MAPPING_FILE"
}

# Function to configure a project
configure_project() {
    local project_id="$1"
    local main_project="$2"
    local main_repo="$3"
    local feature_name="$4"

    local project_file="$PROJECTS_DIR/$project_id.json"

    if [ ! -f "$project_file" ]; then
        echo -e "${RED}Error: Project $project_id not found${NC}"
        return 1
    fi

    echo -e "${BLUE}Configuring $project_id...${NC}"

    # Create backup
    cp "$project_file" "$project_file.backup"

    # Update project file
    jq --arg mp "$main_project" \
       --arg mr "$main_repo" \
       --arg fn "$feature_name" \
       '. + {mainProject: $mp, mainProjectRepo: $mr, featureName: $fn}' \
       "$project_file" > "$project_file.tmp"

    mv "$project_file.tmp" "$project_file"

    echo -e "${GREEN}✓ Project configured successfully${NC}"
    echo -e "  Main Project: $main_project"
    echo -e "  Repository: $main_repo"
    echo -e "  Feature: $feature_name"
    echo ""
}

# Function to bulk configure projects for a main project
bulk_configure() {
    local main_project_key="$1"

    if [ ! -f "$MAPPING_FILE" ]; then
        echo -e "${RED}Error: Project mapping file not found${NC}"
        return 1
    fi

    local main_name=$(jq -r --arg key "$main_project_key" '.[$key].name // empty' "$MAPPING_FILE")
    local main_repo=$(jq -r --arg key "$main_project_key" '.[$key].repository // empty' "$MAPPING_FILE")

    if [ -z "$main_name" ]; then
        echo -e "${RED}Error: Main project '$main_project_key' not found in mappings${NC}"
        return 1
    fi

    echo -e "${BLUE}Searching for projects to link to: $main_name${NC}\n"

    local count=0
    for file in "$PROJECTS_DIR"/*.json; do
        if [ -f "$file" ]; then
            local id=$(jq -r '.id' "$file")
            local desc=$(jq -r '.description // .name' "$file")
            local current_main=$(jq -r '.mainProject // empty' "$file")

            # Skip if already configured
            if [ -n "$current_main" ]; then
                continue
            fi

            # Check if description mentions the main project
            if echo "$desc" | grep -qi "$main_project_key\|$main_name"; then
                echo -e "${YELLOW}Found:${NC} $id"
                echo -e "  Description: $desc"
                read -p "  Link to $main_name? (y/n): " confirm

                if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                    configure_project "$id" "$main_name" "$main_repo" "$desc"
                    ((count++))
                fi
                echo ""
            fi
        fi
    done

    echo -e "${GREEN}Configured $count projects${NC}"
}

# Function to add new main project mapping
add_mapping() {
    echo -e "${BLUE}Add New Main Project Mapping${NC}\n"

    read -p "Project key (e.g., 'claude-admin'): " key
    read -p "Project name (e.g., 'Claude Admin'): " name
    read -p "GitHub repository URL: " repo
    read -p "Description: " description

    if [ ! -f "$MAPPING_FILE" ]; then
        echo "{}" > "$MAPPING_FILE"
    fi

    jq --arg k "$key" \
       --arg n "$name" \
       --arg r "$repo" \
       --arg d "$description" \
       '.[$k] = {name: $n, repository: $r, description: $d}' \
       "$MAPPING_FILE" > "$MAPPING_FILE.tmp"

    mv "$MAPPING_FILE.tmp" "$MAPPING_FILE"

    echo -e "\n${GREEN}✓ Main project mapping added${NC}"
}

# Interactive mode
interactive_mode() {
    while true; do
        echo -e "\n${BLUE}=== Project Mapping Menu ===${NC}\n"
        echo "  1. List all projects"
        echo "  2. Show main project mappings"
        echo "  3. Configure a single project"
        echo "  4. Bulk configure projects"
        echo "  5. Add new main project mapping"
        echo "  6. Exit"
        echo ""
        read -p "Select option: " choice

        case $choice in
            1)
                list_projects
                ;;
            2)
                show_mappings
                ;;
            3)
                read -p "Enter project ID: " pid
                read -p "Enter main project name: " mp
                read -p "Enter main project repo URL: " mr
                read -p "Enter feature name: " fn
                configure_project "$pid" "$mp" "$mr" "$fn"
                ;;
            4)
                show_mappings
                read -p "Enter main project key: " key
                bulk_configure "$key"
                ;;
            5)
                add_mapping
                ;;
            6)
                echo -e "${GREEN}Done!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option${NC}"
                ;;
        esac
    done
}

# Main
if [ "$1" = "--list" ] || [ "$1" = "-l" ]; then
    list_projects
elif [ "$1" = "--mappings" ] || [ "$1" = "-m" ]; then
    show_mappings
elif [ "$1" = "--configure" ] || [ "$1" = "-c" ]; then
    if [ $# -lt 5 ]; then
        echo "Usage: $0 --configure <project-id> <main-project> <main-repo> <feature-name>"
        exit 1
    fi
    configure_project "$2" "$3" "$4" "$5"
elif [ "$1" = "--bulk" ] || [ "$1" = "-b" ]; then
    if [ $# -lt 2 ]; then
        echo "Usage: $0 --bulk <main-project-key>"
        exit 1
    fi
    bulk_configure "$2"
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AI-SDLC Project Mapping Configuration Tool"
    echo ""
    echo "Usage:"
    echo "  $0                           # Interactive mode"
    echo "  $0 --list                    # List all projects"
    echo "  $0 --mappings                # Show main project mappings"
    echo "  $0 --configure <id> <main> <repo> <feature>"
    echo "  $0 --bulk <main-project-key> # Bulk configure projects"
    echo "  $0 --help                    # Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 --configure SDLC-20260126-1507 'Claude Admin' 'https://github.com/org/claude-admin' 'Add OAuth'"
    echo "  $0 --bulk claude-admin"
else
    interactive_mode
fi
