/**
 * Pipeline Module - Multi-Stage Deployment Automation
 *
 * Export all pipeline services and types
 */

export * from './pipeline.service';
export * from './promotion.service';
export * from './approval.service';

// Re-export key types for convenience
export type {
  PipelineConfig,
  PipelineStage,
  PipelineExecution,
  StageExecution,
  DeploymentConfig,
  SmokeTest,
  SmokeTestResult
} from './pipeline.service';

export type {
  PromotionRequest,
  PromotionResult,
  ValidationResult,
  RollbackRequest,
  CanaryConfig
} from './promotion.service';

export type {
  ApprovalRequest,
  Approval,
  ApprovalDecision,
  ApprovalMetadata,
  ApprovalAuditEntry
} from './approval.service';

export { ApprovalStatus, ApprovalType } from './approval.service';
