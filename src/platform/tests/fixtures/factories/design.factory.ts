/**
 * Design Factory
 *
 * Factory for creating test infrastructure design data.
 */

import { v4 as uuidv4 } from 'uuid';
import { NodeFactory, InfraNode } from './node.factory';

export interface Design {
  id: string;
  name: string;
  description: string;
  projectId: string;
  organizationId: string;
  nodes: InfraNode[];
  edges: DesignEdge[];
  layers: Layer[];
  environments: Environment[];
  currentEnvironment: string;
  version: number;
  status: 'draft' | 'validated' | 'deploying' | 'deployed' | 'failed';
  metadata: DesignMetadata;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DesignEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  data?: Record<string, unknown>;
}

export interface Layer {
  id: string;
  name: string;
  order: number;
  status: 'pending' | 'deploying' | 'deployed' | 'failed';
  nodeIds: string[];
  dependencies: string[];
}

export interface Environment {
  id: string;
  name: string;
  type: 'development' | 'staging' | 'production';
  region: string;
  variables: Record<string, string>;
  isActive: boolean;
}

export interface DesignMetadata {
  templateId?: string;
  templateVersion?: string;
  estimatedCost: number;
  lastValidated?: string;
  validationStatus?: 'passed' | 'failed' | 'pending';
  deploymentHistory: DeploymentRecord[];
}

export interface DeploymentRecord {
  id: string;
  timestamp: string;
  environment: string;
  status: 'success' | 'failed' | 'rolled_back';
  user: string;
  changes: number;
}

