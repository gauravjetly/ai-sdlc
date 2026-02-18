# ARCH-20260217-EXEC-AGENT-V2

## Architecture: Fully Agentic, Best-in-Class Learning Executive Presentation Specialist

**Version**: 2.0.0
**Date**: 2026-02-17
**Author**: Jets (World-Class Architect)
**Status**: Proposed
**Predecessor**: ARCH-20260217-EXEC-AGENT (V1)
**Classification**: Agent Architecture - Strategic

---

## 1. Executive Summary

This document defines the V2 architecture that transforms the Exec Agent from a well-structured but passive presentation generator into a **fully autonomous, self-improving, mesh-native intelligence** that anticipates executive needs before they are expressed.

### The V1 to V2 Transformation

| Dimension | V1 (Current -- Implemented) | V2 (Target) |
|-----------|---------------------------|-------------|
| **Trigger Model** | Manual CLI/API invocation, basic event subscriptions | Autonomous decision engine with 12 trigger rules, cooldowns, priority queue |
| **Learning** | Bayesian Thompson Sampling on own feedback (6 signals) | Meta-learning that tunes its own hyperparameters + transfer learning across projects |
| **Knowledge Source** | Own generation history only | Cross-agent absorption from all 12 agents via collective intelligence |
| **Mesh Integration** | Event subscriptions + publish (10 handlers) | Full first-class citizen with "exec" AgentId, bidirectional learning, collaborative authoring |
| **Output Format** | PPTX only | Multi-modal: PPTX + PDF + HTML dashboard + executive briefing script |
| **Intelligence** | Reactive (responds to events) | Proactive (predicts what executives need, suggests before asked) |
| **Collaboration** | Sole author | Multi-agent collaborative deck authoring with contribution protocol |
| **Scale** | Single project | 1000+ concurrent projects with priority-based scheduling |

### What V1 Already Delivers (Fully Preserved)

The V1 architecture is implemented and passing all 73 tests. V2 extends V1 without modifying any existing working code:

- Layered architecture: Presentation / Application / Domain / Infrastructure
- Domain entities: Presentation, Slide, Diagram, AudienceProfile, BrandConfig, Feedback, LearningModel, AgentEvent
- Domain interfaces: EventBusPort, LearningEnginePort, MemoryStorePort, ContentSynthesizerPort, DiagramRendererPort, PresentationRendererPort, AgentMeshPort, VersionStorePort, TemplateLoaderPort
- Infrastructure: BayesianLearningEngine (Thompson Sampling, Beta distributions, 6-signal weights), FileEventBus (atomic writes, background polling, inbox/outbox/archive), FileMemoryStore, ClaudeContentSynthesizer, MermaidDiagramRenderer, PptxPresentationRenderer, QualityScorer (6-dimensional), DegradationManager, KnowledgeGraph, CrossAgentLearner
- Application: PresentationGenerator, EventOrchestrator (10 event subscriptions), AutoUpdater, VersionManager, ProjectEventHandler, SecurityEventHandler, FeedbackEventHandler
- Presentation: CLI commands

### What V2 Adds (This Document)

Five new architectural subsystems, each described in detail below:

| # | Subsystem | Purpose | ADR |
|---|-----------|---------|-----|
| 1 | **Autonomous Behavior Engine** | Event-driven decision-making about when, what, and for whom to generate | ADR-036 |
| 2 | **Meta-Learning Engine** | Learns how to learn: self-tunes signal weights, decay rates, shrinkage | ADR-034 |
| 3 | **Multi-Modal Output Service** | PPTX + PDF + HTML + briefing script from single domain model | ADR-035 |
| 4 | **Collective Intelligence Reader** | Absorbs knowledge from all mesh agents for slide enrichment | -- |
| 5 | **Transfer Learning Extractor** | Identifies project-agnostic insights and seeds new projects | -- |

---

## 2. Architecture Overview

### 2.1 Complete System Context

```
+============================================================================+
|                        EXTERNAL WORLD                                       |
|  Executives | Stakeholders | Dashboard | Email | Slack                     |
+=====+==========================+=======================================+====+
      |                          |                                       |
      v                          v                                       v
+============================================================================+
|                   EXEC AGENT V2 -- FULLY AGENTIC                           |
|                                                                            |
|  +-------------------------------------------------------------------+    |
|  |                    PRESENTATION LAYER                              |    |
|  |  CLI | API | Agent Mesh Interface | Autonomous Trigger Listener   |    |
|  +-------------------------------------------------------------------+    |
|  |                    APPLICATION LAYER                               |    |
|  |  PresentationOrchestrator    | AutonomousBehaviorEngine           |    |
|  |  EventOrchestrator           | CollaborativeAuthoringCoordinator  |    |
|  |  AutoUpdater | VersionManager | ExportService                     |    |
|  +-------------------------------------------------------------------+    |
|  |                    DOMAIN LAYER (Pure Logic)                       |    |
|  |  SlideComposer | ContentSynthesizer | DiagramEngine | BrandValid. |    |
|  |  AudienceProfiler | LearningEngine | QualityScorer | TemplateRes. |    |
|  |  [V2] MetaLearningController | TransferLearningExtractor          |    |
|  |  [V2] CrossAgentKnowledgeAbsorber | ProactiveIntelligenceEngine   |    |
|  |  [V2] AutonomousDecisionRules | MultiModalOutputStrategy          |    |
|  +-------------------------------------------------------------------+    |
|  |                    INFRASTRUCTURE LAYER                            |    |
|  |  PptxRenderer | MermaidRenderer | FileMemoryStore | FileEventBus  |    |
|  |  ClaudeClient | QualityScorer | DegradationManager               |    |
|  |  [V2] EventStreamClient | PdfRenderer | HtmlRenderer              |    |
|  |  [V2] CollectiveMemoryReader | LearningEventEmitter               |    |
|  |  [V2] CooldownStore | PriorityQueueStore                         |    |
|  +-------------------------------------------------------------------+    |
|                                                                            |
+========+=================+==================+================+=============+
         |                 |                  |                |
         v                 v                  v                v
+----------------+ +---------------+ +---------------+ +------------------+
| Agent Mesh     | | SDLC Registry | | Claude API    | | File System      |
| (TypeScript)   | | (Events)      | | (Content)     | | (Memory/Output)  |
| - Message Bus  | | - Projects    | | - Synthesis   | | - Presentations  |
| - Collective   | | - Architecture| | - Scripts     | | - Learning Data  |
|   Memory       | | - Security    | |               | | - Versions       |
| - Learning     | | - Tests       | |               | | - Cooldowns      |
|   Engine       | | - Tracking    | |               | |                  |
+----------------+ +---------------+ +---------------+ +------------------+
```

### 2.2 Enhanced Layered Architecture Detail

