/**
 * Security Scan Service
 * Real Trivy container scanning and npm audit - NO MOCK DATA
 */

import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.client.js';
import { createLogger } from '../../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('SecurityScan');

export interface ScanConfig {
  target: string;
  targetType: 'container' | 'filesystem' | 'repository';
  createdBy?: string;
}

export interface ScanResult {
  scanId: string;
  target: string;
  targetType: string;
  scannedAt: Date;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCount: number;
  vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
  cveId?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  packageName: string;
  installedVersion: string;
  fixedVersion?: string;
  title: string;
  description?: string;
  cvssScore?: number;
  cvssVector?: string;
  publishedDate?: Date;
}

export interface DependencyScanResult {
  scanId: string;
  target: string;
  vulnerabilities: Vulnerability[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export class SecurityScanService {
  constructor() {
    logger.info('Security Scan Service initialized');
  }

  /**
   * Scan container image with Trivy
   * REAL SCAN - executes trivy command
   */
  async scanContainer(config: ScanConfig): Promise<ScanResult> {
    if (config.targetType !== 'container') {
      throw new Error('Target type must be "container" for this method');
    }

    const scanId = uuidv4();

    try {
      logger.info('Starting container scan', { scanId, target: config.target });

      // Check if Trivy is installed
      try {
        await execAsync('which trivy');
      } catch (error) {
        throw new Error('Trivy is not installed. Please install it: https://aquasecurity.github.io/trivy/');
      }

      // Run Trivy scan with JSON output
      const command = `trivy image --format json --severity CRITICAL,HIGH,MEDIUM,LOW "${config.target}"`;

      logger.debug('Executing Trivy scan', { command });

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr) {
        logger.warn('Trivy stderr output', { stderr });
      }

      // Parse Trivy JSON output
      const trivyResults = JSON.parse(stdout);
      const vulnerabilities = this.parseTrivyResults(trivyResults);

      // Calculate severity counts
      const criticalCount = vulnerabilities.filter((v) => v.severity === 'CRITICAL').length;
      const highCount = vulnerabilities.filter((v) => v.severity === 'HIGH').length;
      const mediumCount = vulnerabilities.filter((v) => v.severity === 'MEDIUM').length;
      const lowCount = vulnerabilities.filter((v) => v.severity === 'LOW').length;
      const totalCount = vulnerabilities.length;

      // Save to database
      await prisma.vulnerabilityScan.create({
        data: {
          id: scanId,
          scanId,
          target: config.target,
          targetType: config.targetType,
          criticalCount,
          highCount,
          mediumCount,
          lowCount,
          totalCount,
          results: trivyResults as any,
          createdBy: config.createdBy,
          vulnerabilities: {
            create: vulnerabilities.map((v) => ({
              cveId: v.cveId,
              severity: v.severity,
              packageName: v.packageName,
              installedVersion: v.installedVersion,
              fixedVersion: v.fixedVersion,
              title: v.title,
              description: v.description,
              cvssScore: v.cvssScore,
              cvssVector: v.cvssVector,
              publishedDate: v.publishedDate,
            })),
          },
        },
      });

      logger.info('Container scan completed', {
        scanId,
        totalVulnerabilities: totalCount,
        critical: criticalCount,
        high: highCount,
      });

      return {
        scanId,
        target: config.target,
        targetType: config.targetType,
        scannedAt: new Date(),
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        totalCount,
        vulnerabilities,
      };
    } catch (error: any) {
      logger.error('Container scan failed', { scanId, error: error.message });
      throw new Error(`Container scan failed: ${error.message}`);
    }
  }

  /**
   * Scan filesystem with Trivy
   * REAL SCAN - executes trivy filesystem command
   */
  async scanFilesystem(config: ScanConfig): Promise<ScanResult> {
    if (config.targetType !== 'filesystem') {
      throw new Error('Target type must be "filesystem" for this method');
    }

    const scanId = uuidv4();

    try {
      logger.info('Starting filesystem scan', { scanId, target: config.target });

      // Check if Trivy is installed
      try {
        await execAsync('which trivy');
      } catch (error) {
        throw new Error('Trivy is not installed. Please install it: https://aquasecurity.github.io/trivy/');
      }

      const command = `trivy filesystem --format json --severity CRITICAL,HIGH,MEDIUM,LOW "${config.target}"`;

      logger.debug('Executing Trivy filesystem scan', { command });

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr) {
        logger.warn('Trivy stderr output', { stderr });
      }

      const trivyResults = JSON.parse(stdout);
      const vulnerabilities = this.parseTrivyResults(trivyResults);

      const criticalCount = vulnerabilities.filter((v) => v.severity === 'CRITICAL').length;
      const highCount = vulnerabilities.filter((v) => v.severity === 'HIGH').length;
      const mediumCount = vulnerabilities.filter((v) => v.severity === 'MEDIUM').length;
      const lowCount = vulnerabilities.filter((v) => v.severity === 'LOW').length;
      const totalCount = vulnerabilities.length;

      await prisma.vulnerabilityScan.create({
        data: {
          id: scanId,
          scanId,
          target: config.target,
          targetType: config.targetType,
          criticalCount,
          highCount,
          mediumCount,
          lowCount,
          totalCount,
          results: trivyResults as any,
          createdBy: config.createdBy,
          vulnerabilities: {
            create: vulnerabilities.map((v) => ({
              cveId: v.cveId,
              severity: v.severity,
              packageName: v.packageName,
              installedVersion: v.installedVersion,
              fixedVersion: v.fixedVersion,
              title: v.title,
              description: v.description,
              cvssScore: v.cvssScore,
              cvssVector: v.cvssVector,
              publishedDate: v.publishedDate,
            })),
          },
        },
      });

      logger.info('Filesystem scan completed', { scanId, totalVulnerabilities: totalCount });

      return {
        scanId,
        target: config.target,
        targetType: config.targetType,
        scannedAt: new Date(),
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        totalCount,
        vulnerabilities,
      };
    } catch (error: any) {
      logger.error('Filesystem scan failed', { scanId, error: error.message });
      throw new Error(`Filesystem scan failed: ${error.message}`);
    }
  }

