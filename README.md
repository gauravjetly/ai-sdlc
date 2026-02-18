# AI-SDLC - AI-Native Software Development Lifecycle

**An autonomous software development platform powered by specialized AI agents**

---

## 🎯 Overview

AI-SDLC is a complete software development lifecycle framework that uses 12 specialized AI agents to autonomously handle every phase of software development - from requirements gathering to deployment and monitoring.

### What It Does

- ✅ **Requirements Gathering** (BA Agent)
- ✅ **Architecture Design** (Architect/Jets Agent)
- ✅ **UX/UI Design** (UX Agent)
- ✅ **Code Implementation** (Software Engineer Agent)
- ✅ **Security Review** (Security Agent)
- ✅ **Quality Assurance** (QA Agent)
- ✅ **Deployment** (Atlas/DevOps Agent)
- ✅ **User Acceptance Testing** (Customer Agent)
- ✅ **Cost Management** (FinOps Agent)
- ✅ **Progress Tracking** (Tracker Agent)
- ✅ **Problem Solving** (Ask Tom Agent)
- ✅ **Executive Presentations** (Exec Agent) ⭐ NEW!

---

## 🚀 Quick Start

### 1. Start the Dashboard

```bash
cd /Users/gauravjetly/aisdlc-2.1.0
cd dashboard
node server.js
```

**Access**: http://localhost:3030

### 2. Use Claude Code Skills

The AI-SDLC agents are available as Claude Code skills:

```bash
# Start full SDLC workflow
/sdlc-start Build a user authentication system

# Generate executive presentation
/exec-agent generate SDLC-001 executive-summary c-suite

# Check status
/sdlc-status

# Review code
/sdlc-review src/

# Deploy
/sdlc-deploy staging
```

---

## 🏗️ Architecture

### Dashboard (Control Center)

**Location**: `dashboard/`
**Port**: 3030
**Purpose**: Central monitoring and control for all AI-SDLC activities

Features:
- Real-time agent activity monitoring
- Project registry and tracking
- Cost analysis (FinOps integration)
- Phase 5 analytics with charts
- Tool adoption tracking
- Scheduling views

### Exec Agent (NEW!)

**Location**: `src/agents/exec-agent/`
**Purpose**: Generate Deltek-branded executive presentations

Features:
- Executive summaries (C-Suite)
- Architecture presentations
- Status reports
- Self-learning with Bayesian optimization
- Quality scoring (6 dimensions)
- Version management

[Complete documentation →](src/agents/exec-agent/IMPLEMENTATION-COMPLETE.md)

### Agent Mesh

**Location**: `src/agent-mesh/`
**Purpose**: Event-driven coordination between all agents

Features:
- File-based event bus
- Cross-agent learning
- Knowledge sharing
- Auto-update triggers

### Memory Systems

**SDLC Registry**: `~/.claude/sdlc-registry/`
- Project tracking
- Agent activity logs
- Event history

**Exec Agent Memory**: `~/.claude/exec-agent-memory/`
- Generated presentations
- Learning models
- Brand guidelines

---

## 📋 Project Structure

```
aisdlc-2.1.0/
├── dashboard/                    # Control Center (port 3030)
│   ├── server.js                # Dashboard server
│   └── index.html               # UI
├── src/
│   ├── agents/
│   │   └── exec-agent/          # Executive presentation agent
│   │       ├── domain/          # Pure business logic
│   │       ├── application/     # Use cases & services
│   │       ├── infrastructure/  # External integrations
│   │       └── presentation/    # CLI & API
│   ├── agent-mesh/              # Event-driven coordination
│   ├── integration/             # Integration tests
│   └── memory-system/           # Shared memory
├── docs/
│   └── sdlc/                    # SDLC documentation
│       ├── requirements/
│       ├── architecture/
│       ├── security/
│       ├── testing/
│       └── deployments/
├── CLAUDE.md                    # AI agent instructions
└── README.md                    # This file
```

---

## 🔧 Configuration

### Environment Setup

1. **SDLC Registry**
   - Location: `~/.claude/sdlc-registry/`
   - Auto-created on first use
   - Stores all project data and agent activity

2. **Exec Agent**
   - Virtual environment: `src/agents/exec-agent/venv/`
   - Dependencies: `python-pptx`, `Pillow`, `anthropic`, `scipy`
   - Configuration: Environment variables for Claude API key

3. **Dashboard**
   - Port: 3030
   - Node.js server
   - No external dependencies

### Skills Configuration

Claude Code skills are stored in: `~/.claude/skills/`

Available skills:
- `/sdlc-start` - Start full SDLC workflow
- `/sdlc-status` - Check status
- `/sdlc-review` - Code review
- `/sdlc-deploy` - Deployment
- `/exec-agent` - Generate presentations

---

## 📚 Documentation

### Core Documentation
- [CLAUDE.md](CLAUDE.md) - AI agent instructions and standards
- [DEPLOYMENT-STATUS.md](DEPLOYMENT-STATUS.md) - Current deployment status
- [HOW-IT-WORKS.md](src/agents/exec-agent/HOW-IT-WORKS.md) - Exec Agent guide

