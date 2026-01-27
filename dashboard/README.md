# AI-SDLC Control Center Dashboard

**Real-time mission control for your AI-driven software development lifecycle**

**Version**: 2.5.0
**Status**: Production Ready
**Latest**: Comprehensive Project Details View (Click any project to see everything)

---

## 🎯 What is the Dashboard?

The AI-SDLC Control Center Dashboard is a **real-time monitoring and analytics platform** that gives you complete visibility into your AI-driven development operations. Think of it as **mission control for your engineering team** - showing every agent action, project status, cost, and performance metric in real-time.

### The Problem It Solves

**Before the Dashboard**:
```
❌ No visibility into what agents are doing
❌ Can't track costs or spending patterns
❌ No way to identify bottlenecks
❌ Projects disappear into a black box
❌ Can't demonstrate ROI to leadership
❌ No way to optimize agent usage
```

**With the Dashboard**:
```
✅ Real-time visibility into all agent actions (SSE updates)
✅ Complete cost tracking with budget alerts
✅ Bottleneck detection and resolution
✅ Full project lifecycle visibility
✅ Executive-ready analytics and ROI metrics
✅ Data-driven optimization recommendations
```

### What Makes It Unique

| Feature | Traditional Monitoring | AI-SDLC Dashboard |
|---------|------------------------|-------------------|
| **Real-time Updates** | Polling (slow, resource-heavy) | SSE streaming (instant, efficient) |
| **Agent Visibility** | N/A | All 11 agents with performance metrics |
| **Cost Tracking** | Manual spreadsheets | Automatic per-project, per-agent tracking |
| **Predictive Analytics** | None | ML-based completion estimates |
| **Integrations** | Complex setup | Built-in Jira, GitHub, Slack |
| **Setup Time** | Hours/days | 30 seconds |

---

## 🧠 Understanding What It Means

### For Engineering Leadership

**Value Proposition**: *Transform AI development from a black box into a transparent, measurable, optimizable operation.*

**Real-World Scenario**:

**Before**:
```
CTO: "How much are we spending on AI agents?"
You: "Um... not sure. Let me check..."
(30 minutes later, manual spreadsheet calculations)
You: "I think around $X, but I'm not confident."

CTO: "Are they actually improving productivity?"
You: "We believe so, but we don't have hard data."
```

**After**:
```
CTO: "How much are we spending on AI agents?"
You: (Opens dashboard) "Exactly $1,247.32 this month, down 18% from last month."

CTO: "Show me ROI."
You: (Clicks ROI tab) "We've saved 423 developer hours worth $38K,
      at an AI cost of $1.2K. That's a 31x ROI. Here's the breakdown..."

CTO: "Where can we optimize?"
You: (Shows bottleneck detection) "The Security agent is blocking 3 projects.
      We should adjust our policies. Also, we're overpaying for Opus on
      simple tasks - switching to Sonnet would save 40%."
```

**Impact Metrics**:
- **Visibility**: 0% → 100% (from blind to complete transparency)
- **Cost Control**: Manual guessing → Precise tracking with alerts
- **Decision Speed**: Hours → Seconds (instant data-driven decisions)
- **ROI Demonstration**: Impossible → Automatic (executive-ready reports)

### For Product Managers

**Value Proposition**: *Track feature development velocity and optimize delivery pipelines.*

**Key Questions Answered**:
1. **"Which features are in progress?"** → Projects view shows all active work
2. **"Why is Feature X taking so long?"** → Gantt timeline reveals bottlenecks
3. **"Can we deliver by deadline?"** → Predictive analytics forecasts completion
4. **"What's blocking us?"** → Bottleneck detection identifies blockers
5. **"How much will Feature Y cost?"** → Historical cost data provides estimates

**Real Example**:
```
PM: "The OAuth feature is due Friday. Will we make it?"

(Opens Dashboard → Projects → OAuth Implementation)
Status: Phase 4 of 7 (Testing)
Progress: 57% complete
Estimated completion: Wednesday 4:00 PM (2 days early ✅)
Confidence: 87% (based on similar projects)

PM: "Great! What about the next feature?"
(Checks project queue)
Next: Payment Integration (queued behind OAuth)
Estimated start: Wednesday 4:30 PM
Duration estimate: 14 hours
Cost estimate: $23 (based on similar integrations)
```

### For Developers

**Value Proposition**: *See what agents are doing, catch issues early, learn from patterns.*

**Practical Uses**:
1. **Monitor Your Features**: Track the SDLC progress of features you requested
2. **Catch Issues Early**: See when agents hit blockers or security violations
3. **Learn Patterns**: Review successful projects to improve your prompts
4. **Optimize Costs**: See which approaches are cost-effective
5. **Debug Faster**: Activity log shows exactly what went wrong

**Real Developer Workflow**:
```bash
# 1. Start a feature
/sdlc-start Build user profile page with avatar upload

# 2. Open dashboard (auto-opens or run: ~/.claude/sdlc-dashboard)
# Watch real-time as:
# - BA agent gathers requirements (30s)
# - Architect designs the solution (2 min)
# - Engineer implements code (5 min)
# - Security reviews for vulnerabilities (1 min)
# - QA runs tests (2 min)

# 3. If anything goes wrong:
# - Dashboard shows which phase failed
# - Click project for detailed logs
# - See exact error message
# - Fix and retry specific phase

# 4. After completion:
# - Review total cost ($0.87)
# - Check what patterns agents used
# - Learn from the approach for next feature
```

### For Finance/FinOps Teams

**Value Proposition**: *Precise AI cost tracking, budget management, and optimization insights.*

**Financial Controls**:
- **Budget Management**: Set budgets, get alerts at 80% threshold
- **Cost Attribution**: Track spending by project, agent, model
- **Trend Analysis**: 4-week velocity charts show spending patterns
- **Optimization**: Identify overuse of expensive models (Opus → Sonnet savings)
- **Forecasting**: Predict monthly spending based on current velocity

**Real FinOps Scenario**:
```
Budget: $500/month for AI agents
Current spend (Day 15): $287.43
Projected month-end: $574.86 (14.9% over budget ⚠️)

Dashboard shows:
- 73% of spending is on Engineer agent
- 89% using Opus model ($15 per 1M tokens)
- Recommendation: Switch Engineer to Sonnet ($3 per 1M tokens)
- Potential savings: $238/month (47% reduction)

Action taken: Update agent config to use Sonnet
New projection: $336.86 (32.7% under budget ✅)
```

---

## 🚀 Quick Start (30 Seconds)

### Option 1: One Command (Recommended)

```bash
~/.claude/sdlc-dashboard
```

✅ Dashboard opens automatically at `http://localhost:3030`

### Option 2: Using Start Script

```bash
cd ~/aisdlc-2.1.0/dashboard
./start-dashboard.sh
```

### Option 3: Direct Node.js

```bash
cd ~/aisdlc-2.1.0/dashboard
node server.js
```

**Expected Output**:
```
🚀 AI-SDLC Dashboard Server Starting...

📁 Registry paths:
   SDLC: /Users/you/.claude/sdlc-registry/
   Costs: /Users/you/.claude/finops-registry/costs/

👀 Watching for changes:
   ✅ Activity log
   ✅ Registry metadata
   ✅ Project files
   ✅ Cost files

🌐 Server running: http://localhost:3030
✅ Dashboard ready!
```

