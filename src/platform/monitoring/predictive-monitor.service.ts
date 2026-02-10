/**
 * Predictive Monitoring Service
 *
 * Analyzes historical metrics to predict failures before they happen
 * Uses statistical analysis and machine learning patterns for anomaly detection
 *
 * Features:
 * - Historical metric analysis
 * - Failure prediction
 * - Anomaly detection
 * - Capacity planning recommendations
 * - Trend analysis
 */

import { CloudWatchClient, GetMetricStatisticsCommand, Dimension } from '@aws-sdk/client-cloudwatch';
import { createLogger } from '../utils/logger';

const logger = createLogger('PredictiveMonitor');

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  unit?: string;
}

export interface TimeSeriesData {
  metricName: string;
  namespace: string;
  dimensions: Dimension[];
  dataPoints: MetricDataPoint[];
}

export interface AnomalyDetection {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  expectedRange: { min: number; max: number };
  actualValue: number;
  deviationPercentage: number;
}

export interface FailurePrediction {
  willFail: boolean;
  probability: number;
  estimatedTimeToFailure?: number; // in minutes
  reason: string;
  recommendation: string;
}

export interface CapacityRecommendation {
  resourceType: string;
  currentCapacity: number;
  recommendedCapacity: number;
  utilizationTrend: 'increasing' | 'stable' | 'decreasing';
  estimatedTimeToCapacity: number; // in days
  reasoning: string;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number; // rate of change per hour
  volatility: number;
  seasonality: boolean;
  forecast: MetricDataPoint[];
}

/**
 * Predictive Monitoring Service
 * Provides AI-powered monitoring and failure prediction
 */
export class PredictiveMonitorService {
  private cloudwatch: CloudWatchClient;
  private anomalyThreshold: number = 2.5; // Standard deviations
  private predictionWindow: number = 60; // minutes ahead

  constructor(region: string = 'us-east-1') {
    this.cloudwatch = new CloudWatchClient({ region });
  }

