# AI-SDLC Integration: Implementation Roadmap

**Date**: 2026-02-16
**Author**: Jets (Architect)
**Related**: ARCH-20260216-CLAUDE-AISDLC-INTEGRATION

---

## Overview

This roadmap describes the phased implementation plan for integrating AI-SDLC as the default operating system for Claude Code. The plan spans 8 weeks across 4 phases, each delivering standalone value.

---

## Phase 1: Foundation (Week 1-2)

**Goal**: Automatic request classification and routing with passthrough for non-code requests.

### Week 1: Classification Engine

| Day | Task | Deliverable |
|---|---|---|
| Mon | Set up `src/integration/` project structure with TypeScript, Jest, layered architecture | Project scaffold |
| Mon | Define `RequestClassification` entity and all type definitions | `src/integration/domain/entities/` |
| Tue | Implement Tier 1 Rule Classifier with 20+ classification rules | `RuleClassifier.ts` |
| Tue | Write unit tests for all classification rules (target: 50+ test cases) | `RuleClassifier.test.ts` |
| Wed | Implement Tier 2 LLM Classifier using Claude Haiku structured output | `LLMClassifier.ts` |
| Wed | Implement classification merge logic (rule + LLM confidence blending) | `ClassificationService.ts` |
| Thu | Implement YAML configuration system with defaults and overrides | `ConfigService.ts` |
| Thu | Create default config template (`~/.aisdlc/config.yml`) | Template files |
| Fri | Implement classification cache (TTL-based, message hash keyed) | `ClassificationCache.ts` |
| Fri | Integration test: message -> classification -> routing decision | Integration tests |

### Week 2: Routing and Hooks

| Day | Task | Deliverable |
|---|---|---|
| Mon | Implement Smart Router with all 8 routing strategies | `SmartRouter.ts` |
| Mon | Implement routing decision matrix (type x complexity x governance) | Routing matrix |
| Tue | Implement `UserPromptSubmit` hook script | `hooks/user-prompt-submit.js` |
| Tue | Implement context injection for SDLC-routed messages | Context builder |
| Wed | Implement `Stop` hook script for completion tracking | `hooks/stop.js` |
| Wed | Implement Request Registry (file-based, daily partitioned) | `RequestRegistry.ts` |
| Thu | Implement governance level selection (4 levels, basic gates) | `GovernanceGatekeeper.ts` |
| Thu | Create Claude Code settings.json templates | Settings templates |
| Fri | End-to-end test: user message -> hook -> classify -> route -> result | E2E tests |
| Fri | Write setup automation script | `setup.sh` |

### Phase 1 Exit Criteria
- [ ] All user messages are classified automatically
- [ ] Q&A and trivial requests pass through in < 200ms
- [ ] Code changes are detected with > 85% accuracy
- [ ] Configuration system loads user + project overrides
- [ ] Request registry logs all requests
- [ ] 20+ unit tests passing for classification rules
- [ ] Setup guide written and tested

### Phase 1 Deliverables
```
src/integration/
|-- domain/
|   |-- entities/
|   |   |-- RequestClassification.ts
|   |   |-- RoutingDecision.ts
|   |   +-- RequestEntry.ts
|   +-- value-objects/
|       |-- RequestType.ts
|       |-- Complexity.ts
|       +-- GovernanceLevel.ts
|-- application/
|   |-- services/
|   |   |-- ClassificationService.ts
|   |   |-- SmartRouter.ts
|   |   |-- GovernanceGatekeeper.ts
|   |   +-- ConfigService.ts
|   +-- interfaces/
|       |-- IClassifier.ts
|       +-- IRequestRegistry.ts
|-- infrastructure/
|   |-- classifiers/
|   |   |-- RuleClassifier.ts
|   |   |-- LLMClassifier.ts
|   |   +-- ClassificationCache.ts
|   |-- registry/
|   |   +-- FileRequestRegistry.ts
|   +-- config/
|       +-- YamlConfigLoader.ts
|-- presentation/
|   +-- hooks/
|       |-- user-prompt-submit.js
|       +-- stop.js
|-- templates/
|   |-- config.yml
|   +-- project-config.yml
+-- tests/
    |-- unit/
    |   |-- RuleClassifier.test.ts
    |   |-- SmartRouter.test.ts
    |   +-- GovernanceGatekeeper.test.ts
    +-- integration/
        +-- classification-flow.test.ts
```

---

## Phase 2: MCP Integration (Week 3-4)

**Goal**: MCP server exposing AI-SDLC as tools, resources, and commands within Claude Code.

### Week 3: MCP Server Core

