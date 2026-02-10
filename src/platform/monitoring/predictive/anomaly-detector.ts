/**
 * Anomaly Detector
 * Detects anomalies using statistical methods (Z-score)
 */

import { createLogger } from '../../utils/logger.js';
import { TimeSeriesData, AnomalyDetectionResult } from './types.js';

const logger = createLogger('AnomalyDetector');

export class AnomalyDetector {
  private sensitivity: 'low' | 'medium' | 'high' = 'medium';
  private minDataPoints: number = 20;

  constructor(sensitivity?: 'low' | 'medium' | 'high') {
    if (sensitivity) {
      this.sensitivity = sensitivity;
    }
  }

  /**
   * Detect anomalies in time series data
   */
  async detectAnomalies(data: TimeSeriesData[]): Promise<AnomalyDetectionResult[]> {
    if (data.length < this.minDataPoints) {
      logger.debug('Insufficient data for anomaly detection', {
        dataPoints: data.length,
        required: this.minDataPoints
      });
      return [];
    }

    const results: AnomalyDetectionResult[] = [];

    // Calculate statistics
    const { mean, stdDev } = this.calculateStatistics(data);

    // Determine threshold based on sensitivity
    const threshold = this.getThreshold();

    // Check each data point
    for (const point of data) {
      const zScore = (point.value - mean) / stdDev;
      const isAnomaly = Math.abs(zScore) > threshold;

      if (isAnomaly) {
        results.push({
          timestamp: point.timestamp,
          value: point.value,
          isAnomaly: true,
          score: Math.abs(zScore),
          severity: this.determineSeverity(zScore, threshold),
          explanation: this.explainAnomaly(zScore, mean, stdDev)
        });
      }
    }

    if (results.length > 0) {
      logger.info('Anomalies detected', {
        count: results.length,
        severities: this.groupBySeverity(results)
      });
    }

    return results;
  }

  /**
   * Calculate mean and standard deviation
   */
  private calculateStatistics(
    data: TimeSeriesData[]
  ): { mean: number; stdDev: number } {
    const values = data.map(d => d.value);
    const n = values.length;

    // Calculate mean
    const mean = values.reduce((sum, val) => sum + val, 0) / n;

    // Calculate standard deviation
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  /**
   * Get threshold based on sensitivity
   */
  private getThreshold(): number {
    switch (this.sensitivity) {
      case 'low':
        return 3.0; // 99.7% confidence interval
      case 'medium':
        return 2.5; // ~98.8% confidence interval
      case 'high':
        return 2.0; // ~95.4% confidence interval
      default:
        return 2.5;
    }
  }

  /**
   * Determine anomaly severity
   */
  private determineSeverity(
    zScore: number,
    threshold: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const absZScore = Math.abs(zScore);

    if (absZScore >= threshold * 2) {
      return 'critical';
    } else if (absZScore >= threshold * 1.5) {
      return 'high';
    } else if (absZScore >= threshold * 1.2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Explain anomaly
   */
  private explainAnomaly(zScore: number, mean: number, stdDev: number): string {
    const absZScore = Math.abs(zScore);
    const direction = zScore > 0 ? 'above' : 'below';

    return `Value is ${absZScore.toFixed(2)} standard deviations ${direction} the mean (mean: ${mean.toFixed(2)}, std: ${stdDev.toFixed(2)})`;
  }

  /**
   * Group anomalies by severity
   */
  private groupBySeverity(
    results: AnomalyDetectionResult[]
  ): { [key: string]: number } {
    const groups = { critical: 0, high: 0, medium: 0, low: 0 };

    results.forEach(r => {
      groups[r.severity]++;
    });

    return groups;
  }
}