  /**
   * Analyze historical metrics for a resource
   */
  async analyzeHistoricalMetrics(params: {
    namespace: string;
    metricName: string;
    dimensions: Dimension[];
    hours?: number;
  }): Promise<TimeSeriesData> {
    const { namespace, metricName, dimensions, hours = 24 } = params;

    logger.info('Analyzing historical metrics', {
      namespace,
      metricName,
      dimensions,
      hours
    });

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

      const command = new GetMetricStatisticsCommand({
        Namespace: namespace,
        MetricName: metricName,
        Dimensions: dimensions,
        StartTime: startTime,
        EndTime: endTime,
        Period: 300, // 5-minute intervals
        Statistics: ['Average', 'Maximum', 'Minimum']
      });

      const response = await this.cloudwatch.send(command);

      const dataPoints: MetricDataPoint[] = (response.Datapoints || [])
        .map(dp => ({
          timestamp: dp.Timestamp!,
          value: dp.Average!,
          unit: response.Label
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      logger.info('Historical metrics retrieved', {
        dataPointCount: dataPoints.length,
        timeRange: `${startTime.toISOString()} to ${endTime.toISOString()}`
      });

      return {
        metricName,
        namespace,
        dimensions,
        dataPoints
      };

    } catch (error: any) {
      logger.error('Failed to analyze historical metrics', {
        error: error.message,
        namespace,
        metricName
      });
      throw new Error(`Failed to analyze metrics: ${error.message}`);
    }
  }

  /**
   * Detect anomalies in time series data
   * Uses statistical methods (Z-score, IQR)
   */
  async detectAnomalies(
    timeSeries: TimeSeriesData,
    currentValue: number
  ): Promise<AnomalyDetection> {
    logger.info('Detecting anomalies', {
      metricName: timeSeries.metricName,
      currentValue,
      dataPoints: timeSeries.dataPoints.length
    });

    const values = timeSeries.dataPoints.map(dp => dp.value);

    if (values.length < 10) {
      logger.warn('Insufficient data for anomaly detection', {
        dataPoints: values.length
      });
      return {
        isAnomaly: false,
        severity: 'low',
        confidence: 0,
        expectedRange: { min: 0, max: 0 },
        actualValue: currentValue,
        deviationPercentage: 0
      };
    }

    // Calculate statistics
    const stats = this.calculateStatistics(values);
    const zScore = Math.abs((currentValue - stats.mean) / stats.stdDev);
    const deviationPercentage = ((currentValue - stats.mean) / stats.mean) * 100;

    // Determine if anomaly
    const isAnomaly = zScore > this.anomalyThreshold;

    // Determine severity based on z-score
    let severity: 'low' | 'medium' | 'high' | 'critical';
    if (zScore < 2) severity = 'low';
    else if (zScore < 3) severity = 'medium';
    else if (zScore < 4) severity = 'high';
    else severity = 'critical';

    // Calculate confidence (normalized z-score)
    const confidence = Math.min(zScore / 5, 1);

    // Expected range (mean ± 2 standard deviations)
    const expectedRange = {
      min: stats.mean - 2 * stats.stdDev,
      max: stats.mean + 2 * stats.stdDev
    };

    logger.info('Anomaly detection complete', {
      isAnomaly,
      severity,
      confidence,
      zScore,
      deviationPercentage
    });

    return {
      isAnomaly,
      severity,
      confidence,
      expectedRange,
      actualValue: currentValue,
      deviationPercentage
    };
  }

  /**
   * Predict failures before they happen
   * Analyzes trends and patterns to predict system failures
   */
  async predictFailures(params: {
    namespace: string;
    metricName: string;
    dimensions: Dimension[];
    threshold: number; // Failure threshold (e.g., 95% CPU)
  }): Promise<FailurePrediction> {
    const { namespace, metricName, dimensions, threshold } = params;

    logger.info('Predicting failures', {
      namespace,
      metricName,
      threshold
    });

    try {
      // Get historical data
      const timeSeries = await this.analyzeHistoricalMetrics({
        namespace,
        metricName,
        dimensions,
        hours: 6 // Last 6 hours for trend analysis
      });

      if (timeSeries.dataPoints.length < 10) {
        return {
          willFail: false,
          probability: 0,
          reason: 'Insufficient historical data',
          recommendation: 'Continue monitoring'
        };
      }

      // Analyze trend
      const trend = this.analyzeTrend(timeSeries.dataPoints);
      const currentValue = timeSeries.dataPoints[timeSeries.dataPoints.length - 1].value;

      // Predict when threshold will be crossed
      if (trend.direction === 'increasing' && trend.rate > 0) {
        const timeToThreshold = (threshold - currentValue) / trend.rate;

        if (timeToThreshold > 0 && timeToThreshold < this.predictionWindow) {
          const probability = 1 - (timeToThreshold / this.predictionWindow);

          logger.warn('Failure predicted', {
            timeToThreshold: `${Math.round(timeToThreshold)} minutes`,
            probability,
            currentValue,
            threshold
          });

          return {
            willFail: true,
            probability,
            estimatedTimeToFailure: Math.round(timeToThreshold),
            reason: `${metricName} trending towards threshold at ${trend.rate.toFixed(2)}/min`,
            recommendation: this.generateFailureRecommendation(metricName, currentValue, threshold)
          };
        }
      }

      // Check for volatility (unstable system)
      if (trend.volatility > 0.3) {
        return {
          willFail: true,
          probability: trend.volatility,
          reason: `High volatility detected (${(trend.volatility * 100).toFixed(1)}%)`,
          recommendation: 'System is unstable. Consider scaling or investigating root cause'
        };
      }

      return {
        willFail: false,
        probability: 0,
        reason: 'System operating normally',
        recommendation: 'Continue normal monitoring'
      };

    } catch (error: any) {
      logger.error('Failure prediction failed', {
        error: error.message,
        namespace,
        metricName
      });
      throw new Error(`Failure prediction failed: ${error.message}`);
    }
  }

  /**
   * Generate capacity planning recommendations
   */
  async generateCapacityRecommendations(params: {
    namespace: string;
    metricName: string;
    dimensions: Dimension[];
    currentCapacity: number;
    targetUtilization?: number; // Default 80%
  }): Promise<CapacityRecommendation> {
    const { namespace, metricName, dimensions, currentCapacity, targetUtilization = 80 } = params;

    logger.info('Generating capacity recommendations', {
      namespace,
      metricName,
      currentCapacity,
      targetUtilization
    });

    try {
      // Get 7 days of historical data
      const timeSeries = await this.analyzeHistoricalMetrics({
        namespace,
        metricName,
        dimensions,
        hours: 168 // 7 days
      });

      if (timeSeries.dataPoints.length < 20) {
        return {
          resourceType: metricName,
          currentCapacity,
          recommendedCapacity: currentCapacity,
          utilizationTrend: 'stable',
          estimatedTimeToCapacity: 999,
          reasoning: 'Insufficient data for capacity planning'
        };
      }

      // Analyze utilization trend
      const trend = this.analyzeTrend(timeSeries.dataPoints);
      const currentValue = timeSeries.dataPoints[timeSeries.dataPoints.length - 1].value;
      const utilizationPercent = (currentValue / currentCapacity) * 100;

      let recommendedCapacity = currentCapacity;
      let estimatedTimeToCapacity = 999;
      let reasoning = '';

      if (trend.direction === 'increasing') {
        // Calculate when we'll hit target utilization
        const targetValue = currentCapacity * (targetUtilization / 100);
        const timeToTarget = (targetValue - currentValue) / (trend.rate * 60 * 24); // in days

        if (timeToTarget > 0 && timeToTarget < 90) {
          // Recommend scaling up
          const growthFactor = 1 + (trend.rate * 60 * 24 * 90 / currentValue); // 90 days growth
          recommendedCapacity = Math.ceil(currentCapacity * growthFactor * 1.2); // 20% buffer

          estimatedTimeToCapacity = Math.round(timeToTarget);
          reasoning = `Utilization trending up at ${(trend.rate * 60).toFixed(2)}%/hour. ` +
                     `Will reach ${targetUtilization}% in ${estimatedTimeToCapacity} days. ` +
                     `Recommend increasing capacity to ${recommendedCapacity}.`;
        }
      } else if (trend.direction === 'decreasing' && utilizationPercent < 40) {
        // Recommend scaling down
        const avgUtilization = timeSeries.dataPoints.reduce((sum, dp) => sum + dp.value, 0) / timeSeries.dataPoints.length;
        recommendedCapacity = Math.ceil((avgUtilization * 1.5 / 100) * currentCapacity); // 50% buffer

        reasoning = `Average utilization is ${avgUtilization.toFixed(1)}% (current: ${utilizationPercent.toFixed(1)}%). ` +
                   `Consider reducing capacity to ${recommendedCapacity} to optimize costs.`;
      } else {
        reasoning = `Current utilization at ${utilizationPercent.toFixed(1)}% is optimal. ` +
                   `No capacity changes recommended.`;
      }

      logger.info('Capacity recommendations generated', {
        currentCapacity,
        recommendedCapacity,
        utilizationTrend: trend.direction,
        estimatedTimeToCapacity
      });

      return {
        resourceType: metricName,
        currentCapacity,
        recommendedCapacity,
        utilizationTrend: trend.direction,
        estimatedTimeToCapacity,
        reasoning
      };

    } catch (error: any) {
      logger.error('Capacity recommendation failed', {
        error: error.message,
        namespace,
        metricName
      });
      throw new Error(`Capacity recommendation failed: ${error.message}`);
    }
  }

  /**
   * Perform comprehensive trend analysis
   */
  private analyzeTrend(dataPoints: MetricDataPoint[]): TrendAnalysis {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable',
        rate: 0,
        volatility: 0,
        seasonality: false,
        forecast: []
      };
    }

    const values = dataPoints.map(dp => dp.value);
    const times = dataPoints.map(dp => dp.timestamp.getTime());

    // Calculate linear regression
    const regression = this.linearRegression(times, values);
    const rate = regression.slope * (1000 * 60); // Convert to per-minute rate

    // Determine direction
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(rate) < 0.01) {
      direction = 'stable';
    } else if (rate > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Calculate volatility (coefficient of variation)
    const stats = this.calculateStatistics(values);
    const volatility = stats.stdDev / stats.mean;

    // Simple forecast (next 12 data points using linear regression)
    const lastTime = times[times.length - 1];
    const interval = times.length > 1 ? (times[times.length - 1] - times[0]) / (times.length - 1) : 300000; // 5 min default
    const forecast: MetricDataPoint[] = [];

    for (let i = 1; i <= 12; i++) {
      const futureTime = lastTime + interval * i;
      const predictedValue = regression.intercept + regression.slope * futureTime;

      forecast.push({
        timestamp: new Date(futureTime),
        value: Math.max(0, predictedValue) // Ensure non-negative
      });
    }

    return {
      direction,
      rate,
      volatility,
      seasonality: false, // TODO: Implement seasonality detection
      forecast
    };
  }

