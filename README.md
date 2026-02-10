# AI SDLC Framework & Deltek Catalyst Platform

This repository contains **two independent projects** unified in an integrated dashboard:

## 🎛️ NEW: Integrated Dashboard

Access everything from one unified interface at **http://localhost:3030**

**Quick Start**:
```bash
./start-all.sh
```

The integrated dashboard combines:
- AI-SDLC Control Center (monitoring and project management)
- Platform UI (deployments and infrastructure)
- Visual Designer (cloud architecture design)
- Real-time activity feeds and agent monitoring

[Quick Start Guide →](./QUICK-START-INTEGRATED-DASHBOARD.md) | [Integration Tests →](./INTEGRATION-TEST-CHECKLIST.md)

---

## 1. 🏗️ AI SDLC Framework
**AI-Native Software Development Lifecycle** - A development framework using specialized AI agents to build software.

**What it is**: Development methodology and tooling
**Who uses it**: Development teams building software
**Purpose**: Build software products using AI agents
**Documentation**: See `CLAUDE.md` and `docs/sdlc/`

[Learn more about AI SDLC Framework →](./docs/sdlc/)

---

## 2. 🚀 Deltek Catalyst Platform
**AI-Native Multi-Cloud DevOps Platform** - A production-ready platform for autonomous cloud operations.

**What it is**: DevOps automation platform (independent product)
**Who uses it**: DevOps teams, SREs, Platform Engineers
**Purpose**: Automate deployments and cloud operations
**Location**: `/Users/gauravjetly/catalyst/` (separate directory)
**Access**: http://localhost:3002 (Web UI)
**Documentation**: See Catalyst directory

[Get started with Catalyst →](/Users/gauravjetly/catalyst/)

---

## 🔍 Which One Do I Need?

### Use AI SDLC Framework if you want to:
- Build new software products using AI agents
- Implement features with automated development workflows
- Use AI-powered requirements, architecture, coding, testing
- Monitor development progress in real-time

**Quick Start**:
```bash
# Start integrated dashboard
./start-all.sh

# Open dashboard
open http://localhost:3030

# Or use AI SDLC commands in Claude
/sdlc-start "Build authentication system"
/sdlc-status
```

### Use Deltek Catalyst if you want to:
- Deploy applications to Kubernetes
- Manage multi-cloud infrastructure (AWS, OCI, Azure, GCP)
- Automate DevOps workflows
- Monitor and optimize cloud costs
- Run security scans and compliance checks

**Quick Start**:
```bash
# Start Catalyst platform
cd src/platform
npm run dev

# Open web UI
open http://localhost:3002
```

---

## 📁 Directory Structure

```
/Users/gauravjetly/
│
├── aisdlc-2.1.0/              # AI SDLC Framework
│   ├── CLAUDE.md              # Framework instructions
│   ├── docs/sdlc/             # SDLC documentation
│   │   ├── requirements/
│   │   ├── architecture/
│   │   └── tracking/
│   ├── workflows/             # SDLC workflows
│   ├── README.md              # This file
│   ├── PROJECT-STRUCTURE.md   # Separation explanation
│   └── SEPARATION-GUIDE.md    # Simple separation guide
│
└── catalyst/                  # Deltek Catalyst Platform (Independent)
    ├── README.md              # Catalyst overview
    ├── WHATS-NEXT.md          # Quick start guide
    ├── FULLY-WORKING-MODE.md  # Features guide
    ├── PLATFORM-COMPLETE.md   # Technical details
    ├── webapp/                # React UI (7 pages)
    ├── services/              # Core services (20+)
    ├── api/                   # REST API (102 endpoints)
    ├── prisma/                # Database (11 tables)
    ├── tests/                 # Test suites (185+ tests)
    ├── observability/         # Monitoring stack
    ├── self-healing/          # Auto-remediation
    ├── pipeline/              # CI/CD automation
    └── [All other Catalyst files]
```

---

## 🎯 Quick Links

