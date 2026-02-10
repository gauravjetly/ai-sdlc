# Service Implementations

## Overview

This document provides detailed code structures, interface definitions, and implementation patterns for each service in the Deltek Catalyst platform. All implementations perform **REAL** operations.

---

## 1. Project Structure

```
src/
+-- services/                        # Application Services
|   +-- deployment/
|   |   +-- deployment.service.ts    # Main deployment service
|   |   +-- deployment.repository.ts # Database operations
|   |   +-- k8s.client.ts           # Kubernetes client wrapper
|   |   +-- manifest.builder.ts      # K8s manifest generation
|   |   +-- rollout.monitor.ts       # Rollout status monitoring
|   |   +-- types.ts                 # TypeScript interfaces
|   |
|   +-- cloud/
|   |   +-- cloud-resource.service.ts # Main cloud service
|   |   +-- providers/
|   |   |   +-- aws.provider.ts      # AWS SDK operations
|   |   |   +-- oci.provider.ts      # OCI SDK operations
|   |   +-- vpc.service.ts           # VPC operations
|   |   +-- cluster.service.ts       # Cluster operations
|   |   +-- database.service.ts      # Database operations
|   |   +-- types.ts
|   |
|   +-- agent/
|   |   +-- agent-orchestration.service.ts
|   |   +-- workers/
|   |   |   +-- security.worker.ts   # Security agent logic
|   |   |   +-- developer.worker.ts  # Developer agent logic
|   |   |   +-- finops.worker.ts     # FinOps agent logic
|   |   |   +-- sre.worker.ts        # SRE agent logic
|   |   +-- scheduler.ts             # Cron scheduling
|   |   +-- types.ts
|   |
|   +-- cost/
|   |   +-- cost-analysis.service.ts
|   |   +-- cost-explorer.client.ts  # AWS Cost Explorer
|   |   +-- recommendations.engine.ts
|   |   +-- optimization.executor.ts
|   |   +-- types.ts
|   |
|   +-- security/
|   |   +-- security-scan.service.ts
|   |   +-- scanners/
|   |   |   +-- trivy.scanner.ts     # Container scanning
|   |   |   +-- checkov.scanner.ts   # IaC scanning
|   |   |   +-- npm-audit.scanner.ts # NPM dependencies
|   |   +-- compliance/
|   |   |   +-- soc2.checker.ts      # SOC2 compliance
|   |   |   +-- hipaa.checker.ts     # HIPAA compliance
|   |   +-- cve.client.ts            # NVD API client
|   |   +-- types.ts
|   |
|   +-- credential/
|   |   +-- credential.manager.ts    # Secure credential access
|   |   +-- vault.client.ts          # HashiCorp Vault
|   |   +-- secrets-manager.client.ts # AWS Secrets Manager
|   |
|   +-- notification/
|       +-- notification.service.ts
|       +-- channels/
|           +-- slack.channel.ts
|           +-- email.channel.ts
|           +-- pagerduty.channel.ts
|
+-- infrastructure/                  # Infrastructure Layer
|   +-- database/
|   |   +-- pool.ts                  # PostgreSQL connection pool
|   |   +-- migrations/              # Database migrations
|   |   +-- repositories/
|   |       +-- deployment.repository.ts
|   |       +-- resource.repository.ts
|   |       +-- execution.repository.ts
|   |
|   +-- queue/
|   |   +-- bullmq.ts                # BullMQ configuration
|   |   +-- workers/                 # Worker processes
|   |
|   +-- websocket/
|   |   +-- server.ts                # Socket.io server
|   |   +-- handlers/
|   |
|   +-- cache/
|       +-- redis.client.ts
|
+-- domain/                          # Domain Layer (Pure Business Logic)
|   +-- entities/
|   |   +-- deployment.entity.ts
|   |   +-- resource.entity.ts
|   |   +-- agent.entity.ts
|   |   +-- vulnerability.entity.ts
|   |
|   +-- value-objects/
|   |   +-- deployment-status.vo.ts
|   |   +-- resource-id.vo.ts
|   |
|   +-- events/
|       +-- deployment-created.event.ts
|       +-- scan-completed.event.ts
|
+-- api/                             # Presentation Layer
    +-- controllers/
    +-- routes/
    +-- middleware/
    +-- validators/
```

