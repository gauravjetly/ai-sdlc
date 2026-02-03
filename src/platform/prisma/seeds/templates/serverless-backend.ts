/**
 * Serverless Backend Template
 * Serverless API and data processing architecture
 */

import type { TemplateDefinition } from './types';
import {
  createAPIGatewayNode,
  createLambdaFunctionNode,
  createDynamoDBNode,
  createS3BucketNode,
  createSNSTopicNode,
  createSQSQueueNode,
  createEventBridgeNode,
  createCognitoNode,
  createIAMRoleNode,
  createCloudWatchAlarmNode,
} from './utils/node-factory';
import { createEdge } from './utils/edge-factory';

export function createServerlessBackendTemplate(): TemplateDefinition {
  // API Gateway REST API
  const restApi = createAPIGatewayNode('main-api', { x: 560, y: 0 }, {
    type: 'REST',
    description: 'Main REST API for application',
  });

  // API Gateway WebSocket API
  const wsApi = createAPIGatewayNode('realtime-api', { x: 840, y: 0 }, {
    type: 'WEBSOCKET',
    description: 'WebSocket API for real-time features',
  });

  // Lambda Functions
  const apiHandler = createLambdaFunctionNode('api-handler', { x: 380, y: 150 }, {
    runtime: 'nodejs20.x',
    handler: 'index.handler',
    memorySize: 512,
    timeout: 30,
    description: 'Main API request handler',
  });

  const authHandler = createLambdaFunctionNode('auth-handler', { x: 560, y: 150 }, {
    runtime: 'nodejs20.x',
    handler: 'auth.handler',
    memorySize: 256,
    timeout: 10,
    description: 'Authentication and authorization',
  });

  const wsHandler = createLambdaFunctionNode('websocket-handler', { x: 740, y: 150 }, {
    runtime: 'nodejs20.x',
    handler: 'websocket.handler',
    memorySize: 256,
    timeout: 30,
    description: 'WebSocket connection handler',
  });

  const asyncProcessor = createLambdaFunctionNode('async-processor', { x: 200, y: 300 }, {
    runtime: 'python3.11',
    handler: 'processor.handler',
    memorySize: 1024,
    timeout: 300,
    description: 'Async task processor',
  });

  const scheduledJob = createLambdaFunctionNode('scheduled-job', { x: 920, y: 300 }, {
    runtime: 'python3.11',
    handler: 'scheduler.handler',
    memorySize: 512,
    timeout: 900,
    description: 'Scheduled maintenance tasks',
  });

  // DynamoDB Tables
  const usersTable = createDynamoDBNode('users-table', { x: 280, y: 450 }, {
    billingMode: 'PAY_PER_REQUEST',
    hashKey: { name: 'userId', type: 'S' },
    pointInTimeRecovery: true,
    streamEnabled: true,
  });

  const dataTable = createDynamoDBNode('data-table', { x: 560, y: 450 }, {
    billingMode: 'PAY_PER_REQUEST',
    hashKey: { name: 'pk', type: 'S' },
    rangeKey: { name: 'sk', type: 'S' },
    pointInTimeRecovery: true,
    streamEnabled: false,
  });

  const connectionsTable = createDynamoDBNode('connections-table', { x: 840, y: 450 }, {
    billingMode: 'PAY_PER_REQUEST',
    hashKey: { name: 'connectionId', type: 'S' },
    pointInTimeRecovery: false,
    streamEnabled: false,
  });

  // S3 Bucket for uploads
  const uploadsBucket = createS3BucketNode('uploads-bucket', { x: 100, y: 450 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'AES256' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // SNS Topics
  const notificationsTopic = createSNSTopicNode('notifications', { x: 100, y: 300 }, {
    displayName: 'Application Notifications',
    fifoTopic: false,
  });

  // SQS Queues
  const processingQueue = createSQSQueueNode('processing-queue', { x: 380, y: 300 }, {
    fifoQueue: false,
    visibilityTimeout: 300,
    messageRetentionPeriod: 1209600, // 14 days
    delaySeconds: 0,
  });

  const dlq = createSQSQueueNode('processing-dlq', { x: 380, y: 400 }, {
    fifoQueue: false,
    visibilityTimeout: 300,
    messageRetentionPeriod: 1209600,
    delaySeconds: 0,
  });

  // EventBridge
  const eventBus = createEventBridgeNode('app-events', { x: 740, y: 300 }, {
    description: 'Application event bus',
  });

  const scheduledRule = createEventBridgeNode('daily-maintenance', { x: 920, y: 150 }, {
    description: 'Daily maintenance job trigger',
    scheduleExpression: 'cron(0 2 * * ? *)',
  });

  // Cognito User Pool
  const userPool = createCognitoNode('app-users', { x: 560, y: -100 }, {
    mfaConfiguration: 'OPTIONAL',
    passwordPolicy: {
      minimumLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
    },
  });

  // IAM Roles
  const lambdaRole = createIAMRoleNode('lambda-execution-role', { x: 100, y: 150 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'lambda.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      'arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess',
    ],
    description: 'IAM role for Lambda function execution',
  });

  // CloudWatch Alarms
  const errorAlarm = createCloudWatchAlarmNode('lambda-errors', { x: 100, y: 0 }, {
    metricName: 'Errors',
    namespace: 'AWS/Lambda',
    statistic: 'Sum',
    period: 300,
    threshold: 5,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 1,
  });

  const nodes = [
    restApi, wsApi,
    apiHandler, authHandler, wsHandler, asyncProcessor, scheduledJob,
    usersTable, dataTable, connectionsTable,
    uploadsBucket,
    notificationsTopic, processingQueue, dlq, eventBus, scheduledRule,
    userPool,
    lambdaRole,
    errorAlarm,
  ];

  const edges = [
    // API Gateway -> Lambda
    createEdge(restApi.id, apiHandler.id, { label: 'invokes', animated: true }),
    createEdge(restApi.id, authHandler.id, { label: 'authorizer' }),
    createEdge(wsApi.id, wsHandler.id, { label: 'invokes', animated: true }),
    // Lambda -> DynamoDB
    createEdge(apiHandler.id, usersTable.id, { label: 'reads/writes', animated: true }),
    createEdge(apiHandler.id, dataTable.id, { label: 'reads/writes', animated: true }),
    createEdge(wsHandler.id, connectionsTable.id, { label: 'manages' }),
    createEdge(authHandler.id, usersTable.id, { label: 'reads' }),
    // SQS -> Lambda
    createEdge(processingQueue.id, asyncProcessor.id, { label: 'triggers', animated: true }),
    // SNS -> SQS
    createEdge(notificationsTopic.id, processingQueue.id, { label: 'publishes' }),
    // EventBridge -> Lambda
    createEdge(eventBus.id, asyncProcessor.id, { label: 'routes' }),
    createEdge(scheduledRule.id, scheduledJob.id, { label: 'triggers', animated: true }),
    // Lambda -> S3
    createEdge(apiHandler.id, uploadsBucket.id, { label: 'uploads' }),
    // Cognito -> API
    createEdge(userPool.id, restApi.id, { label: 'authenticates' }),
    createEdge(userPool.id, wsApi.id, { label: 'authenticates' }),
    // IAM Role
    createEdge(lambdaRole.id, apiHandler.id, { label: 'role' }),
    createEdge(lambdaRole.id, authHandler.id, { label: 'role' }),
    createEdge(lambdaRole.id, wsHandler.id, { label: 'role' }),
    createEdge(lambdaRole.id, asyncProcessor.id, { label: 'role' }),
    createEdge(lambdaRole.id, scheduledJob.id, { label: 'role' }),
    // DLQ
    createEdge(processingQueue.id, dlq.id, { label: 'dead-letter' }),
    // Monitoring
    createEdge(errorAlarm.id, apiHandler.id, { label: 'monitors' }),
  ];

  return {
    name: 'Serverless Backend',
    description: 'Complete serverless API and data processing architecture using AWS managed services. Features API Gateway (REST and WebSocket), Lambda functions for request handling, DynamoDB for NoSQL storage, S3 for file uploads, SQS for async processing, SNS for notifications, EventBridge for event routing and scheduling, and Cognito for user authentication. Pay-per-use pricing with automatic scaling.',
    category: 'compute_platform',
    visibility: 'public',
    layerType: 'devops',
    version: '1.0.0',
    tags: ['serverless', 'lambda', 'api-gateway', 'dynamodb', 'cognito', 'event-driven', 'aws', 'pay-per-use'],
    templateData: {
      nodes,
      edges,
      metadata: {
        author: 'Deltek Catalyst Team',
        version: '1.0.0',
        tested: true,
        compliance: ['SOC2', 'HIPAA-eligible'],
        estimatedCost: {
          dev: 20,
          staging: 35,
          prod: 50,
          currency: 'USD',
        },
        prerequisites: [
          'AWS Account',
          'Domain name for API (optional)',
          'SSL/TLS certificate in ACM (for custom domain)',
        ],
        customizationGuide: 'Adjust Lambda memory and timeout based on workload complexity. Configure DynamoDB global secondary indexes for query patterns. Set up SQS batch size and visibility timeout for processing requirements. Configure Cognito password policy per security requirements.',
        deploymentTime: '10-15 minutes',
        components: [
          { type: 'API Gateway', count: 2, description: 'REST and WebSocket APIs' },
          { type: 'Lambda Functions', count: 5, description: 'API handlers and processors' },
          { type: 'DynamoDB Tables', count: 3, description: 'Users, Data, and Connections' },
          { type: 'S3 Bucket', count: 1, description: 'File uploads' },
          { type: 'SNS Topic', count: 1, description: 'Notifications' },
          { type: 'SQS Queues', count: 2, description: 'Processing queue and DLQ' },
          { type: 'EventBridge', count: 2, description: 'Event bus and scheduled rule' },
          { type: 'Cognito User Pool', count: 1, description: 'User authentication' },
          { type: 'IAM Role', count: 1, description: 'Lambda execution role' },
          { type: 'CloudWatch Alarm', count: 1, description: 'Error monitoring' },
        ],
      },
    },
  };
}
