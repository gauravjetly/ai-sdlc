# Agent Collaboration & Communication Guide

## 🎉 What's New

You now have **TWO major improvements** to your AI-SDLC framework:

1. ✅ **Agent Mesh** - Inter-agent communication and collective learning platform
2. ✅ **UX Agent Integration** - Complete UX design workflow with standalone command

---

## 🤝 Agent Mesh System

### What is Agent Mesh?

The Agent Mesh is a complete inter-agent communication platform that allows all 12 specialized agents to:
- **Talk to each other** via asynchronous messaging
- **Learn from each other** through collective memory
- **Update each other** on discoveries and insights
- **Coordinate autonomously** without manual orchestration
- **Resolve conflicts** through expertise-weighted voting

### How It Works

```
┌─────────────────────────────────────────────────────┐
│              AGENT MESH PLATFORM                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐    ┌──────────────┐            │
│  │   Message    │    │   Collective  │            │
│  │     Bus      │◄──►│    Memory    │            │
│  └──────────────┘    └──────────────┘            │
│         │                    │                     │
│         └────────┬───────────┘                     │
│                  │                                 │
│  ┌───────────────▼─────────────────────────┐     │
│  │      Learning Engine                     │     │
│  │  (Automatic pattern detection)           │     │
│  └──────────────────────────────────────────┘     │
│                                                     │
└─────────────────────────────────────────────────────┘
              │           │           │
              ▼           ▼           ▼
         ┌────────┐  ┌────────┐  ┌────────┐
         │   BA   │  │ Architect│  │   UX   │
         │ Agent  │  │  Agent  │  │ Agent  │
         └────────┘  └────────┘  └────────┘
              │           │           │
         ┌────────┐  ┌────────┐  ┌────────┐
         │Engineer│  │Security│  │   QA   │
         │ Agent  │  │ Agent  │  │ Agent  │
         └────────┘  └────────┘  └────────┘
```

### Core Components

#### 1. Message Bus
- **Location**: `~/.claude/agent-mesh/messages/`
- **Protocol**: File-based asynchronous messaging
- **Message Types**:
  - `request` - Request help from another agent
  - `response` - Respond to a request
  - `notification` - Notify of events
  - `learning` - Share a learning
  - `consultation` - Ask for expert opinion
  - `escalation` - Escalate a blocker
  - `broadcast` - Send to all agents
  - `knowledge-update` - Share knowledge discovery
  - `conflict` - Report disagreement
  - `resolution` - Resolve conflict

#### 2. Collective Memory
- **Location**: `~/.claude/agent-mesh/collective-memory/`
- **Categories**:
  - `error-pattern` - Common errors and solutions
  - `best-practice` - Proven approaches
  - `anti-pattern` - What to avoid
  - `architecture-decision` - Design decisions
  - `security-insight` - Security findings
  - `performance-insight` - Performance optimizations
  - `process-improvement` - Workflow improvements
  - `conflict-resolution` - Past conflict resolutions
  - `integration-pattern` - Integration approaches
  - `cross-agent-learning` - Multi-agent insights

#### 3. Learning Engine
- **Auto-detects patterns** in agent outputs
- **Propagates learnings** to relevant agents
- **Upgrades confidence** as more agents confirm
- **Generates briefings** before agent starts

#### 4. Agent Registry
- **Location**: `~/.claude/agent-mesh/registry/agents.json`
- **Tracks**: 12 agents with capabilities, expertise, and permissions
- **Discovery**: Find agents by capability or topic

### Using Agent Mesh

#### For Users (You)

When you invoke any agent, the mesh works automatically behind the scenes:

```bash
# You invoke one agent
/sdlc-security src/api/

# Behind the scenes:
# 1. Security Agent loads collective intelligence briefing
# 2. Security Agent performs review
# 3. Security Agent finds SQL injection vulnerability
# 4. Security Agent consults Engineer Agent for ORM best practice
# 5. Engineer Agent responds with recommendation
# 6. Both agents learn from this interaction
# 7. Learning is stored in collective memory
# 8. Future agents benefit from this knowledge
```

You don't see the agent-to-agent communication, but you benefit from:
- **Faster problem resolution** (agents collaborate)
- **Smarter agents** (collective learning)
- **Consistent solutions** (shared knowledge)
- **Better quality** (cross-agent validation)

#### For Agents (Automatic)

Every agent automatically:

**At Startup:**
```bash
# Get collective intelligence briefing
~/.claude/agent-mesh/mesh-cli.sh briefing {agent-name}
```

**During Work:**
```bash
# Send message to another agent
~/.claude/agent-mesh/mesh-cli.sh send {from} {to} \
  --type consultation \
  --priority high \
  --subject "Need help with X" \
  --content "{details}"

# Check for responses
~/.claude/agent-mesh/mesh-cli.sh poll {agent-name}
```

