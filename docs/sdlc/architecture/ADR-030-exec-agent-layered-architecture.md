# ADR-030: Layered Architecture for Exec Agent (Python)

## Status
Proposed

## Date
2026-02-17

## Context

The Exec Agent is currently implemented as a single Python class (`ExecAgent`) of approximately 528 lines in one file (`exec-agent.py`). This monolithic structure has several problems:

1. **No separation of concerns** -- Slide selection, content generation, rendering, branding, and file I/O are all interleaved in one class.
2. **Untestable domain logic** -- The business rules for slide composition and brand validation are embedded in methods that directly create python-pptx objects, making unit testing require full PPTX file generation.
3. **No extensibility** -- Adding a new slide type requires modifying the central class. Adding a new output format (PDF, HTML) would require rewriting.
4. **No dependency inversion** -- The class directly instantiates infrastructure dependencies (file paths, Presentation objects), making it impossible to substitute implementations.
5. **The broader AI-SDLC platform mandates layered architecture** (see CLAUDE.md project conventions).

The Exec Agent must evolve to support LLM integration, agent mesh communication, a learning system, scheduling, and an API server -- none of which can be cleanly added to the current structure.

### Options Considered

1. **Layered Architecture (Presentation / Application / Domain / Infrastructure)** -- The standard pattern mandated by the AI-SDLC platform.
2. **Hexagonal Architecture (Ports and Adapters)** -- Domain at center with input/output ports. More formal separation but more complex for a Python codebase of this size.
3. **Plugin Architecture** -- Core engine with pluggable slide generators, renderers, and data sources. Maximum flexibility but high complexity for initial implementation.
4. **Modular Monolith** -- Separate Python modules with clear boundaries but no strict layer enforcement.
5. **Keep Existing** -- Continue evolving the single-class approach.

## Decision

We will implement **Layered Architecture** with four layers, following the AI-SDLC platform convention:

```
Presentation Layer  -- CLI, API, Agent Mesh interface
Application Layer   -- Orchestration, scheduling, feedback collection
Domain Layer        -- Slide composition, brand validation, learning, quality scoring
Infrastructure Layer -- PPTX rendering, Mermaid rendering, file storage, API clients
```

**Critical constraint: The Domain Layer has ZERO external dependencies.** It defines interfaces (Python ABCs/Protocols) that the Infrastructure Layer implements. This enables:
- Unit testing of all business logic without python-pptx, file I/O, or network calls
- Swapping implementations (different LLM providers, different rendering engines)
- Clear reasoning about what is business logic vs what is technology

### Layer Dependency Rules

```
Presentation --> Application --> Domain <-- Infrastructure
                                  ^            |
                                  |            |
                                  +--- implements interfaces ---+
```

- Presentation calls Application services
- Application orchestrates Domain objects
- Domain defines interfaces for external capabilities
- Infrastructure implements Domain interfaces
- **No layer depends on a layer above it**

## Consequences

### Positive

- **Testability**: Domain logic (slide selection, brand validation, quality scoring, learning) can be unit tested with zero infrastructure
- **Extensibility**: New slide types, output formats, and data sources can be added by implementing domain interfaces
- **Maintainability**: Each file has a single clear responsibility, following SOLID principles
- **Platform compliance**: Matches the layered architecture pattern mandated by the AI-SDLC platform CLAUDE.md
- **Team clarity**: Clear boundaries make it obvious where new code belongs

### Negative

- **More files**: The single 528-line file becomes approximately 20 files across 4 layers. This is more initial scaffolding.
- **Indirection**: Data flows through DTOs between layers, adding some mapping overhead. Mitigated by keeping DTOs simple (Pydantic models).
- **Migration effort**: Existing working code must be decomposed into layers. Risk of introducing bugs during migration. Mitigated by writing tests for existing behavior first.

### Neutral

- Python's module system naturally supports this pattern via packages (`exec_agent/domain/`, `exec_agent/infrastructure/`, etc.)
- Pydantic v2 provides the validation and serialization needed for DTOs between layers
- The existing venv with Python 3.14 supports all required features

## Notes

The domain layer interfaces file (`exec_agent/domain/interfaces.py`) defines these key abstractions:

```python
from abc import ABC, abstractmethod

class ContentSynthesizerPort(ABC):
    """Port for LLM-based content generation."""
    @abstractmethod
    def synthesize(self, slide_type, raw_data, audience, constraints) -> SlideContent: ...

class DiagramRendererPort(ABC):
    """Port for diagram rendering."""
    @abstractmethod
    def render(self, diagram_type, data, style) -> Diagram: ...

class MemoryStorePort(ABC):
    """Port for persistent storage."""
    @abstractmethod
    def read(self, path) -> Optional[Dict]: ...
    @abstractmethod
    def write(self, path, data) -> None: ...

class AgentMeshPort(ABC):
    """Port for agent mesh communication."""
    @abstractmethod
    def send_message(self, receiver, message) -> None: ...
    @abstractmethod
    def poll_inbox(self) -> List[AgentMessage]: ...

class TemplateLoaderPort(ABC):
    """Port for template loading."""
    @abstractmethod
    def load_template(self) -> Tuple[Presentation, LayoutMap]: ...
```

Infrastructure implementations (`ClaudeClient`, `MermaidRenderer`, `FileMemoryStore`, `AgentMeshClient`, `PptxTemplateLoader`) implement these ports, and are injected into domain/application services at bootstrap time.