export const DesignFactory = {
  /**
   * Create a design with default values
   */
  create: (overrides: Partial<Design> = {}): Design => {
    const now = new Date().toISOString();
    return {
      id: uuidv4(),
      name: `infrastructure-design-${uuidv4().substring(0, 8)}`,
      description: 'Infrastructure design for cloud deployment',
      projectId: uuidv4(),
      organizationId: uuidv4(),
      nodes: [],
      edges: [],
      layers: [
        { id: 'network', name: 'Network', order: 1, status: 'pending', nodeIds: [], dependencies: [] },
        { id: 'security', name: 'Security', order: 2, status: 'pending', nodeIds: [], dependencies: ['network'] },
        { id: 'compute', name: 'Compute', order: 3, status: 'pending', nodeIds: [], dependencies: ['network', 'security'] },
        { id: 'database', name: 'Database', order: 4, status: 'pending', nodeIds: [], dependencies: ['network', 'security'] },
        { id: 'storage', name: 'Storage', order: 5, status: 'pending', nodeIds: [], dependencies: ['security'] },
      ],
      environments: [
        {
          id: 'env-dev',
          name: 'Development',
          type: 'development',
          region: 'us-east-1',
          variables: { LOG_LEVEL: 'debug', ENV: 'dev' },
          isActive: true,
        },
        {
          id: 'env-staging',
          name: 'Staging',
          type: 'staging',
          region: 'us-east-1',
          variables: { LOG_LEVEL: 'info', ENV: 'staging' },
          isActive: false,
        },
        {
          id: 'env-prod',
          name: 'Production',
          type: 'production',
          region: 'us-east-1',
          variables: { LOG_LEVEL: 'warn', ENV: 'prod' },
          isActive: false,
        },
      ],
      currentEnvironment: 'env-dev',
      version: 1,
      status: 'draft',
      metadata: {
        estimatedCost: 0,
        validationStatus: 'pending',
        deploymentHistory: [],
      },
      createdAt: now,
      updatedAt: now,
      createdBy: 'test-user',
      ...overrides,
    };
  },

  /**
   * Create a design with nodes
   */
  createWithNodes: (nodeCount = 10, overrides: Partial<Design> = {}): Design => {
    const nodes = NodeFactory.createMany(nodeCount);
    const edges: DesignEdge[] = [];

    // Create edges between consecutive nodes
    for (let i = 1; i < nodes.length; i++) {
      edges.push({
        id: `edge-${nodes[i - 1].id}-${nodes[i].id}`,
        source: nodes[i - 1].id,
        target: nodes[i].id,
      });
    }

    // Assign nodes to layers based on type
    const layers = [
      { id: 'network', name: 'Network', order: 1, status: 'pending' as const, nodeIds: [] as string[], dependencies: [] },
      { id: 'security', name: 'Security', order: 2, status: 'pending' as const, nodeIds: [] as string[], dependencies: ['network'] },
      { id: 'compute', name: 'Compute', order: 3, status: 'pending' as const, nodeIds: [] as string[], dependencies: ['network', 'security'] },
      { id: 'database', name: 'Database', order: 4, status: 'pending' as const, nodeIds: [] as string[], dependencies: ['network', 'security'] },
      { id: 'storage', name: 'Storage', order: 5, status: 'pending' as const, nodeIds: [] as string[], dependencies: ['security'] },
    ];

    nodes.forEach(node => {
      const layer = node.data.layer || 'compute';
      const layerObj = layers.find(l => l.id === layer);
      if (layerObj) {
        layerObj.nodeIds.push(node.id);
      }
    });

    return DesignFactory.create({
      nodes,
      edges,
      layers,
      metadata: {
        estimatedCost: nodes.length * 50,
        validationStatus: 'pending',
        deploymentHistory: [],
      },
      ...overrides,
    });
  },

  /**
   * Create a minimal design
   */
  createMinimal: (): Design => {
    return DesignFactory.create({
      name: 'Minimal Design',
      description: 'A minimal design for testing',
      nodes: [],
      edges: [],
      layers: [],
    });
  },

  /**
   * Create a design from a template
   */
  createFromTemplate: (templateId: string, nodes: InfraNode[], edges: DesignEdge[], overrides: Partial<Design> = {}): Design => {
    return DesignFactory.create({
      nodes,
      edges,
      metadata: {
        templateId,
        templateVersion: '1.0.0',
        estimatedCost: nodes.length * 50,
        validationStatus: 'pending',
        deploymentHistory: [],
      },
      ...overrides,
    });
  },

  /**
   * Create a validated design
   */
  createValidated: (overrides: Partial<Design> = {}): Design => {
    const design = DesignFactory.createWithNodes(5, overrides);
    return {
      ...design,
      status: 'validated',
      metadata: {
        ...design.metadata,
        validationStatus: 'passed',
        lastValidated: new Date().toISOString(),
      },
    };
  },

  /**
   * Create a deployed design
   */
  createDeployed: (environment: string = 'env-dev', overrides: Partial<Design> = {}): Design => {
    const design = DesignFactory.createValidated(overrides);
    return {
      ...design,
      status: 'deployed',
      layers: design.layers.map(l => ({ ...l, status: 'deployed' as const })),
      metadata: {
        ...design.metadata,
        deploymentHistory: [
          {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            environment,
            status: 'success',
            user: 'test-user',
            changes: design.nodes.length,
          },
        ],
      },
    };
  },

  /**
   * Create a three-tier web application design
   */
  createThreeTierWeb: (): Design => {
    const vpc = NodeFactory.createVPC({ position: { x: 400, y: 50 } });
    const publicSubnet = NodeFactory.createSubnet({
      position: { x: 200, y: 150 },
      data: { name: 'public-subnet', config: { cidr: '10.0.1.0/24', isPublic: true }, layer: 'network' },
    });
    const privateSubnet = NodeFactory.createSubnet({
      position: { x: 600, y: 150 },
      data: { name: 'private-subnet', config: { cidr: '10.0.2.0/24', isPublic: false }, layer: 'network' },
    });
    const webSg = NodeFactory.createSecurityGroup({
      position: { x: 200, y: 250 },
      data: { name: 'web-sg', config: { ingressRules: [{ port: 80, source: '0.0.0.0/0' }] }, layer: 'security' },
    });
    const appSg = NodeFactory.createSecurityGroup({
      position: { x: 400, y: 250 },
      data: { name: 'app-sg', config: { ingressRules: [{ port: 8080, source: '10.0.0.0/16' }] }, layer: 'security' },
    });
    const dbSg = NodeFactory.createSecurityGroup({
      position: { x: 600, y: 250 },
      data: { name: 'db-sg', config: { ingressRules: [{ port: 5432, source: '10.0.0.0/16' }] }, layer: 'security' },
    });
    const alb = NodeFactory.createALB({ position: { x: 200, y: 350 } });
    const webEc2 = NodeFactory.createEC2({
      position: { x: 200, y: 450 },
      data: { name: 'web-server', config: { instanceType: 't3.small' }, layer: 'compute' },
    });
    const appEc2 = NodeFactory.createEC2({
      position: { x: 400, y: 450 },
      data: { name: 'app-server', config: { instanceType: 't3.medium' }, layer: 'compute' },
    });
    const rds = NodeFactory.createRDS({
      position: { x: 600, y: 450 },
      data: { name: 'main-db', config: { engine: 'postgres', instanceClass: 'db.t3.medium' }, layer: 'database' },
    });

    const nodes = [vpc, publicSubnet, privateSubnet, webSg, appSg, dbSg, alb, webEc2, appEc2, rds];
    const edges: DesignEdge[] = [
      { id: 'e1', source: vpc.id, target: publicSubnet.id },
      { id: 'e2', source: vpc.id, target: privateSubnet.id },
      { id: 'e3', source: publicSubnet.id, target: alb.id },
      { id: 'e4', source: alb.id, target: webEc2.id },
      { id: 'e5', source: webEc2.id, target: webSg.id },
      { id: 'e6', source: webEc2.id, target: appEc2.id },
      { id: 'e7', source: appEc2.id, target: appSg.id },
      { id: 'e8', source: appEc2.id, target: rds.id },
      { id: 'e9', source: rds.id, target: dbSg.id },
    ];

    return DesignFactory.create({
      name: 'Three-Tier Web Application',
      description: 'A production-ready three-tier web application infrastructure',
      nodes,
      edges,
      layers: [
        { id: 'network', name: 'Network', order: 1, status: 'pending', nodeIds: [vpc.id, publicSubnet.id, privateSubnet.id], dependencies: [] },
        { id: 'security', name: 'Security', order: 2, status: 'pending', nodeIds: [webSg.id, appSg.id, dbSg.id], dependencies: ['network'] },
        { id: 'compute', name: 'Compute', order: 3, status: 'pending', nodeIds: [alb.id, webEc2.id, appEc2.id], dependencies: ['network', 'security'] },
        { id: 'database', name: 'Database', order: 4, status: 'pending', nodeIds: [rds.id], dependencies: ['network', 'security'] },
      ],
      metadata: {
        estimatedCost: 450,
        validationStatus: 'pending',
        deploymentHistory: [],
      },
    });
  },

  /**
   * Create multiple designs
   */
  createMany: (count: number, overrides: Partial<Design> = {}): Design[] => {
    return Array.from({ length: count }, () => DesignFactory.create(overrides));
  },
};

export default DesignFactory;
