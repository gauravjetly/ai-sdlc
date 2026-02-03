/**
 * DevOps Layer Type Definitions
 * Types for CI/CD, Monitoring, Service Connections, and Infrastructure as Code
 */

import { Tag, ValidationError, ValidationResult } from './network';

// =============================================
// CI/CD Configuration
// =============================================

export type SourceControlProvider = 'github' | 'gitlab' | 'bitbucket';
export type BuildEnvironment = 'nodejs' | 'python' | 'go' | 'java' | 'dotnet';
export type ArtifactStorage = 's3' | 'ecr' | 'artifactory' | 'nexus';
export type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary';
export type BuildTrigger = 'push' | 'pull_request' | 'schedule' | 'manual';

export interface SourceControlConfig {
  provider: SourceControlProvider;
  repositoryUrl: string;
  defaultBranch: string;
  productionBranch: string;
  webhookEnabled: boolean;
  branchProtection: BranchProtectionConfig;
}

export interface BranchProtectionConfig {
  enabled: boolean;
  requireReviews: boolean;
  requiredReviewers: number;
  requireStatusChecks: boolean;
  statusChecks: string[];
}

export interface BuildStage {
  id: string;
  name: string;
  type: 'lint' | 'test' | 'build' | 'deploy' | 'security' | 'custom';
  environment: BuildEnvironment;
  commands: string[];
  timeout: number;
  dependsOn: string[];
  enabled: boolean;
}

export interface BuildPipelineConfig {
  stages: BuildStage[];
  environment: BuildEnvironment;
  environmentVersion: string;
  artifactStorage: ArtifactStorage;
  artifactBucket?: string;
  cachingEnabled: boolean;
  cacheKey: string;
  triggers: BuildTrigger[];
}

export interface DeploymentConfig {
  strategy: DeploymentStrategy;
  healthCheckPath: string;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  rollbackOnFailure: boolean;
  rollbackThreshold: number;
  trafficShiftPercentage?: number;
  blueGreenSwitchTimeout?: number;
  minHealthyPercent: number;
  maxHealthyPercent: number;
}

export interface TestAutomationConfig {
  unitTestEnabled: boolean;
  integrationTestEnabled: boolean;
  e2eTestEnabled: boolean;
  coverageThreshold: number;
  testReportFormat: 'junit' | 'html' | 'json';
  failOnCoverageThreshold: boolean;
}

export interface CICDConfig {
  sourceControl: SourceControlConfig;
  buildPipeline: BuildPipelineConfig;
  deployment: DeploymentConfig;
  testAutomation: TestAutomationConfig;
}

// =============================================
// Monitoring Configuration
// =============================================

export interface LogGroupConfig {
  id: string;
  name: string;
  serviceName: string;
  retentionDays: number;
  tags: Tag[];
}

export interface MetricFilterConfig {
  id: string;
  name: string;
  logGroupId: string;
  filterPattern: string;
  metricName: string;
  metricNamespace: string;
  metricValue: string;
}

export type AlarmStatistic = 'Average' | 'Sum' | 'Minimum' | 'Maximum' | 'SampleCount' | 'p99' | 'p95' | 'p90';
export type AlarmComparison = 'GreaterThanThreshold' | 'LessThanThreshold' | 'GreaterThanOrEqualToThreshold' | 'LessThanOrEqualToThreshold';

export interface AlarmConfig {
  id: string;
  name: string;
  description: string;
  metricName: string;
  metricNamespace: string;
  statistic: AlarmStatistic;
  period: number;
  evaluationPeriods: number;
  threshold: number;
  comparisonOperator: AlarmComparison;
  actions: AlarmAction[];
  enabled: boolean;
}

export interface AlarmAction {
  type: 'sns' | 'lambda' | 'autoscaling';
  targetArn: string;
  description?: string;
}

export interface TracingConfig {
  enabled: boolean;
  samplingRate: number;
  serviceMapEnabled: boolean;
}

export type DashboardWidgetType = 'metric' | 'log' | 'alarm' | 'text' | 'explorer';

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  properties: Record<string, unknown>;
}

export interface DashboardConfig {
  id: string;
  name: string;
  widgets: DashboardWidget[];
}

export interface MonitoringConfig {
  logGroups: LogGroupConfig[];
  metricFilters: MetricFilterConfig[];
  alarms: AlarmConfig[];
  tracing: TracingConfig;
  dashboards: DashboardConfig[];
}

// =============================================
// Service Connections
// =============================================

export type ConnectionType =
  | 'compute-to-database'
  | 'compute-to-cache'
  | 'compute-to-queue'
  | 'load-balancer'
  | 'api-gateway'
  | 'dns'
  | 'service-mesh';