---

## 2. Interface Definitions

### 2.1 Deployment Service Interface

```typescript
// src/services/deployment/types.ts

export interface DeploymentConfig {
  application: string;
  version: string;
  environment: 'dev' | 'uat' | 'production';
  cloud: 'aws' | 'oci';
  clusterArn: string;
  namespace: string;
  replicas: number;
  strategy: 'rolling' | 'blue-green' | 'canary';
  imageRegistry: string;
  containerPort?: number;
  resources?: {
    cpu: string;
    memory: string;
    cpuLimit?: string;
    memoryLimit?: string;
  };
  environmentVariables?: Record<string, string>;
  healthCheck?: {
    path: string;
    port: number;
    initialDelaySeconds: number;
    periodSeconds: number;
  };
}

export interface DeploymentResult {
  id: string;
  k8sDeploymentName: string;
  k8sDeploymentUid: string;
  namespace: string;
  status: DeploymentStatusType;
  startedAt: Date;
}

export type DeploymentStatusType =
  | 'pending'
  | 'deploying'
  | 'running'
  | 'failed'
  | 'rolled-back'
  | 'completed';

export interface DeploymentStatus {
  id: string;
  status: DeploymentStatusType;
  replicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  availableReplicas: number;
  conditions: K8sCondition[];
  progress: number;
  message: string;
}

export interface K8sCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface IDeploymentService {
  deployApplication(config: DeploymentConfig): Promise<DeploymentResult>;
  getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus>;
  rollbackDeployment(deploymentId: string, targetRevision?: number): Promise<void>;
  scaleDeployment(deploymentId: string, replicas: number): Promise<void>;
  deleteDeployment(deploymentId: string): Promise<void>;
  streamLogs(deploymentId: string): WebSocketStream;
}
```

### 2.2 Cloud Resource Service Interface

```typescript
// src/services/cloud/types.ts

export interface VPCConfig {
  name: string;
  cidrBlock: string;
  region: string;
  environment: string;
  availabilityZones: string[];
  enableDnsSupport?: boolean;
  enableDnsHostnames?: boolean;
}

export interface VPCResource {
  id: string;
  resourceId: string; // AWS VPC ID (vpc-xxx)
  name: string;
  cidrBlock: string;
  region: string;
  subnets: SubnetInfo[];
  internetGatewayId?: string;
  routeTableId?: string;
  status: 'creating' | 'active' | 'deleting' | 'deleted';
  createdAt: Date;
}

export interface SubnetInfo {
  id: string;
  cidrBlock: string;
  availabilityZone: string;
  type: 'public' | 'private';
}

export interface ClusterConfig {
  name: string;
  region: string;
  environment: string;
  vpcId: string;
  subnetIds: string[];
  securityGroupIds: string[];
  kubernetesVersion?: string;
  clusterRoleArn: string;
  nodeRoleArn: string;
  instanceType?: string;
  minNodes?: number;
  maxNodes?: number;
  desiredNodes?: number;
}

export interface ClusterResource {
  id: string;
  resourceId: string; // EKS ARN
  name: string;
  endpoint: string;
  certificateAuthority: string;
  version: string;
  status: 'creating' | 'active' | 'updating' | 'deleting' | 'deleted';
  nodeGroups: NodeGroupInfo[];
  createdAt: Date;
}

export interface DatabaseConfig {
  name: string;
  region: string;
  environment: string;
  engine: 'postgres' | 'mysql';
  engineVersion?: string;
  instanceClass?: string;
  storageGb?: number;
  masterUsername: string;
  masterPassword: string;
  vpcId: string;
  subnetGroup: string;
  securityGroupIds: string[];
  multiAz?: boolean;
}

export interface DatabaseResource {
  id: string;
  resourceId: string; // RDS ARN
  name: string;
  endpoint: string;
  port: number;
  engine: string;
  version: string;
  instanceClass: string;
  status: 'creating' | 'available' | 'modifying' | 'deleting' | 'deleted';
  createdAt: Date;
}

export interface ICloudResourceService {
  // VPC operations
  createVPC(config: VPCConfig): Promise<VPCResource>;
  getVPC(resourceId: string): Promise<VPCResource>;
  deleteVPC(resourceId: string): Promise<void>;

  // Cluster operations
  createCluster(config: ClusterConfig): Promise<ClusterResource>;
  getCluster(resourceId: string): Promise<ClusterResource>;
  deleteCluster(resourceId: string): Promise<void>;

  // Database operations
  createDatabase(config: DatabaseConfig): Promise<DatabaseResource>;
  getDatabase(resourceId: string): Promise<DatabaseResource>;
  deleteDatabase(resourceId: string): Promise<void>;

  // Generic operations
  getResourceStatus(resourceId: string): Promise<ResourceStatus>;
  listResources(filters?: ResourceFilters): Promise<Resource[]>;
}
```