| Day | Task | Deliverable |
|---|---|---|
| Mon | Set up MCP server project using `@modelcontextprotocol/sdk` | MCP server scaffold |
| Mon | Implement server initialization and stdio transport | `mcp-server/index.ts` |
| Tue | Implement `aisdlc_classify` tool | Tool: classify |
| Tue | Implement `aisdlc_start_workflow` tool (integrates with Conductor) | Tool: start |
| Wed | Implement `aisdlc_review_code` tool (integrates with Security + QA) | Tool: review |
| Wed | Implement `aisdlc_ask_tom` tool (integrates with Ask Tom) | Tool: ask_tom |
| Thu | Implement `aisdlc_get_status` tool | Tool: status |
| Thu | Implement `aisdlc_check_governance` tool | Tool: governance |
| Fri | Implement `aisdlc_search_memory` tool | Tool: memory |
| Fri | Implement `aisdlc_get_config` and `aisdlc_set_governance_level` tools | Tools: config |

### Week 4: Resources, Commands, and Testing

| Day | Task | Deliverable |
|---|---|---|
| Mon | Implement MCP resources: `aisdlc://registry`, `aisdlc://health` | Resources |
| Mon | Implement MCP resources: `aisdlc://memory`, `aisdlc://config` | Resources |
| Tue | Implement MCP resources: `aisdlc://agents` | Resources |
| Tue | Implement MCP prompts: `/mcp__aisdlc__start`, `/mcp__aisdlc__review` | Prompts |
| Wed | Implement MCP prompts: `/mcp__aisdlc__status`, `/mcp__aisdlc__config` | Prompts |
| Wed | Connect MCP tools to existing Agent Mesh (message bus, registry) | Integration |
| Thu | End-to-end test: Claude Code -> MCP tool -> Agent Mesh -> result | E2E tests |
| Thu | Test MCP Tool Search behavior (tools > 10% context window) | Performance test |
| Fri | Write MCP server documentation | Documentation |
| Fri | Update settings.json templates with MCP server configuration | Settings update |

### Phase 2 Exit Criteria
- [ ] 8+ MCP tools callable from Claude Code
- [ ] 5+ MCP resources accessible via @ mentions
- [ ] 4 MCP prompts available as / commands
- [ ] Full SDLC workflow executable via MCP tool call
- [ ] MCP server starts reliably with Claude Code
- [ ] E2E test passes: user message -> MCP tool -> agent workflow -> result

### Phase 2 Deliverables
```
src/integration/
+-- mcp-server/
    |-- index.ts                    # MCP server entry point
    |-- tools/
    |   |-- classify.ts
    |   |-- start-workflow.ts
    |   |-- review-code.ts
    |   |-- ask-tom.ts
    |   |-- get-status.ts
    |   |-- check-governance.ts
    |   |-- search-memory.ts
    |   +-- config.ts
    |-- resources/
    |   |-- registry.ts
    |   |-- memory.ts
    |   |-- config.ts
    |   |-- health.ts
    |   +-- agents.ts
    |-- prompts/
    |   |-- start.ts
    |   |-- review.ts
    |   |-- status.ts
    |   +-- config.ts
    +-- tests/
        |-- tools.test.ts
        +-- resources.test.ts
```

---

## Phase 3: Governance Engine (Week 5-6)

**Goal**: Configurable 4-level governance with quality gates, bypass system, and audit trail.

### Week 5: Governance Levels and Gates

| Day | Task | Deliverable |
|---|---|---|
| Mon | Extend existing GovernanceService with level awareness | Enhanced GovernanceService |
| Mon | Implement Level 1 behavior (tracking only, no gates) | Level 1 |
| Tue | Implement Level 2 behavior (advisory gates) | Level 2 |
| Tue | Implement Level 3 behavior (blocking gates) | Level 3 |
| Wed | Implement Level 4 behavior (audit mode, all blocking) | Level 4 |
| Wed | Implement branch-level governance overrides | Branch overrides |
| Thu | Implement security gate (integrates with Security agent) | Security gate |
| Thu | Implement QA gate (integrates with QA agent) | QA gate |
| Fri | Implement architecture gate (integrates with Jets agent) | Architecture gate |
| Fri | Unit tests for all 4 levels with all gate combinations | Gate tests |

### Week 6: Bypass System and Audit