export interface ServiceConnectionConfig {
  id: string;
  name: string;
  type: ConnectionType;
  sourceId: string;
  sourceType: string;
  sourceName: string;
  targetId: string;
  targetType: string;
  targetName: string;
  securityGroupId?: string;
  port?: number;
  protocol?: string;
  secretsManagerArn?: string;
  config: Record<string, unknown>;
}

export type LoadBalancerType = 'alb' | 'nlb';
export type LoadBalancerScheme = 'internet-facing' | 'internal';

export interface LoadBalancerConfig {
  id: string;
  name: string;
  type: LoadBalancerType;
  scheme: LoadBalancerScheme;
  subnets: string[];
  securityGroups: string[];
  listeners: ListenerConfig[];
  targetGroups: TargetGroupConfig[];
  accessLogs?: {
    enabled: boolean;
    bucket: string;
    prefix: string;
  };
  tags: Tag[];
}

export type ListenerProtocol = 'HTTP' | 'HTTPS' | 'TCP' | 'TLS';
export type ListenerActionType = 'forward' | 'redirect' | 'fixed-response';

export interface ListenerConfig {
  id: string;
  port: number;
  protocol: ListenerProtocol;
  certificateArn?: string;
  sslPolicy?: string;
  defaultAction: {
    type: ListenerActionType;
    targetGroupId?: string;
    redirectConfig?: {
      protocol: string;
      port: string;
      statusCode: string;
    };
  };
  rules: ListenerRule[];
}

export interface ListenerRule {
  id: string;
  priority: number;
  conditions: ListenerRuleCondition[];
  action: {
    type: ListenerActionType;
    targetGroupId?: string;
  };
}

export interface ListenerRuleCondition {
  type: 'path' | 'host' | 'header' | 'query-string';
  field?: string;
  values: string[];
}

export type TargetType = 'instance' | 'ip' | 'lambda';

export interface TargetGroupConfig {
  id: string;
  name: string;
  port: number;
  protocol: ListenerProtocol;
  targetType: TargetType;
  vpcId?: string;
  healthCheck: HealthCheckConfig;
  targets: string[];
  stickiness?: {
    enabled: boolean;
    type: 'lb_cookie' | 'app_cookie';
    duration: number;
  };
}

export interface HealthCheckConfig {
  enabled: boolean;
  path: string;
  port: string;
  protocol: ListenerProtocol;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  matcher?: string;
}

export interface DNSConfig {
  hostedZones: HostedZoneConfig[];
  records: DNSRecordConfig[];
}

export interface HostedZoneConfig {
  id: string;
  name: string;
  isPrivate: boolean;
  vpcId?: string;
  comment?: string;
  tags: Tag[];
}

export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA';
export type RoutingPolicy = 'simple' | 'weighted' | 'latency' | 'failover' | 'geolocation';

export interface DNSRecordConfig {
  id: string;
  name: string;
  type: DNSRecordType;
  hostedZoneId: string;
  value: string;
  ttl: number;
  alias?: {
    targetHostedZoneId: string;
    dnsName: string;
    evaluateTargetHealth: boolean;
  };
  routingPolicy?: RoutingPolicy;
  weight?: number;
  setIdentifier?: string;
}

// =============================================
// Infrastructure as Code
// =============================================

export type IaCProvider = 'terraform' | 'pulumi' | 'cloudformation';
export type GitOpsProvider = 'github-actions' | 'gitlab-ci' | 'azure-devops' | 'jenkins';
export type StateBackend = 's3' | 'terraform-cloud' | 'gcs' | 'azurerm' | 'local';

export interface TerraformModule {
  name: string;
  path: string;
  version: string;
  source: 'local' | 'registry' | 'git';
  variables: TerraformVariable[];
  outputs: TerraformOutput[];
  content: string;
  dependencies: string[];
}

export interface TerraformVariable {
  name: string;
  type: string;
  description: string;
  default?: unknown;
  sensitive: boolean;
  validation?: {
    condition: string;
    errorMessage: string;
  };
}

export interface TerraformOutput {
  name: string;
  description: string;
  value: string;
  sensitive: boolean;
}

export interface StateBackendConfig {
  type: StateBackend;
  bucket?: string;
  key?: string;
  region?: string;
  dynamoDbTable?: string;
  encrypt: boolean;
  workspaceKeyPrefix?: string;
}

export interface GitOpsConfig {
  provider: GitOpsProvider;
  workflowPath: string;
  approvalRequired: boolean;
  approvalEnvironments: string[];
  driftDetection: boolean;
  driftSchedule: string;
  planOnPR: boolean;
  applyOnMerge: boolean;
}

export interface WorkspaceConfig {
  name: string;
  environment: 'dev' | 'staging' | 'prod';
  variables: Record<string, string>;
  tfvarsFile: string;
  autoApply: boolean;
}

