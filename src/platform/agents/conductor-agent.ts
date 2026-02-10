/**
 * Conductor Agent
 *
 * AI persona for orchestrating multi-agent workflows
 * Coordinates agent collaboration, manages workflow execution, and monitors agent health
 */

import { BaseAgent, BaseAgentConfig } from './base-agent';
import { AgentType, PlatformEvent, Workflow, WorkflowExecution } from '../orchestration/types/orchestration-types';
import { v4 as uuidv4 } from 'uuid';

export interface ConductorAgentConfig extends BaseAgentConfig {
  maxConcurrentWorkflows?: number;
  workflowTimeout?: number; // milliseconds
  agentHealthCheckInterval?: number; // minutes
}

/**
 * Conductor Agent
 * Specialized in multi-agent workflow orchestration
 */
export class ConductorAgent extends BaseAgent {
  private conductorConfig: ConductorAgentConfig;
  private activeWorkflows: Map<string, WorkflowExecution> = new Map();
  private agentRegistry: Map<string, any> = new Map();

  constructor(config: ConductorAgentConfig) {
    super(config);
    this.conductorConfig = {
      maxConcurrentWorkflows: 10,
      workflowTimeout: 3600000, // 1 hour
      agentHealthCheckInterval: 5,
      ...config
    };
  }

  protected setupEventTriggers(): void {
    // Monitor workflow events
    this.registerEventHandler('workflow.started', async (event: PlatformEvent) => {
      await this.trackWorkflowStart(event);
    });

    this.registerEventHandler('workflow.completed', async (event: PlatformEvent) => {
      await this.trackWorkflowCompletion(event);
    });

    this.registerEventHandler('workflow.failed', async (event: PlatformEvent) => {
      await this.handleWorkflowFailure(event);
    });

    // Monitor agent health
    this.registerEventHandler('agent.unhealthy', async (event: PlatformEvent) => {
      await this.handleUnhealthyAgent(event);
    });
  }

  protected setupScheduledJobs(): void {
    // Continuous workflow monitoring
    this.scheduleJob(
      'workflow-monitoring',
      '*/5 * * * *', // Every 5 minutes
      async () => await this.monitorActiveWorkflows()
    );

    // Agent health checks every 5 minutes
    this.scheduleJob(
      'agent-health-checks',
      '*/5 * * * *',
      async () => await this.checkAgentHealth()
    );

    // Daily workflow analytics (8 AM)
    this.scheduleJob(
      'workflow-analytics',
      '0 8 * * *',
      async () => await this.generateWorkflowAnalytics()
    );

    // Hourly capacity check
    this.scheduleJob(
      'capacity-check',
      '0 * * * *',
      async () => await this.checkOrchestratorCapacity()
    );
  }

