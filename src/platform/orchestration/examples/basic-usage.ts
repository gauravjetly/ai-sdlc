/**
 * Basic Orchestration Usage Example
 *
 * Demonstrates core orchestration features
 */

import { Orchestrator, DeveloperAgent } from '../index';

async function main() {
  console.log('=== Agent Orchestration System - Basic Usage ===\n');

  // 1. Create orchestrator
  console.log('1. Creating orchestrator...');
  const orchestrator = new Orchestrator();

  // 2. Register agents
  console.log('2. Registering agents...');
  const devAgent = new DeveloperAgent();
  await devAgent.initialize();
  orchestrator.getAgentRegistry().register(devAgent);

  // 3. Start orchestrator
  console.log('3. Starting orchestrator...');
  await orchestrator.start();

  // 4. Execute agent directly
  console.log('\n4. Executing agent directly...');
  const deployResult = await orchestrator.executeAgent('developer-agent', {
    action: 'deploy',
    environment: 'dev',
    strategy: 'rolling'
  });

  console.log('   Deployment Result:', {
    status: deployResult.status,
    deploymentId: deployResult.result?.deploymentId,
    duration: deployResult.endTime
      ? deployResult.endTime.getTime() - deployResult.startTime.getTime()
      : 'N/A'
  });

  // 5. Register a workflow
  console.log('\n5. Registering workflow...');
  const workflowEngine = orchestrator.getWorkflowEngine();

  workflowEngine.registerWorkflow({
    id: 'simple-deployment',
    name: 'Simple Deployment Workflow',
    description: 'Build, test, and deploy application',
    steps: [
      {
        id: 'build',
        name: 'Build Application',
        agentId: 'developer-agent',
        action: 'build',
        parameters: {
          branch: 'main',
          run_tests: true
        },
        retryPolicy: {
          maxAttempts: 2,
          backoffMs: 1000
        }
      },
      {
        id: 'deploy',
        name: 'Deploy to Dev',
        agentId: 'developer-agent',
        action: 'deploy',
        parameters: {
          environment: 'dev',
          strategy: 'rolling',
          health_check: true
        }
      }
    ]
  });

  // 6. Execute workflow
  console.log('6. Executing workflow...');
  const workflowResult = await orchestrator.executeWorkflow('simple-deployment', {
    application: 'demo-app',
    version: '1.0.0'
  });

  console.log('   Workflow Result:', {
    status: workflowResult.status,
    stepsCompleted: workflowResult.steps.filter(s => s.status === 'completed').length,
    totalSteps: workflowResult.steps.length,
    duration: workflowResult.endTime
      ? workflowResult.endTime.getTime() - workflowResult.startTime.getTime()
      : 'N/A'
  });

  // 7. Register event handler
  console.log('\n7. Registering event handler...');
  const eventManager = orchestrator.getEventManager();

  eventManager.registerHandler('deployment.complete', async (event) => {
    console.log('   [Event Handler] Deployment completed:', {
      deploymentId: event.data.deploymentId,
      timestamp: event.timestamp
    });
  });

  // 8. Publish event
  console.log('8. Publishing event...');
  await eventManager.deploymentComplete('deploy-demo-123', {
    application: 'demo-app',
    environment: 'dev'
  });

  // Wait for async event handler
  await new Promise(resolve => setTimeout(resolve, 500));

  // 9. Add scheduled job (for demonstration)
  console.log('\n9. Adding scheduled job...');
  const scheduler = orchestrator.getScheduler();

  scheduler.addJob(
    'demo-job',
    '*/5 * * * * *',  // Every 5 seconds
    async () => {
      console.log('   [Scheduled Job] Running demo job at', new Date().toISOString());
    },
    {
      name: 'demo-job',
      agentId: 'developer-agent',
      cron: '*/5 * * * * *',
      enabled: true,
      parameters: {}
    }
  );

  console.log('   Scheduled job added (runs every 5 seconds)');
  console.log('   Waiting 15 seconds to observe scheduled executions...');

  // Wait to observe scheduled executions
  await new Promise(resolve => setTimeout(resolve, 15000));

  // 10. Get execution history
  console.log('\n10. Checking execution history...');
  const history = scheduler.getExecutionHistory('demo-job');
  console.log(`   Scheduled job executed ${history.length} times`);
  console.log(`   Success rate: ${history.filter(h => h.status === 'completed').length}/${history.length}`);

  // 11. Get orchestrator state
  console.log('\n11. Orchestrator state:');
  const state = orchestrator.getState();
  console.log('   ', JSON.stringify(state, null, 2));

  // 12. Health check
  console.log('\n12. Health check:');
  const health = await orchestrator.healthCheck();
  console.log('   Orchestrator:', health.orchestrator ? 'Healthy' : 'Unhealthy');
  console.log('   Scheduler:', health.scheduler ? 'Healthy' : 'Unhealthy');
  console.log('   Agents:');
  health.agents.forEach((healthy, agentId) => {
    console.log(`     - ${agentId}: ${healthy ? 'Healthy' : 'Unhealthy'}`);
  });

  // 13. Stop orchestrator
  console.log('\n13. Stopping orchestrator...');
  await orchestrator.stop();

  console.log('\n=== Demo Complete ===');
}

// Run example
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
