# AI-SDLC Project Templates

Pre-built project templates to accelerate development. Reference these templates when starting new SDLC workflows.

## Available Templates

| Template | Description | Typical Effort |
|----------|-------------|----------------|
| [auth-system](./auth-system/) | Complete authentication with OAuth, MFA, RBAC | 26-43 hours |
| [crud-api](./crud-api/) | RESTful CRUD API with validation and pagination | 9-12 hours |
| [microservice](./microservice/) | Production-ready microservice with observability | 19-35 hours |
| [vintiq-integration](./vintiq-integration/) | Vintiq product integration patterns | 34-76 hours |

## Usage

Reference a template in your SDLC start command:

```bash
# Use auth system template
/sdlc-start Build user authentication with OAuth, following templates/auth-system

# Use CRUD API template
/sdlc-start Build product management API, following templates/crud-api

# Use microservice template
/sdlc-start Build order processing microservice, following templates/microservice

# Use Vintiq integration template
/sdlc-start Build Costpoint project sync, following templates/vintiq-integration
```

## What's in Each Template

### Pre-defined Requirements
- Functional requirements (FR-xxx)
- Non-functional requirements (NFR-xxx)
- Acceptance criteria in Given/When/Then format

### Suggested Architecture
- Project structure
- Component layout
- API endpoint design
- Database schema

### Best Practices
- Security checklist
- Technology recommendations
- Testing strategies
- Deployment patterns

### Effort Estimates
- Phase-by-phase breakdown
- Total estimated hours

## Customizing Templates

Templates are starting points, not rigid constraints. The SDLC agents will:

1. **Use as baseline** - Start with template patterns
2. **Adapt to requirements** - Modify based on your specific needs
3. **Extend as needed** - Add features not in template
4. **Skip what's not needed** - Omit irrelevant sections

## Creating Custom Templates

To create your own template:

1. Create directory: `templates/[template-name]/`
2. Add `TEMPLATE.md` with:
   - Overview
   - Pre-defined requirements
   - Suggested architecture
   - Best practices
   - Effort estimates
3. Reference in SDLC commands

### Template Structure
```
templates/
├── README.md              # This file
├── auth-system/
│   └── TEMPLATE.md
├── crud-api/
│   └── TEMPLATE.md
├── microservice/
│   └── TEMPLATE.md
└── vintiq-integration/
    └── TEMPLATE.md
```

## Template Benefits

- **Faster starts** - Don't reinvent requirements
- **Consistency** - Standard patterns across projects
- **Best practices** - Built-in security and quality
- **Accurate estimates** - Based on real experience
- **Team knowledge** - Capture organizational patterns

---

*Templates are continuously improved based on project learnings.*
