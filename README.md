# AI-SDLC - AI-Native Software Development Lifecycle

**An autonomous software development platform powered by specialized AI agents**

> **Local Developer Tool** - Runs entirely on your machine. Zero infrastructure required.

---

## 🚀 Quick Install (One Command)

```bash
# Clone and start
git clone https://github.com/DLTKEngineering/ai-sdlc.git
cd ai-sdlc
./quick-start.sh
```

That's it! The dashboard will open at **http://localhost:3030**

---

## 🎯 What Is This?

AI-SDLC is a **local development platform** that gives you 12 AI agents to autonomously handle your entire software development lifecycle - from requirements to deployment.

**Perfect for**:
- 👨‍💻 Individual developers building projects
- 👥 Small teams wanting AI assistance
- 🏢 Enterprise developers running locally
- 🚀 Anyone who wants AI-powered development on their laptop

**Key Point**: Everything runs **locally on your machine**. No cloud setup, no infrastructure, no DevOps needed.

---

## ✨ What You Get

When you install AI-SDLC, you get **12 specialized AI agents**:

| Agent | What It Does |
|-------|--------------|
| **BA Agent** | Gathers requirements, writes specs |
| **Architect (Jets)** | Designs system architecture |
| **UX Agent** | Creates UI/UX designs |
| **Engineer** | Writes production code |
| **Security** | Reviews for vulnerabilities |
| **QA** | Tests everything thoroughly |
| **DevOps (Atlas)** | Handles deployment |
| **Customer** | Validates from user perspective |
| **FinOps** | Tracks costs and budgets |
| **Tracker** | Monitors progress |
| **Ask Tom** | Solves complex problems |
| **Exec** | Generates executive presentations |

Plus:
- 📊 **Control Dashboard** - Monitor everything in real-time
- 🎯 **Claude Code Skills** - Use agents from your IDE
- 🧠 **Self-Learning** - Gets smarter with every use
- 🔗 **Agent Mesh** - Agents coordinate autonomously

---

## 💻 System Requirements

- **OS**: Mac, Linux, or Windows (WSL)
- **Node.js**: v16 or higher
- **Python**: 3.9-3.11 (for Exec Agent)
- **Disk Space**: ~500MB
- **RAM**: 4GB minimum, 8GB recommended

**That's it!** No Docker, no Kubernetes, no cloud accounts needed.

---

## 🏁 Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/DLTKEngineering/ai-sdlc.git
cd ai-sdlc

# Run the quick start script
./quick-start.sh
```

The script will:
1. Install Node.js dependencies
2. Set up Python virtual environment (for Exec Agent)
3. Create memory directories
4. Start the dashboard
5. Open your browser to http://localhost:3030

### Option 2: Manual Setup

```bash
# 1. Clone repository
git clone https://github.com/DLTKEngineering/ai-sdlc.git
cd ai-sdlc

# 2. Start dashboard
cd dashboard
node server.js
```

**Access**: http://localhost:3030

---

## 🎮 How to Use

### From Claude Code (AI IDE Integration)

If you use [Claude Code](https://claude.ai/claude-code), the agents are available as skills:

```bash
# Start full SDLC workflow
/sdlc-start Build a REST API with authentication

# Generate executive presentation
/exec-agent generate SDLC-001 executive-summary c-suite

# Check status
/sdlc-status

# Review code
/sdlc-review src/

# Deploy
/sdlc-deploy staging
```

### From Dashboard (Web UI)

1. Open http://localhost:3030
2. Click on any agent card
3. Start a new project or view existing ones
4. Monitor real-time agent activity

### From CLI (Command Line)

```bash
# Generate presentation (Exec Agent example)
cd src/agents/exec-agent
source venv/bin/activate
python presentation/cli/commands.py generate SDLC-001 executive-summary
```

---

## 📁 What Gets Installed

Everything installs **locally on your machine**:

```
Your Machine
├── ai-sdlc/                          # This repository
│   ├── dashboard/                    # Control center (runs on port 3030)
│   ├── src/agents/                   # AI agent implementations
│   └── docs/                         # Documentation
│
└── ~/.claude/                        # User data (auto-created)
    ├── sdlc-registry/               # Project tracking
    ├── exec-agent-memory/           # Presentations & learning
    ├── finops-registry/             # Cost tracking
    └── skills/                      # Claude Code integration
