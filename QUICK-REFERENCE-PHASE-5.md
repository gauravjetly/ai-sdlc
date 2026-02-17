# Phase 5 Features - Quick Reference

## 🚀 10 New Commands - Usage Guide

---

### 1. **aisdlc predict** - Predictive Quality Analysis

**What it does**: Analyzes your current git changes and predicts potential quality issues before they occur.

**Usage**:
```bash
# Run from any git repository
aisdlc predict

# Output example:
#  ⚠️  Predicted 2 potential issues:
#  🔒 SECURITY (85% confidence)
#     Authentication code changes have caused 5 security issues in the past
#
#     Suggestions:
#     1. Run security review early in workflow
#     2. Use parameterized queries
#     3. Implement rate limiting
```

**When to use**: Before starting any workflow, after making significant changes

---

### 2. **aisdlc shell** - Interactive Shell

**What it does**: Launches an interactive REPL for navigating workflows, searching code, and managing the platform.

**Usage**:
```bash
aisdlc shell

# Inside shell:
aisdlc> workflows          # List active workflows
aisdlc> search "auth"      # Search codebase
aisdlc> agents             # Show agent status
aisdlc> logs --errors      # View error logs
aisdlc> help               # Show all commands
aisdlc> exit               # Quit shell
```

**When to use**: Interactive exploration, quick queries, monitoring

---

### 3. **aisdlc analyze** - Code Quality Analyzer

**What it does**: Scans your codebase for quality issues: duplicates, complexity, SOLID violations, code smells.

**Usage**:
```bash
# Analyze src directory
aisdlc analyze src/

# Output example:
#  Found 8 issues:
#
#  🔴 HIGH: Duplicate code detected (3 instances)
#  File: src/controllers/UserController.ts:45-67
#  Suggestion: Extract to shared function
#  Impact: -46 lines
#
#  🟡 MEDIUM: Complexity too high (Cyclomatic: 18)
#  File: src/services/PaymentService.ts:89-145
#  Suggestion: Extract payment validation
```

**When to use**: Before committing, during code review, refactoring sessions

---

### 4. **aisdlc perf** - Performance Profiler

**What it does**: Tracks platform performance, identifies bottlenecks, suggests optimizations.

**Usage**:
```bash
# Show performance report
aisdlc perf report

# Start profiling
aisdlc perf profile

# Get optimization suggestions
aisdlc perf optimize

# Output example:
#  Performance Report (Last 7 Days):
#  Avg Duration: 3.2 hours (↓ 15%)
#
#  Bottlenecks Detected:
#  🔴 SQLite query: 850ms → Add index (75% faster)
#  🟡 Classification: 2.1s → Use Haiku (60% faster)
```

**When to use**: Weekly reviews, after major changes, optimization cycles

---

### 5. **aisdlc generate-tests** - AI Test Generator

**What it does**: Automatically generates unit tests from your TypeScript code.

**Usage**:
```bash
# Generate tests for a file
aisdlc generate-tests src/services/PaymentService.ts

# Output:
#  ✅ Generated 23 tests:
#     - 15 unit tests
#     - 5 integration tests
#     - 3 property-based tests
#  📝 Written to: tests/services/PaymentService.test.ts
```

**When to use**: After writing new code, improving test coverage, TDD

---

### 6. **aisdlc generate-docs** - Documentation Generator

**What it does**: Auto-generates markdown documentation from TypeScript code.

**Usage**:
```bash
# Generate docs for entire codebase
aisdlc generate-docs src/

# Generate docs for specific directory
aisdlc generate-docs src/services/

# Output:
#  ✅ Generated documentation for 45 files
#  📁 Output directory: docs/api/
```

**When to use**: After implementation, before releases, documentation updates

---

### 7. **aisdlc workflow-gen** - Natural Language Workflows

**What it does**: Converts natural language descriptions into custom SDLC workflows.

**Usage**:
```bash
# Describe what you want to build
aisdlc workflow-gen "Add Stripe payments with PCI compliance, 3 week deadline"

# Output:
#  Parsed Intent:
#  Type: payment-integration
#  Risk Level: HIGH
#  Compliance: PCI DSS
#  Timeline: 3 weeks
#
#  Generated Custom Workflow:
#  1. Requirements [✓] - BA Agent - 2 hours
#  2. Compliance Review [✓] - Security Agent - 1 hour
#  3. Architecture [✓] - Architect - 3 hours
#  4. Development [✓] - Engineer - 3 days (TDD required)
#  5. Security Review [✓] - Security - 2 hours (PCI verification)
#  6. Testing [✓] - QA - 1 day
#  7. Deployment [✓] - Atlas - 2 days (Phased rollout)
#  8. Acceptance [✓] - Customer - 1 day
#
#  Time Estimate: 2.5 weeks
#  Recommended buffer: +1 week
```

