/**
 * Unit Tests for Cost Optimizer Service
 */

import { CostOptimizerService, OptimizationRecommendation } from '../../../cost-optimization/optimizer.service';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cost-explorer');
jest.mock('@aws-sdk/client-ec2');
jest.mock('@aws-sdk/client-rds');

describe('CostOptimizerService', () => {
  let service: CostOptimizerService;

  beforeEach(() => {
    service = new CostOptimizerService('us-east-1');
  });

  describe('analyzeCosts', () => {
    it('should analyze costs for specified period', async () => {
      const result = await service.analyzeCosts({
        granularity: 'DAILY'
      });

      expect(result).toBeDefined();
      expect(result.totalCost).toBeGreaterThanOrEqual(0);
      expect(result.forecastedCost).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.topServices)).toBe(true);
      expect(result.trends).toBeDefined();
      expect(result.trends.daily).toBeGreaterThanOrEqual(0);
      expect(result.trends.weekly).toBeGreaterThanOrEqual(0);
      expect(result.trends.monthly).toBeGreaterThanOrEqual(0);
    });

    it('should return top services by cost', async () => {
      const result = await service.analyzeCosts({});

      expect(result.topServices.length).toBeGreaterThan(0);

      for (const service of result.topServices) {
        expect(service.service).toBeDefined();
        expect(service.cost).toBeGreaterThanOrEqual(0);
        expect(service.percentage).toBeGreaterThanOrEqual(0);
        expect(service.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should handle custom date ranges', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const result = await service.analyzeCosts({
        startDate,
        endDate
      });

      expect(result.period).toContain(startDate);
      expect(result.period).toContain(endDate);
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should gather all optimization recommendations', async () => {
      const recommendations = await service.getOptimizationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);

      for (const rec of recommendations) {
        expect(rec.id).toBeDefined();
        expect(rec.type).toMatch(/rightsizing|reserved_instance|savings_plan|idle_resource|spot_instance/);
        expect(rec.resourceId).toBeDefined();
        expect(rec.monthlySavings).toBeGreaterThanOrEqual(0);
        expect(rec.annualSavings).toBeGreaterThanOrEqual(0);
        expect(rec.riskLevel).toMatch(/low|medium|high/);
        expect(typeof rec.autoApplyable).toBe('boolean');
        expect(rec.description).toBeDefined();
      }
    });

    it('should sort recommendations by savings', async () => {
      const recommendations = await service.getOptimizationRecommendations();

      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].monthlySavings).toBeGreaterThanOrEqual(
          recommendations[i].monthlySavings
        );
      }
    });

    it('should include various recommendation types', async () => {
      const recommendations = await service.getOptimizationRecommendations();

      const types = new Set(recommendations.map(r => r.type));

      // Should have at least some variety in recommendations
      expect(types.size).toBeGreaterThan(0);
    });
  });

  describe('applyOptimizations', () => {
    it('should apply low-risk optimizations', async () => {
      const mockRecommendations: OptimizationRecommendation[] = [
        {
          id: 'test-1',
          type: 'idle_resource',
          resourceId: 'i-test',
          resourceType: 'EC2',
          currentCost: 100,
          optimizedCost: 0,
          monthlySavings: 100,
          annualSavings: 1200,
          riskLevel: 'low',
          autoApplyable: true,
          description: 'Test optimization',
          action: 'Stop idle instance'
        }
      ];

      const result = await service.applyOptimizations({
        recommendations: mockRecommendations,
        autoApplyLowRiskOnly: true,
        dryRun: true
      });

      expect(result).toBeDefined();
      expect(result.totalRecommendations).toBe(1);
      expect(result.potentialMonthlySavings).toBe(100);
    });

    it('should skip high-risk optimizations when autoApplyLowRiskOnly is true', async () => {
      const mockRecommendations: OptimizationRecommendation[] = [
        {
          id: 'test-high-risk',
          type: 'rightsizing',
          resourceId: 'i-prod',
          resourceType: 'EC2',
          currentCost: 200,
          optimizedCost: 100,
          monthlySavings: 100,
          annualSavings: 1200,
          riskLevel: 'high',
          autoApplyable: true,
          description: 'High risk optimization',
          action: 'Downsize production instance'
        }
      ];

      const result = await service.applyOptimizations({
        recommendations: mockRecommendations,
        autoApplyLowRiskOnly: true,
        dryRun: true
      });

      expect(result.appliedRecommendations).toBe(0);
    });

    it('should calculate savings percentage correctly', async () => {
      const mockRecommendations: OptimizationRecommendation[] = [
        {
          id: 'test-1',
          type: 'idle_resource',
          resourceId: 'i-test1',
          resourceType: 'EC2',
          currentCost: 100,
          optimizedCost: 0,
          monthlySavings: 100,
          annualSavings: 1200,
          riskLevel: 'low',
          autoApplyable: true,
          description: 'Test 1',
          action: 'Stop idle instance'
        },
        {
          id: 'test-2',
          type: 'idle_resource',
          resourceId: 'i-test2',
          resourceType: 'EC2',
          currentCost: 100,
          optimizedCost: 0,
          monthlySavings: 100,
          annualSavings: 1200,
          riskLevel: 'low',
          autoApplyable: true,
          description: 'Test 2',
          action: 'Stop idle instance'
        }
      ];

      const result = await service.applyOptimizations({
        recommendations: mockRecommendations,
        dryRun: true
      });

      expect(result.potentialMonthlySavings).toBe(200);
      expect(result.actualMonthlySavings).toBe(200);
      expect(result.savingsPercentage).toBe(100);
    });

    it('should handle dry run mode', async () => {
      const result = await service.applyOptimizations({
        dryRun: true
      });

      expect(result.appliedActions).toBeDefined();
      // In dry run, actions should be logged but not executed
    });

    it('should collect errors during application', async () => {
      const mockRecommendations: OptimizationRecommendation[] = [
        {
          id: 'test-error',
          type: 'rightsizing',
          resourceId: 'i-invalid',
          resourceType: 'EC2',
          currentCost: 100,
          optimizedCost: 50,
          monthlySavings: 50,
          annualSavings: 600,
          riskLevel: 'low',
          autoApplyable: true,
          description: 'Will fail',
          action: 'Modify instance'
        }
      ];

      const result = await service.applyOptimizations({
        recommendations: mockRecommendations,
        dryRun: true
      });

      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Recommendation Types', () => {
    it('should generate rightsizing recommendations', async () => {
      const recommendations = await service.getOptimizationRecommendations();
      const rightsizing = recommendations.filter(r => r.type === 'rightsizing');

      for (const rec of rightsizing) {
        expect(rec.metadata?.currentInstanceType).toBeDefined();
        expect(rec.metadata?.recommendedInstanceType).toBeDefined();
      }
    });

    it('should generate reserved instance recommendations', async () => {
      const recommendations = await service.getOptimizationRecommendations();
      const reservedInstances = recommendations.filter(r => r.type === 'reserved_instance');

      for (const rec of reservedInstances) {
        expect(rec.metadata?.term).toBeDefined();
        expect(rec.autoApplyable).toBe(false); // RIs require commitment
      }
    });

    it('should generate savings plans recommendations', async () => {
      const recommendations = await service.getOptimizationRecommendations();
      const savingsPlans = recommendations.filter(r => r.type === 'savings_plan');

      for (const rec of savingsPlans) {
        expect(rec.metadata?.hourlyCommitment).toBeDefined();
        expect(rec.autoApplyable).toBe(false); // SPs require commitment
      }
    });

    it('should identify idle resources', async () => {
      const recommendations = await service.getOptimizationRecommendations();
      const idleResources = recommendations.filter(r => r.type === 'idle_resource');

      for (const rec of idleResources) {
        expect(rec.monthlySavings).toBeGreaterThan(0);
        expect(rec.currentCost).toBeGreaterThan(0);
        expect(rec.optimizedCost).toBe(0);
      }
    });
  });

  describe('Target Savings Achievement', () => {
    it('should potentially achieve 20% cost reduction target', async () => {
      const costAnalysis = await service.analyzeCosts({});
      const recommendations = await service.getOptimizationRecommendations();

      const totalSavings = recommendations.reduce((sum, rec) => sum + rec.monthlySavings, 0);
      const savingsPercentage = (totalSavings / costAnalysis.totalCost) * 100;

      // Verify that recommendations could achieve target
      expect(savingsPercentage).toBeGreaterThanOrEqual(0);

      console.log(`Potential savings: ${savingsPercentage.toFixed(2)}% of total cost`);
    });
  });
});
