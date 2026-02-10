/**
 * QA Agent Worker
 * Real test execution and quality assurance - NO MOCK DATA
 */

import { Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../../../infrastructure/database/prisma.client.js';
import { WebSocketServer } from '../../../infrastructure/websocket/server.js';
import { createLogger } from '../../../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('QAWorker');

export class QAWorker {
  constructor(private websocket?: WebSocketServer) {}

  /**
   * Main worker process handler
   */
  async process(job: Job): Promise<any> {
    const { executionId, taskType, taskParams } = job.data;

    await this.log(executionId, `Starting QA task: ${taskType}`);
    logger.info('Processing QA task', { executionId, taskType, jobId: job.id });

    try {
      switch (taskType) {
        case 'run_e2e_tests':
          return await this.runE2ETests(job);
        case 'performance_test':
          return await this.performanceTest(job);
        case 'smoke_test':
          return await this.smokeTest(job);
        case 'load_test':
          return await this.loadTest(job);
        case 'quality_gate_check':
          return await this.qualityGateCheck(job);
        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }
    } catch (error: any) {
      await this.log(executionId, `Task failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Run end-to-end tests
   */
  private async runE2ETests(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { projectPath, baseUrl, browser = 'chromium', headless = true } = taskParams;

    if (!projectPath || !baseUrl) {
      throw new Error('projectPath and baseUrl are required for E2E tests');
    }

    job.updateProgress(10);
    await this.log(executionId, `Running E2E tests against ${baseUrl}`);

    try {
      const command = headless
        ? `cd "${projectPath}" && npx playwright test --project=${browser}`
        : `cd "${projectPath}" && npx playwright test --project=${browser} --headed`;

      job.updateProgress(30);
      await this.log(executionId, `Executing Playwright tests in ${browser}...`);

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, BASE_URL: baseUrl },
      });

      job.updateProgress(80);
      const output = stdout + stderr;

      // Parse results
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const skippedMatch = output.match(/(\d+) skipped/);

      const results = {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
        total: 0,
        duration: 0,
        browser,
        baseUrl,
      };

      results.total = results.passed + results.failed + results.skipped;

      // Extract duration
      const durationMatch = output.match(/(\d+)s/);
      if (durationMatch) {
        results.duration = parseInt(durationMatch[1]);
      }

      job.updateProgress(100);
      await this.log(
        executionId,
        `E2E tests complete. Passed: ${results.passed}, Failed: ${results.failed}`
      );

      return {
        ...results,
        output: output.substring(0, 5000),
      };
    } catch (error: any) {
      const output = (error.stdout || '') + (error.stderr || '');
      const passed = output.match(/(\d+) passed/)?.[1] || '0';
      const failed = output.match(/(\d+) failed/)?.[1] || '0';

      await this.log(executionId, `E2E tests completed with failures: ${failed}`, 'WARN');

      return {
        passed: parseInt(passed),
        failed: parseInt(failed),
        skipped: 0,
        total: parseInt(passed) + parseInt(failed),
        output: output.substring(0, 5000),
      };
    }
  }

  /**
   * Run performance tests
   */
  private async performanceTest(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { url, duration = 60, vus = 10 } = taskParams;

    if (!url) {
      throw new Error('url is required for performance testing');
    }

    job.updateProgress(10);
    await this.log(executionId, `Running performance test against ${url} (${vus} VUs, ${duration}s)`);

    try {
      // Use k6 for load testing
      const k6Script = `
        import http from 'k6/http';
        import { check } from 'k6';

        export let options = {
          vus: ${vus},
          duration: '${duration}s',
        };

        export default function() {
          let res = http.get('${url}');
          check(res, {
            'status is 200': (r) => r.status === 200,
            'response time < 500ms': (r) => r.timings.duration < 500,
          });
        }
      `;

      // Write k6 script to temp file
      const scriptPath = `/tmp/k6-script-${executionId}.js`;
      await execAsync(`echo '${k6Script}' > ${scriptPath}`);

      job.updateProgress(30);
      await this.log(executionId, 'Executing performance test...');

      const { stdout } = await execAsync(`k6 run --out json=/tmp/k6-${executionId}.json ${scriptPath}`, {
        maxBuffer: 10 * 1024 * 1024,
      });

      job.updateProgress(80);
      await this.log(executionId, 'Analyzing performance metrics...');

      // Parse k6 output
      const metricsMatch = stdout.match(/http_req_duration.*avg=(\d+\.?\d*)ms.*p\(95\)=(\d+\.?\d*)ms/);
      const requestsMatch = stdout.match(/http_reqs.*(\d+)/);

      const results = {
        url,
        duration,
        vus,
        totalRequests: requestsMatch ? parseInt(requestsMatch[1]) : 0,
        avgResponseTime: metricsMatch ? parseFloat(metricsMatch[1]) : 0,
        p95ResponseTime: metricsMatch ? parseFloat(metricsMatch[2]) : 0,
        requestsPerSecond: 0,
      };

      results.requestsPerSecond = duration > 0 ? results.totalRequests / duration : 0;

      job.updateProgress(100);
      await this.log(
        executionId,
        `Performance test complete. Avg: ${results.avgResponseTime}ms, p95: ${results.p95ResponseTime}ms`
      );

      // Cleanup
      await execAsync(`rm -f ${scriptPath} /tmp/k6-${executionId}.json`);

      return results;
    } catch (error: any) {
      if (error.message.includes('command not found')) {
        throw new Error('k6 is not installed. Please install k6 for performance testing.');
      }
      throw error;
    }
  }

  /**
   * Run smoke tests
   */
  private async smokeTest(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { endpoints = [] } = taskParams;

    if (endpoints.length === 0) {
      throw new Error('endpoints array is required for smoke tests');
    }

    job.updateProgress(10);
    await this.log(executionId, `Running smoke tests on ${endpoints.length} endpoints`);

    const results: any[] = [];

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      job.updateProgress(10 + (i / endpoints.length) * 80);

      await this.log(executionId, `Testing endpoint: ${endpoint.url}`);

      try {
        const startTime = Date.now();
        const { stdout } = await execAsync(
          `curl -s -o /dev/null -w "%{http_code},%{time_total}" -X ${endpoint.method || 'GET'} "${endpoint.url}"`,
          { timeout: 10000 }
        );

        const [statusCode, timeTotal] = stdout.trim().split(',');
        const duration = parseFloat(timeTotal) * 1000;

        const success = parseInt(statusCode) >= 200 && parseInt(statusCode) < 400;

        results.push({
          url: endpoint.url,
          method: endpoint.method || 'GET',
          statusCode: parseInt(statusCode),
          duration,
          success,
        });

        await this.log(
          executionId,
          `${endpoint.url}: ${statusCode} (${duration.toFixed(0)}ms)`,
          success ? 'INFO' : 'WARN'
        );
      } catch (error: any) {
        results.push({
          url: endpoint.url,
          method: endpoint.method || 'GET',
          success: false,
          error: error.message,
        });
        await this.log(executionId, `${endpoint.url}: FAILED - ${error.message}`, 'ERROR');
      }
    }

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      avgDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length,
    };

    job.updateProgress(100);
    await this.log(
      executionId,
      `Smoke tests complete. Passed: ${summary.passed}/${summary.total}`
    );

    return {
      summary,
      results,
    };
  }

  /**
   * Run load tests
   */
  private async loadTest(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const {
      url,
      targetRPS = 100,
      duration = 300,
      rampUpTime = 60,
    } = taskParams;

    if (!url) {
      throw new Error('url is required for load testing');
    }

    job.updateProgress(10);
    await this.log(
      executionId,
      `Running load test: ${targetRPS} RPS for ${duration}s (ramp-up: ${rampUpTime}s)`
    );

    try {
      const k6Script = `
        import http from 'k6/http';
        import { check, sleep } from 'k6';

        export let options = {
          stages: [
            { duration: '${rampUpTime}s', target: ${targetRPS} },
            { duration: '${duration}s', target: ${targetRPS} },
            { duration: '60s', target: 0 },
          ],
        };

        export default function() {
          let res = http.get('${url}');
          check(res, {
            'status is 200': (r) => r.status === 200,
          });
        }
      `;

      const scriptPath = `/tmp/k6-load-${executionId}.js`;
      await execAsync(`echo '${k6Script}' > ${scriptPath}`);

      job.updateProgress(20);
      await this.log(executionId, 'Executing load test...');

      const { stdout } = await execAsync(`k6 run ${scriptPath}`, {
        maxBuffer: 20 * 1024 * 1024,
      });

      job.updateProgress(90);
      await this.log(executionId, 'Analyzing load test results...');

      // Parse results
      const checksMatch = stdout.match(/checks.*(\d+\.\d+)%/);
      const reqDurationMatch = stdout.match(/http_req_duration.*avg=(\d+\.?\d*)ms.*p\(95\)=(\d+\.?\d*)ms.*p\(99\)=(\d+\.?\d*)ms/);
      const reqsMatch = stdout.match(/http_reqs.*(\d+)/);
      const failedReqsMatch = stdout.match(/http_req_failed.*(\d+\.\d+)%/);

      const results = {
        url,
        targetRPS,
        duration,
        passRate: checksMatch ? parseFloat(checksMatch[1]) : 0,
        totalRequests: reqsMatch ? parseInt(reqsMatch[1]) : 0,
        failureRate: failedReqsMatch ? parseFloat(failedReqsMatch[1]) : 0,
        avgResponseTime: reqDurationMatch ? parseFloat(reqDurationMatch[1]) : 0,
        p95ResponseTime: reqDurationMatch ? parseFloat(reqDurationMatch[2]) : 0,
        p99ResponseTime: reqDurationMatch ? parseFloat(reqDurationMatch[3]) : 0,
      };

      results.actualRPS = results.totalRequests / (duration + rampUpTime + 60);

      job.updateProgress(100);
      await this.log(
        executionId,
        `Load test complete. ${results.actualRPS.toFixed(1)} RPS, ${results.passRate}% pass rate`
      );

      await execAsync(`rm -f ${scriptPath}`);

      return results;
    } catch (error: any) {
      if (error.message.includes('command not found')) {
        throw new Error('k6 is not installed. Please install k6 for load testing.');
      }
      throw error;
    }
  }

  /**
   * Check quality gates
   */
  private async qualityGateCheck(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const {
      projectPath,
      coverageThreshold = 80,
      securityThreshold = 0, // Max critical vulnerabilities
      performanceThreshold = 500, // Max response time (ms)
    } = taskParams;

    job.updateProgress(10);
    await this.log(executionId, 'Checking quality gates...');

    const gates: any[] = [];
    let overallPass = true;

    // Check test coverage
    if (projectPath) {
      job.updateProgress(30);
      await this.log(executionId, 'Checking test coverage...');

      try {
        const { stdout } = await execAsync(`cd "${projectPath}" && npm run test:coverage -- --json`, {
          maxBuffer: 10 * 1024 * 1024,
        });

        const coverage = this.parseCoverageReport(stdout);

        const coveragePassed = coverage.total >= coverageThreshold;
        gates.push({
          name: 'Test Coverage',
          passed: coveragePassed,
          actual: coverage.total,
          threshold: coverageThreshold,
          unit: '%',
        });

        if (!coveragePassed) overallPass = false;
      } catch (error) {
        gates.push({
          name: 'Test Coverage',
          passed: false,
          error: 'Unable to generate coverage report',
        });
        overallPass = false;
      }
    }

    // Check security vulnerabilities
    job.updateProgress(60);
    await this.log(executionId, 'Checking security vulnerabilities...');

    const criticalVulns = await prisma.vulnerability.count({
      where: {
        severity: 'CRITICAL',
        scan: {
          scannedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    const securityPassed = criticalVulns <= securityThreshold;
    gates.push({
      name: 'Security Vulnerabilities',
      passed: securityPassed,
      actual: criticalVulns,
      threshold: securityThreshold,
      unit: 'critical vulnerabilities',
    });

    if (!securityPassed) overallPass = false;

    job.updateProgress(90);

    const result = {
      passed: overallPass,
      gates,
      timestamp: new Date().toISOString(),
    };

    job.updateProgress(100);
    await this.log(
      executionId,
      `Quality gate check complete. Status: ${overallPass ? 'PASSED' : 'FAILED'}`
    );

    return result;
  }

  // Helper methods

  private parseCoverageReport(output: string): any {
    try {
      const coverage = JSON.parse(output);
      return {
        lines: coverage.total?.lines?.pct || 0,
        statements: coverage.total?.statements?.pct || 0,
        functions: coverage.total?.functions?.pct || 0,
        branches: coverage.total?.branches?.pct || 0,
        total: coverage.total?.lines?.pct || 0,
      };
    } catch (error) {
      return {
        total: 0,
      };
    }
  }

  private async log(executionId: string, message: string, level: string = 'INFO'): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;

    await prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        logs: {
          push: logEntry,
        },
      },
    });

    if (this.websocket) {
      this.websocket.emit(`execution:${executionId}`, 'log', {
        timestamp,
        level,
        message,
      });
    }

    logger.info(message, { executionId, level });
  }
}

export default QAWorker;
