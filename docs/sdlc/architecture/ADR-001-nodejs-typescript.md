# ADR-001: Use Node.js with TypeScript

## Status

**ACCEPTED** - 2026-01-15

## Context

We need to select a runtime and programming language for the Task Management API. The requirements specify:
- High performance (p95 < 200ms)
- Stateless design for horizontal scaling
- Open source technology stack
- Maintainability and type safety

### Options Considered

1. **Node.js + TypeScript**
2. Node.js + JavaScript
3. Python + FastAPI
4. Go
5. Java + Spring Boot

## Decision

We will use **Node.js 20 LTS with TypeScript 5.x**.

## Rationale

### Why Node.js

| Factor | Assessment |
|--------|------------|
| **Performance** | Excellent for I/O-bound workloads (async event loop) |
| **Ecosystem** | Massive npm registry, mature libraries for all needs |
| **Scalability** | Non-blocking I/O, lightweight, easy horizontal scaling |
| **Developer Experience** | Familiar to most web developers |
| **Operational** | Low memory footprint, fast startup |

### Why TypeScript

| Factor | Assessment |
|--------|------------|
| **Type Safety** | Catches errors at compile time |
| **IDE Support** | Excellent autocomplete, refactoring |
| **Maintainability** | Self-documenting code, easier onboarding |
| **Ecosystem** | First-class support in Node.js ecosystem |
| **ORM Integration** | Prisma provides end-to-end type safety |

### Comparison Matrix

| Criterion | Node+TS | Node+JS | Python | Go | Java |
|-----------|---------|---------|--------|-----|------|
| Performance | Good | Good | Good | Excellent | Good |
| Type Safety | Excellent | Poor | Good | Excellent | Excellent |
| Ecosystem | Excellent | Excellent | Good | Growing | Excellent |
| Learning Curve | Low | Low | Low | Medium | High |
| Memory Usage | Low | Low | Medium | Very Low | High |
| Startup Time | Fast | Fast | Medium | Very Fast | Slow |

## Consequences

### Positive

- **Type safety** prevents runtime errors and improves code quality
- **Excellent tooling** with VS Code, ESLint, Prettier
- **End-to-end type safety** with Prisma ORM
- **Large talent pool** for maintenance and scaling
- **Fast iteration** with hot reload and quick feedback loop

### Negative

- **Build step required** (TypeScript compilation)
- **Type definitions** needed for some libraries
- **Not optimal for CPU-intensive** operations (use worker threads)

### Mitigation

- Use `ts-node-dev` for development hot reload
- Use `@types/*` packages or write custom declarations
- Offload CPU-intensive work to worker threads or separate services

## Related Decisions

- ADR-002: Database selection (PostgreSQL + Prisma)
- ADR-004: Layered Architecture pattern

## References

- [Node.js Documentation](https://nodejs.org/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [State of JS 2025 Survey Results]
