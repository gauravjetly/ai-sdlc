# 🎯 AI SDLC vs Vintiq Catalyst - Clear Separation Guide

## Quick Answer

**Two completely independent projects in one repository:**

```
┌─────────────────────────────────────────────────────────────┐
│                    THIS REPOSITORY                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐      ┌─────────────────────────┐  │
│  │   AI SDLC          │      │  Vintiq Catalyst        │  │
│  │   Framework        │      │  Platform               │  │
│  │                    │      │                         │  │
│  │   Development      │      │  DevOps Product         │  │
│  │   Tool             │      │  (End User Product)     │  │
│  └────────────────────┘      └─────────────────────────┘  │
│           ↓                            ↓                    │
│     Built Catalyst              Operates Independently     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ AI SDLC Framework

### What Is It?
A development framework with AI agents that help **build software**.

### Think of it as:
- **Microsoft Visual Studio** - The IDE that builds software
- **Adobe Photoshop** - The tool that creates graphics
- **AutoCAD** - The tool that designs buildings

### Used By:
Software development teams who want to build products faster using AI agents.

### Used When:
**During development** - When you're writing code, designing architecture, running tests.

### Agents (9 agents that BUILD software):
1. **BA Agent** - Gathers requirements
2. **Architect Agent** - Designs system architecture
3. **Software Engineer Agent** - Writes code
4. **Security Agent** - Reviews code security
5. **QA Agent** - Tests the software
6. **Atlas Agent** - Sets up infrastructure
7. **FinOps Agent** - Analyzes costs
8. **Conductor Agent** - Orchestrates workflow
9. **Tracker Agent** - Tracks progress

### How to Use:
```bash
# In Claude, use AI SDLC commands
/sdlc-start "Build user authentication"
/sdlc-status
/sdlc-review src/auth/
```

### Output:
**Software products** (like Vintiq Catalyst)

### Location:
- Root directory files
- `CLAUDE.md`
- `docs/sdlc/`
- `workflows/`

---

## 🚀 Vintiq Catalyst Platform

### What Is It?
A complete DevOps platform that **operates and deploys** applications to the cloud.

### Think of it as:
- **Microsoft Windows** - An OS that runs applications
- **Adobe Creative Cloud** - A platform that delivers tools
- **A building** - The finished product that people use

### Used By:
DevOps teams, SREs, and Platform Engineers who need to deploy and manage applications.

### Used When:
**During operations** - When you're deploying apps, managing infrastructure, monitoring systems.

### Agents (8 agents that OPERATE the platform):
1. **Security Agent** - Scans containers for vulnerabilities
2. **Developer Agent** - Automates deployments
3. **SRE Agent** - Manages infrastructure
4. **QA Agent** - Runs integration tests
5. **FinOps Agent** - Optimizes cloud costs
6. **Release Manager Agent** - Orchestrates releases
7. **Architect Agent** - Validates architecture
8. **Conductor Agent** - Coordinates agents

### How to Use:
```bash
# Start the platform
cd src/platform
npm run dev

# Open web UI in browser
open http://localhost:3002

# Use the UI to deploy applications, manage resources, etc.
```

### Output:
**Deployed applications**, managed infrastructure, cost optimizations, security scans

### Location:
- `src/platform/` (entire Catalyst codebase)
- `FULLY-WORKING-MODE.md`
- `WHATS-NEXT.md`
- `PLATFORM-COMPLETE.md`

---

## 🔑 Key Differences At A Glance

| Question | AI SDLC Framework | Vintiq Catalyst |
|----------|-------------------|-----------------|
| **What is it?** | Development framework | DevOps platform |
| **Purpose?** | Build software | Deploy & operate apps |
| **Who uses it?** | Development teams | DevOps/SRE teams |
| **When?** | Development time | Runtime/Operations |
| **Agents do what?** | Write code, test, design | Deploy, monitor, optimize |
| **Interface?** | Claude commands | Web UI + REST API |
| **Output?** | Software products | Deployed applications |
| **Analogy?** | Visual Studio | Windows |
| **Location?** | Root + docs/sdlc/ | src/platform/ |
| **Version?** | v2.1.0 | v1.0.0 |

---

## 📊 The Relationship

### How They're Related:

```
Step 1: AI SDLC Framework was used to BUILD Catalyst
        ┌─────────────────────────────────┐
        │     AI SDLC Framework           │
        │                                  │
        │  BA Agent gathered requirements │
        │  Architect designed system      │
        │  Developer wrote code           │
        │  Security hardened it           │
        │  QA tested everything           │
        └─────────────────────────────────┘
                      ↓
                  Produced
                      ↓
        ┌─────────────────────────────────┐
        │     Vintiq Catalyst             │
        │     (Complete Platform)         │
        └─────────────────────────────────┘


Step 2: Now Catalyst operates INDEPENDENTLY
        
        Catalyst Platform runs standalone:
        ┌─────────────────────────────────┐
        │  Users access via Web UI        │
        │  Deploy apps to Kubernetes      │
        │  Manage cloud resources         │
        │  Monitor costs and security     │
        │                                  │
        │  NO dependency on AI SDLC       │
        └─────────────────────────────────┘