**When to use**: Planning new features, understanding effort, customizing workflows

---

### 8. **aisdlc deps** - Dependency Analyzer

**What it does**: Analyzes npm dependencies for security, updates, and optimization opportunities.

**Usage**:
```bash
# Full analysis
aisdlc deps analyze

# Check security only
aisdlc deps security

# Find outdated packages
aisdlc deps outdated

# Find unused dependencies
aisdlc deps unused

# Output:
#  Dependency Health Report:
#
#  🔴 Security: 2 vulnerabilities found
#     axios@0.21.1 → 1.6.0 (CRITICAL)
#
#  🟡 Updates: 15 packages outdated
#     react: 17.0.2 → 18.2.0
#
#  Unused: 3 packages (4.1 MB saved)
```

**When to use**: Weekly maintenance, before deployments, security audits

---

### 9. **aisdlc search** - Semantic Code Search

**What it does**: Searches your codebase by intent/meaning, not just keywords.

**Usage**:
```bash
# Search by intent
aisdlc search "authentication code"
aisdlc search "database queries"
aisdlc search "functions that return promises"

# Output:
#  Semantic Code Search
#  Query: "authentication code"
#  Understanding: You want authentication-related code
#
#  Found 5 results:
#
#  1. src/auth/jwt.ts (95% match)
#     JWT token generation and validation
#     Lines: 145 | Modified: 2 days ago
#
#  2. src/middleware/auth.ts (92% match)
#     Authentication middleware
#     Lines: 67
```

**When to use**: Finding code, understanding architecture, learning codebase

---

### 10. **aisdlc graph** - Knowledge Graph

**What it does**: Visualizes relationships between agents, files, and knowledge.

**Usage**:
```bash
# Platform overview
aisdlc graph overview

# Agent collaboration graph
aisdlc graph agents

# File dependency graph
aisdlc graph files

# Knowledge categories
aisdlc graph knowledge

# Output:
#  Knowledge Graph
#
#  Platform Overview:
#  Workflows: 45
#  Knowledge: 234 items
#  Agents: 12
#
#  Relationships:
#       Workflows
#           │
#           ├──► BA Agent
#           ├──► Architect
#           ├──► Engineer
#           ├──► Security
#           ├──► QA
#           ├──► Atlas
#           └──► Customer
```

**When to use**: Understanding system, finding patterns, visualizing knowledge

---

## 🎯 Workflow Examples

### **Daily Developer Workflow**:
```bash
# Morning: Check predictions
aisdlc predict

# Work on feature
# ... make changes ...

# Before commit: Analyze code
aisdlc analyze src/

# Check performance
aisdlc perf report

# Generate tests if needed
aisdlc generate-tests src/MyNewClass.ts

# Search for similar patterns
aisdlc search "similar to MyNewClass"
```

### **Weekly Maintenance**:
```bash
# Check dependencies
aisdlc deps analyze

# Review performance trends
aisdlc perf report

# Update documentation
aisdlc generate-docs src/

# Check system health
aisdlc doctor
```

### **Planning New Feature**:
```bash
# Generate custom workflow
aisdlc workflow-gen "Add real-time chat with WebSockets and Redis"

# Understand existing patterns
aisdlc search "WebSocket implementations"
aisdlc search "Redis usage"

# Check agent collaboration
aisdlc graph agents
```

---

## 💡 Pro Tips

1. **Use `aisdlc shell`** for interactive exploration - much faster than individual commands

2. **Run `aisdlc predict`** before starting work - prevents issues before they occur

3. **Use `aisdlc analyze`** in pre-commit hooks - catch quality issues early

4. **Generate docs** after every sprint - keep documentation current

5. **Search semantically** - "find auth code" works better than "grep -r auth"

6. **Profile regularly** - weekly `perf report` catches regressions early

7. **Use workflow-gen** for planning - estimates are data-driven

8. **Check deps weekly** - stay secure and up-to-date

9. **Visualize with graph** - understand system holistically

10. **Generate tests** for new code - improve coverage effortlessly

---

## 📚 Command Cheat Sheet

| Command | Quick Action | When |
|---------|-------------|------|
| `predict` | Analyze current changes | Before workflow |
| `shell` | Interactive mode | Exploration |
| `analyze [path]` | Code quality scan | Before commit |
| `perf report` | Performance check | Weekly |
| `generate-tests <file>` | Auto-generate tests | After coding |
| `generate-docs [path]` | Update documentation | After sprint |
| `workflow-gen "<desc>"` | Plan feature | Before starting |
| `deps analyze` | Check dependencies | Weekly |
| `search "<query>"` | Find code by intent | Learning |
| `graph overview` | Visualize system | Understanding |

---

**All commands are local-only, no cloud dependencies, instant results!**
