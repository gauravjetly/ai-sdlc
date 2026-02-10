/**
 * Security Agent
 *
 * AI persona for security tasks
 * Handles vulnerability scanning, compliance checks, secret rotation, and security incident response
 */

import { BaseAgent, BaseAgentConfig } from './base-agent';
import { AgentType, PlatformEvent } from '../orchestration/types/orchestration-types';
import { v4 as uuidv4 } from 'uuid';

export interface SecurityAgentConfig extends BaseAgentConfig {
  complianceStandards?: Array<'CIS' | 'SOC2' | 'GDPR' | 'PCI-DSS'>;
  scanSchedule?: string;
  autoRemediateFindings?: boolean;
  severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Security Agent
 * Specialized in security scanning, compliance, and threat detection
 */
export class SecurityAgent extends BaseAgent {
  private secConfig: SecurityAgentConfig;

  constructor(config: SecurityAgentConfig) {
    super(config);
    this.secConfig = {
      complianceStandards: ['CIS', 'SOC2'],
      scanSchedule: '0 2 * * *', // 2 AM daily
      autoRemediateFindings: false,
      severityThreshold: 'medium',
      ...config
    };
  }

  /**
   * Setup event triggers
   * - security.alert: Respond to security alerts
   * - vulnerability.detected: Handle vulnerability detections
   * - deployment.complete: Run security scans on new deployments
   */
  protected setupEventTriggers(): void {
    // Handle security alerts
    this.registerEventHandler('security.alert', async (event: PlatformEvent) => {
      await this.handleSecurityAlert(event);
    });

    // Handle vulnerability detections
    this.registerEventHandler('security.vulnerability_detected', async (event: PlatformEvent) => {
      await this.handleVulnerabilityDetection(event);
    });

    // Scan deployments
    this.registerEventHandler('deployment.complete', async (event: PlatformEvent) => {
      await this.scanDeployment(event);
    });

    // Handle compliance violations
    this.registerEventHandler('compliance.violation', async (event: PlatformEvent) => {
      await this.handleComplianceViolation(event);
    });
  }

  /**
   * Setup scheduled jobs
   * - Daily vulnerability scans (2 AM)
   * - Weekly compliance checks (Sunday 3 AM)
   * - Monthly secret rotation audit (1st of month, 4 AM)
   */
  protected setupScheduledJobs(): void {
    // Daily vulnerability scans at 2 AM
    this.scheduleJob(
      'vulnerability-scan',
      '0 2 * * *',
      async () => await this.performVulnerabilityScan()
    );

    // Weekly compliance checks (Sunday 3 AM)
    this.scheduleJob(
      'compliance-check',
      '0 3 * * 0',
      async () => await this.performComplianceCheck()
    );

    // Monthly secret rotation audit (1st of month, 4 AM)
    this.scheduleJob(
      'secret-rotation-audit',
      '0 4 1 * *',
      async () => await this.auditSecretRotation()
    );

    // Daily security posture assessment at 5 AM
    this.scheduleJob(
      'security-posture',
      '0 5 * * *',
      async () => await this.assessSecurityPosture()
    );
  }

