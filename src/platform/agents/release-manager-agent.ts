/**
 * Release Manager Agent
 *
 * AI persona for release management tasks
 * Handles release planning, deployment orchestration, promotion workflows, and rollback management
 */

import { BaseAgent, BaseAgentConfig } from './base-agent';
import { AgentType, PlatformEvent } from '../orchestration/types/orchestration-types';

export interface ReleaseManagerAgentConfig extends BaseAgentConfig {
  approvalRequired?: boolean;
  autoPromote?: boolean;
  rollbackThreshold?: number;
}

/**
 * Release Manager Agent
 * Specialized in release orchestration and deployment management
 */
export class ReleaseManagerAgent extends BaseAgent {
  private rmConfig: ReleaseManagerAgentConfig;

  constructor(config: ReleaseManagerAgentConfig) {
    super(config);
    this.rmConfig = {
      approvalRequired: true,
      autoPromote: false,
      rollbackThreshold: 0.05, // 5% error rate
      ...config
    };
  }

  protected setupEventTriggers(): void {
    this.registerEventHandler('deployment.complete', async (event: PlatformEvent) => {
      await this.handleDeploymentComplete(event);
    });

    this.registerEventHandler('deployment.failed', async (event: PlatformEvent) => {
      await this.handleDeploymentFailure(event);
    });

    this.registerEventHandler('approval.granted', async (event: PlatformEvent) => {
      await this.handleApprovalGranted(event);
    });

    this.registerEventHandler('test.failed', async (event: PlatformEvent) => {
      await this.evaluateRollback(event);
    });
  }

  protected setupScheduledJobs(): void {
    // Daily release planning at 10 AM
    this.scheduleJob(
      'release-planning',
      '0 10 * * *',
      async () => await this.performReleasePlanning()
    );

    // Daily deployment reports at 5 PM
    this.scheduleJob(
      'deployment-reports',
      '0 17 * * *',
      async () => await this.generateDeploymentReports()
    );

    // Weekly release retrospective (Friday 3 PM)
    this.scheduleJob(
      'release-retrospective',
      '0 15 * * 5',
      async () => await this.conductReleaseRetrospective()
    );
  }

