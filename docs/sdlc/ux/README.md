# UX Design Outputs

This directory contains all UX design deliverables for SDLC projects.

## Directory Structure

```
ux/
├── UX-RESEARCH-{YYYYMMDD-HHMM}.md    # User research and personas
├── DESIGN-SYSTEM-{YYYYMMDD-HHMM}.md  # Design system specifications
├── WIREFRAMES-{YYYYMMDD-HHMM}.md     # Wireframes and mockups
├── UX-REVIEW-{YYYYMMDD-HHMM}.md      # Post-implementation UX review
├── components/                        # Component library
│   ├── Button.md
│   ├── Input.md
│   ├── Card.md
│   └── ...
└── assets/                           # Design assets
    ├── wireframes/
    ├── mockups/
    └── prototypes/
```

## Deliverable Types

### UX Research Report
- User personas with goals and pain points
- User journey maps
- Usability goals and success metrics
- Competitive analysis
- Design constraints

### Design System Specification
- Color palette (WCAG AAA compliant)
- Typography scale
- Spacing system
- Component library (Atomic Design)
- Icon library
- Animation principles
- Design tokens

### Wireframes & Mockups
- Low-fidelity wireframes
- High-fidelity mockups
- Interactive states
- Responsive variants
- Dark mode variants (if applicable)

### Component Library
- Reusable UI components
- Component specifications
- Usage guidelines
- Accessibility requirements
- Code examples

### UX Review Report
- Design implementation score
- Accessibility audit (WCAG 2.1 AAA)
- Usability metrics
- Performance metrics
- Recommendations for improvement

## Naming Convention

All UX deliverables follow the pattern:
```
{TYPE}-{YYYYMMDD-HHMM}.md
```

Where `TYPE` is one of:
- `UX-RESEARCH` - User research and personas
- `DESIGN-SYSTEM` - Design system specs
- `WIREFRAMES` - Wireframes and mockups
- `UX-REVIEW` - Post-implementation review

## Integration with SDLC

UX design happens in **Phase 3**, after Architecture and before Development:

1. **BA Agent** → Requirements
2. **Architect Agent** → Architecture
3. **UX Agent** → UX Design ← YOU ARE HERE
4. **Software Engineer** → Implementation
5. **Security Agent** → Security Review
6. **QA Agent** → Testing
7. **Atlas Agent** → Deployment
8. **Customer Agent** → Acceptance

## Quality Standards

All UX deliverables must meet:
- **Accessibility**: WCAG 2.1 AAA compliance
- **Usability**: Task completion >95%, error rate <2%
- **Performance**: LCP <2.5s, FID <100ms, CLS <0.1
- **Consistency**: >80% component reuse, 100% design system adherence

## Memory System

UX Agent learns from every design and stores patterns at:
```
~/.claude/agent-memory/ux/
├── patterns/          # Successful design patterns
├── design-systems/    # Component libraries and styles
├── accessibility/     # A11y learnings
├── user-research/     # Usability findings
├── performance/       # Performance patterns
└── solutions/         # What worked/didn't work
```

---

For complete UX Agent documentation, see: `docs/UX-AGENT-GUIDE.md`