  /**
   * Scan npm dependencies
   * REAL SCAN - executes npm audit command
   */
  async scanNpmDependencies(projectPath: string, createdBy?: string): Promise<DependencyScanResult> {
    const scanId = uuidv4();
    const target = `${projectPath}/package.json`;

    try {
      logger.info('Starting npm audit scan', { scanId, projectPath });

      // Run npm audit with JSON output
      const command = `cd "${projectPath}" && npm audit --json`;

      logger.debug('Executing npm audit', { command });

      let auditResults: any;
      try {
        const { stdout } = await execAsync(command, {
          maxBuffer: 10 * 1024 * 1024,
        });
        auditResults = JSON.parse(stdout);
      } catch (error: any) {
        // npm audit exits with non-zero code if vulnerabilities found
        // Parse the output anyway
        if (error.stdout) {
          auditResults = JSON.parse(error.stdout);
        } else {
          throw error;
        }
      }

      // Parse npm audit results
      const vulnerabilities = this.parseNpmAuditResults(auditResults);

      const criticalCount = vulnerabilities.filter((v) => v.severity === 'CRITICAL').length;
      const highCount = vulnerabilities.filter((v) => v.severity === 'HIGH').length;
      const mediumCount = vulnerabilities.filter((v) => v.severity === 'MEDIUM').length;
      const lowCount = vulnerabilities.filter((v) => v.severity === 'LOW').length;
      const totalCount = vulnerabilities.length;

      // Save to database
      await prisma.vulnerabilityScan.create({
        data: {
          id: scanId,
          scanId,
          target,
          targetType: 'repository',
          criticalCount,
          highCount,
          mediumCount,
          lowCount,
          totalCount,
          results: auditResults as any,
          createdBy,
          vulnerabilities: {
            create: vulnerabilities.map((v) => ({
              cveId: v.cveId,
              severity: v.severity,
              packageName: v.packageName,
              installedVersion: v.installedVersion,
              fixedVersion: v.fixedVersion,
              title: v.title,
              description: v.description,
              cvssScore: v.cvssScore,
              cvssVector: v.cvssVector,
              publishedDate: v.publishedDate,
            })),
          },
        },
      });

      logger.info('npm audit scan completed', { scanId, totalVulnerabilities: totalCount });

      return {
        scanId,
        target,
        vulnerabilities,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
      };
    } catch (error: any) {
      logger.error('npm audit scan failed', { scanId, error: error.message });
      throw new Error(`npm audit scan failed: ${error.message}`);
    }
  }

  /**
   * Get scan results by ID
   */
  async getScanResults(scanId: string): Promise<ScanResult> {
    const scan = await prisma.vulnerabilityScan.findUnique({
      where: { scanId },
      include: {
        vulnerabilities: true,
      },
    });

    if (!scan) {
      throw new Error(`Scan not found: ${scanId}`);
    }

    return {
      scanId: scan.scanId,
      target: scan.target,
      targetType: scan.targetType,
      scannedAt: scan.scannedAt,
      criticalCount: scan.criticalCount,
      highCount: scan.highCount,
      mediumCount: scan.mediumCount,
      lowCount: scan.lowCount,
      totalCount: scan.totalCount,
      vulnerabilities: scan.vulnerabilities.map((v) => ({
        cveId: v.cveId || undefined,
        severity: v.severity as any,
        packageName: v.packageName,
        installedVersion: v.installedVersion,
        fixedVersion: v.fixedVersion || undefined,
        title: v.title,
        description: v.description || undefined,
        cvssScore: v.cvssScore || undefined,
        cvssVector: v.cvssVector || undefined,
        publishedDate: v.publishedDate || undefined,
      })),
    };
  }