**After Completing:**
```bash
# Store learning
~/.claude/agent-mesh/mesh-cli.sh learn \
  --agent {agent-name} \
  --title "Learning title" \
  --description "What was learned" \
  --category "best-practice" \
  --confidence "emerging"
```

### Monitoring Agent Mesh

```bash
# Check mesh health
~/.claude/agent-mesh/mesh-cli.sh health

# View audit log
cat ~/.claude/agent-mesh/audit/$(date +%Y-%m-%d)/audit.jsonl

# Search collective knowledge
~/.claude/agent-mesh/mesh-cli.sh search --query "authentication"

# View communication graph
~/.claude/agent-mesh/mesh-cli.sh graph
```

---

## 🎨 UX Agent Integration

### What's New

The UX Agent is now **fully integrated** into the SDLC workflow with:

1. ✅ **Standalone Command**: `/sdlc-ux [description]`
2. ✅ **Full SDLC Integration**: Included in `/sdlc-start` workflow
3. ✅ **Agent Mesh Connection**: UX Agent can communicate with all agents
4. ✅ **Self-Learning Memory**: Stores design patterns and learnings

### UX Agent Position in Workflow

```
User Request
     ↓
CONDUCTOR
     ↓
BA Agent (Requirements)
     ↓
Architect Agent (Architecture)
     ↓
🎨 UX Agent (Design) ← NEW PHASE
     ↓
Software Engineer (Implementation)
     ↓
Security Agent (Review)
     ↓
QA Agent (Testing)
     ↓
Atlas Agent (Deployment)
     ↓
Customer Agent (Acceptance)
```

### UX Agent Capabilities

#### Phase 1: UX Research
- User persona creation
- Journey mapping
- Competitive analysis
- Usability goals definition
- Accessibility planning (WCAG 2.1 AAA)

#### Phase 2: Design System
- Color palette (accessible)
- Typography scale
- Spacing system
- Component library (atomic design)
- Icon library
- Animation principles

#### Phase 3: Wireframes & Prototypes
- Low-fidelity wireframes
- High-fidelity mockups
- Interactive prototypes
- Responsive variants (mobile, tablet, desktop)
- Dark mode variants

#### Phase 4: Validation
- Nielsen's usability heuristics
- WCAG 2.1 AAA compliance
- Core Web Vitals performance
- Design consistency audit

### Using UX Agent

#### Standalone Command

```bash
# Design UX for a specific feature
/sdlc-ux Design user experience for checkout flow with Apple Pay integration

# UX Agent will:
# 1. Research users and create personas
# 2. Design information architecture
# 3. Create design system
# 4. Design wireframes and mockups
# 5. Ensure accessibility compliance
# 6. Document implementation guidelines
```

#### As Part of Full Workflow

```bash
# Start full SDLC workflow
/sdlc-start Build customer dashboard with analytics

# Workflow includes UX Agent automatically:
# BA → Architect → UX → Engineer → Security → QA → Atlas → Customer
```

#### What UX Agent Delivers

**Files Created:**
- `docs/sdlc/ux/UX-RESEARCH-[timestamp].md` - User research
- `docs/sdlc/ux/DESIGN-SYSTEM-[timestamp].md` - Design system spec
- `docs/sdlc/ux/WIREFRAMES-[timestamp].md` - Wireframes and mockups
- `docs/sdlc/ux/components/` - Component library
- `docs/sdlc/ux/assets/` - Design assets

**Quality Gates:**
- ✅ WCAG 2.1 AAA accessibility
- ✅ Core Web Vitals targets (LCP <2.5s, FID <100ms, CLS <0.1)
- ✅ Nielsen's usability heuristics
- ✅ >80% component reuse
- ✅ Mobile-first responsive design

### UX Agent + Agent Mesh

The UX Agent is **fully integrated** with Agent Mesh:

```
Example: UX Agent designing a payment form

1. UX Agent starts → Loads collective briefing
2. UX Agent designs form → Applies learned patterns
3. UX Agent consults Security Agent → "What security requirements?"
4. Security Agent responds → "PCI DSS compliance needed"
5. UX Agent adjusts design → Incorporates security requirements
6. UX Agent stores learning → "Payment form security patterns"
7. Future agents benefit → All agents now know payment form patterns
```

### UX Agent Memory

**Location**: `~/.claude/agent-memory/ux/`

**Stores:**
- Navigation patterns that worked
- Form designs that convert
- Data visualization patterns
- Accessible color schemes
- Typography scales
- Usability findings
- Performance optimizations

**Result**: UX Agent gets smarter with every project!

---

## 🚀 Quick Reference

### All Available Commands

