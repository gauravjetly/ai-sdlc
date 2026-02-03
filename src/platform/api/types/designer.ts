/**
 * Infrastructure Designer Type Definitions
 * Types for templates, designs, workflows, and layers
 */

// =============================================
// ENUMS (matching Prisma schema)
// =============================================

export type TemplateCategory =
  | 'network_foundation'
  | 'compute_platform'
  | 'storage_database'
  | 'security'
  | 'monitoring'
  | 'fullstack'
  | 'custom';

export type TemplateVisibility = 'private' | 'organization' | 'public';

export type LayerType = 'network' | 'platform' | 'devops' | 'fullstack';

export type DesignStatus =
  | 'draft'
  | 'validated'
  | 'deploying'
  | 'deployed'
  | 'failed'
  | 'archived';

export type LayerDeploymentStatus =
  | 'pending'
  | 'validating'
  | 'deploying'
  | 'deployed'
  | 'failed'
  | 'rolled_back';

export type Environment = 'dev' | 'uat' | 'production' | 'dr';
export type CloudProvider = 'aws' | 'oci' | 'azure' | 'gcp';

// =============================================
// NODE & EDGE TYPES
// =============================================

export interface Position {
  x: number;
  y: number;
}

export interface DesignNode {
  id: string;
  type: string; // vpc, subnet, eks_cluster, etc.
  position: Position;
  data: Record<string, any>;
  layer: LayerType;
  parentId?: string;
  width?: number;
  height?: number;
}

export interface DesignEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  label?: string;
  data?: Record<string, any>;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DesignData {
  nodes: DesignNode[];
  edges: DesignEdge[];
  viewport?: Viewport;
  metadata?: Record<string, any>;
}

// =============================================
// TEMPLATE TYPES
// =============================================

export interface TemplateData {
  nodes: DesignNode[];
  edges: DesignEdge[];
  metadata?: {
    estimatedCost?: number;
    deploymentTime?: string;
    complexity?: 'simple' | 'moderate' | 'complex';
    awsServices?: string[];
  };
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  visibility: TemplateVisibility;
  templateData: TemplateData;
  layerType?: LayerType;
  thumbnail?: string;
  version: string;
  tags: string[];
  usageCount: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: string;
  templateData: TemplateData;
  changeLog?: string;
  createdAt: Date;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: TemplateCategory;
  visibility?: TemplateVisibility;
  templateData: TemplateData;
  layerType?: LayerType;
  thumbnail?: string;
  tags?: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  visibility?: TemplateVisibility;
  templateData?: TemplateData;
  tags?: string[];
  changeLog?: string;
}

