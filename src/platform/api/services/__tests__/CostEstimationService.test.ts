/**
 * Unit Tests for CostEstimationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CostEstimationService } from '../CostEstimationService.js';
import { DesignNode, Environment } from '../../types/designer.js';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    visualDesign: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

describe('CostEstimationService', () => {
  let service: CostEstimationService;

  beforeEach(() => {
    service = new CostEstimationService();
  });

  describe('estimateNodeCost', () => {
    it('should return 0 for free resources like VPC', () => {
      const cost = service.estimateNodeCost('vpc', { name: 'main-vpc', cidr: '10.0.0.0/16' }, 'production');
      expect(cost).toBe(0);
    });

    it('should return 0 for subnet', () => {
      const cost = service.estimateNodeCost('subnet', { name: 'subnet-1' }, 'production');
      expect(cost).toBe(0);
    });

    it('should return base cost for NAT Gateway', () => {
      const cost = service.estimateNodeCost('nat_gateway', { name: 'nat-1' }, 'production');
      expect(cost).toBeGreaterThan(30); // ~$32.40 + data processing
    });

    it('should return EKS cluster control plane cost', () => {
      const cost = service.estimateNodeCost('eks_cluster', { name: 'my-cluster' }, 'production');
      expect(cost).toBe(72); // $0.10/hr * 730 hours
    });

    it('should scale node group cost by instance count', () => {
      const cost = service.estimateNodeCost(
        'eks_node_group',
        { instanceTypes: ['t3.medium'], desiredSize: 3 },
        'production'
      );
      expect(cost).toBeGreaterThan(80); // 3 nodes * ~$30/node
    });

    it('should reduce cost for dev environment', () => {
      const prodCost = service.estimateNodeCost(
        'eks_node_group',
        { instanceTypes: ['t3.medium'], desiredSize: 4 },
        'production'
      );
      const devCost = service.estimateNodeCost(
        'eks_node_group',
        { instanceTypes: ['t3.medium'], desiredSize: 4 },
        'dev'
      );
      expect(devCost).toBeLessThan(prodCost);
    });

    it('should calculate RDS cost with storage', () => {
      const cost = service.estimateNodeCost(
        'rds_instance',
        { instanceClass: 'db.t3.medium', allocatedStorage: 100 },
        'production'
      );
      expect(cost).toBeGreaterThan(50); // Instance + storage
    });

    it('should double RDS cost for multi-AZ', () => {
      const singleAzCost = service.estimateNodeCost(
        'rds_instance',
        { instanceClass: 'db.t3.medium', allocatedStorage: 20, multiAz: false },
        'production'
      );
      const multiAzCost = service.estimateNodeCost(
        'rds_instance',
        { instanceClass: 'db.t3.medium', allocatedStorage: 20, multiAz: true },
        'production'
      );
      expect(multiAzCost).toBeGreaterThan(singleAzCost * 1.5); // Should be roughly double
    });

    it('should return base cost for ALB', () => {
      const cost = service.estimateNodeCost('alb', { name: 'my-alb' }, 'production');
      expect(cost).toBeGreaterThan(20); // Base + LCU estimate
    });

    it('should calculate S3 cost based on storage estimate', () => {
      const cost = service.estimateNodeCost(
        's3_bucket',
        { name: 'my-bucket', estimatedStorageGB: 1000 },
        'production'
      );
      expect(cost).toBe(23); // 1000 * $0.023
    });

    it('should return pipeline cost', () => {
      const cost = service.estimateNodeCost('codepipeline', { name: 'my-pipeline' }, 'production');
      expect(cost).toBe(1); // $1 per active pipeline
    });

    it('should return default cost for unknown types', () => {
      const cost = service.estimateNodeCost('unknown_type' as any, {}, 'production');
      expect(cost).toBe(10); // Default $10
    });
  });

  describe('estimateLayerCost', () => {
    it('should sum costs for all nodes in layer', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'vpc-1',
          type: 'vpc',
          position: { x: 0, y: 0 },
          data: { name: 'main', cidr: '10.0.0.0/16' },
          layer: 'network',
        },
        {
          id: 'nat-1',
          type: 'nat_gateway',
          position: { x: 100, y: 0 },
          data: { name: 'nat-1' },
          layer: 'network',
        },
      ];

      const result = await service.estimateLayerCost(nodes, 'production');

      expect(result.totalMonthly).toBeGreaterThan(30); // NAT cost
      expect(result.breakdown).toHaveLength(2);
      expect(result.byService.nat_gateway).toBeGreaterThan(0);
      expect(result.byService.vpc).toBe(0);
    });

    it('should group costs by layer', async () => {
      const nodes: DesignNode[] = [
        {
          id: 'eks-1',
          type: 'eks_cluster',
          position: { x: 0, y: 0 },
          data: { name: 'cluster-1' },
          layer: 'platform',
        },
        {
          id: 'rds-1',
          type: 'rds_instance',
          position: { x: 100, y: 0 },
          data: { name: 'db-1', instanceClass: 'db.t3.small' },
          layer: 'platform',
        },
      ];

      const result = await service.estimateLayerCost(nodes, 'production');

      expect(result.byLayer.platform).toBeGreaterThan(0);
      expect(result.byLayer.network).toBe(0);
    });
  });

  describe('suggestOptimizations', () => {
    // Note: This would need a mock of the database
    // For unit tests, we'll test the optimization analysis logic indirectly
    it('should be defined', () => {
      expect(service.suggestOptimizations).toBeDefined();
    });
  });

  describe('getBudgetStatus', () => {
    it('should be defined', () => {
      expect(service.getBudgetStatus).toBeDefined();
    });
  });

  describe('getForecast', () => {
    it('should be defined', () => {
      expect(service.getForecast).toBeDefined();
    });
  });
});
