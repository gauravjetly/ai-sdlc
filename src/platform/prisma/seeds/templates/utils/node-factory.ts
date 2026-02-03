/**
 * Node Factory Utilities
 * Creates properly configured nodes for infrastructure templates
 */

import { v4 as uuid } from 'uuid';
import type {
  TemplateNode,
  SecurityRule,
  LoadBalancerListener,
  TargetGroup,
  ScalingPolicy,
} from '../types';

const NOW = new Date().toISOString();

/**
 * Create a Security Group node
 */
export function createSecurityGroupNode(
  name: string,
  position: { x: number; y: number },
  config: {
    description: string;
    ingressRules: SecurityRule[];
    egressRules: SecurityRule[];
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'securityGroup',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'security-group',
      category: 'security',
      description: config.description,
      vpcId: '',
      ingressRules: config.ingressRules,
      egressRules: config.egressRules,
      ruleCount: config.ingressRules.length + config.egressRules.length,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an IAM Role node
 */
export function createIAMRoleNode(
  name: string,
  position: { x: number; y: number },
  config: {
    assumeRolePolicy: string;
    managedPolicyArns: string[];
    description?: string;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'iamRole',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'iam-role',
      category: 'security',
      path: '/',
      assumeRolePolicy: config.assumeRolePolicy,
      description: config.description || '',
      maxSessionDuration: 3600,
      managedPolicyArns: config.managedPolicyArns,
      inlinePolicies: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a KMS Key node
 */
export function createKMSKeyNode(
  name: string,
  position: { x: number; y: number },
  config: {
    alias: string;
    description?: string;
    enableKeyRotation?: boolean;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'kmsKey',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'kms-key',
      category: 'security',
      alias: config.alias,
      description: config.description || '',
      keySpec: 'SYMMETRIC_DEFAULT',
      keyUsage: 'ENCRYPT_DECRYPT',
      policy: '',
      enableKeyRotation: config.enableKeyRotation ?? true,
      deletionWindowInDays: 30,
      multiRegion: false,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a Load Balancer node
 */
export function createLoadBalancerNode(
  name: string,
  position: { x: number; y: number },
  config: {
    type: 'application' | 'network';
    scheme: 'internet-facing' | 'internal';
    listeners: LoadBalancerListener[];
    targetGroups: TargetGroup[];
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'loadBalancer',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'load-balancer',
      category: 'networking',
      type: config.type,
      scheme: config.scheme,
      subnets: [],
      securityGroups: [],
      listeners: config.listeners,
      targetGroups: config.targetGroups,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
      estimatedMonthlyCost: 22.68,
    },
  };
}

/**
 * Create a CloudFront node
 */
export function createCloudFrontNode(
  name: string,
  position: { x: number; y: number },
  config: {
    priceClass: 'PriceClass_All' | 'PriceClass_200' | 'PriceClass_100';
    defaultRootObject?: string;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'cloudfront',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'cloudfront',
      category: 'networking',
      aliases: [],
      enabled: true,
      priceClass: config.priceClass,
      defaultRootObject: config.defaultRootObject,
      origins: [],
      defaultCacheBehavior: {
        targetOriginId: '',
        viewerProtocolPolicy: 'redirect-to-https',
        allowedMethods: ['GET', 'HEAD'],
        cachedMethods: ['GET', 'HEAD'],
        compress: true,
        ttl: { default: 86400, max: 31536000, min: 0 },
      },
      cacheBehaviors: [],
      viewerCertificate: { cloudfrontDefaultCertificate: true },
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a Transit Gateway node
 */
export function createTransitGatewayNode(
  name: string,
  position: { x: number; y: number },
  config: {
    amazonSideAsn?: number;
    description?: string;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'transitGateway',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'transit-gateway',
      category: 'networking',
      amazonSideAsn: config.amazonSideAsn ?? 64512,
      description: config.description || '',
      autoAcceptSharedAttachments: false,
      defaultRouteTableAssociation: true,
      defaultRouteTablePropagation: true,
      dnsSupport: true,
      vpnEcmpSupport: true,
      attachments: [],
      routes: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a VPN Gateway node
 */
export function createVPNGatewayNode(
  name: string,
  position: { x: number; y: number },
  config: {
    amazonSideAsn?: number;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'vpnGateway',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'vpn-gateway',
      category: 'networking',
      vpcId: '',
      amazonSideAsn: config.amazonSideAsn ?? 64512,
      type: 'ipsec.1',
      customerGateways: [],
      connections: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an Auto Scaling Group node
 */
export function createAutoScalingGroupNode(
  name: string,
  position: { x: number; y: number },
  config: {
    minSize: number;
    maxSize: number;
    desiredCapacity: number;
    instanceType: string;
    healthCheckType: 'EC2' | 'ELB';
    scalingPolicies: ScalingPolicy[];
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'autoScalingGroup',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'auto-scaling-group',
      category: 'compute',
      minSize: config.minSize,
      maxSize: config.maxSize,
      desiredCapacity: config.desiredCapacity,
      launchTemplateId: '',
      launchTemplateVersion: '$Latest',
      instanceType: config.instanceType,
      vpcZoneIdentifier: [],
      targetGroupArns: [],
      healthCheckType: config.healthCheckType,
      healthCheckGracePeriod: 300,
      scalingPolicies: config.scalingPolicies,
      terminationPolicies: ['Default'],
      suspendedProcesses: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an EKS Cluster node
 */
export function createEKSClusterNode(
  name: string,
  position: { x: number; y: number },
  config: {
    version: string;
    endpointPublicAccess: boolean;
    endpointPrivateAccess: boolean;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'eksCluster',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'eks-cluster',
      category: 'compute',
      version: config.version,
      roleArn: '',
      resourcesVpcConfig: {
        subnetIds: [],
        securityGroupIds: [],
        endpointPublicAccess: config.endpointPublicAccess,
        endpointPrivateAccess: config.endpointPrivateAccess,
      },
      logging: {
        clusterLogging: [
          { types: ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler'], enabled: true },
        ],
      },
      nodeGroups: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
      estimatedMonthlyCost: 73.0,
    },
  };
}

/**
 * Create an ECS Cluster node
 */
export function createECSClusterNode(
  name: string,
  position: { x: number; y: number },
  config: {
    capacityProviders: string[];
    containerInsights: boolean;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'ecsCluster',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'ecs-cluster',
      category: 'compute',
      capacityProviders: config.capacityProviders,
      defaultCapacityProviderStrategy: [
        { capacityProvider: 'FARGATE', weight: 1 },
      ],
      settings: {
        containerInsights: config.containerInsights ? 'enabled' : 'disabled',
      },
      services: [],
      serviceCount: 0,
      runningTaskCount: 0,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a Lambda Function node
 */
export function createLambdaFunctionNode(
  name: string,
  position: { x: number; y: number },
  config: {
    runtime: string;
    handler: string;
    memorySize: number;
    timeout: number;
    description?: string;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'lambdaFunction',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'lambda-function',
      category: 'compute',
      functionName: name,
      runtime: config.runtime,
      handler: config.handler,
      memorySize: config.memorySize,
      timeout: config.timeout,
      role: '',
      description: config.description || '',
      environment: {},
      layers: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an RDS Instance node
 */
export function createRDSNode(
  name: string,
  position: { x: number; y: number },
  config: {
    engine: 'postgres' | 'mysql' | 'mariadb' | 'oracle' | 'sqlserver';
    engineVersion: string;
    instanceClass: string;
    multiAZ: boolean;
    storageType: 'gp2' | 'gp3' | 'io1' | 'io2';
    allocatedStorage: number;
    maxAllocatedStorage: number;
    databaseName: string;
    port: number;
    backupRetentionPeriod: number;
    deletionProtection: boolean;
    performanceInsightsEnabled: boolean;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'rdsInstance',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'rds-instance',
      category: 'storage',
      engine: config.engine,
      engineVersion: config.engineVersion,
      instanceClass: config.instanceClass,
      multiAZ: config.multiAZ,
      storageType: config.storageType,
      allocatedStorage: config.allocatedStorage,
      maxAllocatedStorage: config.maxAllocatedStorage,
      databaseName: config.databaseName,
      port: config.port,
      masterUsername: 'admin',
      backupRetentionPeriod: config.backupRetentionPeriod,
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      deletionProtection: config.deletionProtection,
      storageEncrypted: true,
      performanceInsightsEnabled: config.performanceInsightsEnabled,
      autoMinorVersionUpgrade: true,
      publiclyAccessible: false,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an ElastiCache node
 */
export function createElastiCacheNode(
  name: string,
  position: { x: number; y: number },
  config: {
    engine: 'redis' | 'memcached';
    engineVersion: string;
    nodeType: string;
    numCacheNodes: number;
    multiAZEnabled?: boolean;
    automaticFailoverEnabled?: boolean;
    transitEncryptionEnabled?: boolean;
    atRestEncryptionEnabled?: boolean;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'elasticacheCluster',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'elasticache-cluster',
      category: 'storage',
      clusterId: name,
      engine: config.engine,
      engineVersion: config.engineVersion,
      nodeType: config.nodeType,
      numCacheNodes: config.numCacheNodes,
      subnetGroupName: '',
      securityGroupIds: [],
      port: config.engine === 'redis' ? 6379 : 11211,
      autoMinorVersionUpgrade: true,
      transitEncryptionEnabled: config.transitEncryptionEnabled ?? true,
      atRestEncryptionEnabled: config.atRestEncryptionEnabled ?? true,
      multiAZEnabled: config.multiAZEnabled ?? false,
      automaticFailoverEnabled: config.automaticFailoverEnabled ?? false,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an S3 Bucket node
 */
export function createS3BucketNode(
  name: string,
  position: { x: number; y: number },
  config: {
    versioning: boolean;
    encryption: { enabled: boolean; algorithm: 'AES256' | 'aws:kms'; kmsKeyId?: string };
    blockPublicAccess: {
      blockPublicAcls: boolean;
      ignorePublicAcls: boolean;
      blockPublicPolicy: boolean;
      restrictPublicBuckets: boolean;
    };
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 's3Bucket',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 's3-bucket',
      category: 'storage',
      bucketName: name,
      acl: 'private',
      versioning: config.versioning,
      encryption: config.encryption,
      lifecycleRules: [],
      blockPublicAccess: config.blockPublicAccess,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a DynamoDB Table node
 */
export function createDynamoDBNode(
  name: string,
  position: { x: number; y: number },
  config: {
    billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
    hashKey: { name: string; type: 'S' | 'N' | 'B' };
    rangeKey?: { name: string; type: 'S' | 'N' | 'B' };
    pointInTimeRecovery: boolean;
    streamEnabled?: boolean;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'dynamodbTable',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'dynamodb-table',
      category: 'storage',
      tableName: name,
      billingMode: config.billingMode,
      hashKey: config.hashKey,
      rangeKey: config.rangeKey,
      globalSecondaryIndexes: [],
      localSecondaryIndexes: [],
      encryption: { enabled: true },
      pointInTimeRecovery: config.pointInTimeRecovery,
      streamEnabled: config.streamEnabled ?? false,
      tableClass: 'STANDARD',
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an API Gateway node
 */
export function createAPIGatewayNode(
  name: string,
  position: { x: number; y: number },
  config: {
    type: 'REST' | 'HTTP' | 'WEBSOCKET';
    description?: string;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'apiGateway',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'api-gateway',
      category: 'networking',
      apiType: config.type,
      description: config.description || '',
      endpointType: 'REGIONAL',
      stages: [{ name: 'prod', description: 'Production stage' }],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a Cognito User Pool node
 */
export function createCognitoNode(
  name: string,
  position: { x: number; y: number },
  config: {
    mfaConfiguration: 'OFF' | 'ON' | 'OPTIONAL';
    passwordPolicy: {
      minimumLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'cognitoUserPool',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'cognito-user-pool',
      category: 'security',
      mfaConfiguration: config.mfaConfiguration,
      passwordPolicy: config.passwordPolicy,
      autoVerifiedAttributes: ['email'],
      usernameAttributes: ['email'],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an SNS Topic node
 */
export function createSNSTopicNode(
  name: string,
  position: { x: number; y: number },
  config: {
    displayName?: string;
    fifoTopic?: boolean;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'snsTopic',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'sns-topic',
      category: 'monitoring',
      displayName: config.displayName || name,
      fifoTopic: config.fifoTopic ?? false,
      contentBasedDeduplication: false,
      subscriptions: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an SQS Queue node
 */
export function createSQSQueueNode(
  name: string,
  position: { x: number; y: number },
  config: {
    fifoQueue?: boolean;
    visibilityTimeout?: number;
    messageRetentionPeriod?: number;
    delaySeconds?: number;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'sqsQueue',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'sqs-queue',
      category: 'monitoring',
      fifoQueue: config.fifoQueue ?? false,
      visibilityTimeout: config.visibilityTimeout ?? 30,
      messageRetentionPeriod: config.messageRetentionPeriod ?? 345600,
      delaySeconds: config.delaySeconds ?? 0,
      maxMessageSize: 262144,
      receiveMessageWaitTimeSeconds: 0,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an EventBridge Rule node
 */
export function createEventBridgeNode(
  name: string,
  position: { x: number; y: number },
  config: {
    description?: string;
    scheduleExpression?: string;
    eventPattern?: string;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'eventbridgeRule',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'eventbridge-rule',
      category: 'monitoring',
      description: config.description || '',
      scheduleExpression: config.scheduleExpression,
      eventPattern: config.eventPattern,
      state: 'ENABLED',
      targets: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a CloudWatch Alarm node
 */
export function createCloudWatchAlarmNode(
  name: string,
  position: { x: number; y: number },
  config: {
    metricName: string;
    namespace: string;
    statistic: 'Average' | 'Sum' | 'Minimum' | 'Maximum' | 'SampleCount';
    period: number;
    threshold: number;
    comparisonOperator: 'GreaterThanThreshold' | 'LessThanThreshold' | 'GreaterThanOrEqualToThreshold' | 'LessThanOrEqualToThreshold';
    evaluationPeriods: number;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'cloudwatchAlarm',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'cloudwatch-alarm',
      category: 'monitoring',
      metricName: config.metricName,
      namespace: config.namespace,
      statistic: config.statistic,
      period: config.period,
      threshold: config.threshold,
      comparisonOperator: config.comparisonOperator,
      evaluationPeriods: config.evaluationPeriods,
      alarmActions: [],
      okActions: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an ECR Repository node
 */
export function createECRRepositoryNode(
  name: string,
  position: { x: number; y: number },
  config: {
    imageScanOnPush: boolean;
    imageTagMutability: 'MUTABLE' | 'IMMUTABLE';
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'ecrRepository',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'ecr-repository',
      category: 'storage',
      repositoryName: name,
      imageScanOnPush: config.imageScanOnPush,
      imageTagMutability: config.imageTagMutability,
      encryptionConfiguration: { encryptionType: 'AES256' },
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a CodePipeline node
 */
export function createCodePipelineNode(
  name: string,
  position: { x: number; y: number },
  config: {
    stages: { name: string; actions: string[] }[];
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'codepipeline',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'codepipeline',
      category: 'compute',
      pipelineName: name,
      stages: config.stages,
      roleArn: '',
      artifactStore: { type: 'S3', location: '' },
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a CodeBuild node
 */
export function createCodeBuildNode(
  name: string,
  position: { x: number; y: number },
  config: {
    computeType: 'BUILD_GENERAL1_SMALL' | 'BUILD_GENERAL1_MEDIUM' | 'BUILD_GENERAL1_LARGE';
    image: string;
    privilegedMode?: boolean;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'codebuild',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'codebuild',
      category: 'compute',
      projectName: name,
      environment: {
        computeType: config.computeType,
        image: config.image,
        type: 'LINUX_CONTAINER',
        privilegedMode: config.privilegedMode ?? false,
      },
      source: { type: 'CODEPIPELINE' },
      artifacts: { type: 'CODEPIPELINE' },
      serviceRole: '',
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a CodeDeploy node
 */
export function createCodeDeployNode(
  name: string,
  position: { x: number; y: number },
  config: {
    computePlatform: 'Server' | 'Lambda' | 'ECS';
    deploymentConfigName: string;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'codedeploy',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'codedeploy',
      category: 'compute',
      applicationName: name,
      computePlatform: config.computePlatform,
      deploymentConfigName: config.deploymentConfigName,
      deploymentGroups: [],
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a GuardDuty node
 */
export function createGuardDutyNode(
  name: string,
  position: { x: number; y: number },
  config: {
    findingPublishingFrequency: 'FIFTEEN_MINUTES' | 'ONE_HOUR' | 'SIX_HOURS';
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'guardduty',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'guardduty',
      category: 'security',
      enable: true,
      findingPublishingFrequency: config.findingPublishingFrequency,
      dataSources: {
        s3Logs: { enable: true },
        kubernetes: { auditLogs: { enable: true } },
        malwareProtection: { scanEc2InstanceWithFindings: { ebsVolumes: { enable: true } } },
      },
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a Security Hub node
 */
export function createSecurityHubNode(
  name: string,
  position: { x: number; y: number },
  config: {
    enabledStandards: string[];
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'securityHub',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'security-hub',
      category: 'security',
      enableDefaultStandards: true,
      enabledStandards: config.enabledStandards,
      autoEnableControls: true,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a CloudTrail node
 */
export function createCloudTrailNode(
  name: string,
  position: { x: number; y: number },
  config: {
    isMultiRegionTrail: boolean;
    enableLogFileValidation: boolean;
    includeGlobalServiceEvents: boolean;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'cloudtrail',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'cloudtrail',
      category: 'monitoring',
      trailName: name,
      isMultiRegionTrail: config.isMultiRegionTrail,
      enableLogFileValidation: config.enableLogFileValidation,
      includeGlobalServiceEvents: config.includeGlobalServiceEvents,
      isOrganizationTrail: false,
      s3BucketName: '',
      s3KeyPrefix: 'cloudtrail/',
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a Kinesis Stream node
 */
export function createKinesisStreamNode(
  name: string,
  position: { x: number; y: number },
  config: {
    shardCount: number;
    retentionPeriod: number;
    streamMode: 'ON_DEMAND' | 'PROVISIONED';
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'kinesisStream',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'kinesis-stream',
      category: 'storage',
      streamName: name,
      shardCount: config.shardCount,
      retentionPeriod: config.retentionPeriod,
      streamMode: config.streamMode,
      encryptionType: 'KMS',
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create an EMR Cluster node
 */
export function createEMRClusterNode(
  name: string,
  position: { x: number; y: number },
  config: {
    releaseLabel: string;
    applications: string[];
    masterInstanceType: string;
    coreInstanceType: string;
    coreInstanceCount: number;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'emrCluster',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'emr-cluster',
      category: 'compute',
      clusterName: name,
      releaseLabel: config.releaseLabel,
      applications: config.applications.map(a => ({ name: a })),
      masterInstanceGroup: { instanceType: config.masterInstanceType, instanceCount: 1 },
      coreInstanceGroup: { instanceType: config.coreInstanceType, instanceCount: config.coreInstanceCount },
      serviceRole: 'EMR_DefaultRole',
      jobFlowRole: 'EMR_EC2_DefaultRole',
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a Redshift Cluster node
 */
export function createRedshiftClusterNode(
  name: string,
  position: { x: number; y: number },
  config: {
    nodeType: string;
    numberOfNodes: number;
    databaseName: string;
    port: number;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'redshiftCluster',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'redshift-cluster',
      category: 'storage',
      clusterIdentifier: name,
      nodeType: config.nodeType,
      numberOfNodes: config.numberOfNodes,
      databaseName: config.databaseName,
      port: config.port,
      masterUsername: 'admin',
      encrypted: true,
      publiclyAccessible: false,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a Glue Job node
 */
export function createGlueJobNode(
  name: string,
  position: { x: number; y: number },
  config: {
    glueVersion: string;
    workerType: 'G.1X' | 'G.2X' | 'G.4X' | 'Standard';
    numberOfWorkers: number;
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'glueJob',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'glue-job',
      category: 'compute',
      jobName: name,
      role: '',
      glueVersion: config.glueVersion,
      workerType: config.workerType,
      numberOfWorkers: config.numberOfWorkers,
      command: { name: 'glueetl', scriptLocation: '' },
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

/**
 * Create a Route53 node
 */
export function createRoute53Node(
  name: string,
  position: { x: number; y: number },
  config: {
    zoneName: string;
    zoneType: 'public' | 'private';
  }
): TemplateNode {
  const nodeId = uuid();
  return {
    id: nodeId,
    type: 'route53',
    position,
    data: {
      id: nodeId,
      name,
      serviceType: 'route53',
      category: 'networking',
      zoneName: config.zoneName,
      zoneType: config.zoneType,
      records: [],
      recordCount: 0,
      status: 'configured',
      tags: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}
