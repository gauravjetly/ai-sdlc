# Update: End-to-End Project Mapping

**Issue**: Dashboard shows each SDLC run as a standalone project, but actually it's adding features to an existing main project (e.g., Claude-Admin).

**Solution**: Show the complete hierarchy: **Main Project** → **Feature Being Added** → **AI-SDLC Workflow**

---

## 🎯 What Changed

### Backend (server.js)

Added logic to extract and return main project context:

```javascript
// New fields in API response:
{
  mainProject: {
    name: "Claude Admin",  // Extracted from GitHub repo or description
    repository: "https://github.com/org/claude-admin",  // Main project repo
    featureName: "Add OAuth Authentication",  // What feature is being added
    isFeatureAddition: true  // true if adding to existing project
  },
  // ... rest of response
}
```

**Extraction Logic**:
1. **From GitHub URL**: Parses repo name from `github.com/org/project-name`
2. **From Description**: Looks for patterns like "Add X to Y project" or "Enhance Y"
3. **From Outputs**: Analyzes file paths like `src/claude-admin/`
4. **Explicit Config**: Supports `mainProject`, `mainProjectRepo`, `featureName` fields in project JSON

### Frontend (index.html)

**Overview Tab - New Hierarchy Display**:

When `mainProject.isFeatureAddition = true`:
```
┌─────────────────────────────────────────────┐
│ MAIN PROJECT                                │
│ Claude Admin                   [📦 GitHub]  │
│ Using AI-SDLC to add features               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ FEATURE BEING ADDED VIA AI-SDLC             │
│ Add OAuth Authentication                    │
│ 📅 Jan 26  ⏱️ 45min  👥 7 agents  💰 $2.47 │
└─────────────────────────────────────────────┘
```

When standalone project:
```
┌─────────────────────────────────────────────┐
│ STANDALONE AI-SDLC PROJECT                  │
│ Build New Microservice                      │
│ 📅 Jan 26  ⏱️ 45min  👥 7 agents  💰 $2.47 │
└─────────────────────────────────────────────┘
```

---

## 📊 How It Works

### Example 1: Feature Addition

**Project JSON**:
```json
{
  "id": "SDLC-20260126-1507",
  "description": "Add OAuth authentication to Claude-Admin",
  "phases": [...],
  // GitHub repo found in docs: https://github.com/org/claude-admin
}
```

**Dashboard Shows**:
```
Main Project: Claude Admin
├─ GitHub: https://github.com/org/claude-admin
└─ Feature: Add OAuth authentication
   ├─ 7 agents worked on this
   ├─ Duration: 45 minutes
   ├─ Cost: $2.47
   └─ Agents: BA → Jets → Engineer → Security → QA → Atlas → Customer
```

### Example 2: Standalone Project

**Project JSON**:
```json
{
  "id": "SDLC-20260126-1630",
  "description": "RAG Memory System",
  "phases": [...]
  // No GitHub repo or project reference
}
```

**Dashboard Shows**:
```
Standalone Project: RAG Memory System
├─ Created from scratch by AI-SDLC
├─ 5 agents worked on this
├─ Duration: 32 minutes
└─ Cost: $1.85
```

---

## 🔧 Configuration Options

### Option 1: Auto-Detection (Current)

System automatically detects main project from:
- GitHub URLs in documentation
- Description patterns
- File paths

### Option 2: Explicit Configuration

Add fields to project JSON:

```json
{
  "id": "SDLC-20260126-1507",
  "mainProject": "Claude Admin",
  "mainProjectRepo": "https://github.com/org/claude-admin",
  "featureName": "Add OAuth Authentication",
  "description": "RAG-enabled memory system using ChromaDB",
  "phases": [...]
}
```

### Option 3: Registry File

Create `~/.claude/sdlc-registry/project-mapping.json`:

```json
{
  "claude-admin": {
    "name": "Claude Admin",
    "repository": "https://github.com/org/claude-admin",
    "description": "Administrative dashboard for Claude AI"
  },
  "ai-sdlc": {
    "name": "AI-SDLC Framework",
    "repository": "https://github.com/org/aisdlc",
    "description": "Agentic software development lifecycle framework"
  }
}
```

Then projects reference it:
```json
{
  "id": "SDLC-20260126-1507",
  "mainProjectKey": "claude-admin",
  "featureName": "Add OAuth",
  ...
}
```

---

## 🎯 Benefits

### Before
```
Project: RAG Memory System
- Not clear if this is standalone or part of larger project
- Can't see which main project it belongs to
- GitHub link might be for feature branch, not main project
```

### After
```
Main Project: Claude Admin (https://github.com/org/claude-admin)
└─ Feature: Add OAuth Authentication
   └─ SDLC Workflow: 7 agents collaborated
      └─ Result: Feature ready to merge into main project
```

**Clarity**: ✅ Clear this is adding a feature to existing project
**Context**: ✅ See the main project and GitHub repo
**Tracking**: ✅ Understand end-to-end from main project to feature to implementation

---

## 🚀 Next Steps

### 1. Test Auto-Detection

```bash
# Dashboard should now show project hierarchy
# Open http://localhost:3030
# Click any project that has GitHub URL in docs
# Should see "Main Project" and "Feature" sections
```

### 2. Manual Configuration (Optional)

For projects where auto-detection doesn't work:

```bash
# Edit project JSON manually
cd ~/.claude/sdlc-registry/projects
vim SDLC-20260126-1507.json

# Add fields:
{
  "mainProject": "Claude Admin",
  "mainProjectRepo": "https://github.com/org/claude-admin",
  "featureName": "Add OAuth Authentication",
  ...
}
```

### 3. Create Project Mapping Registry (Future)

```bash
# Create mapping file
cat > ~/.claude/sdlc-registry/project-mapping.json <<EOF
{
  "claude-admin": {
    "name": "Claude Admin",
    "repository": "https://github.com/org/claude-admin"
  }
}
EOF
```

---

## 📝 Implementation Status

- [x] Backend: Extract main project from GitHub URL
- [x] Backend: Extract main project from description patterns
- [x] Backend: Extract main project from file paths
- [x] Backend: Support explicit mainProject fields
- [x] Backend: Return mainProject object in API response
- [ ] Frontend: Update Overview tab with hierarchy display (IN PROGRESS)
- [ ] Frontend: Update header to show main project
- [ ] Frontend: Add main project filter in Projects view
- [ ] Registry: Support project mapping file

---

## 💡 Future Enhancements

1. **Project Groups**: Group all SDLC runs by main project
2. **Feature Dashboard**: See all features added to a project
3. **Merge Tracking**: Track when features get merged to main
4. **Branch Mapping**: Map SDLC runs to feature branches
5. **Release Notes**: Auto-generate release notes from features

---

**Status**: Backend complete, frontend update in progress. Dashboard will restart automatically when complete.
