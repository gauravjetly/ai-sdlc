/**
 * Unit Tests for ValidationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationService, ValidationCodes } from '../ValidationService.js';
import { DesignNode, LayerData } from '../../types/designer.js';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    visualDesign: {
      findUnique: vi.fn(),
    },
    aWSCredential: {
      findFirst: vi.fn(),
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

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validateNetworkLayer', () => {
    it('should return error when no VPC present', async () => {
      const layerData: LayerData = {
        nodes: [],
        edges: [],
      };

      const result = await service.validateNetworkLayer(layerData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.MISSING_VPC,
        })
      );
    });

    it('should return error when VPC has no CIDR', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'vpc-1',
            type: 'vpc',
            position: { x: 0, y: 0 },
            data: { name: 'main-vpc' },
            layer: 'network',
          },
        ],
        edges: [],
      };

      const result = await service.validateNetworkLayer(layerData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.REQUIRED_FIELD,
          nodeId: 'vpc-1',
        })
      );
    });

    it('should return error for invalid VPC CIDR', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'vpc-1',
            type: 'vpc',
            position: { x: 0, y: 0 },
            data: { name: 'main-vpc', cidr: '10.0.0.0/8' }, // Too large
            layer: 'network',
          },
        ],
        edges: [],
      };

      const result = await service.validateNetworkLayer(layerData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.INVALID_VPC_CIDR,
        })
      );
    });

    it('should pass validation for valid VPC and subnet', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'vpc-1',
            type: 'vpc',
            position: { x: 0, y: 0 },
            data: { name: 'main-vpc', cidr: '10.0.0.0/16' },
            layer: 'network',
          },
          {
            id: 'subnet-1',
            type: 'subnet',
            position: { x: 100, y: 0 },
            data: { name: 'public-subnet', cidr: '10.0.1.0/24', availabilityZone: 'us-east-1a' },
            layer: 'network',
            parentId: 'vpc-1',
          },
        ],
        edges: [],
      };

      const result = await service.validateNetworkLayer(layerData);

      expect(result.errors).toHaveLength(0);
    });

    it('should detect CIDR overlap', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'vpc-1',
            type: 'vpc',
            position: { x: 0, y: 0 },
            data: { name: 'main-vpc', cidr: '10.0.0.0/16' },
            layer: 'network',
          },
          {
            id: 'subnet-1',
            type: 'subnet',
            position: { x: 100, y: 0 },
            data: { name: 'subnet-a', cidr: '10.0.1.0/24', availabilityZone: 'us-east-1a' },
            layer: 'network',
          },
          {
            id: 'subnet-2',
            type: 'subnet',
            position: { x: 200, y: 0 },
            data: { name: 'subnet-b', cidr: '10.0.1.0/24', availabilityZone: 'us-east-1b' }, // Same CIDR!
            layer: 'network',
          },
        ],
        edges: [],
      };

      const result = await service.validateNetworkLayer(layerData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.CIDR_OVERLAP,
        })
      );
    });

    it('should warn when public subnets exist without IGW', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'vpc-1',
            type: 'vpc',
            position: { x: 0, y: 0 },
            data: { name: 'main-vpc', cidr: '10.0.0.0/16' },
            layer: 'network',
          },
          {
            id: 'subnet-1',
            type: 'subnet',
            position: { x: 100, y: 0 },
            data: { name: 'public-subnet', cidr: '10.0.1.0/24', isPublic: true },
            layer: 'network',
          },
        ],
        edges: [],
      };

      const result = await service.validateNetworkLayer(layerData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.MISSING_IGW,
        })
      );
    });

    it('should warn when all subnets are in same AZ', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'vpc-1',
            type: 'vpc',
            position: { x: 0, y: 0 },
            data: { name: 'main-vpc', cidr: '10.0.0.0/16' },
            layer: 'network',
          },
          {
            id: 'subnet-1',
            type: 'subnet',
            position: { x: 100, y: 0 },
            data: { name: 'subnet-a', cidr: '10.0.1.0/24', availabilityZone: 'us-east-1a' },
            layer: 'network',
          },
          {
            id: 'subnet-2',
            type: 'subnet',
            position: { x: 200, y: 0 },
            data: { name: 'subnet-b', cidr: '10.0.2.0/24', availabilityZone: 'us-east-1a' }, // Same AZ!
            layer: 'network',
          },
        ],
        edges: [],
      };

      const result = await service.validateNetworkLayer(layerData);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.INSUFFICIENT_AZS,
        })
      );
    });
  });

  describe('validatePlatformLayer', () => {
    it('should return error when EKS cluster has no node groups', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'eks-1',
            type: 'eks_cluster',
            position: { x: 0, y: 0 },
            data: { name: 'my-cluster' },
            layer: 'platform',
          },
        ],
        edges: [],
      };

      const result = await service.validatePlatformLayer(layerData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.EKS_NO_NODE_GROUPS,
        })
      );
    });

    it('should pass when EKS cluster has node groups', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'eks-1',
            type: 'eks_cluster',
            position: { x: 0, y: 0 },
            data: { name: 'my-cluster' },
            layer: 'platform',
          },
          {
            id: 'ng-1',
            type: 'eks_node_group',
            position: { x: 100, y: 0 },
            data: { clusterName: 'my-cluster' },
            layer: 'platform',
          },
        ],
        edges: [],
      };

      const result = await service.validatePlatformLayer(layerData);

      expect(result.errors.filter((e) => e.code === ValidationCodes.EKS_NO_NODE_GROUPS)).toHaveLength(0);
    });

    it('should warn about single-AZ database', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'rds-1',
            type: 'rds_instance',
            position: { x: 0, y: 0 },
            data: { name: 'my-db', multiAz: false },
            layer: 'platform',
          },
        ],
        edges: [],
      };

      const result = await service.validatePlatformLayer(layerData);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'SINGLE_AZ_DATABASE',
        })
      );
    });

    it('should return error for ALB with insufficient subnets', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'alb-1',
            type: 'alb',
            position: { x: 0, y: 0 },
            data: { name: 'my-alb', subnets: ['subnet-1'] }, // Only 1 subnet
            layer: 'platform',
          },
        ],
        edges: [],
      };

      const result = await service.validatePlatformLayer(layerData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.ALB_INSUFFICIENT_SUBNETS,
        })
      );
    });
  });

  describe('validateDevOpsLayer', () => {
    it('should return error when pipeline has no source stage', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'pipeline-1',
            type: 'codepipeline',
            position: { x: 0, y: 0 },
            data: {
              name: 'my-pipeline',
              stages: [{ name: 'Build', type: 'Build' }],
            },
            layer: 'devops',
          },
        ],
        edges: [],
      };

      const result = await service.validateDevOpsLayer(layerData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.PIPELINE_NO_SOURCE,
        })
      );
    });

    it('should return error for alarm without metric name', async () => {
      const layerData: LayerData = {
        nodes: [
          {
            id: 'alarm-1',
            type: 'cloudwatch_alarm',
            position: { x: 0, y: 0 },
            data: { name: 'my-alarm' }, // Missing metricName
            layer: 'devops',
          },
        ],
        edges: [],
      };

      const result = await service.validateDevOpsLayer(layerData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ValidationCodes.ALARM_INVALID_METRIC,
        })
      );
    });
  });

  describe('validateIAMPolicy', () => {
    it('should return error for invalid JSON', async () => {
      const result = await service.validateIAMPolicy('not valid json');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    it('should return error for missing Statement', async () => {
      const policy = JSON.stringify({ Version: '2012-10-17' });
      const result = await service.validateIAMPolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Policy must have Statement array');
    });

    it('should return error for missing Effect', async () => {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Action: '*', Resource: '*' }],
      });
      const result = await service.validateIAMPolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Statement 0: Missing Effect');
    });

    it('should warn about overly permissive policies', async () => {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
          },
        ],
      });
      const result = await service.validateIAMPolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Statement 0: Allows all actions - consider restricting');
      expect(result.warnings).toContain('Statement 0: Applies to all resources - consider restricting');
    });

    it('should pass for valid restrictive policy', async () => {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject'],
            Resource: 'arn:aws:s3:::my-bucket/*',
          },
        ],
      });
      const result = await service.validateIAMPolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
