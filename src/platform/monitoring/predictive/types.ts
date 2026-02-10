/**
 * Type definitions for Predictive Monitoring
 */

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

export interface Prediction {
  timestamp: Date;
  predictedValue: number;
  confidence: number; // 0-1
  upperBound: number;
  lowerBound: number;
}

export interface AnomalyDetectionResult {
  timestamp: Date;
  value: number;
  isAnomaly: boolean;
  score: number; // Z-score or similar
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation?: string;
}

export interface CapacityForecast {
  resource: string;
  currentUsage: number;
  predictedUsage: number;
  capacityLimit: number;
  daysUntilExhaustion: number | null;
  recommendedAction: 'none' | 'monitor' | 'scale_soon' | 'scale_now';
  confidence: number;
}

export interface PerformanceForecast {
  metric: string;
  currentValue: number;
  predictedValue: number;
  threshold: number;
  willExceedThreshold: boolean;
  timeToThreshold: number | null; // minutes
  confidence: number;
}

export interface PredictiveMonitoringConfig {
  enabled: boolean;
  capacityPrediction: {
    enabled: boolean;
    forecastWindow: number; // days
    checkInterval: number; // milliseconds
  };
  anomalyDetection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    checkInterval: number;
  };
  performanceForecasting: {
    enabled: boolean;
    forecastWindow: number; // minutes
    checkInterval: number;
  };
}
