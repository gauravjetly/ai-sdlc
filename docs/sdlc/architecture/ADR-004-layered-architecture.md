# ADR-004: Use Layered Architecture

## Status

**ACCEPTED** - 2026-01-15

## Context

We need to select an architectural pattern for the Task Management API that supports:
- Maintainability and testability
- Clear separation of concerns
- Domain logic isolation
- Flexibility for future changes
- Appropriate complexity for project scope

### Options Considered

1. **Layered Architecture (Clean Architecture principles)**
2. Hexagonal Architecture (Ports & Adapters)
3. Microservices Architecture
4. Simple MVC Pattern
5. Vertical Slice Architecture

## Decision

We will use **Layered Architecture** with Clean Architecture principles.

## Rationale

### Architecture Comparison

| Criterion | Layered | Hexagonal | Microservices | MVC | Vertical Slice |
|-----------|---------|-----------|---------------|-----|----------------|
| Complexity | Medium | High | Very High | Low | Medium |
| Testability | Excellent | Excellent | Excellent | Good | Good |
| Maintainability | Excellent | Excellent | Medium | Good | Good |
| Learning Curve | Low | Medium | High | Very Low | Medium |
| Team Size Fit | 1-10 | 1-10 | 10+ | 1-5 | 5-20 |
| Project Scope | Appropriate | Overkill | Overkill | Too Simple | Appropriate |

### Why Layered Architecture

1. **Clear boundaries** - Each layer has defined responsibilities
2. **Dependency direction** - Dependencies flow inward (toward domain)
3. **Testability** - Each layer can be tested independently
4. **Maintainability** - Changes isolated to specific layers
5. **Familiar pattern** - Well-understood by most developers

## Layer Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  Routes, Controllers, Middleware, Validators, DTOs           │
│  Responsibility: HTTP handling, request/response mapping     │
├─────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                        │
│  Services, Use Cases, Application Logic                      │
│  Responsibility: Orchestrate domain operations               │
├─────────────────────────────────────────────────────────────┤
│                       DOMAIN LAYER                           │
│  Entities, Value Objects, Domain Services, Business Rules    │
│  Responsibility: Core business logic (NO dependencies)       │
├─────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                      │
│  Repositories, Database, External Services                   │
│  Responsibility: Technical implementation details            │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Rules

```
Presentation ──────► Application ──────► Domain
      │                   │                 ▲
      │                   │                 │
      │                   ▼                 │
      └────────────► Infrastructure ────────┘
                    (implements interfaces)
```

**Key Rule**: Domain layer has NO dependencies on other layers.

## Implementation

### Layer Responsibilities

#### Presentation Layer

```typescript
// Controller - handles HTTP concerns only
export class TaskController {
  constructor(private taskService: TaskService) {}

  async create(req: Request, res: Response): Promise<void> {
    const dto = CreateTaskDto.fromRequest(req.body);
    const task = await this.taskService.create(req.user.id, dto);
    res.status(201).json(TaskResponseDto.fromEntity(task));
  }
}
```

#### Application Layer

```typescript
// Service - orchestrates business operations
export class TaskService {
  constructor(private taskRepository: ITaskRepository) {}

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    const task = Task.create({
      userId,
      title: dto.title,
      description: dto.description,
      // ... other fields
    });
    return this.taskRepository.save(task);
  }
}
```

#### Domain Layer

```typescript
// Entity - contains business logic
export class Task {
  static create(props: CreateTaskProps): Task {
    // Business validation
    if (!props.title?.trim()) {
      throw new ValidationError('Title is required');
    }
    // ... create entity
  }

  complete(): void {
    if (this._status === TaskStatus.DONE) {
      throw new DomainError('Task already completed');
    }
    this._status = TaskStatus.DONE;
    this._updatedAt = new Date();
  }
}
```

#### Infrastructure Layer

```typescript
// Repository - implements data access
export class TaskRepository implements ITaskRepository {
  constructor(private prisma: PrismaClient) {}

  async save(task: Task): Promise<Task> {
    await this.prisma.task.upsert({
      where: { id: task.id },
      create: this.toPersistence(task),
      update: this.toPersistence(task)
    });
    return task;
  }
}
```

### Directory Structure

```
src/
├── presentation/        # HTTP layer
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── validators/      # Input validation
│   ├── dto/            # Data transfer objects
│   └── routes/         # Route definitions
├── application/         # Use case layer
│   ├── services/       # Application services
│   └── interfaces/     # Repository interfaces
├── domain/             # Business logic
│   ├── entities/       # Domain entities
│   ├── value-objects/  # Immutable values
│   └── errors/         # Domain exceptions
└── infrastructure/      # Technical details
    ├── database/       # DB connection, repos
    ├── security/       # Auth implementation
    └── config/         # Configuration
```

## Consequences

### Positive

- **Testable** - Mock dependencies easily at each layer
- **Maintainable** - Changes isolated to appropriate layers
- **Understandable** - Clear structure for new developers
- **Flexible** - Can swap implementations (e.g., different DB)
- **Domain-focused** - Business logic protected from tech changes

### Negative

- **More files** - Structure requires more directories/files
- **Indirection** - Data flows through multiple layers
- **Potential overengineering** - For very simple features

### Mitigation

- Keep layers thin - don't over-abstract
- Use code generators for boilerplate
- Allow pragmatic shortcuts for truly simple operations

## Testing Strategy by Layer

| Layer | Test Type | Dependencies |
|-------|-----------|--------------|
| Domain | Unit | None |
| Application | Unit | Mock repos |
| Presentation | Integration | Mock services |
| Infrastructure | Integration | Test DB |

## Related Decisions

- ADR-001: Node.js + TypeScript (enables clean interfaces)
- ADR-002: PostgreSQL + Prisma (infrastructure implementation)

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://domainlanguage.com/ddd/)