```
DEPENDENCY RULE: Each layer depends ONLY on the layer directly below it.
Domain layer has ZERO external dependencies (pure business logic).

+============================================================================+
|                         PRESENTATION LAYER                                  |
|                                                                            |
|  [Existing]                          [V2 New]                              |
|  cli/commands.py                     autonomous_trigger_listener.py        |
|  (API server -- planned)             (Watches mesh events, triggers ABE)   |
|                                                                            |
+============================================================================+
|                         APPLICATION LAYER                                   |
|                                                                            |
|  [Existing]                          [V2 New]                              |
|  PresentationGenerator               AutonomousBehaviorEngine              |
|  EventOrchestrator (10 subs)         CollaborativeAuthoringCoordinator     |
|  AutoUpdater                         ExportService                         |
|  VersionManager                                                            |
|  ProjectEventHandler                                                       |
|  SecurityEventHandler                                                      |
|  FeedbackEventHandler                                                      |
|                                                                            |
+============================================================================+
|                           DOMAIN LAYER (Pure Logic)                         |
|                                                                            |
|  [Existing - 8 Entities]             [V2 New Entities]                     |
|  Presentation                        AutonomousAction                      |
|  Slide                               TriggerRule                           |
|  Diagram                             ProactiveSuggestion                   |
|  AudienceProfile                     HyperparameterSet                     |
|  BrandConfig                         TransferableInsight                   |
|  Feedback / FeedbackSignal           KnowledgeEnrichment                   |
|  LearningModel (Bayesian)            MultiModalOutput                      |
|  AgentEvent                          CollaborativeContribution             |
|                                                                            |
|  [Existing - 9 Interfaces/Ports]     [V2 New Interfaces]                   |
|  EventBusPort                        CollectiveMemoryPort                  |
|  LearningEnginePort                  CooldownStorePort                     |
|  MemoryStorePort                     OutputRendererPort (Protocol)         |
|  ContentSynthesizerPort              MetaLearningPort                      |
|  DiagramRendererPort                                                       |
|  PresentationRendererPort                                                  |
|  AgentMeshPort                                                             |
|  VersionStorePort                                                          |
|  TemplateLoaderPort                                                        |
|                                                                            |
|  [Existing - Domain Services]        [V2 New Domain Services]              |
|  BayesianPreferenceModel             MetaLearningController                |
|  EffectivenessScore                  TransferLearningExtractor             |
|  BetaDistribution                    CrossAgentKnowledgeAbsorber           |
|  QualityScore                        ProactiveIntelligenceEngine           |
|  LearningRecord                      AutonomousDecisionRules               |
|                                      MultiModalOutputStrategy              |
|                                                                            |
+============================================================================+
|                       INFRASTRUCTURE LAYER                                  |
|                                                                            |
|  [Existing]                          [V2 New]                              |
|  BayesianLearningEngine              EventStreamClient                     |
|  FileEventBus                        PdfRenderer                           |
|  FileMemoryStore                     HtmlRenderer                          |
|  ClaudeContentSynthesizer            BriefingScriptWriter                  |
|  MermaidDiagramRenderer              CollectiveMemoryReader                |
|  PptxPresentationRenderer            LearningEventEmitter                  |
|  QualityScorer                       FileCooldownStore                     |
|  DegradationManager                  FilePriorityQueueStore                |
|  KnowledgeGraph                      MetaLearningAnalyzer                  |
|  CrossAgentLearner                   TransferKnowledgeStore                |
|                                                                            |
+============================================================================+
```

---

## 3. Component Architecture: V2 Additions

### 3.1 Autonomous Behavior Engine (ABE)

The ABE is the central nervous system that makes the Exec Agent fully agentic. It observes the SDLC event stream and autonomously decides when to generate, update, or suggest presentations.

#### 3.1.1 Architecture

```
                             SDLC EVENT STREAM
                                    |
                                    v
                         +--------------------+
                         | Event Stream       |
                         | Client             |
                         | (polls inbox +     |
                         |  mesh events/15s)  |
                         +--------+-----------+
                                  |
                                  v
                         +--------------------+
                         | Event Classifier   |
                         | (maps event to     |
                         |  domain event type)|
                         +--------+-----------+
                                  |
                                  v
                         +--------------------+
                         | Autonomous         |
                         | Decision Rules     |
                         | Engine             |
                         | (evaluates rules   |
                         |  against state)    |
                         +--------+-----------+
                                  |
                         +--------v-----------+
                         | Cooldown           |
                         | Manager            |
                         | (prevents storms)  |
                         +--------+-----------+
                                  |
                              +---+---+
                              |       |
                         PASS |       | SKIP
                              v       v
                    +-----------+  +----------+
                    | Priority  |  | Log      |
                    | Queue     |  | (reason) |
                    | (max 20)  |  +----------+
                    +-----+-----+
                          |
                          v
                    +-----------+
                    | Queue     |
                    | Processor |
                    | (max 3    |
                    |  concurrent)
                    +-----+-----+
                          |
                          v
                    +---------------+
                    | V1 Pipeline   |
                    | Orchestrator  |
                    +-------+-------+
                            |
                            v
                    +---------------+
                    | Multi-Modal   |
                    | Export        |
                    +---------------+
```

#### 3.1.2 Trigger Rules

The ABE evaluates a configurable set of rules against incoming events. Each rule specifies what triggers it, what conditions must be met, what action to take, and how long to cool down before it can fire again.

**Safety Principle**: The agent NEVER generates unsolicited output without a clear event trigger AND passing ALL conditions. This prevents runaway generation.

```python
# Domain entity: TriggerRule
@dataclass
class TriggerRule:
    id: str                        # e.g., "R-001"
    name: str                      # Human-readable name
    event_pattern: str             # Event type to match
    source_agents: List[str]       # Which agents can trigger this
    action: str                    # "generate" | "update" | "suggest" | "self-improve"
    presentation_type: Optional[PresentationType]
    audience: Optional[AudienceType]
    cooldown_minutes: int          # Minimum interval between firings
    priority: str                  # "critical" | "high" | "normal" | "low"
    conditions: List[str]          # Predicate expressions to evaluate
    rationale: str                 # Why this rule exists
    enabled: bool = True
```

**Initial Rule Set (12 rules)**:

| ID | Name | Event | Action | Cooldown | Priority |
|----|------|-------|--------|----------|----------|
| R-001 | project-complete-summary | project.completed | generate exec-summary | 60 min | high |
| R-002 | architecture-change-update | architecture.updated | update arch slides | 120 min | normal |
| R-003 | security-critical-finding | security.vulnerability_found (critical/high) | update security slides | 30 min | high |
| R-004 | weekly-status-monday | cron(0 9 * * MON) | generate status-report | 0 | normal |
| R-005 | milestone-reached | milestone event from tracker | generate stakeholder-update | 240 min | high |
| R-006 | cost-overrun-alert | cost-report-ready + variance > 10% | suggest cost-analysis | 1440 min | normal |
| R-007 | quality-gate-failed | tests.failed or quality.gate_failed | update quality slides | 60 min | normal |
| R-008 | deployment-completed | deployment.completed | update status slides | 30 min | low |
| R-009 | code-committed-batch | code.committed (5+ in 1 hour) | suggest status refresh | 480 min | low |
| R-010 | stale-presentation-check | cron(0 8 * * *) | suggest refresh | 1440 min | low |
| R-011 | quality-degradation-self-improve | internal(avg_quality < 0.60 over last 5) | self-improve | 1440 min | low |
| R-012 | sprint-complete | sprint boundary from tracker | generate sprint-review | 0 | normal |

