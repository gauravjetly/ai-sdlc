/**
 * Monitoring Node Data Types
 * Types for CloudWatch, SNS Topic, and SQS Queue nodes
 */

import { BaseNodeData } from './base.types';

/**
 * CloudWatch Node Type
 */
export type CloudWatchNodeType = 'alarm' | 'dashboard' | 'log-group';

/**
 * CloudWatch Comparison Operators
 */
export type CloudWatchComparisonOperator =
  | 'GreaterThanThreshold'
  | 'LessThanThreshold'
  | 'GreaterThanOrEqualToThreshold'
  | 'LessThanOrEqualToThreshold'
  | 'LessThanLowerOrGreaterThanUpperThreshold'
  | 'LessThanLowerThreshold'
  | 'GreaterThanUpperThreshold';

/**
 * CloudWatch Statistic Types
 */
export type CloudWatchStatistic = 'SampleCount' | 'Average' | 'Sum' | 'Minimum' | 'Maximum' | 'p90' | 'p95' | 'p99';

/**
 * CloudWatch Metric Dimension
 */
export interface CloudWatchDimension {
  name: string;
  value: string;
}

/**
 * CloudWatch Dashboard Widget
 */
export interface CloudWatchWidget {
  type: 'metric' | 'text' | 'log' | 'alarm';
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
}

/**
 * CloudWatch Node Data
 */
export interface CloudWatchNodeData extends BaseNodeData {
  serviceType: 'cloudwatch-alarm';
  category: 'monitoring';
  nodeType: CloudWatchNodeType;

  // Alarm specific
  alarmName?: string;
  alarmDescription?: string;
  namespace?: string;
  metricName?: string;
  dimensions?: CloudWatchDimension[];
  statistic?: CloudWatchStatistic;
  extendedStatistic?: string;
  period?: number;
  threshold?: number;
  comparisonOperator?: CloudWatchComparisonOperator;
  evaluationPeriods?: number;
  datapointsToAlarm?: number;
  treatMissingData?: 'breaching' | 'notBreaching' | 'ignore' | 'missing';
  alarmActions?: string[];
  okActions?: string[];
  insufficientDataActions?: string[];

  // Dashboard specific
  dashboardName?: string;
  dashboardBody?: string;
  widgets?: CloudWatchWidget[];

  // Log group specific
  logGroupName?: string;
  retentionInDays?: number;
  kmsKeyId?: string;
}

/**
 * SNS Subscription Protocol
 */
export type SNSProtocol = 'email' | 'email-json' | 'sqs' | 'lambda' | 'http' | 'https' | 'sms' | 'application' | 'firehose';

/**
 * SNS Subscription
 */
export interface SNSSubscription {
  id: string;
  protocol: SNSProtocol;
  endpoint: string;
  filterPolicy?: Record<string, any>;
  filterPolicyScope?: 'MessageAttributes' | 'MessageBody';
  rawMessageDelivery?: boolean;
  redrivePolicy?: {
    deadLetterTargetArn: string;
  };
}

/**
 * SNS Topic Node Data
 */
export interface SNSTopicNodeData extends BaseNodeData {
  serviceType: 'sns-topic';
  category: 'monitoring';
  topicName: string;
  displayName?: string;
  fifoTopic: boolean;
  contentBasedDeduplication?: boolean;
  kmsMasterKeyId?: string;
  policy?: string;
  deliveryPolicy?: {
    http?: {
      defaultHealthyRetryPolicy?: {
        minDelayTarget: number;
        maxDelayTarget: number;
        numRetries: number;
        numMaxDelayRetries: number;
        backoffFunction: 'arithmetic' | 'exponential' | 'geometric' | 'linear';
      };
    };
  };
  subscriptions: SNSSubscription[];
  subscriptionCount: number;
}

/**
 * SQS Dead Letter Queue Config
 */
export interface SQSDeadLetterConfig {
  targetArn: string;
  maxReceiveCount: number;
}

/**
 * SQS Queue Node Data
 */
export interface SQSQueueNodeData extends BaseNodeData {
  serviceType: 'sqs-queue';
  category: 'monitoring';
  queueName: string;
  fifoQueue: boolean;
  contentBasedDeduplication?: boolean;
  deduplicationScope?: 'messageGroup' | 'queue';
  fifoThroughputLimit?: 'perQueue' | 'perMessageGroupId';
  visibilityTimeoutSeconds: number;
  messageRetentionSeconds: number;
  maxMessageSize: number;
  delaySeconds: number;
  receiveWaitTimeSeconds: number;
  deadLetterQueue?: SQSDeadLetterConfig;
  encryption: {
    enabled: boolean;
    kmsMasterKeyId?: string;
    kmsDataKeyReusePeriodSeconds?: number;
  };
  policy?: string;
  redriveAllowPolicy?: {
    redrivePermission: 'allowAll' | 'byQueue' | 'denyAll';
    sourceQueueArns?: string[];
  };
  sqsManagedSseEnabled?: boolean;
}

/**
 * Default CloudWatch data
 */
export const DEFAULT_CLOUDWATCH_DATA: Partial<CloudWatchNodeData> = {
  serviceType: 'cloudwatch-alarm',
  category: 'monitoring',
  nodeType: 'alarm',
  period: 300,
  evaluationPeriods: 2,
  datapointsToAlarm: 2,
  treatMissingData: 'missing',
  alarmActions: [],
  okActions: [],
  insufficientDataActions: [],
  status: 'unconfigured',
  tags: {},
};

/**
 * Default SNS Topic data
 */
export const DEFAULT_SNS_TOPIC_DATA: Partial<SNSTopicNodeData> = {
  serviceType: 'sns-topic',
  category: 'monitoring',
  topicName: '',
  fifoTopic: false,
  subscriptions: [],
  subscriptionCount: 0,
  status: 'unconfigured',
  tags: {},
};

/**
 * Default SQS Queue data
 */
export const DEFAULT_SQS_QUEUE_DATA: Partial<SQSQueueNodeData> = {
  serviceType: 'sqs-queue',
  category: 'monitoring',
  queueName: '',
  fifoQueue: false,
  visibilityTimeoutSeconds: 30,
  messageRetentionSeconds: 345600, // 4 days
  maxMessageSize: 262144, // 256 KB
  delaySeconds: 0,
  receiveWaitTimeSeconds: 0,
  encryption: {
    enabled: true,
  },
  status: 'unconfigured',
  tags: {},
};