### Agent Documentation
- [Exec Agent](src/agents/exec-agent/IMPLEMENTATION-COMPLETE.md) - Complete implementation
- [Agent Mesh](src/agent-mesh/README.md) - Event-driven coordination
- [Memory Systems](docs/sdlc/architecture/) - Architecture decisions

### Guides
- [EXEC-AGENT-SKILL.md](EXEC-AGENT-SKILL.md) - Claude Code skill usage
- [SDLC Architecture](docs/sdlc/architecture/) - System architecture

---

## 🎓 How It Works

### 1. SDLC Workflow

```
User Request → Conductor → BA → Architect → Engineer →
Security → QA → DevOps → Customer → Exec (Presentation)
```

Each agent:
- Has specialized expertise
- Communicates via events
- Learns from feedback
- Documents its work

### 2. Event-Driven Coordination

All agents communicate through a file-based event bus:

```
~/.claude/sdlc-registry/events/
├── inbox/<agent>/     # Incoming events for each agent
├── outbox/<agent>/    # Outgoing events from each agent
└── archive/           # Processed events
```

Events trigger autonomous actions:
- Project completion → Generate executive summary
- Architecture change → Update diagrams
- Security finding → Add security slide
- Customer feedback → Update learning models

### 3. Self-Learning

Agents continuously improve using:
- **Bayesian Optimization** - Thompson Sampling for optimal decisions
- **Multi-Signal Feedback** - Ratings, quality scores, edits, reuse
- **Cross-Agent Learning** - Share insights across the agent mesh
- **Version Management** - Track improvements over time

---

## 🚀 Usage Examples

### Start Full SDLC Workflow

```bash
/sdlc-start Build a REST API for user management with JWT authentication
```

The system will:
1. BA Agent gathers requirements
2. Architect designs the system
3. Engineer implements the code
4. Security reviews for vulnerabilities
5. QA tests functionality
6. DevOps deploys
7. Customer validates
8. Exec generates presentation

### Generate Executive Presentation

```bash
/exec-agent generate SDLC-20250217-001 executive-summary c-suite
```

Output: Professional PowerPoint in `~/.claude/exec-agent-memory/presentations/`

### Check Project Status

```bash
/sdlc-status
```

Shows:
- Active projects
- Agent activity
- Quality gates
- Blockers
- Costs

---

## 🎯 Key Features

### Dashboard Features
- ✅ Real-time agent monitoring
- ✅ Project registry with SSE updates
- ✅ Cost tracking (FinOps integration)
- ✅ Phase 5 analytics with charts
- ✅ Tool adoption metrics
- ✅ Scheduling views

### Exec Agent Features
- ✅ Deltek-branded presentations
- ✅ Self-learning with Bayesian optimization
- ✅ Quality scoring (6 dimensions)
- ✅ Version management
- ✅ Auto-updates on project changes
- ✅ CLI and API access

### Agent Mesh Features
- ✅ Event-driven coordination
- ✅ Cross-agent learning
- ✅ Knowledge sharing
- ✅ Auto-update triggers
- ✅ Distributed intelligence

---

## 🧪 Testing

### Run Tests

```bash
# Exec Agent tests
cd src/agents/exec-agent
source venv/bin/activate
pytest tests/ -v

# Result: 73/73 passing (100%)
```

### Integration Tests

```bash
# Full SDLC cycle simulation
cd src/integration
npm test
```

---

## 📊 Status

### Production Ready ✅

| Component | Status | Tests |
|-----------|--------|-------|
| Dashboard | 🟢 Running | Manual |
| Exec Agent | 🟢 Complete | 73/73 ✅ |
| Agent Mesh | 🟢 Implemented | 13/13 ✅ |
| SDLC Registry | 🟢 Operational | N/A |
| Skills | 🟢 Installed | Working |

### Recent Updates

- **Feb 17, 2025**: Exec Agent (all 4 phases complete)
- **Feb 17, 2025**: Claude Code skill created
- **Feb 17, 2025**: Event bus directories configured
- **Feb 17, 2025**: Dashboard enhancements (Phase 5)

---

## 🤝 Contributing

### Adding New Agents

1. Create agent directory in `src/agents/<agent-name>/`
2. Implement layered architecture (domain/application/infrastructure)
3. Add event handlers for agent mesh
4. Create Claude Code skill in `~/.claude/skills/<agent-name>/`
5. Document in `docs/sdlc/architecture/`

### Quality Standards

- ✅ Layered architecture (mandatory)
- ✅ Zero domain dependencies
- ✅ >80% test coverage
- ✅ SOLID principles
- ✅ Comprehensive documentation

---

## 📝 License

Internal project - Deltek/AI-SDLC Platform

---

## 🔗 Links

- **Dashboard**: http://localhost:3030
- **Documentation**: `docs/sdlc/`
- **Skills**: `~/.claude/skills/`
- **Registry**: `~/.claude/sdlc-registry/`
- **Presentations**: `~/.claude/exec-agent-memory/presentations/`

---

## 🎉 Quick Links

- [Get Started](#-quick-start)
- [Documentation](#-documentation)
- [How It Works](#-how-it-works)
- [Usage Examples](#-usage-examples)

---

**Last Updated**: February 17, 2025
**Version**: 2.1.0 with Exec Agent
**Status**: Production Ready 🚀
