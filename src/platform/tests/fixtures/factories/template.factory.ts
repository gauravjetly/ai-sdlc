/**
 * Template Factory
 *
 * Factory for creating test template data with realistic defaults.
 */

import { v4 as uuidv4 } from 'uuid';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  cloudProvider: string;
  version: string;
  isOfficial: boolean;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  metadata: TemplateMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface TemplateMetadata {
  author: string;
  tags: string[];
  estimatedCost: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

const templateNames = [
  'Three-Tier Web Application',
  'Microservices Architecture',
  'Serverless API',
  'Data Lake Pipeline',
  'Container Platform',
  'Edge Computing Setup',
  'ML Training Infrastructure',
];

const categories = ['compute', 'serverless', 'containers', 'data', 'ml', 'networking'];
const tags = ['production', 'development', 'high-availability', 'cost-optimized', 'secure', 'scalable'];
const authors = ['Platform Team', 'DevOps Team', 'Architecture Board', 'Community'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export const TemplateFactory = {
  /**
   * Create a template with default values
   */
  create: (overrides: Partial<Template> = {}): Template => {
    const now = new Date().toISOString();
    return {
      id: uuidv4(),
      name: randomElement(templateNames),
      description: 'A comprehensive infrastructure template for cloud deployment.',
      category: randomElement(categories),
      cloudProvider: 'aws',
      version: '1.0.0',
      isOfficial: Math.random() > 0.5,
      nodes: [],
      edges: [],
      metadata: {
        author: randomElement(authors),
        tags: randomElements(tags, 3),
        estimatedCost: Math.floor(Math.random() * 500) + 50,
        complexity: randomElement(['simple', 'moderate', 'complex']),
      },
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },

  /**
   * Create a template with nodes
   */
  createWithNodes: (nodeCount = 5, overrides: Partial<Template> = {}): Template => {
    const nodes: TemplateNode[] = [];
    const edges: TemplateEdge[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        id: `node-${i}`,
        type: randomElement(['ec2Instance', 'lambdaFunction', 's3Bucket', 'rdsInstance', 'vpc']),
        position: { x: 100 + i * 150, y: 100 + (i % 3) * 150 },
        data: { name: `resource-${i}` },
      });

      // Create edges between consecutive nodes
      if (i > 0) {
        edges.push({
          id: `edge-${i - 1}-${i}`,
          source: `node-${i - 1}`,
          target: `node-${i}`,
        });
      }
    }

    return TemplateFactory.create({
      nodes,
      edges,
      ...overrides,
    });
  },

  /**
   * Create a minimal template
   */
  createMinimal: (): Template => {
    return TemplateFactory.create({
      name: 'Minimal Template',
      description: 'A minimal template for testing.',
      nodes: [],
      edges: [],
    });
  },

  /**
   * Create an official template
   */
  createOfficial: (overrides: Partial<Template> = {}): Template => {
    return TemplateFactory.create({
      isOfficial: true,
      metadata: {
        author: 'Platform Team',
        tags: ['official', 'production', 'verified'],
        estimatedCost: 200,
        complexity: 'moderate',
      },
      ...overrides,
    });
  },

  /**
   * Create a Three-Tier Web Application template
   */
  createThreeTierWeb: (): Template => {
    const nodes: TemplateNode[] = [
      { id: 'vpc-1', type: 'vpc', position: { x: 400, y: 50 }, data: { name: 'main-vpc', cidr: '10.0.0.0/16' } },
      { id: 'alb-1', type: 'loadBalancer', position: { x: 400, y: 150 }, data: { name: 'web-alb', type: 'application' } },
      { id: 'web-asg', type: 'autoScalingGroup', position: { x: 400, y: 250 }, data: { name: 'web-asg', minSize: 2, maxSize: 10 } },
      { id: 'app-asg', type: 'autoScalingGroup', position: { x: 400, y: 350 }, data: { name: 'app-asg', minSize: 2, maxSize: 10 } },
      { id: 'rds-1', type: 'rdsInstance', position: { x: 400, y: 450 }, data: { name: 'main-db', engine: 'postgres' } },
      { id: 'cache-1', type: 'elasticache', position: { x: 250, y: 450 }, data: { name: 'session-cache', engine: 'redis' } },
    ];

    const edges: TemplateEdge[] = [
      { id: 'e1', source: 'vpc-1', target: 'alb-1' },
      { id: 'e2', source: 'alb-1', target: 'web-asg' },
      { id: 'e3', source: 'web-asg', target: 'app-asg' },
      { id: 'e4', source: 'app-asg', target: 'rds-1' },
      { id: 'e5', source: 'app-asg', target: 'cache-1' },
    ];

    return TemplateFactory.create({
      name: 'Three-Tier Web Application',
      description: 'A production-ready three-tier web application with load balancer, auto-scaling, database, and caching.',
      category: 'compute',
      nodes,
      edges,
      metadata: {
        author: 'Platform Team',
        tags: ['production', 'high-availability', 'scalable'],
        estimatedCost: 350,
        complexity: 'moderate',
      },
    });
  },

  /**
   * Create multiple templates
   */
  createMany: (count: number, overrides: Partial<Template> = {}): Template[] => {
    return Array.from({ length: count }, () => TemplateFactory.create(overrides));
  },
};

export default TemplateFactory;
