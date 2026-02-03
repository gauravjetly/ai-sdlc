/**
 * DevOps Validation Hook
 * Provides comprehensive validation for DevOps layer configuration
 */

import { useCallback, useMemo } from 'react';
import {
  CICDConfig,
  MonitoringConfig,
  ServiceConnectionConfig,
  LoadBalancerConfig,
  IaCConfig,
  DevOpsLayerData,
  DevOpsValidationResult,
  CostValidationResult,
  ReadinessCheckItem,
  DNSConfig,
  AlarmConfig,
  TerraformModule,
} from '../../../../types/devops';
import { ValidationError, ValidationResult, NetworkLayerData } from '../../../../types/network';

// =============================================
// Validation Helper Functions
// =============================================

const createError = (
  code: string,
  message: string,
  path?: string,
  severity: 'error' | 'warning' | 'info' = 'error',
  fixStep?: number
): ValidationError => ({
  code,
  message,
  path,
  severity,
  fix: fixStep ? { step: fixStep, field: path || '' } : undefined,
});

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidGitUrl = (url: string): boolean => {
  const gitPatterns = [
    /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(?:\.git)?$/,
    /^https:\/\/gitlab\.com\/[\w-]+\/[\w.-]+(?:\.git)?$/,
    /^https:\/\/bitbucket\.org\/[\w-]+\/[\w.-]+(?:\.git)?$/,
    /^git@github\.com:[\w-]+\/[\w.-]+\.git$/,
    /^git@gitlab\.com:[\w-]+\/[\w.-]+\.git$/,
  ];
  return gitPatterns.some((pattern) => pattern.test(url));
};

// =============================================
// CI/CD Validation
// =============================================

const validateSourceControl = (config: CICDConfig['sourceControl']): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!config.repositoryUrl) {
    errors.push(createError('CICD_NO_REPO', 'Repository URL is required', 'sourceControl.repositoryUrl', 'error', 1));
  } else if (!isValidGitUrl(config.repositoryUrl) && !isValidUrl(config.repositoryUrl)) {
    errors.push(createError('CICD_INVALID_REPO', 'Invalid repository URL format', 'sourceControl.repositoryUrl', 'error', 1));
  }

  if (!config.defaultBranch) {
    errors.push(createError('CICD_NO_BRANCH', 'Default branch is required', 'sourceControl.defaultBranch', 'error', 1));
  }

  if (config.branchProtection.enabled && config.branchProtection.requiredReviewers < 1) {
    errors.push(
      createError('CICD_REVIEWERS', 'At least 1 reviewer required when branch protection is enabled', 'sourceControl.branchProtection.requiredReviewers', 'warning', 1)
    );
  }

  return errors;
};

const validateBuildPipeline = (config: CICDConfig['buildPipeline']): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (config.stages.length === 0) {
    errors.push(createError('CICD_NO_STAGES', 'At least one build stage is required', 'buildPipeline.stages', 'error', 1));
  }

  const enabledStages = config.stages.filter((s) => s.enabled);
  if (enabledStages.length === 0) {
    errors.push(createError('CICD_NO_ENABLED_STAGES', 'At least one build stage must be enabled', 'buildPipeline.stages', 'error', 1));
  }

  // Check for circular dependencies
  const stageIds = new Set(config.stages.map((s) => s.id));
  config.stages.forEach((stage) => {
    stage.dependsOn.forEach((dep) => {
      if (!stageIds.has(dep)) {
        errors.push(
          createError('CICD_INVALID_DEP', `Stage "${stage.name}" depends on non-existent stage "${dep}"`, `buildPipeline.stages.${stage.id}`, 'error', 1)
        );
      }
    });
  });

  // Check for test stage
  const hasTestStage = config.stages.some((s) => s.type === 'test' && s.enabled);
  if (!hasTestStage) {
    errors.push(createError('CICD_NO_TEST', 'Pipeline should include a test stage', 'buildPipeline.stages', 'warning', 1));
  }

  // Check for security stage
  const hasSecurityStage = config.stages.some((s) => s.type === 'security' && s.enabled);
  if (!hasSecurityStage) {
    errors.push(createError('CICD_NO_SECURITY', 'Consider adding a security scanning stage', 'buildPipeline.stages', 'info', 1));
  }

  if (config.triggers.length === 0) {
    errors.push(createError('CICD_NO_TRIGGERS', 'At least one build trigger is required', 'buildPipeline.triggers', 'error', 1));
  }

  return errors;
};