### 2.3 Agent Orchestration Service Interface

```typescript
// src/services/agent/types.ts

export type AgentId =
  | 'security-agent'
  | 'developer-agent'
  | 'sre-agent'
  | 'qa-agent'
  | 'finops-agent'
  | 'release-manager'
  | 'architect-agent'
  | 'conductor-agent';

export interface AgentTask {
  type: string;
  params: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number; // milliseconds
}

export interface TaskExecution {
  id: string;
  agentId: AgentId;
  jobId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export type ExecutionStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface ScheduledJob {
  agentId: AgentId;
  schedule: string; // Cron expression
  nextRun: Date;
  enabled: boolean;
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  enabled: boolean;
  schedule?: string;
  timeout: number;
  retryAttempts: number;
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
}

export interface IAgentOrchestrationService {
  executeAgent(agentId: AgentId, task: AgentTask): Promise<TaskExecution>;
  scheduleAgent(agentId: AgentId, schedule: string): Promise<ScheduledJob>;
  cancelSchedule(agentId: AgentId): Promise<void>;
  getExecutionStatus(executionId: string): Promise<TaskExecution>;
  getExecutionHistory(agentId: AgentId, limit?: number): Promise<TaskExecution[]>;
  getAgentConfig(agentId: AgentId): Promise<AgentConfig>;
  updateAgentConfig(agentId: AgentId, config: Partial<AgentConfig>): Promise<AgentConfig>;
  stopExecution(executionId: string): Promise<void>;
  streamLogs(executionId: string): WebSocketStream;
}
```

### 2.4 Cost Analysis Service Interface

```typescript
// src/services/cost/types.ts

export interface CostBreakdown {
  total: number;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  byService: Record<string, number>;
  byEnvironment?: Record<string, number>;
  byTag?: Record<string, number>;
  dailyTrend: DailyCost[];
}

export interface DailyCost {
  date: string;
  cost: number;
}

export interface CostHistory {
  period: string;
  total: number;
  currency: string;
}

export interface CostRecommendation {
  id: string;
  type: 'rightsizing' | 'reserved-instance' | 'storage-lifecycle' | 'unused-resource';
  resource: string;
  currentConfig: Record<string, any>;
  recommendedConfig: Record<string, any>;
  estimatedSavings: number;
  action: string;
  risk: 'low' | 'medium' | 'high';
  autoApplyAvailable: boolean;
}

export interface OptimizationResult {
  success: boolean;
  recommendationId: string;
  previousConfig: Record<string, any>;
  newConfig: Record<string, any>;
  actualSavings?: number;
  message: string;
}

export interface CostForecast {
  totalForecast: number;
  currency: string;
  confidence: number;
  dailyForecast: DailyForecast[];
}

export interface DailyForecast {
  date: string;
  meanValue: number;
  lowerBound: number;
  upperBound: number;
}

export interface ICostAnalysisService {
  getCurrentCosts(): Promise<CostBreakdown>;
  getCostHistory(months: number): Promise<CostHistory[]>;
  generateRecommendations(): Promise<CostRecommendation[]>;
  applyOptimization(recommendationId: string): Promise<OptimizationResult>;
  getForecast(horizonDays: number): Promise<CostForecast>;
  getCostsByTag(tagKey: string): Promise<Record<string, number>>;
  createBudgetAlert(threshold: number, email: string): Promise<void>;
}
```

