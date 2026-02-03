/**
 * Terraform Generator Service
 * Generate modular Terraform code for all 27 node types
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';
import {
  DesignNode,
  DesignEdge,
  LayerType,
  Environment,
  TerraformModule,
  TerraformExport,
} from '../types/designer.js';

const logger = createLogger('TerraformGenerator');
const prisma = new PrismaClient();

// Terraform resource type mapping
const RESOURCE_TYPE_MAP: Record<string, string> = {
  vpc: 'aws_vpc',
  subnet: 'aws_subnet',
  internet_gateway: 'aws_internet_gateway',
  nat_gateway: 'aws_nat_gateway',
  route_table: 'aws_route_table',
  security_group: 'aws_security_group',
  network_acl: 'aws_network_acl',
  vpc_peering: 'aws_vpc_peering_connection',
  transit_gateway: 'aws_ec2_transit_gateway',
  eks_cluster: 'aws_eks_cluster',
  eks_node_group: 'aws_eks_node_group',
  rds_instance: 'aws_db_instance',
  rds_aurora: 'aws_rds_cluster',
  elasticache: 'aws_elasticache_cluster',
  alb: 'aws_lb',
  nlb: 'aws_lb',
  s3_bucket: 'aws_s3_bucket',
  dynamodb: 'aws_dynamodb_table',
  sqs: 'aws_sqs_queue',
  sns: 'aws_sns_topic',
  lambda_function: 'aws_lambda_function',
  codepipeline: 'aws_codepipeline',
  codebuild: 'aws_codebuild_project',
  ecr_repository: 'aws_ecr_repository',
  cloudwatch_dashboard: 'aws_cloudwatch_dashboard',
  cloudwatch_alarm: 'aws_cloudwatch_metric_alarm',
  secrets_manager: 'aws_secretsmanager_secret',
  iam_role: 'aws_iam_role',
};

export interface TerraformCode {
  rootModule: {
    mainTf: string;
    variablesTf: string;
    outputsTf: string;
    providerTf: string;
    backendTf: string;
    terraformTfvars: string;
  };
  modules: TerraformModule[];
  environments: Record<Environment, string>; // tfvars per environment
}

export interface TerraformVariables {
  content: string;
  variables: {
    name: string;
    type: string;
    default?: any;
    description: string;
  }[];
}

export interface TerraformOutputs {
  content: string;
  outputs: {
    name: string;
    value: string;
    description: string;
  }[];
}

export interface BackendConfig {
  type: 'local' | 's3' | 'remote';
  content: string;
}

export interface StateConfig {
  backend: 'local' | 's3' | 'remote';
  bucket?: string;
  key?: string;
  region?: string;
  dynamodbTable?: string;
  organization?: string;
  workspace?: string;
}

export class TerraformGenerator {
  /**
   * Generate complete Terraform code from design
   */
  async generateFromDesign(designId: string, environment: Environment): Promise<TerraformCode> {
    logger.info('Generating Terraform from design', { designId, environment });

    const design = await prisma.visualDesign.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new Error(`Design ${designId} not found`);
    }

    const designData = design.designData as { nodes: DesignNode[]; edges: DesignEdge[] };
    const nodes = designData.nodes || [];
    const edges = designData.edges || [];
    const region = design.region || 'us-east-1';

    // Group nodes by layer
    const networkNodes = nodes.filter((n) => n.layer === 'network');
    const platformNodes = nodes.filter((n) => n.layer === 'platform');
    const devopsNodes = nodes.filter((n) => n.layer === 'devops');

    // Build reference map for dependencies
    const refMap = this.buildReferenceMap(nodes, edges);

    // Generate modules
    const modules: TerraformModule[] = [];

    if (networkNodes.length > 0) {
      modules.push(
        await this.generateLayerModule('network', networkNodes, edges, refMap, environment)
      );
    }

    if (platformNodes.length > 0) {
      modules.push(
        await this.generateLayerModule('platform', platformNodes, edges, refMap, environment)
      );
    }

    if (devopsNodes.length > 0) {
      modules.push(
        await this.generateLayerModule('devops', devopsNodes, edges, refMap, environment)
      );
    }

    // Generate root module
    const mainTf = this.generateRootMain(modules, design.name || 'infrastructure');
    const variablesTf = this.generateRootVariables(nodes, environment);
    const outputsTf = this.generateRootOutputs(modules);
    const providerTf = this.generateProvider(region);
    const backendTf = this.generateBackendConfig({
      backend: 'local',
    }).content;
    const terraformTfvars = this.generateTfvars(nodes, environment);

    // Generate environment-specific tfvars
    const environments: Record<Environment, string> = {
      dev: this.generateTfvars(nodes, 'dev'),
      uat: this.generateTfvars(nodes, 'uat'),
      production: this.generateTfvars(nodes, 'production'),
      dr: this.generateTfvars(nodes, 'dr'),
    };

    logger.info('Terraform generation complete', {
      designId,
      moduleCount: modules.length,
      nodeCount: nodes.length,
    });

    return {
      rootModule: {
        mainTf,
        variablesTf,
        outputsTf,
        providerTf,
        backendTf,
        terraformTfvars,
      },
      modules,
      environments,
    };
  }

  /**
   * Generate Terraform module for a layer
   */
  async generateLayerModule(
    layer: LayerType,
    nodes: DesignNode[],
    edges: DesignEdge[],
    refMap: Map<string, string>,
    environment: Environment
  ): Promise<TerraformModule> {
    const resources: string[] = [];
    const variables: string[] = [];
    const outputs: string[] = [];

    // Generate resources for each node
    for (const node of nodes) {
      const { resource, vars, outs } = this.generateNodeResource(node, refMap, environment);
      resources.push(resource);
      variables.push(...vars);
      outputs.push(...outs);
    }

    // Deduplicate variables
    const uniqueVars = [...new Set(variables)].join('\n\n');
    const uniqueOutputs = [...new Set(outputs)].join('\n\n');

    const mainContent = `# ${layer.charAt(0).toUpperCase() + layer.slice(1)} Layer
# Generated by Infrastructure Designer
# Environment: ${environment}

${resources.join('\n\n')}
`;

    const variablesContent = `# Variables for ${layer} layer

variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "tags" {
  type        = map(string)
  description = "Common tags for all resources"
  default     = {}
}

${uniqueVars}
`;

    const outputsContent = `# Outputs for ${layer} layer

${uniqueOutputs}
`;

    return {
      name: layer,
      layer,
      files: [
        { name: 'main.tf', content: mainContent },
        { name: 'variables.tf', content: variablesContent },
        { name: 'outputs.tf', content: outputsContent },
      ],
    };
  }

  /**
   * Generate Terraform variables
   */
  generateVariables(nodes: DesignNode[], environment: Environment): TerraformVariables {
    const variables: TerraformVariables['variables'] = [
      {
        name: 'environment',
        type: 'string',
        default: environment,
        description: 'Deployment environment',
      },
      {
        name: 'aws_region',
        type: 'string',
        default: 'us-east-1',
        description: 'AWS region for deployment',
      },
      {
        name: 'project_name',
        type: 'string',
        description: 'Name of the project',
      },
    ];

    // Extract variables from nodes
    for (const node of nodes) {
      if (node.type === 'vpc' && node.data.cidr) {
        variables.push({
          name: 'vpc_cidr',
          type: 'string',
          default: node.data.cidr,
          description: 'CIDR block for VPC',
        });
      }
    }

    const content = variables
      .map(
        (v) => `variable "${v.name}" {
  type        = ${v.type}
  description = "${v.description}"
${v.default !== undefined ? `  default     = ${JSON.stringify(v.default)}` : ''}
}`
      )
      .join('\n\n');

    return { content, variables };
  }

  /**
   * Generate Terraform outputs
   */
  generateOutputs(nodes: DesignNode[]): TerraformOutputs {
    const outputs: TerraformOutputs['outputs'] = [];

    for (const node of nodes) {
      const resourceName = this.sanitizeName(node.data.name || node.id);
      const resourceType = RESOURCE_TYPE_MAP[node.type];

      if (resourceType) {
        outputs.push({
          name: `${node.type}_${resourceName}_id`,
          value: `${resourceType}.${resourceName}.id`,
          description: `ID of ${node.type} ${resourceName}`,
        });

        // Add ARN for resources that have it
        if (
          ['eks_cluster', 'rds_instance', 'rds_aurora', 'lambda_function', 'iam_role'].includes(
            node.type
          )
        ) {
          outputs.push({
            name: `${node.type}_${resourceName}_arn`,
            value: `${resourceType}.${resourceName}.arn`,
            description: `ARN of ${node.type} ${resourceName}`,
          });
        }
      }
    }

    const content = outputs
      .map(
        (o) => `output "${o.name}" {
  value       = ${o.value}
  description = "${o.description}"
}`
      )
      .join('\n\n');

    return { content, outputs };
  }

  /**
   * Generate backend configuration
   */
  generateBackendConfig(config: StateConfig): BackendConfig {
    let content: string;

    switch (config.backend) {
      case 's3':
        content = `terraform {
  backend "s3" {
    bucket         = "${config.bucket || 'terraform-state-bucket'}"
    key            = "${config.key || 'terraform.tfstate'}"
    region         = "${config.region || 'us-east-1'}"
    encrypt        = true
    dynamodb_table = "${config.dynamodbTable || 'terraform-locks'}"
  }
}`;
        break;

      case 'remote':
        content = `terraform {
  cloud {
    organization = "${config.organization || 'my-org'}"
    workspaces {
      name = "${config.workspace || 'default'}"
    }
  }
}`;
        break;

      case 'local':
      default:
        content = `terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}`;
    }

    return { type: config.backend, content };
  }

  /**
   * Generate AWS provider configuration
   */
  generateProvider(region: string): string {
    return `# AWS Provider Configuration

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
      Project     = var.project_name
    }
  }
}
`;
  }

  /**
   * Build reference map for node dependencies
   */
  private buildReferenceMap(nodes: DesignNode[], edges: DesignEdge[]): Map<string, string> {
    const refMap = new Map<string, string>();

    for (const node of nodes) {
      const resourceName = this.sanitizeName(node.data.name || node.id);
      const resourceType = RESOURCE_TYPE_MAP[node.type];
      if (resourceType) {
        refMap.set(node.id, `${resourceType}.${resourceName}`);
      }
    }

    return refMap;
  }

  /**
   * Generate Terraform resource for a node
   */
  private generateNodeResource(
    node: DesignNode,
    refMap: Map<string, string>,
    environment: Environment
  ): {
    resource: string;
    vars: string[];
    outs: string[];
  } {
    const resourceName = this.sanitizeName(node.data.name || node.id);
    const vars: string[] = [];
    const outs: string[] = [];

    let resource = '';

    switch (node.type) {
      case 'vpc':
        resource = this.generateVPC(resourceName, node.data);
        outs.push(`output "${resourceName}_vpc_id" {
  value = aws_vpc.${resourceName}.id
}`);
        break;

      case 'subnet':
        resource = this.generateSubnet(resourceName, node.data, refMap, node.parentId);
        break;

      case 'internet_gateway':
        resource = this.generateInternetGateway(resourceName, node.data, refMap);
        break;

      case 'nat_gateway':
        resource = this.generateNATGateway(resourceName, node.data, refMap);
        break;

      case 'route_table':
        resource = this.generateRouteTable(resourceName, node.data, refMap);
        break;

      case 'security_group':
        resource = this.generateSecurityGroup(resourceName, node.data, refMap);
        outs.push(`output "${resourceName}_sg_id" {
  value = aws_security_group.${resourceName}.id
}`);
        break;

      case 'eks_cluster':
        resource = this.generateEKSCluster(resourceName, node.data, refMap);
        outs.push(`output "${resourceName}_cluster_endpoint" {
  value = aws_eks_cluster.${resourceName}.endpoint
}`);
        break;

      case 'eks_node_group':
        resource = this.generateEKSNodeGroup(resourceName, node.data, refMap, environment);
        break;

      case 'rds_instance':
        resource = this.generateRDSInstance(resourceName, node.data, refMap, environment);
        outs.push(`output "${resourceName}_endpoint" {
  value = aws_db_instance.${resourceName}.endpoint
}`);
        break;

      case 'rds_aurora':
        resource = this.generateAuroraCluster(resourceName, node.data, refMap, environment);
        break;

      case 'elasticache':
        resource = this.generateElastiCache(resourceName, node.data, refMap, environment);
        break;

      case 'alb':
        resource = this.generateALB(resourceName, node.data, refMap);
        outs.push(`output "${resourceName}_dns_name" {
  value = aws_lb.${resourceName}.dns_name
}`);
        break;

      case 'nlb':
        resource = this.generateNLB(resourceName, node.data, refMap);
        break;

      case 's3_bucket':
        resource = this.generateS3Bucket(resourceName, node.data);
        outs.push(`output "${resourceName}_bucket_arn" {
  value = aws_s3_bucket.${resourceName}.arn
}`);
        break;

      case 'dynamodb':
        resource = this.generateDynamoDB(resourceName, node.data);
        break;

      case 'sqs':
        resource = this.generateSQS(resourceName, node.data);
        break;

      case 'sns':
        resource = this.generateSNS(resourceName, node.data);
        break;

      case 'lambda_function':
        resource = this.generateLambda(resourceName, node.data, refMap);
        outs.push(`output "${resourceName}_function_arn" {
  value = aws_lambda_function.${resourceName}.arn
}`);
        break;

      case 'codepipeline':
        resource = this.generateCodePipeline(resourceName, node.data, refMap);
        break;

      case 'codebuild':
        resource = this.generateCodeBuild(resourceName, node.data, refMap);
        break;

      case 'ecr_repository':
        resource = this.generateECR(resourceName, node.data);
        outs.push(`output "${resourceName}_repository_url" {
  value = aws_ecr_repository.${resourceName}.repository_url
}`);
        break;

      case 'cloudwatch_dashboard':
        resource = this.generateCloudWatchDashboard(resourceName, node.data);
        break;

      case 'cloudwatch_alarm':
        resource = this.generateCloudWatchAlarm(resourceName, node.data);
        break;

      case 'secrets_manager':
        resource = this.generateSecretsManager(resourceName, node.data);
        break;

      case 'iam_role':
        resource = this.generateIAMRole(resourceName, node.data);
        outs.push(`output "${resourceName}_role_arn" {
  value = aws_iam_role.${resourceName}.arn
}`);
        break;

      default:
        resource = `# Unknown resource type: ${node.type}`;
    }

    return { resource, vars, outs };
  }

  // Resource generators for each type

  private generateVPC(name: string, data: any): string {
    return `resource "aws_vpc" "${name}" {
  cidr_block           = "${data.cidr || data.cidrBlock || '10.0.0.0/16'}"
  enable_dns_hostnames = ${data.enableDnsHostnames !== false}
  enable_dns_support   = ${data.enableDnsSupport !== false}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateSubnet(name: string, data: any, refMap: Map<string, string>, parentId?: string): string {
    const vpcRef = parentId ? refMap.get(parentId) : 'aws_vpc.main';
    return `resource "aws_subnet" "${name}" {
  vpc_id                  = ${vpcRef ? `${vpcRef}.id` : 'var.vpc_id'}
  cidr_block              = "${data.cidr || data.cidrBlock || '10.0.1.0/24'}"
  availability_zone       = "${data.availabilityZone || 'us-east-1a'}"
  map_public_ip_on_launch = ${data.isPublic || data.mapPublicIpOnLaunch || false}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
    Type = "${data.isPublic ? 'public' : 'private'}"
  })
}`;
  }

  private generateInternetGateway(name: string, data: any, refMap: Map<string, string>): string {
    return `resource "aws_internet_gateway" "${name}" {
  vpc_id = var.vpc_id

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateNATGateway(name: string, data: any, refMap: Map<string, string>): string {
    return `resource "aws_eip" "${name}" {
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${name}-eip"
  })
}

resource "aws_nat_gateway" "${name}" {
  allocation_id = aws_eip.${name}.id
  subnet_id     = var.public_subnet_id

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })

  depends_on = [aws_eip.${name}]
}`;
  }

  private generateRouteTable(name: string, data: any, refMap: Map<string, string>): string {
    return `resource "aws_route_table" "${name}" {
  vpc_id = var.vpc_id

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateSecurityGroup(name: string, data: any, refMap: Map<string, string>): string {
    const ingressRules = (data.ingressRules || [])
      .map(
        (rule: any) => `
  ingress {
    from_port   = ${rule.fromPort || 0}
    to_port     = ${rule.toPort || 0}
    protocol    = "${rule.protocol || 'tcp'}"
    cidr_blocks = ${JSON.stringify(rule.cidrBlocks || ['0.0.0.0/0'])}
    description = "${rule.description || ''}"
  }`
      )
      .join('\n');

    const egressRules = (data.egressRules || [{ fromPort: 0, toPort: 0, protocol: '-1', cidrBlocks: ['0.0.0.0/0'] }])
      .map(
        (rule: any) => `
  egress {
    from_port   = ${rule.fromPort || 0}
    to_port     = ${rule.toPort || 0}
    protocol    = "${rule.protocol || '-1'}"
    cidr_blocks = ${JSON.stringify(rule.cidrBlocks || ['0.0.0.0/0'])}
    description = "${rule.description || ''}"
  }`
      )
      .join('\n');

    return `resource "aws_security_group" "${name}" {
  name        = "${data.name || name}"
  description = "${data.description || 'Security group managed by Terraform'}"
  vpc_id      = var.vpc_id
${ingressRules}
${egressRules}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateEKSCluster(name: string, data: any, refMap: Map<string, string>): string {
    return `resource "aws_eks_cluster" "${name}" {
  name     = "${data.name || name}"
  version  = "${data.version || '1.29'}"
  role_arn = var.eks_cluster_role_arn

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = ${data.endpointPrivateAccess !== false}
    endpoint_public_access  = ${data.endpointPublicAccess !== false}
    security_group_ids      = var.security_group_ids
  }

  enabled_cluster_log_types = ${JSON.stringify(data.enabledClusterLogTypes || ['api', 'audit', 'authenticator'])}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateEKSNodeGroup(
    name: string,
    data: any,
    refMap: Map<string, string>,
    environment: Environment
  ): string {
    const desiredSize = this.scaleForEnvironment(data.desiredSize || 2, environment);
    const minSize = this.scaleForEnvironment(data.minSize || 1, environment);
    const maxSize = this.scaleForEnvironment(data.maxSize || 4, environment);

    return `resource "aws_eks_node_group" "${name}" {
  cluster_name    = var.cluster_name
  node_group_name = "${data.name || name}"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.subnet_ids

  scaling_config {
    desired_size = ${desiredSize}
    min_size     = ${minSize}
    max_size     = ${maxSize}
  }

  instance_types = ${JSON.stringify(data.instanceTypes || ['t3.medium'])}
  capacity_type  = "${data.capacityType || 'ON_DEMAND'}"
  disk_size      = ${data.diskSize || 20}

  labels = ${JSON.stringify(data.labels || {})}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateRDSInstance(
    name: string,
    data: any,
    refMap: Map<string, string>,
    environment: Environment
  ): string {
    const instanceClass = this.scaleInstanceForEnvironment(
      data.instanceClass || 'db.t3.medium',
      environment
    );

    return `resource "aws_db_instance" "${name}" {
  identifier     = "${data.identifier || name}"
  engine         = "${data.engine || 'postgres'}"
  engine_version = "${data.engineVersion || '14'}"
  instance_class = "${instanceClass}"

  allocated_storage     = ${data.allocatedStorage || 20}
  max_allocated_storage = ${data.maxAllocatedStorage || 100}
  storage_type          = "${data.storageType || 'gp3'}"
  storage_encrypted     = ${data.storageEncrypted !== false}

  db_name  = "${data.dbName || 'appdb'}"
  username = var.db_username
  password = var.db_password

  multi_az               = ${data.multiAz || environment === 'production'}
  publicly_accessible    = ${data.publiclyAccessible || false}
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = var.security_group_ids

  backup_retention_period = ${data.backupRetentionPeriod || (environment === 'production' ? 7 : 1)}
  backup_window           = "${data.backupWindow || '03:00-04:00'}"
  maintenance_window      = "${data.maintenanceWindow || 'sun:04:00-sun:05:00'}"

  skip_final_snapshot = ${environment !== 'production'}
  deletion_protection = ${environment === 'production'}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateAuroraCluster(
    name: string,
    data: any,
    refMap: Map<string, string>,
    environment: Environment
  ): string {
    return `resource "aws_rds_cluster" "${name}" {
  cluster_identifier     = "${data.clusterIdentifier || name}"
  engine                 = "${data.engine || 'aurora-postgresql'}"
  engine_version         = "${data.engineVersion || '14.6'}"
  database_name          = "${data.databaseName || 'appdb'}"
  master_username        = var.db_username
  master_password        = var.db_password

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = var.security_group_ids

  storage_encrypted = true

  backup_retention_period = ${data.backupRetentionPeriod || 7}
  preferred_backup_window = "${data.backupWindow || '03:00-04:00'}"

  skip_final_snapshot = ${environment !== 'production'}
  deletion_protection = ${environment === 'production'}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}

resource "aws_rds_cluster_instance" "${name}_instance" {
  count              = ${data.instanceCount || 2}
  identifier         = "${name}-\${count.index}"
  cluster_identifier = aws_rds_cluster.${name}.id
  instance_class     = "${data.instanceClass || 'db.r5.large'}"
  engine             = aws_rds_cluster.${name}.engine
  engine_version     = aws_rds_cluster.${name}.engine_version

  tags = merge(var.tags, {
    Name = "${name}-\${count.index}"
  })
}`;
  }

  private generateElastiCache(
    name: string,
    data: any,
    refMap: Map<string, string>,
    environment: Environment
  ): string {
    return `resource "aws_elasticache_cluster" "${name}" {
  cluster_id           = "${data.clusterId || name}"
  engine               = "${data.engine || 'redis'}"
  engine_version       = "${data.engineVersion || '7.0'}"
  node_type            = "${data.nodeType || 'cache.t3.medium'}"
  num_cache_nodes      = ${data.numCacheNodes || 1}
  port                 = ${data.port || 6379}
  subnet_group_name    = var.cache_subnet_group_name
  security_group_ids   = var.security_group_ids

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateALB(name: string, data: any, refMap: Map<string, string>): string {
    return `resource "aws_lb" "${name}" {
  name               = "${data.name || name}"
  internal           = ${data.internal || false}
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  enable_deletion_protection = ${data.deletionProtection || false}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateNLB(name: string, data: any, refMap: Map<string, string>): string {
    return `resource "aws_lb" "${name}" {
  name               = "${data.name || name}"
  internal           = ${data.internal || false}
  load_balancer_type = "network"
  subnets            = var.subnet_ids

  enable_deletion_protection = ${data.deletionProtection || false}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateS3Bucket(name: string, data: any): string {
    const bucketName = this.sanitizeName(data.bucket || data.name || name);
    return `resource "aws_s3_bucket" "${name}" {
  bucket = "${bucketName}"

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}

resource "aws_s3_bucket_versioning" "${name}_versioning" {
  bucket = aws_s3_bucket.${name}.id
  versioning_configuration {
    status = "${data.versioning?.enabled ? 'Enabled' : 'Disabled'}"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "${name}_encryption" {
  bucket = aws_s3_bucket.${name}.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}`;
  }

  private generateDynamoDB(name: string, data: any): string {
    return `resource "aws_dynamodb_table" "${name}" {
  name           = "${data.tableName || data.name || name}"
  billing_mode   = "${data.billingMode || 'PAY_PER_REQUEST'}"
  hash_key       = "${data.hashKey || 'id'}"
  ${data.rangeKey ? `range_key      = "${data.rangeKey}"` : ''}

  attribute {
    name = "${data.hashKey || 'id'}"
    type = "${data.hashKeyType || 'S'}"
  }
  ${data.rangeKey ? `
  attribute {
    name = "${data.rangeKey}"
    type = "${data.rangeKeyType || 'S'}"
  }` : ''}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateSQS(name: string, data: any): string {
    return `resource "aws_sqs_queue" "${name}" {
  name                       = "${data.queueName || data.name || name}"
  delay_seconds              = ${data.delaySeconds || 0}
  max_message_size           = ${data.maxMessageSize || 262144}
  message_retention_seconds  = ${data.messageRetentionSeconds || 345600}
  visibility_timeout_seconds = ${data.visibilityTimeoutSeconds || 30}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateSNS(name: string, data: any): string {
    return `resource "aws_sns_topic" "${name}" {
  name = "${data.topicName || data.name || name}"

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateLambda(name: string, data: any, refMap: Map<string, string>): string {
    return `resource "aws_lambda_function" "${name}" {
  function_name = "${data.functionName || data.name || name}"
  role          = var.lambda_role_arn
  handler       = "${data.handler || 'index.handler'}"
  runtime       = "${data.runtime || 'nodejs18.x'}"

  filename         = "${data.filename || 'lambda.zip'}"
  source_code_hash = filebase64sha256("${data.filename || 'lambda.zip'}")

  memory_size = ${data.memorySize || 128}
  timeout     = ${data.timeout || 3}

  environment {
    variables = ${JSON.stringify(data.environment?.variables || {})}
  }

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateCodePipeline(name: string, data: any, refMap: Map<string, string>): string {
    return `resource "aws_codepipeline" "${name}" {
  name     = "${data.name || name}"
  role_arn = var.codepipeline_role_arn

  artifact_store {
    location = var.artifact_bucket
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]
      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = "${data.repositoryId || 'owner/repo'}"
        BranchName       = "${data.branch || 'main'}"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      version          = "1"
      configuration = {
        ProjectName = var.codebuild_project_name
      }
    }
  }

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateCodeBuild(name: string, data: any, refMap: Map<string, string>): string {
    return `resource "aws_codebuild_project" "${name}" {
  name          = "${data.name || name}"
  description   = "${data.description || 'Build project'}"
  build_timeout = ${data.buildTimeout || 60}
  service_role  = var.codebuild_role_arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "${data.computeType || 'BUILD_GENERAL1_SMALL'}"
    image                       = "${data.image || 'aws/codebuild/amazonlinux2-x86_64-standard:4.0'}"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = ${data.privilegedMode || false}
  }

  source {
    type = "CODEPIPELINE"
  }

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateECR(name: string, data: any): string {
    return `resource "aws_ecr_repository" "${name}" {
  name                 = "${data.repositoryName || data.name || name}"
  image_tag_mutability = "${data.imageTagMutability || 'MUTABLE'}"

  image_scanning_configuration {
    scan_on_push = ${data.scanOnPush !== false}
  }

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateCloudWatchDashboard(name: string, data: any): string {
    return `resource "aws_cloudwatch_dashboard" "${name}" {
  dashboard_name = "${data.dashboardName || data.name || name}"
  dashboard_body = jsonencode(${JSON.stringify(data.dashboardBody || { widgets: [] })})
}`;
  }

  private generateCloudWatchAlarm(name: string, data: any): string {
    return `resource "aws_cloudwatch_metric_alarm" "${name}" {
  alarm_name          = "${data.alarmName || data.name || name}"
  comparison_operator = "${data.comparisonOperator || 'GreaterThanThreshold'}"
  evaluation_periods  = ${data.evaluationPeriods || 2}
  metric_name         = "${data.metricName || 'CPUUtilization'}"
  namespace           = "${data.namespace || 'AWS/EC2'}"
  period              = ${data.period || 300}
  statistic           = "${data.statistic || 'Average'}"
  threshold           = ${data.threshold || 80}
  alarm_description   = "${data.alarmDescription || 'Alarm when metric exceeds threshold'}"
  alarm_actions       = ${JSON.stringify(data.alarmActions || [])}

  dimensions = ${JSON.stringify(data.dimensions || {})}

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateSecretsManager(name: string, data: any): string {
    return `resource "aws_secretsmanager_secret" "${name}" {
  name        = "${data.secretName || data.name || name}"
  description = "${data.description || 'Secret managed by Terraform'}"

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  private generateIAMRole(name: string, data: any): string {
    const assumeRolePolicy = data.assumeRolePolicy || {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'ec2.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    };

    return `resource "aws_iam_role" "${name}" {
  name = "${data.roleName || data.name || name}"

  assume_role_policy = jsonencode(${JSON.stringify(assumeRolePolicy, null, 2)})

  tags = merge(var.tags, {
    Name = "${data.name || name}"
  })
}`;
  }

  // Helper methods

  private generateRootMain(modules: TerraformModule[], projectName: string): string {
    const moduleCalls = modules
      .map(
        (m) => `module "${m.layer}" {
  source = "./modules/${m.layer}"

  environment        = var.environment
  tags               = local.common_tags
  vpc_id             = ${m.layer === 'network' ? 'null' : 'module.network.vpc_id'}
  subnet_ids         = ${m.layer === 'network' ? '[]' : 'module.network.subnet_ids'}
  security_group_ids = ${m.layer === 'network' ? '[]' : 'module.network.security_group_ids'}
}`
      )
      .join('\n\n');

    return `# Root Module - ${projectName}
# Generated by Infrastructure Designer

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    GeneratedAt = timestamp()
  }
}

${moduleCalls}
`;
  }

  private generateRootVariables(nodes: DesignNode[], environment: Environment): string {
    return `# Root Variables

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "${environment}"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project name"
}

variable "db_username" {
  type        = string
  description = "Database username"
  sensitive   = true
}

variable "db_password" {
  type        = string
  description = "Database password"
  sensitive   = true
}
`;
  }

  private generateRootOutputs(modules: TerraformModule[]): string {
    const outputs = modules
      .map(
        (m) => `output "${m.layer}_outputs" {
  value = module.${m.layer}
}`
      )
      .join('\n\n');

    return `# Root Outputs

${outputs}
`;
  }

  private generateTfvars(nodes: DesignNode[], environment: Environment): string {
    return `# Environment: ${environment}

environment  = "${environment}"
project_name = "infrastructure-designer"

# Add sensitive variables via environment or terraform.tfvars.local
# db_username = "admin"
# db_password = "changeme"
`;
  }

  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/-/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private scaleForEnvironment(value: number, environment: Environment): number {
    const multipliers: Record<Environment, number> = {
      dev: 0.5,
      uat: 0.75,
      production: 1.0,
      dr: 0.8,
    };
    return Math.max(1, Math.floor(value * multipliers[environment]));
  }

  private scaleInstanceForEnvironment(instanceClass: string, environment: Environment): string {
    if (environment === 'production') return instanceClass;

    const downgrades: Record<string, string> = {
      'db.r5.xlarge': 'db.r5.large',
      'db.r5.large': 'db.t3.medium',
      'db.m5.xlarge': 'db.m5.large',
      'db.m5.large': 'db.t3.medium',
      'db.t3.large': 'db.t3.medium',
      'db.t3.medium': 'db.t3.small',
    };

    if (environment === 'dev') {
      return downgrades[instanceClass] || instanceClass;
    }

    return instanceClass;
  }
}

// Export singleton instance
export const terraformGenerator = new TerraformGenerator();