**First Time Setup**: If you see "No projects yet", that's normal. Create your first project:

```bash
/sdlc-start Build a simple REST API
```

Then refresh the dashboard to see it appear.

---

## 📊 Dashboard Views Explained

### 1. Executive Dashboard

**Purpose**: High-level overview for leadership and decision-makers

**What You See**:
- **SDLC Pipeline Flow**: All 8 stages (BA → Jets → Engineer → Security → QA → Atlas → Customer → Done)
  - Shows project count at each stage
  - Identifies bottlenecks (stages with most projects)
- **Agent Performance Grid**: 11 agents with invocations, success rates, costs
- **Project Velocity**: 4-week trend of completed projects
- **Cost Summary**: Total spent, by agent, by model (Opus/Sonnet/Haiku)
- **AI Insights**: Auto-generated recommendations

**How to Use It**:
```
Daily Stand-up:
1. Check bottleneck detection
   - "Security agent has 3 blocked projects"
   - Action: Review policies, adjust thresholds

2. Review velocity trend
   - "Completed 12 projects this week vs 8 last week"
   - Insight: Team productivity up 50%

3. Check cost health
   - "On track for $450/month (under $500 budget)"
   - Or: "Trending to $620 (24% over) - optimize now"

4. Read AI insights
   - "Consider switching 60% of Opus tasks to Sonnet"
   - Potential savings: $180/month
```

**Real Executive Use Case**:
```
CEO: "Show me our AI development ROI"

(Open Executive Dashboard)
- Projects completed this month: 18
- Total cost: $487
- Developer hours saved: 216 hours
- Developer cost equivalent: $19,440
- ROI: 40x

CEO: "How do we compare to last month?"
- Last month: 14 projects, $531 cost, 168 hours saved
- This month: +28% projects, -8% cost, +28% hours saved
- Efficiency improving: More output, less cost
```

### 2. Projects View

**Purpose**: Detailed project tracking and management

**What You See**:
- **Project Cards**: Each project with status, progress, cost
- **Search & Filter**: Find by name, filter by status (In Progress, Completed, Blocked)
- **Archive System**: Clean up completed projects
- **Quick Actions**: Click to view details, archive, export
- **🆕 COMPREHENSIVE PROJECT DETAILS** (v2.5.0): Click any project card to open interactive modal

**How to Use It**:

**Daily Monitoring**:
```
1. Filter to "In Progress"
   - See all active work
   - Identify which are advancing vs stuck

2. Click any project for COMPREHENSIVE DETAILS:
   📊 Overview Tab:
      - Quick stats (phases, duration, cost, coverage)
      - GitHub repository link (clickable)
      - Deployment URL (clickable)
      - Technologies used (badges)
      - Complete phase timeline

   📚 Documentation Tab:
      - All SDLC documentation (expandable sections)
      - Requirements (REQ-*.md)
      - Architecture (ARCH-*.md)
      - Security Review (SECURITY-REVIEW-*.md)
      - Testing Report (TEST-REPORT-*.md)
      - Deployment Record (DEPLOY-*.md)
      - Acceptance Report (UAT-*.md)

   📖 README Tab:
      - Full project README with formatting
      - Easy copy/paste for reference

   ⚙️ Implementation Tab:
      - Test results (total, passing, coverage)
      - Complete file list (all created files)
      - Technologies used

   📝 Change Log Tab:
      - Complete activity timeline
      - Every event with timestamp, agent, phase
      - Full project history

   🏛️ ADRs Tab:
      - Architecture Decision Records
      - Expandable sections
      - Understand architectural choices

3. Address blocked projects:
   - See which agent is blocking
   - Review error message
   - Take corrective action
```

**Project Deep Dive** (Click any project):
```
Project: "OAuth 2.0 Implementation"
Status: In Progress (Phase 5 of 7 - Testing)
Progress: 71% complete

Timeline:
✅ BA (Requirements) - 45s, $0.02
✅ Jets (Architecture) - 2m 13s, $0.14
✅ Engineer (Implementation) - 7m 42s, $0.89
✅ Security (Review) - 1m 8s, $0.06
⏳ QA (Testing) - In progress...
⬜ Atlas (Deployment) - Pending
⬜ Customer (Acceptance) - Pending

Cost Breakdown:
- Engineer: $0.89 (73%)
- Jets: $0.14 (11%)
- Security: $0.06 (5%)
- Others: $0.13 (11%)
Total: $1.22

Estimated completion: 12 minutes
Confidence: 89%
```

**Project Search**:
```
Search: "auth"
Results:
- OAuth 2.0 Implementation (In Progress)
- JWT Authentication Service (Completed)
- MFA Authentication Flow (Completed)
- API Authentication Middleware (Blocked)

(Click to view, compare, or run again)
```

### 3. Agents View

**Purpose**: Monitor individual agent performance and capabilities

**What You See**:
- **11 Agent Cards**: Conductor, BA, Jets, Engineer, Security, QA, Atlas, Customer, Ask Tom, FinOps, Tracker
- **Performance Metrics**: Invocations, costs, success rates
- **Model Usage**: Which model each agent uses
- **Recent Activity**: Latest actions by each agent

**How to Use It**:

**Agent Deep Dive** (Click any agent):
```
Engineer Agent (Software Engineer)

Stats:
- Total invocations: 127
- Success rate: 96.9%
- Total cost: $147.32
- Average cost per invocation: $1.16
- Model: Claude Opus 4.5

Performance:
- Average duration: 6m 42s
- Blocked count: 4 (3.1%)
- Most common block reason: Test failures

Recent Activity:
1. Implemented OAuth service - $1.23 (5m ago)
2. Built user profile API - $0.87 (23m ago)
3. Created payment integration - $2.14 (1h ago)

Optimization Tip:
Consider switching to Sonnet for simple CRUD APIs
Potential savings: $0.80 per simple task (69% reduction)
```

**Performance Comparison**:
```
Cost Efficiency Ranking:
1. BA Agent: $0.04/invocation (most efficient)
2. Security Agent: $0.08/invocation
3. QA Agent: $0.12/invocation
4. Jets Agent: $0.18/invocation
5. Engineer Agent: $1.16/invocation
...

Insight: Engineer agent is 29x more expensive than BA
Reason: Complex code generation vs simple text analysis
Action: Ensure we're not overusing Engineer for simple tasks
```

### 4. Timeline View (Gantt Chart)

**Purpose**: Visualize project overlaps and durations

**What You See**:
- **Gantt Chart**: Visual timeline of all projects
- **Phase Segments**: Color-coded by phase (BA, Jets, Engineer, etc.)
- **Duration Insights**: See which phases take longest
- **Overlap Detection**: Identify resource conflicts

**How to Use It**:

**Capacity Planning**:
```
Timeline view shows:
- 4 projects currently running Engineer phase simultaneously
- 2 projects waiting for Security review
- 1 project blocked in QA

Insight: Engineer agent is over-utilized
Action: Stagger project starts to reduce simultaneous load
```

