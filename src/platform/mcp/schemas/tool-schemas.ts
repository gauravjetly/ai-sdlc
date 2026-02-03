/**
 * Tool Input Schemas
 *
 * Zod schemas for validating tool inputs
 */

import { z } from 'zod';

// Common schemas
export const EnvironmentSchema = z.enum(['dev', 'uat', 'prod', 'dr']);
export const CloudProviderSchema = z.enum(['aws', 'oci', 'azure', 'gcp']);
export const DeploymentStrategySchema = z.enum(['rolling', 'blue-green', 'canary']);
export const StatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed']);

// Deployment tool schemas
export const DeployApplicationSchema = z.object({
  application: z.string().min(1).describe('Application name'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver format').describe('Version to deploy (semver)'),
  environment: EnvironmentSchema.describe('Target environment'),
  strategy: DeploymentStrategySchema.optional().describe('Deployment strategy'),
  replicas: z.number().min(1).max(100).optional().describe('Number of replicas'),
  config: z.record(z.any()).optional().describe('Additional configuration')
});

export const RollbackDeploymentSchema = z.object({
  deployment_id: z.string().uuid().describe('Deployment ID to rollback'),
  confirm: z.boolean().optional().default(true).describe('Confirmation flag')
});

export const GetDeploymentStatusSchema = z.object({
  deployment_id: z.string().uuid().describe('Deployment ID')
});

export const GetDeploymentLogsSchema = z.object({
  deployment_id: z.string().uuid().describe('Deployment ID'),
  lines: z.number().min(1).max(10000).optional().default(100).describe('Number of log lines'),
  since: z.string().optional().describe('Time range (e.g., "1h", "30m")')
});

export const ScaleDeploymentSchema = z.object({
  deployment_id: z.string().uuid().describe('Deployment ID'),
  replicas: z.number().min(0).max(100).describe('Target replica count')
});

export const RestartDeploymentSchema = z.object({
  deployment_id: z.string().uuid().describe('Deployment ID')
});

export const ListDeploymentsSchema = z.object({
  environment: EnvironmentSchema.optional().describe('Filter by environment'),
  application: z.string().optional().describe('Filter by application'),
  status: z.string().optional().describe('Filter by status')
});

export const GetDeploymentHealthSchema = z.object({
  deployment_id: z.string().uuid().describe('Deployment ID')
});

export const PauseDeploymentSchema = z.object({
  deployment_id: z.string().uuid().describe('Deployment ID')
});

export const ResumeDeploymentSchema = z.object({
  deployment_id: z.string().uuid().describe('Deployment ID')
});

// Infrastructure tool schemas
export const ProvisionInfrastructureSchema = z.object({
  workflow: z.string().min(1).describe('Workflow definition (YAML or JSON)'),
  cloud: CloudProviderSchema.describe('Target cloud provider'),
  environment: EnvironmentSchema.describe('Environment')
});

export const GetInfrastructureStatusSchema = z.object({
  workflow_id: z.string().uuid().describe('Workflow ID')
});

export const DestroyInfrastructureSchema = z.object({
  workflow_id: z.string().uuid().describe('Workflow ID'),
  confirm: z.boolean().describe('Confirmation flag (must be true)')
});

export const ScaleInfrastructureSchema = z.object({
  resource_id: z.string().uuid().describe('Resource ID'),
  scale: z.union([
    z.number(),
    z.object({
      min: z.number(),
      max: z.number()
    })
  ]).describe('Scale value or range')
});

export const ListInfrastructureSchema = z.object({
  cloud: CloudProviderSchema.optional().describe('Filter by cloud'),
  environment: EnvironmentSchema.optional().describe('Filter by environment')
});

export const GetResourceDetailsSchema = z.object({
  resource_id: z.string().uuid().describe('Resource ID')
});

export const UpdateInfrastructureSchema = z.object({
  workflow_id: z.string().uuid().describe('Workflow ID'),
  changes: z.string().describe('Changes to apply (YAML or JSON)')
});

export const ValidateInfrastructureSchema = z.object({
  workflow: z.string().min(1).describe('Workflow definition to validate')
});

export const GetInfrastructureCostSchema = z.object({
  workflow_id: z.string().uuid().describe('Workflow ID')
});

export const TagInfrastructureSchema = z.object({
  workflow_id: z.string().uuid().describe('Workflow ID'),
  tags: z.record(z.string()).describe('Tags to apply')
});

// Security tool schemas
export const RunSecurityScanSchema = z.object({
  target: z.string().min(1).describe('Target to scan (deployment ID, image, etc.)'),
  scan_type: z.enum(['vulnerabilities', 'compliance', 'secrets', 'all']).describe('Type of scan')
});

export const ApplyPatchesSchema = z.object({
  target: z.string().min(1).describe('Target to patch'),
  vulnerabilities: z.array(z.string()).optional().describe('Specific CVE IDs to patch'),
  auto_approve: z.boolean().optional().describe('Auto-approve patches')
});

export const CheckComplianceSchema = z.object({
  target: z.string().min(1).describe('Target to check'),
  standards: z.array(z.enum(['CIS', 'SOC2', 'GDPR', 'PCI-DSS'])).describe('Standards to check against')
});

export const GenerateSecurityReportSchema = z.object({
  target: z.string().min(1).describe('Target for report'),
  format: z.enum(['pdf', 'json', 'html']).optional().default('json').describe('Report format')
});

export const RotateSecretsSchema = z.object({
  service: z.string().min(1).describe('Service name'),
  secret_names: z.array(z.string()).optional().describe('Specific secrets to rotate')
});

export const AuditAccessLogsSchema = z.object({
  resource: z.string().min(1).describe('Resource to audit'),
  start_date: z.string().optional().describe('Start date (ISO 8601)'),
  end_date: z.string().optional().describe('End date (ISO 8601)')
});

export const ConfigureFirewallSchema = z.object({
  resource_id: z.string().uuid().describe('Resource ID'),
  rules: z.array(z.object({
    protocol: z.enum(['tcp', 'udp', 'icmp']),
    port: z.number().min(1).max(65535),
    source: z.string(),
    action: z.enum(['allow', 'deny'])
  })).describe('Firewall rules')
});

export const EnableEncryptionSchema = z.object({
  resource_id: z.string().uuid().describe('Resource ID'),
  encryption_type: z.enum(['at-rest', 'in-transit', 'both']).describe('Encryption type')
});

export const ScanDockerImageSchema = z.object({
  image: z.string().min(1).describe('Docker image name:tag'),
  registry: z.string().optional().describe('Container registry')
});

export const CheckCertificatesSchema = z.object({
  domain: z.string().optional().describe('Domain to check'),
  all: z.boolean().optional().describe('Check all certificates')
});

// Cost tool schemas
export const GetCostReportSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).describe('Report period'),
  cloud: CloudProviderSchema.optional().describe('Filter by cloud provider'),
  start_date: z.string().optional().describe('Start date (ISO 8601)'),
  end_date: z.string().optional().describe('End date (ISO 8601)')
});

