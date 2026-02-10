/**
 * Capacity Predictor
 * Predicts resource capacity exhaustion using trend analysis
 */

import { createLogger } from '../../utils/logger.js';
import { TimeSeriesData, Prediction, CapacityForecast } from './types.js';

const logger = createLogger('CapacityPredictor');

export class CapacityPredictor {
  private historyWindow: number = 7 * 24 * 60 * 60 * 1000; // 7 days
  private forecastWindow: number = 30; // days
  private minDataPoints: number = 20;

  /**
   * Predict capacity exhaustion
   */
  async predictCapacity(
    resource: string,
    historicalData: TimeSeriesData[],
    capacityLimit: number
  ): Promise<CapacityForecast> {
    logger.debug('Predicting capacity', { resource, dataPoints: historicalData.length });

    if (historicalData.length < this.minDataPoints) {
      return this.createNoDataForecast(resource, capacityLimit);
    }

    // Calculate trend using linear regression
    const { slope, intercept, r2 } = this.linearRegression(historicalData);

    // Get current usage (latest data point)
    const currentUsage = historicalData[historicalData.length - 1].value;

    // Predict usage at forecast window
    const daysAhead = this.forecastWindow;
    const predictedUsage = this.predictValue(slope, intercept, historicalData.length + daysAhead);

    // Calculate days until exhaustion
    const daysUntilExhaustion = this.calculateDaysUntilExhaustion(
      currentUsage,
      capacityLimit,
      slope,
      intercept,
      historicalData.length
    );

    // Determine recommended action
    const recommendedAction = this.determineAction(
      currentUsage,
      capacityLimit,
      daysUntilExhaustion
    );

    return {
      resource,
      currentUsage,
      predictedUsage,
      capacityLimit,
      daysUntilExhaustion,
      recommendedAction,
      confidence: r2 // R² as confidence measure
    };
  }

  /**
   * Linear regression for trend analysis
   */
  private linearRegression(data: TimeSeriesData[]): {
    slope: number;
    intercept: number;
    r2: number;
  } {
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = data[i].value;

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      sumYY += y * y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R² (coefficient of determination)
    const yMean = sumY / n;
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      const actual = data[i].value;
      ssRes += Math.pow(actual - predicted, 2);
      ssTot += Math.pow(actual - yMean, 2);
    }

    const r2 = 1 - ssRes / ssTot;

    return { slope, intercept, r2 };
  }

  /**
   * Predict value at future time
   */
  private predictValue(slope: number, intercept: number, x: number): number {
    return slope * x + intercept;
  }

  /**
   * Calculate days until capacity exhaustion
   */
  private calculateDaysUntilExhaustion(
    currentUsage: number,
    capacityLimit: number,
    slope: number,
    intercept: number,
    currentIndex: number
  ): number | null {
    // If slope is negative or zero, capacity not increasing
    if (slope <= 0) {
      return null;
    }

    // Calculate x when y = capacityLimit
    // capacityLimit = slope * x + intercept
    // x = (capacityLimit - intercept) / slope
    const exhaustionIndex = (capacityLimit - intercept) / slope;

    const daysUntilExhaustion = exhaustionIndex - currentIndex;

    return daysUntilExhaustion > 0 ? Math.ceil(daysUntilExhaustion) : null;
  }

  /**
   * Determine recommended action
   */
  private determineAction(
    currentUsage: number,
    capacityLimit: number,
    daysUntilExhaustion: number | null
  ): 'none' | 'monitor' | 'scale_soon' | 'scale_now' {
    const usagePercentage = (currentUsage / capacityLimit) * 100;

    // Immediate action needed
    if (usagePercentage >= 90 || (daysUntilExhaustion !== null && daysUntilExhaustion <= 3)) {
      return 'scale_now';
    }

    // Scale soon
    if (usagePercentage >= 75 || (daysUntilExhaustion !== null && daysUntilExhaustion <= 14)) {
      return 'scale_soon';
    }

    // Monitor
    if (usagePercentage >= 60 || (daysUntilExhaustion !== null && daysUntilExhaustion <= 30)) {
      return 'monitor';
    }

    return 'none';
  }

  /**
   * Create forecast when insufficient data
   */
  private createNoDataForecast(
    resource: string,
    capacityLimit: number
  ): CapacityForecast {
    return {
      resource,
      currentUsage: 0,
      predictedUsage: 0,
      capacityLimit,
      daysUntilExhaustion: null,
      recommendedAction: 'none',
      confidence: 0
    };
  }
}
