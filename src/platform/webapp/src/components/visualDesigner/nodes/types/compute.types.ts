/**
 * Compute Node Data Types
 * Types for EC2 Instance, Auto Scaling Group, ECS Cluster, and Lambda Function nodes
 */

import { BaseNodeData } from './base.types';

/**
 * EBS Volume Configuration
 */
export interface EBSVolume {
  id: string;
  deviceName: string;
  volumeSize: number;
  volumeType: 'gp3' | 'gp2' | 'io1' | 'io2' | 'st1' | 'sc1';
  deleteOnTermination: boolean;
  encrypted: boolean;
  kmsKeyId?: string;
  iops?: number;
  throughput?: number;
}

/**
 * EC2 Instance Node Data
 */
export interface EC2InstanceNodeData extends BaseNodeData {
  serviceType: 'ec2-instance';
  category: 'compute';
  instanceType: string;
  ami: string;
  subnetId: string;
  securityGroupIds: string[];
  iamInstanceProfile?: string;
  keyName?: string;
  userData?: string;
  rootBlockDevice: EBSVolume;
  additionalVolumes: EBSVolume[];
  monitoring: boolean;
  associatePublicIpAddress: boolean;
  ebsOptimized: boolean;
  instanceState: 'pending' | 'running' | 'stopping' | 'stopped' | 'shutting-down' | 'terminated';
}

/**
 * Scaling Policy Types
 */
export type ScalingPolicyType = 'TargetTrackingScaling' | 'StepScaling' | 'SimpleScaling';

/**
 * Scaling Policy Configuration
 */
export interface ScalingPolicy {
  name: string;
  policyType: ScalingPolicyType;
  targetTrackingConfiguration?: {
    predefinedMetricSpecification?: {
      predefinedMetricType: 'ASGAverageCPUUtilization' | 'ASGAverageNetworkIn' | 'ASGAverageNetworkOut' | 'ALBRequestCountPerTarget';
      resourceLabel?: string;
    };
    targetValue: number;
    disableScaleIn?: boolean;
  };
  stepAdjustments?: {
    metricIntervalLowerBound?: number;
    metricIntervalUpperBound?: number;
    scalingAdjustment: number;
  }[];
  cooldown?: number;
}

/**
 * ASG Notification Configuration
 */
export interface ASGNotification {
  topicArn: string;
  notificationTypes: string[];
}

/**
 * Auto Scaling Group Node Data
 */
export interface AutoScalingGroupNodeData extends BaseNodeData {
  serviceType: 'auto-scaling-group';
  category: 'compute';
  minSize: number;
  maxSize: number;
  desiredCapacity: number;
  launchTemplateId: string;
  launchTemplateVersion: string;
  vpcZoneIdentifier: string[];
  targetGroupArns?: string[];
  healthCheckType: 'EC2' | 'ELB';
  healthCheckGracePeriod: number;
  scalingPolicies: ScalingPolicy[];
  notifications?: ASGNotification[];
  terminationPolicies: string[];
  suspendedProcesses: string[];
}

/**
 * ECS Capacity Provider Strategy
 */
export interface CapacityProviderStrategy {
  capacityProvider: string;
  weight: number;
  base?: number;
}

/**
 * ECS Service Network Configuration
 */
export interface ECSNetworkConfiguration {
  subnets: string[];
  securityGroups: string[];
  assignPublicIp: boolean;
}

/**
 * ECS Service Definition
 */
export interface ECSService {
  name: string;
  taskDefinition: string;
  desiredCount: number;
  launchType: 'FARGATE' | 'EC2';
  networkConfiguration: ECSNetworkConfiguration;
  loadBalancers?: {
    targetGroupArn: string;
    containerName: string;
    containerPort: number;
  }[];
  deploymentConfiguration?: {
    maximumPercent: number;
    minimumHealthyPercent: number;
  };
}

/**
 * ECS Cluster Node Data
 */