export interface IaCConfig {
  provider: IaCProvider;
  terraformVersion: string;
  modules: TerraformModule[];
  stateBackend: StateBackendConfig;
  gitOps: GitOpsConfig;
  workspaces: WorkspaceConfig[];
  requiredProviders: RequiredProvider[];
}

export interface RequiredProvider {
  name: string;
  source: string;
  version: string;
}

// =============================================
// Validation
// =============================================

export interface DevOpsValidationResult extends ValidationResult {
  networkValidation: ValidationResult;
  platformValidation: ValidationResult;
  connectionValidation: ValidationResult;
  securityValidation: ValidationResult;
  terraformValidation: ValidationResult;
  costValidation: CostValidationResult;
  readinessChecklist: ReadinessCheckItem[];
}

export interface CostValidationResult {
  estimatedMonthlyCost: number;
  costByService: Record<string, number>;
  costByCategory: Record<string, number>;
  recommendations: CostRecommendation[];
  currency: string;
}

export type CostRecommendationType = 'rightsizing' | 'reserved' | 'spot' | 'optimization' | 'cleanup';
export type CostImpact = 'low' | 'medium' | 'high';

export interface CostRecommendation {
  id: string;
  type: CostRecommendationType;
  resource: string;
  description: string;
  potentialSavings: number;
  impact: CostImpact;
  effort: CostImpact;
  action: string;
}

export type ReadinessStatus = 'pass' | 'fail' | 'warning' | 'not-applicable' | 'pending';

export interface ReadinessCheckItem {
  id: string;
  category: string;
  name: string;
  status: ReadinessStatus;
  message: string;
  details?: string;
  fixStep?: number;
}

// =============================================
// Complete DevOps Layer Data
// =============================================

export interface DevOpsLayerData {
  cicd: CICDConfig;
  monitoring: MonitoringConfig;
  connections: ServiceConnectionConfig[];
  loadBalancers: LoadBalancerConfig[];
  dns: DNSConfig;
  iac: IaCConfig;
  validation?: DevOpsValidationResult;
}

// =============================================
// Constants
// =============================================

export const DEFAULT_BUILD_STAGES: BuildStage[] = [
  {
    id: 'lint',
    name: 'Lint',
    type: 'lint',
    environment: 'nodejs',
    commands: ['npm run lint'],
    timeout: 300,
    dependsOn: [],
    enabled: true,
  },
  {
    id: 'test',
    name: 'Test',
    type: 'test',
    environment: 'nodejs',
    commands: ['npm run test'],
    timeout: 600,
    dependsOn: ['lint'],
    enabled: true,
  },
  {
    id: 'build',
    name: 'Build',
    type: 'build',
    environment: 'nodejs',
    commands: ['npm run build'],
    timeout: 600,
    dependsOn: ['test'],
    enabled: true,
  },
  {
    id: 'deploy',
    name: 'Deploy',
    type: 'deploy',
    environment: 'nodejs',
    commands: ['npm run deploy'],
    timeout: 900,
    dependsOn: ['build'],
    enabled: true,
  },
];

export const DEFAULT_CICD_CONFIG: CICDConfig = {
  sourceControl: {
    provider: 'github',
    repositoryUrl: '',
    defaultBranch: 'main',
    productionBranch: 'main',
    webhookEnabled: true,
    branchProtection: {
      enabled: true,
      requireReviews: true,
      requiredReviewers: 1,
      requireStatusChecks: true,
      statusChecks: ['ci'],
    },
  },
  buildPipeline: {
    stages: [...DEFAULT_BUILD_STAGES],
    environment: 'nodejs',
    environmentVersion: '20',
    artifactStorage: 'ecr',
    cachingEnabled: true,
    cacheKey: 'npm-cache-${{ hashFiles("package-lock.json") }}',
    triggers: ['push', 'pull_request'],
  },
  deployment: {
    strategy: 'rolling',
    healthCheckPath: '/health',
    healthCheckInterval: 30,
    healthCheckTimeout: 5,
    rollbackOnFailure: true,
    rollbackThreshold: 3,
    minHealthyPercent: 50,
    maxHealthyPercent: 200,
  },
  testAutomation: {
    unitTestEnabled: true,
    integrationTestEnabled: true,
    e2eTestEnabled: false,
    coverageThreshold: 80,
    testReportFormat: 'junit',
    failOnCoverageThreshold: true,
  },
};

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  logGroups: [],
  metricFilters: [],
  alarms: [],
  tracing: {
    enabled: false,
    samplingRate: 0.05,
    serviceMapEnabled: false,
  },
  dashboards: [],
};

export const DEFAULT_DNS_CONFIG: DNSConfig = {
  hostedZones: [],
  records: [],
};