const validateDeployment = (config: CICDConfig['deployment']): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!config.healthCheckPath) {
    errors.push(createError('CICD_NO_HEALTHCHECK', 'Health check path is required', 'deployment.healthCheckPath', 'error', 1));
  } else if (!config.healthCheckPath.startsWith('/')) {
    errors.push(createError('CICD_INVALID_HEALTHCHECK', 'Health check path must start with /', 'deployment.healthCheckPath', 'error', 1));
  }

  if (config.healthCheckInterval < 10) {
    errors.push(createError('CICD_SHORT_INTERVAL', 'Health check interval should be at least 10 seconds', 'deployment.healthCheckInterval', 'warning', 1));
  }

  if (config.strategy === 'canary' && (!config.trafficShiftPercentage || config.trafficShiftPercentage <= 0)) {
    errors.push(
      createError('CICD_CANARY_TRAFFIC', 'Canary deployment requires traffic shift percentage', 'deployment.trafficShiftPercentage', 'error', 1)
    );
  }

  if (config.strategy === 'blue-green' && (!config.blueGreenSwitchTimeout || config.blueGreenSwitchTimeout <= 0)) {
    errors.push(
      createError('CICD_BLUEGREEN_TIMEOUT', 'Blue/Green deployment requires switch timeout', 'deployment.blueGreenSwitchTimeout', 'error', 1)
    );
  }

  return errors;
};

const validateTestAutomation = (config: CICDConfig['testAutomation']): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!config.unitTestEnabled && !config.integrationTestEnabled && !config.e2eTestEnabled) {
    errors.push(createError('CICD_NO_TESTS', 'At least one test type should be enabled', 'testAutomation', 'warning', 1));
  }

  if (config.coverageThreshold < 50) {
    errors.push(createError('CICD_LOW_COVERAGE', 'Coverage threshold below 50% is not recommended', 'testAutomation.coverageThreshold', 'warning', 1));
  }

  if (config.coverageThreshold > 100) {
    errors.push(createError('CICD_INVALID_COVERAGE', 'Coverage threshold cannot exceed 100%', 'testAutomation.coverageThreshold', 'error', 1));
  }

  return errors;
};

// =============================================
// Monitoring Validation
// =============================================

const validateLogGroups = (logGroups: MonitoringConfig['logGroups']): ValidationError[] => {
  const errors: ValidationError[] = [];
  const names = new Set<string>();

  logGroups.forEach((lg, index) => {
    if (!lg.name) {
      errors.push(createError('MON_NO_LOGGROUP_NAME', `Log group ${index + 1} requires a name`, `monitoring.logGroups.${lg.id}`, 'error', 2));
    } else if (names.has(lg.name)) {
      errors.push(createError('MON_DUPLICATE_LOGGROUP', `Duplicate log group name: ${lg.name}`, `monitoring.logGroups.${lg.id}`, 'error', 2));
    } else {
      names.add(lg.name);
    }

    if (lg.retentionDays < 1) {
      errors.push(
        createError('MON_INVALID_RETENTION', 'Log retention must be at least 1 day', `monitoring.logGroups.${lg.id}.retentionDays`, 'error', 2)
      );
    }
  });

  return errors;
};

