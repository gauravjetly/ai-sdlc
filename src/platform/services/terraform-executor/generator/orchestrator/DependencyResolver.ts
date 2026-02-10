/**
 * Dependency Resolver
 *
 * Resolves dependencies between visual designer nodes and performs
 * topological sorting for correct generation order.
 */

import {
  VisualDesignerNode,
  Connection,
  ResourceReference,
  NodeCategory,
} from '../core/types';
import { GeneratorRegistry } from '../core/GeneratorRegistry';

/**
 * Result of dependency resolution
 */
export interface DependencyResolutionResult {
  /** Nodes sorted in dependency order */
  sortedNodes: VisualDesignerNode[];
  /** Map of node ID to resource reference */
  resourceReferences: Map<string, ResourceReference>;
  /** Nodes grouped by layer for parallel processing */
  layers: VisualDesignerNode[][];
}

/**
 * Circular dependency error
 */
export class CircularDependencyError extends Error {
  constructor(public cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Dependency Resolver class
 */
export class DependencyResolver {
  /**
   * Category-based layer ordering
   * Resources in earlier layers must be created first
   */
  private readonly categoryOrder: NodeCategory[] = [
    'security',    // IAM roles, policies first
    'networking',  // VPCs, subnets, gateways
    'compute',     // EC2, Lambda, EKS
    'storage',     // S3, DynamoDB
    'monitoring',  // CloudWatch, SNS
  ];

  /**
   * Resolve dependencies and return sorted nodes
   */
  resolve(
    nodes: VisualDesignerNode[],
    edges: Connection[]
  ): DependencyResolutionResult {
    // Build adjacency list (node -> dependencies)
    const graph = this.buildDependencyGraph(nodes, edges);

    // Detect cycles
    const cycle = this.detectCycle(graph, nodes);
    if (cycle) {
      throw new CircularDependencyError(cycle);
    }

    // Topological sort using Kahn's algorithm
    const sortedNodes = this.kahnSort(graph, nodes);

    // Apply category-based ordering for nodes at same level
    const orderedNodes = this.applyCategoryOrdering(sortedNodes);

    // Group into layers for parallel processing
    const layers = this.groupIntoLayers(orderedNodes, graph);

    // Build resource references
    const resourceReferences = this.buildResourceReferences(orderedNodes);

    return {
      sortedNodes: orderedNodes,
      resourceReferences,
      layers,
    };
  }

  /**
   * Build dependency graph from nodes and edges
   * Returns map: nodeId -> [dependencyNodeIds]
   */
  private buildDependencyGraph(
    nodes: VisualDesignerNode[],
    edges: Connection[]
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    // Initialize all nodes
    for (const node of nodes) {
      graph.set(node.id, new Set());
    }

    // Add edges (target depends on source)
    for (const edge of edges) {
      const deps = graph.get(edge.target);
      if (deps) {
        deps.add(edge.source);
      }
    }

    // Add implicit dependencies from node data
    for (const node of nodes) {
      const deps = graph.get(node.id)!;
      const implicitDeps = this.getImplicitDependencies(node);
      for (const dep of implicitDeps) {
        if (graph.has(dep)) {
          deps.add(dep);
        }
      }
    }

    return graph;
  }

  /**
   * Get implicit dependencies from node data
   */
  private getImplicitDependencies(node: VisualDesignerNode): string[] {
    const deps: string[] = [];
    const data = node.data as any;

    // Check common dependency properties
    if (data.vpcId) deps.push(data.vpcId);
    if (data.subnetId) deps.push(data.subnetId);
    if (data.subnetIds) deps.push(...data.subnetIds);
    if (data.securityGroupIds) deps.push(...data.securityGroupIds);
    if (data.role) deps.push(data.role);
    if (data.targetGroupArns) deps.push(...data.targetGroupArns);
    if (data.kmsKeyId) deps.push(data.kmsKeyId);

    return deps;
  }

  /**
   * Detect cycle in the graph using DFS
   * Returns cycle path if found, null otherwise
   */
  private detectCycle(
    graph: Map<string, Set<string>>,
    nodes: VisualDesignerNode[]
  ): string[] | null {
    const WHITE = 0; // Not visited
    const GRAY = 1;  // Being visited (in current path)
    const BLACK = 2; // Fully visited

    const colors = new Map<string, number>();
    const parent = new Map<string, string | null>();

    for (const node of nodes) {
      colors.set(node.id, WHITE);
      parent.set(node.id, null);
    }

    const dfs = (nodeId: string): string[] | null => {
      colors.set(nodeId, GRAY);

      const deps = graph.get(nodeId) || new Set();
      for (const dep of deps) {
        if (colors.get(dep) === GRAY) {
          // Found cycle - reconstruct path
          const cycle: string[] = [dep, nodeId];
          let curr = nodeId;
          while (parent.get(curr) && parent.get(curr) !== dep) {
            curr = parent.get(curr)!;
            cycle.push(curr);
          }
          cycle.push(dep);
          return cycle.reverse();
        }

        if (colors.get(dep) === WHITE) {
          parent.set(dep, nodeId);
          const result = dfs(dep);
          if (result) return result;
        }
      }

      colors.set(nodeId, BLACK);
      return null;
    };

    for (const node of nodes) {
      if (colors.get(node.id) === WHITE) {
        const cycle = dfs(node.id);
        if (cycle) return cycle;
      }
    }

    return null;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private kahnSort(
    graph: Map<string, Set<string>>,
    nodes: VisualDesignerNode[]
  ): VisualDesignerNode[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const inDegree = new Map<string, number>();
    const result: VisualDesignerNode[] = [];

    // Calculate in-degree (number of dependencies)
    for (const node of nodes) {
      inDegree.set(node.id, 0);
    }

    for (const [nodeId, deps] of graph) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // Start with nodes that have no dependencies
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (node) {
        result.push(node);
      }

      // Reduce in-degree of dependent nodes
      for (const [otherId, deps] of graph) {
        if (deps.has(nodeId)) {
          const newDegree = (inDegree.get(otherId) || 1) - 1;
          inDegree.set(otherId, newDegree);
          if (newDegree === 0) {
            queue.push(otherId);
          }
        }
      }
    }

    return result;
  }

  /**
   * Apply category-based ordering for nodes at same dependency level
   */
  private applyCategoryOrdering(nodes: VisualDesignerNode[]): VisualDesignerNode[] {
    return nodes.sort((a, b) => {
      const aCategory = (a.data as any).category || 'compute';
      const bCategory = (b.data as any).category || 'compute';

      const aIndex = this.categoryOrder.indexOf(aCategory);
      const bIndex = this.categoryOrder.indexOf(bCategory);

      return aIndex - bIndex;
    });
  }

  /**
   * Group nodes into layers for parallel processing
   */
  private groupIntoLayers(
    sortedNodes: VisualDesignerNode[],
    graph: Map<string, Set<string>>
  ): VisualDesignerNode[][] {
    const nodeToLayer = new Map<string, number>();
    const layers: VisualDesignerNode[][] = [];

    for (const node of sortedNodes) {
      const deps = graph.get(node.id) || new Set();
      let maxDepLayer = -1;

      for (const dep of deps) {
        const depLayer = nodeToLayer.get(dep) ?? -1;
        maxDepLayer = Math.max(maxDepLayer, depLayer);
      }

      const layer = maxDepLayer + 1;
      nodeToLayer.set(node.id, layer);

      while (layers.length <= layer) {
        layers.push([]);
      }
      layers[layer].push(node);
    }

    return layers;
  }

  /**
   * Build resource references for all nodes
   */
  private buildResourceReferences(
    nodes: VisualDesignerNode[]
  ): Map<string, ResourceReference> {
    const references = new Map<string, ResourceReference>();

    for (const node of nodes) {
      const generator = GeneratorRegistry.get(node.type as any);
      if (generator) {
        const resourceName = node.data.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        references.set(node.id, {
          nodeId: node.id,
          resourceType: generator.terraformResourceType,
          resourceName,
          terraformReference: `${generator.terraformResourceType}.${resourceName}`,
        });
      }
    }

    return references;
  }
}
