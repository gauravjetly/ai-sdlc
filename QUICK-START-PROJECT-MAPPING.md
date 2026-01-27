# Quick Start: Project Mapping Configuration

**What Is This?** Map your SDLC projects to show which main project they belong to (e.g., Claude-Admin).

**Result**: Dashboard shows: **Main Project → Feature Being Added → AI-SDLC Workflow**

---

## 🚀 Quick Start (3 Steps)

### Step 1: View Current State

```bash
# Open dashboard
open http://localhost:3030

# Click any project
# You'll see either:
# - "🏢 Main Project → ✨ Feature" (if detected)
# - "🚀 Standalone Project" (if not detected)
```

### Step 2: Configure Your Projects

**Option A: Interactive Mode (Recommended)**
```bash
cd ~/aisdlc-2.1.0
./scripts/configure-project-mapping.sh

# Follow the menu:
# 1. List all projects - See what needs configuration
# 2. Show mappings - See registered main projects
# 3. Configure single - Set up one project
# 4. Bulk configure - Set up multiple projects
# 5. Add mapping - Register a new main project
```

**Option B: Command Line**
```bash
# Configure a single project
./scripts/configure-project-mapping.sh --configure \
  SDLC-20260126-1507 \
  "Claude Admin" \
  "https://github.com/DLTKEngineering/claude-admin" \
  "Add OAuth Authentication"

# Bulk configure all projects mentioning "claude-admin"
./scripts/configure-project-mapping.sh --bulk claude-admin
```

**Option C: Manual Edit**
```bash
# Edit project JSON directly
vim ~/.claude/sdlc-registry/projects/SDLC-20260126-1507.json

# Add these fields:
{
  "id": "SDLC-20260126-1507",
  "mainProject": "Claude Admin",                           # ← ADD
  "mainProjectRepo": "https://github.com/org/claude-admin", # ← ADD
  "featureName": "Add OAuth Authentication",                # ← ADD
  "description": "...",
  "phases": [...]
}
```

### Step 3: See Results

```bash
# Dashboard will auto-update
# Refresh browser if needed
# Click project to see new hierarchy view
```

---

## 📋 Common Scenarios

### Scenario 1: Adding Features to Existing Project

**You Have**: Claude-Admin project on GitHub
**You Want**: AI-SDLC to add OAuth, payment integration, etc.

**Setup**:
```bash
# 1. Register main project
cat > ~/.claude/sdlc-registry/project-mapping.json <<EOF
{
  "claude-admin": {
    "name": "Claude Admin",
    "repository": "https://github.com/org/claude-admin",
    "description": "Administrative dashboard for Claude AI"
  }
}
EOF

# 2. Configure projects
./scripts/configure-project-mapping.sh --bulk claude-admin

# 3. View dashboard
# Now shows: Claude Admin → Add OAuth → 7 agents worked
```

### Scenario 2: Building Standalone Projects

**You Have**: New projects built from scratch
**What Happens**: Dashboard automatically shows as "Standalone AI-SDLC Project"
**No Configuration Needed**: System detects no main project reference

### Scenario 3: Multiple Main Projects

**You Have**: Claude-Admin, AI-SDLC, Customer Portal
**Setup**:
```bash
# Edit mapping file
vim ~/.claude/sdlc-registry/project-mapping.json

# Add all main projects:
{
  "claude-admin": {
    "name": "Claude Admin",
    "repository": "https://github.com/org/claude-admin"
  },
  "aisdlc": {
    "name": "AI-SDLC Framework",
    "repository": "https://github.com/org/aisdlc"
  },
  "customer-portal": {
    "name": "Customer Portal",
    "repository": "https://github.com/org/customer-portal"
  }
}

# Configure projects for each:
./scripts/configure-project-mapping.sh --bulk claude-admin
./scripts/configure-project-mapping.sh --bulk aisdlc
./scripts/configure-project-mapping.sh --bulk customer-portal
```

---

## 🎨 What You'll See

### Before Configuration
```
┌─────────────────────────────────────┐
│ 🚀 Standalone AI-SDLC Project      │
│ Add OAuth Authentication            │
│ 📅 Jan 26  ⏱️ 45min  👥 7 agents  │
└─────────────────────────────────────┘
```

### After Configuration
```
┌──────────────────────────────────────────┐
│ 🏢 MAIN PROJECT                          │
│ Claude Admin     [📦 View GitHub Repo]  │
│ Using AI-SDLC to add features            │
└──────────────────────────────────────────┘
                   ↓ AI-SDLC Adds
┌──────────────────────────────────────────┐
│ ✨ FEATURE BEING ADDED                   │
│ Add OAuth Authentication                 │
│ 📅 Jan 26  ⏱️ 45min  👥 7 agents  💰 $2.47│
└──────────────────────────────────────────┘
```

**Benefits**:
- ✅ Click GitHub button to go to main project repo
- ✅ Clear this is adding a feature, not a new project
- ✅ See full context: Main Project → Feature → Agents

---