### 2.5 Security Scan Service Interface

```typescript
// src/services/security/types.ts

export interface VulnerabilityScanResult {
  scanId: string;
  target: string;
  targetType: 'container' | 'filesystem' | 'repository';
  vulnerabilities: Vulnerability[];
  summary: VulnerabilitySummary;
  scannedAt: string;
}

export interface Vulnerability {
  id: string; // CVE ID
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  package: string;
  installedVersion: string;
  fixedVersion?: string;
  title: string;
  description: string;
  references: string[];
  cvss?: CVSSScore;
  publishedDate?: string;
}

export interface CVSSScore {
  score: number;
  vector: string;
  version: '2.0' | '3.0' | '3.1';
}

export interface VulnerabilitySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface DependencyAuditResult {
  auditId: string;
  projectPath: string;
  ecosystem: 'npm' | 'pip' | 'maven' | 'go';
  vulnerabilities: DependencyVulnerability[];
  summary: VulnerabilitySummary;
}

export interface DependencyVulnerability {
  package: string;
  ecosystem: string;
  severity: string;
  vulnerableVersions: string;
  patchedVersions?: string;
  cve?: string;
  ghsa?: string;
  via?: string[];
}

export interface InfraSecurityResult {
  scanId: string;
  path: string;
  framework: 'terraform' | 'cloudformation' | 'kubernetes';
  findings: InfraSecurityFinding[];
  passedChecks: number;
  failedChecks: number;
  skippedChecks: number;
}

export interface InfraSecurityFinding {
  checkId: string;
  checkType: string;
  resource: string;
  file: string;
  line: number[];
  severity: string;
  description: string;
  guideline?: string;
}

export interface ComplianceResult {
  framework: string;
  timestamp: string;
  checks: ComplianceCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    score: number;
  };
}

export interface ComplianceCheck {
  id: string;
  name: string;
  description?: string;
  status: 'passed' | 'failed' | 'warning' | 'not-applicable';
  evidence?: string;
}

export interface FixResult {
  success: boolean;
  fixId: string;
  package?: string;
  previousVersion?: string;
  newVersion?: string;
  output?: string;
  error?: string;
}

export interface ISecurityScanService {
  scanContainerImage(imageUri: string): Promise<VulnerabilityScanResult>;
  auditDependencies(projectPath: string): Promise<DependencyAuditResult>;
  scanInfrastructure(path: string, framework?: string): Promise<InfraSecurityResult>;
  getVulnerabilityDetails(cveId: string): Promise<CVEDetails>;
  applySecurityFix(fixId: string): Promise<FixResult>;
  runComplianceCheck(framework: string): Promise<ComplianceResult>;
  getScanHistory(target: string, limit?: number): Promise<VulnerabilityScanResult[]>;
}
```

---

## 3. Implementation Patterns

### 3.1 Repository Pattern (Database Access)

