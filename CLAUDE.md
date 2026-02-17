# Project: [Your Project Name]

## AI-SDLC Configuration

This project uses the **Agentic AI-SDLC Framework** with specialized subagents for autonomous software development.

### Quick Start Commands

| Command | Description |
|---------|-------------|
| `/sdlc-start [description]` | Start full SDLC workflow for new feature/fix |
| `/sdlc-status` | Check status of all SDLC work |
| `/sdlc-review [path]` | Run comprehensive code review |
| `/sdlc-requirements [description]` | Run requirements gathering phase only |
| `/sdlc-architecture [description]` | Run architecture design phase only |
| `/sdlc-ux [description]` | Run UX design phase only |
| `/sdlc-security [path]` | Run security review phase only |

### Examples

```bash
# Start full SDLC workflow
/sdlc-start Build a user authentication system with OAuth 2.0 and MFA

# Run individual phases
/sdlc-requirements Gather requirements for user dashboard
/sdlc-architecture Design microservices architecture for payments
/sdlc-ux Design user experience for checkout flow
/sdlc-security Review authentication implementation

# Check progress
/sdlc-status

# Review code
/sdlc-review src/auth/
```

---

## SDLC Output Locations

| Content | Location |
|---------|----------|
| Requirements | `docs/sdlc/requirements/REQ-*.md` |
| Architecture | `docs/sdlc/architecture/ARCH-*.md` |
| ADRs | `docs/sdlc/architecture/ADR-*.md` |
| UX Research | `docs/sdlc/ux/UX-RESEARCH-*.md` |
| Design System | `docs/sdlc/ux/DESIGN-SYSTEM-*.md` |
| Wireframes | `docs/sdlc/ux/WIREFRAMES-*.md` |
| Security | `docs/sdlc/security/SECURITY-REVIEW-*.md` |
| Testing | `docs/sdlc/testing/TEST-REPORT-*.md` |
| Tracking | `docs/sdlc/tracking/SDLC-*.md` |

---

## Code Standards

### Architecture Pattern
**Layered Architecture** (mandatory):
```
src/
├── presentation/    # API controllers, validators, DTOs
├── application/     # Use cases, services
├── domain/          # Business logic (NO external deps)
└── infrastructure/  # Repositories, external APIs
```

### Quality Requirements
- **Test Coverage**: >80% on domain/application layers
- **Lint**: Zero warnings
- **Type Safety**: Strict mode enabled
- **Security**: No hardcoded secrets, input validation required

### Principles
- SOLID principles (mandatory)
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)
- Fail Fast (validate early, fail loudly)

---

## Technology Stack

[Define your project's technology stack here]

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | | |
| Framework | | |
| Database | | |
| Cache | | |

---

## Project Conventions

### Naming
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

### Git
- Branch naming: `feature/[ticket-id]-brief-description`
- Commit format: `type(scope): description`

### Documentation
- All public APIs must have documentation
- ADRs required for significant decisions
- README must include setup instructions

---

## Agent-Specific Notes

### For BA Agent
- [Project-specific requirements gathering notes]
- [Stakeholder information]

### For Architect Agent
- [Technology constraints]
- [Integration requirements]
- [Existing patterns to follow]

### For UX Agent
- [Design system preferences]
- [Brand guidelines]
- [Accessibility requirements (WCAG 2.1 AAA)]
- [Target user personas]
- [Performance budgets]

### For Software Engineer
- [Coding standards specific to this project]
- [Testing requirements]
- [Build commands]

### For Security Agent
- [Compliance requirements]
- [Security standards]
- [Deployment environment]

### For QA Agent
- [Test environment details]
- [Performance targets]
- [Critical user journeys]

---

## Environment Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development
npm run dev

# Build for production
npm run build
```

---

## Contacts

- **Product Owner**: [Name]
- **Tech Lead**: [Name]
- **Security**: [Name]

---

*Last updated: [Date]*