#### 3.1.3 Cooldown Manager

```python
# Domain entity
@dataclass
class CooldownRecord:
    rule_id: str
    project_id: str
    last_executed: datetime
    cooldown_minutes: int
    skip_count: int = 0        # How many times this was skipped

# Domain service
class CooldownManager:
    """
    Prevents generation storms. Per-rule AND per-project timers.
    Emergency override: priority='critical' bypasses ALL cooldowns.
    """
    def can_execute(self, rule_id: str, project_id: str) -> bool: ...
    def record_execution(self, rule_id: str, project_id: str) -> None: ...
    def get_next_eligible(self, rule_id: str, project_id: str) -> Optional[datetime]: ...
```

#### 3.1.4 Priority Queue

```python
@dataclass
class AutonomousAction:
    id: str
    rule_id: str
    project_id: str
    action_type: str               # "generate" | "update" | "suggest" | "self-improve"
    presentation_type: Optional[PresentationType]
    audience: Optional[AudienceType]
    priority: str                  # "critical" | "high" | "normal" | "low"
    trigger_event: AgentEvent
    created_at: datetime
    expires_at: datetime           # Actions expire after 4 hours

PRIORITY_ORDER = {"critical": 0, "high": 1, "normal": 2, "low": 3}

class AutonomousActionQueue:
    """
    Constraints:
    - Max 3 concurrent generations (prevents CPU/memory saturation)
    - Max queue depth of 20 (shed load if overwhelmed)
    - Items expire after 4 hours if not processed
    - FIFO within each priority level
    """
    def enqueue(self, action: AutonomousAction) -> bool: ...   # False if queue full
    def dequeue(self) -> Optional[AutonomousAction]: ...
    def size(self) -> int: ...
    def prune_expired(self) -> int: ...                         # Returns count pruned
```

#### 3.1.5 Wiring to Existing V1 Components

The ABE uses the existing V1 `PresentationGenerator` and `AutoUpdater` as execution backends:

```
AutonomousAction(action_type="generate")
    -> PresentationGenerator.generate(project_id, type, audience, auto_mode=True)

AutonomousAction(action_type="update")
    -> AutoUpdater.update_presentation(presentation_id, trigger_event)

AutonomousAction(action_type="suggest")
    -> Store in suggestions log, surface via CLI/API

AutonomousAction(action_type="self-improve")
    -> MetaLearningController.evaluate_and_adjust()
```

---

### 3.2 Meta-Learning Engine

**ADR Reference**: ADR-034-meta-learning-engine.md

The meta-learning engine monitors the learning system's own performance and self-tunes its hyperparameters to improve learning convergence.

#### 3.2.1 What It Monitors

```
+---------------------------------------------------------------------+
|                    META-LEARNING OBSERVATION LOOP                     |
|                                                                      |
|  METRIC 1: Prediction Accuracy                                       |
|    |predicted_quality - actual_quality| averaged over last 10 gens   |
|    Target: < 0.15 (15% error)                                        |
|                                                                      |
|  METRIC 2: Learning Convergence Rate                                 |
|    Generations until preferences stabilize (std_dev < 0.05)          |
|    Target: < 10 generations per audience type                        |
|                                                                      |
|  METRIC 3: Signal Informativeness                                    |
|    Correlation between each signal and outcome quality               |
|    Used to rebalance signal weights                                  |
|                                                                      |
|  METRIC 4: Decay Rate Effectiveness                                  |
|    Does quality improve when old data is forgotten faster?           |
|    Measured by comparing quality windows                             |
+---------------------------------------------------------------------+
```

#### 3.2.2 What It Adjusts

```python
@dataclass
class HyperparameterSet:
    """All tunable parameters with safe bounds."""

    # Signal weights (must sum to 1.0)
    signal_weights: Dict[str, float] = field(default_factory=lambda: {
        "rating": 0.40,
        "quality": 0.20,
        "brand": 0.10,
        "edit": 0.15,
        "reuse": 0.10,
        "agent": 0.05,
    })

    # Exponential decay rate (per day)
    decay_rate: float = 0.05
    DECAY_RATE_BOUNDS: ClassVar[Tuple[float, float]] = (0.01, 0.20)

    # Bayesian shrinkage factor (how much to pull toward global mean)
    shrinkage_factor: float = 0.10
    SHRINKAGE_BOUNDS: ClassVar[Tuple[float, float]] = (0.05, 0.30)

    # Minimum sample count before acting on learned preferences
    min_sample_count: int = 5
    MIN_SAMPLE_BOUNDS: ClassVar[Tuple[int, int]] = (3, 20)

    # Per-signal weight bounds
    SIGNAL_WEIGHT_BOUNDS: ClassVar[Tuple[float, float]] = (0.01, 0.80)
```

#### 3.2.3 Meta-Learning Algorithm

```
EVERY 10 GENERATIONS:

1. COMPUTE prediction error
   For each of last 10 generations:
     error = |predicted_quality_score - actual_quality_score|
   prediction_error = mean(errors)

2. IF prediction_error < previous_prediction_error:
     Learning is working. No adjustment needed.
     Log: "Meta-learning: stable, error={prediction_error:.3f}"

3. ELSE (error is increasing):
   a. Compute per-signal correlation with outcome:
      For each signal type:
        corr[signal] = pearson_correlation(signal_values, quality_outcomes)

   b. Rebalance signal weights:
      new_weights = normalize(old_weights * (1 + 0.1 * corr[signal]))
      Clamp each weight to [0.01, 0.80]
      Normalize to sum = 1.0

   c. Adjust decay rate:
      recent_quality = mean(quality_scores, last 5 gens)
      older_quality = mean(quality_scores, gens 6-10)
      IF recent_quality > older_quality:
        decay_rate *= 1.05  (forget old patterns slightly faster)
      ELSE:
        decay_rate *= 0.95  (stabilize by remembering more)
      Clamp to [0.01, 0.20]

   d. Adjust shrinkage:
      IF confidence is low (< 0.5 average):
        shrinkage_factor *= 1.1  (more conservative)
      ELSE:
        shrinkage_factor *= 0.95  (trust learned data more)
      Clamp to [0.05, 0.30]

4. SAVE adjustment to meta-learning-history.json
5. APPLY new hyperparameters to BayesianPreferenceModel
```

#### 3.2.4 Safety Guarantees

- All adjustments are bounded within hard limits (cannot diverge)
- Each adjustment is logged with before/after values and the reasoning
- A "revert on degradation" rule: if quality drops for 3 consecutive cycles after an adjustment, revert to previous hyperparameters
- The meta-learning controller runs at domain layer with ZERO external dependencies

---

### 3.3 Multi-Modal Output Service

**ADR Reference**: ADR-035-multi-modal-output-strategy.md

All output formats are generated from the same domain model (`Presentation`). The V1 pipeline produces the domain model, then the Export Service routes to format-specific renderers.

#### 3.3.1 Architecture

