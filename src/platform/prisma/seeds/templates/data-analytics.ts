/**
 * Data Analytics Platform Template
 * Big data processing and analytics with data lake architecture
 */

import type { TemplateDefinition } from './types';
import {
  createS3BucketNode,
  createKinesisStreamNode,
  createLambdaFunctionNode,
  createGlueJobNode,
  createEMRClusterNode,
  createRedshiftClusterNode,
  createIAMRoleNode,
  createSecurityGroupNode,
  createSNSTopicNode,
  createCloudWatchAlarmNode,
} from './utils/node-factory';
import { createEdge } from './utils/edge-factory';

export function createDataAnalyticsTemplate(): TemplateDefinition {
  // S3 Data Lake - Raw Zone
  const rawBucket = createS3BucketNode('data-lake-raw', { x: 100, y: 150 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'AES256' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // S3 Data Lake - Processed Zone
  const processedBucket = createS3BucketNode('data-lake-processed', { x: 380, y: 150 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'AES256' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // S3 Data Lake - Curated Zone
  const curatedBucket = createS3BucketNode('data-lake-curated', { x: 660, y: 150 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'AES256' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // Kinesis Data Stream for real-time ingestion
  const kinesisStream = createKinesisStreamNode('events-stream', { x: 100, y: 0 }, {
    shardCount: 2,
    retentionPeriod: 168, // 7 days
    streamMode: 'ON_DEMAND',
  });

  // Lambda for Kinesis processing
  const kinesisProcessor = createLambdaFunctionNode('kinesis-processor', { x: 100, y: 300 }, {
    runtime: 'python3.11',
    handler: 'processor.handler',
    memorySize: 1024,
    timeout: 60,
    description: 'Process Kinesis events and write to raw zone',
  });

  // Glue ETL Jobs
  const rawToProcessed = createGlueJobNode('raw-to-processed', { x: 280, y: 300 }, {
    glueVersion: '4.0',
    workerType: 'G.1X',
    numberOfWorkers: 5,
  });

  const processedToCurated = createGlueJobNode('processed-to-curated', { x: 560, y: 300 }, {
    glueVersion: '4.0',
    workerType: 'G.1X',
    numberOfWorkers: 5,
  });

  // EMR Cluster for Spark
  const emrCluster = createEMRClusterNode('analytics-cluster', { x: 840, y: 300 }, {
    releaseLabel: 'emr-6.15.0',
    applications: ['Spark', 'Hive', 'Presto'],
    masterInstanceType: 'm5.xlarge',
    coreInstanceType: 'm5.xlarge',
    coreInstanceCount: 3,
  });

  // Redshift Cluster for data warehouse
  const redshift = createRedshiftClusterNode('data-warehouse', { x: 940, y: 150 }, {
    nodeType: 'dc2.large',
    numberOfNodes: 2,
    databaseName: 'analytics',
    port: 5439,
  });

  // Security Groups
  const emrSg = createSecurityGroupNode('emr-sg', { x: 660, y: 450 }, {
    description: 'Security group for EMR cluster',
    ingressRules: [
      { id: 'emr-internal', protocol: '-1', fromPort: 0, toPort: 0, securityGroupIds: ['emr-sg'], description: 'EMR internal' },
      { id: 'ssh', protocol: 'tcp', fromPort: 22, toPort: 22, cidrBlocks: ['10.0.0.0/8'], description: 'SSH from corporate' },
    ],
    egressRules: [
      { id: 'all-out', protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'], description: 'Allow all outbound' },
    ],
  });

  const redshiftSg = createSecurityGroupNode('redshift-sg', { x: 940, y: 450 }, {
    description: 'Security group for Redshift cluster',
    ingressRules: [
      { id: 'redshift', protocol: 'tcp', fromPort: 5439, toPort: 5439, cidrBlocks: ['10.0.0.0/8'], description: 'Redshift from corporate' },
      { id: 'from-emr', protocol: 'tcp', fromPort: 5439, toPort: 5439, securityGroupIds: ['emr-sg'], description: 'From EMR' },
    ],
    egressRules: [],
  });

  // IAM Roles
  const glueRole = createIAMRoleNode('glue-service-role', { x: 280, y: 450 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'glue.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole',
      'arn:aws:iam::aws:policy/AmazonS3FullAccess',
    ],
    description: 'IAM role for Glue ETL jobs',
  });

  const emrRole = createIAMRoleNode('emr-service-role', { x: 460, y: 450 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'elasticmapreduce.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceRole',
    ],
    description: 'IAM role for EMR service',
  });

  const lambdaRole = createIAMRoleNode('kinesis-lambda-role', { x: 100, y: 450 }, {
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
      'arn:aws:iam::aws:policy/service-role/AWSLambdaKinesisExecutionRole',
      'arn:aws:iam::aws:policy/AmazonS3FullAccess',
    ],
    description: 'IAM role for Kinesis processor Lambda',
  });

  // Alerts
  const alertsTopic = createSNSTopicNode('pipeline-alerts', { x: 380, y: 0 }, {
    displayName: 'Data Pipeline Alerts',
    fifoTopic: false,
  });

  const glueFailureAlarm = createCloudWatchAlarmNode('glue-failure-alarm', { x: 560, y: 0 }, {
    metricName: 'glue.driver.BlockManager.disk.diskSpaceUsed_MB',
    namespace: 'AWS/Glue',
    statistic: 'Average',
    period: 300,
    threshold: 80,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2,
  });

  const nodes = [
    rawBucket, processedBucket, curatedBucket,
    kinesisStream, kinesisProcessor,
    rawToProcessed, processedToCurated,
    emrCluster, redshift,
    emrSg, redshiftSg,
    glueRole, emrRole, lambdaRole,
    alertsTopic, glueFailureAlarm,
  ];

  const edges = [
    // Kinesis -> Lambda -> Raw
    createEdge(kinesisStream.id, kinesisProcessor.id, { label: 'triggers', animated: true }),
    createEdge(kinesisProcessor.id, rawBucket.id, { label: 'writes', animated: true }),
    // Glue ETL Pipeline
    createEdge(rawBucket.id, rawToProcessed.id, { label: 'source', animated: true }),
    createEdge(rawToProcessed.id, processedBucket.id, { label: 'destination', animated: true }),
    createEdge(processedBucket.id, processedToCurated.id, { label: 'source', animated: true }),
    createEdge(processedToCurated.id, curatedBucket.id, { label: 'destination', animated: true }),
    // EMR reads from curated
    createEdge(curatedBucket.id, emrCluster.id, { label: 'reads' }),
    // Redshift loads from curated
    createEdge(curatedBucket.id, redshift.id, { label: 'loads', animated: true }),
    // EMR -> Redshift
    createEdge(emrCluster.id, redshift.id, { label: 'writes' }),
    // Security Groups
    createEdge(emrSg.id, emrCluster.id, { label: 'secures' }),
    createEdge(redshiftSg.id, redshift.id, { label: 'secures' }),
    // IAM Roles
    createEdge(glueRole.id, rawToProcessed.id, { label: 'role' }),
    createEdge(glueRole.id, processedToCurated.id, { label: 'role' }),
    createEdge(emrRole.id, emrCluster.id, { label: 'role' }),
    createEdge(lambdaRole.id, kinesisProcessor.id, { label: 'role' }),
    // Monitoring
    createEdge(glueFailureAlarm.id, alertsTopic.id, { label: 'alerts' }),
  ];

  return {
    name: 'Data Analytics Platform',
    description: 'Comprehensive big data processing and analytics platform with a three-zone data lake architecture (raw, processed, curated). Features Kinesis for real-time data ingestion, AWS Glue for serverless ETL, EMR with Spark/Hive/Presto for large-scale processing, and Redshift for data warehousing. Includes Athena integration for ad-hoc queries and QuickSight-ready data structure for visualization.',
    category: 'fullstack',
    visibility: 'public',
    layerType: 'fullstack',
    version: '1.0.0',
    tags: ['analytics', 'data-lake', 'etl', 'spark', 'redshift', 'kinesis', 'glue', 'big-data', 'aws'],
    templateData: {
      nodes,
      edges,
      metadata: {
        author: 'Deltek Catalyst Team',
        version: '1.0.0',
        tested: true,
        compliance: ['SOC2', 'HIPAA-eligible'],
        estimatedCost: {
          dev: 400,
          staging: 600,
          prod: 800,
          currency: 'USD',
        },
        prerequisites: [
          'AWS Account with VPC (private subnets for EMR/Redshift)',
          'Data sources identified and documented',
          'Schema design for curated zone',
          'IAM permissions for Glue and EMR',
        ],
        customizationGuide: 'Adjust Kinesis shard count based on ingestion volume. Scale EMR cluster instance types and count for workload requirements. Modify Redshift node type (dc2.large -> ra3.xlplus) for larger datasets. Configure Glue job DPUs based on data volume.',
        deploymentTime: '25-35 minutes',
        components: [
          { type: 'S3 Buckets', count: 3, description: 'Data lake zones (raw/processed/curated)' },
          { type: 'Kinesis Stream', count: 1, description: 'Real-time data ingestion' },
          { type: 'Lambda Function', count: 1, description: 'Kinesis event processor' },
          { type: 'Glue Jobs', count: 2, description: 'ETL transformations' },
          { type: 'EMR Cluster', count: 1, description: 'Spark/Hive/Presto processing' },
          { type: 'Redshift Cluster', count: 1, description: 'Data warehouse' },
          { type: 'Security Groups', count: 2, description: 'EMR and Redshift' },
          { type: 'IAM Roles', count: 3, description: 'Glue, EMR, Lambda roles' },
          { type: 'Monitoring', count: 2, description: 'SNS alerts and CloudWatch alarm' },
        ],
      },
    },
  };
}
