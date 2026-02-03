/**
 * Cost Estimation Service
 * Real-time cost estimation with optimization suggestions
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';
import {
  DesignNode,
  LayerType,
  Environment,
  CostEstimate,
  ResourceCost,
} from '../types/designer.js';

const logger = createLogger('CostEstimationService');
const prisma = new PrismaClient();

// AWS Pricing data (monthly estimates in USD)
// In production, this would be fetched from AWS Pricing API
const AWS_PRICING: Record<string, Record<string, number>> = {
  // Network Layer - mostly free
  vpc: { base: 0 },
  subnet: { base: 0 },
  internet_gateway: { base: 0 },
  nat_gateway: { base: 32.4, dataProcessing: 0.045 }, // $0.045/GB
  route_table: { base: 0 },
  security_group: { base: 0 },
  network_acl: { base: 0 },
  vpc_peering: { dataTransfer: 0.01 }, // $0.01/GB
  transit_gateway: { base: 36, dataProcessing: 0.02 }, // $0.02/GB

  // Platform Layer - Compute
  eks_cluster: { base: 72 }, // $0.10/hr control plane
  eks_node_group: {
    't3.small': 15.18,
    't3.medium': 30.37,
    't3.large': 60.74,
    't3.xlarge': 121.47,
    'm5.large': 70.08,
    'm5.xlarge': 140.16,
    'm5.2xlarge': 280.32,
    'r5.large': 91.98,
    'r5.xlarge': 183.96,
  },

  // Platform Layer - Database
  rds_instance: {
    'db.t3.micro': 12.41,
    'db.t3.small': 24.82,
    'db.t3.medium': 49.64,
    'db.t3.large': 99.28,
    'db.r5.large': 175.2,
    'db.r5.xlarge': 350.4,
    'db.m5.large': 124.1,
    'db.m5.xlarge': 248.2,
    storage: 0.115, // per GB/month for gp2
  },
  rds_aurora: {
    'db.r5.large': 175.2,
    'db.r5.xlarge': 350.4,
    'db.r5.2xlarge': 700.8,
    storage: 0.1, // per GB/month
    io: 0.2, // per million IOs
  },
  elasticache: {
    'cache.t3.micro': 12.41,
    'cache.t3.small': 24.82,
    'cache.t3.medium': 49.64,
    'cache.r5.large': 131.4,
    'cache.r5.xlarge': 262.8,
  },

  // Platform Layer - Load Balancing
  alb: { base: 22.27, lcu: 5.84 }, // base + LCU charges
  nlb: { base: 22.27, lcu: 5.84 },

  // Platform Layer - Storage
  s3_bucket: {
    storage: 0.023, // per GB Standard
    requests: 0.005, // per 1000 PUT
    retrieval: 0.0004, // per 1000 GET
  },
  dynamodb: {
    onDemandWrite: 1.25, // per million WCU
    onDemandRead: 0.25, // per million RCU
    storage: 0.25, // per GB
  },

  // Platform Layer - Messaging
  sqs: { requests: 0.4 }, // per million requests
  sns: { requests: 0.5, sms: 0.00645 }, // per million, per SMS

  // Platform Layer - Compute (Serverless)
  lambda_function: {
    requests: 0.2, // per million requests
    duration: 0.0000166667, // per GB-second
  },

  // DevOps Layer
  codepipeline: { base: 1 }, // per active pipeline
  codebuild: {
    'build.general1.small': 0.005, // per minute
    'build.general1.medium': 0.01,
    'build.general1.large': 0.02,
  },
  ecr_repository: { storage: 0.1 }, // per GB
  cloudwatch_dashboard: { base: 3 },
  cloudwatch_alarm: { standard: 0.1, highRes: 0.3 },
  secrets_manager: { secret: 0.4, requests: 0.05 }, // per secret, per 10K API calls
  iam_role: { base: 0 },
};

// Environment multipliers (for scaling)
const ENVIRONMENT_MULTIPLIERS: Record<Environment, number> = {
  dev: 0.5, // Smaller instances, fewer replicas
  uat: 0.75, // Moderate sizing
  production: 1.0, // Full production sizing
  dr: 0.8, // DR environment
};

// Instance size multipliers for environments
const INSTANCE_SIZE_MAPPING: Record<Environment, Record<string, string>> = {
  dev: {
    't3.large': 't3.small',
    't3.xlarge': 't3.medium',
    'm5.large': 't3.medium',
    'm5.xlarge': 't3.large',
    'r5.large': 't3.medium',
    'db.r5.large': 'db.t3.small',
    'db.m5.large': 'db.t3.medium',
  },
  uat: {
    't3.xlarge': 't3.large',
    'm5.xlarge': 'm5.large',
    'db.r5.xlarge': 'db.r5.large',
  },
  production: {},
  dr: {
    't3.xlarge': 't3.large',
    'm5.xlarge': 'm5.large',
  },
};

export interface CostComparison {
  designId: string;
  environments: Environment[];
  costs: Record<Environment, CostEstimate>;
  comparison: {
    cheapest: Environment;
    mostExpensive: Environment;
    percentageDifference: number;
    keyDifferences: {
      resource: string;
      devCost: number;
      prodCost: number;
      difference: number;
    }[];
  };
}

export interface Optimization {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  type: 'rightsizing' | 'reserved_instance' | 'spot_instance' | 'storage' | 'unused';
  currentConfig: Record<string, any>;
  recommendedConfig: Record<string, any>;
  estimatedMonthlySavings: number;
  percentageSavings: number;
  risk: 'low' | 'medium' | 'high';
  description: string;
  implementationSteps: string[];
}

export interface BudgetStatus {
  designId: string;
  budget?: number;
  estimatedCost: number;
  percentUsed: number;
  status: 'under_budget' | 'warning' | 'over_budget';
  message: string;
}

export interface CostForecast {
  designId: string;
  currentMonthly: number;
  projections: {
    months: number;
    cost: number;
    confidence: number;
  }[];
}

export class CostEstimationService {
  /**
   * Estimate total cost for a design
   */
  async estimateDesignCost(designId: string, environment: Environment): Promise<CostEstimate> {
    logger.info('Estimating design cost', { designId, environment });

    const design = await prisma.visualDesign.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new Error(`Design ${designId} not found`);
    }

    const designData = design.designData as { nodes: DesignNode[] };
    const nodes = designData.nodes || [];

    const breakdown: ResourceCost[] = [];
    const byLayer: Record<LayerType, number> = {
      network: 0,
      platform: 0,
      devops: 0,
      fullstack: 0,
    };
    const byService: Record<string, number> = {};

    for (const node of nodes) {
      const cost = this.calculateNodeCost(node, environment);

      breakdown.push({
        resourceType: node.type,
        resourceName: node.data.name || node.id,
        count: 1,
        unitCost: cost,
        totalCost: cost,
        currency: 'USD',
      });

      byLayer[node.layer] = (byLayer[node.layer] || 0) + cost;
      byService[node.type] = (byService[node.type] || 0) + cost;
    }

    const totalMonthly = breakdown.reduce((sum, item) => sum + item.totalCost, 0);

    // Update design with cost estimate
    await prisma.visualDesign.update({
      where: { id: designId },
      data: {
        estimatedMonthlyCost: totalMonthly,
      },
    });

    logger.info('Cost estimation complete', { designId, totalMonthly, environment });

    return {
      totalMonthly,
      currency: 'USD',
      breakdown,
      byLayer,
      byService,
      estimatedAt: new Date(),
    };
  }

  /**
   * Estimate cost for a specific layer
   */
  async estimateLayerCost(
    layerNodes: DesignNode[],
    environment: Environment
  ): Promise<CostEstimate> {
    const breakdown: ResourceCost[] = [];
    const byLayer: Record<LayerType, number> = {
      network: 0,
      platform: 0,
      devops: 0,
      fullstack: 0,
    };
    const byService: Record<string, number> = {};

    for (const node of layerNodes) {
      const cost = this.calculateNodeCost(node, environment);

      breakdown.push({
        resourceType: node.type,
        resourceName: node.data.name || node.id,
        count: 1,
        unitCost: cost,
        totalCost: cost,
        currency: 'USD',
      });

      byLayer[node.layer] = (byLayer[node.layer] || 0) + cost;
      byService[node.type] = (byService[node.type] || 0) + cost;
    }

    const totalMonthly = breakdown.reduce((sum, item) => sum + item.totalCost, 0);

    return {
      totalMonthly,
      currency: 'USD',
      breakdown,
      byLayer,
      byService,
      estimatedAt: new Date(),
    };
  }

  /**
   * Estimate cost for a single node
   */
  estimateNodeCost(
    nodeType: string,
    config: Record<string, any>,
    environment: Environment
  ): number {
    const node: DesignNode = {
      id: 'temp',
      type: nodeType,
      position: { x: 0, y: 0 },
      data: config,
      layer: this.getLayerForNodeType(nodeType),
    };

    return this.calculateNodeCost(node, environment);
  }

  /**
   * Compare costs across environments
   */
  async compareCosts(designId: string, environments: Environment[]): Promise<CostComparison> {
    logger.info('Comparing costs across environments', { designId, environments });

    const costs: Record<Environment, CostEstimate> = {} as Record<Environment, CostEstimate>;

    for (const env of environments) {
      costs[env] = await this.estimateDesignCost(designId, env);
    }

    // Find cheapest and most expensive
    let cheapest: Environment = environments[0];
    let mostExpensive: Environment = environments[0];
    let minCost = costs[cheapest].totalMonthly;
    let maxCost = costs[mostExpensive].totalMonthly;

    for (const env of environments) {
      if (costs[env].totalMonthly < minCost) {
        cheapest = env;
        minCost = costs[env].totalMonthly;
      }
      if (costs[env].totalMonthly > maxCost) {
        mostExpensive = env;
        maxCost = costs[env].totalMonthly;
      }
    }

    // Calculate percentage difference
    const percentageDifference = minCost > 0 ? ((maxCost - minCost) / minCost) * 100 : 0;

    // Find key differences
    const keyDifferences: {
      resource: string;
      devCost: number;
      prodCost: number;
      difference: number;
    }[] = [];

    if (environments.includes('dev') && environments.includes('production')) {
      const devCost = costs.dev;
      const prodCost = costs.production;

      for (const resource of Object.keys(prodCost.byService)) {
        const dev = devCost.byService[resource] || 0;
        const prod = prodCost.byService[resource] || 0;
        const diff = prod - dev;

        if (diff > 0) {
          keyDifferences.push({
            resource,
            devCost: dev,
            prodCost: prod,
            difference: diff,
          });
        }
      }

      // Sort by difference descending
      keyDifferences.sort((a, b) => b.difference - a.difference);
    }

    return {
      designId,
      environments,
      costs,
      comparison: {
        cheapest,
        mostExpensive,
        percentageDifference,
        keyDifferences: keyDifferences.slice(0, 5), // Top 5 differences
      },
    };
  }

  /**
   * Suggest cost optimizations
   */
  async suggestOptimizations(designId: string): Promise<Optimization[]> {
    logger.info('Generating optimization suggestions', { designId });

    const design = await prisma.visualDesign.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new Error(`Design ${designId} not found`);
    }

    const designData = design.designData as { nodes: DesignNode[] };
    const nodes = designData.nodes || [];
    const optimizations: Optimization[] = [];

    // Analyze each node for optimization opportunities
    for (const node of nodes) {
      const nodeOptimizations = this.analyzeNodeForOptimizations(node);
      optimizations.push(...nodeOptimizations);
    }

    // Sort by savings descending
    optimizations.sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings);

    logger.info('Optimization analysis complete', {
      designId,
      totalOptimizations: optimizations.length,
      potentialSavings: optimizations.reduce((sum, o) => sum + o.estimatedMonthlySavings, 0),
    });

    return optimizations;
  }

  /**
   * Get budget status
   */
  async getBudgetStatus(designId: string, budget?: number): Promise<BudgetStatus> {
    const estimate = await this.estimateDesignCost(designId, 'production');

    const actualBudget = budget || 1000; // Default $1000 budget
    const percentUsed = (estimate.totalMonthly / actualBudget) * 100;

    let status: 'under_budget' | 'warning' | 'over_budget';
    let message: string;

    if (percentUsed > 100) {
      status = 'over_budget';
      message = `Estimated cost exceeds budget by $${(estimate.totalMonthly - actualBudget).toFixed(2)}`;
    } else if (percentUsed > 80) {
      status = 'warning';
      message = `Using ${percentUsed.toFixed(1)}% of budget - consider optimization`;
    } else {
      status = 'under_budget';
      message = `Within budget - $${(actualBudget - estimate.totalMonthly).toFixed(2)} remaining`;
    }

    return {
      designId,
      budget: actualBudget,
      estimatedCost: estimate.totalMonthly,
      percentUsed,
      status,
      message,
    };
  }

  /**
   * Generate cost forecast
   */
  async getForecast(designId: string, months: number[] = [1, 3, 6, 12]): Promise<CostForecast> {
    const estimate = await this.estimateDesignCost(designId, 'production');

    const projections = months.map((m) => ({
      months: m,
      cost: estimate.totalMonthly * m,
      confidence: this.calculateConfidence(m),
    }));

    return {
      designId,
      currentMonthly: estimate.totalMonthly,
      projections,
    };
  }

  /**
   * Calculate cost for a single node
   */
  private calculateNodeCost(node: DesignNode, environment: Environment): number {
    const pricing = AWS_PRICING[node.type];
    if (!pricing) {
      return 10; // Default $10 for unknown types
    }

    const envMultiplier = ENVIRONMENT_MULTIPLIERS[environment];
    let cost = 0;

    switch (node.type) {
      // Network Layer
      case 'vpc':
      case 'subnet':
      case 'internet_gateway':
      case 'route_table':
      case 'security_group':
      case 'network_acl':
      case 'iam_role':
        cost = 0;
        break;

      case 'nat_gateway':
        cost = pricing.base;
        // Add estimated data processing ($10/month estimate)
        cost += 10;
        break;

      case 'transit_gateway':
        cost = pricing.base;
        cost += 20; // Estimated data processing
        break;

      // Platform Layer - Compute
      case 'eks_cluster':
        cost = pricing.base;
        break;

      case 'eks_node_group': {
        const instanceType = this.getEnvironmentInstanceType(
          node.data.instanceTypes?.[0] || 't3.medium',
          environment
        );
        const instanceCost = pricing[instanceType] || pricing['t3.medium'] || 30;
        const nodeCount = node.data.desiredSize || node.data.minSize || 2;
        cost = instanceCost * nodeCount * envMultiplier;
        break;
      }

      // Platform Layer - Database
      case 'rds_instance': {
        const dbInstanceType = this.getEnvironmentInstanceType(
          node.data.instanceClass || 'db.t3.medium',
          environment
        );
        const dbCost = pricing[dbInstanceType] || pricing['db.t3.medium'] || 50;
        cost = dbCost;

        // Add storage cost
        const storageGB = node.data.allocatedStorage || 20;
        cost += storageGB * pricing.storage;

        // Multi-AZ doubles the cost
        if (node.data.multiAz || node.data.multiAZ) {
          cost *= 2;
        }

        cost *= envMultiplier;
        break;
      }

      case 'rds_aurora': {
        const auroraType = this.getEnvironmentInstanceType(
          node.data.instanceClass || 'db.r5.large',
          environment
        );
        const auroraCost = pricing[auroraType] || pricing['db.r5.large'] || 175;
        const instances = node.data.instanceCount || 2;
        cost = auroraCost * instances;

        // Storage
        cost += (node.data.storageGB || 100) * pricing.storage;
        cost *= envMultiplier;
        break;
      }

      case 'elasticache': {
        const cacheType = this.getEnvironmentInstanceType(
          node.data.cacheNodeType || 'cache.t3.medium',
          environment
        );
        const cacheCost = pricing[cacheType] || pricing['cache.t3.medium'] || 50;
        const numNodes = node.data.numCacheNodes || 1;
        cost = cacheCost * numNodes * envMultiplier;
        break;
      }

      // Load Balancers
      case 'alb':
      case 'nlb':
        cost = pricing.base;
        // Add estimated LCU charges
        cost += pricing.lcu * 2; // Estimate 2 LCUs
        break;

      // Storage
      case 's3_bucket': {
        const storageEstimate = node.data.estimatedStorageGB || 100;
        cost = storageEstimate * pricing.storage;
        break;
      }

      case 'dynamodb':
        // On-demand pricing estimate
        cost = pricing.storage * (node.data.estimatedStorageGB || 10);
        cost += 10; // Estimated request cost
        break;

      // Messaging
      case 'sqs':
        cost = 5; // Estimate $5/month for moderate usage
        break;

      case 'sns':
        cost = 5; // Estimate $5/month for moderate usage
        break;

      // Serverless
      case 'lambda_function':
        cost = 10; // Estimate $10/month for moderate usage
        break;

      // DevOps
      case 'codepipeline':
        cost = pricing.base;
        break;

      case 'codebuild':
        // Estimate 500 build minutes per month
        cost = 500 * (pricing['build.general1.small'] || 0.005);
        break;

      case 'ecr_repository':
        // Estimate 5GB storage
        cost = 5 * pricing.storage;
        break;

      case 'cloudwatch_dashboard':
        cost = pricing.base;
        break;

      case 'cloudwatch_alarm':
        cost = pricing.standard;
        break;

      case 'secrets_manager':
        cost = pricing.secret;
        break;

      default:
        cost = 10;
    }

    return Math.round(cost * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get appropriate instance type for environment
   */
  private getEnvironmentInstanceType(instanceType: string, environment: Environment): string {
    const mapping = INSTANCE_SIZE_MAPPING[environment] || {};
    return mapping[instanceType] || instanceType;
  }

  /**
   * Get layer for node type
   */
  private getLayerForNodeType(nodeType: string): LayerType {
    const networkTypes = [
      'vpc',
      'subnet',
      'internet_gateway',
      'nat_gateway',
      'route_table',
      'security_group',
      'network_acl',
      'vpc_peering',
      'transit_gateway',
    ];
    const platformTypes = [
      'eks_cluster',
      'eks_node_group',
      'rds_instance',
      'rds_aurora',
      'elasticache',
      'alb',
      'nlb',
      's3_bucket',
      'dynamodb',
      'sqs',
      'sns',
      'lambda_function',
    ];
    const devopsTypes = [
      'codepipeline',
      'codebuild',
      'ecr_repository',
      'cloudwatch_dashboard',
      'cloudwatch_alarm',
      'secrets_manager',
      'iam_role',
    ];

    if (networkTypes.includes(nodeType)) return 'network';
    if (platformTypes.includes(nodeType)) return 'platform';
    if (devopsTypes.includes(nodeType)) return 'devops';
    return 'platform';
  }

  /**
   * Analyze node for optimization opportunities
   */
  private analyzeNodeForOptimizations(node: DesignNode): Optimization[] {
    const optimizations: Optimization[] = [];
    const idPrefix = `opt-${node.id}`;

    switch (node.type) {
      case 'eks_node_group': {
        const instanceType = node.data.instanceTypes?.[0] || 't3.medium';

        // Spot instance recommendation for non-critical workloads
        if (instanceType.startsWith('m5') || instanceType.startsWith('c5')) {
          const currentCost = AWS_PRICING.eks_node_group[instanceType] || 100;
          const spotSavings = currentCost * 0.6; // 60% savings typical

          optimizations.push({
            id: `${idPrefix}-spot`,
            resourceId: node.id,
            resourceName: node.data.name || node.id,
            resourceType: 'eks_node_group',
            type: 'spot_instance',
            currentConfig: { instanceType, capacityType: 'ON_DEMAND' },
            recommendedConfig: { instanceType, capacityType: 'SPOT' },
            estimatedMonthlySavings: spotSavings,
            percentageSavings: 60,
            risk: 'medium',
            description:
              'Use Spot instances for fault-tolerant workloads to save up to 60% on compute costs',
            implementationSteps: [
              'Ensure workloads are fault-tolerant',
              'Add Spot instance capacity type to node group',
              'Configure spot instance termination handler',
            ],
          });
        }

        // Rightsizing recommendation
        if (instanceType.includes('xlarge') || instanceType.includes('2xlarge')) {
          const smallerType = instanceType.replace('2xlarge', 'xlarge').replace('xlarge', 'large');
          const currentCost = AWS_PRICING.eks_node_group[instanceType] || 200;
          const smallerCost = AWS_PRICING.eks_node_group[smallerType] || 100;

          optimizations.push({
            id: `${idPrefix}-rightsize`,
            resourceId: node.id,
            resourceName: node.data.name || node.id,
            resourceType: 'eks_node_group',
            type: 'rightsizing',
            currentConfig: { instanceType },
            recommendedConfig: { instanceType: smallerType },
            estimatedMonthlySavings: currentCost - smallerCost,
            percentageSavings: ((currentCost - smallerCost) / currentCost) * 100,
            risk: 'low',
            description: 'Consider smaller instance type if utilization is below 40%',
            implementationSteps: [
              'Monitor CPU/memory utilization for 7 days',
              'If average is below 40%, downsize instance',
              'Test workload performance before full migration',
            ],
          });
        }
        break;
      }

      case 'rds_instance': {
        const instanceClass = node.data.instanceClass || 'db.t3.medium';

        // Reserved Instance recommendation for production
        const currentCost = AWS_PRICING.rds_instance[instanceClass] || 100;
        const reservedSavings = currentCost * 0.35; // ~35% savings for 1-year RI

        optimizations.push({
          id: `${idPrefix}-reserved`,
          resourceId: node.id,
          resourceName: node.data.name || node.id,
          resourceType: 'rds_instance',
          type: 'reserved_instance',
          currentConfig: { instanceClass, purchaseType: 'ON_DEMAND' },
          recommendedConfig: { instanceClass, purchaseType: 'RESERVED_1_YEAR' },
          estimatedMonthlySavings: reservedSavings,
          percentageSavings: 35,
          risk: 'low',
          description:
            'Purchase Reserved Instance for predictable workloads to save 35% on database costs',
          implementationSteps: [
            'Verify database will be needed for at least 1 year',
            'Purchase Reserved Instance in AWS Console',
            'RI discount applies automatically',
          ],
        });

        // Storage optimization
        if (node.data.allocatedStorage > 100) {
          optimizations.push({
            id: `${idPrefix}-storage`,
            resourceId: node.id,
            resourceName: node.data.name || node.id,
            resourceType: 'rds_instance',
            type: 'storage',
            currentConfig: {
              storageType: node.data.storageType || 'gp2',
              allocatedStorage: node.data.allocatedStorage,
            },
            recommendedConfig: {
              storageType: 'gp3',
              allocatedStorage: node.data.allocatedStorage,
            },
            estimatedMonthlySavings: node.data.allocatedStorage * 0.02, // ~$0.02/GB savings
            percentageSavings: 20,
            risk: 'low',
            description: 'Migrate to gp3 storage for better performance and lower cost',
            implementationSteps: [
              'Create snapshot of current database',
              'Modify storage type to gp3',
              'Monitor IOPS and throughput after migration',
            ],
          });
        }
        break;
      }

      case 'nat_gateway': {
        // NAT Instance recommendation for dev/test
        const natCost = AWS_PRICING.nat_gateway.base;
        const natInstanceCost = 15; // t3.micro NAT instance

        optimizations.push({
          id: `${idPrefix}-natinstance`,
          resourceId: node.id,
          resourceName: node.data.name || node.id,
          resourceType: 'nat_gateway',
          type: 'rightsizing',
          currentConfig: { type: 'NAT_GATEWAY' },
          recommendedConfig: { type: 'NAT_INSTANCE', instanceType: 't3.micro' },
          estimatedMonthlySavings: natCost - natInstanceCost,
          percentageSavings: ((natCost - natInstanceCost) / natCost) * 100,
          risk: 'medium',
          description: 'Use NAT Instance instead of NAT Gateway for non-production environments',
          implementationSteps: [
            'Launch NAT Instance in public subnet',
            'Update route tables to use NAT Instance',
            'Remove NAT Gateway',
            'Note: NAT Instance requires manual HA setup',
          ],
        });
        break;
      }
    }

    return optimizations;
  }

  /**
   * Calculate forecast confidence
   */
  private calculateConfidence(months: number): number {
    // Confidence decreases with time
    if (months <= 1) return 0.95;
    if (months <= 3) return 0.85;
    if (months <= 6) return 0.75;
    return 0.6;
  }
}

// Export singleton instance
export const costEstimationService = new CostEstimationService();
