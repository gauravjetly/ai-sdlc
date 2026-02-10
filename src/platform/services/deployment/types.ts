/**
 * Deployment Service Type Definitions
 * Real deployment types - NO MOCK DATA
 */

export interface DeploymentConfig {
  application: string;
  version: string;
  environment: 'dev' | 'uat' | 'production' | 'dr';
  cloud: 'aws' | 'oci';
  clusterArn: string;
  namespace: string;
  replicas: number;
  strategy: 'rolling' | 'blue_green' | 'canary';
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
    initialDelaySeconds?: number;
    periodSeconds?: number;
  };
  createdBy?: string;
}

export interface DeploymentResult {
  id: string;
  k8sDeploymentName: string;
  k8sDeploymentUid: string | null;
  namespace: string;
  status: DeploymentStatusType;
  startedAt: Date;
}

export type DeploymentStatusType =
  | 'pending'
  | 'deploying'
  | 'running'
  | 'failed'
  | 'rolled_back'
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
  listDeployments(environment?: string): Promise<DeploymentResult[]>;
}
