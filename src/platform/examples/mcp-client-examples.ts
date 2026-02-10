/**
 * MCP Client Examples
 *
 * Comprehensive examples of using the Platform MCP Client
 */

import { createMCPClient } from '../mcp/client/mcp-client';

/**
 * Example 1: Basic Deployment Workflow
 */
async function example1_basicDeployment() {
  console.log('\n=== Example 1: Basic Deployment ===\n');

  const client = await createMCPClient();

  try {
    // Deploy application
    const deployment = await client.deployApplication({
      application: 'web-app',
      version: '1.2.0',
      environment: 'prod',
      strategy: 'rolling',
      replicas: 3
    });

    console.log(`✓ Deployment created: ${deployment.deployment_id}`);

    // Monitor deployment status
    let status = await client.getDeploymentStatus(deployment.deployment_id);
    console.log(`✓ Status: ${status.status}`);

    // Get deployment logs
    const logs = await client.callTool('get_deployment_logs', {
      deployment_id: deployment.deployment_id,
      lines: 10
    });

    console.log(`✓ Retrieved ${logs.count} log lines`);

  } finally {
    await client.disconnect();
  }
}

/**
 * Example 2: Infrastructure Provisioning with Validation
 */
async function example2_infrastructureProvisioning() {
  console.log('\n=== Example 2: Infrastructure Provisioning ===\n');

  const client = await createMCPClient();

  const workflow = `
    workflow:
      name: production-infrastructure
      target_cloud: aws
      region: us-east-1
      resources:
        - type: virtual_network
          name: prod-vpc
          cidr: "10.0.0.0/16"
        - type: kubernetes_cluster
          name: prod-cluster
          version: "1.28"
          node_count: 3
  `;

  try {
    // Validate workflow first
    const validation = await client.callTool('validate_infrastructure', {
      workflow
    });

    if (!validation.valid) {
      throw new Error('Invalid workflow');
    }

    console.log(`✓ Workflow validated`);
    console.log(`  Estimated cost: $${validation.estimated_cost.monthly}/month`);

    // Provision infrastructure
    const infra = await client.provisionInfrastructure({
      workflow,
      cloud: 'aws',
      environment: 'prod'
    });

    console.log(`✓ Provisioning started: ${infra.workflow_id}`);

    // Tag resources
    await client.callTool('tag_infrastructure', {
      workflow_id: infra.workflow_id,
      tags: {
        environment: 'production',
        team: 'platform',
        cost_center: 'engineering'
      }
    });

    console.log(`✓ Resources tagged`);

  } finally {
    await client.disconnect();
  }
}

/**
 * Example 3: Security Scanning and Compliance
 */
async function example3_securityCompliance() {
  console.log('\n=== Example 3: Security & Compliance ===\n');

  const client = await createMCPClient();

  try {
    // Run comprehensive security scan
    const scan = await client.runSecurityScan({
      target: 'web-app:v1.2.0',
      scan_type: 'all'
    });

    console.log(`✓ Security scan completed`);
    console.log(`  Critical: ${scan.critical}`);
    console.log(`  High: ${scan.high}`);

    if (scan.critical > 0) {
      console.log(`⚠ Critical vulnerabilities found!`);

      // Apply patches
      const patches = await client.callTool('apply_patches', {
        target: 'web-app:v1.2.0',
        auto_approve: false
      });

      console.log(`✓ ${patches.patches_applied} patches applied`);
    }

    // Check compliance
    const compliance = await client.checkCompliance({
      target: 'web-app',
      standards: ['CIS', 'SOC2']
    });

    console.log(`✓ Compliance check completed`);
    console.log(`  Score: ${compliance.score}/100`);
    console.log(`  Compliant: ${compliance.compliant}`);

    // Generate security report
    const report = await client.callTool('generate_security_report', {
      target: 'web-app',
      format: 'pdf'
    });

    console.log(`✓ Security report: ${report.url}`);

  } finally {
    await client.disconnect();
  }
}

/**
 * Example 4: Cost Optimization
 */
async function example4_costOptimization() {
  console.log('\n=== Example 4: Cost Optimization ===\n');

  const client = await createMCPClient();

  try {
    // Get current costs
    const report = await client.getCostReport({
      period: 'monthly',
      cloud: 'aws'
    });

    console.log(`✓ Current monthly cost: $${report.total_cost}`);

    // Find unused resources
    const unused = await client.callTool('get_unused_resources', {
      cloud: 'aws',
      days_unused: 30
    });

    console.log(`✓ Found ${unused.unused_resources.length} unused resources`);
    console.log(`  Potential savings: $${unused.total_waste}/month`);

    // Get optimization recommendations
    const optimizations = await client.callTool('optimize_costs', {
      cloud: 'aws',
      strategy: 'moderate'
    });

    console.log(`✓ Optimization opportunities:`);
    optimizations.opportunities.forEach((opp: any) => {
      console.log(`  - ${opp.action}: ${opp.savings}`);
    });

    // Set budget alert
    await client.callTool('set_budget_alert', {
      cloud: 'aws',
      budget: 5000,
      threshold: 80
    });

    console.log(`✓ Budget alert configured`);

    // Forecast future costs
    const forecast = await client.forecastCosts({
      cloud: 'aws',
      months: 6
    });

    console.log(`✓ 6-month forecast: $${forecast.total_forecast}`);

  } finally {
    await client.disconnect();
  }
}

/**
 * Example 5: Observability and Monitoring
 */