**Duration Analysis**:
```
Average Phase Durations (from timeline):
- BA: 1.2 minutes
- Jets: 3.5 minutes
- Engineer: 8.7 minutes ⚠️ (longest)
- Security: 1.8 minutes
- QA: 3.2 minutes
- Atlas: 2.1 minutes
- Customer: 1.5 minutes

Bottleneck: Engineer phase
Recommendation: Pre-load more context to reduce implementation time
```

### 5. Compare View

**Purpose**: Side-by-side project comparison

**What You See**:
- **Select up to 4 projects**
- **Metric Comparison**: Costs, duration, phases, success rate
- **Performance Analysis**: Which projects were most efficient

**How to Use It**:

**Learning from Success**:
```
Compare:
✅ "OAuth Implementation" (Successful, $1.87, 18m)
❌ "Payment Gateway" (Blocked, $3.42, 45m)

Differences:
- OAuth: Clear requirements, 80% test coverage, passed security
- Payment: Vague requirements, 45% test coverage, failed security

Lesson: Better initial requirements → faster, cheaper, more reliable
```

**Cost Optimization**:
```
Compare similar projects:
Project A: REST API (Opus) - $2.14, 12m
Project B: REST API (Sonnet) - $0.87, 14m

Insight: Sonnet is 59% cheaper, only 16% slower
Action: Use Sonnet for CRUD APIs, Opus for complex logic
```

### 6. Integrations Hub

**Purpose**: Connect dashboard to external tools

**What You See**:
- **Jira Integration**: Sync project status to Jira tickets
- **GitHub Integration**: Link projects to repos and PRs
- **Slack Integration**: Real-time notifications to Slack channels
- **Connection Management**: Add, edit, remove integrations

**How to Use It**:

**Jira Sync Setup**:
```
1. Click "Add Integration" → Jira
2. Enter Jira URL, API token
3. Map SDLC phases to Jira statuses:
   - BA Complete → "In Design"
   - Engineer Complete → "In Review"
   - QA Complete → "Ready for QA"
   - Customer Accept → "Done"
4. Enable auto-sync
5. Projects now update Jira tickets automatically
```

**Slack Notifications**:
```
Setup:
1. Create Slack webhook URL
2. Add to Integrations Hub
3. Configure notification triggers:
   - ✅ Project completed
   - ✅ Project blocked
   - ⚠️ Budget threshold reached
   - ✅ Security violation detected

Example Slack message:
"🚨 Project 'Payment API' blocked in Security phase.
Reason: Hardcoded API key detected.
View details: http://localhost:3030/projects/SDLC-001"
```

### 7. Costs View

**Purpose**: Detailed financial tracking and optimization

**What You See**:
- **Summary Cards**: Budget, spent, remaining, health percentage
- **Cost by Agent**: Horizontal bars showing distribution
- **Cost by Model**: Opus/Sonnet/Haiku breakdown
- **Efficiency Metrics**: Cost per project, per 1K tokens
- **Optimization Tips**: Actionable cost reduction recommendations

**How to Use It**:

**Budget Management**:
```
Set Budget: $500/month
Current: $287.43 (57.5% used)
Days into month: 15 of 30
Projected end-of-month: $574.86 (14.9% over budget)

Alert triggered at 80% ($400)
Action needed: Reduce spending by $75/month to stay on budget
```

**Cost Breakdown Analysis**:
```
By Agent:
1. Engineer: $147.32 (51%)
2. Jets: $78.21 (27%)
3. QA: $34.12 (12%)
4. Security: $27.78 (10%)

By Model:
1. Opus: $234.21 (82%)
2. Sonnet: $48.12 (17%)
3. Haiku: $5.10 (1%)

Insight: 82% on Opus (most expensive)
Optimization: Identify tasks that could use Sonnet instead
Potential savings: ~$120/month (40% reduction)
```

**Efficiency Metrics**:
```
Cost per project: $2.41 (average)
Cost per 1K tokens: $0.015

Compare to manual development:
- Manual: $90/project (developer time)
- AI-SDLC: $2.41/project
- Savings: $87.59 per project (97.3% cost reduction)
```

### 8. Activity View

**Purpose**: Chronological log of all agent actions

**What You See**:
- **Real-time Feed**: SSE updates, instant notifications
- **Event Types**: Phase starts, completions, blocks, approvals, errors
- **Timestamps**: Precise timing of every action
- **Filtering**: Show all, or filter by event type

**How to Use It**:

**Real-time Monitoring**:
```
Watch the activity feed during active development:

14:23:45 - 🏗️ BA agent started requirements for "User Profile"
14:24:12 - ✅ BA agent completed (27s, $0.02)
14:24:13 - 🏗️ Jets agent started architecture design
14:26:31 - ✅ Jets agent completed (2m 18s, $0.14)
14:26:32 - 🏗️ Engineer agent started implementation
14:32:14 - ✅ Engineer agent completed (5m 42s, $0.73)
14:32:15 - 🏗️ Security agent started review
14:32:47 - ⚠️ Security violation: Hardcoded API endpoint
14:32:48 - 🚫 Project blocked - requires manual fix
```

**Debugging Failed Projects**:
```
Filter: Show only errors and blocks

12:15:32 - 🚫 Security blocked "Payment API"
           Reason: SQL injection vulnerability in query builder
           File: src/database/query.ts:45
           Action: Add parameterized queries

10:42:18 - 🚫 QA blocked "User Service"
           Reason: Test coverage 67% (required 80%)
           Missing: src/user/delete-user.ts (0% coverage)
           Action: Add unit tests for delete function

09:23:54 - ⚠️ Engineer warning "Auth Service"
           Reason: High complexity (Cyclomatic complexity: 24)
           Recommendation: Refactor into smaller functions
```

### 9. AI Learning View

**Purpose**: Learn how to use AI-SDLC effectively

**What You See**:
- **Commands Reference**: All `/sdlc-*` commands
- **Prompt Templates**: Best practice prompts
- **Tips & Best Practices**: Guidance for optimal results
- **Agent Guide**: When to use each agent

**How to Use It**:

**Improve Your Prompts**:
```
Bad Prompt:
"/sdlc-start build auth"

Better Prompt (from templates):
"/sdlc-start Build OAuth 2.0 authentication with JWT tokens,
refresh tokens, MFA support, and Redis session storage"

Result:
- Bad: 4 revision cycles, $8.32, 2 hours
- Better: 1 attempt, $2.14, 18 minutes

Improvement: 75% faster, 74% cheaper, first-time success
```

**Best Practices**:
```
1. Be specific about requirements
   ❌ "Add user management"
   ✅ "Add user CRUD API with role-based access control"

2. Mention non-functional requirements
   ❌ "Build payment system"
   ✅ "Build PCI-compliant payment system with idempotency"

3. Specify constraints
   ❌ "Optimize the API"
   ✅ "Reduce API latency to < 100ms with caching"

4. Include success criteria
   ❌ "Improve test coverage"
   ✅ "Increase test coverage to 90% with integration tests"
```

### 10. Value & ROI View

**Purpose**: Demonstrate business value and return on investment

**What You See**:
- **Time Savings**: Developer hours saved vs manual
- **Cost Efficiency**: AI cost vs developer cost
- **Quality Improvements**: Defect reduction, code quality
- **ROI Calculator**: Return on investment metrics

