/**
 * QA Agent
 *
 * AI persona for Quality Assurance tasks
 * Handles test execution, test coverage analysis, regression testing, and quality validation
 */

import { BaseAgent, BaseAgentConfig } from './base-agent';
import { AgentType, PlatformEvent } from '../orchestration/types/orchestration-types';

export interface QAAgentConfig extends BaseAgentConfig {
  coverageThreshold?: number;
  autoRunTests?: boolean;
  testEnvironment?: 'dev' | 'uat' | 'staging';
  regressionSchedule?: string;
}

/**
 * QA Agent
 * Specialized in testing and quality assurance
 */
export class QAAgent extends BaseAgent {
  private qaConfig: QAAgentConfig;

  constructor(config: QAAgentConfig) {
    super(config);
    this.qaConfig = {
      coverageThreshold: 80,
      autoRunTests: true,
      testEnvironment: 'uat',
      regressionSchedule: '0 2 * * *', // 2 AM daily
      ...config
    };
  }

  /**
   * Setup event triggers
   * - deployment.complete: Run smoke tests after deployment
   * - code.committed: Run unit tests
   * - release.scheduled: Run full regression suite
   */
  protected setupEventTriggers(): void {
    // Run smoke tests after deployment
    this.registerEventHandler('deployment.complete', async (event: PlatformEvent) => {
      await this.runPostDeploymentTests(event);
    });

    // Run tests on code commit
    this.registerEventHandler('code.committed', async (event: PlatformEvent) => {
      await this.runCommitTests(event);
    });

    // Run full regression for releases
    this.registerEventHandler('release.scheduled', async (event: PlatformEvent) => {
      await this.runRegressionSuite(event);
    });

    // Analyze test failures
    this.registerEventHandler('test.failed', async (event: PlatformEvent) => {
      await this.analyzeTestFailure(event);
    });
  }

  /**
   * Setup scheduled jobs
   * - Hourly smoke tests
   * - Nightly regression tests (2 AM)
   * - Daily coverage reports (9 AM)
   */
  protected setupScheduledJobs(): void {
    // Hourly smoke tests
    this.scheduleJob(
      'smoke-tests',
      '0 * * * *',
      async () => await this.runSmokeTests()
    );

    // Nightly regression tests at 2 AM
    this.scheduleJob(
      'regression-tests',
      '0 2 * * *',
      async () => await this.runFullRegressionTests()
    );

    // Daily coverage report at 9 AM
    this.scheduleJob(
      'coverage-report',
      '0 9 * * *',
      async () => await this.generateCoverageReport()
    );

    // Weekly test quality analysis (Monday 8 AM)
    this.scheduleJob(
      'test-quality-analysis',
      '0 8 * * 1',
      async () => await this.analyzeTestQuality()
    );
  }