const validateAlarms = (alarms: AlarmConfig[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  const names = new Set<string>();

  alarms.forEach((alarm) => {
    if (!alarm.name) {
      errors.push(createError('MON_NO_ALARM_NAME', 'Alarm name is required', `monitoring.alarms.${alarm.id}`, 'error', 2));
    } else if (names.has(alarm.name)) {
      errors.push(createError('MON_DUPLICATE_ALARM', `Duplicate alarm name: ${alarm.name}`, `monitoring.alarms.${alarm.id}`, 'error', 2));
    } else {
      names.add(alarm.name);
    }

    if (!alarm.metricName) {
      errors.push(createError('MON_NO_METRIC', 'Alarm requires a metric name', `monitoring.alarms.${alarm.id}.metricName`, 'error', 2));
    }

    if (alarm.evaluationPeriods < 1) {
      errors.push(
        createError('MON_INVALID_EVAL', 'Evaluation periods must be at least 1', `monitoring.alarms.${alarm.id}.evaluationPeriods`, 'error', 2)
      );
    }

    if (alarm.enabled && alarm.actions.length === 0) {
      errors.push(createError('MON_NO_ACTIONS', `Alarm "${alarm.name}" has no actions configured`, `monitoring.alarms.${alarm.id}.actions`, 'warning', 2));
    }
  });

  return errors;
};

const validateDashboards = (dashboards: MonitoringConfig['dashboards']): ValidationError[] => {
  const errors: ValidationError[] = [];

  dashboards.forEach((dashboard) => {
    if (!dashboard.name) {
      errors.push(createError('MON_NO_DASHBOARD_NAME', 'Dashboard name is required', `monitoring.dashboards.${dashboard.id}`, 'error', 2));
    }

    if (dashboard.widgets.length === 0) {
      errors.push(createError('MON_EMPTY_DASHBOARD', `Dashboard "${dashboard.name}" has no widgets`, `monitoring.dashboards.${dashboard.id}`, 'warning', 2));
    }
  });

  return errors;
};

// =============================================
// Service Connections Validation
// =============================================

const validateConnections = (connections: ServiceConnectionConfig[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  const connectionKeys = new Set<string>();

  connections.forEach((conn) => {
    const key = `${conn.sourceId}-${conn.targetId}`;
    if (connectionKeys.has(key)) {
      errors.push(createError('CONN_DUPLICATE', `Duplicate connection: ${conn.sourceName} -> ${conn.targetName}`, `connections.${conn.id}`, 'warning', 3));
    } else {
      connectionKeys.add(key);
    }

    if (!conn.sourceId) {
      errors.push(createError('CONN_NO_SOURCE', 'Connection source is required', `connections.${conn.id}.sourceId`, 'error', 3));
    }

    if (!conn.targetId) {
      errors.push(createError('CONN_NO_TARGET', 'Connection target is required', `connections.${conn.id}.targetId`, 'error', 3));
    }

    if (conn.type === 'compute-to-database' && !conn.secretsManagerArn) {
      errors.push(
        createError('CONN_NO_SECRETS', `Connection "${conn.name}" should use Secrets Manager for credentials`, `connections.${conn.id}`, 'warning', 3)
      );
    }
  });

  return errors;
};

const validateLoadBalancers = (loadBalancers: LoadBalancerConfig[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  loadBalancers.forEach((lb) => {
    if (!lb.name) {
      errors.push(createError('LB_NO_NAME', 'Load balancer name is required', `loadBalancers.${lb.id}.name`, 'error', 3));
    }

    if (lb.subnets.length < 2) {
      errors.push(
        createError('LB_FEW_SUBNETS', `Load balancer "${lb.name}" should have at least 2 subnets for high availability`, `loadBalancers.${lb.id}.subnets`, 'warning', 3)
      );
    }

    if (lb.type === 'alb' && lb.securityGroups.length === 0) {
      errors.push(createError('LB_NO_SG', `ALB "${lb.name}" requires at least one security group`, `loadBalancers.${lb.id}.securityGroups`, 'error', 3));
    }

    if (lb.listeners.length === 0) {
      errors.push(createError('LB_NO_LISTENERS', `Load balancer "${lb.name}" has no listeners configured`, `loadBalancers.${lb.id}.listeners`, 'error', 3));
    }

    lb.listeners.forEach((listener) => {
      if (listener.protocol === 'HTTPS' && !listener.certificateArn) {
        errors.push(
          createError('LB_NO_CERT', `HTTPS listener on port ${listener.port} requires a certificate`, `loadBalancers.${lb.id}.listeners.${listener.id}`, 'error', 3)
        );
      }
    });

    if (lb.targetGroups.length === 0) {
      errors.push(createError('LB_NO_TARGETS', `Load balancer "${lb.name}" has no target groups`, `loadBalancers.${lb.id}.targetGroups`, 'error', 3));
    }

    lb.targetGroups.forEach((tg) => {
      if (!tg.healthCheck.enabled) {
        errors.push(
          createError('LB_NO_HEALTHCHECK', `Target group "${tg.name}" should have health checks enabled`, `loadBalancers.${lb.id}.targetGroups.${tg.id}`, 'warning', 3)
        );
      }
    });
  });

  return errors;
};

const validateDNS = (dns: DNSConfig): ValidationError[] => {
  const errors: ValidationError[] = [];

  dns.records.forEach((record) => {
    if (!record.name) {
      errors.push(createError('DNS_NO_NAME', 'DNS record name is required', `dns.records.${record.id}.name`, 'error', 3));
    }

    if (!record.hostedZoneId) {
      errors.push(createError('DNS_NO_ZONE', `DNS record "${record.name}" requires a hosted zone`, `dns.records.${record.id}.hostedZoneId`, 'error', 3));
    }

    if (!record.alias && !record.value) {
      errors.push(createError('DNS_NO_VALUE', `DNS record "${record.name}" requires a value or alias`, `dns.records.${record.id}`, 'error', 3));
    }

    if (record.ttl < 60 && !record.alias) {
      errors.push(createError('DNS_LOW_TTL', `DNS record "${record.name}" has very low TTL (${record.ttl}s)`, `dns.records.${record.id}.ttl`, 'warning', 3));
    }
  });

  return errors;
};

// =============================================
// IaC Validation
// =============================================

const validateStateBackend = (config: IaCConfig['stateBackend']): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (config.type === 'local') {
    errors.push(createError('IAC_LOCAL_STATE', 'Local state backend is not recommended for production', 'iac.stateBackend.type', 'warning', 4));
  }

  if (config.type === 's3') {
    if (!config.bucket) {
      errors.push(createError('IAC_NO_BUCKET', 'S3 state backend requires a bucket name', 'iac.stateBackend.bucket', 'error', 4));
    }
    if (!config.dynamoDbTable) {
      errors.push(createError('IAC_NO_LOCK', 'S3 state backend should use DynamoDB for locking', 'iac.stateBackend.dynamoDbTable', 'warning', 4));
    }
    if (!config.encrypt) {
      errors.push(createError('IAC_NO_ENCRYPT', 'State backend should have encryption enabled', 'iac.stateBackend.encrypt', 'warning', 4));
    }
  }

  return errors;
};

const validateGitOps = (config: IaCConfig['gitOps']): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!config.workflowPath) {
    errors.push(createError('IAC_NO_WORKFLOW', 'GitOps workflow path is required', 'iac.gitOps.workflowPath', 'error', 4));
  }

  if (!config.approvalRequired) {
    errors.push(createError('IAC_NO_APPROVAL', 'Production deployments should require approval', 'iac.gitOps.approvalRequired', 'warning', 4));
  }

  if (config.approvalRequired && config.approvalEnvironments.length === 0) {
    errors.push(createError('IAC_NO_APPROVAL_ENVS', 'Approval environments must be specified', 'iac.gitOps.approvalEnvironments', 'error', 4));
  }

  return errors;
};