**How to Use It**:

**ROI Calculation**:
```
Month: January 2026
Projects completed: 18

Time Savings:
- Average manual time per project: 12 hours
- AI-SDLC time per project: 18 minutes (0.3 hours)
- Time saved per project: 11.7 hours
- Total time saved: 210.6 hours
- Developer hourly rate: $90/hour
- Value of time saved: $18,954

AI Costs:
- Total AI spending: $487

Net Benefit:
- Savings: $18,954
- Cost: $487
- Net benefit: $18,467
- ROI: 3,793% (38x return)

Quality Impact:
- Security vulnerabilities prevented: 12
- Average cost per vulnerability fix: $5,000
- Value of prevention: $60,000

Total Value Created:
- Time savings: $18,954
- Vulnerability prevention: $60,000
- Total: $78,954
- AI investment: $487
- ROI: 16,115% (161x return)
```

**Executive Presentation**:
```
Use ROI view to generate reports for leadership:

1. Click "Export PDF"
2. Generates executive summary with:
   - Project completion metrics
   - Cost analysis
   - Time savings
   - Quality improvements
   - ROI calculation
   - Trend charts

3. Present to CFO/CTO:
   "Our $487 AI investment generated $78K in value.
    That's a 161x return in just one month.
    Here's the breakdown..."
```

---

## 💡 How to Leverage the Dashboard

### For Daily Operations

**Morning Routine** (5 minutes):
```
1. Open dashboard
2. Check Executive view:
   - Any projects blocked? → Investigate
   - Budget health OK? → Monitor
   - Bottlenecks? → Address
3. Review activity from overnight
4. Start new projects if capacity available
```

**During Development**:
```
1. Keep dashboard open in second monitor
2. Watch real-time updates as agents work
3. Catch issues immediately when blocks occur
4. Monitor costs to stay within budget
```

**End of Day** (3 minutes):
```
1. Review completed projects
2. Check if any projects blocked (resolve tomorrow)
3. Note lessons learned (successful patterns)
4. Archive completed projects to keep views clean
```

### For Weekly Planning

**Monday Planning Meeting**:
```
1. Executive Dashboard → Review last week:
   - Projects completed: X
   - Average cost per project: $Y
   - Success rate: Z%

2. Identify trends:
   - Velocity increasing or decreasing?
   - Cost per project trending up/down?
   - Common block reasons?

3. Plan this week:
   - Target: Complete N projects
   - Budget allocation: $X
   - Focus areas: Address recurring blocks

4. Set optimization goals:
   - Reduce Engineer phase time by 10%
   - Decrease blocks in Security phase
   - Switch 30% of Opus tasks to Sonnet
```

### For Monthly Reviews

**Executive Monthly Report**:
```
1. Generate ROI report from Value & ROI view
2. Compare month-over-month trends:
   - Projects completed: +/- X%
   - Cost efficiency: +/- Y%
   - Quality metrics: +/- Z%

3. Identify wins:
   - "Completed 42% more projects than last month"
   - "Reduced cost per project by 23%"
   - "Prevented 18 security vulnerabilities"

4. Set next month's goals:
   - Increase velocity by 15%
   - Reduce costs by 10%
   - Improve success rate to 98%
```

### For Optimization

**Cost Optimization Strategy**:
```
1. Costs View → Analyze spending:
   - Which agents are most expensive?
   - Which model is used most?
   - Which projects had unusually high costs?

2. Compare View → Find efficiency patterns:
   - Compare successful vs failed projects
   - Identify what makes projects efficient
   - Learn from best performers

3. Agents View → Optimize model selection:
   - Which agents could use cheaper models?
   - Are we over-using Opus for simple tasks?
   - Can Haiku handle any current Sonnet work?

4. Implement changes:
   - Update agent configs
   - Adjust governance policies
   - Monitor impact over next week
```

**Performance Optimization**:
```
1. Timeline View → Identify bottlenecks:
   - Which phase takes longest?
   - Where do projects get stuck?
   - Are agents over-loaded?

2. Executive Dashboard → Bottleneck detection:
   - Which agent has most blocked projects?
   - What's the common block reason?
   - Can policies be adjusted?

3. Activity View → Debug patterns:
   - Filter to errors and blocks
   - Identify recurring issues
   - Implement preventive measures

4. Test improvements:
   - Run similar projects before/after
   - Measure impact on duration and cost
   - Iterate based on results
```

---

## 🎯 Real-World Use Cases

### Use Case 1: Preventing Budget Overrun

**Scenario**: Mid-month, trending 20% over budget

**Steps**:
```
1. Open Costs View
   - Alert: "Projected $600, Budget $500"
   - 20% over budget

2. Analyze spending:
   - Engineer agent: 52% of costs ($312)
   - 87% using Opus model
   - Average $1.23 per project

3. Compare View:
   - Compare Opus vs Sonnet projects
   - Finding: Sonnet only 12% slower for CRUD
   - Cost difference: Opus $1.23, Sonnet $0.47

4. Action:
   - Update 60% of Engineer tasks to Sonnet
   - Projected new spending: $480 (4% under budget)

5. Monitor:
   - Check daily for next week
   - Confirm savings materializing
   - Adjust further if needed
```

### Use Case 2: Improving Delivery Velocity

**Scenario**: Team wants to increase from 15 to 25 projects/month

**Steps**:
```
1. Timeline View:
   - Current bottleneck: Engineer phase (avg 8.7 min)
   - Security review sometimes stacks up

2. Executive Dashboard:
   - Bottleneck detection shows Security agent has 4 queued

3. Root cause analysis (Activity View):
   - Filter to Security blocks
   - Common issue: Hardcoded secrets
   - Cause: Pre-commit hooks not enforced

4. Solution:
   - Install governance pre-commit hooks on all projects
   - Blocks secrets before reaching Security phase
   - Add more context to Engineer prompts

5. Results (after 1 week):
   - Engineer phase: 8.7 min → 6.2 min (29% faster)
   - Security blocks: 4 → 0 (100% reduction)
   - Velocity: 15 → 23 projects/month (53% increase)
```

### Use Case 3: Demonstrating Value to CFO

**Scenario**: CFO questions AI spending, wants ROI proof

**Steps**:
```
1. Open Value & ROI View
   - Shows automatic ROI calculation
   - Month: $487 spent, $78K value created

2. Export PDF report:
   - Professional executive summary
   - Charts and metrics
   - Time savings breakdown
   - Security value calculation

3. Prepare presentation:
   - "We spent $487 on AI agents"
   - "They completed 18 projects"
   - "Manual cost would be $16,200 (18 × $900)"
   - "We saved $15,713 in developer time"
   - "Plus prevented 12 security incidents ($60K value)"
   - "Total ROI: 161x"

4. CFO Response:
   - "This is incredible. Can we scale it?"
   - Approved 3x budget increase
   - Mandated AI-SDLC for all new projects
```

### Use Case 4: Onboarding New Team Members

**Scenario**: New developer joins, needs to understand AI-SDLC