```
                    Presentation (Domain Model)
                              |
                    +---------+---------+
                    |                   |
              ExportService       ExportService
              (user request)     (auto-export config)
                    |
         +----------+----------+----------+
         |          |          |          |
         v          v          v          v
   +---------+ +--------+ +--------+ +----------+
   | PptxRen | | PdfRen | | HtmlRn | | Briefing |
   | (exist) | | (new)  | | (new)  | | Writer   |
   +---------+ +--------+ +--------+ | (new)    |
         |          |          |      +----------+
         v          v          v          |
       .pptx      .pdf     .html/        v
                           (folder)    .md
```

#### 3.3.2 Output Format Details

| Format | Implementation | Primary Use | Fallback |
|--------|---------------|-------------|----------|
| **PPTX** | python-pptx (existing PptxPresentationRenderer) | PowerPoint delivery, editing, presenting | Always available (core) |
| **PDF** | libreoffice headless: `soffice --convert-to pdf` | Email distribution, archival, printing | PPTX only (with note) |
| **HTML** | Jinja2 templates + Chart.js for charts | Browser viewing, dashboard embedding | PPTX download link |
| **Briefing Script** | Claude API generates speaker notes per slide | Preparation for verbal presentation | Bullet point extraction |

#### 3.3.3 OutputRenderer Protocol

```python
# Domain interface (Protocol for duck typing)
class OutputRendererPort(Protocol):
    def render(self, presentation: Presentation, output_dir: Path) -> Path:
        """Render presentation to output format. Returns path to output."""
        ...

    def is_available(self) -> bool:
        """Check if this renderer's dependencies are available."""
        ...

    def get_format_name(self) -> str:
        """Return format identifier (e.g., 'pptx', 'pdf', 'html')."""
        ...
```

#### 3.3.4 Export Service (Application Layer)

```python
class ExportService:
    """
    Routes presentation domain model to registered renderers.
    Handles fallback when a renderer is unavailable.
    """
    def __init__(self, renderers: Dict[str, OutputRendererPort]):
        self.renderers = renderers

    def export(
        self,
        presentation: Presentation,
        formats: List[str],        # ["pptx", "pdf", "html", "briefing"]
        output_dir: Path,
    ) -> Dict[str, Optional[Path]]:
        """
        Export to requested formats. Returns {format: path_or_none}.
        Unavailable formats return None with a logged warning.
        """

    def export_all_available(
        self,
        presentation: Presentation,
        output_dir: Path,
    ) -> Dict[str, Path]:
        """Export to all available formats."""
```

#### 3.3.5 HTML Dashboard Renderer

The HTML output is a self-contained folder with:

```
{presentation_id}_html/
  index.html              # Main presentation with slide navigation
  slides/
    slide_01.html         # Individual slide pages
    slide_02.html
    ...
  assets/
    deltek.css            # Deltek-branded stylesheet (Figtree font, brand colors)
    charts.js             # Chart.js instances for metric slides
    diagrams/             # Mermaid-rendered SVGs
  data/
    metrics.json          # Chart data for interactive rendering
```

Technology: Jinja2 templates with Deltek CSS branding. Charts rendered via Chart.js. Mermaid SVGs embedded directly.

---

### 3.4 Collective Intelligence Reader

This component absorbs knowledge from the agent mesh collective memory to enrich slide content.

#### 3.4.1 Architecture

```
                  Agent Mesh Collective Memory
                  (~/.claude/agent-mesh/knowledge/)
                              |
                              v
                  +---------------------+
                  | CollectiveMemory    |
                  | Reader              |
                  | (Infrastructure)    |
                  +----------+----------+
                             |
                             v
                  +---------------------+
                  | CrossAgentKnowledge |
                  | Absorber            |
                  | (Domain Service)    |
                  +----------+----------+
                             |
                    +--------+--------+
                    |                 |
                    v                 v
          Knowledge Index     Slide Enrichment
          (categorized by     Queries
           slide type)
```

#### 3.4.2 Knowledge-to-Slide Mapping

The absorber classifies incoming knowledge by which slide types it can enrich:

| Knowledge Category | Enriches Slide Types |
|-------------------|---------------------|
| security-insight | SECURITY_POSTURE, RISK_MATRIX |
| architecture-decision | ARCHITECTURE_OVERVIEW, ARCHITECTURE_DETAIL |
| performance-insight | KEY_METRICS, AGENT_PERFORMANCE |
| error-pattern | RISK_MATRIX, STATUS_DASHBOARD |
| best-practice | NEXT_STEPS, EXECUTIVE_SUMMARY |
| process-improvement | TIMELINE, NEXT_STEPS |
| integration-pattern | ARCHITECTURE_DETAIL |

#### 3.4.3 Absorption Flow

```python
class CrossAgentKnowledgeAbsorber:
    """Domain service - zero external dependencies."""

    def absorb_from_collective_memory(
        self, knowledge_items: List[CollectiveKnowledgeItem]
    ) -> int:
        """
        Classify and index knowledge items.
        Returns count of items absorbed.
        """

    def get_enrichment_for_slide(
        self,
        slide_type: SlideType,
        project_id: str,
    ) -> List[KnowledgeEnrichment]:
        """
        Return absorbed knowledge relevant to a specific slide.
        Used by ContentSynthesizer to enrich LLM prompts.
        """

    def get_absorption_stats(self) -> Dict[str, int]:
        """Count of absorbed items by category."""
```

#### 3.4.4 Integration with Content Synthesis

When generating content for a slide, the ContentSynthesizer queries the absorber:

```
Before V2:
  prompt = f"Generate content for {slide_type} slide. Data: {raw_data}"

After V2:
  enrichments = absorber.get_enrichment_for_slide(slide_type, project_id)
  prompt = f"""Generate content for {slide_type} slide.
  Data: {raw_data}
  Cross-Agent Intelligence:
  {format_enrichments(enrichments)}
  """
```

This means security slides contain actual security insights from the Security agent, architecture slides contain actual ADR summaries from Jets, and quality slides contain actual test patterns from QA.

---

### 3.5 Transfer Learning Extractor

Extracts project-agnostic presentation insights that can be transferred to new projects.

#### 3.5.1 Types of Transferable Knowledge

| Type | Example | Transfer Mechanism |
|------|---------|-------------------|
| Audience Universals | "C-suite across ALL projects prefers <= 5 bullets" | Seed as weak prior (alpha=2, beta=1) |
| Content Structure | "Exec summaries leading with metrics score 20% higher" | Include in content prompt |
| Timing Patterns | "Monday reports are edited 30% less than Friday ones" | Inform scheduling rules |
| Diagram Effectiveness | "C4 context diagrams preferred by non-technical audiences" | Include in diagram selection |

#### 3.5.2 Extraction Algorithm

```
For each insight in learning history:
  1. Compute cross-project consistency:
     scores_per_project = [quality scores where this pattern was used, by project]
     consistency = 1 - std_dev(scores_per_project) / mean(scores_per_project)

  2. IF consistency > 0.70 AND sample_count > 5:
     Classify as "transferable"
     Add to transfer knowledge base

  3. When starting a new project:
     Load transferable insights
     Seed preference model with WEAK priors (weight 0.3)
     New project evidence quickly overrides (by design)
```

