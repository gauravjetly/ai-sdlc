/**
 * Pipeline Integration Example
 *
 * Demonstrates complete Dev → UAT → Prod → DR pipeline with:
 * - Sequential stage promotions
 * - Approval gates
 * - Smoke tests
 * - Automatic rollback
 */

import { Environment } from '@prisma/client';
import { PipelineService, PipelineConfig } from './pipeline.service';
import { ApprovalService, ApprovalType } from './approval.service';

export async function runCompletePipelineDemo() {
  console.log('🚀 Starting Complete Pipeline Demo: Dev → UAT → Prod → DR\n');

  const pipelineService = new PipelineService();
  const approvalService = new ApprovalService();

  // Listen to approval events
  approvalService.on('approval:created', (approval) => {
    console.log(`\n📋 Approval Created: ${approval.title}`);
    console.log(`   ID: ${approval.id}`);
    console.log(`   Approvers: ${approval.approvers.join(', ')}`);
  });

  approvalService.on('approval:approved', (approval) => {
    console.log(`\n✅ Approval Approved: ${approval.title}`);
    console.log(`   Approved by: ${approval.approvedBy}`);
  });

  // Define complete pipeline configuration
  const pipelineConfig: PipelineConfig = {
    name: 'api-service-full-pipeline',
    application: 'api-service',
    version: 'v2.1.0',
    imageUri: '123456789.dkr.ecr.us-east-1.amazonaws.com/api-service:v2.1.0',
    rollbackOnFailure: true,
    notificationChannels: ['slack', 'email'],
    stages: [
      // ==================== STAGE 1: DEVELOPMENT ====================
      {
        name: 'Development',
        environment: Environment.dev,
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/dev-cluster',
        namespace: 'api-service-dev',
        requiresApproval: false,
        autoPromotion: true,
        deploymentConfig: {
          replicas: 2,
          strategy: 'rolling',
          cpuRequest: '100m',
          memoryRequest: '128Mi',
          cpuLimit: '500m',
          memoryLimit: '512Mi',
          healthCheckPath: '/health',
          healthCheckPort: 8080,
          containerPort: 8080
        },
        smokeTests: [
          {
            name: 'health-check',
            type: 'health',
            timeout: 30
          }
        ]
      },

      // ==================== STAGE 2: UAT ====================
      {
        name: 'User Acceptance Testing',
        environment: Environment.uat,
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/uat-cluster',
        namespace: 'api-service-uat',
        requiresApproval: false, // Auto-promote from dev
        autoPromotion: true,
        deploymentConfig: {
          replicas: 3,
          strategy: 'rolling',
          cpuRequest: '200m',
          memoryRequest: '256Mi',
          cpuLimit: '1000m',
          memoryLimit: '1Gi',
          healthCheckPath: '/health',
          healthCheckPort: 8080,
          containerPort: 8080
        },
        smokeTests: [
          {
            name: 'health-check',
            type: 'health',
            timeout: 30
          },
          {
            name: 'api-endpoints',
            type: 'http',
            endpoint: '/api/v1/status',
            expectedStatus: 200,
            timeout: 60
          }
        ]
      },

      // ==================== STAGE 3: PRODUCTION (REQUIRES APPROVAL) ====================
      {
        name: 'Production',
        environment: Environment.production,
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/prod-cluster',
        namespace: 'api-service-prod',
        requiresApproval: true, // ⚠️ MANUAL APPROVAL REQUIRED
        autoPromotion: false,
        deploymentConfig: {
          replicas: 5,
          strategy: 'canary',
          cpuRequest: '500m',
          memoryRequest: '512Mi',
          cpuLimit: '2000m',
          memoryLimit: '2Gi',
          healthCheckPath: '/health',
          healthCheckPort: 8080,
          containerPort: 8080
        },
        smokeTests: [
          {
            name: 'health-check',
            type: 'health',
            timeout: 30
          },
          {
            name: 'api-endpoints',
            type: 'http',
            endpoint: '/api/v1/status',
            expectedStatus: 200,
            timeout: 60
          },
          {
            name: 'critical-user-flows',
            type: 'custom',
            timeout: 120
          }
        ]
      },

      // ==================== STAGE 4: DISASTER RECOVERY (REQUIRES APPROVAL) ====================
      {
        name: 'Disaster Recovery',
        environment: Environment.dr,
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-west-2:123456789:cluster/dr-cluster',
        namespace: 'api-service-dr',
        requiresApproval: true, // ⚠️ MANUAL APPROVAL REQUIRED
        autoPromotion: false,
        deploymentConfig: {
          replicas: 5,
          strategy: 'blue_green',
          cpuRequest: '500m',
          memoryRequest: '512Mi',
          cpuLimit: '2000m',
          memoryLimit: '2Gi',
          healthCheckPath: '/health',
          healthCheckPort: 8080,
          containerPort: 8080
        },
        smokeTests: [
          {
            name: 'health-check',
            type: 'health',
            timeout: 30
          },
          {
            name: 'failover-test',
            type: 'custom',
            timeout: 180
          }
        ]
      }
    ]
  };

  try {
    console.log('📦 Pipeline Configuration:');
    console.log(`   Application: ${pipelineConfig.application}`);
    console.log(`   Version: ${pipelineConfig.version}`);
    console.log(`   Stages: ${pipelineConfig.stages.length}`);
    console.log(`   Rollback on Failure: ${pipelineConfig.rollbackOnFailure}\n`);

    // ==================== EXECUTE PIPELINE ====================
    console.log('🔄 Starting Pipeline Execution...\n');

    const execution = await pipelineService.executePipeline(pipelineConfig);

    console.log('\n📊 Pipeline Execution Status:');
    console.log(`   Execution ID: ${execution.id}`);
    console.log(`   Status: ${execution.status}`);
    console.log(`   Current Stage: ${execution.currentStage + 1}/${execution.stages.length}`);

    // Display stage results
    console.log('\n📈 Stage Results:');
    execution.stages.forEach((stage, index) => {
      const icon = stage.status === 'completed' ? '✅' :
                   stage.status === 'awaiting_approval' ? '⏳' :
                   stage.status === 'failed' ? '❌' : '⏸️';

      console.log(`   ${icon} Stage ${index + 1}: ${stage.stageName}`);
      console.log(`      Environment: ${stage.environment}`);
      console.log(`      Status: ${stage.status}`);

      if (stage.smokeTestResults) {
        console.log(`      Smoke Tests:`);
        stage.smokeTestResults.forEach(test => {
          const testIcon = test.passed ? '✓' : '✗';
          console.log(`         ${testIcon} ${test.testName} (${test.duration}ms)`);
        });
      }

      if (stage.error) {
        console.log(`      Error: ${stage.error}`);
      }

      if (stage.approvalId) {
        console.log(`      Approval ID: ${stage.approvalId}`);
      }
    });

    // ==================== HANDLE PRODUCTION APPROVAL ====================
    if (execution.status === 'running') {
      const awaitingApprovalStage = execution.stages.find(
        s => s.status === 'awaiting_approval'
      );

      if (awaitingApprovalStage) {
        console.log(`\n⏳ Pipeline paused at: ${awaitingApprovalStage.stageName}`);
        console.log('   Manual approval required to proceed.\n');

        // Create approval request for production
        const prodApproval = await approvalService.createApproval({
          type: ApprovalType.PROMOTION,
          title: `Promote ${pipelineConfig.application} ${pipelineConfig.version} to Production`,
          description: `
            Deploying version ${pipelineConfig.version} to production environment.

            Changes:
            - New features from UAT
            - Bug fixes
            - Performance improvements

            Prerequisites completed:
            ✅ Dev deployment successful
            ✅ UAT deployment successful
            ✅ All smoke tests passed
            ✅ Security scans completed

            Deployment Strategy: Canary (10% → 25% → 50% → 100%)
            Estimated Duration: 45 minutes
            Rollback Available: Yes
          `,
          requestedBy: 'release.manager@company.com',
          approvers: ApprovalService.getRequiredApprovers('production', 'high'),
          metadata: {
            application: pipelineConfig.application,
            version: pipelineConfig.version,
            fromEnvironment: 'uat',
            toEnvironment: 'production',
            deploymentId: execution.stages[execution.currentStage]?.deploymentId,
            risk: 'high',
            rollbackAvailable: true,
            estimatedDuration: 2700 // 45 minutes
          },
          autoApprove: false,
          timeout: 4 * 60 * 60, // 4 hours
          notificationChannels: ['slack', 'email', 'pagerduty']
        });

        console.log('📋 Production Approval Details:');
        console.log(`   Approval ID: ${prodApproval.id}`);
        console.log(`   Required Approvers:`);
        prodApproval.approvers.forEach(approver => {
          console.log(`      - ${approver}`);
        });
        console.log(`   Expires: ${prodApproval.expiresAt.toISOString()}`);
        console.log(`   Approval URL: https://platform.company.com/approvals/${prodApproval.id}\n`);

        // Simulate approval after 5 seconds
        console.log('⏱️  Simulating approval in 5 seconds...\n');

        setTimeout(async () => {
          console.log('👤 Approving production deployment...');

          const approvedRequest = await approvalService.approve(
            prodApproval.id,
            'tech-lead@company.com',
            'Approved: All UAT tests passed successfully. Ready for production rollout.'
          );

          console.log(`\n✅ Production deployment approved by: ${approvedRequest.approvedBy}`);
          console.log(`   Comments: ${approvedRequest.comments}\n`);

          // Resume pipeline execution
          console.log('🔄 Resuming pipeline execution...\n');

          const resumedExecution = await pipelineService.resumePipelineExecution(
            execution,
            pipelineConfig,
            execution.currentStage
          );

          console.log('📊 Resumed Pipeline Status:');
          console.log(`   Status: ${resumedExecution.status}`);
          console.log(`   Current Stage: ${resumedExecution.currentStage + 1}/${resumedExecution.stages.length}\n`);

          // Check for DR approval
          const drAwaitingApproval = resumedExecution.stages.find(
            s => s.environment === Environment.dr && s.status === 'awaiting_approval'
          );

          if (drAwaitingApproval) {
            console.log('⏳ Pipeline paused at: Disaster Recovery');
            console.log('   Manual approval required for DR deployment.\n');

            // Create DR approval
            const drApproval = await approvalService.createApproval({
              type: ApprovalType.PROMOTION,
              title: `Promote ${pipelineConfig.application} ${pipelineConfig.version} to DR`,
              description: 'Deploying to disaster recovery region for failover readiness',
              requestedBy: 'release.manager@company.com',
              approvers: ApprovalService.getRequiredApprovers('dr', 'critical'),
              metadata: {
                application: pipelineConfig.application,
                version: pipelineConfig.version,
                fromEnvironment: 'production',
                toEnvironment: 'dr',
                risk: 'critical'
              },
              timeout: 2 * 60 * 60 // 2 hours
            });

            console.log('📋 DR Approval Required:');
            console.log(`   Approval ID: ${drApproval.id}`);
            console.log(`   Approvers: ${drApproval.approvers.join(', ')}\n`);

            // Auto-approve DR for demo
            setTimeout(async () => {
              await approvalService.approve(
                drApproval.id,
                'platform-owner@company.com',
                'Approved: DR deployment for production parity'
              );

              console.log('✅ DR deployment approved\n');

              // Final resume
              const finalExecution = await pipelineService.resumePipelineExecution(
                resumedExecution,
                pipelineConfig,
                resumedExecution.currentStage
              );

              displayFinalResults(finalExecution);
            }, 3000);
          } else {
            displayFinalResults(resumedExecution);
          }
        }, 5000);
      }
    } else {
      displayFinalResults(execution);
    }

  } catch (error) {
    console.error('\n❌ Pipeline execution failed:', error);

    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    }
  } finally {
    // Cleanup after 15 seconds
    setTimeout(async () => {
      console.log('\n🧹 Cleaning up resources...');
      await pipelineService.cleanup();
      await approvalService.cleanup();
      console.log('✅ Cleanup complete\n');
    }, 15000);
  }
}

