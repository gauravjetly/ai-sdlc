#!/bin/bash
# ============================================================
# Deploy Agent Mesh
#
# Installs the orchestrator and agent hooks into the runtime
# location (~/.claude/agent-mesh/) and verifies everything works.
#
# Usage: deploy-mesh.sh [--verify]
# ============================================================

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MESH_BASE="${HOME}/.claude/agent-mesh"
ORCHESTRATOR_DIR="${MESH_BASE}/orchestrator"

echo "============================================"
echo "  Agent Mesh Deployment"
echo "============================================"
echo ""

# Step 1: Ensure base directories
echo "[1/6] Creating directory structure..."
mkdir -p "${MESH_BASE}/registry"
mkdir -p "${MESH_BASE}/bus/processed"
mkdir -p "${MESH_BASE}/bus/failed"
mkdir -p "${MESH_BASE}/bus/log"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/cross-agent-learning"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/error-pattern"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/best-practice"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/anti-pattern"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/architecture-decision"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/security-insight"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/performance-insight"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/process-improvement"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/conflict-resolution"
mkdir -p "${MESH_BASE}/collective-memory/knowledge/integration-pattern"
mkdir -p "${MESH_BASE}/learning/events"
mkdir -p "${MESH_BASE}/learning/patterns"
mkdir -p "${MESH_BASE}/conflicts"
mkdir -p "${MESH_BASE}/audit/$(date -u +%Y-%m-%d)"
mkdir -p "${ORCHESTRATOR_DIR}"
mkdir -p "${ORCHESTRATOR_DIR}/processed"
mkdir -p "${ORCHESTRATOR_DIR}/dead-letter"

AGENTS=("conductor" "ba" "jets" "ux" "engineer" "security" "qa" "atlas" "customer" "ask-tom" "tracker" "finops")
for agent in "${AGENTS[@]}"; do
  mkdir -p "${MESH_BASE}/bus/inboxes/${agent}"
  mkdir -p "${MESH_BASE}/bus/outboxes/${agent}"
done

echo "  Done: Created all directories"

# Step 2: Deploy orchestrator
echo "[2/6] Deploying orchestrator..."
cp "${SRC_DIR}/mesh-orchestrator.sh" "${ORCHESTRATOR_DIR}/mesh-orchestrator.sh"
chmod +x "${ORCHESTRATOR_DIR}/mesh-orchestrator.sh"
echo "  Done: Deployed mesh-orchestrator.sh"

# Step 3: Deploy agent hooks
echo "[3/6] Deploying agent hooks..."
cp "${SRC_DIR}/agent-hooks.sh" "${MESH_BASE}/agent-hooks.sh"
chmod +x "${MESH_BASE}/agent-hooks.sh"
echo "  Done: Deployed agent-hooks.sh"

# Step 4: Ensure mesh-cli.sh is present
echo "[4/6] Checking mesh-cli.sh..."
if [ -f "${MESH_BASE}/mesh-cli.sh" ]; then
  echo "  Done: mesh-cli.sh already present"
else
  echo "  WARNING: mesh-cli.sh not found at ${MESH_BASE}/mesh-cli.sh"
  echo "  Copy it manually or run the mesh init"
fi

# Step 5: Initialize agent registry if needed
echo "[5/6] Checking agent registry..."
if [ ! -f "${MESH_BASE}/registry/agents.json" ]; then
  cat > "${MESH_BASE}/registry/agents.json" << 'REGISTRY_EOF'
[
  {"id":"conductor","name":"Conductor","status":"available","capabilities":["orchestration"],"description":"Orchestrates the SDLC workflow"},
  {"id":"ba","name":"BA Agent","status":"available","capabilities":["requirements"],"description":"Business Analysis and Requirements"},
  {"id":"jets","name":"Architect Jets","status":"available","capabilities":["architecture"],"description":"Architecture design and decisions"},
  {"id":"ux","name":"UX Agent","status":"available","capabilities":["ux-design"],"description":"User experience and UI design"},
  {"id":"engineer","name":"Software Engineer","status":"available","capabilities":["implementation"],"description":"Code implementation"},
  {"id":"security","name":"Security Agent","status":"available","capabilities":["security-review"],"description":"Security review and scanning"},
  {"id":"qa","name":"QA Agent","status":"available","capabilities":["testing"],"description":"Quality assurance and testing"},
  {"id":"atlas","name":"Atlas Agent","status":"available","capabilities":["deployment"],"description":"DevOps and deployment"},
  {"id":"customer","name":"Customer Agent","status":"available","capabilities":["acceptance"],"description":"Customer acceptance testing"},
  {"id":"ask-tom","name":"Ask Tom","status":"available","capabilities":["problem-solving"],"description":"Elite problem solver"},
  {"id":"tracker","name":"Tracker Agent","status":"available","capabilities":["tracking"],"description":"Project tracking and metrics"},
  {"id":"finops","name":"FinOps Agent","status":"available","capabilities":["cost-analysis"],"description":"Cost analysis and optimization"}
]
REGISTRY_EOF
  echo "  Done: Created agent registry with 12 agents"
else
  echo "  Done: Agent registry already exists"
fi

# Step 6: Verify deployment
echo "[6/6] Verifying deployment..."
local_errors=0

for required in \
  "${ORCHESTRATOR_DIR}/mesh-orchestrator.sh" \
  "${MESH_BASE}/agent-hooks.sh" \
  "${MESH_BASE}/mesh-cli.sh" \
  "${MESH_BASE}/registry/agents.json"; do

  if [ -f "$required" ]; then
    echo "  OK: $(basename "$required")"
  else
    echo "  MISSING: $required"
    local_errors=$((local_errors + 1))
  fi
done

# Test mesh-cli
echo ""
echo "  Testing mesh-cli.sh init..."
"${MESH_BASE}/mesh-cli.sh" init 2>/dev/null || true

echo ""
if [ "$local_errors" -eq 0 ]; then
  echo "============================================"
  echo "  Deployment successful!"
  echo "============================================"
  echo ""
  echo "Quick Start:"
  echo "  # Start orchestrator (background daemon)"
  echo "  ${ORCHESTRATOR_DIR}/mesh-orchestrator.sh start"
  echo ""
  echo "  # Check status"
  echo "  ${ORCHESTRATOR_DIR}/mesh-orchestrator.sh status"
  echo ""
  echo "  # View dashboard"
  echo "  ${ORCHESTRATOR_DIR}/mesh-orchestrator.sh dashboard"
  echo ""
  echo "  # Agent hooks (use in agent scripts)"
  echo "  source ${MESH_BASE}/agent-hooks.sh"
  echo "  mesh_agent_start engineer SDLC-20260217-001"
  echo ""
  echo "  # Send message"
  echo "  ${MESH_BASE}/mesh-cli.sh send --from engineer --to security --subject 'Review needed'"
  echo ""
  echo "  # Report learning"
  echo "  ${MESH_BASE}/mesh-cli.sh learn --agent security --title 'JWT Best Practice' --description 'Always use RS256'"
  echo ""
else
  echo "============================================"
  echo "  Deployment completed with ${local_errors} errors"
  echo "============================================"
fi
