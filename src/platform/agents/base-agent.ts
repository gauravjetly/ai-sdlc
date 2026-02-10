/**
 * Base Agent
 *
 * Abstract base class for all AI agent personas
 * Provides common functionality for MCP integration, event handling, and scheduling
 */

import { PlatformMCPClient } from '../mcp/client/mcp-client';
import { EventManager } from '../orchestration/engine/event-manager';
import { Scheduler } from '../orchestration/engine/scheduler';
import {
  AgentConfig,
  AgentExecution,
  PlatformEvent
} from '../orchestration/types/orchestration-types';
import { createLogger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface BaseAgentConfig {
  id: string;
  name: string;
  description: string;
  mcpServerCommand?: string;
  enableScheduling?: boolean;
  enableEventTriggers?: boolean;
  logLevel?: string;
}

/**
 * Abstract base class for all agents
 * Provides MCP client, event handling, and scheduling capabilities
 */
export abstract class BaseAgent {
  protected config: BaseAgentConfig;
  protected mcpClient: PlatformMCPClient;
  protected eventManager: EventManager;
  protected scheduler: Scheduler;
  protected logger: any;
  protected initialized: boolean = false;
  protected executions: AgentExecution[] = [];

  constructor(config: BaseAgentConfig) {
    this.config = config;
    this.mcpClient = new PlatformMCPClient();
    this.eventManager = new EventManager();
    this.scheduler = new Scheduler();
    this.logger = createLogger(config.name);
  }

  /**
   * Initialize the agent
   * Connect to MCP server, setup event triggers, and schedule jobs
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info(`Initializing ${this.config.name}...`);

      // Connect to MCP server
      await this.mcpClient.connect({
        serverCommand: this.config.mcpServerCommand || 'node dist/mcp/server/mcp-server.js',
        transport: 'stdio'
      });

      // Setup event triggers if enabled
      if (this.config.enableEventTriggers) {
        this.setupEventTriggers();
        this.logger.info('Event triggers configured');
      }

      // Setup scheduled jobs if enabled
      if (this.config.enableScheduling) {
        this.setupScheduledJobs();
        this.logger.info('Scheduled jobs configured');
      }

      this.initialized = true;
      this.logger.info(`${this.config.name} initialized successfully`);

    } catch (error: any) {
      this.logger.error(`Failed to initialize ${this.config.name}:`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Shutdown the agent
   * Disconnect from MCP, stop scheduler, and cleanup resources
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info(`Shutting down ${this.config.name}...`);

      // Stop scheduler
      if (this.scheduler.isRunning()) {
        this.scheduler.stop();
      }

      // Disconnect from MCP
      await this.mcpClient.disconnect();

      this.initialized = false;
      this.logger.info(`${this.config.name} shut down successfully`);

    } catch (error: any) {
      this.logger.error(`Error during shutdown:`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Health check
   * Verify agent is initialized and MCP connection is active
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized) {
        return false;
      }

      // Try to list tools as a health check
      await this.mcpClient.listTools();
      return true;

    } catch (error: any) {
      this.logger.warn('Health check failed:', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Execute agent action
   * Template method for agent execution with logging and error handling
   */
  async execute(parameters: any): Promise<AgentExecution> {
    const execution: AgentExecution = {
      id: uuidv4(),
      agentId: this.config.id,
      startTime: new Date(),
      status: 'running',
      parameters,
      logs: []
    };

    this.executions.push(execution);

    try {
      this.logger.info('Starting execution', {
        executionId: execution.id,
        parameters
      });

      // Execute agent-specific logic
      const result = await this.executeInternal(parameters);

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = result;

      const duration = execution.endTime.getTime() - execution.startTime.getTime();
      this.logger.info('Execution completed', {
        executionId: execution.id,
        duration
      });

      return execution;

    } catch (error: any) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error.message;

      this.logger.error('Execution failed', {
        executionId: execution.id,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): AgentExecution[] {
    let history = [...this.executions];

    // Sort by start time descending (most recent first)
    history = history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    if (limit) {
      history = history.slice(0, limit);
    }

    return history;
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return {
      id: this.config.id,
      name: this.config.name,
      description: this.config.description,
      type: this.getAgentType(),
      capabilities: this.getCapabilities(),
      enabled: this.initialized,
      config: this.config
    };
  }

  /**
   * Setup event triggers
   * Must be implemented by subclasses to define event handlers
   */
  protected abstract setupEventTriggers(): void;

  /**
   * Setup scheduled jobs
   * Must be implemented by subclasses to define scheduled tasks
   */
  protected abstract setupScheduledJobs(): void;

  /**
   * Execute agent-specific logic
   * Must be implemented by subclasses
   */
  protected abstract executeInternal(parameters: any): Promise<any>;

  /**
   * Get agent type
   * Must be implemented by subclasses
   */
  protected abstract getAgentType(): any;

  /**
   * Get agent capabilities
   * Must be implemented by subclasses
   */
  protected abstract getCapabilities(): string[];

  /**
   * Helper: Register event handler with error handling
   */
  protected registerEventHandler(eventType: string, handler: (event: PlatformEvent) => Promise<void>): void {
    this.eventManager.registerHandler(eventType, async (event: PlatformEvent) => {
      try {
        this.logger.info(`Handling event: ${eventType}`, {
          eventType,
          data: event.data
        });

        await handler(event);

      } catch (error: any) {
        this.logger.error(`Event handler failed for ${eventType}:`, {
          error: error.message,
          event
        });
      }
    });
  }

  /**
   * Helper: Schedule job with error handling
   */
  protected scheduleJob(name: string, cron: string, handler: () => Promise<void>): void {
    this.scheduler.addJob(
      `${this.config.id}.${name}`,
      cron,
      async () => {
        try {
          this.logger.info(`Executing scheduled job: ${name}`);
          await handler();
        } catch (error: any) {
          this.logger.error(`Scheduled job failed: ${name}:`, {
            error: error.message
          });
        }
      },
      {
        agentId: this.config.id,
        parameters: {},
        enabled: true
      }
    );
  }

  /**
   * Start scheduler (if jobs are configured)
   */
  startScheduler(): void {
    if (this.config.enableScheduling && !this.scheduler.isRunning()) {
      this.scheduler.start();
      this.logger.info('Scheduler started');
    }
  }

  /**
   * Stop scheduler
   */
  stopScheduler(): void {
    if (this.scheduler.isRunning()) {
      this.scheduler.stop();
      this.logger.info('Scheduler stopped');
    }
  }
}