  protected async executeInternal(parameters: any): Promise<any> {
    const { action, ...params } = parameters;

    switch (action) {
      case 'create_release':
        return await this.createRelease(params);
      case 'promote_release':
        return await this.promoteRelease(params);
      case 'rollback_release':
        return await this.rollbackRelease(params);
      case 'get_release_status':
        return await this.getReleaseStatus(params);
      case 'approve_release':
        return await this.approveRelease(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  protected getAgentType(): AgentType {
    return AgentType.RELEASE_MANAGER;
  }

  protected getCapabilities(): string[] {
    return [
      'create_release',
      'get_deployment_status',
      'promote_environment',
      'create_rollback',
      'approve_release',
      'schedule_deployment',
      'generate_release_notes'
    ];
  }

  // Public Methods
  async createRelease(params: {
    application: string;
    version: string;
    environment: 'dev' | 'uat' | 'prod' | 'dr';
    strategy?: 'rolling' | 'blue-green' | 'canary';
  }): Promise<any> {
    this.logger.info('Creating release', params);

    const result = await this.mcpClient.createRelease({
      application: params.application,
      version: params.version,
      environment: params.environment,
      strategy: params.strategy || 'rolling',
      approval_required: this.rmConfig.approvalRequired
    });

    this.logger.info('Release created', {
      releaseId: result.release_id,
      status: result.status
    });

    return result;
  }

  async promoteRelease(params: {
    releaseId: string;
    targetEnvironment: 'uat' | 'prod' | 'dr';
  }): Promise<any> {
    this.logger.info('Promoting release', params);

    const result = await this.mcpClient.callTool('promote_release', {
      release_id: params.releaseId,
      target_environment: params.targetEnvironment
    });

    this.logger.info('Release promoted', {
      releaseId: params.releaseId,
      environment: params.targetEnvironment,
      status: result.status
    });

    return result;
  }

  async rollbackRelease(params: { releaseId: string }): Promise<any> {
    this.logger.info('Rolling back release', params);

    const result = await this.mcpClient.callTool('create_rollback', {
      release_id: params.releaseId
    });

    this.logger.info('Rollback initiated', {
      releaseId: params.releaseId,
      rollbackId: result.rollback_id
    });

    return result;
  }

  async getReleaseStatus(params: { releaseId: string }): Promise<any> {
    return await this.mcpClient.getReleaseStatus(params.releaseId);
  }

  async approveRelease(params: {
    releaseId: string;
    approver: string;
  }): Promise<any> {
    this.logger.info('Approving release', params);

    const result = await this.mcpClient.approveRelease({
      release_id: params.releaseId,
      approver: params.approver
    });

    this.logger.info('Release approved', {
      releaseId: params.releaseId,
      approver: params.approver
    });

    return result;
  }

  // Event Handlers
  private async handleDeploymentComplete(event: PlatformEvent): Promise<void> {
    const { deploymentId, application, environment } = event.data;

    this.logger.info('Deployment completed, evaluating promotion', {
      deploymentId,
      application,
      environment
    });

    if (this.rmConfig.autoPromote && environment === 'uat') {
      const nextEnv = 'prod';
      this.logger.info('Auto-promoting to production', {
        deploymentId,
        application
      });

      // Create release for promotion
      await this.createRelease({
        application,
        version: event.data.version,
        environment: nextEnv
      });
    }
  }

  private async handleDeploymentFailure(event: PlatformEvent): Promise<void> {
    const { deploymentId, reason } = event.data;

    this.logger.error('Deployment failed, initiating rollback', {
      deploymentId,
      reason
    });

    // Automatic rollback on failure
    await this.mcpClient.rollbackDeployment(deploymentId);
  }

  private async handleApprovalGranted(event: PlatformEvent): Promise<void> {
    const { requestId, releaseId } = event.data;

    this.logger.info('Approval granted, proceeding with release', {
      requestId,
      releaseId
    });

    // Proceed with approved release deployment
    await this.mcpClient.callTool('proceed_with_release', {
      release_id: releaseId
    });
  }

  private async evaluateRollback(event: PlatformEvent): Promise<void> {
    const { testId, deploymentId } = event.data;

    if (deploymentId) {
      this.logger.warn('Test failure detected, evaluating rollback', {
        testId,
        deploymentId
      });

      // Get deployment status
      const status = await this.mcpClient.getDeploymentStatus(deploymentId);

      if (status.error_rate > this.rmConfig.rollbackThreshold!) {
        this.logger.error('Error rate exceeds threshold, initiating rollback', {
          deploymentId,
          errorRate: status.error_rate,
          threshold: this.rmConfig.rollbackThreshold
        });

        await this.mcpClient.rollbackDeployment(deploymentId);
      }
    }
  }

  // Scheduled Tasks
  private async performReleasePlanning(): Promise<void> {
    this.logger.info('Performing daily release planning');

    try {
      const planning = await this.mcpClient.callTool('get_release_calendar', {
        days_ahead: 7
      });

      this.logger.info('Release planning complete', {
        scheduled_releases: planning.releases?.length || 0,
        pending_approvals: planning.pending_approvals
      });

    } catch (error: any) {
      this.logger.error('Release planning failed:', { error: error.message });
    }
  }

  private async generateDeploymentReports(): Promise<void> {
    this.logger.info('Generating daily deployment reports');

    try {
      const report = await this.mcpClient.callTool('generate_deployment_report', {
        time_range: '24h'
      });

      this.logger.info('Deployment report generated', {
        total_deployments: report.total,
        successful: report.successful,
        failed: report.failed,
        success_rate: report.success_rate
      });

    } catch (error: any) {
      this.logger.error('Deployment report generation failed:', { error: error.message });
    }
  }

  private async conductReleaseRetrospective(): Promise<void> {
    this.logger.info('Conducting weekly release retrospective');

    try {
      const retrospective = await this.mcpClient.callTool('release_retrospective', {
        time_range: '7d'
      });

      this.logger.info('Release retrospective complete', {
        releases_reviewed: retrospective.releases_count,
        key_learnings: retrospective.learnings?.length || 0,
        improvements: retrospective.improvements?.length || 0
      });

    } catch (error: any) {
      this.logger.error('Release retrospective failed:', { error: error.message });
    }
  }
}
