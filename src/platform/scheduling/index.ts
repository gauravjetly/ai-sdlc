/**
 * Scheduling Module
 *
 * Public API for the Scheduled Agent Work Builder module.
 * Exports all entities, services, and routes needed by the platform.
 *
 * v1: Work item scheduling, triggers, agent memory, templates
 * v2: Multi-project orchestration, agent pool, delivery health analytics
 */

// ===========================
// v1 - Work Item Scheduling
// ===========================

// Domain Entities
export {
  ScheduledWorkItem,
  WorkType,
  ScheduleType,
  WorkStatus,
  WorkPriority,
} from './domain/entities/ScheduledWorkItem';
export type { ScheduledWorkItemProps } from './domain/entities/ScheduledWorkItem';

export {
  WorkTrigger,
} from './domain/entities/WorkTrigger';
export type { WorkTriggerProps, TriggerAction } from './domain/entities/WorkTrigger';

export {
  AgentMemory,
} from './domain/entities/AgentMemory';
export type { AgentMemoryProps, MemoryStats } from './domain/entities/AgentMemory';

export {
  WorkExecution,
  ExecutionStatus,
} from './domain/entities/WorkExecution';
export type { WorkExecutionProps, ExecutionArtifact } from './domain/entities/WorkExecution';

export {
  WorkTemplate,
} from './domain/entities/WorkTemplate';
export type {
  WorkTemplateProps,
  AppDefinition,
  TemplateDependency,
  TemplateVariable,
} from './domain/entities/WorkTemplate';

// Value Objects
export { CronSchedule } from './domain/value-objects/CronSchedule';
export { AgentAssignment } from './domain/value-objects/AgentAssignment';
export type { AgentRole } from './domain/value-objects/AgentAssignment';
export type {
  TriggerCondition,
  TriggerConditionGroup,
  ConditionOperator,
} from './domain/value-objects/TriggerCondition';
export {
  validateCondition,
  validateConditionGroup,
  conditionToString,
} from './domain/value-objects/TriggerCondition';

// Application Services
export { SchedulingService } from './application/services/SchedulingService';
export type {
  IScheduledWorkRepository,
  IWorkExecutionRepository,
  ISchedulingQueue,
  WorkItemFilters,
  ExecutionFilters,
  QueueStats,
  CreateWorkItemDTO,
  DashboardData,
} from './application/services/SchedulingService';

export { TriggerService } from './application/services/TriggerService';
export type {
  ITriggerRepository,
  TriggerFilters,
  CreateTriggerDTO,
  PlatformEvent,
} from './application/services/TriggerService';

export { AgentMemoryService } from './application/services/AgentMemoryService';
export type { IAgentMemoryRepository } from './application/services/AgentMemoryService';

// Presentation
export { createSchedulingRoutes } from './presentation/routes/scheduling-routes';

// DTOs and Validation Schemas
export {
  CreateWorkItemSchema,
  WorkItemFiltersSchema,
  CreateTriggerSchema,
  TriggerFiltersSchema,
  StoreMemorySchema,
  MemoryFiltersSchema,
  CreateTemplateSchema,
  InstantiateTemplateSchema,
  ExecutionFiltersSchema,
} from './presentation/dto/scheduling-dto';

// ===========================
// v2 - Multi-Project Orchestration
// ===========================

// Domain Entities
export {
  ScheduledProject,
  SDLCPhase,
  SDLC_PHASE_ORDER,
  PHASE_AGENT_MAP,
  PhaseStatus,
  ProjectStatus,
  ProjectPriority,
} from './domain/entities/ScheduledProject';
export type {
  ScheduledProjectProps,
  ProjectPhase,
  PhaseArtifact,
  DeliveryHealth,
} from './domain/entities/ScheduledProject';

// Application Services
export { ProjectOrchestrationService } from './application/services/ProjectOrchestrationService';
export type {
  IProjectRepository,
  IAgentPool,
  ProjectFilters,
  CreateProjectDTO,
  AgentPoolStatus,
  MultiProjectDashboard,
} from './application/services/ProjectOrchestrationService';

// Presentation
export { createProjectRoutes } from './presentation/routes/project-routes';

// DTOs and Validation Schemas
export {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectFiltersSchema,
  CompletePhaseSchema,
  FailPhaseSchema,
  BlockProjectSchema,
  PhaseParamSchema,
  VALID_PHASES,
} from './presentation/dto/project-dto';
export type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFiltersInput,
  CompletePhaseInput,
  FailPhaseInput,
  BlockProjectInput,
} from './presentation/dto/project-dto';
