/**
 * Security Baseline Template
 * AWS security services baseline with detection, compliance, and encryption
 */

import type { TemplateDefinition } from './types';
import {
  createGuardDutyNode,
  createSecurityHubNode,
  createCloudTrailNode,
  createKMSKeyNode,
  createS3BucketNode,
  createSNSTopicNode,
  createIAMRoleNode,
  createLambdaFunctionNode,
  createEventBridgeNode,
  createCloudWatchAlarmNode,
} from './utils/node-factory';
import { createEdge } from './utils/edge-factory';

export function createSecurityBaselineTemplate(): TemplateDefinition {
  // GuardDuty for threat detection
  const guardDuty = createGuardDutyNode('threat-detection', { x: 100, y: 150 }, {
    findingPublishingFrequency: 'FIFTEEN_MINUTES',
  });

  // Security Hub for compliance
  const securityHub = createSecurityHubNode('compliance-hub', { x: 380, y: 150 }, {
    enabledStandards: [
      'arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0',
      'arn:aws:securityhub:::ruleset/aws-foundational-security-best-practices/v/1.0.0',
    ],
  });

  // CloudTrail for audit logging
  const cloudTrail = createCloudTrailNode('audit-trail', { x: 660, y: 150 }, {
    isMultiRegionTrail: true,
    enableLogFileValidation: true,
    includeGlobalServiceEvents: true,
  });

  // KMS Keys for encryption
  const dataKey = createKMSKeyNode('data-encryption-key', { x: 100, y: 350 }, {
    alias: 'alias/data-encryption',
    description: 'KMS key for data encryption at rest',
    enableKeyRotation: true,
  });

  const secretsKey = createKMSKeyNode('secrets-encryption-key', { x: 280, y: 350 }, {
    alias: 'alias/secrets-encryption',
    description: 'KMS key for secrets encryption',
    enableKeyRotation: true,
  });

  const logsKey = createKMSKeyNode('logs-encryption-key', { x: 460, y: 350 }, {
    alias: 'alias/logs-encryption',
    description: 'KMS key for log encryption',
    enableKeyRotation: true,
  });

  // S3 Buckets for security logs
  const cloudTrailBucket = createS3BucketNode('cloudtrail-logs', { x: 660, y: 350 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'aws:kms' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  const securityFindingsBucket = createS3BucketNode('security-findings', { x: 840, y: 350 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'aws:kms' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // SNS Topics for alerts
  const criticalAlerts = createSNSTopicNode('critical-security-alerts', { x: 940, y: 150 }, {
    displayName: 'Critical Security Alerts',
    fifoTopic: false,
  });

  const highAlerts = createSNSTopicNode('high-security-alerts', { x: 940, y: 280 }, {
    displayName: 'High Severity Alerts',
    fifoTopic: false,
  });

  // Lambda for automated response
  const remediationLambda = createLambdaFunctionNode('security-remediation', { x: 280, y: 500 }, {
    runtime: 'python3.11',
    handler: 'remediation.handler',
    memorySize: 256,
    timeout: 300,
    description: 'Automated security finding remediation',
  });

  const findingsProcessor = createLambdaFunctionNode('findings-processor', { x: 560, y: 500 }, {
    runtime: 'python3.11',
    handler: 'processor.handler',
    memorySize: 256,
    timeout: 60,
    description: 'Process and enrich security findings',
  });

  // EventBridge Rules for security events
  const guardDutyRule = createEventBridgeNode('guardduty-findings', { x: 100, y: 0 }, {
    description: 'Route GuardDuty findings',
    eventPattern: JSON.stringify({
      source: ['aws.guardduty'],
      'detail-type': ['GuardDuty Finding'],
    }),
  });

  const securityHubRule = createEventBridgeNode('securityhub-findings', { x: 380, y: 0 }, {
    description: 'Route Security Hub findings',
    eventPattern: JSON.stringify({
      source: ['aws.securityhub'],
      'detail-type': ['Security Hub Findings - Imported'],
    }),
  });

  // IAM Roles
  const remediationRole = createIAMRoleNode('security-remediation-role', { x: 100, y: 500 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'lambda.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    ],
    description: 'IAM role for security remediation Lambda',
  });

  const securityAuditorRole = createIAMRoleNode('security-auditor-role', { x: 840, y: 500 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: 'arn:aws:iam::${AWS_ACCOUNT_ID}:root' },
        Action: 'sts:AssumeRole',
        Condition: { Bool: { 'aws:MultiFactorAuthPresent': 'true' } },
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/SecurityAudit',
      'arn:aws:iam::aws:policy/AWSSecurityHubReadOnlyAccess',
    ],
    description: 'IAM role for security auditors (requires MFA)',
  });

  // CloudWatch Alarms
  const rootLoginAlarm = createCloudWatchAlarmNode('root-login-alarm', { x: 660, y: 0 }, {
    metricName: 'RootAccountUsage',
    namespace: 'CloudTrailMetrics',
    statistic: 'Sum',
    period: 300,
    threshold: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    evaluationPeriods: 1,
  });

  const unauthorizedApiAlarm = createCloudWatchAlarmNode('unauthorized-api-alarm', { x: 840, y: 0 }, {
    metricName: 'UnauthorizedAttempts',
    namespace: 'CloudTrailMetrics',
    statistic: 'Sum',
    period: 300,
    threshold: 10,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 1,
  });

  const nodes = [
    guardDuty, securityHub, cloudTrail,
    dataKey, secretsKey, logsKey,
    cloudTrailBucket, securityFindingsBucket,
    criticalAlerts, highAlerts,
    remediationLambda, findingsProcessor,
    guardDutyRule, securityHubRule,
    remediationRole, securityAuditorRole,
    rootLoginAlarm, unauthorizedApiAlarm,
  ];

  const edges = [
    // GuardDuty -> Security Hub
    createEdge(guardDuty.id, securityHub.id, { label: 'findings', animated: true }),
    // CloudTrail -> S3
    createEdge(cloudTrail.id, cloudTrailBucket.id, { label: 'logs' }),
    // KMS -> Buckets
    createEdge(logsKey.id, cloudTrailBucket.id, { label: 'encrypts' }),
    createEdge(logsKey.id, securityFindingsBucket.id, { label: 'encrypts' }),
    // EventBridge routing
    createEdge(guardDutyRule.id, findingsProcessor.id, { label: 'triggers', animated: true }),
    createEdge(securityHubRule.id, findingsProcessor.id, { label: 'triggers', animated: true }),
    createEdge(guardDutyRule.id, remediationLambda.id, { label: 'triggers', animated: true }),
    // Lambda -> S3
    createEdge(findingsProcessor.id, securityFindingsBucket.id, { label: 'writes' }),
    // Alarms -> SNS
    createEdge(rootLoginAlarm.id, criticalAlerts.id, { label: 'alerts', animated: true }),
    createEdge(unauthorizedApiAlarm.id, highAlerts.id, { label: 'alerts', animated: true }),
    // GuardDuty -> SNS (critical findings)
    createEdge(guardDuty.id, criticalAlerts.id, { label: 'critical' }),
    // IAM Roles
    createEdge(remediationRole.id, remediationLambda.id, { label: 'role' }),
    createEdge(remediationRole.id, findingsProcessor.id, { label: 'role' }),
  ];

  return {
    name: 'Security Baseline',
    description: 'Comprehensive AWS security services baseline implementing defense in depth. Includes GuardDuty for intelligent threat detection, Security Hub for centralized security findings and compliance scoring (CIS Benchmarks, AWS Best Practices), CloudTrail for complete API audit logging, KMS for encryption key management, and automated incident response with Lambda. Designed to meet SOC2, HIPAA, and PCI-DSS requirements.',
    category: 'security',
    visibility: 'public',
    layerType: 'devops',
    version: '1.0.0',
    tags: ['security', 'compliance', 'guardduty', 'security-hub', 'cloudtrail', 'kms', 'soc2', 'hipaa', 'pci-dss'],
    templateData: {
      nodes,
      edges,
      metadata: {
        author: 'Vintiq Catalyst Team',
        version: '1.0.0',
        tested: true,
        compliance: ['SOC2', 'HIPAA', 'PCI-DSS', 'CIS Benchmarks', 'AWS Best Practices'],
        estimatedCost: {
          dev: 50,
          staging: 75,
          prod: 100,
          currency: 'USD',
        },
        prerequisites: [
          'AWS Account with Organizations (for multi-account)',
          'Email addresses for security alert notifications',
          'Security team contact information',
          'Incident response playbooks documented',
        ],
        customizationGuide: 'Enable additional Security Hub standards based on compliance requirements. Configure GuardDuty member accounts for multi-account environments. Adjust CloudTrail data events for specific S3 buckets or Lambda functions. Customize automated remediation Lambda for your specific response actions.',
        deploymentTime: '10-15 minutes',
        components: [
          { type: 'GuardDuty', count: 1, description: 'Threat detection with ML' },
          { type: 'Security Hub', count: 1, description: 'Compliance and findings aggregation' },
          { type: 'CloudTrail', count: 1, description: 'Multi-region API audit logging' },
          { type: 'KMS Keys', count: 3, description: 'Data, Secrets, and Logs encryption' },
          { type: 'S3 Buckets', count: 2, description: 'CloudTrail logs and security findings' },
          { type: 'SNS Topics', count: 2, description: 'Critical and High severity alerts' },
          { type: 'Lambda Functions', count: 2, description: 'Remediation and findings processor' },
          { type: 'EventBridge Rules', count: 2, description: 'GuardDuty and Security Hub routing' },
          { type: 'IAM Roles', count: 2, description: 'Remediation and Auditor roles' },
          { type: 'CloudWatch Alarms', count: 2, description: 'Root login and unauthorized API' },
        ],
      },
    },
  };
}
