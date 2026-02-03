/**
 * Unit Tests for TerraformGenerator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TerraformGenerator } from '../TerraformGenerator.js';
import { DesignNode, Environment } from '../../types/designer.js';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    visualDesign: {
      findUnique: vi.fn(),
    },
  })),
}));

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('TerraformGenerator', () => {
  let generator: TerraformGenerator;

  beforeEach(() => {
    generator = new TerraformGenerator();
  });

  describe('generateLayerModule', () => {
    it('should generate VPC resource', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'vpc-1',
          type: 'vpc',
          position: { x: 0, y: 0 },
          data: { name: 'main-vpc', cidr: '10.0.0.0/16' },
          layer: 'network',
        },
      ];

      const module = await generator.generateLayerModule('network', nodes, [], new Map(), 'production');

      expect(module.name).toBe('network');
      expect(module.layer).toBe('network');

      const mainTf = module.files.find((f) => f.name === 'main.tf');
      expect(mainTf).toBeDefined();
      expect(mainTf?.content).toContain('resource "aws_vpc"');
      expect(mainTf?.content).toContain('10.0.0.0/16');
      expect(mainTf?.content).toContain('enable_dns_hostnames');
    });

    it('should generate subnet resource', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'subnet-1',
          type: 'subnet',
          position: { x: 0, y: 0 },
          data: {
            name: 'public-subnet',
            cidr: '10.0.1.0/24',
            availabilityZone: 'us-east-1a',
            isPublic: true,
          },
          layer: 'network',
        },
      ];

      const module = await generator.generateLayerModule('network', nodes, [], new Map(), 'production');
      const mainTf = module.files.find((f) => f.name === 'main.tf');

      expect(mainTf?.content).toContain('resource "aws_subnet"');
      expect(mainTf?.content).toContain('10.0.1.0/24');
      expect(mainTf?.content).toContain('us-east-1a');
      expect(mainTf?.content).toContain('map_public_ip_on_launch = true');
    });

    it('should generate security group with rules', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'sg-1',
          type: 'security_group',
          position: { x: 0, y: 0 },
          data: {
            name: 'web-sg',
            description: 'Web security group',
            ingressRules: [
              { fromPort: 80, toPort: 80, protocol: 'tcp', cidrBlocks: ['0.0.0.0/0'] },
              { fromPort: 443, toPort: 443, protocol: 'tcp', cidrBlocks: ['0.0.0.0/0'] },
            ],
          },
          layer: 'network',
        },
      ];

      const module = await generator.generateLayerModule('network', nodes, [], new Map(), 'production');
      const mainTf = module.files.find((f) => f.name === 'main.tf');

      expect(mainTf?.content).toContain('resource "aws_security_group"');
      expect(mainTf?.content).toContain('from_port   = 80');
      expect(mainTf?.content).toContain('from_port   = 443');
      expect(mainTf?.content).toContain('protocol    = "tcp"');
    });

    it('should generate EKS cluster', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'eks-1',
          type: 'eks_cluster',
          position: { x: 0, y: 0 },
          data: {
            name: 'my-cluster',
            version: '1.29',
            endpointPrivateAccess: true,
            endpointPublicAccess: false,
          },
          layer: 'platform',
        },
      ];

      const module = await generator.generateLayerModule('platform', nodes, [], new Map(), 'production');
      const mainTf = module.files.find((f) => f.name === 'main.tf');

      expect(mainTf?.content).toContain('resource "aws_eks_cluster"');
      expect(mainTf?.content).toContain('version  = "1.29"');
      expect(mainTf?.content).toContain('endpoint_private_access = true');
      expect(mainTf?.content).toContain('endpoint_public_access  = false');
    });

    it('should generate EKS node group with scaling config', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'ng-1',
          type: 'eks_node_group',
          position: { x: 0, y: 0 },
          data: {
            name: 'main-nodes',
            instanceTypes: ['t3.medium'],
            desiredSize: 3,
            minSize: 1,
            maxSize: 5,
            capacityType: 'ON_DEMAND',
          },
          layer: 'platform',
        },
      ];

      const module = await generator.generateLayerModule('platform', nodes, [], new Map(), 'production');
      const mainTf = module.files.find((f) => f.name === 'main.tf');

      expect(mainTf?.content).toContain('resource "aws_eks_node_group"');
      expect(mainTf?.content).toContain('desired_size = 3');
      expect(mainTf?.content).toContain('min_size     = 1');
      expect(mainTf?.content).toContain('max_size     = 5');
      expect(mainTf?.content).toContain('instance_types = ["t3.medium"]');
    });

    it('should generate RDS instance', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'rds-1',
          type: 'rds_instance',
          position: { x: 0, y: 0 },
          data: {
            identifier: 'my-db',
            engine: 'postgres',
            engineVersion: '14',
            instanceClass: 'db.t3.medium',
            allocatedStorage: 50,
            multiAz: true,
          },
          layer: 'platform',
        },
      ];

      const module = await generator.generateLayerModule('platform', nodes, [], new Map(), 'production');
      const mainTf = module.files.find((f) => f.name === 'main.tf');

      expect(mainTf?.content).toContain('resource "aws_db_instance"');
      expect(mainTf?.content).toContain('engine         = "postgres"');
      expect(mainTf?.content).toContain('instance_class = "db.t3.medium"');
      expect(mainTf?.content).toContain('allocated_storage     = 50');
      expect(mainTf?.content).toContain('multi_az               = true');
    });

    it('should generate ALB', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'alb-1',
          type: 'alb',
          position: { x: 0, y: 0 },
          data: {
            name: 'my-alb',
            internal: false,
          },
          layer: 'platform',
        },
      ];

      const module = await generator.generateLayerModule('platform', nodes, [], new Map(), 'production');
      const mainTf = module.files.find((f) => f.name === 'main.tf');

      expect(mainTf?.content).toContain('resource "aws_lb"');
      expect(mainTf?.content).toContain('load_balancer_type = "application"');
      expect(mainTf?.content).toContain('internal           = false');
    });

    it('should generate S3 bucket with versioning', async () => {
      const nodes: DesignNode[] = [
        {
          id: 's3-1',
          type: 's3_bucket',
          position: { x: 0, y: 0 },
          data: {
            bucket: 'my-unique-bucket',
            versioning: { enabled: true },
          },
          layer: 'platform',
        },
      ];

      const module = await generator.generateLayerModule('platform', nodes, [], new Map(), 'production');
      const mainTf = module.files.find((f) => f.name === 'main.tf');

      expect(mainTf?.content).toContain('resource "aws_s3_bucket"');
      expect(mainTf?.content).toContain('aws_s3_bucket_versioning');
      expect(mainTf?.content).toContain('status = "Enabled"');
    });

    it('should generate CodePipeline', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'pipeline-1',
          type: 'codepipeline',
          position: { x: 0, y: 0 },
          data: {
            name: 'my-pipeline',
            repositoryId: 'owner/repo',
            branch: 'main',
          },
          layer: 'devops',
        },
      ];

      const module = await generator.generateLayerModule('devops', nodes, [], new Map(), 'production');
      const mainTf = module.files.find((f) => f.name === 'main.tf');

      expect(mainTf?.content).toContain('resource "aws_codepipeline"');
      expect(mainTf?.content).toContain('stage');
      expect(mainTf?.content).toContain('Source');
      expect(mainTf?.content).toContain('Build');
    });

    it('should generate IAM role', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'role-1',
          type: 'iam_role',
          position: { x: 0, y: 0 },
          data: {
            roleName: 'my-role',
            assumeRolePolicy: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { Service: 'lambda.amazonaws.com' },
                  Action: 'sts:AssumeRole',
                },
              ],
            },
          },
          layer: 'devops',
        },
      ];

      const module = await generator.generateLayerModule('devops', nodes, [], new Map(), 'production');
      const mainTf = module.files.find((f) => f.name === 'main.tf');

      expect(mainTf?.content).toContain('resource "aws_iam_role"');
      expect(mainTf?.content).toContain('assume_role_policy');
      expect(mainTf?.content).toContain('lambda.amazonaws.com');
    });
  });

  describe('generateVariables', () => {
    it('should generate environment variable', () => {
      const result = generator.generateVariables([], 'production');

      expect(result.content).toContain('variable "environment"');
      expect(result.content).toContain('default     = "production"');
      expect(result.variables).toContainEqual(
        expect.objectContaining({
          name: 'environment',
          type: 'string',
        })
      );
    });

    it('should generate aws_region variable', () => {
      const result = generator.generateVariables([], 'production');

      expect(result.content).toContain('variable "aws_region"');
      expect(result.variables).toContainEqual(
        expect.objectContaining({
          name: 'aws_region',
          type: 'string',
        })
      );
    });
  });

  describe('generateBackendConfig', () => {
    it('should generate local backend', () => {
      const result = generator.generateBackendConfig({ backend: 'local' });

      expect(result.type).toBe('local');
      expect(result.content).toContain('backend "local"');
    });

    it('should generate S3 backend', () => {
      const result = generator.generateBackendConfig({
        backend: 's3',
        bucket: 'my-tf-state',
        key: 'terraform.tfstate',
        region: 'us-east-1',
        dynamodbTable: 'tf-locks',
      });

      expect(result.type).toBe('s3');
      expect(result.content).toContain('backend "s3"');
      expect(result.content).toContain('bucket         = "my-tf-state"');
      expect(result.content).toContain('dynamodb_table = "tf-locks"');
      expect(result.content).toContain('encrypt        = true');
    });

    it('should generate Terraform Cloud backend', () => {
      const result = generator.generateBackendConfig({
        backend: 'remote',
        organization: 'my-org',
        workspace: 'production',
      });

      expect(result.type).toBe('remote');
      expect(result.content).toContain('cloud {');
      expect(result.content).toContain('organization = "my-org"');
      expect(result.content).toContain('name = "production"');
    });
  });

  describe('generateProvider', () => {
    it('should generate AWS provider with default tags', () => {
      const result = generator.generateProvider('us-west-2');

      expect(result).toContain('provider "aws"');
      expect(result).toContain('region = var.aws_region');
      expect(result).toContain('default_tags');
      expect(result).toContain('ManagedBy   = "terraform"');
    });

    it('should include required providers block', () => {
      const result = generator.generateProvider('us-east-1');

      expect(result).toContain('required_providers');
      expect(result).toContain('source  = "hashicorp/aws"');
      expect(result).toContain('version = "~> 5.0"');
    });
  });

  describe('generateOutputs', () => {
    it('should generate outputs for VPC', () => {
      const nodes: DesignNode[] = [
        {
          id: 'vpc-1',
          type: 'vpc',
          position: { x: 0, y: 0 },
          data: { name: 'main-vpc' },
          layer: 'network',
        },
      ];

      const result = generator.generateOutputs(nodes);

      expect(result.content).toContain('output "vpc_main_vpc_id"');
    });

    it('should generate ARN outputs for resources that have them', () => {
      const nodes: DesignNode[] = [
        {
          id: 'eks-1',
          type: 'eks_cluster',
          position: { x: 0, y: 0 },
          data: { name: 'my-cluster' },
          layer: 'platform',
        },
        {
          id: 'role-1',
          type: 'iam_role',
          position: { x: 100, y: 0 },
          data: { name: 'my-role' },
          layer: 'devops',
        },
      ];

      const result = generator.generateOutputs(nodes);

      expect(result.content).toContain('_arn"');
      expect(result.outputs.some((o) => o.name.includes('arn'))).toBe(true);
    });
  });
});
