/**
 * Layer Management Types
 * Types for layer management UI components
 */

// Define types locally to avoid circular dependency issues
export type LayerType = 'network' | 'platform' | 'devops' | 'fullstack';
export type LayerStatus = 'pending' | 'complete' | 'deployed' | 'failed';
export type Environment = 'dev' | 'staging' | 'prod';

/**
 * Deployment status for a layer
 */
export type DeploymentStatus = 'idle' | 'planning' | 'deploying' | 'success' | 'failed' | 'rolling_back';

/**
 * Log entry from deployment
 */
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  resource?: string;
}

/**
 * Deployment event for timeline
 */
export interface DeploymentEvent {
  id: string;
  layerType: LayerType;
  eventType: 'deploy' | 'rollback' | 'config_change' | 'validation';
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  initiatedBy: string;
  environment: Environment;
  terraformPlan?: string;
  terraformOutput?: Record<string, unknown>;
  logs?: string[];
  error?: string;
}

/**
 * Layer dependency definition
 */
export interface LayerDependency {
  layer: LayerType;
  dependsOn: LayerType[];
}

/**
 * Cost estimate for a layer
 */
export interface LayerCostEstimate {
  layerType: LayerType;
  environment: Environment;
  monthlyCost: number;
  breakdown: CostBreakdownItem[];
}

/**
 * Individual cost item in breakdown
 */
export interface CostBreakdownItem {
  resourceType: string;
  resourceName: string;
  monthlyCost: number;
}

/**
 * Result of checking if deployment is allowed
 */
export interface CanDeployResult {
  canDeploy: boolean;
  reason?: string;
  missingDependencies?: LayerType[];
}

/**
 * Result of deployment action
 */
export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  error?: string;
}

/**
 * Result of rollback action
 */
export interface RollbackResult {
  success: boolean;
  affectedLayers?: LayerType[];
  error?: string;
}

/**
 * Layer configuration
 */
export const LAYER_CONFIG = {
  network: {
    title: 'Network Layer',
    description: 'VPC, subnets, security groups, and connectivity',
    color: '#2196F3',
    icon: 'CloudQueue',
    steps: 5,
  },
  platform: {
    title: 'Platform Layer',
    description: 'Compute, databases, caching, and load balancing',
    color: '#4CAF50',
    icon: 'Storage',
    steps: 5,
  },
  devops: {
    title: 'DevOps Layer',
    description: 'CI/CD, monitoring, logging, and secrets',
    color: '#FF9800',
    icon: 'Speed',
    steps: 5,
  },
} as const;

/**
 * Layer dependencies - which layers must be completed before each layer
 */
export const LAYER_DEPENDENCIES: Record<LayerType, LayerType[]> = {
  network: [],
  platform: ['network'],
  devops: ['network', 'platform'],
  fullstack: ['network', 'platform', 'devops'],
};

/**
 * Layer order for deployment
 */
export const LAYER_ORDER: LayerType[] = ['network', 'platform', 'devops'];

/**
 * Status colors for display
 */
export const STATUS_COLORS: Record<LayerStatus, string> = {
  pending: '#9E9E9E',
  complete: '#FFC107',
  deployed: '#4CAF50',
  failed: '#F44336',
};

/**
 * WebSocket message types
 */
export type WebSocketMessage =
  | { type: 'deployment:started'; payload: { layer: LayerType; deploymentId: string } }
  | { type: 'deployment:log'; payload: { deploymentId: string; log: LogEntry } }
  | { type: 'deployment:progress'; payload: { deploymentId: string; progress: number; stage: string } }
  | { type: 'deployment:completed'; payload: { deploymentId: string; outputs: Record<string, unknown> } }
  | { type: 'deployment:failed'; payload: { deploymentId: string; error: string } }
  | { type: 'ping' }
  | { type: 'pong' };

/**
 * Timeline filter state
 */
export interface TimelineFilters {
  layers: LayerType[];
  eventTypes: ('deploy' | 'rollback' | 'config_change' | 'validation')[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  status?: 'success' | 'failed';
}
