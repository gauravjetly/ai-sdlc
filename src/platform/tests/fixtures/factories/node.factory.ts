/**
 * Node Factory
 *
 * Factory for creating test infrastructure node data.
 */

import { v4 as uuidv4 } from 'uuid';

export interface InfraNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
  selected?: boolean;
  dragging?: boolean;
}

export interface NodeData {
  name: string;
  config: Record<string, unknown>;
  status?: 'pending' | 'provisioning' | 'running' | 'stopped' | 'error';
  layer?: string;
  environment?: string;
}

export type NodeType =
  | 'vpc'
  | 'subnet'
  | 'securityGroup'
  | 'internetGateway'
  | 'natGateway'
  | 'routeTable'
  | 'ec2Instance'
  | 'autoScalingGroup'
  | 'loadBalancer'
  | 'lambdaFunction'
  | 's3Bucket'
  | 'dynamoDbTable'
  | 'rdsInstance'
  | 'elasticache'
  | 'snsNotification'
  | 'sqsQueue'
  | 'apiGateway'
  | 'cloudFront'
  | 'route53'
  | 'iamRole'
  | 'iamPolicy'
  | 'kmsKey'
  | 'secretsManager'
  | 'cloudWatch'
  | 'cloudTrail'
  | 'ecsCluster'
  | 'eksCluster';

