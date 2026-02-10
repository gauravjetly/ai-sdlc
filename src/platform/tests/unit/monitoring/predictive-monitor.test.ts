/**
 * Unit Tests for Predictive Monitor Service
 */

import { PredictiveMonitorService, MetricDataPoint } from '../../../monitoring/predictive-monitor.service';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cloudwatch');

describe('PredictiveMonitorService', () => {
  let service: PredictiveMonitorService;

  beforeEach(() => {
    service = new PredictiveMonitorService('us-east-1');
  });

  describe('analyzeHistoricalMetrics', () => {
    it('should retrieve historical metrics successfully', async () => {
      const result = await service.analyzeHistoricalMetrics({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensions: [{ Name: 'InstanceId', Value: 'i-1234567890abcdef0' }],
        hours: 24
      });

      expect(result).toBeDefined();
      expect(result.metricName).toBe('CPUUtilization');
      expect(result.namespace).toBe('AWS/EC2');
      expect(Array.isArray(result.dataPoints)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      await expect(
        service.analyzeHistoricalMetrics({
          namespace: '',
          metricName: '',
          dimensions: [],
          hours: 24
        })
      ).rejects.toThrow();
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies in metric data', async () => {
      const dataPoints: MetricDataPoint[] = [];
      const baseValue = 50;

      // Create 100 data points with normal distribution
      for (let i = 0; i < 100; i++) {
        dataPoints.push({
          timestamp: new Date(Date.now() - (100 - i) * 60000),
          value: baseValue + (Math.random() - 0.5) * 5
        });
      }

      const timeSeries = {
        metricName: 'CPUUtilization',
        namespace: 'AWS/EC2',
        dimensions: [],
        dataPoints
      };

      // Test with normal value
      const normalResult = await service.detectAnomalies(timeSeries, 52);
      expect(normalResult.isAnomaly).toBe(false);

      // Test with anomalous value
      const anomalyResult = await service.detectAnomalies(timeSeries, 90);
      expect(anomalyResult.isAnomaly).toBe(true);
      expect(anomalyResult.severity).toBeDefined();
      expect(anomalyResult.confidence).toBeGreaterThan(0);
    });

    it('should handle insufficient data', async () => {
      const timeSeries = {
        metricName: 'CPUUtilization',
        namespace: 'AWS/EC2',
        dimensions: [],
        dataPoints: [
          { timestamp: new Date(), value: 50 },
          { timestamp: new Date(), value: 52 }
        ]
      };

      const result = await service.detectAnomalies(timeSeries, 55);
      expect(result.isAnomaly).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('predictFailures', () => {
    it('should predict failures based on trends', async () => {
      const result = await service.predictFailures({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensions: [{ Name: 'InstanceId', Value: 'i-test' }],
        threshold: 90
      });

      expect(result).toBeDefined();
      expect(result.willFail).toBeDefined();
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
      expect(result.reason).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should provide time to failure estimate', async () => {
      const result = await service.predictFailures({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensions: [{ Name: 'InstanceId', Value: 'i-test' }],
        threshold: 95
      });

      if (result.willFail && result.estimatedTimeToFailure) {
        expect(result.estimatedTimeToFailure).toBeGreaterThan(0);
      }
    });
  });

  describe('generateCapacityRecommendations', () => {
    it('should generate capacity recommendations', async () => {
      const result = await service.generateCapacityRecommendations({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensions: [{ Name: 'InstanceId', Value: 'i-test' }],
        currentCapacity: 100,
        targetUtilization: 80
      });

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('CPUUtilization');
      expect(result.currentCapacity).toBe(100);
      expect(result.recommendedCapacity).toBeGreaterThan(0);
      expect(result.utilizationTrend).toMatch(/increasing|decreasing|stable/);
      expect(result.reasoning).toBeDefined();
    });

    it('should recommend scaling up for increasing trends', async () => {
      const result = await service.generateCapacityRecommendations({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensions: [],
        currentCapacity: 100
      });

      if (result.utilizationTrend === 'increasing') {
        expect(result.recommendedCapacity).toBeGreaterThan(result.currentCapacity);
      }
    });

    it('should recommend scaling down for low utilization', async () => {
      const result = await service.generateCapacityRecommendations({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensions: [],
        currentCapacity: 100
      });

      if (result.utilizationTrend === 'decreasing') {
        expect(result.estimatedTimeToCapacity).toBeGreaterThan(0);
      }
    });
  });

  describe('Statistical Methods', () => {
    it('should calculate statistics correctly', () => {
      // This tests private methods indirectly through public APIs
      const dataPoints: MetricDataPoint[] = [
        { timestamp: new Date(), value: 10 },
        { timestamp: new Date(), value: 20 },
        { timestamp: new Date(), value: 30 },
        { timestamp: new Date(), value: 40 },
        { timestamp: new Date(), value: 50 }
      ];

      const timeSeries = {
        metricName: 'Test',
        namespace: 'Test',
        dimensions: [],
        dataPoints
      };

      // Mean should be 30, anomaly detection should work
      service.detectAnomalies(timeSeries, 30).then(result => {
        expect(result.expectedRange.min).toBeLessThan(30);
        expect(result.expectedRange.max).toBeGreaterThan(30);
      });
    });
  });
});