| Day | Task | Deliverable |
|---|---|---|
| Mon | Implement bypass token system (HMAC-SHA256) | Bypass tokens |
| Mon | Implement bypass validation and expiration | Token validation |
| Tue | Implement governance decision audit log | Audit logger |
| Tue | Implement tamper-evident logging for Level 4 | Hash chain |
| Wed | Implement governance override workflow | Override flow |
| Wed | Connect governance to UserPromptSubmit hook (blocking flow) | Hook integration |
| Thu | Connect governance to MCP tools (governance check before execution) | MCP integration |
| Thu | Integration test: blocked request -> governance feedback -> override | Integration test |
| Fri | Write governance documentation and bypass token generation script | Documentation |
| Fri | End-to-end test: all 4 levels with all request types | E2E tests |

### Phase 3 Exit Criteria
- [ ] All 4 governance levels operational
- [ ] Security, QA, and architecture gates functioning
- [ ] Blocking behavior correct at each level
- [ ] Bypass tokens work for Level 3
- [ ] Level 4 has no bypass path
- [ ] Audit trail records all governance decisions
- [ ] Branch-level overrides work correctly
- [ ] Integration tests pass for all level + type combinations

---

## Phase 4: Dashboard and Polish (Week 7-8)

**Goal**: Dashboard integration, performance optimization, classification accuracy validation, documentation.

### Week 7: Dashboard Integration

| Day | Task | Deliverable |
|---|---|---|
| Mon | Design dashboard views (Request Flow, Classification, Governance, Cost) | View designs |
| Mon | Create API endpoints for dashboard data | API endpoints |
| Tue | Implement Request Flow view (real-time request visualization) | React component |
| Tue | Implement Classification Metrics view (accuracy, distribution) | React component |
| Wed | Implement Governance Compliance view (compliance rate, gates) | React component |
| Wed | Implement Cost Tracking view (tokens, cost analysis) | React component |
| Thu | Connect dashboard to request registry and governance audit log | Data integration |
| Thu | Add WebSocket or SSE for real-time updates | Real-time |
| Fri | Dashboard integration testing | Dashboard tests |

### Week 8: Performance, Testing, Documentation

| Day | Task | Deliverable |
|---|---|---|
| Mon | Build classification test dataset (500+ labeled messages) | Test dataset |
| Mon | Run classification accuracy benchmark | Accuracy report |
| Tue | Performance optimization: caching, parallel execution | Performance |
| Tue | Latency benchmarking: hook overhead, classification time | Latency report |
| Wed | Security review of integration layer | Security report |
| Wed | Fix any security findings | Fixes |
| Thu | Complete setup guide with screenshots | Setup guide |
| Thu | Complete user guide with all scenarios | User guide |
| Fri | Final E2E test suite | Test suite |
| Fri | Release preparation and version tagging | Release |

### Phase 4 Exit Criteria
- [ ] Dashboard shows real-time request flow
- [ ] Classification accuracy > 90% on 500+ test cases
- [ ] Hook overhead < 200ms for passthrough (p50)
- [ ] Hook overhead < 3s for SDLC routing (p50)
- [ ] Security review completed with no critical findings
- [ ] Setup guide tested by non-author
- [ ] User guide covers all scenarios from architecture doc

---

## Effort Summary

| Phase | Duration | Key Deliverables | Risk |
|---|---|---|---|
| Phase 1: Foundation | 2 weeks | Classifier, Router, Hooks, Config | Low |
| Phase 2: MCP Integration | 2 weeks | MCP Server, Tools, Resources | Low-Medium |
| Phase 3: Governance | 2 weeks | 4-Level Governance, Bypass, Audit | Medium |
| Phase 4: Polish | 2 weeks | Dashboard, Performance, Docs | Low |
| **Total** | **8 weeks** | **Complete integration** | **Medium** |

---

## Dependencies

| Dependency | Required By | Status |
|---|---|---|
| Agent Mesh (src/agent-mesh/) | Phase 2 (MCP tools) | BUILT |
| Governance Engine (src/governance-engine/) | Phase 3 | BUILT |
| Control Center Dashboard (src/platform/webapp/) | Phase 4 | BUILT |
| Claude Code Hooks support | Phase 1 | AVAILABLE |
| Claude Code MCP support | Phase 2 | AVAILABLE |
| @modelcontextprotocol/sdk | Phase 2 | AVAILABLE (npm) |

---

## Success Criteria (End of Phase 4)

| Metric | Target |
|---|---|
| Classification accuracy | > 90% |
| Passthrough latency (p50) | < 200ms |
| SDLC routing latency (p50) | < 3s |
| False positive SDLC rate | < 5% |
| False negative SDLC rate | < 3% |
| Governance compliance rate | > 80% |
| Production change tracking | 100% |
| User satisfaction | > 8/10 |