const instanceTypes = ['t3.micro', 't3.small', 't3.medium', 't3.large', 'm5.large', 'm5.xlarge'];
const rdsEngines = ['postgres', 'mysql', 'mariadb', 'oracle', 'sqlserver'];
const lambdaRuntimes = ['nodejs18.x', 'nodejs20.x', 'python3.11', 'python3.12', 'java17', 'go1.x'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const NodeFactory = {
  /**
   * Create a generic node
   */
  create: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return {
      id: uuidv4(),
      type: 'ec2Instance',
      position: {
        x: Math.floor(Math.random() * 800) + 100,
        y: Math.floor(Math.random() * 600) + 100,
      },
      data: {
        name: `resource-${uuidv4().substring(0, 8)}`,
        config: {},
        status: 'pending',
        layer: 'compute',
      },
      selected: false,
      dragging: false,
      ...overrides,
    };
  },

  /**
   * Create a VPC node
   */
  createVPC: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 'vpc',
      data: {
        name: `vpc-${uuidv4().substring(0, 8)}`,
        config: {
          cidr: '10.0.0.0/16',
          enableDnsHostnames: true,
          enableDnsSupport: true,
          instanceTenancy: 'default',
        },
        status: 'pending',
        layer: 'network',
      },
      ...overrides,
    });
  },

  /**
   * Create a Subnet node
   */
  createSubnet: (overrides: Partial<InfraNode> = {}): InfraNode => {
    const az = randomElement(['us-east-1a', 'us-east-1b', 'us-east-1c']);
    return NodeFactory.create({
      type: 'subnet',
      data: {
        name: `subnet-${uuidv4().substring(0, 8)}`,
        config: {
          cidr: '10.0.1.0/24',
          availabilityZone: az,
          mapPublicIpOnLaunch: false,
          isPublic: false,
        },
        status: 'pending',
        layer: 'network',
      },
      ...overrides,
    });
  },

  /**
   * Create a Security Group node
   */
  createSecurityGroup: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 'securityGroup',
      data: {
        name: `sg-${uuidv4().substring(0, 8)}`,
        config: {
          description: 'Security group for application',
          ingressRules: [
            { port: 443, protocol: 'tcp', source: '0.0.0.0/0' },
            { port: 80, protocol: 'tcp', source: '0.0.0.0/0' },
          ],
          egressRules: [
            { port: 0, protocol: '-1', destination: '0.0.0.0/0' },
          ],
        },
        status: 'pending',
        layer: 'security',
      },
      ...overrides,
    });
  },

  /**
   * Create an EC2 Instance node
   */
  createEC2: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 'ec2Instance',
      data: {
        name: `ec2-${uuidv4().substring(0, 8)}`,
        config: {
          instanceType: randomElement(instanceTypes),
          ami: 'ami-0123456789abcdef0',
          keyPair: 'my-key-pair',
          rootVolumeSize: 30,
          rootVolumeType: 'gp3',
          monitoring: true,
          associatePublicIp: false,
        },
        status: 'pending',
        layer: 'compute',
      },
      ...overrides,
    });
  },

  /**
   * Create a Lambda Function node
   */
  createLambda: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 'lambdaFunction',
      data: {
        name: `lambda-${uuidv4().substring(0, 8)}`,
        config: {
          runtime: randomElement(lambdaRuntimes),
          memory: randomElement([128, 256, 512, 1024, 2048]),
          timeout: 30,
          handler: 'index.handler',
          environment: {},
          tracingConfig: 'Active',
        },
        status: 'pending',
        layer: 'compute',
      },
      ...overrides,
    });
  },

  /**
   * Create an S3 Bucket node
   */
  createS3: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 's3Bucket',
      data: {
        name: `s3-${uuidv4().substring(0, 8)}`,
        config: {
          versioning: true,
          encryption: 'AES256',
          publicAccess: false,
          lifecycleRules: [],
          cors: [],
        },
        status: 'pending',
        layer: 'storage',
      },
      ...overrides,
    });
  },

  /**
   * Create an RDS Instance node
   */
  createRDS: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 'rdsInstance',
      data: {
        name: `rds-${uuidv4().substring(0, 8)}`,
        config: {
          engine: randomElement(rdsEngines),
          engineVersion: '15.4',
          instanceClass: 'db.t3.medium',
          allocatedStorage: 100,
          multiAz: true,
          storageEncrypted: true,
          deletionProtection: true,
          backupRetention: 7,
        },
        status: 'pending',
        layer: 'database',
      },
      ...overrides,
    });
  },

  /**
   * Create a DynamoDB Table node
   */
  createDynamoDB: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 'dynamoDbTable',
      data: {
        name: `dynamo-${uuidv4().substring(0, 8)}`,
        config: {
          partitionKey: { name: 'id', type: 'S' },
          sortKey: { name: 'timestamp', type: 'N' },
          billingMode: 'PAY_PER_REQUEST',
          encryption: true,
          pointInTimeRecovery: true,
        },
        status: 'pending',
        layer: 'database',
      },
      ...overrides,
    });
  },

  /**
   * Create an IAM Role node
   */
  createIAMRole: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 'iamRole',
      data: {
        name: `role-${uuidv4().substring(0, 8)}`,
        config: {
          assumeRolePolicy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'ec2.amazonaws.com' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
          managedPolicies: [],
          inlinePolicies: [],
        },
        status: 'pending',
        layer: 'security',
      },
      ...overrides,
    });
  },

  /**
   * Create an API Gateway node
   */
  createAPIGateway: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 'apiGateway',
      data: {
        name: `api-${uuidv4().substring(0, 8)}`,
        config: {
          type: 'REST',
          endpointType: 'REGIONAL',
          authorizationType: 'NONE',
          corsEnabled: true,
          stages: ['dev', 'staging', 'prod'],
        },
        status: 'pending',
        layer: 'compute',
      },
      ...overrides,
    });
  },

  /**
   * Create a Load Balancer node
   */
  createALB: (overrides: Partial<InfraNode> = {}): InfraNode => {
    return NodeFactory.create({
      type: 'loadBalancer',
      data: {
        name: `alb-${uuidv4().substring(0, 8)}`,
        config: {
          type: 'application',
          scheme: 'internet-facing',
          ipAddressType: 'ipv4',
          deletionProtection: true,
          idleTimeout: 60,
        },
        status: 'pending',
        layer: 'network',
      },
      ...overrides,
    });
  },

  /**
   * Create multiple nodes of the same type
   */
  createMany: (count: number, type?: NodeType, overrides: Partial<InfraNode> = {}): InfraNode[] => {
    const factoryMap: Record<string, () => InfraNode> = {
      vpc: () => NodeFactory.createVPC(overrides),
      subnet: () => NodeFactory.createSubnet(overrides),
      securityGroup: () => NodeFactory.createSecurityGroup(overrides),
      ec2Instance: () => NodeFactory.createEC2(overrides),
      lambdaFunction: () => NodeFactory.createLambda(overrides),
      s3Bucket: () => NodeFactory.createS3(overrides),
      rdsInstance: () => NodeFactory.createRDS(overrides),
      dynamoDbTable: () => NodeFactory.createDynamoDB(overrides),
      iamRole: () => NodeFactory.createIAMRole(overrides),
      apiGateway: () => NodeFactory.createAPIGateway(overrides),
      loadBalancer: () => NodeFactory.createALB(overrides),
    };

    const factory = type ? factoryMap[type] : () => NodeFactory.create(overrides);
    return Array.from({ length: count }, factory || (() => NodeFactory.create(overrides)));
  },
};

export default NodeFactory;
