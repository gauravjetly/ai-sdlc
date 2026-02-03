export interface DeploymentRequest {
  application: string;
  version: string;
  environment: 'dev' | 'uat' | 'production';
  cloud: 'aws' | 'oci' | 'azure' | 'gcp';
  strategy: 'rolling' | 'blue-green' | 'canary';
  replicas?: number;
  resources?: {
    cpu: string;
    memory: string;
  };
}

export interface DeploymentStatus {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message: string;
}

export interface CloudResource {
  type: 'vpc' | 'cluster' | 'database' | 'storage';
  name: string;
  cloud: string;
  region: string;
  status: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive' | 'running';
  lastActivity: string;
}

export interface CostAnalysis {
  current: number;
  projected: number;
  savings: number;
  recommendations: string[];
}