  /**
   * Execute security agent action
   */
  protected async executeInternal(parameters: any): Promise<any> {
    const { action, ...params } = parameters;

    switch (action) {
      case 'scan_vulnerabilities':
        return await this.scanVulnerabilities(params);
      case 'check_compliance':
        return await this.checkCompliance(params);
      case 'rotate_secrets':
        return await this.rotateSecrets(params);
      case 'audit_access':
        return await this.auditAccess(params);
      case 'investigate_threat':
        return await this.investigateThreat(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Get agent type
   */
  protected getAgentType(): AgentType {
    return AgentType.SECURITY;
  }

  /**
   * Get agent capabilities
   */
  protected getCapabilities(): string[] {
    return [
      'scan_vulnerabilities',
      'check_compliance',
      'rotate_secrets',
      'audit_access',
      'detect_threats',
      'remediate_findings',
      'generate_security_report'
    ];
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Scan for vulnerabilities
   */
  async scanVulnerabilities(params: {
    target: string;
    scanType?: 'vulnerabilities' | 'compliance' | 'secrets' | 'all';
  }): Promise<any> {
    this.logger.info('Scanning for vulnerabilities', params);

    const result = await this.mcpClient.runSecurityScan({
      target: params.target,
      scan_type: params.scanType || 'vulnerabilities'
    });

    this.logger.info('Vulnerability scan complete', {
      target: params.target,
      vulnerabilities_found: result.vulnerabilities_found,
      critical: result.critical_count,
      high: result.high_count,
      medium: result.medium_count,
      low: result.low_count
    });

    // Trigger alerts for critical findings
    if (result.critical_count > 0) {
      await this.eventManager.publishEvent({
        type: 'security.alert',
        timestamp: new Date(),
        data: {
          severity: 'critical',
          message: `${result.critical_count} critical vulnerabilities found in ${params.target}`,
          target: params.target,
          vulnerabilities: result.critical_vulnerabilities
        }
      });
    }

    return result;
  }

  /**
   * Check compliance
   */
  async checkCompliance(params: {
    target: string;
    standards?: Array<'CIS' | 'SOC2' | 'GDPR' | 'PCI-DSS'>;
  }): Promise<any> {
    this.logger.info('Checking compliance', params);

    const result = await this.mcpClient.checkCompliance({
      target: params.target,
      standards: params.standards || this.secConfig.complianceStandards!
    });

    this.logger.info('Compliance check complete', {
      target: params.target,
      compliant: result.compliant,
      violations: result.violations_count,
      standards_checked: result.standards_checked
    });

    // Trigger events for violations
    if (!result.compliant) {
      await this.eventManager.publishEvent({
        type: 'compliance.violation',
        timestamp: new Date(),
        data: {
          target: params.target,
          violations: result.violations,
          standards: result.standards_checked
        }
      });
    }

    return result;
  }

  /**
   * Rotate secrets
   */
  async rotateSecrets(params: {
    secretType?: 'api-keys' | 'passwords' | 'certificates' | 'all';
    force?: boolean;
  }): Promise<any> {
    this.logger.info('Rotating secrets', params);

    const result = await this.mcpClient.callTool('rotate_secrets', {
      secret_type: params.secretType || 'all',
      force: params.force || false
    });

    this.logger.info('Secret rotation complete', {
      secrets_rotated: result.rotated_count,
      failed: result.failed_count
    });

    return result;
  }

  /**
   * Audit access
   */
  async auditAccess(params: {
    resource?: string;
    timeRange?: string;
  }): Promise<any> {
    this.logger.info('Auditing access', params);

    const result = await this.mcpClient.callTool('audit_access', {
      resource: params.resource,
      time_range: params.timeRange || '24h'
    });

    this.logger.info('Access audit complete', {
      total_accesses: result.total_accesses,
      unauthorized_attempts: result.unauthorized_attempts,
      suspicious_activities: result.suspicious_activities
    });

    return result;
  }

  /**
   * Investigate security threat
   */
  async investigateThreat(params: {
    threatId: string;
    source?: string;
  }): Promise<any> {
    this.logger.info('Investigating threat', params);

    // Gather comprehensive threat intelligence
    const investigation = await this.gatherThreatIntelligence(params.threatId, params.source);

    this.logger.info('Threat investigation complete', {
      threatId: params.threatId,
      severity: investigation.severity,
      indicators: investigation.indicators_count
    });

    return investigation;
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Handle security alert
   */
  private async handleSecurityAlert(event: PlatformEvent): Promise<void> {
    const { severity, message, target } = event.data;

    this.logger.error('Security alert received', {
      severity,
      message,
      target
    });

    try {
      // For critical alerts, initiate immediate investigation
      if (severity === 'critical') {
        this.logger.info('Initiating critical threat investigation', {
          target
        });

        const investigation = await this.investigateThreat({
          threatId: event.data.alertId || uuidv4(),
          source: target
        });

        // Attempt automated remediation if enabled
        if (this.secConfig.autoRemediateFindings) {
          await this.attemptRemediation(investigation);
        }
      }

    } catch (error: any) {
      this.logger.error('Failed to handle security alert:', {
        error: error.message,
        severity,
        target
      });
    }
  }

  /**
   * Handle vulnerability detection
   */
  private async handleVulnerabilityDetection(event: PlatformEvent): Promise<void> {
    const { vulnerabilityId, severity, target } = event.data;

    this.logger.warn('Vulnerability detected', {
      vulnerabilityId,
      severity,
      target
    });

    try {
      // Check if severity meets threshold
      const severityLevels = ['low', 'medium', 'high', 'critical'];
      const currentLevel = severityLevels.indexOf(severity);
      const thresholdLevel = severityLevels.indexOf(this.secConfig.severityThreshold!);

      if (currentLevel >= thresholdLevel) {
        this.logger.info('Vulnerability meets threshold, taking action', {
          vulnerabilityId,
          severity,
          threshold: this.secConfig.severityThreshold
        });

        // Log for tracking
        this.logger.info('Vulnerability logged for remediation', {
          vulnerabilityId,
          severity,
          target
        });
      }

    } catch (error: any) {
      this.logger.error('Failed to handle vulnerability detection:', {
        error: error.message,
        vulnerabilityId
      });
    }
  }

  /**
   * Scan deployment for security issues
   */
  private async scanDeployment(event: PlatformEvent): Promise<void> {
    const { deploymentId, application } = event.data;

    this.logger.info('Scanning deployment for security issues', {
      deploymentId,
      application
    });

    try {
      // Wait for deployment to stabilize
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds

      // Run security scan
      const scanResult = await this.scanVulnerabilities({
        target: application,
        scanType: 'all'
      });

      if (scanResult.critical_count > 0 || scanResult.high_count > 0) {
        this.logger.warn('Security issues found in deployment', {
          deploymentId,
          application,
          critical: scanResult.critical_count,
          high: scanResult.high_count
        });
      } else {
        this.logger.info('Deployment security scan passed', {
          deploymentId,
          application
        });
      }

    } catch (error: any) {
      this.logger.error('Failed to scan deployment:', {
        error: error.message,
        deploymentId
      });
    }
  }

  /**
   * Handle compliance violation
   */
  private async handleComplianceViolation(event: PlatformEvent): Promise<void> {
    const { target, violations, standards } = event.data;

    this.logger.error('Compliance violation detected', {
      target,
      violations_count: violations?.length || 0,
      standards
    });

    try {
      // Log violations for remediation
      this.logger.info('Compliance violations logged', {
        target,
        violations,
        standards
      });

    } catch (error: any) {
      this.logger.error('Failed to handle compliance violation:', {
        error: error.message,
        target
      });
    }
  }

  // ============================================
  // Scheduled Tasks
  // ============================================

  /**
   * Perform daily vulnerability scan
   */
  private async performVulnerabilityScan(): Promise<void> {
    this.logger.info('Starting scheduled vulnerability scan');

    try {
      const result = await this.scanVulnerabilities({
        target: 'all',
        scanType: 'vulnerabilities'
      });

      this.logger.info('Scheduled vulnerability scan complete', {
        total_vulnerabilities: result.vulnerabilities_found,
        critical: result.critical_count,
        high: result.high_count
      });

    } catch (error: any) {
      this.logger.error('Scheduled vulnerability scan failed:', {
        error: error.message
      });
    }
  }

  /**
   * Perform weekly compliance check
   */
  private async performComplianceCheck(): Promise<void> {
    this.logger.info('Starting scheduled compliance check');

    try {
      const result = await this.checkCompliance({
        target: 'all',
        standards: this.secConfig.complianceStandards
      });

      this.logger.info('Scheduled compliance check complete', {
        compliant: result.compliant,
        violations: result.violations_count,
        standards: result.standards_checked
      });

    } catch (error: any) {
      this.logger.error('Scheduled compliance check failed:', {
        error: error.message
      });
    }
  }

  /**
   * Audit secret rotation
   */
  private async auditSecretRotation(): Promise<void> {
    this.logger.info('Starting secret rotation audit');

    try {
      const result = await this.mcpClient.callTool('audit_secret_rotation', {});

      if (result.overdue_rotations > 0) {
        this.logger.warn('Overdue secret rotations detected', {
          overdue_count: result.overdue_rotations,
          secrets: result.overdue_secrets
        });

        // Trigger rotations if auto-remediation is enabled
        if (this.secConfig.autoRemediateFindings) {
          await this.rotateSecrets({ force: true });
        }
      } else {
        this.logger.info('Secret rotation audit passed', {
          total_secrets: result.total_secrets,
          last_rotated: result.last_rotation_date
        });
      }

    } catch (error: any) {
      this.logger.error('Secret rotation audit failed:', {
        error: error.message
      });
    }
  }

  /**
   * Assess security posture
   */
  private async assessSecurityPosture(): Promise<void> {
    this.logger.info('Starting security posture assessment');

    try {
      const posture = await this.mcpClient.callTool('assess_security_posture', {});

      this.logger.info('Security posture assessment complete', {
        overall_score: posture.score,
        risk_level: posture.risk_level,
        recommendations: posture.recommendations?.length || 0
      });

      if (posture.risk_level === 'high' || posture.risk_level === 'critical') {
        this.logger.warn('High risk security posture detected', {
          score: posture.score,
          risk_level: posture.risk_level,
          top_risks: posture.top_risks
        });
      }

    } catch (error: any) {
      this.logger.error('Security posture assessment failed:', {
        error: error.message
      });
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Gather threat intelligence
   */
  private async gatherThreatIntelligence(threatId: string, source?: string): Promise<any> {
    const intelligence: any = {
      threatId,
      timestamp: new Date(),
      source,
      severity: 'unknown',
      indicators_count: 0,
      indicators: [],
      recommendations: []
    };

    try {
      // Gather threat indicators
      const indicators = await this.mcpClient.callTool('gather_threat_indicators', {
        threat_id: threatId,
        source
      });

      intelligence.indicators = indicators.indicators;
      intelligence.indicators_count = indicators.count;
      intelligence.severity = indicators.severity;

      // Get threat recommendations
      const recommendations = await this.mcpClient.callTool('get_threat_recommendations', {
        threat_id: threatId,
        severity: intelligence.severity
      });

      intelligence.recommendations = recommendations.actions;

    } catch (error: any) {
      this.logger.error('Failed to gather threat intelligence:', {
        error: error.message,
        threatId
      });
    }

    return intelligence;
  }

  /**
   * Attempt automated remediation
   */
  private async attemptRemediation(investigation: any): Promise<void> {
    this.logger.info('Attempting automated remediation', {
      threatId: investigation.threatId,
      severity: investigation.severity
    });

    try {
      // Execute remediation actions
      for (const recommendation of investigation.recommendations) {
        if (recommendation.automated) {
          this.logger.info('Executing automated remediation', {
            action: recommendation.action
          });

          await this.mcpClient.callTool('execute_security_remediation', {
            action: recommendation.action,
            threat_id: investigation.threatId
          });
        }
      }

    } catch (error: any) {
      this.logger.error('Automated remediation failed:', {
        error: error.message,
        threatId: investigation.threatId
      });
    }
  }
}