| Command | Agent | Purpose |
|---------|-------|---------|
| `/sdlc-start [desc]` | Conductor | Full SDLC workflow (all 8 phases) |
| `/sdlc-requirements [desc]` | BA Agent | Requirements gathering only |
| `/sdlc-architecture [desc]` | Architect | Architecture design only |
| `/sdlc-ux [desc]` | UX Agent | UX design only |
| `/sdlc-security [path]` | Security | Security review only |
| `/sdlc-deploy` | Atlas | Deployment only |
| `/sdlc-ask-tom [problem]` | Ask Tom | Problem solving |
| `/sdlc-status` | Tracker | Check all work status |
| `/sdlc-review [path]` | Multiple | Comprehensive code review |

### Agent Mesh CLI

```bash
# Health check
~/.claude/agent-mesh/mesh-cli.sh health

# Search knowledge
~/.claude/agent-mesh/mesh-cli.sh search --query "authentication"

# View audit log
~/.claude/agent-mesh/mesh-cli.sh audit --date today

# Check conflicts
~/.claude/agent-mesh/mesh-cli.sh conflicts

# Generate briefing
~/.claude/agent-mesh/mesh-cli.sh briefing {agent-name}
```

### Example Workflows

#### 1. Full Feature Development

```bash
/sdlc-start Build user authentication with OAuth 2.0 and MFA

# Automatic workflow:
# 1. BA Agent gathers requirements
# 2. Architect designs system
# 3. UX Agent designs interface
# 4. Engineer implements
# 5. Security reviews
# 6. QA tests
# 7. Atlas deploys
# 8. Customer validates

# Meanwhile:
# - Agents communicate via mesh
# - Learnings captured automatically
# - Knowledge shared across agents
```

#### 2. UX-Only Design

```bash
/sdlc-ux Design mobile app onboarding flow with 3-step wizard

# UX Agent workflow:
# 1. Research mobile onboarding patterns
# 2. Create user personas
# 3. Design 3-step flow
# 4. Ensure touch-friendly (44px targets)
# 5. Validate accessibility
# 6. Create component library
# 7. Document for engineers
```

#### 3. Problem Solving with Agent Collaboration

```bash
/sdlc-ask-tom Production outage - authentication failing intermittently

# Ask Tom workflow:
# 1. Ask Tom analyzes problem
# 2. Consults Security Agent → "Check token expiry"
# 3. Consults Atlas Agent → "Check Redis cache"
# 4. Consults Engineer → "Check session handling"
# 5. Identifies root cause → Redis connection pool exhausted
# 6. Implements fix → Increase pool size
# 7. Stores learning → All agents now know this pattern
# 8. Prevents recurrence → Added monitoring
```

---

## 📊 Benefits

### Before Agent Mesh
- ❌ Agents worked in isolation
- ❌ Repeated mistakes across projects
- ❌ No knowledge sharing
- ❌ Manual coordination required
- ❌ Inconsistent solutions

### After Agent Mesh
- ✅ Agents collaborate automatically
- ✅ Learnings persist across projects
- ✅ Collective intelligence grows
- ✅ Self-organizing coordination
- ✅ Consistent, proven solutions

### Before UX Agent Integration
- ❌ UX only in full workflow
- ❌ No standalone UX command
- ❌ UX not visible in docs
- ❌ Engineers guessed at design

### After UX Agent Integration
- ✅ Standalone `/sdlc-ux` command
- ✅ UX integrated in full workflow
- ✅ Complete design documentation
- ✅ Engineers follow design system
- ✅ WCAG AAA accessibility guaranteed

---

## 🎯 Next Steps

1. **Try the UX Agent**:
   ```bash
   /sdlc-ux Design dashboard for project analytics
   ```

2. **Monitor Agent Mesh**:
   ```bash
   ~/.claude/agent-mesh/mesh-cli.sh health
   ```

3. **Check Collective Knowledge**:
   ```bash
   ~/.claude/agent-mesh/mesh-cli.sh search --query "design patterns"
   ```

4. **Run Full Workflow**:
   ```bash
   /sdlc-start Add real-time notifications system
   ```

5. **Watch Agents Collaborate**:
   ```bash
   tail -f ~/.claude/agent-mesh/audit/$(date +%Y-%m-%d)/audit.jsonl
   ```

---

## 📚 Documentation

- **Agent Mesh Architecture**: `docs/AGENT-MESH-ARCHITECTURE.md`
- **Agent Mesh Protocol**: `src/agent-mesh/protocols/agent-mesh-protocol.md`
- **Agent Integration Guide**: `agents/agent-mesh-integration.md`
- **UX Agent Guide**: `agents/ux-agent.md`
- **Conductor Guide**: `agents/conductor.md`

---

## 🎉 Summary

You now have a **true Agentic AI platform** where:

1. **Agents talk to each other** via Agent Mesh
2. **Knowledge compounds** through collective learning
3. **UX is a first-class citizen** with standalone command
4. **Quality improves** as agents get smarter
5. **Coordination is automatic** without manual orchestration

The system learns from every interaction and becomes more intelligent over time!

🚀 **Your AI-SDLC framework is now a self-improving, collaborative AI platform!**
