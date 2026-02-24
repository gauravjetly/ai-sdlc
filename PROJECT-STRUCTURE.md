# Project Structure - AI SDLC Framework

## Overview

This repository contains **two independent projects**:

1. **AI SDLC Framework** - The development methodology and framework
2. **Vintiq Catalyst** - A DevOps platform product built using AI SDLC

---

## 🏗️ AI SDLC Framework

**Purpose**: AI-Native Software Development Lifecycle framework for building software using specialized AI agents.

**Location**: Root directory (`/Users/gauravjetly/aisdlc-2.1.0/`)

### Framework Components

```
aisdlc-2.1.0/
├── CLAUDE.md                    # AI SDLC framework instructions
├── docs/sdlc/                   # AI SDLC documentation
│   ├── requirements/            # Requirements gathered by BA Agent
│   ├── architecture/            # Architecture designed by Architect Agent
│   └── tracking/                # SDLC progress tracking
├── workflows/                   # AI SDLC workflow definitions
└── [Framework configuration files]
```

### AI SDLC Agents (Development Framework)

These agents **build software**:

1. **BA Agent** - Requirements gathering
2. **Architect Agent (Jets)** - System architecture design
3. **Software Engineer Agent** - Code implementation
4. **Security Agent** - Security review and hardening
5. **QA Agent** - Testing and quality assurance
6. **Atlas Agent** - DevOps/SRE operations
7. **FinOps Agent** - Cost analysis
8. **Conductor Agent** - Workflow orchestration
9. **Tracker Agent** - Progress tracking

**Role**: These agents are used during **development time** to build software products.

---

## 🚀 Vintiq Catalyst Platform

**Purpose**: AI-Native Multi-Cloud DevOps Platform for autonomous cloud operations.

**Location**: `src/platform/` directory

**Status**: Independent product, built using AI SDLC framework

### Catalyst Product Structure

```
src/platform/
├── webapp/                      # React web UI (7 pages)
│   ├── src/
│   │   ├── pages/              # Dashboard, Deploy, Resources, etc.
│   │   ├── components/         # UI components (Vintiq branding)
│   │   └── styles/             # Vintiq color scheme
├── services/                    # Core services (20+ services)
│   ├── deployment/             # Kubernetes deployment service
│   ├── cloud/                  # AWS/OCI/Azure/GCP integration
│   ├── agent/                  # Agent orchestration (runtime)
│   ├── cost/                   # Cost analysis
│   └── security/               # Security scanning
├── self-healing/               # Auto-remediation
├── observability/              # Monitoring and logging
├── pipeline/                   # CI/CD automation
├── api/                        # REST API (102 endpoints)
├── prisma/                     # Database schema (11 tables)
└── tests/                      # Test suites (185+ tests)
```

### Catalyst Agents (Product Runtime)

These agents **operate the platform** at runtime:

1. **Security Agent** - Container scanning, compliance
2. **Developer Agent** - Deployment automation
3. **SRE Agent** - Infrastructure management
4. **QA Agent** - Integration testing
5. **FinOps Agent** - Cost optimization
6. **Release Manager Agent** - Release orchestration
7. **Architect Agent** - Architecture validation
8. **Conductor Agent** - Multi-agent coordination

**Role**: These agents are **part of the Catalyst product** and run during **platform operation**.

---

## 🔍 Key Differences

### AI SDLC Framework (Development Tool)
- **What**: Development methodology and agent framework
- **When**: Used during software development
- **Who Uses**: Development teams building software
- **Agents**: Build and deliver software products
- **Output**: Software products (like Catalyst)

### Vintiq Catalyst (DevOps Product)
- **What**: Multi-cloud DevOps automation platform
- **When**: Used during operations and deployment
- **Who Uses**: DevOps teams, SREs, Platform Engineers
- **Agents**: Automate DevOps workflows
- **Output**: Deployed applications, managed infrastructure

---

## 📝 Relationship

```
┌─────────────────────────────────────────────┐
│         AI SDLC Framework                   │
│         (Development Time)                   │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │  BA Agent → Architect → Developer  │    │
│  │  → Security → QA → Atlas           │    │
│  └────────────────────────────────────┘    │
│                    ↓                         │
│              Produces                        │
│                    ↓                         │
│  ┌────────────────────────────────────┐    │
│  │     Vintiq Catalyst Platform       │    │
│  │     (Independent Product)          │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘

                    ↓ Platform runs independently

┌─────────────────────────────────────────────┐
│      Vintiq Catalyst Platform               │
│      (Runtime / Operations)                 │
│                                              │
│  Users deploy apps via Web UI               │
│             ↓                                │
│  Catalyst Runtime Agents execute:           │
│  - Security Agent scans containers          │
│  - SRE Agent manages infrastructure         │
│  - FinOps Agent optimizes costs             │
│  - etc.                                      │
└─────────────────────────────────────────────┘
```

**Analogy**:
- AI SDLC is like **Visual Studio** (the tool that builds software)
- Catalyst is like **Windows** (the product that was built with the tool)

---

## 📂 File Organization

### AI SDLC Directory (`/Users/gauravjetly/aisdlc-2.1.0/`)
- `CLAUDE.md` - Framework instructions
- `docs/sdlc/` - AI SDLC documentation
- `workflows/` - SDLC workflow definitions
- `README.md` - Overview of both projects
- `PROJECT-STRUCTURE.md` - This file
- `SEPARATION-GUIDE.md` - Simple separation guide

### Catalyst Directory (`/Users/gauravjetly/catalyst/`)
**Completely separate directory - operates independently**
- `README.md` - Catalyst overview
- `FULLY-WORKING-MODE.md` - Quick start
- `WHATS-NEXT.md` - Next steps guide
- `PLATFORM-COMPLETE.md` - Technical details
- `webapp/` - React UI (7 pages)
- `services/` - Core services (20+)
- `api/` - REST API (102 endpoints)
- `prisma/` - Database schema
- `tests/` - Test suites
- All other Catalyst code and configs

---

## 🎯 For Users

### If You Want to Use AI SDLC Framework:
- Read: `CLAUDE.md`
- Use: AI SDLC commands (`/sdlc-start`, `/sdlc-status`, etc.)
- Purpose: Build new software products

### If You Want to Use Vintiq Catalyst:
- Read: `FULLY-WORKING-MODE.md`, `WHATS-NEXT.md`
- Access: http://localhost:3002
- Purpose: Automate DevOps and cloud operations

---

## 🚀 Getting Started

### To Use AI SDLC Framework:
```bash
# Use AI SDLC commands in Claude from any directory
/sdlc-start "Build a new feature"
/sdlc-status
```

### To Use Vintiq Catalyst:
```bash
# Navigate to Catalyst directory
cd /Users/gauravjetly/catalyst

# Start the platform
npm run dev

# Open web UI (in browser)
open http://localhost:3002
```

---

## 📊 Summary

| Aspect | AI SDLC Framework | Vintiq Catalyst |
|--------|-------------------|-----------------|
| **Type** | Development Framework | DevOps Platform |
| **Purpose** | Build software | Operate infrastructure |
| **Users** | Developers | DevOps/SRE teams |
| **When** | Development time | Runtime/Operations |
| **Agents** | Build agents | Operations agents |
| **Output** | Software products | Deployed apps |
| **Access** | Claude commands | Web UI + API |

---

**Important**: These are **separate, independent projects**. AI SDLC was used to build Catalyst, but Catalyst operates independently without any dependency on AI SDLC.

---

*Last Updated: 2026-01-30*
