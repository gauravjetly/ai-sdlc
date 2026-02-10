/**
 * Orchestration Type Definitions
 *
 * Core types for agent orchestration, scheduling, and workflow management
 */

/**
 * Platform event structure
 */
export interface PlatformEvent {
  type: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

/**
 * Event handler function
 */
export type EventHandler = (event: PlatformEvent) => Promise<void>;

/**
 * Scheduled job configuration
 */
export interface ScheduledJob {
  name: string;
  cron: string;
  agentId: string;
  parameters: any;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

/**
 * Job execution record
 */
export interface JobExecution {
  id: string;
  jobName: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  result?: any;
}

/**
 * Workflow definition
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  metadata?: Record<string, any>;
}

/**
 * Workflow step configuration
 */
export interface WorkflowStep {
  id: string;
  name: string;
  agentId: string;
  action: string;
  parameters: any;
  continueOnFailure?: boolean;
  retryPolicy?: RetryPolicy;
  timeout?: number;
}

/**
 * Retry policy for workflow steps
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
}

/**
 * Workflow execution state
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  steps: StepExecution[];
  context: any;
  error?: string;
}

/**
 * Workflow step execution
 */
export interface StepExecution {
  stepId: string;
  agentId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  attempts: number;
  output?: any;
  error?: string;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  capabilities: string[];
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Agent types
 */
export enum AgentType {
  DEVELOPER = 'developer',
  SRE = 'sre',
  SECURITY = 'security',
  QA = 'qa',
  ARCHITECT = 'architect',
  RELEASE_MANAGER = 'release-manager',
  FINOPS = 'finops',
  BA = 'ba',
  CUSTOMER_SUPPORT = 'customer-support'
}

/**
 * Agent interface
 */
export interface Agent {
  config: AgentConfig;
  initialize(): Promise<void>;
  execute(parameters: any): Promise<AgentExecution>;
  healthCheck(): Promise<boolean>;
}

/**
 * Agent execution result
 */
export interface AgentExecution {
  id: string;
  agentId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  parameters: any;
  result?: any;
  error?: string;
  logs?: string[];
}

/**
 * Schedule configuration file structure
 */
export interface ScheduleConfig {
  schedules: ScheduledJob[];
}

/**
 * Workflow configuration file structure
 */
export interface WorkflowConfig {
  workflow: Workflow;
}

/**
 * Orchestrator state
 */
export interface OrchestratorState {
  running: boolean;
  startTime?: Date;
  scheduledJobs: number;
  activeExecutions: number;
  totalExecutions: number;
  workflows: number;
}
