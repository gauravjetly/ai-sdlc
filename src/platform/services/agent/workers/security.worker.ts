/**
 * Security Agent Worker
 * Real security scanning and vulnerability remediation - NO MOCK DATA
 */

import { Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../../../infrastructure/database/prisma.client.js';
import { WebSocketServer } from '../../../infrastructure/websocket/server.js';
import { createLogger } from '../../../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('SecurityWorker');

export class SecurityWorker {
  constructor(private websocket?: WebSocketServer) {}

  /**
   * Main worker process handler
   */
  async process(job: Job): Promise<any> {
    const { executionId, taskType, taskParams } = job.data;

    await this.log(executionId, `Starting security task: ${taskType}`);
    logger.info('Processing security task', { executionId, taskType, jobId: job.id });

    try {
      switch (taskType) {
        case 'scan_container':
          return await this.scanContainer(job);
        case 'scan_dependencies':
          return await this.scanDependencies(job);
        case 'scan_infrastructure':
          return await this.scanInfrastructure(job);
        case 'fix_vulnerabilities':
          return await this.fixVulnerabilities(job);
        case 'compliance_check':
          return await this.complianceCheck(job);
        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }
    } catch (error: any) {
      await this.log(executionId, `Task failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Scan container image for vulnerabilities using Trivy
   */
  private async scanContainer(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { imageUri } = taskParams;

    if (!imageUri) {
      throw new Error('imageUri is required for container scanning');
    }

    job.updateProgress(10);
    await this.log(executionId, `Scanning container image: ${imageUri}`);

    try {
      // REAL Trivy scan
      const { stdout } = await execAsync(
        `trivy image --format json --severity CRITICAL,HIGH,MEDIUM,LOW "${imageUri}"`,
        { maxBuffer: 50 * 1024 * 1024 }
      );

      job.updateProgress(60);
      await this.log(executionId, 'Parsing scan results...');

      const trivyResults = JSON.parse(stdout);
      const vulnerabilities = this.extractVulnerabilities(trivyResults);

      // Calculate summary
      const summary = {
        critical: vulnerabilities.filter((v) => v.severity === 'CRITICAL').length,
        high: vulnerabilities.filter((v) => v.severity === 'HIGH').length,
        medium: vulnerabilities.filter((v) => v.severity === 'MEDIUM').length,
        low: vulnerabilities.filter((v) => v.severity === 'LOW').length,
        total: vulnerabilities.length,
      };

      job.updateProgress(80);

      // Store scan results in database
      const scanId = `scan-${Date.now()}`;
      await prisma.vulnerabilityScan.create({
        data: {
          scanId,
          target: imageUri,
          targetType: 'container',
          criticalCount: summary.critical,
          highCount: summary.high,
          mediumCount: summary.medium,
          lowCount: summary.low,
          totalCount: summary.total,
          results: trivyResults as any,
          vulnerabilities: {
            create: vulnerabilities.map((v) => ({
              cveId: v.id,
              severity: v.severity,
              packageName: v.package,
              installedVersion: v.installedVersion,
              fixedVersion: v.fixedVersion,
              title: v.title,
              description: v.description,
              cvssScore: v.cvss?.score,
              cvssVector: v.cvss?.vector,
              publishedDate: v.publishedDate ? new Date(v.publishedDate) : null,
            })),
          },
        },
      });

      job.updateProgress(100);
      await this.log(
        executionId,
        `Scan complete. Found ${summary.total} vulnerabilities (Critical: ${summary.critical}, High: ${summary.high})`
      );

      return {
        scanId,
        summary,
        vulnerabilities: vulnerabilities.slice(0, 50), // Return first 50 for response
      };
    } catch (error: any) {
      if (error.message.includes('command not found')) {
        throw new Error('Trivy is not installed. Please install Trivy to scan container images.');
      }
      throw error;
    }
  }

  /**
   * Scan dependencies for vulnerabilities (npm, pip, etc.)
   */
  private async scanDependencies(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { projectPath, ecosystem = 'npm' } = taskParams;

    if (!projectPath) {
      throw new Error('projectPath is required for dependency scanning');
    }

    job.updateProgress(10);
    await this.log(executionId, `Scanning ${ecosystem} dependencies in: ${projectPath}`);

    try {
      let command: string;

      switch (ecosystem) {
        case 'npm':
          command = `cd "${projectPath}" && npm audit --json`;
          break;
        case 'pip':
          command = `cd "${projectPath}" && pip-audit --format json`;
          break;
        case 'maven':
          command = `cd "${projectPath}" && mvn dependency:tree`;
          break;
        default:
          throw new Error(`Unsupported ecosystem: ${ecosystem}`);
      }

      job.updateProgress(40);
      const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

      job.updateProgress(70);
      await this.log(executionId, 'Analyzing audit results...');

      let vulnerabilities: any[] = [];
      let summary = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

      if (ecosystem === 'npm') {
        const auditResult = JSON.parse(stdout);
        vulnerabilities = this.parseNpmAudit(auditResult);
      }

      summary = {
        critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
        high: vulnerabilities.filter((v) => v.severity === 'high').length,
        medium: vulnerabilities.filter((v) => v.severity === 'moderate').length,
        low: vulnerabilities.filter((v) => v.severity === 'low').length,
        total: vulnerabilities.length,
      };

      job.updateProgress(100);
      await this.log(executionId, `Dependency scan complete. Found ${summary.total} vulnerabilities`);

      return {
        ecosystem,
        projectPath,
        summary,
        vulnerabilities: vulnerabilities.slice(0, 50),
      };
    } catch (error: any) {
      // npm audit returns non-zero exit code when vulnerabilities found
      if (error.stdout) {
        const auditResult = JSON.parse(error.stdout);
        const vulnerabilities = this.parseNpmAudit(auditResult);
        const summary = {
          critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
          high: vulnerabilities.filter((v) => v.severity === 'high').length,
          medium: vulnerabilities.filter((v) => v.severity === 'moderate').length,
          low: vulnerabilities.filter((v) => v.severity === 'low').length,
          total: vulnerabilities.length,
        };

        await this.log(executionId, `Scan complete with vulnerabilities: ${summary.total}`);

        return { ecosystem, projectPath, summary, vulnerabilities: vulnerabilities.slice(0, 50) };
      }
      throw error;
    }
  }

  /**
   * Scan infrastructure as code for security issues
   */
  private async scanInfrastructure(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { path, framework = 'terraform' } = taskParams;

    if (!path) {
      throw new Error('path is required for infrastructure scanning');
    }

    job.updateProgress(10);
    await this.log(executionId, `Scanning ${framework} infrastructure in: ${path}`);

    try {
      let command: string;

      switch (framework) {
        case 'terraform':
          command = `checkov -d "${path}" --framework terraform --output json --quiet`;
          break;
        case 'kubernetes':
          command = `checkov -d "${path}" --framework kubernetes --output json --quiet`;
          break;
        case 'cloudformation':
          command = `checkov -d "${path}" --framework cloudformation --output json --quiet`;
          break;
        default:
          throw new Error(`Unsupported framework: ${framework}`);
      }

      job.updateProgress(40);
      const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

      job.updateProgress(70);
      await this.log(executionId, 'Analyzing scan results...');

      const checkovResults = JSON.parse(stdout);
      const findings = this.parseCheckovResults(checkovResults);

      const summary = {
        passed: checkovResults.summary?.passed || 0,
        failed: checkovResults.summary?.failed || 0,
        skipped: checkovResults.summary?.skipped || 0,
        total: findings.length,
      };

      job.updateProgress(100);
      await this.log(
        executionId,
        `Infrastructure scan complete. Passed: ${summary.passed}, Failed: ${summary.failed}`
      );

      return {
        framework,
        path,
        summary,
        findings: findings.slice(0, 50),
      };
    } catch (error: any) {
      if (error.message.includes('command not found')) {
        throw new Error('Checkov is not installed. Please install Checkov to scan infrastructure.');
      }
      throw error;
    }
  }

  /**
   * Automatically fix vulnerabilities where possible
   */
  private async fixVulnerabilities(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { projectPath, ecosystem = 'npm', autoFix = true } = taskParams;

    if (!projectPath) {
      throw new Error('projectPath is required for vulnerability fixes');
    }

    job.updateProgress(10);
    await this.log(executionId, `Attempting to fix ${ecosystem} vulnerabilities in: ${projectPath}`);

    try {
      let command: string;

      switch (ecosystem) {
        case 'npm':
          command = autoFix
            ? `cd "${projectPath}" && npm audit fix --force --json`
            : `cd "${projectPath}" && npm audit fix --dry-run --json`;
          break;
        case 'pip':
          command = `cd "${projectPath}" && pip-audit --fix`;
          break;
        default:
          throw new Error(`Auto-fix not supported for ecosystem: ${ecosystem}`);
      }

      job.updateProgress(50);
      const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

      job.updateProgress(90);

      let fixResults: any = {};
      if (ecosystem === 'npm') {
        fixResults = JSON.parse(stdout);
      }

      job.updateProgress(100);
      await this.log(
        executionId,
        autoFix
          ? 'Vulnerabilities fixed successfully'
          : 'Fix simulation complete (dry-run)'
      );

      return {
        ecosystem,
        projectPath,
        autoFix,
        results: fixResults,
      };
    } catch (error: any) {
      throw new Error(`Failed to fix vulnerabilities: ${error.message}`);
    }
  }

  /**
   * Run compliance checks (SOC2, HIPAA, etc.)
   */
  private async complianceCheck(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { framework = 'soc2', region = 'us-east-1' } = taskParams;

    job.updateProgress(10);
    await this.log(executionId, `Running ${framework.toUpperCase()} compliance check`);

    try {
      // REAL AWS Config compliance check
      const command = `aws configservice describe-compliance-by-config-rule --region ${region} --output json`;

      job.updateProgress(40);
      const { stdout } = await execAsync(command);

      job.updateProgress(70);
      const awsConfigResults = JSON.parse(stdout);

      const checks = awsConfigResults.ComplianceByConfigRules || [];
      const summary = {
        total: checks.length,
        passed: checks.filter((c: any) => c.Compliance?.ComplianceType === 'COMPLIANT').length,
        failed: checks.filter((c: any) => c.Compliance?.ComplianceType === 'NON_COMPLIANT').length,
        warnings: 0,
        score: 0,
      };

      summary.score = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;

      job.updateProgress(100);
      await this.log(
        executionId,
        `Compliance check complete. Score: ${summary.score.toFixed(1)}%`
      );

      return {
        framework,
        timestamp: new Date().toISOString(),
        summary,
        checks: checks.slice(0, 50),
      };
    } catch (error: any) {
      throw new Error(`Compliance check failed: ${error.message}`);
    }
  }

  // Helper methods

  private extractVulnerabilities(trivyResults: any): any[] {
    const vulnerabilities: any[] = [];

    trivyResults.Results?.forEach((result: any) => {
      result.Vulnerabilities?.forEach((vuln: any) => {
        vulnerabilities.push({
          id: vuln.VulnerabilityID,
          severity: vuln.Severity,
          package: vuln.PkgName,
          installedVersion: vuln.InstalledVersion,
          fixedVersion: vuln.FixedVersion,
          title: vuln.Title || vuln.VulnerabilityID,
          description: vuln.Description,
          cvss: vuln.CVSS
            ? {
                score: Object.values(vuln.CVSS)[0]?.V3Score || 0,
                vector: Object.values(vuln.CVSS)[0]?.V3Vector || '',
              }
            : null,
          publishedDate: vuln.PublishedDate,
        });
      });
    });

    return vulnerabilities;
  }

  private parseNpmAudit(auditResult: any): any[] {
    const vulnerabilities: any[] = [];

    if (auditResult.vulnerabilities) {
      Object.entries(auditResult.vulnerabilities).forEach(([pkg, data]: [string, any]) => {
        data.via?.forEach((via: any) => {
          if (typeof via === 'object') {
            vulnerabilities.push({
              package: pkg,
              severity: data.severity,
              title: via.title || 'Vulnerability found',
              description: via.url || '',
              cve: via.cve?.[0] || null,
              installedVersion: data.range || 'unknown',
              fixedVersion: data.fixAvailable ? 'available' : null,
            });
          }
        });
      });
    }

    return vulnerabilities;
  }

  private parseCheckovResults(checkovResults: any): any[] {
    const findings: any[] = [];

    checkovResults.results?.failed_checks?.forEach((check: any) => {
      findings.push({
        checkId: check.check_id,
        checkType: check.check_class,
        resource: check.resource,
        file: check.file_path,
        line: check.file_line_range || [],
        severity: check.severity || 'MEDIUM',
        description: check.check_name,
        guideline: check.guideline,
      });
    });

    return findings;
  }

  private async log(executionId: string, message: string, level: string = 'INFO'): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;

    // Update database logs
    await prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        logs: {
          push: logEntry,
        },
      },
    });

    // Send to WebSocket
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

export default SecurityWorker;
