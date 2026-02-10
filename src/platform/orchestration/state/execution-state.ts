/**
 * Execution State Manager
 *
 * Manages persistent state for agent and workflow executions
 */

import * as fs from 'fs';
import * as path from 'path';
import { AgentExecution, WorkflowExecution } from '../types/orchestration-types';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('ExecutionState');

export class ExecutionStateManager {
  private stateDir: string;

  constructor(stateDir: string = './.orchestration-state') {
    this.stateDir = stateDir;
    this.ensureStateDirectory();
  }

  /**
   * Ensure state directory exists
   */
  private ensureStateDirectory(): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
      logger.info(`Created state directory: ${this.stateDir}`);
    }
  }

  /**
   * Save agent execution state
   */
  async saveAgentExecution(execution: AgentExecution): Promise<void> {
    try {
      const filePath = path.join(this.stateDir, `agent-${execution.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(execution, null, 2));
      logger.debug(`Saved agent execution state: ${execution.id}`);
    } catch (error: any) {
      logger.error('Failed to save agent execution state:', {
        executionId: execution.id,
        error: error.message
      });
    }
  }

  /**
   * Load agent execution state
   */
  async loadAgentExecution(executionId: string): Promise<AgentExecution | null> {
    try {
      const filePath = path.join(this.stateDir, `agent-${executionId}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as AgentExecution;
    } catch (error: any) {
      logger.error('Failed to load agent execution state:', {
        executionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Save workflow execution state
   */
  async saveWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    try {
      const filePath = path.join(this.stateDir, `workflow-${execution.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(execution, null, 2));
      logger.debug(`Saved workflow execution state: ${execution.id}`);
    } catch (error: any) {
      logger.error('Failed to save workflow execution state:', {
        executionId: execution.id,
        error: error.message
      });
    }
  }

  /**
   * Load workflow execution state
   */
  async loadWorkflowExecution(executionId: string): Promise<WorkflowExecution | null> {
    try {
      const filePath = path.join(this.stateDir, `workflow-${executionId}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as WorkflowExecution;
    } catch (error: any) {
      logger.error('Failed to load workflow execution state:', {
        executionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * List all agent executions
   */
  async listAgentExecutions(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.stateDir);
      return files
        .filter(f => f.startsWith('agent-') && f.endsWith('.json'))
        .map(f => f.replace('agent-', '').replace('.json', ''));
    } catch (error: any) {
      logger.error('Failed to list agent executions:', error);
      return [];
    }
  }

  /**
   * List all workflow executions
   */
  async listWorkflowExecutions(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.stateDir);
      return files
        .filter(f => f.startsWith('workflow-') && f.endsWith('.json'))
        .map(f => f.replace('workflow-', '').replace('.json', ''));
    } catch (error: any) {
      logger.error('Failed to list workflow executions:', error);
      return [];
    }
  }

  /**
   * Delete agent execution state
   */
  async deleteAgentExecution(executionId: string): Promise<boolean> {
    try {
      const filePath = path.join(this.stateDir, `agent-${executionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Deleted agent execution state: ${executionId}`);
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error('Failed to delete agent execution state:', {
        executionId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete workflow execution state
   */
  async deleteWorkflowExecution(executionId: string): Promise<boolean> {
    try {
      const filePath = path.join(this.stateDir, `workflow-${executionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Deleted workflow execution state: ${executionId}`);
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error('Failed to delete workflow execution state:', {
        executionId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Clean up old executions
   */
  async cleanupOldExecutions(olderThanDays: number = 30): Promise<number> {
    try {
      const files = fs.readdirSync(this.stateDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.stateDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} old execution states`);
      return deletedCount;
    } catch (error: any) {
      logger.error('Failed to cleanup old executions:', error);
      return 0;
    }
  }
}