## 🔧 Configuration Commands Reference

### List All Projects
```bash
./scripts/configure-project-mapping.sh --list
```
Shows all SDLC projects with their current main project mapping status.

### Show Main Project Mappings
```bash
./scripts/configure-project-mapping.sh --mappings
```
Shows all registered main projects.

### Configure Single Project
```bash
./scripts/configure-project-mapping.sh --configure \
  <project-id> \
  <main-project-name> \
  <github-repo-url> \
  <feature-description>

# Example:
./scripts/configure-project-mapping.sh --configure \
  SDLC-20260126-1507 \
  "Claude Admin" \
  "https://github.com/org/claude-admin" \
  "Add OAuth Authentication"
```

### Bulk Configure
```bash
./scripts/configure-project-mapping.sh --bulk <main-project-key>

# Example: Configure all projects mentioning "claude-admin"
./scripts/configure-project-mapping.sh --bulk claude-admin
```

### Interactive Mode
```bash
./scripts/configure-project-mapping.sh

# Provides menu with options:
# 1. List all projects
# 2. Show main project mappings
# 3. Configure a single project
# 4. Bulk configure projects
# 5. Add new main project mapping
# 6. Exit
```

---

## 📝 Auto-Detection

The system automatically tries to detect main projects from:

1. **GitHub URLs in Documentation**
   - Searches README, architecture, deployment docs
   - Extracts repo name: `github.com/org/project-name` → "Project Name"

2. **Description Patterns**
   - "Add X to Y project" → Main Project: Y
   - "Enhance Z with..." → Main Project: Z
   - "Fix Y application" → Main Project: Y

3. **File Paths**
   - `src/claude-admin/...` → Main Project: "Claude Admin"
   - `apps/customer-portal/...` → Main Project: "Customer Portal"

**When Auto-Detection Works**: No configuration needed!

**When It Doesn't**: Use configuration tool to set explicitly.

---

## 🎯 Best Practices

### 1. Register Main Projects First
Before running SDLC workflows, register your main projects:

```bash
# Create/edit mapping file
vim ~/.claude/sdlc-registry/project-mapping.json

# Add your projects
{
  "your-project": {
    "name": "Your Project Name",
    "repository": "https://github.com/org/your-project",
    "description": "Brief description"
  }
}
```

### 2. Use Consistent Naming
In SDLC descriptions, mention the main project:
- ✅ "Add OAuth to Claude-Admin"
- ✅ "Enhance Claude-Admin with payment integration"
- ❌ "Add OAuth" (no project mentioned)

### 3. Include GitHub URLs in Docs
Add GitHub repo link to your:
- README files
- Architecture documents
- Deployment documentation

System will auto-detect and link!

### 4. Bulk Configure Periodically
```bash
# Run monthly or after several SDLC runs
./scripts/configure-project-mapping.sh --bulk <project-key>
```

---

## 🐛 Troubleshooting

### Issue: Project not showing as feature addition

**Check 1**: Does project have mainProject fields?
```bash
jq '.mainProject, .mainProjectRepo, .featureName' \
  ~/.claude/sdlc-registry/projects/SDLC-20260126-1507.json
```

**Fix**: Configure manually
```bash
./scripts/configure-project-mapping.sh --configure \
  <project-id> <main-project> <repo-url> <feature-name>
```

### Issue: Wrong main project detected

**Cause**: Auto-detection found wrong project name

**Fix**: Override with explicit configuration
```bash
# Edit project JSON
vim ~/.claude/sdlc-registry/projects/<project-id>.json

# Set correct values:
{
  "mainProject": "Correct Project Name",
  "mainProjectRepo": "https://github.com/org/correct-repo",
  ...
}
```

### Issue: GitHub button not showing

**Cause**: No repository URL configured

**Fix**: Add mainProjectRepo
```bash
# Via CLI
./scripts/configure-project-mapping.sh --configure \
  <project-id> \
  "Main Project" \
  "https://github.com/org/repo" \  # ← Make sure this is set
  "Feature Name"
```

### Issue: Changes not showing in dashboard

**Cause**: Browser cache

**Fix**: Hard refresh
```bash
# Browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
# Or restart dashboard:
pkill -f "node server.js"
cd ~/aisdlc-2.1.0/dashboard && node server.js &
```

---

## 📚 File Locations

| File | Location | Purpose |
|------|----------|---------|
| **Project Files** | `~/.claude/sdlc-registry/projects/*.json` | SDLC project data |
| **Mapping Registry** | `~/.claude/sdlc-registry/project-mapping.json` | Main project definitions |
| **Configuration Script** | `~/aisdlc-2.1.0/scripts/configure-project-mapping.sh` | CLI tool |
| **Dashboard** | `http://localhost:3030` | View results |

---

## 🎉 You're Done!

Your dashboard now shows the complete end-to-end view:

**Main Project (GitHub Repo)** → **Feature Being Added** → **AI-SDLC Agents Worked**

**Next**: Configure your projects and enjoy the clear hierarchy! 🚀
