/**
 * State Manager
 * Manages deployment state for workflows
 */

import * as fs from 'fs';
import * as path from 'path';
import { ResourceResult } from '../cloud-abstraction/types/cloud-types.js';

export interface DeploymentState {
  workflow_name: string;
  status: 'deployed' | 'partially_deployed' | 'failed' | 'destroyed';
  cloud: string;
  region: string;
  resources: Array<{
    type: string;
    name: string;
    id: string;
    status: string;
    metadata?: Record<string, any>;
  }>;
  created_at: string;
  updated_at: string;
}

export class StateManager {
  private stateDir: string;

  constructor(stateDir: string = './.platform-state') {
    this.stateDir = stateDir;
    this.ensureStateDirectory();
  }

  /**
   * Save deployment state
   */
  async saveState(workflowName: string, state: DeploymentState): Promise<void> {
    const stateFile = this.getStateFilePath(workflowName);

    try {
      const json = JSON.stringify(state, null, 2);
      fs.writeFileSync(stateFile, json, 'utf8');
      console.log(`✓ State saved: ${stateFile}`);
    } catch (error: any) {
      throw new Error(`Failed to save state: ${error.message}`);
    }
  }

  /**
   * Load deployment state
   */
  async loadState(workflowName: string): Promise<DeploymentState | null> {
    const stateFile = this.getStateFilePath(workflowName);

    if (!fs.existsSync(stateFile)) {
      return null;
    }

    try {
      const json = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(json) as DeploymentState;
    } catch (error: any) {
      throw new Error(`Failed to load state: ${error.message}`);
    }
  }

  /**
   * Check if workflow has state
   */
  async hasState(workflowName: string): Promise<boolean> {
    const stateFile = this.getStateFilePath(workflowName);
    return fs.existsSync(stateFile);
  }

  /**
   * Delete deployment state
   */
  async deleteState(workflowName: string): Promise<void> {
    const stateFile = this.getStateFilePath(workflowName);

    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
      console.log(`✓ State deleted: ${stateFile}`);
    }
  }

  /**
   * List all workflow states
   */
  async listStates(): Promise<string[]> {
    if (!fs.existsSync(this.stateDir)) {
      return [];
    }

    const files = fs.readdirSync(this.stateDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  /**
   * Convert resource results to deployment state
   */
  static createStateFromResources(
    workflowName: string,
    cloud: string,
    region: string,
    resources: Map<string, ResourceResult>
  ): DeploymentState {
    const now = new Date().toISOString();

    return {
      workflow_name: workflowName,
      status: 'deployed',
      cloud,
      region,
      resources: Array.from(resources.values()).map(r => ({
        type: r.type,
        name: r.metadata.name || 'unknown',
        id: r.id,
        status: r.status,
        metadata: r.metadata
      })),
      created_at: now,
      updated_at: now
    };
  }

  private getStateFilePath(workflowName: string): string {
    return path.join(this.stateDir, `${workflowName}.json`);
  }

  private ensureStateDirectory(): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }
}
