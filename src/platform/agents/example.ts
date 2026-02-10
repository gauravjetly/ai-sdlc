/**
 * Agent Usage Examples
 *
 * This file demonstrates how to use the AI agent personas
 */

import { AgentFactory, AgentType } from './index';

/**
 * Example 1: Create and use a single agent
 */
async function example1_SingleAgent() {
  console.log('=== Example 1: Single Developer Agent ===\n');

  // Create a developer agent
  const devAgent = AgentFactory.createAgent(AgentType.DEVELOPER, {
    id: 'dev-1',
    name: 'Developer Agent',
    description: 'Software engineering automation',
    enableScheduling: false, // Disable for demo
    enableEventTriggers: false
  });

  // Initialize the agent
  await devAgent.initialize();

  // Check health
  const healthy = await devAgent.healthCheck();
  console.log(`Agent health: ${healthy ? 'Healthy' : 'Unhealthy'}`);

  // Execute deployment
  console.log('\nDeploying application...');
  const deployResult = await devAgent.execute({
    action: 'deploy',
    application: 'demo-app',
    version: '1.0.0',
    environment: 'dev'
  });
  console.log(`Deployment status: ${deployResult.status}`);

  // Run tests
  console.log('\nRunning tests...');
  const testResult = await devAgent.execute({
    action: 'run_tests',
    type: 'unit'
  });
  console.log(`Test status: ${testResult.status}`);

  // Shutdown
  await devAgent.shutdown();
  console.log('\nAgent shut down successfully\n');
}

/**
 * Example 2: Create complete agent team
 */
async function example2_AgentTeam() {
  console.log('=== Example 2: Complete Agent Team ===\n');

  // Create all 8 agents
  const team = await AgentFactory.createAgentTeam({
    enableScheduling: false, // Disable for demo
    enableEventTriggers: false
  });

  console.log('Agent team created:');
  console.log('- Developer Agent');
  console.log('- SRE Agent');
  console.log('- Security Agent');
  console.log('- QA Agent');
  console.log('- Release Manager Agent');
  console.log('- Architect Agent');
  console.log('- FinOps Agent');
  console.log('- Conductor Agent');

  // Check health of all agents
  const healthStatus = await AgentFactory.healthCheckAll();
  console.log(`\nHealth Status: ${healthStatus.healthy}/${healthStatus.agents.length} healthy`);

  // Shutdown all agents
  await AgentFactory.shutdownAll();
  console.log('\nAll agents shut down successfully\n');
}

/**
 * Example 3: Multi-agent workflow with Conductor
 */
async function example3_MultiAgentWorkflow() {
  console.log('=== Example 3: Multi-Agent Workflow ===\n');

  const team = await AgentFactory.createAgentTeam({
    enableScheduling: false,
    enableEventTriggers: false
  });

  // Define a deployment workflow
  const workflow = {
    id: 'deploy-workflow-1',
    name: 'Complete Deployment Workflow',
    description: 'Full deployment with testing and security scanning',
    steps: [
      {
        id: 'step-1',
        name: 'Deploy Application',
        agentId: 'developer-agent-1',
        action: 'deploy',
        parameters: {
          application: 'my-app',
          version: '2.0.0',
          environment: 'uat'
        },
        continueOnFailure: false
      },
      {
        id: 'step-2',
        name: 'Run Tests',
        agentId: 'qa-agent-1',
        action: 'run_tests',
        parameters: {
          type: 'integration',
          target: 'my-app'
        },
        continueOnFailure: false
      },
      {
        id: 'step-3',
        name: 'Security Scan',
        agentId: 'security-agent-1',
        action: 'scan_vulnerabilities',
        parameters: {
          target: 'my-app',
          scanType: 'all'
        },
        continueOnFailure: false
      },
      {
        id: 'step-4',
        name: 'Performance Check',
        agentId: 'sre-agent-1',
        action: 'analyze_performance',
        parameters: {
          service: 'my-app',
          timeRange: '1h'
        },
        continueOnFailure: true
      }
    ],
    metadata: {
      createdBy: 'demo-user',
      environment: 'uat'
    }
  };

  console.log('Executing multi-agent workflow...');
  console.log(`Workflow: ${workflow.name}`);
  console.log(`Steps: ${workflow.steps.length}`);

  const execution = await team.conductor.executeWorkflow({
    workflow,
    context: {
      initiatedBy: 'example-script',
      timestamp: new Date()
    }
  });

  console.log(`\nWorkflow execution ${execution.status}`);
  console.log(`Duration: ${execution.endTime ? execution.endTime.getTime() - execution.startTime.getTime() : 'N/A'}ms`);

  // Shutdown
  await AgentFactory.shutdownAll();
  console.log('\nAll agents shut down successfully\n');
}

/**
 * Example 4: Individual agent actions
 */
async function example4_IndividualActions() {
  console.log('=== Example 4: Individual Agent Actions ===\n');

  const team = await AgentFactory.createAgentTeam({
    enableScheduling: false,
    enableEventTriggers: false
  });

  // Developer: Deploy application
  console.log('1. Developer Agent: Deploying application');
  await team.developer.execute({
    action: 'deploy',
    application: 'test-app',
    version: '1.0.0',
    environment: 'dev'
  });

  // QA: Run tests
  console.log('2. QA Agent: Running tests');
  await team.qa.execute({
    action: 'run_tests',
    type: 'unit'
  });

  // Security: Scan vulnerabilities
  console.log('3. Security Agent: Scanning vulnerabilities');
  await team.security.execute({
    action: 'scan_vulnerabilities',
    target: 'test-app',
    scanType: 'vulnerabilities'
  });

  // SRE: Check system health
  console.log('4. SRE Agent: Checking system health');
  await team.sre.execute({
    action: 'check_health',
    service: 'test-app'
  });

  // Architect: Validate architecture
  console.log('5. Architect Agent: Validating architecture');
  await team.architect.execute({
    action: 'validate_architecture',
    target: 'test-app'
  });

  // FinOps: Analyze costs
  console.log('6. FinOps Agent: Analyzing costs');
  await team.finops.execute({
    action: 'analyze_costs',
    period: 'daily'
  });

  // Release Manager: Create release
  console.log('7. Release Manager: Creating release');
  await team.releaseManager.execute({
    action: 'create_release',
    application: 'test-app',
    version: '1.0.0',
    environment: 'dev'
  });

  console.log('\nAll agent actions completed successfully');

  await AgentFactory.shutdownAll();
  console.log('All agents shut down successfully\n');
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await example1_SingleAgent();
    await example2_AgentTeam();
    await example3_MultiAgentWorkflow();
    await example4_IndividualActions();

    console.log('=== All examples completed successfully ===');
  } catch (error: any) {
    console.error('Example failed:', error.message);
    console.error(error.stack);
  }
}

// Run examples if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  example1_SingleAgent,
  example2_AgentTeam,
  example3_MultiAgentWorkflow,
  example4_IndividualActions,
  runExamples
};