export const ForecastCostsSchema = z.object({
  cloud: CloudProviderSchema.describe('Cloud provider'),
  months: z.number().min(1).max(12).describe('Months to forecast')
});

export const OptimizeCostsSchema = z.object({
  cloud: CloudProviderSchema.describe('Cloud provider'),
  strategy: z.enum(['aggressive', 'moderate', 'conservative']).describe('Optimization strategy')
});

export const SetBudgetAlertSchema = z.object({
  cloud: CloudProviderSchema.describe('Cloud provider'),
  budget: z.number().positive().describe('Budget amount'),
  threshold: z.number().min(0).max(100).describe('Alert threshold percentage')
});

export const GetResourceCostSchema = z.object({
  resource_id: z.string().uuid().describe('Resource ID')
});

export const CompareCloudCostsSchema = z.object({
  workload: z.string().describe('Workload definition'),
  clouds: z.array(CloudProviderSchema).describe('Clouds to compare')
});

export const GetCostBreakdownSchema = z.object({
  cloud: CloudProviderSchema.describe('Cloud provider'),
  period: z.enum(['daily', 'weekly', 'monthly']).describe('Time period')
});

export const GetUnusedResourcesSchema = z.object({
  cloud: CloudProviderSchema.describe('Cloud provider'),
  days_unused: z.number().min(1).describe('Days of inactivity')
});