#### 3.5.3 Storage

```
~/.claude/exec-agent-memory/learning/transfer-knowledge.json
{
  "version": "1.0",
  "insights": [
    {
      "id": "TI-001",
      "type": "audience_universal",
      "description": "C-suite prefers 3-5 bullet points per slide",
      "consistency_score": 0.85,
      "sample_count": 12,
      "applicable_audiences": ["c-suite"],
      "prior_adjustment": {"alpha_delta": 2.0, "beta_delta": 1.0},
      "extracted_at": "2026-02-17T10:00:00Z"
    }
  ]
}
```

---

## 4. Agent Mesh Integration (Deep Dive)

### 4.1 TypeScript Type System Extension

The existing `AgentId` type in `src/agent-mesh/types/index.ts` does not include `"exec"`. This must be added:

```typescript
// REQUIRED CHANGE: Add 'exec' to AgentId union
export type AgentId =
  | 'conductor' | 'ba' | 'jets' | 'ux' | 'engineer'
  | 'security' | 'qa' | 'atlas' | 'customer' | 'ask-tom'
  | 'tracker' | 'finops'
  | 'exec';  // V2 ADDITION

// REQUIRED CHANGE: Add 'presentation-generation' to AgentCapability
export type AgentCapability =
  | 'requirements' | 'architecture' | 'ux-design' | 'implementation'
  | 'security-review' | 'testing' | 'deployment' | 'acceptance'
  | 'problem-solving' | 'tracking' | 'cost-analysis' | 'orchestration'
  | 'presentation-generation';  // V2 ADDITION
```

### 4.2 Learning Propagation Extension

In `src/agent-mesh/learning/learning-engine.ts`, add "exec" to the propagation maps:

```typescript
// Add 'exec' to LEARNING_PROPAGATION_MAP
'cross-agent-learning': [...existing, 'exec'],
'best-practice': [...existing, 'exec'],
'process-improvement': [...existing, 'exec'],
'architecture-decision': [...existing, 'exec'],
'security-insight': [...existing, 'exec'],
'performance-insight': [...existing, 'exec'],

// Add exec entry to AGENT_LEARNING_INTERESTS
exec: [
  'cross-agent-learning',
  'best-practice',
  'process-improvement',
  'architecture-decision',
  'security-insight',
  'performance-insight',
  'error-pattern',
],
```

### 4.3 Complete Event Subscription Map

```
Event Source       | Event Type                          | Exec Agent Action
-------------------|-------------------------------------|-----------------------------------
conductor          | project.completed                   | R-001: Auto-generate exec summary
conductor          | project.updated                     | Update internal project state
jets               | architecture.updated                | R-002: Update architecture slides
jets               | adr.created                         | Add decision to arch slides
security           | security.scan_completed             | Update security posture slides
security           | security.vulnerability_found        | R-003: Update security slides
qa                 | tests.completed                     | Update quality metrics
qa                 | tests.failed                        | R-007: Update quality slides
qa                 | quality.gate_passed                 | Update status dashboard
atlas              | deployment.completed                | R-008: Update deployment slides
atlas              | deployment.failed                   | Update status with failure
tracker            | milestone reached                   | R-005: Generate milestone deck
tracker            | sprint boundary                     | R-012: Generate sprint review
finops             | cost-report-ready                   | R-006: Suggest cost review
ba                 | requirements updated                | Update scope in exec summary
ANY                | learning event                      | Absorb into knowledge base
```

### 4.4 Events Emitted by Exec Agent

```
Event Topic                        | Payload                              | Consumers
-----------------------------------|------------------------------------- |-------------------
presentation.generated             | {id, type, path, quality_score}      | conductor, tracker
presentation.updated               | {id, changes, trigger}               | conductor, tracker
exec.learning_insight              | {title, category, audience, insight}  | ALL via learning engine
exec.suggestion.proposed           | {type, urgency, reasoning}           | conductor
exec.quality.degradation           | {trend, affected_audiences}          | conductor
```

### 4.5 Collaborative Authoring Protocol

For high-value presentations (executive summaries, board decks), the Exec Agent can request content contributions from domain-expert agents:

```
STEP 1: Exec Agent -> broadcast to target agents:
  {
    topic: "exec.collaboration.started",
    presentation_id: "PRES-001",
    requested_contributions: {
      "jets": ["architecture-overview"],
      "security": ["security-posture"],
      "qa": ["quality-metrics"],
      "finops": ["cost-breakdown"]
    },
    deadline: "2026-02-17T18:00:00Z"
  }

STEP 2: Contributing agents respond:
  {
    topic: "exec.collaboration.contribution",
    presentation_id: "PRES-001",
    contributing_agent: "security",
    slide_type: "security-posture",
    content: {
      headline: "Security Posture: Strong with 2 Remediation Items",
      bullet_points: [...],
      metrics: {...},
      diagram_mermaid: "graph LR..."
    }
  }

STEP 3: Exec Agent assembles deck:
  - Collects all contributions before deadline
  - Applies brand validation to each contribution
  - Scores quality
  - Falls back to self-authored content for missing contributions
  - Tracks which agent-authored slides score better (learning signal)
```

---

## 5. Data Flow: Complete Autonomous Generation Cycle

This traces a single end-to-end flow from event to output:

```
 1. EVENT ARRIVES
    Jets -> agent mesh -> exec inbox:
    AgentEvent(architecture.updated, project_id="SDLC-001")

 2. EVENT STREAM CLIENT
    Polls inbox every 15 seconds
    Reads event, deserializes to AgentEvent
    Passes to EventStreamProcessor

 3. EVENT CLASSIFIER
    Maps architecture.updated -> R-002 (architecture-change-update)
    Updates internal ProjectState.latest_architecture

 4. AUTONOMOUS DECISION RULES ENGINE
    Evaluates R-002 conditions:
      - existing_presentation_exists(type='architecture')? -> YES
      - change_significance > 0.3? -> YES (new ADR added)
    Result: FIRE

 5. COOLDOWN MANAGER
    Checks: last R-002 execution for SDLC-001 was 3 hours ago
    Cooldown is 2 hours -> PASS
    Records current execution

 6. PRIORITY QUEUE
    Enqueues: AutonomousAction(
      rule_id="R-002",
      action_type="update",
      project_id="SDLC-001",
      presentation_type=ARCHITECTURE_REVIEW,
      audience=TECHNICAL_LEAD,
      priority="normal"
    )

 7. QUEUE PROCESSOR
    Dequeues action (highest priority first)
    Checks concurrent count (< 3): PASS

 8. CROSS-AGENT KNOWLEDGE QUERY
    CollectiveMemoryReader queries: "architecture SDLC-001"
    CrossAgentKnowledgeAbsorber enriches:
      - ADR summaries from jets
      - Deployment patterns from atlas
      - Security considerations from security

 9. V1 PIPELINE EXECUTION
    PresentationGenerator.generate() or AutoUpdater.update():
      a. Load project data from SDLC registry
      b. Resolve audience: tech-lead profile with learned preferences
      c. Compose slides (Bayesian effectiveness scores guide selection)
      d. Synthesize content via Claude API (enriched with absorbed knowledge)
      e. Generate Mermaid diagrams from architecture specs
      f. Validate brand compliance (Deltek colors, Figtree font)
      g. Score quality (6-dimensional, target >= 0.70)

10. MULTI-MODAL EXPORT
    ExportService routes to:
      a. PptxRenderer -> .pptx (always)
      b. HtmlRenderer -> .html/ (if configured)
      c. PdfRenderer -> .pdf (if libreoffice available)

11. VERSION AND ARCHIVE
    VersionManager:
      a. Compute SHA-256 content hash
      b. Store as new version with diff from parent
      c. Update metadata.json

12. LEARNING CAPTURE
    a. Record GenerationRecord with quality scores
    b. Update Bayesian preference model
    c. Check if 10th generation -> trigger MetaLearningController
    d. Extract transferable insights if cross-project pattern detected

13. EMIT EVENTS
    FileEventBus.publish:
      a. "presentation.updated" -> conductor, tracker
      b. Learning insight (if discovered) -> ALL via learning engine

14. LOG
    "Autonomously updated architecture presentation for SDLC-001"
    "Quality score: 0.82 | Slides: 12 | Diagrams: 3 | Format: pptx,html"
```