```

### In Simple Terms:

**AI SDLC** built **Catalyst**, but now **Catalyst stands alone**.

It's like:
- Carpenters (AI SDLC) built a house (Catalyst)
- Now people live in the house
- The house doesn't need the carpenters to function

---

## 🎯 Which One Do You Need?

### Choose AI SDLC Framework if:
- [ ] You want to **build new software**
- [ ] You're a **developer** or architect
- [ ] You need help with **requirements, design, coding, testing**
- [ ] You want AI agents to **write code for you**
- [ ] You're in the **development phase**

**Start here**: Read `CLAUDE.md`, use `/sdlc-start` command

---

### Choose Vintiq Catalyst if:
- [x] You want to **deploy applications**
- [x] You're a **DevOps engineer or SRE**
- [x] You need to **manage Kubernetes clusters**
- [x] You want to **automate cloud operations**
- [x] You're in the **operations phase**

**Start here**: Read `WHATS-NEXT.md`, open http://localhost:3002

---

## 📁 File Organization

### AI SDLC Files (Framework)
```
aisdlc-2.1.0/
├── CLAUDE.md                    ← Framework instructions
├── docs/sdlc/                   ← SDLC documentation
│   ├── requirements/
│   ├── architecture/
│   └── tracking/
└── workflows/                   ← SDLC workflows
```

### Catalyst Files (Product)
```
aisdlc-2.1.0/
└── src/platform/                ← ENTIRE Catalyst codebase
    ├── webapp/                  ← React UI (7 pages)
    ├── services/                ← Core services
    ├── api/                     ← REST API (102 endpoints)
    ├── prisma/                  ← Database
    └── tests/                   ← Test suites
```

### Documentation Files
```
aisdlc-2.1.0/
├── README.md                    ← Overview of both projects
├── PROJECT-STRUCTURE.md         ← Detailed separation
├── SEPARATION-GUIDE.md          ← This file (simple guide)
├── FULLY-WORKING-MODE.md        ← Catalyst quick start
├── WHATS-NEXT.md                ← Catalyst next steps
└── PLATFORM-COMPLETE.md         ← Catalyst details
```

---

## ✅ Quick Decision Tree

```
Do you want to build new software from scratch?
│
├─ YES → Use AI SDLC Framework
│         Read: CLAUDE.md
│         Use: /sdlc-start command
│
└─ NO → Do you want to deploy/manage applications?
         │
         ├─ YES → Use Vintiq Catalyst
         │         Read: WHATS-NEXT.md
         │         Start: http://localhost:3002
         │
         └─ NO → Read README.md to understand both
```

---

## 🚀 Getting Started

### For AI SDLC (Development):
```bash
# Use Claude with AI SDLC commands
/sdlc-start "Build feature X"
/sdlc-status
/sdlc-review path/to/code
```

### For Catalyst (Operations):
```bash
# Start the platform
cd src/platform
npm run dev

# Open browser
open http://localhost:3002

# Enable Demo Mode in Environments page
# Deploy your first application
```

---

## 💡 Real-World Examples

### Example 1: Building a New Feature
**Use**: AI SDLC Framework
```
You want to add OAuth authentication to an app.
→ Use /sdlc-start "Add OAuth authentication"
→ AI SDLC agents gather requirements, design, code, test
→ Output: Working authentication feature
```

### Example 2: Deploying an Application
**Use**: Vintiq Catalyst
```
You have an app and need to deploy it to production.
→ Open Catalyst Web UI (http://localhost:3002)
→ Go to "Deploy Application"
→ Fill in the form, click Deploy
→ Output: App running in Kubernetes
```

### Example 3: Both Together
```
Step 1: Use AI SDLC to build a microservice
        /sdlc-start "Build user service microservice"
        → Agents build the service

Step 2: Use Catalyst to deploy it
        → Open Catalyst UI
        → Deploy the built service to Kubernetes
        → Monitor it with Catalyst's observability
```

---

## 📞 Getting Help

### For AI SDLC Questions:
- Read: `CLAUDE.md`
- Location: `docs/sdlc/`
- Commands: `/sdlc-*` commands

### For Catalyst Questions:
- Read: `WHATS-NEXT.md` (quick start)
- Read: `FULLY-WORKING-MODE.md` (features)
- Read: `PLATFORM-COMPLETE.md` (technical details)
- Access: http://localhost:3002

---

## ✅ Summary

**Two independent projects, one repository:**

| | AI SDLC | Catalyst |
|-|---------|----------|
| **Purpose** | BUILD software | RUN software |
| **Users** | Developers | DevOps teams |
| **Interface** | Commands | Web UI |
| **Agents** | Write code | Deploy apps |
| **Output** | Code | Deployments |

**Analogy**: 
- AI SDLC = **Construction company** (builds things)
- Catalyst = **Building** (the thing that was built)

**Relationship**:
- AI SDLC **built** Catalyst
- Catalyst **runs independently** now

---

**Still confused? Read [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) for detailed explanation.**

**Want to use Catalyst? Start here: [WHATS-NEXT.md](./WHATS-NEXT.md)**

---

*Last Updated: 2026-01-30*