export const EstimateDeploymentCostSchema = z.object({
  workflow: z.string().describe('Infrastructure workflow'),
  cloud: CloudProviderSchema.describe('Cloud provider'),
  duration_days: z.number().min(1).describe('Estimated duration in days')
});

export const GetCostAnomaliesSchema = z.object({
  cloud: CloudProviderSchema.describe('Cloud provider'),
  sensitivity: z.enum(['low', 'medium', 'high']).describe('Anomaly detection sensitivity')
});

// Observability tool schemas
export const GetMetricsSchema = z.object({
  service: z.string().min(1).describe('Service name'),
  metrics: z.array(z.enum(['cpu', 'memory', 'requests', 'errors', 'latency'])).describe('Metrics to retrieve'),
  start_time: z.string().optional().describe('Start time (ISO 8601)'),
  end_time: z.string().optional().describe('End time (ISO 8601)')
});

export const GetLogsSchema = z.object({
  service: z.string().min(1).describe('Service name'),
  level: z.enum(['error', 'warn', 'info', 'debug']).optional().describe('Log level filter'),
  lines: z.number().min(1).max(10000).optional().default(100).describe('Number of lines'),
  since: z.string().optional().describe('Time range (e.g., "1h", "30m")')
});

export const GetTracesSchema = z.object({
  service: z.string().min(1).describe('Service name'),
  trace_id: z.string().optional().describe('Specific trace ID'),
  duration_gt: z.number().optional().describe('Duration greater than (ms)')
});

export const CreateAlertSchema = z.object({
  service: z.string().min(1).describe('Service name'),
  metric: z.string().min(1).describe('Metric to monitor'),
  condition: z.enum(['gt', 'lt', 'eq']).describe('Condition'),
  threshold: z.number().describe('Threshold value'),
  notification: z.object({
    email: z.array(z.string().email()).optional(),
    slack: z.string().optional(),
    webhook: z.string().url().optional()
  }).describe('Notification channels')
});

export const GetServiceHealthSchema = z.object({
  service: z.string().min(1).describe('Service name')
});

export const GetDashboardDataSchema = z.object({
  services: z.array(z.string()).describe('Services to include'),
  time_range: z.enum(['1h', '6h', '24h', '7d', '30d']).describe('Time range')
});

export const AnalyzePerformanceSchema = z.object({
  service: z.string().min(1).describe('Service name'),
  start_time: z.string().describe('Start time (ISO 8601)'),
  end_time: z.string().describe('End time (ISO 8601)')
});

export const GetErrorRateSchema = z.object({
  service: z.string().min(1).describe('Service name'),
  time_window: z.string().describe('Time window (e.g., "5m", "1h")')
});

export const GetLatencyPercentilesSchema = z.object({
  service: z.string().min(1).describe('Service name'),
  percentiles: z.array(z.number().min(0).max(100)).describe('Percentiles to calculate')
});

export const GetServiceDependenciesSchema = z.object({
  service: z.string().min(1).describe('Service name')
});

// Testing tool schemas
export const RunTestsSchema = z.object({
  type: z.enum(['unit', 'integration', 'e2e', 'performance', 'security']).describe('Test type'),
  target: z.string().optional().describe('Specific test target'),
  parallel: z.boolean().optional().default(true).describe('Run tests in parallel')
});

export const GetTestResultsSchema = z.object({
  test_run_id: z.string().uuid().describe('Test run ID')
});

export const GetCodeCoverageSchema = z.object({
  target: z.string().optional().describe('Coverage target (file, directory)'),
  threshold: z.number().min(0).max(100).optional().describe('Coverage threshold')
});

export const RunLoadTestSchema = z.object({
  target: z.string().url().describe('Target URL'),
  duration: z.number().min(1).describe('Test duration in seconds'),
  users: z.number().min(1).max(10000).describe('Number of concurrent users'),
  ramp_up: z.number().min(0).describe('Ramp-up time in seconds')
});

export const RunSecurityTestsSchema = z.object({
  target: z.string().min(1).describe('Target to test'),
  test_suite: z.array(z.enum(['sql-injection', 'xss', 'auth', 'api'])).describe('Tests to run')
});

export const ValidateAPIContractSchema = z.object({
  api: z.string().min(1).describe('API name'),
  contract_file: z.string().describe('Contract file path (OpenAPI/Swagger)')
});