const validateWorkspaces = (workspaces: IaCConfig['workspaces']): ValidationError[] => {
  const errors: ValidationError[] = [];
  const names = new Set<string>();

  if (workspaces.length === 0) {
    errors.push(createError('IAC_NO_WORKSPACES', 'At least one workspace is required', 'iac.workspaces', 'error', 4));
  }

  workspaces.forEach((ws) => {
    if (names.has(ws.name)) {
      errors.push(createError('IAC_DUPLICATE_WS', `Duplicate workspace name: ${ws.name}`, `iac.workspaces.${ws.name}`, 'error', 4));
    } else {
      names.add(ws.name);
    }

    if (ws.environment === 'prod' && ws.autoApply) {
      errors.push(createError('IAC_PROD_AUTOAPPLY', 'Production workspace should not have auto-apply enabled', `iac.workspaces.${ws.name}`, 'warning', 4));
    }
  });

  const hasProd = workspaces.some((ws) => ws.environment === 'prod');
  if (!hasProd) {
    errors.push(createError('IAC_NO_PROD', 'Consider adding a production workspace', 'iac.workspaces', 'info', 4));
  }

  return errors;
};

const validateTerraformModules = (modules: TerraformModule[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (modules.length === 0) {
    errors.push(createError('IAC_NO_MODULES', 'No Terraform modules generated', 'iac.modules', 'warning', 4));
  }

  modules.forEach((module) => {
    if (!module.content) {
      errors.push(createError('IAC_EMPTY_MODULE', `Module "${module.name}" has no content`, `iac.modules.${module.name}`, 'error', 4));
    }

    // Check for sensitive variables without default values
    module.variables.forEach((v) => {
      if (v.sensitive && v.default !== undefined) {
        errors.push(
          createError('IAC_SENSITIVE_DEFAULT', `Sensitive variable "${v.name}" should not have a default value`, `iac.modules.${module.name}.variables.${v.name}`, 'warning', 4)
        );
      }
    });
  });

  return errors;
};

// =============================================
// Cost Estimation
// =============================================

const estimateCosts = (
  devopsData: DevOpsLayerData,
  _networkData: NetworkLayerData | null
): CostValidationResult => {
  const costByService: Record<string, number> = {};
  const costByCategory: Record<string, number> = { compute: 0, storage: 0, networking: 0, monitoring: 0 };
  const recommendations: CostValidationResult['recommendations'] = [];

  // Estimate load balancer costs (~$20/month per ALB)
  devopsData.loadBalancers.forEach((lb) => {
    const cost = lb.type === 'alb' ? 22.0 : 20.0;
    costByService[`LoadBalancer-${lb.name}`] = cost;
    costByCategory.networking += cost;
  });

  // Estimate CloudWatch costs (~$0.30 per metric, ~$0.50 per GB logs)
  const alarmCount = devopsData.monitoring.alarms.length;
  const logGroupCount = devopsData.monitoring.logGroups.length;
  const monitoringCost = alarmCount * 0.1 + logGroupCount * 5;
  costByService['CloudWatch'] = monitoringCost;
  costByCategory.monitoring = monitoringCost;

  // Estimate Route53 costs (~$0.50 per hosted zone, $0.40 per million queries)
  const r53Cost = devopsData.dns.hostedZones.length * 0.5 + devopsData.dns.records.length * 0.01;
  costByService['Route53'] = r53Cost;
  costByCategory.networking += r53Cost;

  // Estimate state backend costs
  if (devopsData.iac.stateBackend.type === 's3') {
    costByService['S3-State'] = 1.0;
    costByService['DynamoDB-Lock'] = 1.0;
    costByCategory.storage += 2.0;
  }

  const estimatedMonthlyCost = Object.values(costByService).reduce((a, b) => a + b, 0);

  // Generate recommendations
  if (devopsData.loadBalancers.length > 2) {
    recommendations.push({
      id: 'cost-consolidate-lb',
      type: 'optimization',
      resource: 'Load Balancers',
      description: 'Consider consolidating load balancers to reduce costs',
      potentialSavings: 20 * (devopsData.loadBalancers.length - 2),
      impact: 'medium',
      effort: 'medium',
      action: 'Review load balancer configuration for consolidation opportunities',
    });
  }

  if (devopsData.monitoring.alarms.length > 20) {
    recommendations.push({
      id: 'cost-reduce-alarms',
      type: 'optimization',
      resource: 'CloudWatch Alarms',
      description: 'Consider reducing the number of alarms or using composite alarms',
      potentialSavings: (devopsData.monitoring.alarms.length - 20) * 0.1,
      impact: 'low',
      effort: 'low',
      action: 'Review alarms and consolidate where possible',
    });
  }

  return {
    estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100,
    costByService,
    costByCategory,
    recommendations,
    currency: 'USD',
  };
};

// =============================================
// Readiness Checklist
// =============================================

const generateReadinessChecklist = (
  devopsData: DevOpsLayerData,
  networkData: NetworkLayerData | null
): ReadinessCheckItem[] => {
  const checks: ReadinessCheckItem[] = [];

  // CI/CD Checks
  checks.push({
    id: 'ready-cicd-repo',
    category: 'CI/CD',
    name: 'Source Control Configured',
    status: devopsData.cicd.sourceControl.repositoryUrl ? 'pass' : 'fail',
    message: devopsData.cicd.sourceControl.repositoryUrl
      ? `Connected to ${devopsData.cicd.sourceControl.provider}`
      : 'Repository not configured',
    fixStep: 1,
  });

  checks.push({
    id: 'ready-cicd-pipeline',
    category: 'CI/CD',
    name: 'Build Pipeline Configured',
    status: devopsData.cicd.buildPipeline.stages.filter((s) => s.enabled).length > 0 ? 'pass' : 'fail',
    message: `${devopsData.cicd.buildPipeline.stages.filter((s) => s.enabled).length} stages configured`,
    fixStep: 1,
  });

  checks.push({
    id: 'ready-cicd-tests',
    category: 'CI/CD',
    name: 'Test Automation Enabled',
    status: devopsData.cicd.testAutomation.unitTestEnabled || devopsData.cicd.testAutomation.integrationTestEnabled ? 'pass' : 'warning',
    message: devopsData.cicd.testAutomation.unitTestEnabled ? 'Tests configured' : 'No tests configured',
    fixStep: 1,
  });

  // Monitoring Checks
  checks.push({
    id: 'ready-mon-logs',
    category: 'Monitoring',
    name: 'Log Groups Configured',
    status: devopsData.monitoring.logGroups.length > 0 ? 'pass' : 'warning',
    message: `${devopsData.monitoring.logGroups.length} log groups configured`,
    fixStep: 2,
  });

  checks.push({
    id: 'ready-mon-alarms',
    category: 'Monitoring',
    name: 'Alarms Configured',
    status: devopsData.monitoring.alarms.length > 0 ? 'pass' : 'warning',
    message: `${devopsData.monitoring.alarms.length} alarms configured`,
    fixStep: 2,
  });

  checks.push({
    id: 'ready-mon-dashboard',
    category: 'Monitoring',
    name: 'Dashboard Created',
    status: devopsData.monitoring.dashboards.length > 0 ? 'pass' : 'warning',
    message: devopsData.monitoring.dashboards.length > 0 ? 'Dashboard configured' : 'No dashboards configured',
    fixStep: 2,
  });

  // Connections Checks
  checks.push({
    id: 'ready-conn-lb',
    category: 'Networking',
    name: 'Load Balancer Configured',
    status: devopsData.loadBalancers.length > 0 ? 'pass' : 'warning',
    message: `${devopsData.loadBalancers.length} load balancers configured`,
    fixStep: 3,
  });

  const hasHealthChecks = devopsData.loadBalancers.every((lb) => lb.targetGroups.every((tg) => tg.healthCheck.enabled));
  checks.push({
    id: 'ready-conn-health',
    category: 'Networking',
    name: 'Health Checks Enabled',
    status: devopsData.loadBalancers.length === 0 ? 'not-applicable' : hasHealthChecks ? 'pass' : 'warning',
    message: hasHealthChecks ? 'All target groups have health checks' : 'Some target groups missing health checks',
    fixStep: 3,
  });

  // IaC Checks
  checks.push({
    id: 'ready-iac-state',
    category: 'Infrastructure',
    name: 'State Backend Configured',
    status: devopsData.iac.stateBackend.type !== 'local' ? 'pass' : 'warning',
    message: `Using ${devopsData.iac.stateBackend.type} backend`,
    fixStep: 4,
  });

  checks.push({
    id: 'ready-iac-encrypt',
    category: 'Infrastructure',
    name: 'State Encryption Enabled',
    status: devopsData.iac.stateBackend.encrypt ? 'pass' : 'warning',
    message: devopsData.iac.stateBackend.encrypt ? 'Encryption enabled' : 'Encryption not enabled',
    fixStep: 4,
  });

  checks.push({
    id: 'ready-iac-approval',
    category: 'Infrastructure',
    name: 'Production Approval Required',
    status: devopsData.iac.gitOps.approvalRequired ? 'pass' : 'warning',
    message: devopsData.iac.gitOps.approvalRequired ? 'Approval gates configured' : 'No approval gates',
    fixStep: 4,
  });

  // Security Checks
  checks.push({
    id: 'ready-sec-branch',
    category: 'Security',
    name: 'Branch Protection Enabled',
    status: devopsData.cicd.sourceControl.branchProtection.enabled ? 'pass' : 'warning',
    message: devopsData.cicd.sourceControl.branchProtection.enabled ? 'Branch protection configured' : 'No branch protection',
    fixStep: 1,
  });

  const usesSecretsManager = devopsData.connections.every((c) => c.type !== 'compute-to-database' || c.secretsManagerArn);
  checks.push({
    id: 'ready-sec-secrets',
    category: 'Security',
    name: 'Secrets Managed Securely',
    status: devopsData.connections.length === 0 ? 'not-applicable' : usesSecretsManager ? 'pass' : 'warning',
    message: usesSecretsManager ? 'Using Secrets Manager' : 'Some connections not using Secrets Manager',
    fixStep: 3,
  });

  // Network Integration Check
  checks.push({
    id: 'ready-net-vpc',
    category: 'Network',
    name: 'Network Layer Complete',
    status: networkData && networkData.vpc?.name ? 'pass' : 'fail',
    message: networkData?.vpc?.name ? `VPC: ${networkData.vpc.name}` : 'Network layer not configured',
  });

  return checks;
};

// =============================================
// Main Hook
// =============================================

export interface UseDevOpsValidationResult {
  // Full validation
  validate: (devopsData: DevOpsLayerData, networkData: NetworkLayerData | null) => DevOpsValidationResult;

  // Component-level validation
  validateCICDConfig: (config: CICDConfig) => ValidationError[];
  validateMonitoringConfig: (config: MonitoringConfig) => ValidationError[];
  validateConnectionsConfig: (connections: ServiceConnectionConfig[]) => ValidationError[];
  validateLoadBalancerConfig: (loadBalancers: LoadBalancerConfig[]) => ValidationError[];
  validateDNSConfig: (dns: DNSConfig) => ValidationError[];
  validateIaCConfig: (config: IaCConfig) => ValidationError[];

  // Cost estimation
  estimateCosts: (devopsData: DevOpsLayerData, networkData: NetworkLayerData | null) => CostValidationResult;

  // Readiness check
  generateReadinessChecklist: (devopsData: DevOpsLayerData, networkData: NetworkLayerData | null) => ReadinessCheckItem[];

  // Error helpers
  getErrorsForPath: (errors: ValidationError[], pathPrefix: string) => ValidationError[];
  hasErrorsForPath: (errors: ValidationError[], pathPrefix: string) => boolean;
  getErrorsForStep: (errors: ValidationError[], step: number) => ValidationError[];
}

export function useDevOpsValidation(): UseDevOpsValidationResult {
  // CI/CD Validation
  const validateCICDConfig = useCallback((config: CICDConfig): ValidationError[] => {
    return [
      ...validateSourceControl(config.sourceControl),
      ...validateBuildPipeline(config.buildPipeline),
      ...validateDeployment(config.deployment),
      ...validateTestAutomation(config.testAutomation),
    ];
  }, []);

  // Monitoring Validation
  const validateMonitoringConfig = useCallback((config: MonitoringConfig): ValidationError[] => {
    return [...validateLogGroups(config.logGroups), ...validateAlarms(config.alarms), ...validateDashboards(config.dashboards)];
  }, []);

  // Connections Validation
  const validateConnectionsConfig = useCallback((connections: ServiceConnectionConfig[]): ValidationError[] => {
    return validateConnections(connections);
  }, []);

  // Load Balancer Validation
  const validateLoadBalancerConfig = useCallback((loadBalancers: LoadBalancerConfig[]): ValidationError[] => {
    return validateLoadBalancers(loadBalancers);
  }, []);

  // DNS Validation
  const validateDNSConfig = useCallback((dns: DNSConfig): ValidationError[] => {
    return validateDNS(dns);
  }, []);

  // IaC Validation
  const validateIaCConfig = useCallback((config: IaCConfig): ValidationError[] => {
    return [
      ...validateStateBackend(config.stateBackend),
      ...validateGitOps(config.gitOps),
      ...validateWorkspaces(config.workspaces),
      ...validateTerraformModules(config.modules),
    ];
  }, []);

  // Full validation
  const validate = useCallback(
    (devopsData: DevOpsLayerData, networkData: NetworkLayerData | null): DevOpsValidationResult => {
      const cicdErrors = validateCICDConfig(devopsData.cicd);
      const monitoringErrors = validateMonitoringConfig(devopsData.monitoring);
      const connectionErrors = [
        ...validateConnectionsConfig(devopsData.connections),
        ...validateLoadBalancerConfig(devopsData.loadBalancers),
        ...validateDNSConfig(devopsData.dns),
      ];
      const iacErrors = validateIaCConfig(devopsData.iac);

      const allErrors = [...cicdErrors, ...monitoringErrors, ...connectionErrors, ...iacErrors];
      const errors = allErrors.filter((e) => e.severity === 'error');
      const warnings = allErrors.filter((e) => e.severity === 'warning');
      const info = allErrors.filter((e) => e.severity === 'info');

      // Network validation (if data available)
      const networkValidation: ValidationResult = networkData
        ? {
            isValid: Boolean(networkData.vpc?.name && networkData.subnets?.length > 0),
            errors: networkData.vpc?.name ? [] : [createError('NET_INCOMPLETE', 'Network layer not complete')],
            warnings: [],
            info: [],
          }
        : { isValid: false, errors: [createError('NET_MISSING', 'Network layer data not available')], warnings: [], info: [] };

      // Platform validation placeholder
      const platformValidation: ValidationResult = { isValid: true, errors: [], warnings: [], info: [] };

      // Connection-specific validation
      const connectionValidation: ValidationResult = {
        isValid: connectionErrors.filter((e) => e.severity === 'error').length === 0,
        errors: connectionErrors.filter((e) => e.severity === 'error'),
        warnings: connectionErrors.filter((e) => e.severity === 'warning'),
        info: connectionErrors.filter((e) => e.severity === 'info'),
      };

      // Security validation
      const securityErrors: ValidationError[] = [];
      if (!devopsData.cicd.sourceControl.branchProtection.enabled) {
        securityErrors.push(createError('SEC_NO_BRANCH_PROTECTION', 'Branch protection not enabled', undefined, 'warning'));
      }
      if (!devopsData.iac.stateBackend.encrypt) {
        securityErrors.push(createError('SEC_STATE_NOT_ENCRYPTED', 'Terraform state not encrypted', undefined, 'warning'));
      }

      const securityValidation: ValidationResult = {
        isValid: securityErrors.filter((e) => e.severity === 'error').length === 0,
        errors: securityErrors.filter((e) => e.severity === 'error'),
        warnings: securityErrors.filter((e) => e.severity === 'warning'),
        info: [],
      };

      // Terraform validation
      const terraformErrors = validateTerraformModules(devopsData.iac.modules);
      const terraformValidation: ValidationResult = {
        isValid: terraformErrors.filter((e) => e.severity === 'error').length === 0,
        errors: terraformErrors.filter((e) => e.severity === 'error'),
        warnings: terraformErrors.filter((e) => e.severity === 'warning'),
        info: [],
      };

      // Cost estimation
      const costValidation = estimateCosts(devopsData, networkData);

      // Readiness checklist
      const readinessChecklist = generateReadinessChecklist(devopsData, networkData);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        info,
        networkValidation,
        platformValidation,
        connectionValidation,
        securityValidation,
        terraformValidation,
        costValidation,
        readinessChecklist,
      };
    },
    [validateCICDConfig, validateMonitoringConfig, validateConnectionsConfig, validateLoadBalancerConfig, validateDNSConfig, validateIaCConfig]
  );

  // Error helpers
  const getErrorsForPath = useCallback((errors: ValidationError[], pathPrefix: string): ValidationError[] => {
    return errors.filter((e) => e.path?.startsWith(pathPrefix) || false);
  }, []);

  const hasErrorsForPath = useCallback((errors: ValidationError[], pathPrefix: string): boolean => {
    return errors.some((e) => e.path?.startsWith(pathPrefix) || false);
  }, []);

  const getErrorsForStep = useCallback((errors: ValidationError[], step: number): ValidationError[] => {
    return errors.filter((e) => e.fix?.step === step);
  }, []);

  return useMemo(
    () => ({
      validate,
      validateCICDConfig,
      validateMonitoringConfig,
      validateConnectionsConfig,
      validateLoadBalancerConfig,
      validateDNSConfig,
      validateIaCConfig,
      estimateCosts,
      generateReadinessChecklist,
      getErrorsForPath,
      hasErrorsForPath,
      getErrorsForStep,
    }),
    [
      validate,
      validateCICDConfig,
      validateMonitoringConfig,
      validateConnectionsConfig,
      validateLoadBalancerConfig,
      validateDNSConfig,
      validateIaCConfig,
      getErrorsForPath,
      hasErrorsForPath,
      getErrorsForStep,
    ]
  );
}

export default useDevOpsValidation;