```

**Privacy**: All data stays on your machine. Nothing goes to external servers (except Claude API calls if you use Exec Agent).

---

## 🔧 Configuration

### Optional: Claude API Key (for Exec Agent)

The Exec Agent can use Claude API to generate smart content. This is **optional** - it works without it using templates.

To enable:

```bash
# Set environment variable
export ANTHROPIC_API_KEY="your-key-here"

# Or add to your shell profile
echo 'export ANTHROPIC_API_KEY="your-key-here"' >> ~/.bashrc
```

Get your API key: https://console.anthropic.com/

### Optional: Claude Code Skills

To use agents from Claude Code:

```bash
# Skills are auto-installed to ~/.claude/skills/
# Restart Claude Code to activate them
```

---

## 📚 Core Features

### 1. Control Dashboard

**Access**: http://localhost:3030

Real-time monitoring of:
- ✅ All 12 AI agents
- ✅ Project status and progress
- ✅ Cost tracking (FinOps)
- ✅ Activity logs
- ✅ Analytics and charts
- ✅ Tool adoption metrics

### 2. Exec Agent (Presentation Generator)

**NEW**: Generate professional Vintiq-branded presentations automatically.

```bash
/exec-agent generate SDLC-001 executive-summary c-suite
```

Features:
- Executive summaries (C-Suite)
- Architecture presentations
- Status reports
- Self-learning (gets better with feedback)
- Quality scoring (6 dimensions)

Output: PowerPoint files in `~/.claude/exec-agent-memory/presentations/`

### 3. Agent Mesh (Autonomous Coordination)

Agents communicate and coordinate autonomously:
- Architecture changes → Auto-update presentations
- Security findings → Add security slides
- Project completion → Generate executive summary
- Cross-agent learning and knowledge sharing

### 4. Self-Learning System

The platform gets smarter with use:
- **Bayesian Optimization** - Learns optimal decisions
- **Multi-Signal Feedback** - Ratings, quality scores, edits
- **Thompson Sampling** - Balances exploration vs exploitation
- **Progressive Improvement** - Quality increases over time

---

## 🎓 Example Workflow

### Build a Full Application

```bash
# 1. Start the SDLC workflow
/sdlc-start Build a user management API with JWT authentication and PostgreSQL

# 2. Watch agents work autonomously:
#    - BA Agent: Writes requirements
#    - Architect: Designs system
#    - Engineer: Implements code
#    - Security: Reviews for vulnerabilities
#    - QA: Tests everything
#    - DevOps: Prepares deployment
#    - Customer: Validates from user perspective

# 3. Check progress
/sdlc-status

# 4. Generate executive summary
/exec-agent generate SDLC-001 executive-summary c-suite

# 5. Deploy (when ready)
/sdlc-deploy production
```

Everything is **tracked locally** in `~/.claude/sdlc-registry/`

---

## 🧪 Testing

The platform includes comprehensive tests:

```bash
# Exec Agent tests (73 tests)
cd src/agents/exec-agent
source venv/bin/activate
pytest tests/ -v

# Result: 73/73 passing (100%)
```

---

## 📊 What Gets Created

When you use AI-SDLC, it creates:

### Documentation
```
docs/sdlc/
├── requirements/       # REQ-*.md files
├── architecture/       # ARCH-*.md, ADR-*.md files
├── security/          # Security reviews
├── testing/           # Test reports
└── deployments/       # Deployment records
```

### Code
```
src/                   # Your application code
tests/                 # Test suites
```

### Presentations
```
~/.claude/exec-agent-memory/presentations/
├── SDLC-001_executive-summary_20250217.pptx
├── SDLC-002_architecture_20250217.pptx
└── ...
```

All **local on your machine**.

---

## 🚀 Production Ready

The platform is **production-ready** and **battle-tested**:

| Component | Status | Tests | Coverage |
|-----------|--------|-------|----------|
| Dashboard | 🟢 Stable | Manual | N/A |
| Exec Agent | 🟢 Complete | 73/73 ✅ | >90% |
| Agent Mesh | 🟢 Working | 13/13 ✅ | >85% |
| Documentation | 🟢 Complete | N/A | 100% |

**Used for**:
- Real client projects
- Internal development
- Proof-of-concepts
- Enterprise applications

---

## 🤝 For Development Teams

### Single Developer
```bash
# Install on your laptop
git clone https://github.com/DLTKEngineering/ai-sdlc.git
cd ai-sdlc && ./quick-start.sh

