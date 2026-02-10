/**
 * Workflow Engine
 *
 * Manages multi-agent workflow execution with retry logic and state management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  StepExecution,
  RetryPolicy
} from '../types/orchestration-types';
import { AgentRegistry } from '../agents/agent-registry';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('WorkflowEngine');

export class WorkflowEngine {
  private agentRegistry: AgentRegistry;
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private maxExecutionHistory = 100;

  constructor(agentRegistry: AgentRegistry) {
    this.agentRegistry = agentRegistry;
  }

  /**
   * Register a workflow
   */
  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
    logger.info(`Workflow registered: ${workflow.id} (${workflow.name})`);
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(workflowId: string): void {
    this.workflows.delete(workflowId);
    logger.info(`Workflow unregistered: ${workflowId}`);
  }

  /**
   * Get a workflow
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * List all workflows
   */
  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Execute a workflow
   */
  async execute(workflowId: string, context: any = {}): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId,
      startTime: new Date(),
      status: 'running',
      steps: [],
      context
    };

    // Store execution
    this.executions.set(execution.id, execution);

    logger.info(`Workflow execution started: ${workflow.name}`, {
      executionId: execution.id,
      workflowId,
      context
    });

    try {
      // Execute each step in sequence
      for (const step of workflow.steps) {
        const stepExecution = await this.executeStep(step, execution.context);
        execution.steps.push(stepExecution);

        // Check if step failed
        if (stepExecution.status === 'failed') {
          if (!step.continueOnFailure) {
            execution.status = 'failed';
            execution.error = `Step ${step.name} failed: ${stepExecution.error}`;
            logger.error('Workflow failed due to step failure', {
              executionId: execution.id,
              stepId: step.id,
              error: stepExecution.error
            });
            break;
          } else {
            logger.warn('Step failed but continuing due to continueOnFailure', {
              executionId: execution.id,
              stepId: step.id
            });
          }
        }

        // Update context with step output
        if (stepExecution.output) {
          execution.context = {
            ...execution.context,
            ...stepExecution.output
          };
        }
      }

      // If no failures, mark as completed
      if (execution.status === 'running') {
        execution.status = 'completed';
      }

    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      logger.error('Workflow execution failed', {
        executionId: execution.id,
        error: error.message,
        stack: error.stack
      });
    }

    execution.endTime = new Date();
    const duration = execution.endTime.getTime() - execution.startTime.getTime();

    logger.info('Workflow execution completed', {
      executionId: execution.id,
      status: execution.status,
      duration,
      stepsCompleted: execution.steps.filter(s => s.status === 'completed').length,
      stepsFailed: execution.steps.filter(s => s.status === 'failed').length
    });

    return execution;
  }

  /**
   * Execute a workflow step with retry logic
   */
  private async executeStep(step: WorkflowStep, context: any): Promise<StepExecution> {
    const stepExecution: StepExecution = {
      stepId: step.id,
      agentId: step.agentId,
      startTime: new Date(),
      status: 'running',
      attempts: 0
    };

    logger.info(`Executing step: ${step.name}`, {
      stepId: step.id,
      agentId: step.agentId,
      action: step.action
    });

    const maxAttempts = step.retryPolicy?.maxAttempts || 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      stepExecution.attempts = attempt;

      try {
        // Get the agent
        const agent = this.agentRegistry.get(step.agentId);
        if (!agent) {
          throw new Error(`Agent not found: ${step.agentId}`);
        }

        // Prepare parameters with context interpolation
        const parameters = this.interpolateParameters(step.parameters, context);
        parameters.action = step.action;
        parameters.context = context;

        // Execute with timeout if specified
        const result = step.timeout
          ? await this.executeWithTimeout(
              () => agent.execute(parameters),
              step.timeout
            )
          : await agent.execute(parameters);

        // Check if agent execution was successful
        if (result.status === 'completed') {
          stepExecution.status = 'completed';
          stepExecution.output = result.result;
          stepExecution.endTime = new Date();

          logger.info(`Step completed: ${step.name}`, {
            stepId: step.id,
            attempts: attempt,
            duration: stepExecution.endTime.getTime() - stepExecution.startTime.getTime()
          });

          return stepExecution;
        } else {
          throw new Error(result.error || 'Agent execution failed');
        }

      } catch (error: any) {
        logger.warn(`Step attempt ${attempt} failed: ${step.name}`, {
          stepId: step.id,
          error: error.message,
          attempt,
          maxAttempts
        });

        // If this was the last attempt, mark as failed
        if (attempt === maxAttempts) {
          stepExecution.status = 'failed';
          stepExecution.error = error.message;
          stepExecution.endTime = new Date();

          logger.error(`Step failed after ${maxAttempts} attempts: ${step.name}`, {
            stepId: step.id,
            error: error.message
          });

          return stepExecution;
        }

        // Wait before retrying (exponential backoff)
        if (step.retryPolicy) {
          const backoff = this.calculateBackoff(
            attempt,
            step.retryPolicy.backoffMs,
            step.retryPolicy.backoffMultiplier
          );
          await this.sleep(backoff);
        }
      }
    }

    // Should never reach here, but just in case
    stepExecution.status = 'failed';
    stepExecution.error = 'Unknown error';
    stepExecution.endTime = new Date();
    return stepExecution;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Interpolate parameters with context values
   */
  private interpolateParameters(parameters: any, context: any): any {
    if (typeof parameters === 'string') {
      return this.interpolateString(parameters, context);
    }

    if (Array.isArray(parameters)) {
      return parameters.map(p => this.interpolateParameters(p, context));
    }

    if (typeof parameters === 'object' && parameters !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(parameters)) {
        result[key] = this.interpolateParameters(value, context);
      }
      return result;
    }

    return parameters;
  }

  /**
   * Interpolate string with context values using {{ variable }} syntax
   */
  private interpolateString(str: string, context: any): string {
    return str.replace(/\{\{\s*context\.(\w+)\s*\}\}/g, (_, key) => {
      return context[key] !== undefined ? context[key] : `{{context.${key}}}`;
    });
  }

  /**
   * Calculate exponential backoff
   */
  private calculateBackoff(
    attempt: number,
    baseMs: number,
    multiplier: number = 2
  ): number {
    return baseMs * Math.pow(multiplier, attempt - 1);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get workflow execution
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List all executions
   */
  listExecutions(workflowId?: string, limit?: number): WorkflowExecution[] {
    let executions = Array.from(this.executions.values());

    if (workflowId) {
      executions = executions.filter(e => e.workflowId === workflowId);
    }

    // Sort by start time descending
    executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    if (limit) {
      executions = executions.slice(0, limit);
    }

    return executions;
  }

  /**
   * Cancel a running workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    if (execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      logger.info(`Workflow execution cancelled: ${executionId}`);
      return true;
    }

    return false;
  }

  /**
   * Clear old executions
   */
  clearOldExecutions(): void {
    const executions = Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    if (executions.length > this.maxExecutionHistory) {
      const toRemove = executions.slice(this.maxExecutionHistory);
      toRemove.forEach(e => this.executions.delete(e.id));
      logger.info(`Cleared ${toRemove.length} old workflow executions`);
    }
  }
}
