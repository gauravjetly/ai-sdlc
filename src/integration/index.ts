/**
 * AI-SDLC Integration Module
 *
 * Phase 1: Foundation
 * - Request Classifier (two-tier: rules + LLM)
 * - Smart Router (8 routing strategies)
 * - Governance Engine (4 configurable levels)
 * - Configuration System (YAML + validation + merging)
 *
 * Phase 2: Claude Code Integration
 * - Claude Code Hooks (UserPromptSubmit, Stop, PostToolUse)
 * - MCP Server (8 tools, 3 resources, 4 prompts)
 * - Hook-to-MCP Bridge (shared state, IPC)
 * - Workflow Executor (phase management, progress tracking)
 *
 * Phase 3: Governance, Audit, Performance & Dashboard
 * - Approval Workflows (Level 3+ governance)
 * - HMAC-SHA256 Bypass Tokens (Level 3 overrides)
 * - Policy Enforcer (unified governance enforcement)
 * - Persistent Audit Logging (in-memory + PostgreSQL)
 * - Audit Exporter (CSV/JSON compliance reporting)
 * - Classification Cache (LRU with TTL)
 * - Async Processor (job queue)
 * - Batch Processor (concurrent classification)
 * - Metrics Collector (performance monitoring)
 * - WebSocket Event Emitter (real-time dashboard)
 *
 * @module integration
 */

// === Phase 1: Classifier ===
export {
  RuleClassifier,
  LLMClassifier,
  HybridClassifier,
} from './classifier';

export type {
  RequestType,
  Complexity,
  Urgency,
  SDLCPhase,
  RequestClassification,
  GitContext,
  ClassificationRule,
  TierResult,
  Classifier,
  ClassificationContext,
  LLMClassifierOptions,
  AnthropicClient,
  HybridClassifierOptions,
} from './classifier';

// === Phase 1: Router ===
export {
  SmartRouter,
  PassthroughStrategy,
  DocumentationStrategy,
  TrivialStrategy,
  BugFixStrategy,
  FeatureStrategy,
  ArchitectureStrategy,
  ReviewStrategy,
  EmergencyStrategy,
} from './router';

export type {
  RoutingStrategy,
  RoutingDecision,
  RoutingStrategyHandler,
  RouterOptions,
  AgentId,
} from './router';

// === Phase 1: Governance ===
export {
  GovernanceEngine,
  GATE_BEHAVIOR_MATRIX,
  getGateBehavior,
  getBlockingGates,
  getAdvisoryGates,
  getActiveGates,
  canBypass,
  evaluateGate,
  resolveGovernanceLevel,
  GOVERNANCE_LEVEL_NAMES,
} from './governance';

export type {
  GovernanceLevel,
  GateBehavior,
  GateSeverity,
  GateName,
  GateResult,
  GovernanceDecision,
  GovernanceAuditEntry,
  GateBehaviorMatrix,
  BranchGovernanceOverride,
  GovernanceEngineOptions,
} from './governance';

// === Phase 1: Configuration ===
export {
  loadIntegrationConfig,
  DEFAULT_CONFIG,
  loadYAMLFile,
  loadAndValidate,
  loadEnvOverrides,
  getDefaultPaths,
  mergeConfigs,
  buildConfig,
  configSchema,
  validateConfig,
  safeValidateConfig,
} from './config';

export type {
  IntegrationConfig,
  PartialIntegrationConfig,
  GovernanceConfig,
  ClassificationConfig,
  RoutingConfig,
  PhaseConfig,
  BypassConfig,
  TrackingConfig,
  PerformanceConfig,
  UXConfig,
  BranchConfig,
  ConfigPaths,
} from './config';

// === Phase 2: Hook Bridge ===
export { HookBridge, getHookBridge, resetHookBridge } from './hooks/lib/hook-bridge';
export type { HookBridgeResult } from './hooks/lib/hook-bridge';

// === Phase 2: Message Transformer ===
export { transformMessage, createPassthroughResult } from './hooks/lib/message-transformer';
export type { TransformResult } from './hooks/lib/message-transformer';

// === Phase 2: Hook Config Loader ===
export { loadHookConfig, clearConfigCache } from './hooks/lib/config-loader';
export type { HookConfig } from './hooks/lib/config-loader';

// === Phase 2: Bridge ===
export { HookMCPBridge, getBridge, resetBridge } from './bridge/hook-mcp-bridge';
export type { BridgeMessage, SharedClassification } from './bridge/hook-mcp-bridge';

// === Phase 2: Workflow Executor ===
export { WorkflowExecutor } from './executor/workflow-executor';
export type { WorkflowRecord, PhaseExecution, WorkflowStatus } from './executor/workflow-executor';

// === Phase 2: Progress Tracker ===
export { ProgressTracker } from './executor/progress-tracker';
export type { ProgressEvent, ProgressStats } from './executor/progress-tracker';

// === Phase 3: Enhanced Governance ===
export { ApprovalWorkflow } from './governance/approval-workflow';
export type {
  ApprovalRequest,
  ApprovalRequestInput,
  ApprovalStatus,
  ApprovalEvent,
  ApprovalEventListener,
  ApprovalWorkflowConfig,
} from './governance/approval-workflow';

export { BypassTokenManager } from './governance/bypass-token-manager';
export type {
  BypassTokenData,
  GenerateTokenInput,
  TokenValidationResult,
} from './governance/bypass-token-manager';

export { PolicyEnforcer } from './governance/policy-enforcer';
export type {
  EnforcementResult,
  EnforcementInput,
  PolicyEnforcerConfig,
} from './governance/policy-enforcer';

// === Phase 3: Audit Logging ===
export { AuditLogger, InMemoryAuditLogProvider } from './audit/audit-logger';
export type { AuditLoggerConfig } from './audit/audit-logger';

export { AuditExporter } from './audit/audit-exporter';
export type { ExportFormat, ExportOptions, ExportResult } from './audit/audit-exporter';

export type {
  AuditEvent,
  AuditEventInput,
  AuditEventType,
  AuditQueryFilters,
  AuditQueryResult,
  AuditSummary,
  AuditLogProvider,
} from './audit/types';

// === Phase 3: Performance ===
export { ClassificationCache } from './performance/classification-cache';
export type { CacheStats, ClassificationCacheConfig } from './performance/classification-cache';

export { AsyncProcessor } from './performance/async-processor';
export type {
  AsyncJob,
  JobStatus,
  JobProcessor,
  AsyncProcessorConfig,
  JobEvent,
  JobEventListener,
} from './performance/async-processor';

export { BatchProcessor } from './performance/batch-processor';
export type {
  BatchItem,
  BatchResult,
  SingleProcessor,
  BatchProcessorConfig,
} from './performance/batch-processor';

export { MetricsCollector } from './performance/metrics-collector';
export type {
  MetricPoint,
  AggregatedMetrics,
  PerformanceSnapshot,
} from './performance/metrics-collector';

// === Phase 3: WebSocket ===
export {
  IntegrationEventEmitter,
  getIntegrationEmitter,
  resetIntegrationEmitter,
} from './websocket/event-emitter';
export type {
  IntegrationEventType,
  IntegrationEvent,
  EventListener,
} from './websocket/event-emitter';

export { IntegrationWebSocketServer } from './websocket/websocket-server';
export type {
  WebSocketClient,
  WebSocketServerStats,
  WebSocketServerConfig,
} from './websocket/websocket-server';