---

## 6. Memory Architecture (V2 Enhanced)

```
~/.claude/exec-agent-memory/
+-- config/
|   +-- agent-profile.json              # Agent mesh registration
|   +-- schedules.json                  # Active cron schedules
|   +-- thresholds.json                 # Quality thresholds
|   +-- [V2] autonomous-rules.json     # Customizable trigger rules
+-- brand/
|   +-- deltek.json                     # Deltek brand config
|   +-- layouts.json                    # Layout mappings
+-- audiences/
|   +-- c-suite.json                    # Learned preference profiles
|   +-- vp-director.json
|   +-- tech-lead.json
|   +-- project-team.json
|   +-- external.json
+-- learning/
|   +-- generation-log.json             # All generation records (append)
|   +-- feedback-log.json               # All feedback records (append)
|   +-- slide-effectiveness.json        # Per-audience, per-slide scores
|   +-- content-patterns.json           # Content style effectiveness
|   +-- learning-model.json             # Serialized Bayesian model
|   +-- insights.json                   # Extracted insights
|   +-- [V2] meta-learning-history.json # Hyperparameter adjustment log
|   +-- [V2] transfer-knowledge.json    # Cross-project transferable insights
|   +-- [V2] cross-agent-absorbed.json  # Knowledge absorbed from other agents
|   +-- [V2] prediction-accuracy.json   # Meta-learning error tracking
+-- [V2] state/
|   +-- {project_id}/
|   |   +-- current-state.json          # Running project state from events
|   |   +-- event-log.json              # Events processed for this project
+-- presentations/
|   +-- {presentation_id}/
|   |   +-- current.pptx                # Latest version
|   |   +-- metadata.json               # Presentation metadata
|   |   +-- [V2] current.html/          # HTML dashboard version
|   |   +-- [V2] current.pdf            # PDF version
|   |   +-- [V2] speaker-script.md      # Verbal briefing script
|   |   +-- versions/                   # Content-addressable versions
|   |   +-- feedback/                   # Feedback records
|   |   +-- [V2] contributions/         # Agent contributions (collaborative)
+-- [V2] cooldowns/
|   +-- cooldowns.json                  # Per-rule, per-project timers
+-- [V2] queue/
|   +-- action-queue.json               # Pending autonomous actions
+-- [V2] suggestions/
|   +-- pending.json                    # Pending proactive suggestions
|   +-- history.json                    # Suggestion outcome tracking
+-- diagrams/
|   +-- cache/                          # Rendered diagram cache
+-- data-snapshots/
    +-- {project_id}/
        +-- {timestamp}.json            # Snapshot at generation time
```

---

## 7. New Directory Structure (V2 Additions)

```
src/agents/exec-agent/
+-- domain/
|   +-- entities/
|   |   +-- [V2] autonomous_action.py      # AutonomousAction, TriggerRule
|   |   +-- [V2] proactive_suggestion.py   # ProactiveSuggestion
|   |   +-- [V2] hyperparameter_set.py     # HyperparameterSet
|   |   +-- [V2] transferable_insight.py   # TransferableInsight
|   |   +-- [V2] knowledge_enrichment.py   # KnowledgeEnrichment
|   |   +-- [V2] multi_modal_output.py     # MultiModalOutput config
|   |   +-- [V2] collaborative_contribution.py
|   +-- interfaces/
|   |   +-- [V2] collective_memory_port.py # Port to collective memory
|   |   +-- [V2] cooldown_store_port.py    # Port to cooldown persistence
|   |   +-- [V2] output_renderer_port.py   # Protocol for output renderers
|   |   +-- [V2] meta_learning_port.py     # Port for meta-learning analysis
|   +-- services/
|       +-- [V2] meta_learning_controller.py
|       +-- [V2] transfer_learning_extractor.py
|       +-- [V2] cross_agent_knowledge_absorber.py
|       +-- [V2] proactive_intelligence_engine.py
|       +-- [V2] autonomous_decision_rules.py
|       +-- [V2] cooldown_manager.py
|       +-- [V2] multi_modal_output_strategy.py
+-- application/
|   +-- services/
|   |   +-- [V2] autonomous_behavior_engine.py
|   |   +-- [V2] export_service.py
|   |   +-- [V2] collaborative_authoring_coordinator.py
|   +-- event_handlers/
|       +-- [V2] autonomous_trigger_handler.py
+-- infrastructure/
|   +-- [V2] export/
|   |   +-- pdf_renderer.py
|   |   +-- html_renderer.py
|   |   +-- briefing_script_writer.py
|   +-- [V2] mesh/
|   |   +-- event_stream_client.py       # Polls mesh events + inbox
|   |   +-- collective_memory_reader.py  # Reads collective intelligence
|   |   +-- learning_event_emitter.py    # Emits learnings to mesh
|   +-- [V2] autonomous/
|   |   +-- file_cooldown_store.py
|   |   +-- file_priority_queue_store.py
|   +-- [V2] meta/
|       +-- meta_learning_analyzer.py
|       +-- transfer_knowledge_store.py
+-- presentation/
|   +-- [V2] autonomous_trigger_listener.py
+-- tests/
    +-- unit/
    |   +-- domain/
    |   |   +-- [V2] test_autonomous_decision_rules.py
    |   |   +-- [V2] test_cooldown_manager.py
    |   |   +-- [V2] test_meta_learning_controller.py
    |   |   +-- [V2] test_transfer_learning_extractor.py
    |   |   +-- [V2] test_cross_agent_knowledge_absorber.py
    |   |   +-- [V2] test_proactive_intelligence_engine.py
    |   |   +-- [V2] test_multi_modal_output_strategy.py
    |   +-- application/
    |       +-- [V2] test_autonomous_behavior_engine.py
    |       +-- [V2] test_export_service.py
    +-- integration/
        +-- [V2] test_autonomous_end_to_end.py
        +-- [V2] test_mesh_registration.py
        +-- [V2] test_collective_memory_roundtrip.py
        +-- [V2] test_multi_modal_export.py
```

