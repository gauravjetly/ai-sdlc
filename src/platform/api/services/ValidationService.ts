/**
 * Validation Service
 * Comprehensive validation for designs, layers, AWS quotas, and IAM policies
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';
import {
  DesignNode,
  DesignEdge,
  LayerType,
  LayerData,
  NetworkLayerData,
  PlatformLayerData,
  DevOpsLayerData,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSeverity,
} from '../types/designer.js';

const logger = createLogger('ValidationService');
const prisma = new PrismaClient();

// Validation error codes
export const ValidationCodes = {
  // General
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_TYPE: 'INVALID_TYPE',
  DUPLICATE_ID: 'DUPLICATE_ID',

  // Network Layer
  INVALID_VPC_CIDR: 'INVALID_VPC_CIDR',
  INVALID_SUBNET_CIDR: 'INVALID_SUBNET_CIDR',
  CIDR_OVERLAP: 'CIDR_OVERLAP',
  SUBNET_NOT_IN_VPC: 'SUBNET_NOT_IN_VPC',
  MISSING_VPC: 'MISSING_VPC',
  MISSING_SUBNET: 'MISSING_SUBNET',
  MISSING_IGW: 'MISSING_IGW',
  MISSING_NAT: 'MISSING_NAT',
  INVALID_AZ: 'INVALID_AZ',
  INSUFFICIENT_AZS: 'INSUFFICIENT_AZS',

  // Platform Layer
  EKS_NO_NODE_GROUPS: 'EKS_NO_NODE_GROUPS',
  RDS_NO_SUBNET_GROUP: 'RDS_NO_SUBNET_GROUP',
  ALB_INSUFFICIENT_SUBNETS: 'ALB_INSUFFICIENT_SUBNETS',
  MISSING_SECURITY_GROUP: 'MISSING_SECURITY_GROUP',
  INVALID_INSTANCE_TYPE: 'INVALID_INSTANCE_TYPE',

  // DevOps Layer
  PIPELINE_NO_SOURCE: 'PIPELINE_NO_SOURCE',
  IAM_INVALID_POLICY: 'IAM_INVALID_POLICY',
  ALARM_INVALID_METRIC: 'ALARM_INVALID_METRIC',

  // Dependencies
  LAYER_DEPENDENCY: 'LAYER_DEPENDENCY',
  MISSING_REFERENCE: 'MISSING_REFERENCE',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',

  // AWS
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_REGION: 'INVALID_REGION',
};

// Valid node types by layer
const VALID_NODE_TYPES: Record<LayerType, string[]> = {
  network: [
    'vpc',
    'subnet',
    'internet_gateway',
    'nat_gateway',
    'route_table',
    'security_group',
    'network_acl',
    'vpc_peering',
    'transit_gateway',
  ],
  platform: [
    'eks_cluster',
    'eks_node_group',
    'rds_instance',
    'rds_aurora',
    'elasticache',
    'alb',
    'nlb',
    's3_bucket',
    'dynamodb',
    'sqs',
    'sns',
    'lambda_function',
  ],
  devops: [
    'codepipeline',
    'codebuild',
    'ecr_repository',
    'cloudwatch_dashboard',
    'cloudwatch_alarm',
    'secrets_manager',
    'iam_role',
  ],
  fullstack: [],
};

// AWS Regions
const VALID_AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
];

// CIDR validation regex
const CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: { code: string; message: string }[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalInfo: number;
    layersValidated: LayerType[];
  };
}

export interface QuotaCheck {
  quotaName: string;
  serviceName: string;
  currentUsage: number;
  limit: number;
  available: number;
  sufficient: boolean;
}

export interface PolicyValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ValidationService {
  /**
   * Validate a complete design
   */
  async validateDesign(designId: string): Promise<ValidationReport> {
    logger.info('Validating design', { designId });

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: { code: string; message: string }[] = [];
    const layersValidated: LayerType[] = [];

    // Get design with workflow
    const design = await prisma.visualDesign.findUnique({
      where: { id: designId },
      include: { workflow: true },
    });

    if (!design) {
      errors.push({
        code: 'DESIGN_NOT_FOUND',
        message: `Design ${designId} not found`,
        severity: 'error',
      });
      return this.buildReport(errors, warnings, info, layersValidated);
    }

    const designData = design.designData as { nodes: DesignNode[]; edges: DesignEdge[] };

    // Validate basic structure
    if (!designData.nodes || !Array.isArray(designData.nodes)) {
      errors.push({
        code: 'INVALID_STRUCTURE',
        message: 'Design must have a nodes array',
        severity: 'error',
      });
      return this.buildReport(errors, warnings, info, layersValidated);
    }

    // Validate node IDs are unique
    const nodeIds = designData.nodes.map((n) => n.id);
    const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    for (const dupId of duplicateIds) {
      errors.push({
        code: ValidationCodes.DUPLICATE_ID,
        message: `Duplicate node ID: ${dupId}`,
        nodeId: dupId,
        severity: 'error',
      });
    }

    // Validate node types
    for (const node of designData.nodes) {
      const validTypes = VALID_NODE_TYPES[node.layer] || [];
      if (!validTypes.includes(node.type)) {
        errors.push({
          code: ValidationCodes.INVALID_TYPE,
          message: `Invalid node type "${node.type}" for layer "${node.layer}"`,
          nodeId: node.id,
          severity: 'error',
        });
      }
    }

    // Validate edges reference valid nodes
    if (designData.edges) {
      for (const edge of designData.edges) {
        if (!nodeIds.includes(edge.source)) {
          errors.push({
            code: ValidationCodes.MISSING_REFERENCE,
            message: `Edge source "${edge.source}" not found`,
            severity: 'error',
          });
        }
        if (!nodeIds.includes(edge.target)) {
          errors.push({
            code: ValidationCodes.MISSING_REFERENCE,
            message: `Edge target "${edge.target}" not found`,
            severity: 'error',
          });
        }
      }
    }

    // Group nodes by layer
    const networkNodes = designData.nodes.filter((n) => n.layer === 'network');
    const platformNodes = designData.nodes.filter((n) => n.layer === 'platform');
    const devopsNodes = designData.nodes.filter((n) => n.layer === 'devops');

    // Validate each layer
    if (networkNodes.length > 0) {
      const networkResult = await this.validateNetworkLayer({
        nodes: networkNodes,
        edges: designData.edges.filter(
          (e) =>
            networkNodes.some((n) => n.id === e.source) ||
            networkNodes.some((n) => n.id === e.target)
        ),
      });
      errors.push(...networkResult.errors);
      warnings.push(...networkResult.warnings);
      layersValidated.push('network');
    }

    if (platformNodes.length > 0) {
      const platformResult = await this.validatePlatformLayer({
        nodes: platformNodes,
        edges: designData.edges.filter(
          (e) =>
            platformNodes.some((n) => n.id === e.source) ||
            platformNodes.some((n) => n.id === e.target)
        ),
      });
      errors.push(...platformResult.errors);
      warnings.push(...platformResult.warnings);
      layersValidated.push('platform');
    }

    if (devopsNodes.length > 0) {
      const devopsResult = await this.validateDevOpsLayer({
        nodes: devopsNodes,
        edges: designData.edges.filter(
          (e) =>
            devopsNodes.some((n) => n.id === e.source) ||
            devopsNodes.some((n) => n.id === e.target)
        ),
      });
      errors.push(...devopsResult.errors);
      warnings.push(...devopsResult.warnings);
      layersValidated.push('devops');
    }

    // Best practices validation
    const bestPractices = this.validateBestPractices(designData.nodes);
    warnings.push(...bestPractices.warnings);
    info.push(...bestPractices.info);

    logger.info('Design validation complete', {
      designId,
      valid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
    });

    return this.buildReport(errors, warnings, info, layersValidated);
  }

  /**
   * Validate network layer
   */
  async validateNetworkLayer(data: LayerData): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const vpcNodes = data.nodes.filter((n) => n.type === 'vpc');
    const subnetNodes = data.nodes.filter((n) => n.type === 'subnet');
    const igwNodes = data.nodes.filter((n) => n.type === 'internet_gateway');
    const natNodes = data.nodes.filter((n) => n.type === 'nat_gateway');

    // Must have at least one VPC
    if (vpcNodes.length === 0) {
      errors.push({
        code: ValidationCodes.MISSING_VPC,
        message: 'Network layer must have at least one VPC',
        severity: 'error',
      });
    }

    // Multiple VPCs warning
    if (vpcNodes.length > 1) {
      warnings.push({
        code: 'MULTIPLE_VPCS',
        message: `Multiple VPCs detected (${vpcNodes.length}) - ensure this is intentional`,
        severity: 'warning',
      });
    }

    // Validate VPC CIDRs
    for (const vpc of vpcNodes) {
      if (!vpc.data.cidr && !vpc.data.cidrBlock) {
        errors.push({
          code: ValidationCodes.REQUIRED_FIELD,
          message: `VPC "${vpc.data.name || vpc.id}" requires CIDR block`,
          nodeId: vpc.id,
          severity: 'error',
        });
      } else {
        const cidr = vpc.data.cidr || vpc.data.cidrBlock;
        const cidrValidation = this.validateCIDR(cidr, 16, 24);
        if (!cidrValidation.valid) {
          errors.push({
            code: ValidationCodes.INVALID_VPC_CIDR,
            message: cidrValidation.message,
            nodeId: vpc.id,
            severity: 'error',
          });
        }
      }
    }

    // Must have at least one subnet
    if (subnetNodes.length === 0 && vpcNodes.length > 0) {
      errors.push({
        code: ValidationCodes.MISSING_SUBNET,
        message: 'Network layer must have at least one subnet',
        severity: 'error',
      });
    }

    // Validate subnet CIDRs
    const subnetCidrs: { nodeId: string; cidr: string }[] = [];
    for (const subnet of subnetNodes) {
      const cidr = subnet.data.cidr || subnet.data.cidrBlock;
      if (!cidr) {
        errors.push({
          code: ValidationCodes.REQUIRED_FIELD,
          message: `Subnet "${subnet.data.name || subnet.id}" requires CIDR block`,
          nodeId: subnet.id,
          severity: 'error',
        });
      } else {
        const cidrValidation = this.validateCIDR(cidr, 16, 28);
        if (!cidrValidation.valid) {
          errors.push({
            code: ValidationCodes.INVALID_SUBNET_CIDR,
            message: cidrValidation.message,
            nodeId: subnet.id,
            severity: 'error',
          });
        } else {
          subnetCidrs.push({ nodeId: subnet.id, cidr });
        }

        // Check subnet is within VPC
        if (vpcNodes.length > 0) {
          const vpcCidr = vpcNodes[0].data.cidr || vpcNodes[0].data.cidrBlock;
          if (vpcCidr && !this.isSubnetInVPC(cidr, vpcCidr)) {
            errors.push({
              code: ValidationCodes.SUBNET_NOT_IN_VPC,
              message: `Subnet CIDR ${cidr} is not within VPC CIDR ${vpcCidr}`,
              nodeId: subnet.id,
              severity: 'error',
            });
          }
        }
      }
    }

    // Check for CIDR overlaps
    const overlaps = this.findCIDROverlaps(subnetCidrs);
    for (const overlap of overlaps) {
      errors.push({
        code: ValidationCodes.CIDR_OVERLAP,
        message: `Subnet CIDR ${overlap.cidr1} overlaps with ${overlap.cidr2}`,
        nodeId: overlap.nodeId,
        severity: 'error',
      });
    }

    // Check for public/private subnet configuration
    const publicSubnets = subnetNodes.filter((s) => s.data.isPublic || s.data.mapPublicIpOnLaunch);
    const privateSubnets = subnetNodes.filter(
      (s) => !s.data.isPublic && !s.data.mapPublicIpOnLaunch
    );

    if (publicSubnets.length > 0 && igwNodes.length === 0) {
      errors.push({
        code: ValidationCodes.MISSING_IGW,
        message: 'Public subnets require an Internet Gateway',
        severity: 'error',
      });
    }

    if (privateSubnets.length > 0 && natNodes.length === 0) {
      warnings.push({
        code: ValidationCodes.MISSING_NAT,
        message: 'Private subnets without NAT Gateway cannot access internet',
        severity: 'warning',
      });
    }

    // Check AZ distribution
    const azs = new Set(subnetNodes.map((s) => s.data.availabilityZone).filter(Boolean));
    if (azs.size === 1 && subnetNodes.length > 1) {
      warnings.push({
        code: ValidationCodes.INSUFFICIENT_AZS,
        message: 'All subnets in same AZ - consider multi-AZ for high availability',
        severity: 'warning',
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate platform layer
   */
  async validatePlatformLayer(data: LayerData): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const eksNodes = data.nodes.filter((n) => n.type === 'eks_cluster');
    const nodeGroupNodes = data.nodes.filter((n) => n.type === 'eks_node_group');
    const rdsNodes = data.nodes.filter((n) => n.type === 'rds_instance' || n.type === 'rds_aurora');
    const albNodes = data.nodes.filter((n) => n.type === 'alb' || n.type === 'nlb');

    // EKS cluster validation
    for (const eks of eksNodes) {
      // Must have at least one node group
      const hasNodeGroup = nodeGroupNodes.some(
        (ng) => ng.data.clusterName === eks.data.name || ng.parentId === eks.id
      );
      if (!hasNodeGroup) {
        errors.push({
          code: ValidationCodes.EKS_NO_NODE_GROUPS,
          message: `EKS cluster "${eks.data.name || eks.id}" must have at least one node group`,
          nodeId: eks.id,
          severity: 'error',
        });
      }

      // Validate Kubernetes version
      if (eks.data.version) {
        const validVersions = ['1.28', '1.29', '1.30', '1.31'];
        if (!validVersions.includes(eks.data.version)) {
          warnings.push({
            code: 'OUTDATED_K8S_VERSION',
            message: `EKS version ${eks.data.version} may be outdated`,
            nodeId: eks.id,
            severity: 'warning',
          });
        }
      }
    }

    // RDS validation
    for (const rds of rdsNodes) {
      // Warn about subnet configuration
      if (!rds.data.subnetGroupName && !rds.data.subnetIds) {
        warnings.push({
          code: ValidationCodes.RDS_NO_SUBNET_GROUP,
          message: `RDS "${rds.data.name || rds.id}" has no subnet group - will use default`,
          nodeId: rds.id,
          severity: 'warning',
        });
      }

      // Validate instance class
      if (rds.data.instanceClass) {
        const validClasses = [
          'db.t3.micro',
          'db.t3.small',
          'db.t3.medium',
          'db.t3.large',
          'db.r5.large',
          'db.r5.xlarge',
          'db.r5.2xlarge',
          'db.m5.large',
          'db.m5.xlarge',
        ];
        if (!validClasses.includes(rds.data.instanceClass)) {
          warnings.push({
            code: ValidationCodes.INVALID_INSTANCE_TYPE,
            message: `RDS instance class "${rds.data.instanceClass}" may not be valid`,
            nodeId: rds.id,
            severity: 'warning',
          });
        }
      }

      // Warn about single AZ for production
      if (!rds.data.multiAz && !rds.data.multiAZ) {
        warnings.push({
          code: 'SINGLE_AZ_DATABASE',
          message: `RDS "${rds.data.name || rds.id}" is single-AZ - consider Multi-AZ for production`,
          nodeId: rds.id,
          severity: 'warning',
        });
      }
    }

    // Load balancer validation
    for (const alb of albNodes) {
      const subnets = alb.data.subnets || alb.data.subnetIds || [];
      if (subnets.length < 2) {
        errors.push({
          code: ValidationCodes.ALB_INSUFFICIENT_SUBNETS,
          message: `Load balancer "${alb.data.name || alb.id}" requires at least 2 subnets in different AZs`,
          nodeId: alb.id,
          severity: 'error',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate DevOps layer
   */
  async validateDevOpsLayer(data: LayerData): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const pipelineNodes = data.nodes.filter((n) => n.type === 'codepipeline');
    const iamNodes = data.nodes.filter((n) => n.type === 'iam_role');
    const alarmNodes = data.nodes.filter((n) => n.type === 'cloudwatch_alarm');

    // Pipeline validation
    for (const pipeline of pipelineNodes) {
      // Check for source stage
      const stages = pipeline.data.stages || [];
      const hasSource = stages.some(
        (s: any) => s.type === 'Source' || s.name?.toLowerCase().includes('source')
      );
      if (stages.length > 0 && !hasSource) {
        errors.push({
          code: ValidationCodes.PIPELINE_NO_SOURCE,
          message: `Pipeline "${pipeline.data.name || pipeline.id}" must have a source stage`,
          nodeId: pipeline.id,
          severity: 'error',
        });
      }
    }

    // IAM role validation
    for (const iam of iamNodes) {
      if (iam.data.assumeRolePolicy) {
        const policyValidation = this.validateIAMPolicyBasic(iam.data.assumeRolePolicy);
        if (!policyValidation.valid) {
          for (const error of policyValidation.errors) {
            errors.push({
              code: ValidationCodes.IAM_INVALID_POLICY,
              message: `IAM role "${iam.data.name || iam.id}": ${error}`,
              nodeId: iam.id,
              severity: 'error',
            });
          }
        }
      }
    }

    // CloudWatch alarm validation
    for (const alarm of alarmNodes) {
      if (!alarm.data.metricName) {
        errors.push({
          code: ValidationCodes.ALARM_INVALID_METRIC,
          message: `Alarm "${alarm.data.name || alarm.id}" requires a metric name`,
          nodeId: alarm.id,
          severity: 'error',
        });
      }
      if (!alarm.data.namespace) {
        warnings.push({
          code: 'ALARM_MISSING_NAMESPACE',
          message: `Alarm "${alarm.data.name || alarm.id}" has no namespace specified`,
          nodeId: alarm.id,
          severity: 'warning',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Check AWS service quotas
   */
  async checkAWSQuotas(
    accountId: string,
    region: string,
    requiredResources: Record<string, number>
  ): Promise<QuotaCheck[]> {
    logger.info('Checking AWS quotas', { accountId, region, requiredResources });

    // Default quota limits (would be fetched from AWS Service Quotas API in production)
    const defaultLimits: Record<string, number> = {
      vpc: 5,
      subnet: 200,
      internet_gateway: 5,
      nat_gateway: 5,
      security_group: 2500,
      elastic_ip: 5,
      eks_cluster: 100,
      rds_instance: 40,
      alb: 50,
      nlb: 50,
    };

    const results: QuotaCheck[] = [];

    for (const [resource, required] of Object.entries(requiredResources)) {
      const limit = defaultLimits[resource] || 100;
      // In production, would fetch current usage from AWS APIs
      const currentUsage = 0;
      const available = limit - currentUsage;

      results.push({
        quotaName: resource,
        serviceName: this.getServiceForResource(resource),
        currentUsage,
        limit,
        available,
        sufficient: available >= required,
      });
    }

    return results;
  }

  /**
   * Validate IAM policy (full validation)
   */
  async validateIAMPolicy(policyJson: string): Promise<PolicyValidation> {
    return this.validateIAMPolicyBasic(policyJson);
  }

  /**
   * Basic IAM policy validation
   */
  private validateIAMPolicyBasic(policyInput: string | object): PolicyValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    let policy: any;

    if (typeof policyInput === 'string') {
      try {
        policy = JSON.parse(policyInput);
      } catch {
        errors.push('Invalid JSON format');
        return { valid: false, errors, warnings };
      }
    } else {
      policy = policyInput;
    }

    // Check required fields
    if (!policy.Version) {
      warnings.push('Policy Version not specified, defaulting to 2012-10-17');
    } else if (policy.Version !== '2012-10-17') {
      warnings.push(`Unexpected policy version: ${policy.Version}`);
    }

    if (!policy.Statement) {
      errors.push('Policy must have Statement array');
      return { valid: false, errors, warnings };
    }

    if (!Array.isArray(policy.Statement)) {
      errors.push('Statement must be an array');
      return { valid: false, errors, warnings };
    }

    // Validate each statement
    for (let i = 0; i < policy.Statement.length; i++) {
      const stmt = policy.Statement[i];

      if (!stmt.Effect) {
        errors.push(`Statement ${i}: Missing Effect`);
      } else if (!['Allow', 'Deny'].includes(stmt.Effect)) {
        errors.push(`Statement ${i}: Invalid Effect "${stmt.Effect}"`);
      }

      if (!stmt.Action && !stmt.NotAction) {
        errors.push(`Statement ${i}: Missing Action or NotAction`);
      }

      if (!stmt.Resource && !stmt.NotResource) {
        errors.push(`Statement ${i}: Missing Resource or NotResource`);
      }

      // Check for overly permissive policies
      const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
      const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];

      if (actions.includes('*') && stmt.Effect === 'Allow') {
        warnings.push(`Statement ${i}: Allows all actions - consider restricting`);
      }

      if (resources.includes('*') && stmt.Effect === 'Allow') {
        warnings.push(`Statement ${i}: Applies to all resources - consider restricting`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate best practices
   */
  private validateBestPractices(nodes: DesignNode[]): {
    warnings: ValidationWarning[];
    info: { code: string; message: string }[];
  } {
    const warnings: ValidationWarning[] = [];
    const info: { code: string; message: string }[] = [];

    // Check for encryption at rest
    const rdsNodes = nodes.filter((n) => n.type === 'rds_instance' || n.type === 'rds_aurora');
    for (const rds of rdsNodes) {
      if (!rds.data.storageEncrypted && !rds.data.encrypted) {
        warnings.push({
          code: 'ENCRYPTION_AT_REST',
          message: `RDS "${rds.data.name || rds.id}" does not have encryption at rest enabled`,
          nodeId: rds.id,
          severity: 'warning',
        });
      }
    }

    // Check for backup configuration
    for (const rds of rdsNodes) {
      if (!rds.data.backupRetentionPeriod && rds.data.backupRetentionPeriod !== 0) {
        info.push({
          code: 'BACKUP_CONFIG',
          message: `RDS "${rds.data.name || rds.id}": Consider setting backup retention period`,
        });
      }
    }

    // Check EKS for private endpoint
    const eksNodes = nodes.filter((n) => n.type === 'eks_cluster');
    for (const eks of eksNodes) {
      if (eks.data.endpointPublicAccess !== false) {
        info.push({
          code: 'EKS_PUBLIC_ENDPOINT',
          message: `EKS "${eks.data.name || eks.id}": Consider disabling public endpoint access`,
        });
      }
    }

    // Check S3 buckets for versioning
    const s3Nodes = nodes.filter((n) => n.type === 's3_bucket');
    for (const s3 of s3Nodes) {
      if (!s3.data.versioning?.enabled) {
        info.push({
          code: 'S3_VERSIONING',
          message: `S3 "${s3.data.name || s3.id}": Consider enabling versioning`,
        });
      }
    }

    return { warnings, info };
  }

  /**
   * Validate CIDR block
   */
  private validateCIDR(
    cidr: string,
    minPrefix: number,
    maxPrefix: number
  ): { valid: boolean; message: string } {
    if (!CIDR_REGEX.test(cidr)) {
      return { valid: false, message: `Invalid CIDR format: ${cidr}` };
    }

    const [ip, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    // Validate prefix
    if (prefix < minPrefix || prefix > maxPrefix) {
      return {
        valid: false,
        message: `CIDR prefix /${prefix} must be between /${minPrefix} and /${maxPrefix}`,
      };
    }

    // Validate IP octets
    const octets = ip.split('.').map(Number);
    for (const octet of octets) {
      if (octet < 0 || octet > 255) {
        return { valid: false, message: `Invalid IP octet in CIDR: ${cidr}` };
      }
    }

    return { valid: true, message: '' };
  }

  /**
   * Check if subnet CIDR is within VPC CIDR
   */
  private isSubnetInVPC(subnetCidr: string, vpcCidr: string): boolean {
    const [subnetIp, subnetPrefix] = subnetCidr.split('/');
    const [vpcIp, vpcPrefix] = vpcCidr.split('/');

    const subnetNum = this.ipToNumber(subnetIp);
    const vpcNum = this.ipToNumber(vpcIp);

    const vpcMask = ~((1 << (32 - parseInt(vpcPrefix))) - 1) >>> 0;

    return (subnetNum & vpcMask) === (vpcNum & vpcMask);
  }

  /**
   * Find CIDR overlaps
   */
  private findCIDROverlaps(
    cidrs: { nodeId: string; cidr: string }[]
  ): { nodeId: string; cidr1: string; cidr2: string }[] {
    const overlaps: { nodeId: string; cidr1: string; cidr2: string }[] = [];

    for (let i = 0; i < cidrs.length; i++) {
      for (let j = i + 1; j < cidrs.length; j++) {
        if (this.cidrsOverlap(cidrs[i].cidr, cidrs[j].cidr)) {
          overlaps.push({
            nodeId: cidrs[i].nodeId,
            cidr1: cidrs[i].cidr,
            cidr2: cidrs[j].cidr,
          });
        }
      }
    }

    return overlaps;
  }

  /**
   * Check if two CIDRs overlap
   */
  private cidrsOverlap(cidr1: string, cidr2: string): boolean {
    try {
      const [ip1, prefix1] = cidr1.split('/');
      const [ip2, prefix2] = cidr2.split('/');

      const ip1Num = this.ipToNumber(ip1);
      const ip2Num = this.ipToNumber(ip2);

      const mask1 = ~((1 << (32 - parseInt(prefix1))) - 1) >>> 0;
      const mask2 = ~((1 << (32 - parseInt(prefix2))) - 1) >>> 0;

      const network1 = (ip1Num & mask1) >>> 0;
      const network2 = (ip2Num & mask2) >>> 0;

      const broadcastMask = Math.min(parseInt(prefix1), parseInt(prefix2));
      const commonMask = ~((1 << (32 - broadcastMask)) - 1) >>> 0;

      return ((network1 & commonMask) >>> 0) === ((network2 & commonMask) >>> 0);
    } catch {
      return false;
    }
  }

  /**
   * Convert IP to number
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  /**
   * Get AWS service name for resource type
   */
  private getServiceForResource(resource: string): string {
    const serviceMap: Record<string, string> = {
      vpc: 'Amazon VPC',
      subnet: 'Amazon VPC',
      internet_gateway: 'Amazon VPC',
      nat_gateway: 'Amazon VPC',
      security_group: 'Amazon VPC',
      elastic_ip: 'Amazon EC2',
      eks_cluster: 'Amazon EKS',
      rds_instance: 'Amazon RDS',
      alb: 'Elastic Load Balancing',
      nlb: 'Elastic Load Balancing',
    };
    return serviceMap[resource] || 'Unknown';
  }

  /**
   * Build validation report
   */
  private buildReport(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    info: { code: string; message: string }[],
    layersValidated: LayerType[]
  ): ValidationReport {
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        totalInfo: info.length,
        layersValidated,
      },
    };
  }
}

// Export singleton instance
export const validationService = new ValidationService();
