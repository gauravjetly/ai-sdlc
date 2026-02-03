# UX Agent - Complete Guide

## Overview

The **UX Agent** is a self-learning User Experience specialist that ensures every interface is user-centered, accessible, modern, consistent, and delightful. It integrates seamlessly into the AI-SDLC workflow between Architecture (Phase 2) and Development (Phase 4).

## 🎯 Key Features

### 1. Self-Learning with RAG Memory
The UX Agent learns from every design cycle and stores knowledge in:
- **Design Patterns**: Navigation, forms, data visualization, interactions
- **Design Systems**: Components, colors, typography, spacing, icons
- **Accessibility**: WCAG compliance, screen reader patterns, keyboard navigation
- **User Research**: Usability findings, user feedback, personas, journey maps
- **Performance**: Core Web Vitals, progressive enhancement, optimization

### 2. Design Parity Across Products
Automatically ensures consistency by:
- Loading existing design patterns before creating new ones
- Checking company design system for reusable components
- Validating against established color palettes and typography
- Maintaining consistent spacing, icons, and animations

### 3. World-Class UX Principles
Follows best practices from:
- **Don Norman** (Human-Centered Design)
- **Jakob Nielsen** (10 Usability Heuristics)
- **Dieter Rams** (10 Principles of Good Design)
- **Brad Frost** (Atomic Design)
- **WCAG 2.1 AAA** (Accessibility Standards)

## 🔄 Integration in SDLC

### Updated 8-Phase Workflow

```
BA Agent → Architect (Jets) → UX Agent → Software Engineer →
Security → QA → Atlas (DevOps) → Customer
```

| Phase | Agent | Responsibility |
|-------|-------|----------------|
| 1 | BA Agent | Requirements, user stories |
| 2 | Architect | Technical architecture |
| **3** | **UX Agent** | **UX research, design system, wireframes** |
| 4 | Software Engineer | Implementation |
| 5 | Security | Security review |
| 6 | QA | Testing |
| 7 | Atlas | Deployment |
| 8 | Customer | Acceptance |

## 📋 UX Agent Deliverables

### Phase 3A: UX Research
**Output**: `docs/sdlc/ux/UX-RESEARCH-{ID}.md`

Contains:
- User personas with goals and pain points
- User journey maps
- Usability goals (task completion, error rate, satisfaction)
- Competitive analysis
- Design constraints

### Phase 3B: Design System
**Output**: `docs/sdlc/ux/DESIGN-SYSTEM-{ID}.md`

Contains:
- Color palette (WCAG AAA compliant)
- Typography scale (responsive)
- Spacing system (consistent grid)
- Component library (Atomic Design)
- Icon library
- Animation principles
- Design tokens (JSON/CSS/JS)

### Phase 3C: Wireframes & Prototypes
**Output**: `docs/sdlc/ux/WIREFRAMES-{ID}.md`

Contains:
- Low-fidelity wireframes
- High-fidelity mockups
- Interactive states (hover, active, disabled, error)
- Responsive variants (mobile, tablet, desktop)
- Dark mode variants (if applicable)

### Phase 3D: Component Library
**Output**: `docs/sdlc/ux/components/`

Contains:
- Reusable UI components
- Component specifications
- Usage guidelines
- Accessibility requirements
- Code examples

## 💾 RAG Memory System

### Memory Location
```
~/.claude/agent-memory/ux/
├── patterns/
│   ├── navigation-patterns.json
│   ├── form-patterns.json
│   ├── data-visualization.json
│   ├── interaction-patterns.json
│   ├── responsive-patterns.json
│   └── animation-patterns.json
├── design-systems/
│   ├── component-libraries.json
│   ├── color-palettes.json
│   ├── typography-scales.json
│   ├── spacing-systems.json
│   └── icon-libraries.json
├── accessibility/
│   ├── wcag-compliance.json
│   ├── screen-reader-patterns.json
│   ├── keyboard-navigation.json
│   └── inclusive-design.json
├── user-research/
│   ├── usability-findings.json
│   ├── user-feedback.json
│   ├── persona-insights.json
│   └── journey-maps.json
├── performance/
│   ├── core-web-vitals.json
│   ├── progressive-enhancement.json
│   └── optimization-techniques.json
├── solutions/
│   ├── successful-designs.json
│   ├── failed-designs.json
│   └── design-iterations.json
└── projects/
    └── {project-id}/
        ├── design-system.json
        ├── user-personas.json
        ├── design-decisions.json
        └── usability-reports.json
```

### Helper Scripts

#### Update Pattern Memory
```bash
~/.claude/agent-memory/ux/update-pattern.sh \
  --category navigation \
  --name "multi-level-sidebar" \
  --context "Enterprise dashboard with 100+ menu items" \
  --metrics '{"user_satisfaction": 4.8, "task_completion_rate": 96}' \
  --lessons "Collapsible sections improved discoverability"
```

#### Update Design System
```bash
~/.claude/agent-memory/ux/update-design-system.sh \
  --type component \
  --name "ButtonPrimary" \
  --variant "large" \
  --accessibility "WCAG-AAA" \
  --usage "Use for primary actions like submit, save" \
  --spec '{"min_height": "44px", "min_width": "88px", "contrast": "7:1"}'
```

#### Query Patterns
```bash
~/.claude/agent-memory/ux/query-patterns.sh \
  --category navigation \
  --min-satisfaction 4.5 \
  --recent 5
```