---

## 8. Technology Additions (V2)

| Component | Technology | Purpose | Required? | Fallback |
|-----------|-----------|---------|-----------|----------|
| PDF Export | libreoffice (headless) | PPTX to PDF conversion | No | PPTX only |
| HTML Dashboards | Jinja2 + Chart.js | Interactive web presentations | No | PPTX only |
| Event Polling | threading.Timer | Periodic inbox/event checks | Yes | Manual invocation |
| Speaker Scripts | Claude API | Generate verbal briefing notes | No | Bullet point extraction |
| State Management | JSON files + hashlib | Running project state from events | Yes | On-demand data load |
| Transfer Storage | JSON files | Cross-project insights | Yes | Fresh start per project |

All V2 technologies except threading.Timer and JSON files are **optional** with fallback behavior. The V1 PPTX pipeline remains the irreducible core.

---

## 9. Performance Targets

| Metric | V1 Target | V2 Target | Notes |
|--------|-----------|-----------|-------|
| Generation time (7 slides) | < 15s | < 15s | V1 pipeline unchanged |
| Event processing latency | N/A | < 5s | Event to rule evaluation |
| Autonomous decision latency | N/A | < 100ms | Rule evaluation |
| Cross-agent knowledge query | N/A | < 500ms | Collective memory search |
| Meta-learning cycle | N/A | < 2s | Hyperparameter evaluation |
| Multi-modal export (all formats) | N/A | < 60s | PPTX + PDF + HTML |
| Concurrent projects | 1 | 1000+ | Priority queue + lazy loading |
| Memory footprint (idle) | < 50 MB | < 50 MB | Lazy state loading |
| Memory footprint (generation) | < 200 MB | < 200 MB | One at a time |
| Disk usage (learning data per 1K projects) | N/A | < 50 MB | Fixed-size arrays |

---

## 10. Testing Strategy (V2 Additions)

### 10.1 New Test Categories

```
Unit Tests (Domain Layer):
  test_autonomous_decision_rules.py
    - Each rule matches its expected event type
    - Rules with unmet conditions do not fire
    - Disabled rules never fire
    - Rule precedence is respected

  test_cooldown_manager.py
    - Cooldown blocks re-execution within window
    - Cooldown allows execution after window
    - Per-project isolation (project A cooldown does not block project B)
    - Critical priority bypasses cooldowns
    - Skip count increments on blocked execution

  test_meta_learning_controller.py
    - All hyperparameters stay within hard bounds
    - Signal weights always sum to 1.0 after adjustment
    - Revert-on-degradation triggers after 3 bad cycles
    - No adjustment when error is decreasing

  test_transfer_learning_extractor.py
    - Only insights with consistency > 0.70 are transferable
    - Transferred priors are weak (weight 0.3)
    - New evidence overrides transferred priors within 5 generations

  test_cross_agent_knowledge_absorber.py
    - Knowledge correctly classified to slide types
    - Enrichment returns relevant items for requested slide type
    - Empty enrichment when no relevant knowledge exists

  test_proactive_intelligence_engine.py
    - Staleness detection triggers suggestion when delta > 7 days
    - Suggestion confidence < 0.5 is not surfaced
    - Maximum 3 suggestions per day

  test_multi_modal_output_strategy.py
    - Format selection respects availability
    - Fallback to PPTX when requested format unavailable
    - All renderers receive identical Presentation domain model

Integration Tests:
  test_autonomous_end_to_end.py
    - Event -> Rule -> Cooldown -> Queue -> Generation -> Learning
    - Full cycle completes without errors

  test_mesh_registration.py
    - Python client writes exec agent profile to agents.json
    - Profile conforms to AgentProfile TypeScript interface

  test_collective_memory_roundtrip.py
    - Write knowledge from Python, read from collective memory
    - Schema matches CollectiveKnowledge TypeScript interface

  test_multi_modal_export.py
    - Same Presentation produces valid .pptx and .html
    - HTML contains all slide content
```

### 10.2 Coverage Targets

| Layer | V1 Coverage | V2 Target |
|-------|-------------|-----------|
| Domain | 80% | 85% |
| Application | 70% | 75% |
| Infrastructure | 50% | 55% |
| Integration | Manual | 60% |

---

## 11. Implementation Roadmap (V2 Phases)

V2 phases assume the V1 foundation is complete and all 73 tests are passing.

### V2 Phase A: Agent Mesh First-Class Citizen (Week 1-2)

**Goal: The Exec Agent is a fully registered, event-processing mesh participant**

- [ ] Add "exec" to AgentId type in `src/agent-mesh/types/index.ts`
- [ ] Add "presentation-generation" to AgentCapability
- [ ] Add "exec" to LEARNING_PROPAGATION_MAP in `learning-engine.ts`
- [ ] Add "exec" to AGENT_LEARNING_INTERESTS
- [ ] Implement EventStreamClient (Python, polls inbox + mesh events every 15s)
- [ ] Implement CollectiveMemoryReader (reads from `~/.claude/agent-mesh/knowledge/`)
- [ ] Implement LearningEventEmitter (writes learning events to mesh)
- [ ] Register exec agent in agents.json on startup
- [ ] Write integration test: TypeScript sends event -> Python reads it
- [ ] Write integration test: Python emits learning -> appears in collective memory

**Deliverable: Exec Agent receives and processes all SDLC events from the mesh**

### V2 Phase B: Autonomous Behavior Engine (Week 3-4)

**Goal: The agent autonomously decides when to generate presentations**

- [ ] Define domain entities: TriggerRule, AutonomousAction, CooldownRecord
- [ ] Implement AutonomousDecisionRules (12 initial rules)
- [ ] Implement CooldownManager (per-rule, per-project, critical bypass)
- [ ] Implement AutonomousActionQueue (priority ordering, max depth 20, expiry)
- [ ] Implement AutonomousBehaviorEngine (wires event -> rules -> queue -> pipeline)
- [ ] Implement AutonomousTriggerListener (presentation layer, starts polling)
- [ ] Wire to existing PresentationGenerator and AutoUpdater
- [ ] Implement cron-based triggers (R-004 weekly, R-010 daily)
- [ ] Write unit tests for all 12 decision rules
- [ ] Write unit tests for cooldown behavior
- [ ] Write acceptance test: architecture event -> autonomous generation

**Deliverable: Presentations appear automatically when SDLC events warrant them**

### V2 Phase C: Enhanced Learning (Week 5-6)

**Goal: Meta-learning + transfer learning + cross-agent knowledge absorption**

- [ ] Define domain entities: HyperparameterSet, TransferableInsight, KnowledgeEnrichment
- [ ] Implement MetaLearningController (monitors, adjusts, reverts)
- [ ] Implement TransferLearningExtractor (consistency scoring, weak priors)
- [ ] Implement CrossAgentKnowledgeAbsorber (classify, index, enrich)
- [ ] Integrate absorbed knowledge into ContentSynthesizer prompts
- [ ] Implement ProactiveIntelligenceEngine (staleness, correlation, patterns)
- [ ] Implement suggestion tracking (was it acted on?)
- [ ] Wire MetaLearningController to run every 10 generations
- [ ] Write unit tests for hyperparameter bounds
- [ ] Write integration test: learning event -> absorbed -> slide enrichment
- [ ] Write test: transfer learning improves first-generation quality