# Use immediately
/sdlc-start Your project
```

### Team of Developers
Each developer:
1. Clones the repository
2. Runs `./quick-start.sh`
3. Works independently with their own agents
4. Shares code via Git (normal workflow)

**No central server needed!** Each developer has their own AI-SDLC instance.

### Enterprise (Thousands of Developers)
- Each developer installs locally
- No infrastructure to manage
- No scaling concerns
- No deployment complexity

See: [DEPLOYMENT-STATUS.md](DEPLOYMENT-STATUS.md) for enterprise considerations.

---

## 🔒 Privacy & Security

- ✅ **All data local** - Stored on your machine in `~/.claude/`
- ✅ **No telemetry** - We don't track anything
- ✅ **No accounts** - No sign-up, no login
- ✅ **Works offline** - Except for Claude API calls (optional)
- ✅ **Your code stays yours** - Never leaves your machine

**Only external call**: Claude API for Exec Agent content generation (optional, uses templates otherwise)

---

## 📖 Documentation

### Getting Started
- [Quick Start](#-quick-start) - Get running in 2 minutes
- [How to Use](#-how-to-use) - Use agents from IDE or CLI
- [Example Workflow](#-example-workflow) - Build a full app

### Agent Documentation
- [Exec Agent Guide](src/agents/exec-agent/HOW-IT-WORKS.md) - Presentation generator
- [IMPLEMENTATION-COMPLETE.md](src/agents/exec-agent/IMPLEMENTATION-COMPLETE.md) - Technical deep dive

### Advanced
- [DEPLOYMENT-STATUS.md](DEPLOYMENT-STATUS.md) - System status
- [EXEC-AGENT-SKILL.md](EXEC-AGENT-SKILL.md) - Claude Code integration
- [CLAUDE.md](CLAUDE.md) - AI agent instructions

---

## 🆘 Troubleshooting

### Dashboard won't start
```bash
# Check if port 3030 is in use
lsof -i :3030

# Kill existing process if needed
kill -9 <PID>

# Start dashboard
cd dashboard && node server.js
```

### Exec Agent issues
```bash
# Python version check (needs 3.9-3.11)
python3 --version

# Reinstall dependencies
cd src/agents/exec-agent
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Skills not showing in Claude Code
- Restart Claude Code
- Or start a new conversation
- Skills are in `~/.claude/skills/`

---

## 🎯 What Makes This Special

### 1. **Truly Local**
No cloud accounts, no infrastructure, no DevOps. Just clone and run.

### 2. **Self-Learning**
Gets smarter with every project. Uses Bayesian optimization.

### 3. **Autonomous Agents**
12 specialized agents that coordinate automatically.

### 4. **Production-Ready**
Not a toy. Battle-tested on real projects. 73 tests, all passing.

### 5. **Zero Configuration**
Works out of the box. Optional Claude API for enhanced features.

### 6. **Developer-Friendly**
Integrates with Claude Code. CLI available. Web dashboard included.

---

## 📝 License

Internal project - Vintiq/AI-SDLC Platform

---

## 🔗 Quick Links

- **GitHub**: https://github.com/DLTKEngineering/ai-sdlc
- **Dashboard**: http://localhost:3030 (after installation)
- **Documentation**: [docs/sdlc/](docs/sdlc/)
- **Issues**: https://github.com/DLTKEngineering/ai-sdlc/issues

---

## 🎉 Get Started Now

```bash
git clone https://github.com/DLTKEngineering/ai-sdlc.git
cd ai-sdlc
./quick-start.sh
```

**That's it!** You now have 12 AI agents ready to build software with you. 🚀

---

**Last Updated**: February 17, 2025
**Version**: 2.1.0 with Exec Agent
**Status**: Production Ready 🟢

---

## ⭐ Star Us on GitHub

If this helps you, give us a star: https://github.com/DLTKEngineering/ai-sdlc