**Steps**:
```
1. Open dashboard with new developer
   - Show Executive view: "This is mission control"
   - Explain each metric and why it matters

2. AI Learning View:
   - Walk through commands reference
   - Show prompt templates and best practices
   - Explain when to use each agent

3. Live demo:
   - New developer: "/sdlc-start Build simple TODO API"
   - Watch in real-time on Projects view
   - See each phase complete
   - Review final output and cost

4. Review their project:
   - Click project card for details
   - Show phase timeline
   - Explain cost breakdown
   - Point out optimization opportunities

5. Follow-up:
   - "Keep dashboard open as you work"
   - "Learn from patterns of successful projects"
   - "Ask if you see anything confusing"

Result: New developer productive in 30 minutes vs 3 days
```

### Use Case 5: Debugging a Blocked Project

**Scenario**: "Payment Integration" project blocked for 2 hours

**Steps**:
```
1. Projects View:
   - See "Payment Integration" with red "Blocked" badge
   - Click for details

2. Project Detail Modal:
   - Status: Blocked in Security phase
   - Error: "Hardcoded API key detected"
   - File: src/payment/stripe-client.ts:12
   - Time blocked: 2h 15m

3. Activity View (filter to this project):
   - 14:23 - Security started review
   - 14:24 - Detected: STRIPE_API_KEY = "sk_live_..."
   - 14:24 - Blocked with violation

4. Root cause:
   - Engineer agent used example from docs
   - Example had hardcoded key
   - Governance policy caught it

5. Fix:
   - Update src/payment/stripe-client.ts
   - Use environment variable instead
   - Re-run security phase: "/sdlc-review src/payment/"

6. Resolution:
   - Security phase passes
   - Project continues to QA
   - Total delay: 15 minutes (fixed quickly due to dashboard visibility)

Without dashboard:
   - Project would be stuck indefinitely
   - No notification of block
   - Developer wouldn't know to check
   - Could take days to discover
```

---

## 🛠 Features Reference

### Core Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Real-Time Updates** | SSE (Server-Sent Events) for instant notifications | See changes immediately, no refresh needed |
| **Comprehensive File Watching** | Monitors all data sources (logs, projects, costs) | Always up-to-date, catch issues instantly |
| **Live Project Tracking** | Monitor all active, completed, blocked projects | Full visibility into all work |
| **Agent Activity Feed** | See what each agent is doing in real-time | Understand system behavior, debug issues |
| **Visual Workflow** | Beautiful UI showing agent pipeline | Intuitive understanding of process |
| **Dark Mode** | Toggle between light and dark themes | Comfortable viewing in any environment |
| **Keyboard Shortcuts** | `⌘K` / `Ctrl+K` for command palette | Fast navigation without mouse |

### Advanced Features (v2.4.0+)

| Feature | Description | Use Case |
|---------|-------------|----------|
| **🆕 Comprehensive Project Details** (v2.5.0) | 6 interactive tabs with ALL project info | Click any project → see documentation, README, GitHub links, deployment URLs, changelog, ADRs, implementation details |
| **Project Detail Modal** | Click any project for full history | Deep dive into project details |
| **Command Palette** | VS Code-style quick actions (`⌘K`) | Navigate faster, find projects instantly |
| **Sparkline Charts** | Mini trend visualizations in cards | Spot trends at a glance |
| **Gantt Timeline** | Visual timeline view of all projects | Capacity planning, identify overlaps |
| **Agent Deep Dive** | Click any agent for full history and stats | Performance analysis, optimization |
| **PDF Export** | Print-optimized executive summaries | Share with leadership, documentation |
| **Budget Alerts** | Toast notifications at thresholds | Prevent overruns, stay on budget |
| **AI Insights** | Auto-generated recommendations | Data-driven optimization suggestions |
| **Compare Projects** | Side-by-side project comparison | Learn from success, identify patterns |
| **Predictive Analytics** | ML-based completion estimates | Accurate delivery forecasting |
| **Integration Hub** | Jira, GitHub, Slack connections | Seamless workflow with existing tools |

### Performance Features (v2.4.1)

| Feature | Description | Impact |
|---------|-------------|--------|
| **Comprehensive File Watching** | Monitors all registry and cost files | Zero manual refresh needed |
| **Debounced Broadcasting** | Batches rapid changes (500ms) | Prevents UI flooding |
| **SSE Heartbeat** | 30-second keep-alive | Stable long-running connections |
| **Manual Refresh API** | `/api/refresh` endpoint | Force updates when needed |
| **Reduced Polling** | Fallback polling: 30s → 10s | Faster updates in degraded mode |

---

## 📡 API Reference

### REST Endpoints

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/` | GET | Dashboard UI (HTML) | Full app |
| `/api/registry` | GET | Registry metadata and stats | JSON stats |
| `/api/projects` | GET | All projects with phases and costs | JSON array |
| `/api/costs` | GET | All cost data | JSON summary |
| `/api/costs/:projectId` | GET | Specific project costs | JSON detail |
| `/api/activity?limit=50` | GET | Activity log | JSON array |
| `/api/memory` | GET | Agent memory stats | JSON stats |
| `/api/events` | GET | SSE endpoint for real-time updates | Event stream |
| `/api/refresh` | GET | Force immediate broadcast | JSON status |
| `/api/autofix` | GET | Auto-fix stalled projects | JSON result |

### Examples

**Get all projects**:
```bash
curl http://localhost:3030/api/projects | jq
```

**Get cost breakdown**:
```bash
curl http://localhost:3030/api/costs | jq '.summary'
```

**Get recent activity**:
```bash
curl "http://localhost:3030/api/activity?limit=10" | jq
```

**Force refresh**:
```bash
curl http://localhost:3030/api/refresh
```

### SSE (Server-Sent Events)

**Connect to real-time feed**:
```javascript
const events = new EventSource('http://localhost:3030/api/events');

events.addEventListener('update', (e) => {
  const data = JSON.parse(e.data);
  console.log('Dashboard updated:', data);
});

events.addEventListener('heartbeat', (e) => {
  console.log('Connection alive');
});
```

**Events Sent**:
- `update`: When any data changes (projects, costs, activity)
- `heartbeat`: Every 30 seconds to keep connection alive

---

## 🗂 Data Sources

### SDLC Registry

**Location**: `~/.claude/sdlc-registry/`

```
├── registry.json           # Stats, agent counts, metadata
├── activity.log            # Timestamped events (append-only)
└── projects/
    ├── SDLC-001.json      # Individual project files
    ├── SDLC-002.json
    └── ...
```

**registry.json** structure:
```json
{
  "projectsCompleted": 18,
  "projectsInProgress": 3,
  "projectsBlocked": 1,
  "agents": {
    "ba": { "invocations": 22, "cost": 0.88 },
    "engineer": { "invocations": 18, "cost": 147.32 }
  }
}
```

**activity.log** format:
```
2026-01-26T14:23:45.123Z | phase_start | SDLC-001 | ba | Requirements gathering
2026-01-26T14:24:12.456Z | phase_complete | SDLC-001 | ba | 27s | $0.02
2026-01-26T14:24:13.789Z | phase_start | SDLC-001 | jets | Architecture design
```

### FinOps Registry

**Location**: `~/.claude/finops-registry/costs/`

```
└── {PROJECT_ID}-costs.json
```

**Cost file** structure:
```json
{
  "projectId": "SDLC-001",
  "totalCost": 1.87,
  "breakdown": {
    "ba": 0.02,
    "jets": 0.14,
    "engineer": 0.89,
    "security": 0.06,
    "qa": 0.12,
    "atlas": 0.08,
    "customer": 0.03
  },
  "models": {
    "opus": 1.23,
    "sonnet": 0.64,
    "haiku": 0.00
  }
}
```

### Agent Memory

**Location**: `~/.claude/agent-memory/`

```
├── ba/
├── engineer/
├── security/
├── qa/
├── atlas/
├── customer/
├── conductor/
├── finops/
├── tracker/
└── shared/
```

Each agent directory contains:
- `projects/`: Project-specific memories
- `patterns/`: Reusable patterns learned
- `failures/`: Failed attempts and lessons

---

## ⚙️ Configuration

### Server Configuration

**Environment Variables**:
```bash
# Port
PORT=3030                    # Default: 3030

