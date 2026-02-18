# Exec Agent Setup Guide

## Quick Start

The Exec Agent is now integrated into your AI-SDLC platform! Here's how to complete the setup:

### 1. Install Dependencies

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/agents/exec-agent

# Option A: Using pip (recommended for Python 3.9-3.11)
pip3 install python-pptx==0.6.23 Pillow==9.5.0

# Option B: If you have dependency issues, use conda
conda create -n exec-agent python=3.11
conda activate exec-agent
pip install python-pptx Pillow
```

### 2. Test the Agent

```bash
# Generate a sample presentation
python exec-agent.py generate SAMPLE-PROJECT executive-summary

# Check the output
ls ~/.claude/exec-agent-memory/presentations/
```

### 3. Use from Dashboard

The Exec Agent is now available in your dashboard at http://localhost:3030

#### Via API:
```bash
curl -X POST http://localhost:3030/api/exec/generate \
  -H "Content-Type: application/json" \
  -d '{"project_id": "SDLC-20250217-1234", "type": "executive-summary"}'
```

#### Via Command Line:
```bash
# From your Claude Code terminal
python /Users/gauravjetly/aisdlc-2.1.0/src/agents/exec-agent/exec-agent.py generate SDLC-20250217-1234 executive-summary
```

## Features

### ✅ Integrated into AI-SDLC Architecture
- Added to AGENTS array in dashboard
- API endpoints created (/api/exec/generate, /api/exec/list)
- Self-learning memory system initialized
- Deltek brand guidelines loaded

### 📊 Presentation Types
1. **executive-summary** - Complete project overview with KPIs
2. **architecture** - Detailed system architecture diagrams
3. **status** - Weekly status reports with metrics

### 🧠 Self-Learning Capabilities
- Memorizes successful slide patterns
- Tracks stakeholder preferences
- Archives historical presentations
- Optimizes diagram styles over time

### 🎨 Deltek Branding
- Uses official Deltek PowerPoint template
- Applies brand colors (#1742F6, #081581, etc.)
- Figtree typography throughout
- Dela AI Lifecycle gradient backgrounds

## Memory Structure

```
~/.claude/exec-agent-memory/
├── deltek-brand/
│   ├── colors.json          # Brand palette
│   ├── typography.json      # Font styles
│   └── layouts.json         # Slide layouts
├── presentations/
│   ├── archive/             # Historical presentations
│   ├── templates/           # Custom templates
│   └── *.pptx              # Generated files
├── preferences/
│   └── stakeholders.json    # Audience preferences
└── learning/
    └── generation_log.json  # Learning history
```

## Auto-Update System

Presentations automatically update when:
- Project status changes in SDLC registry
- Architecture diagrams are regenerated
- New metrics become available
- Cost data is updated

## Integration Points

### In SDLC Workflow
```
Conductor → BA → Jets → Engineer → Security → QA → Atlas → Customer → Tracker
                                                                              ↓
                                                                         Exec Agent
                                                                    (Generates Presentations)
```

### Trigger Points
1. **On Project Completion** - Final executive summary
2. **Weekly** - Status report generation
3. **On Architecture Change** - Updated diagrams
4. **On Demand** - Manual generation

## Troubleshooting

### Pillow Installation Issues
If you see PIL/Pillow errors with Python 3.14:
```bash
# Use Python 3.11 or 3.10 instead
python3.11 -m venv venv
source venv/bin/activate
pip install python-pptx Pillow
```

### Template Not Found
The agent looks for the Deltek template at:
```
/Users/gauravjetly/Downloads/Deltek PowerPoint Guidelines 2/Deltek PPT Template and Guidelines 011426.potx
```

If not found, it creates a basic presentation. Copy your template to this location.

### Permission Issues
```bash
chmod +x exec-agent.py
chmod +x install.sh
```

## Next Steps

1. ✅ Install Python dependencies (see above)
2. ✅ Test presentation generation
3. ✅ Review generated slides in `~/.claude/exec-agent-memory/presentations/`
4. ✅ Customize slide templates if needed
5. ✅ Set up auto-update schedule (optional)

## Example Usage

```python
from exec_agent import ExecAgent

agent = ExecAgent()

# Generate executive summary
output = agent.generate_presentation(
    project_id="SDLC-20250217-1234",
    presentation_type="executive-summary"
)
print(f"Presentation saved to: {output}")

# Auto-update existing presentation
updated = agent.auto_update_presentation(output)
print(f"Updated presentation: {updated}")
```

## Success Criteria

✅ Agent appears in dashboard AGENTS list
✅ API endpoints respond at /api/exec/*
✅ Memory directories created
✅ Deltek brand guidelines loaded
✅ Can generate sample presentation
✅ Self-learning log tracks generations

---

**Status**: Integrated and ready for use after dependency installation
**Last Updated**: February 17, 2025