### Integrated Dashboard
- **[Quick Start Guide](./QUICK-START-INTEGRATED-DASHBOARD.md)** - Get started in 5 minutes
- **[Integration Test Checklist](./INTEGRATION-TEST-CHECKLIST.md)** - Comprehensive testing guide
- [Dashboard](http://localhost:3030) - Main control center
- [Platform API](http://localhost:3000) - Backend services
- [Platform Webapp](http://localhost:3001) - UI components

### For AI SDLC Framework Users
- [Framework Documentation](./docs/sdlc/)
- [Commands Reference](./CLAUDE.md)
- [Architecture Decisions](./docs/sdlc/architecture/)
- [Requirements Docs](./docs/sdlc/requirements/)

### For Deltek Catalyst Users
- [Quick Start Guide](./FULLY-WORKING-MODE.md)
- [What's Next Guide](./WHATS-NEXT.md)
- [Complete Platform Details](./PLATFORM-COMPLETE.md)
- [Web UI](http://localhost:3002)
- [API Documentation](http://localhost:3000/api-docs)

### Understanding the Separation
- [Project Structure Explained](./PROJECT-STRUCTURE.md)

---

## 🚀 Getting Started

### Integrated Dashboard (Recommended)

**One-command start for everything:**

```bash
# Start all services with integrated dashboard
./start-all.sh
```

This starts:
- Dashboard Server (port 3030) - Main control center
- Platform API (port 3000) - Backend services
- Platform Webapp (port 3001) - UI components

**Access Points:**
- Main Dashboard: http://localhost:3030
- Platform API: http://localhost:3000
- Platform Webapp: http://localhost:3001

**Complete Guide**: [QUICK-START-INTEGRATED-DASHBOARD.md](./QUICK-START-INTEGRATED-DASHBOARD.md)

### For Development (AI SDLC)
Use Claude with AI SDLC commands to build software, then monitor progress in the dashboard.

### For Operations (Catalyst)

1. **Navigate to Catalyst**:
   ```bash
   cd /Users/gauravjetly/catalyst
   ```

2. **Start the platform**:
   ```bash
   npm install
   npm run dev
   ```

3. **Access Web UI**: http://localhost:3002

4. **Enable Demo Mode**: Go to Environments page

5. **Deploy an app**: Use the deployment wizard

Full instructions: `/Users/gauravjetly/catalyst/WHATS-NEXT.md`

---

## 📊 Key Statistics

### AI SDLC Framework
- **Agents**: 9 specialized development agents
- **Workflows**: Full SDLC automation
- **Output**: Software products

### Deltek Catalyst Platform
- **Code**: 25,000+ lines
- **Services**: 20+ real services (zero mock data)
- **Tests**: 185+ tests, 85% coverage
- **UI**: 7 interactive web pages
- **APIs**: 102 REST endpoints
- **Agents**: 8 runtime operations agents
- **Status**: Production ready ✅

---

## 🔑 Key Differences

| Aspect | AI SDLC Framework | Deltek Catalyst |
|--------|-------------------|-----------------|
| **Type** | Development Tool | DevOps Product |
| **Purpose** | Build software | Operate infrastructure |
| **Users** | Developers | DevOps/SRE teams |
| **When** | Development time | Runtime |
| **Agents** | Build agents | Operations agents |
| **Access** | Claude commands | Web UI + API |
| **Output** | Software | Deployments |

---

## 📞 Support

### AI SDLC Questions
See framework documentation in `docs/sdlc/`

### Catalyst Questions
See user guides:
- Quick start: `FULLY-WORKING-MODE.md`
- Next steps: `WHATS-NEXT.md`
- Complete details: `PLATFORM-COMPLETE.md`

---

## ✅ Status

| Project | Status | Version |
|---------|--------|---------|
| **AI SDLC Framework** | ✅ Active | v2.1.0 |
| **Deltek Catalyst** | ✅ Production Ready | v1.0.0 |

---

## 🎉 Summary

**Two Independent Projects in One Repository**:

1. **AI SDLC** = The framework used to **build** software
2. **Catalyst** = The platform **built using** that framework

Think of it like:
- AI SDLC is **Visual Studio** (the tool)
- Catalyst is **Windows** (the product built with the tool)

Both are in this repo, but they serve completely different purposes and operate independently.

---

## 🧪 Testing

### Run Integration Tests

```bash
# Automated integration tests
./test-integration.sh

# Manual testing checklist
# See INTEGRATION-TEST-CHECKLIST.md
```

### Test Coverage

- Service startup and health checks
- HTTP endpoint validation
- API proxy functionality
- Theme synchronization
- Performance benchmarks
- Error handling
- Cross-origin communication

---

## 📸 Screenshots

### Integrated Dashboard
The main control center provides unified access to all features:

**Main Dashboard View:**
- Overview tab: System status and metrics
- Projects tab: All SDLC projects
- Agents tab: AI agent monitoring
- Activity tab: Real-time activity feed

**Embedded Platform Views:**
- Platform UI tab: Full platform interface
- Visual Designer tab: Cloud architecture designer
- Deployments tab: Deployment management

All views synchronized with:
- Unified theme (light/dark mode)
- Seamless navigation
- Real-time data updates
- No page refreshes required

---

*Last Updated: 2026-02-10*