# Registry paths (auto-detected, usually don't need to set)
SDLC_REGISTRY_PATH=~/.claude/sdlc-registry/
FINOPS_REGISTRY_PATH=~/.claude/finops-registry/

# Polling intervals (ms)
POLL_INTERVAL=10000          # Client fallback polling (default: 10s)
DEBOUNCE_DELAY=500           # Server broadcast debounce (default: 500ms)
HEARTBEAT_INTERVAL=30000     # SSE heartbeat (default: 30s)
```

**Change port**:
```bash
PORT=8080 node server.js
```

### Client Configuration

Stored in browser `localStorage`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `sdlc-budget` | number | 10 | Total budget amount ($) |
| `sdlc-budget-alert` | number | 80 | Alert threshold (%) |
| `sdlc-theme` | string | "light" | Theme ("light" or "dark") |
| `sdlc-integrations` | JSON | [] | External integrations config |
| `sdlc-archived-projects` | JSON | [] | Archived project IDs |

**Access in browser console**:
```javascript
// View budget
localStorage.getItem('sdlc-budget')

// Set budget
localStorage.setItem('sdlc-budget', '500')

// View theme
localStorage.getItem('sdlc-theme')

// Switch to dark mode
localStorage.setItem('sdlc-theme', 'dark')
window.location.reload()
```

### Budget Configuration

**Set budget via UI**:
1. Click budget card in Executive or Costs view
2. Modal opens with current budget
3. Enter new budget amount
4. Set alert threshold (default: 80%)
5. Save

**Budget alerts trigger when**:
- Spending reaches threshold (e.g., 80% of $500 = $400)
- Projected month-end spending exceeds budget
- Individual project exceeds expected cost (based on historical avg)

### Integration Configuration

**Jira Integration**:
```json
{
  "type": "jira",
  "name": "Company Jira",
  "url": "https://company.atlassian.net",
  "apiToken": "your_token_here",
  "projectKey": "PROJ",
  "statusMapping": {
    "ba_complete": "In Design",
    "engineer_complete": "In Review",
    "qa_complete": "Ready for QA",
    "customer_accept": "Done"
  }
}
```

**GitHub Integration**:
```json
{
  "type": "github",
  "name": "GitHub Repo",
  "url": "https://github.com/org/repo",
  "token": "ghp_xxxxxxxxxxxxx",
  "autoLink": true
}
```

**Slack Integration**:
```json
{
  "type": "slack",
  "name": "Engineering Slack",
  "webhookUrl": "https://hooks.slack.com/services/xxx/yyy/zzz",
  "channel": "#engineering-ai",
  "notifications": {
    "projectComplete": true,
    "projectBlocked": true,
    "budgetAlert": true,
    "securityViolation": true
  }
}
```

---

## 🔧 Installation & Setup

### Prerequisites

- **Node.js**: v14 or higher
- **AI-SDLC**: v2.4.0 or higher
- **Browser**: Chrome, Firefox, Safari, or Edge

### Installation

**Already included with AI-SDLC**. No separate installation needed.

If dashboard is missing:
```bash
cd ~/aisdlc-2.1.0/dashboard
# Files should exist: server.js, index.html, start-dashboard.sh
```

### First-Time Setup

**1. Make start script executable**:
```bash
chmod +x ~/aisdlc-2.1.0/dashboard/start-dashboard.sh
```

**2. Create global command (optional)**:
```bash
ln -s ~/aisdlc-2.1.0/dashboard/start-dashboard.sh ~/.claude/sdlc-dashboard
```

**3. Test installation**:
```bash
~/.claude/sdlc-dashboard
```

Expected: Dashboard opens at `http://localhost:3030`

### Troubleshooting Installation

**"Port already in use"**:
```bash
# Kill existing process
lsof -ti:3030 | xargs kill -9

# Or use different port
PORT=3031 node server.js
```

**"Registry not initialized"**:
```bash
~/.claude/bin-sdlc-registry init
```

**"Browser doesn't auto-open"**:
```bash
# Manually open
open http://localhost:3030

# Or on Linux
xdg-open http://localhost:3030
```

**"No projects shown"**:
- Normal if you haven't run any SDLC workflows yet
- Create first project: `/sdlc-start Build a simple REST API`
- Refresh dashboard

**"Dark mode not saving"**:
- Check browser localStorage not blocked
- Try: `localStorage.setItem('sdlc-theme', 'dark')`
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

## 🚀 Running in Production

### Background Execution

**Using nohup**:
```bash
cd ~/aisdlc-2.1.0/dashboard
nohup node server.js > dashboard.log 2>&1 &

# Check if running
lsof -i :3030

# View logs
tail -f dashboard.log

# Stop
kill $(lsof -t -i:3030)
```

### Using PM2 (Recommended for Production)

**Install PM2**:
```bash
npm install -g pm2
```

**Start dashboard**:
```bash
cd ~/aisdlc-2.1.0/dashboard
pm2 start server.js --name sdlc-dashboard
```

**Manage**:
```bash
# Status
pm2 status

# Logs (real-time)
pm2 logs sdlc-dashboard

# Restart
pm2 restart sdlc-dashboard

# Stop
pm2 stop sdlc-dashboard

# Remove
pm2 delete sdlc-dashboard
```

**Auto-start on system reboot**:
```bash
pm2 startup
# Follow instructions printed

pm2 save
```

**Monitor with PM2**:
```bash
pm2 monit
```

### Using Docker (see DOCKER-DEPLOYMENT.md)

**Quick Docker start**:
```bash
cd ~/aisdlc-2.1.0/dashboard
docker-compose up -d
```

**Check logs**:
```bash
docker-compose logs -f dashboard
```

**Stop**:
```bash
docker-compose down
```

### Using provided scripts

**PM2 script**:
```bash
cd ~/aisdlc-2.1.0/dashboard
./pm2-dashboard.sh
```

**Docker script**:
```bash
cd ~/aisdlc-2.1.0/dashboard
./docker-dashboard.sh
```

---

## 🔒 Security Considerations

### Current Security Model

**⚠️ WARNING**: Dashboard is designed for **local development use only**.

**No Authentication**: The dashboard server has no built-in authentication or authorization.

**Listens on Localhost**: By default, only accessible from `http://localhost:3030`.

### For Production/Team Use

If you need to deploy the dashboard for team access, implement these security measures:

