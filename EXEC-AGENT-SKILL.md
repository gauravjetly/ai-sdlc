# Exec Agent - Claude Code Skill

## ✅ SKILL CREATED

The Exec Agent is now available as a Claude Code skill!

**Location**: `~/.claude/skills/exec-agent/`

---

## 🎯 How to Use

### Option 1: Slash Command (Recommended)
```
/exec-agent generate SDLC-001 executive-summary c-suite
/exec-agent list
/exec-agent stats
```

### Option 2: Natural Language
Just ask Claude naturally:
- "Generate an executive summary for SDLC-001"
- "Create architecture slides for SDLC-002"
- "Show me all presentations"

Claude will automatically invoke the exec-agent skill.

### Option 3: Explicit Skill Invocation
In your message, mention:
> "Use the exec-agent skill to create slides for SDLC-001"

---

## 📋 Available Commands

### 1. Generate Presentation
```bash
/exec-agent generate <project_id> <type> [audience]
```

**Types**:
- `executive-summary` - For C-Suite and executives
- `architecture` - For technical architects
- `status` - For weekly status reports

**Audiences** (optional):
- `c-suite` - Chief officers, board members
- `vp-director` - VPs and directors
- `tech-lead` - Technical leads and architects
- `project-team` - Project team members

**Examples**:
```bash
/exec-agent generate SDLC-20250217-001 executive-summary c-suite
/exec-agent generate SDLC-001 architecture tech-lead
/exec-agent generate SDLC-002 status project-team
```

### 2. List Presentations
```bash
/exec-agent list
```
Shows all generated presentations.

### 3. View Statistics
```bash
/exec-agent stats
```
Shows generation statistics and quality metrics.

### 4. Provide Feedback
```bash
/exec-agent feedback <presentation_id> --rating <1-5>
```
Example: `/exec-agent feedback PRES-001 --rating 4.5`

### 5. View Analytics
```bash
/exec-agent analytics [--audience c-suite]
```
View learning insights and effectiveness metrics.

---

## 🔄 Activation

The skill is created and ready. To activate:

### Option 1: New Conversation (Easiest)
Start a new Claude Code conversation. The skill will be loaded automatically.

### Option 2: Restart Claude Code
Exit and reopen Claude Code to reload all skills.

### Option 3: Test Now
Try it in your current session - it might work immediately:
```
/exec-agent list
```

---

## 🎨 What It Does

When you invoke the exec-agent skill, Claude will:

1. Execute the Exec Agent CLI command
2. Generate a Deltek-branded PowerPoint presentation
3. Use Bayesian learning to optimize for your audience
4. Apply quality scoring across 6 dimensions
5. Save the .pptx file to `~/.claude/exec-agent-memory/presentations/`
6. Report back with the file location and next steps

---

## 📊 Features

- ✅ **Deltek Branding**: Colors (#1742F6), Figtree font, professional layouts
- ✅ **Self-Learning**: Bayesian optimization improves with feedback
- ✅ **Quality Scoring**: 6-dimensional assessment
- ✅ **Multiple Types**: Executive summary, architecture, status reports
- ✅ **Audience Adaptation**: Tailors content to specific audiences
- ✅ **Version Management**: Rollback capability with SHA-256 hashing

---

## 🔍 Behind the Scenes

The skill wraps the Exec Agent CLI:
```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/agents/exec-agent
source venv/bin/activate
python presentation/cli/commands.py <command> [args]
```

---

## 📁 Output Location

All presentations are saved to:
```
~/.claude/exec-agent-memory/presentations/
```

File naming format:
```
<project_id>_<type>_<timestamp>.pptx
```

Example:
```
SDLC-20250217-001_executive-summary_20250217_220030.pptx
```

---

## 💡 Example Workflow

1. **Generate presentation**:
   ```
   /exec-agent generate SDLC-001 executive-summary c-suite
   ```

2. **Open the file**:
   ```bash
   open ~/.claude/exec-agent-memory/presentations/SDLC-001_executive-summary_*.pptx
   ```

3. **Provide feedback**:
   ```
   /exec-agent feedback PRES-001 --rating 4.5
   ```

4. **Next presentation** will be better! (Bayesian learning)

---

## ✅ Verification

To verify the skill is installed:

1. Check files exist:
   ```bash
   ls -la ~/.claude/skills/exec-agent/
   ```

   Should show:
   - `skill.json`
   - `prompt.md`

2. Test the CLI directly:
   ```bash
   cd /Users/gauravjetly/aisdlc-2.1.0/src/agents/exec-agent
   source venv/bin/activate
   python presentation/cli/commands.py list
   ```

3. Try the skill:
   ```
   /exec-agent list
   ```

---

## 🐛 Troubleshooting

### Skill not recognized
- **Solution**: Start a new conversation or restart Claude Code

### Command fails
- **Check**: Virtual environment activated?
- **Check**: Dependencies installed? (`pip install -r requirements.txt`)
- **Check**: Project exists in SDLC registry?

### No output file
- **Check**: CLI command output for errors
- **Check**: `~/.claude/exec-agent-memory/presentations/` directory exists

---

## 📚 Documentation

- **Complete Guide**: `/Users/gauravjetly/aisdlc-2.1.0/src/agents/exec-agent/HOW-IT-WORKS.md`
- **Implementation**: `/Users/gauravjetly/aisdlc-2.1.0/src/agents/exec-agent/IMPLEMENTATION-COMPLETE.md`
- **Deployment**: `/Users/gauravjetly/aisdlc-2.1.0/DEPLOYMENT-STATUS.md`

---

## 🎉 Summary

✅ **Skill Created**: `~/.claude/skills/exec-agent/`
✅ **CLI Working**: Tested and verified
✅ **Ready to Use**: `/exec-agent list`

The Exec Agent is now available as a Claude Code skill! Just type `/exec-agent` to start generating professional Deltek-branded presentations.

**Next**: Try it in a new conversation or restart Claude Code to activate the skill.
