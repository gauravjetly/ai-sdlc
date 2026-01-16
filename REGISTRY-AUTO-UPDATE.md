# Conductor Agent - Automatic Registry Integration

## What Was Changed

The conductor agent (`agents/conductor.md`) has been updated to **automatically register all SDLC workflows** in the central registry, ensuring they appear in the Control Center dashboard at `http://localhost:3030`.

---

## Changes Made

### 1. Added Bash Tool (Line 10)
```yaml
tools:
  - Read
  - Write
  - Task
  - Glob
  - Bash  # ← NEW: Required for registry commands
```

### 2. Added Critical Requirement Section (Lines 17-27)
A prominent warning at the top of the conductor instructions:

```markdown
## ⚠️ CRITICAL REQUIREMENT: Registry Integration

**YOU MUST** use the Bash tool to execute registry commands at every phase transition:
- Project Start: ~/.claude/sdlc-registry/sdlc-registry.sh create
- Before Each Phase: ~/.claude/sdlc-registry/sdlc-registry.sh start
- After Each Phase: ~/.claude/sdlc-registry/sdlc-registry.sh complete
- Project Complete: ~/.claude/sdlc-registry/sdlc-registry.sh finish
```

### 3. Updated Step 2: Create Tracking File (Lines 85-136)
Now includes **mandatory registry creation**:

```markdown
1. Create tracking file at docs/sdlc/tracking/SDLC-[ID].md
2. Register project in central registry using Bash tool:
   ~/.claude/sdlc-registry/sdlc-registry.sh create "SDLC-[ID]" "[Name]" "[Description]"
```

### 4. Updated Step 3: Execute Agent Sequence (Lines 138-172)
Now includes registry commands **before and after** each agent:

```markdown
Before Invoking Agent:
1. Log phase start: ~/.claude/sdlc-registry/sdlc-registry.sh start "SDLC-[ID]" "[agent]"

Invoke Agent:
2. Launch agent using Task tool

After Agent Completes:
3. Log completion: ~/.claude/sdlc-registry/sdlc-registry.sh complete "SDLC-[ID]" "[agent]" "[output]"
4. Update tracking file
5. Check for blockers
6. Proceed to next phase
```

### 5. Updated Step 4: Monitor and Handle Blockers (Lines 174-185)
Now includes registry blocking command:

```bash
If blocked:
~/.claude/sdlc-registry/sdlc-registry.sh block "SDLC-[ID]" "[agent]" "[reason]"
```

### 6. Updated Step 5: Report Completion (Lines 202-209)
Now includes final registry finish command:

```bash
Mark project complete:
~/.claude/sdlc-registry/sdlc-registry.sh finish "SDLC-[ID]"
```

### 7. Enhanced Registry Integration Section (Lines 417-458)
Complete reference guide with:
- Command reference table
- Agent name mapping
- Example workflow with all registry commands
- Explicit statement: **"These registry commands are NOT optional"**

---

## How It Works Now

### Before (Manual Registration Required)
```
User runs /sdlc-start
  → Conductor creates tracking file
  → Agents execute phases
  → Documentation created in docs/sdlc/
  ❌ Nothing appears in dashboard (registry not updated)
  → User must manually run registry commands
```

### After (Automatic Registration)
```
User runs /sdlc-start
  → Conductor creates tracking file
  → Conductor registers project: sdlc-registry create
  ✅ Project appears in dashboard immediately

  → Conductor starts BA phase: sdlc-registry start "SDLC-ID" "ba"
  ✅ Dashboard shows BA phase in progress
  → BA Agent completes
  → Conductor logs completion: sdlc-registry complete "SDLC-ID" "ba" "REQ-*.md"
  ✅ Dashboard shows BA phase complete

  [Repeat for all 7 phases]

  → Conductor finishes project: sdlc-registry finish "SDLC-ID"
  ✅ Dashboard shows project complete with all metrics
```

---

## Testing the Changes

### Test 1: New SDLC Workflow
```bash
# Open dashboard
open http://localhost:3030/

# Start a new workflow
/sdlc-start Build a simple calculator API

# Expected behavior:
# 1. Project appears in dashboard immediately after conductor creates it
# 2. Dashboard shows each phase transition in real-time
# 3. Activity log shows all agent actions
# 4. When complete, project marked as "Complete" with green checkmark
```

### Test 2: Verify Registry Updates
```bash
# Check registry stats
curl -s http://localhost:3030/api/registry | jq '.stats'

# Check projects list
curl -s http://localhost:3030/api/projects | jq '.[].name'

# Check activity log
curl -s http://localhost:3030/api/activity | jq '.[0:5]'
```

### Test 3: Multi-Project Tracking
```bash
# Terminal 1: Keep dashboard open
open http://localhost:3030/

# Terminal 2: Start workflow in project A
cd ~/project-a
/sdlc-start Feature A

# Terminal 3: Start workflow in project B
cd ~/project-b
/sdlc-start Feature B

# Dashboard should show BOTH projects
```