**1. Add Authentication**:
```javascript
// server.js - Add middleware
const basicAuth = require('basic-auth');

function auth(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== 'admin' || user.pass !== 'secret') {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="AI-SDLC"');
    res.end('Unauthorized');
    return;
  }
  next();
}

// Apply to all routes
server.on('request', (req, res) => {
  auth(req, res, () => {
    // ... existing handler
  });
});
```

**2. Use HTTPS**:
```bash
# Generate self-signed cert (for testing)
openssl req -nodes -new -x509 -keyout server.key -out server.cert

# Update server.js to use https
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
};

https.createServer(options, handler).listen(3030);
```

**3. Deploy Behind Reverse Proxy**:
```nginx
# nginx.conf
server {
  listen 443 ssl;
  server_name ai-sdlc.company.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://localhost:3030;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    # SSE support
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
    proxy_buffering off;
    proxy_cache off;
  }
}
```

**4. Add Rate Limiting**:
```javascript
const rateLimit = {};

function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];

  rateLimit[ip] = rateLimit[ip].filter(t => now - t < 60000);

  if (rateLimit[ip].length > 100) {
    return false; // Too many requests
  }

  rateLimit[ip].push(now);
  return true;
}
```

**5. Enable CORS Carefully**:
```javascript
// Only allow specific domains
const allowedOrigins = ['https://company.com'];

res.setHeader('Access-Control-Allow-Origin',
  allowedOrigins.includes(origin) ? origin : 'null');
```

**6. Sanitize Data**:
- Never expose sensitive information in API responses
- Strip API tokens, secrets from project data
- Sanitize user input in search/filter

---

## 📊 Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `⌘K` / `Ctrl+K` | Open Command Palette | Global |
| `Escape` | Close modal/palette | Modal/Palette |
| `↑` / `↓` | Navigate options | Command Palette |
| `Enter` | Select option | Command Palette |
| `/` | Focus search | Projects/Agents view |
| `a` | Show all projects | Projects view |
| `p` | Show in-progress | Projects view |
| `c` | Show completed | Projects view |
| `b` | Show blocked | Projects view |
| `r` | Refresh data | Any view |
| `d` | Toggle dark mode | Global |
| `?` | Show shortcuts | Global |

---

## 📈 Architecture

### Server Architecture (server.js)

**Technology**: Node.js pure (no external dependencies)

**Components**:
- HTTP server (built-in `http` module)
- Static file server (serves `index.html`)
- REST API endpoints (JSON responses)
- SSE handler (Server-Sent Events)
- File watchers (`fs.watch`) for all data sources

**File Watching**:
```
Watches:
├── ~/.claude/sdlc-registry/activity.log
├── ~/.claude/sdlc-registry/registry.json
├── ~/.claude/sdlc-registry/projects/*.json
└── ~/.claude/finops-registry/costs/*.json

On change:
  ↓
Debounce (500ms)
  ↓
Broadcast to all SSE clients
  ↓
Clients update UI automatically
```

**SSE Flow**:
```
Client connects to /api/events
  ↓
Server adds to client list
  ↓
File change detected
  ↓
Server broadcasts 'update' event
  ↓
All clients receive update
  ↓
Clients fetch fresh data
  ↓
UI updates automatically
```

### Client Architecture (index.html)

**Technology**: React 18 (loaded from CDN)

**Single-File App**: All code in one HTML file (~7,000 lines)
- HTML structure
- CSS styles (embedded)
- JavaScript/React components (Babel JSX)

**State Management**:
```javascript
// React hooks for state
const [projects, setProjects] = useState([]);
const [costs, setCosts] = useState({});
const [activity, setActivity] = useState([]);
const [registry, setRegistry] = useState({});

// SSE updates trigger re-fetch
eventSource.addEventListener('update', () => {
  fetchAllData(); // Updates all state
});
```

**Component Hierarchy**:
```
App (Router)
├── ExecutiveDashboard
│   ├── PipelineFlow
│   ├── AgentPerformanceGrid
│   ├── VelocityChart
│   ├── BottleneckDetection
│   ├── AIInsightsPanel
│   └── PredictiveAnalytics
├── Projects
│   ├── SearchBar
│   ├── FilterButtons
│   ├── ProjectCard (multiple)
│   └── ProjectDetailModal
├── Agents
│   ├── AgentCard (11 agents)
│   └── AgentDetailModal
├── GanttTimeline
│   └── TimelineChart
├── CompareProjectsView
│   ├── ProjectSelector
│   └── ComparisonGrid
├── IntegrationHub
│   ├── IntegrationCard (Jira, GitHub, Slack)
│   └── AddIntegrationModal
├── Costs
│   ├── SummaryCards
│   ├── CostByAgentChart
│   ├── CostByModelChart
│   └── OptimizationTips
├── Activity
│   └── ActivityFeed (chronological)
├── AILearning
│   ├── CommandsReference
│   ├── PromptTemplates
│   └── BestPractices
├── ValueROI
│   ├── ROICalculator
│   ├── TimeSavingsChart
│   └── ExportPDF
├── CommandPalette
└── ToastContainer
```

### Data Flow

```
File System
  ↓ (fs.watch)
Node.js Server
  ↓ (SSE)
React Client
  ↓ (fetch)
State Update
  ↓ (React)
UI Re-render
```

---

## 📚 Additional Documentation

| Document | Description | Location |
|----------|-------------|----------|
| **DOCKER-DEPLOYMENT.md** | Docker and docker-compose setup | `dashboard/DOCKER-DEPLOYMENT.md` |
| **CRASH-PREVENTION.md** | Troubleshooting crashes and errors | `dashboard/CRASH-PREVENTION.md` |
| **DASHBOARD-AUTO-UPDATE.md** | Auto-update feature details (v2.4.1) | `dashboard/DASHBOARD-AUTO-UPDATE.md` |

---

## 🎓 Learning Resources

### Video Tutorials (Coming Soon)

- Dashboard Quick Start (5 min)
- Understanding Executive Dashboard (10 min)
- Cost Optimization Strategies (15 min)
- Advanced Features Tour (20 min)

### Documentation

- Main README: `~/aisdlc-2.1.0/README.md`
- Quick Start Guide: `~/aisdlc-2.1.0/docs/QUICK-START.md`
- FAQ: `~/aisdlc-2.1.0/docs/FAQ.md`

### Support

- **GitHub Issues**: https://github.com/DLTKEngineering/ai-sdlc/issues
- **Discussion Forum**: https://github.com/DLTKEngineering/ai-sdlc/discussions
- **Email**: ai-sdlc@deltek.com

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Single User**: No multi-user support (designed for local use)
2. **No Persistence**: Data comes from file system, no database
3. **Limited History**: Activity log grows indefinitely (manual cleanup needed)
4. **No Filtering on Timeline**: Gantt view shows all projects
5. **Static Integrations**: Integration configs in localStorage (not synced)

### Workarounds

**Activity log too large**:
```bash
# Archive old logs
cd ~/.claude/sdlc-registry
mv activity.log activity-2026-01.log
touch activity.log
```

**Too many projects**:
```bash
# Archive completed projects (via UI)
# Or manually move project files
cd ~/.claude/sdlc-registry/projects
mkdir archive
mv SDLC-001.json archive/
```