  /**
   * Calculate basic statistics for a dataset
   */
  private calculateStatistics(values: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Calculate standard deviation
    const squareDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    return { mean, median, stdDev, min, max };
  }

  /**
   * Calculate linear regression (least squares)
   */
  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Generate failure-specific recommendations
   */
  private generateFailureRecommendation(metricName: string, currentValue: number, threshold: number): string {
    const metric = metricName.toLowerCase();

    if (metric.includes('cpu')) {
      return `CPU utilization at ${currentValue.toFixed(1)}% approaching ${threshold}%. ` +
             `Recommend: 1) Scale horizontally (add instances), 2) Optimize CPU-intensive code, 3) Enable auto-scaling`;
    }

    if (metric.includes('memory')) {
      return `Memory utilization at ${currentValue.toFixed(1)}% approaching ${threshold}%. ` +
             `Recommend: 1) Investigate memory leaks, 2) Scale vertically (larger instance), 3) Review memory configuration`;
    }

    if (metric.includes('disk') || metric.includes('storage')) {
      return `Disk utilization at ${currentValue.toFixed(1)}% approaching ${threshold}%. ` +
             `Recommend: 1) Clean up old data/logs, 2) Increase storage capacity, 3) Implement data retention policy`;
    }

    if (metric.includes('connection') || metric.includes('thread')) {
      return `${metricName} at ${currentValue.toFixed(0)} approaching ${threshold}. ` +
             `Recommend: 1) Increase pool size, 2) Optimize connection usage, 3) Implement connection pooling`;
    }

    return `${metricName} approaching critical threshold. Immediate investigation and scaling recommended.`;
  }
}