  /**
   * List scans with filters
   */
  async listScans(filters?: {
    targetType?: 'container' | 'filesystem' | 'repository';
    target?: string;
    limit?: number;
  }): Promise<ScanResult[]> {
    const where: any = {};

    if (filters?.targetType) where.targetType = filters.targetType;
    if (filters?.target) where.target = { contains: filters.target };

    const scans = await prisma.vulnerabilityScan.findMany({
      where,
      include: {
        vulnerabilities: true,
      },
      orderBy: { scannedAt: 'desc' },
      take: filters?.limit || 50,
    });

    return scans.map((scan) => ({
      scanId: scan.scanId,
      target: scan.target,
      targetType: scan.targetType,
      scannedAt: scan.scannedAt,
      criticalCount: scan.criticalCount,
      highCount: scan.highCount,
      mediumCount: scan.mediumCount,
      lowCount: scan.lowCount,
      totalCount: scan.totalCount,
      vulnerabilities: scan.vulnerabilities.map((v) => ({
        cveId: v.cveId || undefined,
        severity: v.severity as any,
        packageName: v.packageName,
        installedVersion: v.installedVersion,
        fixedVersion: v.fixedVersion || undefined,
        title: v.title,
        description: v.description || undefined,
        cvssScore: v.cvssScore || undefined,
        cvssVector: v.cvssVector || undefined,
        publishedDate: v.publishedDate || undefined,
      })),
    }));
  }

  // Helper methods

  private parseTrivyResults(trivyResults: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    if (!trivyResults.Results) return vulnerabilities;

    for (const result of trivyResults.Results) {
      if (!result.Vulnerabilities) continue;

      for (const vuln of result.Vulnerabilities) {
        vulnerabilities.push({
          cveId: vuln.VulnerabilityID,
          severity: this.mapSeverity(vuln.Severity),
          packageName: vuln.PkgName,
          installedVersion: vuln.InstalledVersion,
          fixedVersion: vuln.FixedVersion,
          title: vuln.Title || vuln.VulnerabilityID,
          description: vuln.Description,
          cvssScore: vuln.CVSS?.nvd?.V3Score || vuln.CVSS?.redhat?.V3Score,
          cvssVector: vuln.CVSS?.nvd?.V3Vector || vuln.CVSS?.redhat?.V3Vector,
          publishedDate: vuln.PublishedDate ? new Date(vuln.PublishedDate) : undefined,
        });
      }
    }

    return vulnerabilities;
  }

  private parseNpmAuditResults(auditResults: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    if (!auditResults.vulnerabilities) return vulnerabilities;

    for (const [packageName, vulnData] of Object.entries(auditResults.vulnerabilities as any)) {
      if (!vulnData) continue;

      const vuln = vulnData as any;
      const via = Array.isArray(vuln.via) ? vuln.via[0] : undefined;

      vulnerabilities.push({
        cveId: via?.cve || undefined,
        severity: this.mapNpmSeverity(vuln.severity || 'unknown'),
        packageName,
        installedVersion: vuln.range || 'unknown',
        fixedVersion: vuln.fixAvailable?.version || undefined,
        title: via?.title || `Vulnerability in ${packageName}`,
        description: via?.url || undefined,
        cvssScore: via?.cvss?.score || undefined,
        cvssVector: via?.cvss?.vectorString || undefined,
        publishedDate: undefined,
      });
    }

    return vulnerabilities;
  }

  private mapSeverity(severity: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' {
    const normalized = severity?.toUpperCase();
    if (['CRITICAL'].includes(normalized)) return 'CRITICAL';
    if (['HIGH'].includes(normalized)) return 'HIGH';
    if (['MEDIUM'].includes(normalized)) return 'MEDIUM';
    if (['LOW'].includes(normalized)) return 'LOW';
    return 'UNKNOWN';
  }

  private mapNpmSeverity(severity: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' {
    const normalized = severity?.toLowerCase();
    if (['critical'].includes(normalized)) return 'CRITICAL';
    if (['high'].includes(normalized)) return 'HIGH';
    if (['moderate', 'medium'].includes(normalized)) return 'MEDIUM';
    if (['low'].includes(normalized)) return 'LOW';
    return 'UNKNOWN';
  }
}

export default SecurityScanService;
