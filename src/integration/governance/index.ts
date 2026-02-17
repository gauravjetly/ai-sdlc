/**
 * Governance Engine Module
 *
 * Phase 1: Core governance engine, levels, and policy evaluation.
 * Phase 3: Approval workflows, bypass tokens, and policy enforcement.
 *
 * @module governance
 */

// === Phase 1: Core Governance ===
export { GovernanceEngine } from './GovernanceEngine';
export type { GovernanceEngineOptions } from './GovernanceEngine';
export {
  GATE_BEHAVIOR_MATRIX,
  getGateBehavior,
  getBlockingGates,
  getAdvisoryGates,
  getActiveGates,
  canBypass,
} from './levels';
export { evaluateGate, resolveGovernanceLevel } from './policies';
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
} from './types';
export { GOVERNANCE_LEVEL_NAMES } from './types';

// === Phase 3: Approval Workflows ===
export { ApprovalWorkflow } from './approval-workflow';
export type {
  ApprovalRequest,
  ApprovalRequestInput,
  ApprovalStatus,
  ApprovalEvent,
  ApprovalEventListener,
  ApprovalWorkflowConfig,
} from './approval-workflow';

// === Phase 3: Bypass Token Manager ===
export { BypassTokenManager } from './bypass-token-manager';
export type {
  BypassTokenData,
  GenerateTokenInput,
  TokenValidationResult,
} from './bypass-token-manager';

// === Phase 3: Policy Enforcer ===
export { PolicyEnforcer } from './policy-enforcer';
export type {
  EnforcementResult,
  EnforcementInput,
  PolicyEnforcerConfig,
} from './policy-enforcer';