```typescript
// src/infrastructure/database/repositories/deployment.repository.ts

import { Pool } from 'pg';

export class DeploymentRepository {
  constructor(private pool: Pool) {}

  async create(deployment: CreateDeploymentDTO): Promise<Deployment> {
    const result = await this.pool.query(
      `INSERT INTO deployments (
        name, application, version, environment, cloud,
        cluster_arn, namespace, status, strategy, replicas,
        k8s_deployment_name, k8s_deployment_uid, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        deployment.name,
        deployment.application,
        deployment.version,
        deployment.environment,
        deployment.cloud,
        deployment.clusterArn,
        deployment.namespace,
        'pending',
        deployment.strategy,
        deployment.replicas,
        deployment.k8sDeploymentName,
        deployment.k8sDeploymentUid,
        deployment.createdBy
      ]
    );

    return this.mapToEntity(result.rows[0]);
  }

  async findById(id: string): Promise<Deployment | null> {
    const result = await this.pool.query(
      'SELECT * FROM deployments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async updateStatus(id: string, status: string, message?: string): Promise<void> {
    await this.pool.query(
      `UPDATE deployments
       SET status = $1, status_message = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, message, id]
    );
  }

  async findByEnvironment(environment: string): Promise<Deployment[]> {
    const result = await this.pool.query(
      'SELECT * FROM deployments WHERE environment = $1 ORDER BY created_at DESC',
      [environment]
    );

    return result.rows.map(row => this.mapToEntity(row));
  }

  private mapToEntity(row: any): Deployment {
    return {
      id: row.id,
      name: row.name,
      application: row.application,
      version: row.version,
      environment: row.environment,
      cloud: row.cloud,
      clusterArn: row.cluster_arn,
      namespace: row.namespace,
      status: row.status,
      strategy: row.strategy,
      replicas: row.replicas,
      k8sDeploymentName: row.k8s_deployment_name,
      k8sDeploymentUid: row.k8s_deployment_uid,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}
```

### 3.2 Factory Pattern (Provider Selection)

```typescript
// src/services/cloud/providers/provider.factory.ts

import { AWSProvider } from './aws.provider';
import { OCIProvider } from './oci.provider';
import { ICloudProvider } from './provider.interface';

export class CloudProviderFactory {
  private providers: Map<string, ICloudProvider> = new Map();

  constructor(
    private credentialManager: CredentialManager
  ) {}

  async getProvider(cloud: 'aws' | 'oci', region: string): Promise<ICloudProvider> {
    const key = `${cloud}:${region}`;

    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    let provider: ICloudProvider;

    switch (cloud) {
      case 'aws':
        const awsCredentials = await this.credentialManager.getAWSCredentials();
        provider = new AWSProvider(awsCredentials, region);
        break;
      case 'oci':
        const ociCredentials = await this.credentialManager.getOCICredentials();
        provider = new OCIProvider(ociCredentials, region);
        break;
      default:
        throw new Error(`Unsupported cloud provider: ${cloud}`);
    }

    this.providers.set(key, provider);
    return provider;
  }
}
```

### 3.3 Worker Pattern (Agent Execution)

```typescript
// src/services/agent/workers/security.worker.ts

import { Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SecurityWorker {
  constructor(
    private db: Pool,
    private websocket: WebSocketServer
  ) {}

  async process(job: Job): Promise<any> {
    const { executionId, task } = job.data;

    await this.log(executionId, `Starting security task: ${task.type}`);

    try {
      switch (task.type) {
        case 'scan_vulnerabilities':
          return await this.scanVulnerabilities(job);
        case 'audit_dependencies':
          return await this.auditDependencies(job);
        case 'scan_infrastructure':
          return await this.scanInfrastructure(job);
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    } catch (error) {
      await this.log(executionId, `Task failed: ${error.message}`);
      throw error;
    }
  }

  private async scanVulnerabilities(job: Job): Promise<any> {
    const { executionId, task } = job.data;
    const { target } = task.params;

    job.updateProgress(10);
    await this.log(executionId, `Scanning image: ${target}`);

    // REAL Trivy scan
    const { stdout } = await execAsync(
      `trivy image --format json --severity CRITICAL,HIGH,MEDIUM,LOW ${target}`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    job.updateProgress(80);
    await this.log(executionId, 'Parsing scan results...');

    const results = JSON.parse(stdout);
    const vulnerabilities = this.extractVulnerabilities(results);

    job.updateProgress(100);
    await this.log(executionId, `Scan complete. Found ${vulnerabilities.length} vulnerabilities.`);

    return { vulnerabilities };
  }

  private async log(executionId: string, message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;

    // Save to database
    await this.db.query(
      `UPDATE agent_executions
       SET logs = COALESCE(logs, '') || $1 || E'\n'
       WHERE id = $2`,
      [logEntry, executionId]
    );

    // Send to WebSocket
    this.websocket.emit(`agent:${executionId}`, {
      type: 'log',
      message: logEntry
    });
  }

  private extractVulnerabilities(trivyResults: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    trivyResults.Results?.forEach((result: any) => {
      result.Vulnerabilities?.forEach((vuln: any) => {
        vulnerabilities.push({
          id: vuln.VulnerabilityID,
          severity: vuln.Severity,
          package: vuln.PkgName,
          installedVersion: vuln.InstalledVersion,
          fixedVersion: vuln.FixedVersion,
          title: vuln.Title,
          description: vuln.Description
        });
      });
    });

    return vulnerabilities;
  }
}
```

### 3.4 Event Emitter Pattern (Real-time Updates)

```typescript
// src/infrastructure/websocket/server.ts

import { Server, Socket } from 'socket.io';
import { createServer } from 'http';

export class WebSocketServer {
  private io: Server;
  private subscriptions: Map<string, Set<string>> = new Map();

  constructor(httpServer: ReturnType<typeof createServer>) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('subscribe', (channel: string) => {
        socket.join(channel);
        this.addSubscription(channel, socket.id);
      });

      socket.on('unsubscribe', (channel: string) => {
        socket.leave(channel);
        this.removeSubscription(channel, socket.id);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.cleanupSubscriptions(socket.id);
      });
    });
  }

  emit(channel: string, event: any): void {
    this.io.to(channel).emit(channel, event);
  }

  private addSubscription(channel: string, socketId: string): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(socketId);
  }

  private removeSubscription(channel: string, socketId: string): void {
    this.subscriptions.get(channel)?.delete(socketId);
  }

  private cleanupSubscriptions(socketId: string): void {
    this.subscriptions.forEach((sockets, channel) => {
      sockets.delete(socketId);
    });
  }
}
```

---

## 4. Dependency Injection Setup

```typescript
// src/container.ts

import { Pool } from 'pg';
import Redis from 'ioredis';
import { Queue } from 'bullmq';

// Infrastructure
import { DatabasePool } from './infrastructure/database/pool';
import { WebSocketServer } from './infrastructure/websocket/server';

// Services
import { DeploymentService } from './services/deployment/deployment.service';
import { CloudResourceService } from './services/cloud/cloud-resource.service';
import { AgentOrchestrationService } from './services/agent/agent-orchestration.service';
import { CostAnalysisService } from './services/cost/cost-analysis.service';
import { SecurityScanService } from './services/security/security-scan.service';
import { CredentialManager } from './services/credential/credential.manager';

// Repositories
import { DeploymentRepository } from './infrastructure/database/repositories/deployment.repository';
import { ResourceRepository } from './infrastructure/database/repositories/resource.repository';

export class Container {
  private instances: Map<string, any> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Database pool
    const dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true'
    });
    this.instances.set('dbPool', dbPool);

    // Redis
    const redis = new Redis(process.env.REDIS_URL!);
    this.instances.set('redis', redis);

    // BullMQ Queue
    const taskQueue = new Queue('agent-tasks', { connection: redis });
    this.instances.set('taskQueue', taskQueue);

    // Repositories
    const deploymentRepo = new DeploymentRepository(dbPool);
    const resourceRepo = new ResourceRepository(dbPool);
    this.instances.set('deploymentRepository', deploymentRepo);
    this.instances.set('resourceRepository', resourceRepo);

    // Credential Manager
    const credentialManager = new CredentialManager();
    this.instances.set('credentialManager', credentialManager);

    // Services (will be initialized with WebSocket server later)
  }

  initializeWithWebSocket(websocket: WebSocketServer): void {
    this.instances.set('websocket', websocket);

    const dbPool = this.get<Pool>('dbPool');
    const redis = this.get<Redis>('redis');
    const credentialManager = this.get<CredentialManager>('credentialManager');

    // Initialize services with all dependencies
    const deploymentService = new DeploymentService(
      credentialManager,
      { getPool: () => dbPool },
      websocket
    );
    this.instances.set('deploymentService', deploymentService);

    const cloudResourceService = new CloudResourceService(
      credentialManager,
      { getPool: () => dbPool },
      websocket
    );
    this.instances.set('cloudResourceService', cloudResourceService);

    const agentService = new AgentOrchestrationService(
      redis,
      { getPool: () => dbPool },
      websocket
    );
    this.instances.set('agentService', agentService);

    const costService = new CostAnalysisService(
      credentialManager,
      { getPool: () => dbPool }
    );
    this.instances.set('costService', costService);

    const securityService = new SecurityScanService(
      { getPool: () => dbPool },
      { nvdApiKey: process.env.NVD_API_KEY! }
    );
    this.instances.set('securityService', securityService);
  }

  get<T>(key: string): T {
    if (!this.instances.has(key)) {
      throw new Error(`Service not found: ${key}`);
    }
    return this.instances.get(key) as T;
  }
}

export const container = new Container();
```

---

## 5. Testing Strategy

### 5.1 Unit Tests (Mock External Services)

```typescript
// src/services/deployment/__tests__/deployment.service.test.ts

import { DeploymentService } from '../deployment.service';
import { MockK8sClient } from '../../../__mocks__/k8s-client';
import { MockCredentialManager } from '../../../__mocks__/credential-manager';

describe('DeploymentService', () => {
  let service: DeploymentService;
  let mockK8s: MockK8sClient;

  beforeEach(() => {
    mockK8s = new MockK8sClient();
    service = new DeploymentService(
      new MockCredentialManager(),
      new MockDatabasePool(),
      new MockWebSocket()
    );
    service['k8sAppsApi'] = mockK8s;
  });

  describe('deployApplication', () => {
    it('should create deployment with correct manifest', async () => {
      const config = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'dev',
        // ...
      };

      await service.deployApplication(config);

      expect(mockK8s.createNamespacedDeployment).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: {
            name: 'test-app-dev',
            labels: expect.objectContaining({
              app: 'test-app',
              version: '1.0.0'
            })
          }
        })
      );
    });
  });
});
```

### 5.2 Integration Tests (Real Services)

```typescript
// tests/integration/deployment.integration.test.ts

describe('DeploymentService Integration', () => {
  let service: DeploymentService;
  let testNamespace: string;

  beforeAll(async () => {
    // Use real test cluster
    service = container.get<DeploymentService>('deploymentService');
    testNamespace = `integration-test-${Date.now()}`;
  });

  afterAll(async () => {
    // Cleanup
    await service.deleteNamespace(testNamespace);
  });

  it('should create real deployment in Kubernetes', async () => {
    const result = await service.deployApplication({
      application: 'nginx',
      version: '1.21',
      environment: 'test',
      cloud: 'aws',
      clusterArn: process.env.TEST_CLUSTER_ARN!,
      namespace: testNamespace,
      replicas: 1,
      strategy: 'rolling',
      imageRegistry: 'nginx'
    });

    expect(result.id).toBeDefined();
    expect(result.k8sDeploymentName).toBe('nginx-test');

    // Wait for deployment
    await waitFor(async () => {
      const status = await service.getDeploymentStatus(result.id);
      return status.status === 'running';
    }, 60000);

    const status = await service.getDeploymentStatus(result.id);
    expect(status.readyReplicas).toBe(1);
  });
});
```

---

## Summary

This document provides:

1. **Complete Project Structure** - Organized by layer (services, infrastructure, domain, api)
2. **Interface Definitions** - TypeScript interfaces for all services
3. **Implementation Patterns** - Repository, Factory, Worker, Event Emitter
4. **Dependency Injection** - Container setup for all services
5. **Testing Strategy** - Unit and integration test patterns

All implementations perform **REAL** operations. No mock data, no placeholders.