export const DEFAULT_IAC_CONFIG: IaCConfig = {
  provider: 'terraform',
  terraformVersion: '1.7',
  modules: [],
  stateBackend: {
    type: 's3',
    encrypt: true,
  },
  gitOps: {
    provider: 'github-actions',
    workflowPath: '.github/workflows/terraform.yml',
    approvalRequired: true,
    approvalEnvironments: ['prod'],
    driftDetection: false,
    driftSchedule: '0 0 * * *',
    planOnPR: true,
    applyOnMerge: true,
  },
  workspaces: [
    { name: 'dev', environment: 'dev', variables: {}, tfvarsFile: 'dev.tfvars', autoApply: true },
    { name: 'staging', environment: 'staging', variables: {}, tfvarsFile: 'staging.tfvars', autoApply: false },
    { name: 'prod', environment: 'prod', variables: {}, tfvarsFile: 'prod.tfvars', autoApply: false },
  ],
  requiredProviders: [
    { name: 'aws', source: 'hashicorp/aws', version: '~> 5.0' },
  ],
};

export const DEFAULT_DEVOPS_LAYER_DATA: DevOpsLayerData = {
  cicd: DEFAULT_CICD_CONFIG,
  monitoring: DEFAULT_MONITORING_CONFIG,
  connections: [],
  loadBalancers: [],
  dns: DEFAULT_DNS_CONFIG,
  iac: DEFAULT_IAC_CONFIG,
};

export const DEPLOYMENT_STRATEGIES: { value: DeploymentStrategy; label: string; description: string }[] = [
  { value: 'rolling', label: 'Rolling Update', description: 'Gradually replace instances with new version' },
  { value: 'blue-green', label: 'Blue/Green', description: 'Run two environments, switch traffic instantly' },
  { value: 'canary', label: 'Canary', description: 'Gradually shift traffic to new version' },
];

export const BUILD_ENVIRONMENTS: { value: BuildEnvironment; label: string; versions: string[] }[] = [
  { value: 'nodejs', label: 'Node.js', versions: ['18', '20', '22'] },
  { value: 'python', label: 'Python', versions: ['3.9', '3.10', '3.11', '3.12'] },
  { value: 'go', label: 'Go', versions: ['1.21', '1.22', '1.23'] },
  { value: 'java', label: 'Java', versions: ['11', '17', '21'] },
  { value: 'dotnet', label: '.NET', versions: ['6', '7', '8'] },
];

export const SOURCE_CONTROL_PROVIDERS: { value: SourceControlProvider; label: string; icon: string }[] = [
  { value: 'github', label: 'GitHub', icon: 'github' },
  { value: 'gitlab', label: 'GitLab', icon: 'gitlab' },
  { value: 'bitbucket', label: 'Bitbucket', icon: 'bitbucket' },
];

export const ALARM_PRESETS: { metric: string; namespace: string; threshold: number; unit: string; comparison: AlarmComparison }[] = [
  { metric: 'CPUUtilization', namespace: 'AWS/ECS', threshold: 80, unit: '%', comparison: 'GreaterThanThreshold' },
  { metric: 'MemoryUtilization', namespace: 'AWS/ECS', threshold: 80, unit: '%', comparison: 'GreaterThanThreshold' },
  { metric: 'RequestCount', namespace: 'AWS/ApplicationELB', threshold: 1000, unit: 'Count', comparison: 'GreaterThanThreshold' },
  { metric: 'HTTPCode_Target_5XX_Count', namespace: 'AWS/ApplicationELB', threshold: 10, unit: 'Count', comparison: 'GreaterThanThreshold' },
  { metric: 'TargetResponseTime', namespace: 'AWS/ApplicationELB', threshold: 1, unit: 'Seconds', comparison: 'GreaterThanThreshold' },
  { metric: 'DatabaseConnections', namespace: 'AWS/RDS', threshold: 100, unit: 'Count', comparison: 'GreaterThanThreshold' },
];

export const LOG_RETENTION_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
  { value: 365, label: '1 year' },
  { value: 730, label: '2 years' },
];

export const GITOPS_PROVIDERS: { value: GitOpsProvider; label: string }[] = [
  { value: 'github-actions', label: 'GitHub Actions' },
  { value: 'gitlab-ci', label: 'GitLab CI' },
  { value: 'azure-devops', label: 'Azure DevOps' },
  { value: 'jenkins', label: 'Jenkins' },
];

export const STATE_BACKENDS: { value: StateBackend; label: string; description: string }[] = [
  { value: 's3', label: 'AWS S3', description: 'Store state in S3 with DynamoDB locking' },
  { value: 'terraform-cloud', label: 'Terraform Cloud', description: 'HashiCorp managed state' },
  { value: 'gcs', label: 'Google Cloud Storage', description: 'Store state in GCS' },
  { value: 'azurerm', label: 'Azure Blob Storage', description: 'Store state in Azure' },
  { value: 'local', label: 'Local', description: 'Local filesystem (not recommended)' },
];