### Known Issues

1. **SSE Connection Drops**: Browsers may drop SSE after ~5 minutes of inactivity
   - Workaround: Heartbeat keeps connection alive
   - Fallback: Client polls every 10s

2. **Large Project Files**: Projects with massive logs may slow UI
   - Workaround: Archive old projects
   - Future: Pagination/lazy loading

3. **Chrome DevTools**: Opening DevTools can pause SSE
   - Workaround: Keep DevTools closed during normal use

---

## 🔄 Version History

| Version | Date | Highlights |
|---------|------|------------|
| **2.5.0** | 2026-01-26 | **🚀 Comprehensive Project Details View**: Interactive modal with 6 tabs (Overview, Documentation, README, Implementation, Change Log, ADRs), GitHub/deployment links, complete project information hub |
| **2.4.1** | 2026-01-26 | **Auto-Update Fix**: Comprehensive file watching for all data sources, debounced broadcasting, SSE heartbeat |
| **2.4.0** | 2026-01-21 | **12 Advanced Features**: Command Palette, Gantt Timeline, Project Comparison, AI Insights, Predictive Analytics, Integration Hub, PDF Export, Sparklines |
| **2.3.0** | 2026-01-20 | Memory dashboard, cross-agent learning visualization |
| **2.1.1** | 2025-01-15 | Costs tab, FinOps integration, budget alerts |
| **2.1.0** | 2025-01-15 | Initial dashboard release with real-time SSE |

### v2.5.0 Details - Comprehensive Project Details View

**Feature**: Click any project card to see ALL project information in one interactive modal.

**What's Included**:
- **6 Interactive Tabs**:
  1. **📊 Overview**: Quick stats, GitHub/deployment links, technologies, phase timeline
  2. **📚 Documentation**: All SDLC docs (requirements, architecture, security, testing, deployment, acceptance)
  3. **📖 README**: Full project README with original formatting
  4. **⚙️ Implementation**: Test results, files created, technologies used
  5. **📝 Change Log**: Complete activity timeline with all events
  6. **🏛️ ADRs**: Architecture Decision Records with expandable views

**Backend**:
- New API endpoint: `GET /api/projects/:projectId/details`
- Aggregates data from 10+ sources (project files, documentation, activity logs, cost data)
- Smart extraction of GitHub URLs and deployment URLs from documentation
- Technology detection from architecture docs
- Complete changelog from activity log

**Frontend**:
- Enhanced ProjectDetailModal with tabbed interface
- Expandable documentation sections
- Clickable external links (GitHub, deployment URLs)
- Real-time data fetching
- Loading states and error handling

**Why It Matters**:
- No more hunting through multiple files and folders
- Complete project context in one click
- Direct links to GitHub repos and deployed apps
- All documentation accessible instantly
- Understand project evolution through complete changelog

**See**: `dashboard/FEATURE-PROJECT-DETAILS.md` for complete guide

### v2.4.1 Details - Auto-Update Fix

**Problem**: Dashboard didn't automatically update when project files, registry metadata, or cost data changed. Only `activity.log` was watched.

**Solution**:
1. Comprehensive file watching for all data sources
2. Debounced broadcasting (500ms) to prevent flooding
3. SSE heartbeat (30s) to keep connections alive
4. Manual refresh API (`/api/refresh`)
5. Reduced fallback polling (30s → 10s)

**Impact**: Dashboard now updates automatically for ALL changes, not just activity log updates.

---

## 🚢 Future Roadmap

### Planned Features

**v2.5.0** (Q1 2026):
- [ ] Database backend (optional, for persistence)
- [ ] Multi-user support with authentication
- [ ] Advanced filtering and search (regex, date ranges)
- [ ] Custom dashboard layouts (drag-and-drop)
- [ ] Mobile-responsive UI improvements
- [ ] Webhook support for external notifications
- [ ] Plugin system for custom integrations

**v3.0.0** (Q2 2026):
- [ ] AI-powered anomaly detection
- [ ] Automated optimization recommendations
- [ ] Team collaboration features (comments, annotations)
- [ ] Version control integration (Git blame, PR links)
- [ ] Advanced analytics (A/B testing, experiments)
- [ ] Custom metrics and KPIs
- [ ] Enterprise features (SSO, RBAC, audit logs)

---

## 🤝 Contributing

We welcome contributions to the dashboard!

**Areas for Contribution**:
- UI/UX improvements
- New chart types
- Additional integrations (Azure DevOps, GitLab, etc.)
- Performance optimizations
- Bug fixes
- Documentation

**How to Contribute**:
1. Fork the repo
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes (test thoroughly)
4. Commit: `git commit -m 'Add your feature'`
5. Push: `git push origin feature/your-feature`
6. Open Pull Request

---

## 📄 License

Part of the AI-SDLC Framework
© 2026 Deltek Engineering

---

## 🎯 Quick Reference Card

```
╔══════════════════════════════════════════════════════════════╗
║              AI-SDLC Dashboard Quick Reference               ║
╠══════════════════════════════════════════════════════════════╣
║ Start:       ~/.claude/sdlc-dashboard                        ║
║ URL:         http://localhost:3030                           ║
║ Shortcuts:   ⌘K (command palette), Esc (close)              ║
╠══════════════════════════════════════════════════════════════╣
║ Views:                                                       ║
║   • Executive    - High-level overview, bottlenecks, ROI     ║
║   • Projects     - All projects, search, filter, details     ║
║   • Agents       - 11 agents, performance, deep dive         ║
║   • Timeline     - Gantt chart, capacity planning            ║
║   • Compare      - Side-by-side project comparison           ║
║   • Integrations - Jira, GitHub, Slack connections           ║
║   • Costs        - Budget, spending, optimization tips       ║
║   • Activity     - Chronological log, real-time feed         ║
║   • AI Learning  - Commands, templates, best practices       ║
║   • Value & ROI  - Time savings, ROI calculation, export     ║
╠══════════════════════════════════════════════════════════════╣
║ Common Tasks:                                                ║
║   • Check budget:     Open Costs view                        ║
║   • Find project:     ⌘K → type name                         ║
║   • Debug block:      Projects → click project → view error  ║
║   • Generate report:  Value & ROI → Export PDF               ║
║   • Optimize costs:   Costs → review optimization tips       ║
╠══════════════════════════════════════════════════════════════╣
║ Troubleshooting:                                             ║
║   • Port in use:      lsof -ti:3030 | xargs kill -9          ║
║   • No projects:      /sdlc-start "Build simple REST API"    ║
║   • Not updating:     Check activity log, force refresh      ║
║   • Dark mode:        Toggle in top-right corner             ║
╠══════════════════════════════════════════════════════════════╣
║ Support:                                                     ║
║   • Docs:   ~/aisdlc-2.1.0/dashboard/README.md              ║
║   • Issues: github.com/DLTKEngineering/ai-sdlc/issues       ║
╚══════════════════════════════════════════════════════════════╝
```

---

**Built for AI-SDLC Framework v2.4.1**
**Powered by Node.js + React 18**
**Real-time SSE • Comprehensive File Watching • Auto-Update • Dark Mode • Command Palette**

**Your mission control for AI-driven development** 🚀