---

## Registry Location

**Global Registry** (tracks ALL projects across ALL directories):
```
~/.claude/sdlc-registry/
├── registry.json          # Stats and metadata
├── activity.log          # Chronological activity
└── projects/             # Per-project tracking
    ├── SDLC-20260115-001.json
    ├── SDLC-20260115-002.json
    └── ...
```

---

## Agent Name Mapping

| Agent | Registry Name | Phase |
|-------|---------------|-------|
| Conductor | `conductor` | Orchestration |
| BA Agent | `ba` | Requirements |
| Architect (Jets) | `jets` | Architecture |
| Software Engineer | `engineer` | Development |
| Security Agent | `security` | Security Review |
| QA Agent | `qa` | Testing |
| Atlas Agent | `atlas` | Deployment |
| Customer Agent | `customer` | Acceptance |
| Tracker Agent | `tracker` | Monitoring |

---

## Dashboard Views

### 📊 Dashboard Tab
- **Stats Cards**: Total, Completed, In Progress, Blocked
- **Agent Workflow**: Visual pipeline of all 9 agents
- **Recent Activity**: Last 5 agent actions

### 📁 Projects Tab
- **Project List**: All SDLC projects with status
- **Phase Progress**: Visual progress bars for each project
- **Phase Details**: Click project to see all phase information

### 🤖 Agents Tab
- **Agent Cards**: All 9 agents with stats
- **Invocation Counts**: How many times each agent was used
- **Average Duration**: Time metrics per agent

### 📝 Activity Tab
- **Complete Activity Log**: All agent actions chronologically
- **Filtered by Type**: Create, start, complete, blocked, approved
- **Timestamps**: When each action occurred

---

## Troubleshooting

### Dashboard Shows "No Projects"
**Cause**: Registry not initialized or no workflows started yet
**Solution**:
```bash
# Check registry exists
ls ~/.claude/sdlc-registry/

# Start a workflow
/sdlc-start Test project

# Refresh dashboard (auto-refreshes every 3 seconds)
```

### Project Created But Not In Dashboard
**Cause**: Conductor agent didn't execute registry commands (old version)
**Solution**:
```bash
# Manually register the project
~/.claude/sdlc-registry/sdlc-registry.sh create "SDLC-[ID]" "Project Name" "Description"

# For future workflows, ensure conductor.md has been updated (this file documents that update)
```

### Registry Script Not Found
**Cause**: Registry not installed or path incorrect
**Solution**:
```bash
# Check if registry script exists
ls -la ~/.claude/sdlc-registry/sdlc-registry.sh

# If missing, check installation
# Registry should be created during framework installation
```

### Dashboard Not Updating
**Cause**: Dashboard server not running or wrong port
**Solution**:
```bash
# Check if dashboard is running
lsof -i :3030

# If not running, start it
cd ~/aisdlc-2.1.0/dashboard
./start-dashboard.sh

# If running on different port, check PORT environment variable
echo $PORT
```

---

## Benefits

### For Users
✅ **No Manual Steps**: Projects automatically appear in dashboard
✅ **Real-Time Visibility**: See progress as it happens (3-second auto-refresh)
✅ **Cross-Project Tracking**: One dashboard for all projects
✅ **Historical Data**: Activity log and metrics across all workflows
✅ **Team Coordination**: Everyone sees the same live status

### For Agents
✅ **Centralized Tracking**: All activity logged to one place
✅ **Consistent Metrics**: Standardized invocation counting
✅ **Blocker Visibility**: Security/QA blocks immediately visible
✅ **Audit Trail**: Complete history of all phase transitions

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | 2026-01-15 | Initial framework release (manual registration) |
| 2.1.1 | 2026-01-16 | **Automatic registry integration added** |

---

## Related Files

- **Conductor Agent**: `/Users/gauravjetly/aisdlc-2.1.0/agents/conductor.md`
- **Registry Script**: `~/.claude/sdlc-registry/sdlc-registry.sh`
- **Registry Docs**: `/Users/gauravjetly/aisdlc-2.1.0/docs/Registry-System.md`
- **Dashboard**: `/Users/gauravjetly/aisdlc-2.1.0/dashboard/`
- **Dashboard URL**: `http://localhost:3030/`

---

## Next Steps

1. **Test the changes**: Run `/sdlc-start` with a new project
2. **Monitor dashboard**: Open `http://localhost:3030/` and watch real-time updates
3. **Verify registry**: Check `~/.claude/sdlc-registry/projects/` for new project files
4. **Validate activity**: View activity log in dashboard's Activity tab

---

**Update Status**: ✅ Complete
**Last Modified**: 2026-01-16
**Modified By**: Claude Sonnet 4.5 (User: gauravjetly)