export const GenerateTestDataSchema = z.object({
  schema: z.string().describe('Data schema'),
  count: z.number().min(1).max(10000).describe('Number of records')
});

export const RunSmokeTestsSchema = z.object({
  environment: EnvironmentSchema.describe('Environment to test'),
  services: z.array(z.string()).optional().describe('Services to test')
});

// Release tool schemas
export const CreateReleaseSchema = z.object({
  application: z.string().min(1).describe('Application name'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver format').describe('Release version (semver)'),
  environment: EnvironmentSchema.describe('Target environment'),
  strategy: DeploymentStrategySchema.describe('Release strategy'),
  approval_required: z.boolean().optional().describe('Require manual approval')
});

export const GetReleaseStatusSchema = z.object({
  release_id: z.string().uuid().describe('Release ID')
});

export const ApproveReleaseSchema = z.object({
  release_id: z.string().uuid().describe('Release ID'),
  approver: z.string().min(1).describe('Approver name')
});

export const RollbackReleaseSchema = z.object({
  release_id: z.string().uuid().describe('Release ID'),
  confirm: z.boolean().describe('Confirmation flag')
});

export const GetReleaseHistorySchema = z.object({
  application: z.string().min(1).describe('Application name'),
  limit: z.number().min(1).max(100).optional().default(10).describe('Number of releases')
});

export const PromoteReleaseSchema = z.object({
  release_id: z.string().uuid().describe('Release ID'),
  to_environment: EnvironmentSchema.describe('Target environment')
});

export const ScheduleReleaseSchema = z.object({
  release_id: z.string().uuid().describe('Release ID'),
  scheduled_time: z.string().describe('Scheduled time (ISO 8601)')
});

export const CancelReleaseSchema = z.object({
  release_id: z.string().uuid().describe('Release ID'),
  reason: z.string().min(1).describe('Cancellation reason')
});

export const GetReleaseNotesSchema = z.object({
  application: z.string().min(1).describe('Application name'),
  from_version: z.string().describe('Starting version'),
  to_version: z.string().describe('Ending version')
});

// Architecture tool schemas
export const ValidateArchitectureSchema = z.object({
  target: z.string().min(1).describe('Code directory or package to validate'),
  rules: z.array(z.string()).optional().describe('Architecture rules to apply')
});

export const AnalyzeDependenciesSchema = z.object({
  target: z.string().min(1).describe('Project or module to analyze'),
  depth: z.number().min(1).max(10).optional().default(3).describe('Dependency tree depth')
});

export const CheckCouplingSchema = z.object({
  target: z.string().min(1).describe('Code to analyze'),
  threshold: z.number().min(0).max(100).optional().default(50).describe('Coupling threshold')
});

export const GenerateArchitectureDiagramSchema = z.object({
  target: z.string().min(1).describe('System or service to diagram'),
  format: z.enum(['mermaid', 'plantuml', 'svg']).describe('Diagram format')
});

export const DetectArchitectureSmellsSchema = z.object({
  target: z.string().min(1).describe('Code to analyze'),
  severity: z.enum(['all', 'high', 'critical']).optional().default('all').describe('Severity filter')
});

export const ValidateLayerBoundariesSchema = z.object({
  target: z.string().min(1).describe('Project to validate'),
  architecture_style: z.enum(['layered', 'hexagonal', 'clean', 'microservices']).describe('Architecture style')
});

export const AnalyzeCodeComplexitySchema = z.object({
  target: z.string().min(1).describe('Code to analyze'),
  metrics: z.array(z.enum(['cyclomatic', 'cognitive', 'halstead'])).describe('Complexity metrics')
});

export const CheckSOLIDPrinciplesSchema = z.object({
  target: z.string().min(1).describe('Code to check'),
  principles: z.array(z.enum(['SRP', 'OCP', 'LSP', 'ISP', 'DIP'])).optional().describe('Principles to check')
});

export const DetectCircularDependenciesSchema = z.object({
  target: z.string().min(1).describe('Project to analyze')
});

export const GenerateDocumentationSchema = z.object({
  target: z.string().min(1).describe('Code to document'),
  format: z.enum(['markdown', 'html', 'pdf']).describe('Documentation format')
});
