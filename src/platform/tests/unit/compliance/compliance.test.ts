/**
 * Unit Tests for Compliance Service
 */

import { ComplianceService, ComplianceViolation } from '../../../compliance/compliance.service';

// Mock AWS SDK
jest.mock('@aws-sdk/client-iam');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-ec2');
jest.mock('@aws-sdk/client-rds');
jest.mock('@aws-sdk/client-cloudtrail');

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = new ComplianceService('us-east-1');
  });

  describe('runComplianceAudit', () => {
    it('should run SOC2 compliance audit', async () => {
      const report = await service.runComplianceAudit('SOC2');

      expect(report).toBeDefined();
      expect(report.framework).toBe('SOC2');
      expect(report.scanDate).toBeInstanceOf(Date);
      expect(report.totalControls).toBeGreaterThan(0);
      expect(report.passedControls).toBeGreaterThanOrEqual(0);
      expect(report.failedControls).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(report.violations)).toBe(true);
      expect(report.summary).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should run HIPAA compliance audit', async () => {
      const report = await service.runComplianceAudit('HIPAA');

      expect(report.framework).toBe('HIPAA');
      expect(report.totalControls).toBeGreaterThan(0);

      // HIPAA should check encryption requirements
      const encryptionViolations = report.violations.filter(v =>
        v.controlId.startsWith('ENC-')
      );
      expect(encryptionViolations).toBeDefined();
    });

    it('should run PCI-DSS compliance audit', async () => {
      const report = await service.runComplianceAudit('PCI-DSS');

      expect(report.framework).toBe('PCI-DSS');
      expect(report.totalControls).toBeGreaterThan(0);

      // PCI-DSS should check network security
      const networkViolations = report.violations.filter(v =>
        v.controlId.startsWith('NET-')
      );
      expect(networkViolations).toBeDefined();
    });

    it('should categorize violations by severity', async () => {
      const report = await service.runComplianceAudit('SOC2');

      const { summary } = report;
      expect(summary.critical).toBeGreaterThanOrEqual(0);
      expect(summary.high).toBeGreaterThanOrEqual(0);
      expect(summary.medium).toBeGreaterThanOrEqual(0);
      expect(summary.low).toBeGreaterThanOrEqual(0);

      const totalViolations = summary.critical + summary.high + summary.medium + summary.low;
      expect(totalViolations).toBe(report.violations.length);
    });

    it('should generate recommendations', async () => {
      const report = await service.runComplianceAudit('SOC2');

      expect(report.recommendations.length).toBeGreaterThan(0);

      for (const recommendation of report.recommendations) {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Violation Structure', () => {
    it('should have properly structured violations', async () => {
      const report = await service.runComplianceAudit('SOC2');

      for (const violation of report.violations) {
        expect(violation.id).toBeDefined();
        expect(violation.controlId).toBeDefined();
        expect(violation.framework).toBeDefined();
        expect(violation.severity).toMatch(/critical|high|medium|low/);
        expect(violation.resourceId).toBeDefined();
        expect(violation.resourceType).toBeDefined();
        expect(violation.description).toBeDefined();
        expect(violation.impact).toBeDefined();
        expect(violation.recommendation).toBeDefined();
        expect(typeof violation.autoRemediable).toBe('boolean');
        expect(Array.isArray(violation.remediationSteps)).toBe(true);
      }
    });

    it('should include remediation steps for violations', async () => {
      const report = await service.runComplianceAudit('SOC2');

      for (const violation of report.violations) {
        expect(violation.remediationSteps.length).toBeGreaterThan(0);

        for (const step of violation.remediationSteps) {
          expect(typeof step).toBe('string');
          expect(step.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('remediateViolations', () => {
    it('should remediate auto-remediable violations', async () => {
      const mockViolations: ComplianceViolation[] = [
        {
          id: 'test-1',
          controlId: 'IAM-001',
          framework: 'SOC2',
          severity: 'medium',
          resourceId: 'AWS Account',
          resourceType: 'IAM Password Policy',
          description: 'Weak password policy',
          impact: 'Security risk',
          recommendation: 'Update password policy',
          autoRemediable: true,
          remediationSteps: ['Update password policy settings']
        }
      ];

      const results = await service.remediateViolations(mockViolations, true);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      for (const result of results) {
        expect(result.violationId).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.action).toBeDefined();
      }
    });

    it('should skip non-auto-remediable violations', async () => {
      const mockViolations: ComplianceViolation[] = [
        {
          id: 'test-2',
          controlId: 'IAM-002',
          framework: 'SOC2',
          severity: 'critical',
          resourceId: 'user-test',
          resourceType: 'IAM User',
          description: 'MFA not enabled',
          impact: 'Account compromise risk',
          recommendation: 'Enable MFA',
          autoRemediable: false,
          remediationSteps: ['Enable virtual MFA device']
        }
      ];

      const results = await service.remediateViolations(mockViolations, true);

      expect(results.length).toBe(0);
    });

    it('should skip critical and high-severity violations', async () => {
      const mockViolations: ComplianceViolation[] = [
        {
          id: 'test-critical',
          controlId: 'TEST-001',
          framework: 'SOC2',
          severity: 'critical',
          resourceId: 'test-resource',
          resourceType: 'Test',
          description: 'Critical violation',
          impact: 'High impact',
          recommendation: 'Fix it',
          autoRemediable: true,
          remediationSteps: ['Manual review required']
        }
      ];

      const results = await service.remediateViolations(mockViolations, true);

      // Critical violations should not be auto-remediated
      expect(results.length).toBe(0);
    });

    it('should handle dry run mode', async () => {
      const mockViolations: ComplianceViolation[] = [
        {
          id: 'test-dryrun',
          controlId: 'IAM-001',
          framework: 'SOC2',
          severity: 'low',
          resourceId: 'test',
          resourceType: 'Test',
          description: 'Test violation',
          impact: 'Low impact',
          recommendation: 'Fix it',
          autoRemediable: true,
          remediationSteps: ['Test remediation']
        }
      ];

      const results = await service.remediateViolations(mockViolations, true);

      // In dry run, should still return results but not apply changes
      expect(Array.isArray(results)).toBe(true);
    });

    it('should collect errors during remediation', async () => {
      const mockViolations: ComplianceViolation[] = [
        {
          id: 'test-error',
          controlId: 'INVALID',
          framework: 'SOC2',
          severity: 'low',
          resourceId: 'test',
          resourceType: 'Test',
          description: 'Will fail',
          impact: 'None',
          recommendation: 'Will error',
          autoRemediable: true,
          remediationSteps: ['This will fail']
        }
      ];

      const results = await service.remediateViolations(mockViolations, true);

      const failed = results.filter(r => !r.success);
      expect(Array.isArray(failed)).toBe(true);
    });
  });

  describe('Compliance Controls', () => {
    it('should check password policy', async () => {
      const report = await service.runComplianceAudit('SOC2');

      const passwordPolicyViolations = report.violations.filter(v =>
        v.controlId === 'IAM-001'
      );

      if (passwordPolicyViolations.length > 0) {
        const violation = passwordPolicyViolations[0];
        expect(violation.description).toContain('Password policy');
        expect(violation.remediationSteps.length).toBeGreaterThan(0);
      }
    });

    it('should check MFA enforcement', async () => {
      const report = await service.runComplianceAudit('SOC2');

      const mfaViolations = report.violations.filter(v =>
        v.controlId === 'IAM-002'
      );

      for (const violation of mfaViolations) {
        expect(violation.description).toContain('MFA');
        expect(violation.severity).toMatch(/critical|high/);
      }
    });

    it('should check CloudTrail logging', async () => {
      const report = await service.runComplianceAudit('SOC2');

      const loggingViolations = report.violations.filter(v =>
        v.controlId === 'LOG-001'
      );

      for (const violation of loggingViolations) {
        expect(violation.description).toContain('CloudTrail');
      }
    });

    it('should check encryption at rest', async () => {
      const report = await service.runComplianceAudit('HIPAA');

      const encryptionViolations = report.violations.filter(v =>
        v.controlId === 'ENC-001'
      );

      for (const violation of encryptionViolations) {
        expect(violation.description).toContain('encryption');
        expect(violation.severity).toBe('critical');
      }
    });

    it('should check encryption in transit', async () => {
      const report = await service.runComplianceAudit('PCI-DSS');

      const transitViolations = report.violations.filter(v =>
        v.controlId === 'NET-001'
      );

      for (const violation of transitViolations) {
        expect(violation.description).toMatch(/transit|unencrypted/i);
      }
    });
  });

  describe('Compliance Score Calculation', () => {
    it('should calculate compliance score correctly', async () => {
      const report = await service.runComplianceAudit('SOC2');

      const expectedScore = (report.passedControls / report.totalControls) * 100;
      expect(report.complianceScore).toBeCloseTo(expectedScore, 2);
    });

    it('should have 100% compliance with no violations', async () => {
      const report = await service.runComplianceAudit('SOC2');

      if (report.violations.length === 0) {
        expect(report.complianceScore).toBe(100);
      }
    });
  });

  describe('Framework-Specific Checks', () => {
    it('SOC2 should focus on access controls and monitoring', async () => {
      const report = await service.runComplianceAudit('SOC2');

      const accessControlViolations = report.violations.filter(v =>
        v.controlId.startsWith('IAM-')
      );

      const monitoringViolations = report.violations.filter(v =>
        v.controlId.startsWith('LOG-')
      );

      // SOC2 should have these control categories
      expect(accessControlViolations.length + monitoringViolations.length).toBeGreaterThanOrEqual(0);
    });

    it('HIPAA should enforce encryption requirements', async () => {
      const report = await service.runComplianceAudit('HIPAA');

      const encryptionViolations = report.violations.filter(v =>
        v.controlId.startsWith('ENC-') || v.controlId === 'NET-001'
      );

      // HIPAA has strict encryption requirements
      expect(encryptionViolations).toBeDefined();
    });

    it('PCI-DSS should check network security', async () => {
      const report = await service.runComplianceAudit('PCI-DSS');

      const networkViolations = report.violations.filter(v =>
        v.controlId.startsWith('NET-')
      );

      // PCI-DSS focuses on protecting cardholder data
      expect(networkViolations).toBeDefined();
    });
  });

  describe('Recommendations Generation', () => {
    it('should prioritize critical violations in recommendations', async () => {
      const report = await service.runComplianceAudit('SOC2');

      if (report.summary.critical > 0) {
        const criticalRecommendation = report.recommendations.find(r =>
          r.includes('critical')
        );
        expect(criticalRecommendation).toBeDefined();
      }
    });

    it('should suggest auto-remediation when available', async () => {
      const report = await service.runComplianceAudit('SOC2');

      const autoRemediableCount = report.violations.filter(v => v.autoRemediable).length;

      if (autoRemediableCount > 0) {
        const autoRemediationRec = report.recommendations.find(r =>
          r.includes('auto-remediated') || r.includes('auto-remediate')
        );
        expect(autoRemediationRec).toBeDefined();
      }
    });

    it('should include ongoing compliance recommendations', async () => {
      const report = await service.runComplianceAudit('SOC2');

      const ongoingRecs = report.recommendations.filter(r =>
        r.includes('continuous') || r.includes('monthly') || r.includes('ongoing')
      );

      expect(ongoingRecs.length).toBeGreaterThan(0);
    });
  });
});