async function example5_observability() {
  console.log('\n=== Example 5: Observability ===\n');

  const client = await createMCPClient();

  try {
    // Get service metrics
    const metrics = await client.getMetrics({
      service: 'web-app',
      metrics: ['cpu', 'memory', 'requests', 'errors', 'latency']
    });

    console.log(`✓ Metrics retrieved:`);
    console.log(`  CPU: ${metrics.metrics.cpu}%`);
    console.log(`  Memory: ${metrics.metrics.memory}%`);
    console.log(`  Latency p95: ${metrics.metrics.latency.p95}ms`);

    // Check service health
    const health = await client.getServiceHealth('web-app');

    console.log(`✓ Service health: ${health.status}`);
    console.log(`  Uptime: ${health.uptime}`);

    // Get error rate
    const errorRate = await client.callTool('get_error_rate', {
      service: 'web-app',
      time_window: '5m'
    });

    console.log(`✓ Error rate: ${errorRate.error_rate}%`);

    // Create alert if error rate is high
    if (errorRate.error_rate > 1.0) {
      await client.callTool('create_alert', {
        service: 'web-app',
        metric: 'error_rate',
        condition: 'gt',
        threshold: 1.0,
        notification: {
          email: ['ops@example.com'],
          slack: '#alerts'
        }
      });

      console.log(`✓ Alert created for high error rate`);
    }

    // Analyze performance
    const analysis = await client.callTool('analyze_performance', {
      service: 'web-app',
      start_time: new Date(Date.now() - 3600000).toISOString(),
      end_time: new Date().toISOString()
    });

    console.log(`✓ Performance analysis:`);
    analysis.analysis.bottlenecks.forEach((b: string) => {
      console.log(`  - ${b}`);
    });

  } finally {
    await client.disconnect();
  }
}

/**
 * Example 6: Complete Release Pipeline
 */
async function example6_releasePipeline() {
  console.log('\n=== Example 6: Release Pipeline ===\n');

  const client = await createMCPClient();

  try {
    // 1. Run tests
    console.log('Step 1: Running tests...');
    const tests = await client.runTests({
      type: 'e2e',
      parallel: true
    });

    if (tests.failed > 0) {
      throw new Error(`${tests.failed} tests failed`);
    }

    console.log(`✓ All tests passed (${tests.passed}/${tests.total})`);

    // 2. Check code coverage
    console.log('Step 2: Checking coverage...');
    const coverage = await client.getCodeCoverage({
      threshold: 80
    });

    console.log(`✓ Coverage: ${coverage.coverage.lines}%`);

    // 3. Run security scan
    console.log('Step 3: Security scan...');
    const scan = await client.runSecurityScan({
      target: 'web-app:v2.0.0',
      scan_type: 'all'
    });

    if (scan.critical > 0) {
      throw new Error('Critical vulnerabilities found');
    }

    console.log(`✓ No critical vulnerabilities`);

    // 4. Create release
    console.log('Step 4: Creating release...');
    const release = await client.createRelease({
      application: 'web-app',
      version: '2.0.0',
      environment: 'prod',
      strategy: 'blue-green',
      approval_required: true
    });

    console.log(`✓ Release created: ${release.release_id}`);

    // 5. Approve release
    console.log('Step 5: Approving release...');
    await client.approveRelease({
      release_id: release.release_id,
      approver: 'release-manager'
    });

    console.log(`✓ Release approved`);

    // 6. Monitor release
    console.log('Step 6: Monitoring release...');
    const status = await client.getReleaseStatus(release.release_id);

    console.log(`✓ Release status: ${status.status}`);
    console.log(`✓ Progress: ${status.progress}%`);

    console.log('\n🎉 Release pipeline completed successfully!\n');

  } catch (error: any) {
    console.error(`❌ Release pipeline failed: ${error.message}`);
  } finally {
    await client.disconnect();
  }
}

/**
 * Example 7: Architecture Validation
 */
async function example7_architectureValidation() {
  console.log('\n=== Example 7: Architecture Validation ===\n');

  const client = await createMCPClient();

  try {
    // Validate architecture
    const validation = await client.validateArchitecture({
      target: './src',
      rules: ['layer-boundaries', 'no-circular-deps']
    });

    console.log(`✓ Architecture validation: ${validation.status}`);

    // Check coupling
    const coupling = await client.callTool('check_coupling', {
      target: './src',
      threshold: 50
    });

    console.log(`✓ Coupling score: ${coupling.coupling_score}`);

    // Detect circular dependencies
    const circular = await client.callTool('detect_circular_dependencies', {
      target: './src'
    });

    if (circular.total_cycles > 0) {
      console.log(`⚠ Found ${circular.total_cycles} circular dependencies`);
    }

    // Check SOLID principles
    const solid = await client.callTool('check_solid_principles', {
      target: './src'
    });

    console.log(`✓ SOLID compliance: ${solid.overall_score}%`);

    // Generate architecture diagram
    const diagram = await client.callTool('generate_architecture_diagram', {
      target: './src',
      format: 'mermaid'
    });

    console.log(`✓ Architecture diagram: ${diagram.diagram_url}`);

  } finally {
    await client.disconnect();
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await example1_basicDeployment();
    await example2_infrastructureProvisioning();
    await example3_securityCompliance();
    await example4_costOptimization();
    await example5_observability();
    await example6_releasePipeline();
    await example7_architectureValidation();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error: any) {
    console.error(`\n❌ Example failed: ${error.message}\n`);
  }
}

// Export examples
export {
  example1_basicDeployment,
  example2_infrastructureProvisioning,
  example3_securityCompliance,
  example4_costOptimization,
  example5_observability,
  example6_releasePipeline,
  example7_architectureValidation,
  runAllExamples
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
