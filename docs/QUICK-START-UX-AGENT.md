# Quick Start: UX Agent

Get started with the UX Agent in 5 minutes.

## 🚀 Quick Start

### 1. Automatic Use (Recommended)

The UX Agent is automatically invoked in any SDLC workflow:

```bash
/sdlc-start Build a customer dashboard with real-time analytics and data visualization
```

**What happens**:
1. BA Agent gathers requirements (Phase 1)
2. Architect Agent designs architecture (Phase 2)
3. **UX Agent designs user experience (Phase 3)** ← Automatic
4. Software Engineer implements (Phase 4)
5. ... remaining phases

### 2. Standalone UX Review

Review an existing implementation:

```
Use the ux-agent subagent to review the implementation.

Context:
- Requirements: docs/sdlc/requirements/REQ-20260202.md
- Implementation: src/components/Dashboard.tsx

Review for:
- WCAG 2.1 AAA compliance
- Usability heuristics
- Design system consistency
- Performance impact
```

### 3. Query Existing Patterns

Before starting new work, check what patterns already exist:

```bash
~/.claude/agent-memory/ux/query-patterns.sh \
  --category navigation \
  --min-satisfaction 4.5 \
  --recent 5
```

## 📋 What You Get

### UX Research Report
`docs/sdlc/ux/UX-RESEARCH-{timestamp}.md`
- User personas
- Journey maps
- Usability goals
- Competitive analysis

### Design System
`docs/sdlc/ux/DESIGN-SYSTEM-{timestamp}.md`
- Color palette (WCAG AAA)
- Typography scale
- Component library
- Design tokens

### Wireframes
`docs/sdlc/ux/WIREFRAMES-{timestamp}.md`
- Low-fidelity wireframes
- High-fidelity mockups
- Interactive states
- Responsive variants

### Component Library
`docs/sdlc/ux/components/`
- Reusable components
- Usage guidelines
- Accessibility specs
- Code examples

## 🎯 Example Workflow

### New Feature with UX

```bash
# Start full SDLC
/sdlc-start Build a user profile page with avatar upload, bio editing, and social links

# Conductor orchestrates:
# 1. BA Agent → Requirements
# 2. Architect Agent → Architecture
# 3. UX Agent → UX Design (automatic)
#    - Creates user personas
#    - Designs component library
#    - Generates wireframes
#    - Ensures WCAG 2.1 AAA
# 4. Software Engineer → Implementation
# 5. Security → Review
# 6. QA → Testing
# 7. DevOps → Deployment
# 8. Customer → Acceptance
```

### UX Enhancement for Existing Feature

```
Use the ux-agent subagent to improve the UX of the existing login page.

Context:
- Current implementation: src/pages/Login.tsx
- User feedback: "Login form is confusing, error messages unclear"

Tasks:
1. Conduct UX audit of current implementation
2. Identify usability issues
3. Design improved login flow
4. Create updated wireframes
5. Specify accessibility improvements
```

## 📊 Success Metrics

UX Agent tracks these metrics automatically:

### Usability
- Task completion rate: >95%
- Error rate: <2%
- User satisfaction: >4.5/5

### Accessibility
- WCAG 2.1 AAA: 100%
- Screen reader: 100%
- Keyboard navigation: 100%

### Performance
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1

## 💡 Pro Tips

### 1. Load Patterns First
Always check existing patterns before creating new designs:
```bash
~/.claude/agent-memory/ux/query-patterns.sh --context "dashboard"
```

### 2. Update Memory After Projects
Capture successful patterns:
```bash
~/.claude/agent-memory/ux/update-pattern.sh \
  --category form \
  --name "multi-step-wizard" \
  --metrics '{"completion_rate": 94, "satisfaction": 4.7}'
```

### 3. Maintain Design System
Keep component library current:
```bash
~/.claude/agent-memory/ux/update-design-system.sh \
  --type component \
  --name "Card" \
  --accessibility "WCAG-AAA"
```

### 4. Design for Accessibility
WCAG 2.1 AAA is not optional - it's the minimum standard.

### 5. Test Early
Validate designs before implementation to save time.

## 🎨 Design Principles Applied

Every UX Agent output follows:
- ✅ Nielsen's 10 Usability Heuristics
- ✅ Dieter Rams' 10 Principles of Good Design
- ✅ WCAG 2.1 AAA Accessibility
- ✅ Mobile-First Responsive Design
- ✅ Atomic Design Methodology
- ✅ Progressive Enhancement

## 🛠️ Memory Management

### View All Patterns
```bash
ls -la ~/.claude/agent-memory/ux/patterns/
```

### View Design System
```bash
cat ~/.claude/agent-memory/ux/design-systems/component-libraries.json | jq '.'
```

### View Accessibility Learnings
```bash
cat ~/.claude/agent-memory/ux/accessibility/wcag-compliance.json | jq '.'
```

## 📚 Documentation

- **Full Guide**: `/docs/UX-AGENT-GUIDE.md`
- **Agent Persona**: `/agents/ux-agent.md`
- **Implementation Summary**: `/docs/UX-AGENT-IMPLEMENTATION.md`
- **UX Outputs**: `/docs/sdlc/ux/README.md`

## 💰 Cost

**Per Project**:
- Tokens: ~80K in, ~25K out
- Cost: ~$0.61
- Value: Dramatically improved UX, accessibility, and consistency

## ❓ Common Questions

### Q: When is UX Agent invoked?
**A**: Automatically in Phase 3 of any SDLC workflow (after Architecture, before Development).

### Q: Can I skip UX for bug fixes?
**A**: Yes, Conductor automatically skips UX for pure backend fixes with no UI changes.

### Q: How does design consistency work?
**A**: UX Agent loads existing patterns from memory before creating new designs, ensuring consistency.

### Q: Is WCAG 2.1 AAA really required?
**A**: Yes. It's both a legal requirement and the right thing to do for users.

### Q: Can I use UX Agent for existing projects?
**A**: Yes. Invoke it standalone to review and improve existing implementations.

## 🎉 Ready to Start

Just run:
```bash
/sdlc-start [Your feature description]
```

The UX Agent will automatically create world-class user experiences with:
- User-centered design
- WCAG 2.1 AAA accessibility
- Modern aesthetics
- Design system consistency
- Performance optimization

**Great UX is invisible** - and now it's also automated.
