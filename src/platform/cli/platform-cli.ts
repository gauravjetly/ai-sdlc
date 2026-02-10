#!/usr/bin/env node

/**
 * Platform CLI
 * Command-line interface for multi-cloud workflow deployment
 */

import * as fs from 'fs';
import { WorkflowParser } from '../cloud-abstraction/dsl/workflow-parser.js';
import { WorkflowValidator } from '../cloud-abstraction/dsl/workflow-validator.js';
import { WorkflowExecutor } from '../cloud-abstraction/resources/workflow-executor.js';
import { StateManager } from '../state/state-manager.js';
import { CloudCredentials, AwsCredentials } from '../cloud-abstraction/types/cloud-types.js';
import { AwsAdapter } from '../cloud-abstraction/adapters/aws-adapter.js';

class PlatformCLI {
  private stateManager: StateManager;

  constructor() {
    this.stateManager = new StateManager();
  }

  async run(args: string[]): Promise<void> {
    const command = args[0];

    switch (command) {
      case 'deploy':
        await this.deployCommand(args[1]);
        break;

      case 'status':
        await this.statusCommand(args[1]);
        break;

      case 'resources':
        await this.resourcesCommand(args[1]);
        break;

      case 'destroy':
        await this.destroyCommand(args[1]);
        break;

      case 'list':
        await this.listCommand();
        break;

      case 'help':
      case '--help':
      case '-h':
        this.printHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        this.printHelp();
        process.exit(1);
    }
  }

  private async deployCommand(workflowFile: string): Promise<void> {
    if (!workflowFile) {
      console.error('Error: Workflow file path required');
      console.log('Usage: platform deploy <workflow-file.yaml>');
      process.exit(1);
    }

    if (!fs.existsSync(workflowFile)) {
      console.error(`Error: File not found: ${workflowFile}`);
      process.exit(1);
    }

    try {
      // Parse workflow
      console.log(`Parsing workflow: ${workflowFile}`);
      const workflow = WorkflowParser.parseFile(workflowFile);

      // Validate workflow
      console.log('Validating workflow...');
      const validation = WorkflowValidator.validate(workflow);

      if (!validation.valid) {
        console.error('\n✗ Workflow validation failed:\n');
        validation.errors.forEach(err => {
          console.error(`  - [${err.code}] ${err.field}: ${err.message}`);
        });
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        console.warn('\n⚠ Warnings:');
        validation.warnings.forEach(warn => {
          console.warn(`  - ${warn.field}: ${warn.message}`);
        });
        console.log('');
      }

      console.log('✓ Workflow is valid\n');

      // Get credentials
      const credentials = await this.getCredentials(workflow.workflow.target_cloud);

      // Execute workflow
      const executor = new WorkflowExecutor(workflow, credentials);
      const result = await executor.execute();

      // Save state
      if (result.status === 'success' || result.status === 'partial') {
        const adapter = executor.getAdapter() as AwsAdapter;
        const state = StateManager.createStateFromResources(
          workflow.workflow.name,
          workflow.workflow.target_cloud,
          workflow.workflow.region,
          adapter.getAllResources()
        );

        if (result.status === 'partial') {
          state.status = 'partially_deployed';
        }

        await this.stateManager.saveState(workflow.workflow.name, state);
      }

      // Exit with appropriate code
      if (result.status === 'failed') {
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`\nDeployment failed: ${error.message}`);
      process.exit(1);
    }
  }

  private async statusCommand(workflowName: string): Promise<void> {
    if (!workflowName) {
      console.error('Error: Workflow name required');
      console.log('Usage: platform status <workflow-name>');
      process.exit(1);
    }

    try {
      const state = await this.stateManager.loadState(workflowName);

      if (!state) {
        console.log(`No deployment found for workflow: ${workflowName}`);
        process.exit(1);
      }

      console.log(`\nWorkflow: ${state.workflow_name}`);
      console.log(`Status: ${state.status}`);
      console.log(`Cloud: ${state.cloud}`);
      console.log(`Region: ${state.region}`);
      console.log(`Created: ${state.created_at}`);
      console.log(`Updated: ${state.updated_at}`);
      console.log(`\nResources: ${state.resources.length}`);

      state.resources.forEach((resource, index) => {
        console.log(`\n  ${index + 1}. ${resource.type}: ${resource.name}`);
        console.log(`     ID: ${resource.id}`);
        console.log(`     Status: ${resource.status}`);
      });

      console.log('');
    } catch (error: any) {
      console.error(`Failed to get status: ${error.message}`);
      process.exit(1);
    }
  }

