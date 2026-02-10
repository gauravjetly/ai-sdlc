/**
 * Main Orchestrator
 *
 * Coordinates agent scheduling, event-driven triggers, and workflow execution
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Scheduler } from './scheduler';
import { EventManager } from './event-manager';
import { WorkflowEngine } from './workflow-engine';
import { AgentRegistry } from '../agents/agent-registry';
import {
  ScheduleConfig,
  WorkflowConfig,
  OrchestratorState,
  AgentExecution
} from '../types/orchestration-types';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('Orchestrator');

export class Orchestrator {
  private scheduler: Scheduler;
  private eventManager: EventManager;
  private workflowEngine: WorkflowEngine;
  private agentRegistry: AgentRegistry;
  private state: OrchestratorState;

  constructor() {
    this.agentRegistry = new AgentRegistry();
    this.scheduler = new Scheduler();
    this.eventManager = new EventManager();
    this.workflowEngine = new WorkflowEngine(this.agentRegistry);

    this.state = {
      running: false,
      scheduledJobs: 0,
      activeExecutions: 0,
      totalExecutions: 0,
      workflows: 0
    };
  }

  /**
   * Start the orchestrator
   */
  async start(configPath?: string): Promise<void> {
    if (this.state.running) {
      logger.warn('Orchestrator is already running');
      return;
    }

    logger.info('Starting orchestrator...');

    try {
      // Initialize all registered agents
      await this.agentRegistry.initializeAll();

      // Register default event handlers
      this.registerDefaultEventHandlers();

      // Load schedules if config path provided
      if (configPath) {
        await this.loadSchedules(configPath);
      }

      // Start scheduler
      this.scheduler.start();

      this.state.running = true;
      this.state.startTime = new Date();

      logger.info('Orchestrator started successfully', {
        agents: this.agentRegistry.count(),
        scheduledJobs: this.scheduler.listJobs().length,
        workflows: this.workflowEngine.listWorkflows().length
      });

    } catch (error: any) {
      logger.error('Failed to start orchestrator:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.state.running) {
      logger.warn('Orchestrator is not running');
      return;
    }

    logger.info('Stopping orchestrator...');

    // Stop scheduler
    this.scheduler.stop();

    this.state.running = false;

    logger.info('Orchestrator stopped');
  }

  /**
   * Execute an agent directly
   */
  async executeAgent(agentId: string, parameters: any): Promise<AgentExecution> {
    logger.info(`Executing agent: ${agentId}`, { parameters });

    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    this.state.activeExecutions++;
    this.state.totalExecutions++;

    try {
      const result = await agent.execute(parameters);
      this.state.activeExecutions--;
      return result;
    } catch (error) {
      this.state.activeExecutions--;
      throw error;
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, context: any = {}): Promise<any> {
    logger.info(`Executing workflow: ${workflowId}`, { context });

    this.state.activeExecutions++;

    try {
      const result = await this.workflowEngine.execute(workflowId, context);
      this.state.activeExecutions--;
      return result;
    } catch (error) {
      this.state.activeExecutions--;
      throw error;
    }
  }

  /**
   * Load schedules from configuration file
   */
  async loadSchedules(configPath: string): Promise<void> {
    logger.info(`Loading schedules from: ${configPath}`);

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = yaml.load(content) as ScheduleConfig;

      if (!config.schedules || !Array.isArray(config.schedules)) {
        throw new Error('Invalid schedule configuration: missing schedules array');
      }

      for (const schedule of config.schedules) {
        this.scheduler.addJob(
          schedule.name,
          schedule.cron,
          async () => {
            await this.executeAgent(schedule.agentId, schedule.parameters);
          },
          schedule
        );
      }

      this.state.scheduledJobs = config.schedules.length;
      logger.info(`Loaded ${config.schedules.length} scheduled jobs`);

    } catch (error: any) {
      logger.error('Failed to load schedules:', {
        error: error.message,
        configPath
      });
      throw error;
    }
  }

  /**
   * Load workflows from directory
   */
  async loadWorkflows(workflowsDir: string): Promise<void> {
    logger.info(`Loading workflows from: ${workflowsDir}`);

    try {
      const files = fs.readdirSync(workflowsDir)
        .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      for (const file of files) {
        const filePath = path.join(workflowsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const config = yaml.load(content) as WorkflowConfig;

        if (config.workflow) {
          this.workflowEngine.registerWorkflow(config.workflow);
        }
      }

      this.state.workflows = this.workflowEngine.listWorkflows().length;
      logger.info(`Loaded ${this.state.workflows} workflows`);

    } catch (error: any) {
      logger.error('Failed to load workflows:', {
        error: error.message,
        workflowsDir
      });
      throw error;
    }
  }

  /**
   * Register default event handlers
   */
  private registerDefaultEventHandlers(): void {
    // Deployment complete handler
    this.eventManager.registerHandler('deployment.complete', async (event) => {
      logger.info('Deployment completed event received', { event });
      // Could trigger validation workflow, notification, etc.
    });

    // Deployment failed handler
    this.eventManager.registerHandler('deployment.failed', async (event) => {
      logger.error('Deployment failed event received', { event });
      // Could trigger rollback workflow, alerts, etc.
    });

    // Alert fired handler
    this.eventManager.registerHandler('alert.fired', async (event) => {
      const { severity } = event.data;
      logger.warn('Alert fired event received', { event });

      // If critical, could trigger incident response workflow
      if (severity === 'critical') {
        logger.error('Critical alert detected, triggering incident response');
        // await this.executeWorkflow('incident-response', event.data);
      }
    });

    // Test failed handler
    this.eventManager.registerHandler('test.failed', async (event) => {
      logger.warn('Test failed event received', { event });
      // Could trigger notification, block deployment, etc.
    });

    // Security vulnerability detected handler
    this.eventManager.registerHandler('security.vulnerability_detected', async (event) => {
      const { severity } = event.data;
      logger.warn('Vulnerability detected event received', { event });

      // If critical or high, could trigger security workflow
      if (severity === 'critical' || severity === 'high') {
        logger.error('High severity vulnerability detected');
        // await this.executeWorkflow('security-remediation', event.data);
      }
    });

    // Health check failed handler
    this.eventManager.registerHandler('health.check_failed', async (event) => {
      logger.error('Health check failed event received', { event });
      // Could trigger auto-scaling, restart, or incident response
    });

    // Approval required handler
    this.eventManager.registerHandler('approval.required', async (event) => {
      logger.info('Approval required event received', { event });
      // Could trigger notification to approvers
    });

    logger.info('Default event handlers registered');
  }

  /**
   * Get orchestrator state
   */
  getState(): OrchestratorState {
    return {
      ...this.state,
      scheduledJobs: this.scheduler.listJobs().length,
      workflows: this.workflowEngine.listWorkflows().length
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    orchestrator: boolean;
    scheduler: boolean;
    agents: Map<string, boolean>;
  }> {
    const agentHealth = await this.agentRegistry.healthCheckAll();

    const allHealthy = Array.from(agentHealth.values()).every(h => h);

    return {
      healthy: this.state.running && this.scheduler.isRunning() && allHealthy,
      orchestrator: this.state.running,
      scheduler: this.scheduler.isRunning(),
      agents: agentHealth
    };
  }

  // ============================================
  // Getters for sub-components
  // ============================================

  getScheduler(): Scheduler {
    return this.scheduler;
  }

  getEventManager(): EventManager {
    return this.eventManager;
  }

  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }

  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }
}