export interface ListTemplatesQuery {
  category?: TemplateCategory;
  layerType?: LayerType;
  visibility?: TemplateVisibility;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'usageCount' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// =============================================
// DESIGN TYPES
// =============================================

export interface Design {
  id: string;
  name: string;
  description?: string;
  designData: DesignData;
  status: DesignStatus;
  environment?: Environment;
  cloud?: CloudProvider;
  region?: string;
  estimatedMonthlyCost?: number;
  currency: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastDeployedAt?: Date;
}

export interface DesignVersion {
  id: string;
  designId: string;
  versionNumber: number;
  designData: DesignData;
  changeLog?: string;
  createdBy?: string;
  createdAt: Date;
}

export interface CreateDesignRequest {
  name: string;
  description?: string;
  templateId?: string;
  cloud: CloudProvider;
  region: string;
  environment?: Environment;
}

export interface UpdateDesignRequest {
  name?: string;
  description?: string;
  designData?: DesignData;
  environment?: Environment;
  createVersion?: boolean;
  changeLog?: string;
}

export interface ListDesignsQuery {
  status?: DesignStatus;
  environment?: Environment;
  cloud?: CloudProvider;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// =============================================
// WORKFLOW TYPES
// =============================================

export interface EnvironmentConfig {
  instanceSizes?: Record<string, string>;
  replicaCounts?: Record<string, number>;
  enabledFeatures?: string[];
  variables?: Record<string, string>;
}

export interface EnvironmentConfigs {
  dev: EnvironmentConfig;
  staging: EnvironmentConfig;
  prod: EnvironmentConfig;
}

export interface LayerData {
  nodes: DesignNode[];
  edges: DesignEdge[];
  config?: Record<string, any>;
}

export interface NetworkLayerData extends LayerData {
  config?: {
    vpcCidr?: string;
    availabilityZones?: string[];
    publicSubnets?: string[];
    privateSubnets?: string[];
    enableNatGateway?: boolean;
    enableVpnGateway?: boolean;
  };
}

export interface PlatformLayerData extends LayerData {
  config?: {
    computeType?: 'eks' | 'ecs' | 'ec2' | 'lambda';
    databaseType?: 'rds' | 'aurora' | 'dynamodb';
    cacheType?: 'elasticache' | 'none';
    loadBalancerType?: 'alb' | 'nlb' | 'none';
  };
}

export interface DevOpsLayerData extends LayerData {
  config?: {
    cicdPipeline?: 'codepipeline' | 'github_actions' | 'none';
    monitoring?: 'cloudwatch' | 'prometheus' | 'both';
    logging?: 'cloudwatch_logs' | 'opensearch' | 'both';
    secretsManager?: 'secrets_manager' | 'parameter_store' | 'both';
  };
}

export interface Workflow {
  id: string;
  designId: string;
  currentLayer?: LayerType;
  currentStep: number;
  networkComplete: boolean;
  platformComplete: boolean;
  devopsComplete: boolean;
  networkData?: NetworkLayerData;
  platformData?: PlatformLayerData;
  devopsData?: DevOpsLayerData;
  environments: EnvironmentConfigs;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowRequest {
  designName: string;
  templateId?: string;
  cloud: CloudProvider;
  region: string;
  environment?: Environment;
}

export interface UpdateWorkflowRequest {
  currentLayer?: LayerType;
  currentStep?: number;
  networkData?: NetworkLayerData;
  platformData?: PlatformLayerData;
  devopsData?: DevOpsLayerData;
  environments?: Partial<EnvironmentConfigs>;
}

// =============================================
// LAYER TYPES
// =============================================

export interface Layer {
  id: string;
  workflowId: string;
  designId: string;
  layerType: LayerType;
  layerName: string;
  layerData: LayerData;
  status: LayerDeploymentStatus;
  deployedAt?: Date;
  dependsOn: string[];
  envOverrides?: Record<Environment, Partial<LayerData>>;
  terraformOutput?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLayerRequest {
  workflowId: string;
  designId: string;
  layerType: LayerType;
  layerName: string;
  layerData: LayerData;
  dependsOn?: string[];
}

export interface UpdateLayerRequest {
  layerData?: LayerData;
  status?: LayerDeploymentStatus;
  envOverrides?: Record<Environment, Partial<LayerData>>;
}

// =============================================
// VALIDATION TYPES
// =============================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  nodeId?: string;
  severity: ValidationSeverity;
  suggestion?: string;
}

export interface ValidationWarning extends ValidationError {
  severity: 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// =============================================
// DEPLOYMENT TYPES
// =============================================

export interface DeploymentRequest {
  layer: LayerType;
  environment: Environment;
  dryRun?: boolean;
}

export interface DeploymentError {
  code: string;
  message: string;
  resourceId?: string;
  awsErrorCode?: string;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  status: LayerDeploymentStatus;
  outputs?: Record<string, any>;
  errors?: DeploymentError[];
  duration?: number;
}

// =============================================
// COST ESTIMATION TYPES
// =============================================

export interface ResourceCost {
  resourceType: string;
  resourceName: string;
  count: number;
  unitCost: number;
  totalCost: number;
  currency: string;
}

export interface CostEstimate {
  totalMonthly: number;
  currency: string;
  breakdown: ResourceCost[];
  byLayer: Record<LayerType, number>;
  byService: Record<string, number>;
  estimatedAt: Date;
}

// =============================================
// TERRAFORM EXPORT TYPES
// =============================================

export interface TerraformExportOptions {
  format: 'terraform' | 'cloudformation';
  environment?: Environment;
  layers?: LayerType[];
  includeState?: boolean;
}

export interface TerraformModule {
  name: string;
  layer: LayerType;
  files: {
    name: string;
    content: string;
  }[];
}

export interface TerraformExport {
  modules: TerraformModule[];
  rootModule: {
    files: {
      name: string;
      content: string;
    }[];
  };
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