/**
 * Display final pipeline results
 */
function displayFinalResults(execution: any): void {
  console.log('\n' + '='.repeat(80));
  console.log('🎉 PIPELINE EXECUTION COMPLETE');
  console.log('='.repeat(80));

  console.log('\n📊 Final Status:');
  console.log(`   Execution ID: ${execution.id}`);
  console.log(`   Status: ${execution.status.toUpperCase()}`);
  console.log(`   Started: ${execution.startedAt.toISOString()}`);

  if (execution.completedAt) {
    const duration = execution.completedAt.getTime() - execution.startedAt.getTime();
    console.log(`   Completed: ${execution.completedAt.toISOString()}`);
    console.log(`   Duration: ${Math.round(duration / 1000)}s`);
  }

  console.log('\n📈 Stage Summary:');
  execution.stages.forEach((stage: any, index: number) => {
    const icon = stage.status === 'completed' ? '✅' :
                 stage.status === 'failed' ? '❌' :
                 stage.status === 'rolled_back' ? '↩️' : '⏸️';

    console.log(`   ${icon} ${stage.stageName} (${stage.environment})`);
    console.log(`      Status: ${stage.status}`);

    if (stage.startedAt && stage.completedAt) {
      const stageDuration = stage.completedAt.getTime() - stage.startedAt.getTime();
      console.log(`      Duration: ${Math.round(stageDuration / 1000)}s`);
    }

    if (stage.smokeTestResults && stage.smokeTestResults.length > 0) {
      const passed = stage.smokeTestResults.filter((t: any) => t.passed).length;
      const total = stage.smokeTestResults.length;
      console.log(`      Tests: ${passed}/${total} passed`);
    }
  });

  if (execution.status === 'completed') {
    console.log('\n✅ All stages completed successfully!');
    console.log('   Application is now running in:');
    console.log('   - Development');
    console.log('   - UAT');
    console.log('   - Production');
    console.log('   - Disaster Recovery\n');
  } else if (execution.status === 'failed') {
    console.log(`\n❌ Pipeline failed: ${execution.error}`);
    console.log('   Failed stages have been rolled back.\n');
  }

  console.log('='.repeat(80) + '\n');
}

// Run the demo if executed directly
if (require.main === module) {
  runCompletePipelineDemo().catch(console.error);
}