export interface ECSClusterNodeData extends BaseNodeData {
  serviceType: 'ecs-cluster';
  category: 'compute';
  capacityProviders: ('FARGATE' | 'FARGATE_SPOT' | string)[];
  defaultCapacityProviderStrategy: CapacityProviderStrategy[];
  settings: {
    containerInsights: 'enabled' | 'disabled';
  };
  services: ECSService[];
  serviceCount: number;
  runningTaskCount: number;
}

/**
 * Lambda Runtime Types
 */
export type LambdaRuntime =
  | 'nodejs18.x'
  | 'nodejs20.x'
  | 'python3.9'
  | 'python3.10'
  | 'python3.11'
  | 'python3.12'
  | 'java17'
  | 'java21'
  | 'go1.x'
  | 'dotnet6'
  | 'dotnet8'
  | 'ruby3.2';

/**
 * Lambda VPC Configuration
 */
export interface LambdaVpcConfig {
  subnetIds: string[];
  securityGroupIds: string[];
}

/**
 * Lambda Function Node Data
 */
export interface LambdaFunctionNodeData extends BaseNodeData {
  serviceType: 'lambda-function';
  category: 'compute';
  functionName: string;
  runtime: LambdaRuntime;
  handler: string;
  memorySize: number;
  timeout: number;
  role: string;
  environment?: Record<string, string>;
  vpcConfig?: LambdaVpcConfig;
  layers?: string[];
  tracingConfig?: {
    mode: 'Active' | 'PassThrough';
  };
  deadLetterConfig?: {
    targetArn: string;
  };
  reservedConcurrentExecutions?: number;
  ephemeralStorage?: {
    size: number;
  };
  codeSize?: number;
  lastModified?: string;
}

/**
 * Default EC2 Instance data
 */
export const DEFAULT_EC2_INSTANCE_DATA: Partial<EC2InstanceNodeData> = {
  serviceType: 'ec2-instance',
  category: 'compute',
  instanceType: 't3.micro',
  ami: '',
  subnetId: '',
  securityGroupIds: [],
  rootBlockDevice: {
    id: 'root',
    deviceName: '/dev/xvda',
    volumeSize: 8,
    volumeType: 'gp3',
    deleteOnTermination: true,
    encrypted: true,
  },
  additionalVolumes: [],
  monitoring: false,
  associatePublicIpAddress: false,
  ebsOptimized: false,
  instanceState: 'stopped',
  status: 'unconfigured',
  tags: {},
};

/**
 * Default Auto Scaling Group data
 */
export const DEFAULT_ASG_DATA: Partial<AutoScalingGroupNodeData> = {
  serviceType: 'auto-scaling-group',
  category: 'compute',
  minSize: 1,
  maxSize: 3,
  desiredCapacity: 1,
  launchTemplateId: '',
  launchTemplateVersion: '$Latest',
  vpcZoneIdentifier: [],
  healthCheckType: 'EC2',
  healthCheckGracePeriod: 300,
  scalingPolicies: [],
  terminationPolicies: ['Default'],
  suspendedProcesses: [],
  status: 'unconfigured',
  tags: {},
};

/**
 * Default ECS Cluster data
 */
export const DEFAULT_ECS_CLUSTER_DATA: Partial<ECSClusterNodeData> = {
  serviceType: 'ecs-cluster',
  category: 'compute',
  capacityProviders: ['FARGATE', 'FARGATE_SPOT'],
  defaultCapacityProviderStrategy: [
    { capacityProvider: 'FARGATE', weight: 1 },
  ],
  settings: {
    containerInsights: 'enabled',
  },
  services: [],
  serviceCount: 0,
  runningTaskCount: 0,
  status: 'unconfigured',
  tags: {},
};

/**
 * Default Lambda Function data
 */
export const DEFAULT_LAMBDA_DATA: Partial<LambdaFunctionNodeData> = {
  serviceType: 'lambda-function',
  category: 'compute',
  functionName: '',
  runtime: 'nodejs20.x',
  handler: 'index.handler',
  memorySize: 128,
  timeout: 3,
  role: '',
  environment: {},
  layers: [],
  status: 'unconfigured',
  tags: {},
};
