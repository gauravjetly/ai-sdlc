/**
 * Base Agent Class
 *
 * Foundation for all AI agents in the orchestration system
 */

import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentConfig, AgentExecution } from '../types/orchestration-types';
import { createLogger } from '../../../utils/logger';

export abstract class BaseAgent implements Agent {
  protected logger: ReturnType<typeof createLogger>;
  public readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.logger = createLogger(`Agent:${config.name}`);
  }

  /**
   * Initialize the agent
   * Override this to set up connections, load models, etc.
   */
  async initialize(): Promise<void> {
    this.logger.info(`Initializing agent: ${this.config.name}`);
    await this.onInitialize();
    this.logger.info(`Agent initialized: ${this.config.name}`);
  }

  /**
   * Execute agent with parameters
   */
  async execute(parameters: any): Promise<AgentExecution> {
    const execution: AgentExecution = {
      id: this.generateId(),
      agentId: this.config.id,
      startTime: new Date(),
      status: 'running',
      parameters,
      logs: []
    };

    this.logger.info('Agent execution started', {
      executionId: execution.id,
      agentId: this.config.id,
      parameters
    });

    try {
      // Validate parameters
      this.validateParameters(parameters);

      // Run the agent's main logic
      const result = await this.run(parameters);

      execution.status = 'completed';
      execution.result = result;
      execution.endTime = new Date();

      this.logger.info('Agent execution completed', {
        executionId: execution.id,
        duration: execution.endTime.getTime() - execution.startTime.getTime()
      });

    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();

      this.logger.error('Agent execution failed', {
        executionId: execution.id,
        error: error.message,
        stack: error.stack
      });
    }

    return execution;
  }

  /**
   * Health check for the agent
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.onHealthCheck();
      return true;
    } catch (error) {
      this.logger.error('Health check failed', { error });
      return false;
    }
  }

  /**
   * Generate unique ID
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Abstract methods to be implemented by concrete agents
   */
  protected abstract run(parameters: any): Promise<any>;

  /**
   * Optional hooks for subclasses
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclass if needed
  }

  protected async onHealthCheck(): Promise<void> {
    // Override in subclass if needed
  }

  protected validateParameters(parameters: any): void {
    // Override in subclass for parameter validation
  }

  /**
   * Helper method to add execution logs
   */
  protected log(execution: AgentExecution, message: string): void {
    if (!execution.logs) {
      execution.logs = [];
    }
    execution.logs.push(`[${new Date().toISOString()}] ${message}`);
  }
}