  private async resourcesCommand(workflowName: string): Promise<void> {
    if (!workflowName) {
      console.error('Error: Workflow name required');
      console.log('Usage: platform resources <workflow-name>');
      process.exit(1);
    }

    try {
      const state = await this.stateManager.loadState(workflowName);

      if (!state) {
        console.log(`No deployment found for workflow: ${workflowName}`);
        process.exit(1);
      }

      console.log(`\nResources for workflow: ${state.workflow_name}\n`);
      console.log('TYPE'.padEnd(25) + 'NAME'.padEnd(25) + 'ID'.padEnd(30) + 'STATUS');
      console.log('='.repeat(100));

      state.resources.forEach(resource => {
        console.log(
          resource.type.padEnd(25) +
          resource.name.padEnd(25) +
          resource.id.padEnd(30) +
          resource.status
        );
      });

      console.log('');
    } catch (error: any) {
      console.error(`Failed to list resources: ${error.message}`);
      process.exit(1);
    }
  }

  private async destroyCommand(workflowName: string): Promise<void> {
    if (!workflowName) {
      console.error('Error: Workflow name required');
      console.log('Usage: platform destroy <workflow-name>');
      process.exit(1);
    }

    try {
      const state = await this.stateManager.loadState(workflowName);

      if (!state) {
        console.log(`No deployment found for workflow: ${workflowName}`);
        process.exit(1);
      }

      console.log(`\n⚠  WARNING: This will destroy all resources for workflow: ${workflowName}`);
      console.log(`   Cloud: ${state.cloud}`);
      console.log(`   Resources: ${state.resources.length}`);
      console.log('\n   In production, you would need to confirm this action.\n');

      // In MVP, just delete state
      // In production, would actually destroy cloud resources
      await this.stateManager.deleteState(workflowName);
      console.log(`✓ State cleaned up for workflow: ${workflowName}`);
    } catch (error: any) {
      console.error(`Failed to destroy: ${error.message}`);
      process.exit(1);
    }
  }

  private async listCommand(): Promise<void> {
    try {
      const workflows = await this.stateManager.listStates();

      if (workflows.length === 0) {
        console.log('No deployed workflows found.');
        return;
      }

      console.log(`\nDeployed workflows:\n`);

      for (const workflowName of workflows) {
        const state = await this.stateManager.loadState(workflowName);
        if (state) {
          console.log(`  - ${workflowName}`);
          console.log(`    Status: ${state.status}`);
          console.log(`    Cloud: ${state.cloud}`);
          console.log(`    Resources: ${state.resources.length}`);
          console.log('');
        }
      }
    } catch (error: any) {
      console.error(`Failed to list workflows: ${error.message}`);
      process.exit(1);
    }
  }

  private printHelp(): void {
    console.log(`
Platform CLI - Multi-Cloud DevOps Platform

Usage:
  platform <command> [options]

Commands:
  deploy <file>       Deploy workflow from YAML file
  status <name>       Show status of deployed workflow
  resources <name>    List resources for workflow
  destroy <name>      Destroy all resources for workflow
  list                List all deployed workflows
  help                Show this help message

Examples:
  platform deploy workflows/hello-world.yaml
  platform status hello-world
  platform resources hello-world
  platform destroy hello-world
  platform list

Environment Variables:
  AWS_REGION          AWS region (default: us-east-1)
  AWS_PROFILE         AWS CLI profile to use
  AWS_ACCESS_KEY_ID   AWS access key
  AWS_SECRET_ACCESS_KEY  AWS secret key
`);
  }

  private async getCredentials(cloud: string): Promise<CloudCredentials> {
    if (cloud === 'aws') {
      const region = process.env.AWS_REGION || 'us-east-1';
      const profile = process.env.AWS_PROFILE;
      const access_key_id = process.env.AWS_ACCESS_KEY_ID;
      const secret_access_key = process.env.AWS_SECRET_ACCESS_KEY;

      const credentials: AwsCredentials = {
        region,
        profile,
        access_key_id,
        secret_access_key
      };

      return {
        provider: 'aws',
        credentials
      };
    }

    throw new Error(`Credentials not configured for cloud provider: ${cloud}`);
  }
}

// Run CLI
const cli = new PlatformCLI();
const args = process.argv.slice(2);

cli.run(args).catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
