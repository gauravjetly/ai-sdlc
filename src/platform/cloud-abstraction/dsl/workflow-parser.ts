/**
 * Workflow Parser
 * Parses YAML workflow definitions into typed WorkflowDefinition objects
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { WorkflowDefinition } from '../types/workflow-types.js';

export class WorkflowParser {
  /**
   * Parse workflow from YAML file
   */
  static parseFile(filePath: string): WorkflowDefinition {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return this.parseYaml(fileContent);
    } catch (error: any) {
      throw new Error(`Failed to parse workflow file: ${error.message}`);
    }
  }

  /**
   * Parse workflow from YAML string
   */
  static parseYaml(yamlContent: string): WorkflowDefinition {
    try {
      const parsed = yaml.load(yamlContent) as WorkflowDefinition;

      if (!parsed.workflow) {
        throw new Error('Invalid workflow: missing "workflow" key');
      }

      if (!parsed.workflow.name) {
        throw new Error('Invalid workflow: missing "workflow.name"');
      }

      if (!parsed.workflow.target_cloud) {
        throw new Error('Invalid workflow: missing "workflow.target_cloud"');
      }

      if (!parsed.workflow.region) {
        throw new Error('Invalid workflow: missing "workflow.region"');
      }

      if (!parsed.workflow.resources || !Array.isArray(parsed.workflow.resources)) {
        throw new Error('Invalid workflow: "workflow.resources" must be an array');
      }

      return parsed;
    } catch (error: any) {
      throw new Error(`Failed to parse YAML: ${error.message}`);
    }
  }

  /**
   * Convert workflow back to YAML
   */
  static toYaml(workflow: WorkflowDefinition): string {
    return yaml.dump(workflow, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
  }
}