**Deliverable: Measurably faster learning convergence and cross-project intelligence**

### V2 Phase D: Multi-Modal Output and Collaboration (Week 7-8)

**Goal: Multiple output formats and collaborative content authoring**

- [ ] Define OutputRendererPort protocol
- [ ] Implement ExportService (routes to renderers, handles fallback)
- [ ] Implement PdfRenderer (libreoffice headless with fallback)
- [ ] Implement HtmlRenderer (Jinja2 + Chart.js + Deltek CSS)
- [ ] Implement BriefingScriptWriter (Claude API for speaker notes)
- [ ] Create Deltek HTML template with Figtree font, brand colors
- [ ] Implement CollaborativeAuthoringCoordinator
- [ ] Define collaborative event protocol (start, contribute, assemble)
- [ ] Implement contribution timeout handling (graceful degradation)
- [ ] Write integration test: collaborative deck assembly
- [ ] Write test: same Presentation produces valid PPTX, HTML, and PDF

**Deliverable: Multi-format output and agent-collaborative presentations**

---

## 12. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Autonomous generation storm (too many triggers) | Medium | High | Cooldown manager, max queue depth 20, max 3 concurrent, per-project isolation |
| Meta-learning divergence (hyperparameters drift to bad values) | Low | Medium | Hard bounds on all parameters, revert-on-degradation after 3 bad cycles |
| Cross-agent knowledge conflicts (contradictory information) | Medium | Low | Source ranking by confidence; prefer "proven" > "established" > "emerging" |
| File system polling latency (15s) misses time-sensitive events | Low | Low | Critical events also land in inbox; configurable poll interval |
| Collaborative authoring: agents miss deadline | High (early) | Medium | Graceful fallback to self-authored content; learn which agents are reliable |
| Transfer learning: stale cross-project insights in new context | Medium | Low | Weak priors only (weight 0.3); new evidence overrides within 5 generations |
| PDF/HTML rendering dependencies not installable | Medium | Low | PPTX-only fallback; non-PPTX formats are "best effort" |
| Event stream processor thread crashes | Low | High | Daemon thread with auto-restart; health check via CLI |
| Collective memory file format changes | Low | Medium | Version field in JSON; adapter pattern for format migration |

---

## 13. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Autonomous generation exposes project data without human review | Quality threshold (0.70) gates output; suggest-only mode for low-confidence actions |
| Cross-agent knowledge may include sensitive security findings | Classify knowledge by sensitivity; exclude "critical" findings from presentation content |
| PDF export via libreoffice runs external process | Sandbox with timeout (30s max); validate output before serving |
| Collaborative contributions from other agents could be malicious | Validate all contributions against schema; brand validator catches non-compliant content |
| Meta-learning adjustments could degrade security of content filtering | Security-related quality dimensions have minimum floor (0.50) that meta-learning cannot adjust below |

---

## 14. Success Metrics

| Metric | V1 Target | V2 Target (6 months) | How Measured |
|--------|-----------|---------------------|-------------|
| Autonomous generation rate | 0% | > 60% of all presentations | % generated without human trigger |
| Average quality score | 0.70 | 0.85 | Automated 6-dimension scoring |
| Learning convergence time | Unknown | < 10 generations per audience | Gens to reach stable preferences |
| Cross-agent knowledge absorbed | 0 items | > 50 items | Count in cross-agent-absorbed.json |
| Transfer learning improvement | N/A | > 15% quality gain on new projects | First-gen quality vs. cold-start |
| Proactive suggestion hit rate | N/A | > 40% acted upon | % of suggestions leading to generation |
| Meta-learning adjustments | N/A | > 5 successful tunings | Count of quality-improving adjustments |
| Multi-modal output usage | 1 format | 3+ formats regularly | Distinct formats generated per month |
| Time: event to presentation | Manual (hours) | < 2 minutes | Latency from event to file on disk |
| Collaborative deck participation | 0 agents | 3+ agents per deck | Avg contributing agents per collab deck |

---

## 15. ADR References

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-030-exec-agent-layered-architecture | Python layered architecture for Exec Agent | Proposed (V1) |
| ADR-031-bayesian-learning-audience-preferences | Bayesian learning approach for audience preferences | Proposed (V1) |
| ADR-032-mermaid-diagram-generation | Mermaid-based diagram generation | Proposed (V1) |
| ADR-033-file-based-agent-mesh-python | File-based agent mesh integration for Python | Proposed (V1) |
| **ADR-034-meta-learning-engine** | **Meta-learning for self-tuning hyperparameters** | **Proposed (V2)** |
| **ADR-035-multi-modal-output-strategy** | **Multi-modal output: PPTX + PDF + HTML + briefing** | **Proposed (V2)** |
| **ADR-036-autonomous-event-trigger** | **Autonomous behavior engine with cooldown-gated triggers** | **Proposed (V2)** |

---

## 16. Handoff

```
ARCHITECTURE COMPLETE: Exec Agent V2 -- Fully Agentic, Best-in-Class Learning

Documents:
  Architecture V2: docs/sdlc/architecture/ARCH-20260217-EXEC-AGENT-V2.md
  Architecture V1: docs/sdlc/architecture/ARCH-20260217-EXEC-AGENT.md (preserved)
  ADR-034: Meta-Learning Engine
  ADR-035: Multi-Modal Output Strategy
  ADR-036: Autonomous Event Trigger Design

Architecture Style: Layered + Event-Driven + Autonomous Agent + Self-Improving Learning
Technology Stack: Python 3.14, FastAPI, python-pptx, Mermaid, Anthropic SDK,
                  APScheduler, Pydantic, watchdog, Jinja2, Chart.js, libreoffice

V2 Key Enhancements:
  1. Autonomous Behavior Engine: 12 trigger rules with cooldowns and priority queue
  2. Meta-Learning Controller: Self-tuning hyperparameters with bounded adjustments
  3. Transfer Learning: Cross-project intelligence with weak prior seeding
  4. Cross-Agent Knowledge Absorption: Enriches slides with collective intelligence
  5. Proactive Intelligence: Predicts executive needs before they ask
  6. Multi-Modal Output: PPTX + PDF + HTML + speaker scripts
  7. Collaborative Authoring: Multi-agent deck co-creation protocol
  8. Full Mesh Integration: First-class citizen with "exec" AgentId

V2 Implementation: 4 phases over 8 weeks (assumes V1 foundation complete)
  Phase A: Agent Mesh First-Class Citizen (Week 1-2)
  Phase B: Autonomous Behavior Engine (Week 3-4)
  Phase C: Enhanced Learning (Week 5-6)
  Phase D: Multi-Modal Output and Collaboration (Week 7-8)

Next Step: Use the software-engineer subagent to implement V2 Phase A,
beginning with the TypeScript type extension and the EventStreamClient.
```