## 🎨 Design Principles

### Nielsen's 10 Usability Heuristics
1. Visibility of system status
2. Match between system and real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

### Dieter Rams' 10 Principles
Good design is:
1. Innovative
2. Makes a product useful
3. Aesthetic
4. Makes a product understandable
5. Unobtrusive
6. Honest
7. Long-lasting
8. Thorough down to the last detail
9. Environmentally friendly
10. As little design as possible

### WCAG 2.1 AAA Requirements
- **Perceivable**: All users can perceive content
- **Operable**: All users can operate the interface
- **Understandable**: Content and operation are understandable
- **Robust**: Works with current and future technologies

## 📊 Success Metrics

### Usability Metrics
- **Task Completion Rate**: Target >95%
- **Error Rate**: Target <2%
- **Time on Task**: Baseline vs optimized
- **User Satisfaction**: Target >4.5/5

### Accessibility Metrics
- **WCAG 2.1 AAA Compliance**: 100%
- **Screen Reader Compatibility**: 100%
- **Keyboard Navigation**: 100%
- **Color Contrast**: Minimum 7:1

### Performance Metrics
- **LCP (Largest Contentful Paint)**: <2.5s
- **FID (First Input Delay)**: <100ms
- **CLS (Cumulative Layout Shift)**: <0.1
- **Page Load Time**: <3s

### Design Consistency
- **Component Reuse**: >80%
- **Design System Adherence**: 100%
- **Cross-Product Consistency**: Measured via design audits

## 🚀 Usage Examples

### Standalone UX Review
```
/sdlc-ux review src/components/
```

### Full SDLC with UX
```
/sdlc-start Build a user dashboard with real-time analytics
```

The UX Agent will be invoked automatically after architecture design.

### Post-Implementation UX Validation
```
Use the ux-agent to validate the implementation against design specs.

Context:
- Design System: docs/sdlc/ux/DESIGN-SYSTEM-20260202.md
- Implementation: src/components/
```

## 🔍 UX Review Checklist

Before UX Agent marks a phase complete:

### Research Phase
- [ ] User personas documented
- [ ] User journey maps created
- [ ] Usability goals defined
- [ ] Accessibility requirements identified
- [ ] Competitive analysis complete

### Design Phase
- [ ] Design system documented
- [ ] Color palette defined (accessible)
- [ ] Typography scale established
- [ ] Component library created
- [ ] Responsive strategy defined
- [ ] Animation principles documented

### Review Phase
- [ ] Visual design validated
- [ ] Accessibility tested (WCAG 2.1 AAA)
- [ ] Usability metrics measured
- [ ] Performance benchmarked
- [ ] Design system consistency verified

### Memory Updates
- [ ] Patterns stored
- [ ] Design system updated
- [ ] Accessibility insights captured
- [ ] User feedback documented
- [ ] Project memory updated

## 🎓 Best Practices

### 1. Design for Edge Cases First
If it works for users with disabilities, it works for everyone.

### 2. Test Early, Test Often
Don't wait for implementation to validate designs.

### 3. Design Systems are Living Documents
Update continuously as patterns evolve.

### 4. Performance is UX
Slow is broken. Always consider performance impact.

### 5. Consistency > Creativity
Users want familiar, not fancy.

### 6. Accessibility is Not Optional
It's a legal and ethical requirement.

### 7. Mobile-First Forces Prioritization
Start with the smallest canvas to focus on what matters.

### 8. Content is King
Design serves content, not the other way around.

### 9. User Research Beats Opinions
Data > assumptions. Always validate with real users.

### 10. Perfect is the Enemy of Good
Ship and iterate based on feedback.

## 🛠️ Tools & Technologies

### Design Tools
- Figma (collaborative design)
- Sketch (UI design)
- Adobe XD (prototyping)
- Framer (interactive prototypes)

### Accessibility Tools
- axe DevTools (automated testing)
- WAVE (web accessibility evaluation)
- Lighthouse (performance + accessibility)
- Screen readers (NVDA, JAWS, VoiceOver)

### Development Tools
- Storybook (component library)
- Chromatic (visual regression)
- Percy (visual testing)

## 💰 Cost Tracking

The UX Agent is included in FinOps cost tracking:

**Typical Token Usage**:
- Input: ~80K tokens
- Output: ~25K tokens
- Cost: ~$0.61 per project

**Total Project Cost with UX**: ~$9-16 for all AI agents

## 📚 Additional Resources

### WCAG Guidelines
- https://www.w3.org/WAI/WCAG21/quickref/

### Nielsen Norman Group
- https://www.nngroup.com/

### Design System Examples
- Material Design: https://material.io/
- Ant Design: https://ant.design/
- Carbon Design: https://carbondesignsystem.com/

### Accessibility Resources
- WebAIM: https://webaim.org/
- A11Y Project: https://www.a11yproject.com/

---

## 🎯 Summary

The UX Agent ensures that every feature built through the AI-SDLC is:
- **User-Centered**: Solves real problems elegantly
- **Accessible**: WCAG 2.1 AAA compliant
- **Modern**: Contemporary aesthetics
- **Consistent**: Design parity across products
- **Delightful**: Exceeds user expectations

It learns from every project and becomes smarter over time, building a comprehensive knowledge base of successful design patterns, accessibility solutions, and user research insights.

**Great UX is invisible** - users accomplish their goals effortlessly without thinking about the interface.