  /**
   * Execute QA agent action
   */
  protected async executeInternal(parameters: any): Promise<any> {
    const { action, ...params } = parameters;

    switch (action) {
      case 'run_tests':
        return await this.runTests(params);
      case 'check_coverage':
        return await this.checkCoverage(params);
      case 'validate_quality':
        return await this.validateQuality(params);
      case 'generate_report':
        return await this.generateTestReport(params);
      case 'analyze_flaky_tests':
        return await this.analyzeFlakyTests(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Get agent type
   */
  protected getAgentType(): AgentType {
    return AgentType.QA;
  }

  /**
   * Get agent capabilities
   */
  protected getCapabilities(): string[] {
    return [
      'run_tests',
      'check_test_coverage',
      'run_smoke_tests',
      'run_integration_tests',
      'run_e2e_tests',
      'analyze_test_quality',
      'generate_test_reports'
    ];
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Run tests
   */
  async runTests(params: {
    type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
    target?: string;
    parallel?: boolean;
    coverage?: boolean;
  }): Promise<any> {
    this.logger.info('Running tests', params);

    const result = await this.mcpClient.runTests({
      type: params.type,
      target: params.target,
      parallel: params.parallel !== false
    });

    this.logger.info('Test execution complete', {
      type: params.type,
      total: result.total,
      passed: result.passed,
      failed: result.failed,
      skipped: result.skipped,
      duration: result.duration
    });

    // Trigger event if tests failed
    if (result.failed > 0) {
      await this.eventManager.testFailed(
        `${params.type}-tests`,
        `${result.failed} tests failed`,
        { type: params.type, failures: result.failures }
      );
    } else {
      await this.eventManager.testPassed(
        `${params.type}-tests`,
        { type: params.type, total: result.total }
      );
    }

    return result;
  }

  /**
   * Check test coverage
   */
  async checkCoverage(params: {
    target?: string;
    threshold?: number;
  }): Promise<any> {
    this.logger.info('Checking test coverage', params);

    const result = await this.mcpClient.getCodeCoverage({
      target: params.target,
      threshold: params.threshold || this.qaConfig.coverageThreshold
    });

    this.logger.info('Coverage check complete', {
      coverage: result.percentage,
      threshold: params.threshold || this.qaConfig.coverageThreshold,
      passed: result.meets_threshold
    });

    if (!result.meets_threshold) {
      this.logger.warn('Coverage below threshold', {
        current: result.percentage,
        threshold: params.threshold || this.qaConfig.coverageThreshold,
        uncovered_lines: result.uncovered_lines
      });
    }

    return result;
  }

  /**
   * Validate quality
   */
  async validateQuality(params: {
    target?: string;
    checks?: string[];
  }): Promise<any> {
    this.logger.info('Validating quality', params);

    const result = await this.mcpClient.callTool('validate_quality', {
      target: params.target || '.',
      checks: params.checks || ['tests', 'coverage', 'lint', 'complexity']
    });

    this.logger.info('Quality validation complete', {
      passed: result.passed,
      failed_checks: result.failed_checks,
      quality_score: result.quality_score
    });

    return result;
  }

  /**
   * Generate test report
   */
  async generateTestReport(params: {
    type?: 'summary' | 'detailed' | 'coverage';
    timeRange?: string;
  }): Promise<any> {
    this.logger.info('Generating test report', params);

    const result = await this.mcpClient.callTool('generate_test_report', {
      type: params.type || 'summary',
      time_range: params.timeRange || '24h'
    });

    this.logger.info('Test report generated', {
      type: params.type,
      report_id: result.report_id
    });

    return result;
  }

  /**
   * Analyze flaky tests
   */
  async analyzeFlakyTests(params: {
    threshold?: number;
    timeRange?: string;
  }): Promise<any> {
    this.logger.info('Analyzing flaky tests', params);

    const result = await this.mcpClient.callTool('analyze_flaky_tests', {
      threshold: params.threshold || 0.1, // 10% failure rate
      time_range: params.timeRange || '7d'
    });

    this.logger.info('Flaky test analysis complete', {
      flaky_tests_found: result.flaky_tests_count,
      top_offenders: result.top_flaky_tests?.length || 0
    });

    return result;
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Run post-deployment tests
   */
  private async runPostDeploymentTests(event: PlatformEvent): Promise<void> {
    const { deploymentId, application, environment } = event.data;

    this.logger.info('Running post-deployment tests', {
      deploymentId,
      application,
      environment
    });

    try {
      // Wait for deployment to stabilize
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

      // Run smoke tests
      const smokeResult = await this.runTests({
        type: 'integration',
        target: application,
        parallel: true
      });

      if (smokeResult.failed > 0) {
        this.logger.error('Post-deployment tests failed', {
          deploymentId,
          application,
          failed: smokeResult.failed
        });

        // Trigger deployment failure event
        await this.eventManager.deploymentFailed(
          deploymentId,
          `Post-deployment tests failed: ${smokeResult.failed} tests`,
          { test_results: smokeResult }
        );
      } else {
        this.logger.info('Post-deployment tests passed', {
          deploymentId,
          application,
          total: smokeResult.total
        });
      }

    } catch (error: any) {
      this.logger.error('Failed to run post-deployment tests:', {
        error: error.message,
        deploymentId
      });
    }
  }

  /**
   * Run tests on code commit
   */
  private async runCommitTests(event: PlatformEvent): Promise<void> {
    const { commitId, files } = event.data;

    this.logger.info('Running commit tests', {
      commitId,
      files_changed: files?.length || 0
    });

    try {
      if (this.qaConfig.autoRunTests) {
        // Run unit tests
        const unitResult = await this.runTests({
          type: 'unit',
          parallel: true,
          coverage: true
        });

        this.logger.info('Commit tests complete', {
          commitId,
          passed: unitResult.passed,
          failed: unitResult.failed
        });
      }

    } catch (error: any) {
      this.logger.error('Failed to run commit tests:', {
        error: error.message,
        commitId
      });
    }
  }

  /**
   * Run regression suite for release
   */
  private async runRegressionSuite(event: PlatformEvent): Promise<void> {
    const { releaseId, version } = event.data;

    this.logger.info('Running regression suite for release', {
      releaseId,
      version
    });

    try {
      // Run full test suite
      const results = await Promise.all([
        this.runTests({ type: 'unit', parallel: true }),
        this.runTests({ type: 'integration', parallel: true }),
        this.runTests({ type: 'e2e', parallel: false })
      ]);

      const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

      if (totalFailed > 0) {
        this.logger.error('Regression suite failed', {
          releaseId,
          total_failed: totalFailed
        });
      } else {
        this.logger.info('Regression suite passed', {
          releaseId,
          total_tests: results.reduce((sum, r) => sum + r.total, 0)
        });
      }

    } catch (error: any) {
      this.logger.error('Failed to run regression suite:', {
        error: error.message,
        releaseId
      });
    }
  }

  /**
   * Analyze test failure
   */
  private async analyzeTestFailure(event: PlatformEvent): Promise<void> {
    const { testId, reason, type } = event.data;

    this.logger.info('Analyzing test failure', {
      testId,
      reason,
      type
    });

    try {
      // Track failure patterns
      const analysis = await this.mcpClient.callTool('analyze_test_failure', {
        test_id: testId,
        reason,
        type
      });

      this.logger.info('Test failure analysis complete', {
        testId,
        is_flaky: analysis.is_flaky,
        failure_pattern: analysis.pattern
      });

    } catch (error: any) {
      this.logger.error('Failed to analyze test failure:', {
        error: error.message,
        testId
      });
    }
  }

  // ============================================
  // Scheduled Tasks
  // ============================================

  /**
   * Run smoke tests
   */
  private async runSmokeTests(): Promise<void> {
    this.logger.info('Running scheduled smoke tests');

    try {
      const result = await this.mcpClient.callTool('run_smoke_tests', {
        environment: this.qaConfig.testEnvironment
      });

      if (result.failed > 0) {
        this.logger.warn('Smoke tests failed', {
          failed: result.failed,
          total: result.total
        });
      } else {
        this.logger.info('Smoke tests passed', {
          total: result.total,
          duration: result.duration
        });
      }

    } catch (error: any) {
      this.logger.error('Scheduled smoke tests failed:', {
        error: error.message
      });
    }
  }

  /**
   * Run full regression tests
   */
  private async runFullRegressionTests(): Promise<void> {
    this.logger.info('Running scheduled regression tests');

    try {
      // Run all test types
      const results = await Promise.all([
        this.runTests({ type: 'unit', parallel: true }),
        this.runTests({ type: 'integration', parallel: true }),
        this.runTests({ type: 'e2e', parallel: false })
      ]);

      const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
      const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

      this.logger.info('Regression tests complete', {
        total_passed: totalPassed,
        total_failed: totalFailed,
        success_rate: totalFailed === 0 ? 100 : (totalPassed / (totalPassed + totalFailed) * 100)
      });

    } catch (error: any) {
      this.logger.error('Scheduled regression tests failed:', {
        error: error.message
      });
    }
  }

  /**
   * Generate coverage report
   */
  private async generateCoverageReport(): Promise<void> {
    this.logger.info('Generating daily coverage report');

    try {
      const coverage = await this.checkCoverage({
        threshold: this.qaConfig.coverageThreshold
      });

      this.logger.info('Coverage report generated', {
        coverage: coverage.percentage,
        threshold: this.qaConfig.coverageThreshold,
        meets_threshold: coverage.meets_threshold
      });

      // Generate detailed report
      await this.generateTestReport({
        type: 'coverage'
      });

    } catch (error: any) {
      this.logger.error('Failed to generate coverage report:', {
        error: error.message
      });
    }
  }

  /**
   * Analyze test quality
   */
  private async analyzeTestQuality(): Promise<void> {
    this.logger.info('Starting test quality analysis');

    try {
      // Check for flaky tests
      const flakyTests = await this.analyzeFlakyTests({
        threshold: 0.1,
        timeRange: '7d'
      });

      // Analyze test coverage trends
      const coverage = await this.checkCoverage({});

      // Quality metrics
      this.logger.info('Test quality analysis complete', {
        flaky_tests: flakyTests.flaky_tests_count,
        coverage: coverage.percentage,
        quality_score: this.calculateQualityScore(flakyTests, coverage)
      });

    } catch (error: any) {
      this.logger.error('Test quality analysis failed:', {
        error: error.message
      });
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Calculate quality score
   */
  private calculateQualityScore(flakyTests: any, coverage: any): number {
    // Simple scoring algorithm
    let score = 100;

    // Deduct points for flaky tests
    score -= flakyTests.flaky_tests_count * 5;

    // Deduct points for low coverage
    if (coverage.percentage < this.qaConfig.coverageThreshold!) {
      score -= (this.qaConfig.coverageThreshold! - coverage.percentage);
    }

    return Math.max(0, Math.min(100, score));
  }
}