  protected async executeInternal(parameters: any): Promise<any> {
    const { action, ...params } = parameters;

    switch (action) {
      case 'execute_workflow':
        return await this.executeWorkflow(params);
      case 'get_workflow_status':
        return await this.getWorkflowStatus(params);
      case 'cancel_workflow':
        return await this.cancelWorkflow(params);
      case 'get_agent_status':
        return await this.getAgentStatus(params);
      case 'coordinate_agents':
        return await this.coordinateAgents(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  protected getAgentType(): AgentType {
    // Conductor is a special type, we'll use a custom type
    return 'conductor' as any;
  }

  protected getCapabilities(): string[] {
    return [
      'execute_workflow',
      'coordinate_agents',
      'monitor_workflows',
      'get_agent_status',
      'manage_agent_lifecycle',
      'optimize_agent_allocation'
    ];
  }

  // Public Methods

  /**
   * Register an agent with the conductor
   */
  registerAgent(agentId: string, agent: any): void {
    this.agentRegistry.set(agentId, agent);
    this.logger.info('Agent registered with conductor', {
      agentId,
      agentType: agent.getAgentType?.()
    });
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agentRegistry.delete(agentId);
    this.logger.info('Agent unregistered from conductor', { agentId });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(params: {
    workflow: Workflow;
    context?: any;
  }): Promise<WorkflowExecution> {
    this.logger.info('Executing workflow', {
      workflowId: params.workflow.id,
      workflowName: params.workflow.name,
      steps: params.workflow.steps.length
    });

    // Check capacity
    if (this.activeWorkflows.size >= this.conductorConfig.maxConcurrentWorkflows!) {
      throw new Error('Maximum concurrent workflows reached');
    }

    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId: params.workflow.id,
      startTime: new Date(),
      status: 'running',
      steps: params.workflow.steps.map(step => ({
        stepId: step.id,
        agentId: step.agentId,
        startTime: new Date(),
        status: 'pending',
        attempts: 0
      })),
      context: params.context || {}
    };

    this.activeWorkflows.set(execution.id, execution);

    // Publish workflow started event
    await this.eventManager.publishEvent({
      type: 'workflow.started',
      timestamp: new Date(),
      data: {
        executionId: execution.id,
        workflowId: params.workflow.id
      }
    });

    // Execute workflow steps
    try {
      for (const step of params.workflow.steps) {
        await this.executeWorkflowStep(execution, step);

        // Check if workflow should continue
        if (execution.status === 'failed' || execution.status === 'cancelled') {
          break;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.endTime = new Date();

        await this.eventManager.publishEvent({
          type: 'workflow.completed',
          timestamp: new Date(),
          data: {
            executionId: execution.id,
            workflowId: params.workflow.id,
            duration: execution.endTime.getTime() - execution.startTime.getTime()
          }
        });
      }

    } catch (error: any) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error.message;

      this.logger.error('Workflow execution failed', {
        executionId: execution.id,
        error: error.message
      });

      await this.eventManager.publishEvent({
        type: 'workflow.failed',
        timestamp: new Date(),
        data: {
          executionId: execution.id,
          workflowId: params.workflow.id,
          error: error.message
        }
      });
    } finally {
      this.activeWorkflows.delete(execution.id);
    }

    return execution;
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(params: { executionId: string }): Promise<WorkflowExecution | null> {
    return this.activeWorkflows.get(params.executionId) || null;
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(params: { executionId: string }): Promise<void> {
    const execution = this.activeWorkflows.get(params.executionId);

    if (execution) {
      execution.status = 'cancelled';
      execution.endTime = new Date();

      this.logger.info('Workflow cancelled', {
        executionId: params.executionId
      });

      this.activeWorkflows.delete(params.executionId);
    }
  }

  /**
   * Get agent status
   */
  async getAgentStatus(params: { agentId?: string }): Promise<any> {
    if (params.agentId) {
      const agent = this.agentRegistry.get(params.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${params.agentId}`);
      }

      const healthy = await agent.healthCheck?.();
      return {
        agentId: params.agentId,
        healthy,
        config: agent.getConfig?.()
      };
    }

    // Get all agent statuses
    const statuses = [];
    for (const [agentId, agent] of this.agentRegistry.entries()) {
      const healthy = await agent.healthCheck?.();
      statuses.push({
        agentId,
        healthy,
        type: agent.getAgentType?.()
      });
    }

    return { agents: statuses };
  }

  /**
   * Coordinate multiple agents for a complex task
   */
  async coordinateAgents(params: {
    agents: string[];
    task: string;
    parameters: any;
  }): Promise<any> {
    this.logger.info('Coordinating agents', {
      agents: params.agents,
      task: params.task
    });

    const results = [];

    for (const agentId of params.agents) {
      const agent = this.agentRegistry.get(agentId);
      if (!agent) {
        this.logger.warn('Agent not found in registry', { agentId });
        continue;
      }

      try {
        const result = await agent.execute({
          action: params.task,
          ...params.parameters
        });
        results.push({ agentId, result });

      } catch (error: any) {
        this.logger.error('Agent execution failed during coordination', {
          agentId,
          error: error.message
        });
        results.push({ agentId, error: error.message });
      }
    }

    return { results };
  }

  // Event Handlers
  private async trackWorkflowStart(event: PlatformEvent): Promise<void> {
    const { executionId, workflowId } = event.data;
    this.logger.info('Workflow started', { executionId, workflowId });
  }

  private async trackWorkflowCompletion(event: PlatformEvent): Promise<void> {
    const { executionId, workflowId, duration } = event.data;
    this.logger.info('Workflow completed', {
      executionId,
      workflowId,
      duration
    });
  }

  private async handleWorkflowFailure(event: PlatformEvent): Promise<void> {
    const { executionId, workflowId, error } = event.data;
    this.logger.error('Workflow failed', {
      executionId,
      workflowId,
      error
    });

    // Could implement retry logic or escalation here
  }

  private async handleUnhealthyAgent(event: PlatformEvent): Promise<void> {
    const { agentId } = event.data;
    this.logger.error('Agent unhealthy', { agentId });

    // Could implement automatic restart or replacement logic
  }

  // Scheduled Tasks
  private async monitorActiveWorkflows(): Promise<void> {
    this.logger.debug('Monitoring active workflows', {
      active_count: this.activeWorkflows.size
    });

    const now = Date.now();

    for (const [executionId, execution] of this.activeWorkflows.entries()) {
      const duration = now - execution.startTime.getTime();

      if (duration > this.conductorConfig.workflowTimeout!) {
        this.logger.warn('Workflow timeout detected', {
          executionId,
          duration,
          timeout: this.conductorConfig.workflowTimeout
        });

        await this.cancelWorkflow({ executionId });
      }
    }
  }

  private async checkAgentHealth(): Promise<void> {
    this.logger.debug('Checking agent health', {
      registered_agents: this.agentRegistry.size
    });

    for (const [agentId, agent] of this.agentRegistry.entries()) {
      try {
        const healthy = await agent.healthCheck?.();

        if (!healthy) {
          this.logger.warn('Agent health check failed', { agentId });

          await this.eventManager.publishEvent({
            type: 'agent.unhealthy',
            timestamp: new Date(),
            data: { agentId }
          });
        }

      } catch (error: any) {
        this.logger.error('Agent health check error', {
          agentId,
          error: error.message
        });
      }
    }
  }

  private async generateWorkflowAnalytics(): Promise<void> {
    this.logger.info('Generating workflow analytics');

    const analytics = await this.mcpClient.callTool('get_workflow_analytics', {
      time_range: '24h'
    });

    this.logger.info('Workflow analytics generated', {
      total_workflows: analytics.total,
      successful: analytics.successful,
      failed: analytics.failed,
      avg_duration: analytics.avg_duration
    });
  }

  private async checkOrchestratorCapacity(): Promise<void> {
    const utilizationPercent = (this.activeWorkflows.size / this.conductorConfig.maxConcurrentWorkflows!) * 100;

    this.logger.info('Orchestrator capacity check', {
      active_workflows: this.activeWorkflows.size,
      max_concurrent: this.conductorConfig.maxConcurrentWorkflows,
      utilization: utilizationPercent.toFixed(2) + '%'
    });

    if (utilizationPercent > 80) {
      this.logger.warn('Orchestrator capacity approaching limit', {
        utilization: utilizationPercent.toFixed(2) + '%'
      });
    }
  }

  // Private Helper Methods
  private async executeWorkflowStep(execution: WorkflowExecution, step: any): Promise<void> {
    const stepExecution = execution.steps.find(s => s.stepId === step.id);
    if (!stepExecution) {
      throw new Error(`Step execution not found: ${step.id}`);
    }

    stepExecution.status = 'running';
    stepExecution.startTime = new Date();

    this.logger.info('Executing workflow step', {
      executionId: execution.id,
      stepId: step.id,
      agentId: step.agentId
    });

    try {
      // Get agent
      const agent = this.agentRegistry.get(step.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${step.agentId}`);
      }

      // Execute step with retries
      const maxAttempts = step.retryPolicy?.maxAttempts || 1;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        stepExecution.attempts = attempt;

        try {
          const result = await agent.execute({
            action: step.action,
            ...step.parameters
          });

          stepExecution.output = result;
          stepExecution.status = 'completed';
          stepExecution.endTime = new Date();

          this.logger.info('Workflow step completed', {
            executionId: execution.id,
            stepId: step.id,
            attempts: attempt
          });

          return;

        } catch (error: any) {
          lastError = error;

          if (attempt < maxAttempts) {
            const backoffMs = step.retryPolicy?.backoffMs || 1000;
            const backoffMultiplier = step.retryPolicy?.backoffMultiplier || 1;
            const delay = backoffMs * Math.pow(backoffMultiplier, attempt - 1);

            this.logger.warn('Workflow step failed, retrying', {
              executionId: execution.id,
              stepId: step.id,
              attempt,
              maxAttempts,
              delay
            });

            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries exhausted
      throw lastError;

    } catch (error: any) {
      stepExecution.status = 'failed';
      stepExecution.error = error.message;
      stepExecution.endTime = new Date();

      this.logger.error('Workflow step failed', {
        executionId: execution.id,
        stepId: step.id,
        error: error.message
      });

      if (!step.continueOnFailure) {
        execution.status = 'failed';
        throw error;
      }

      // Mark as skipped and continue
      stepExecution.status = 'skipped';
    }
  }
}
