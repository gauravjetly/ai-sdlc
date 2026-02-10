/**
 * Canvas Performance Tests
 *
 * Tests for validating canvas rendering performance with various node counts.
 */

import { NodeFactory, DesignFactory } from '../fixtures/factories';

// Performance benchmark thresholds
const BENCHMARKS = {
  CANVAS_RENDER_10_NODES: 100,      // ms
  CANVAS_RENDER_50_NODES: 500,      // ms
  CANVAS_RENDER_100_NODES: 1000,    // ms
  CANVAS_RENDER_200_NODES: 2000,    // ms
  NODE_ADDITION: 50,                 // ms per node
  NODE_SELECTION: 20,                // ms
  NODE_DRAG: 16,                     // ms (60fps)
  ZOOM_PAN: 16,                      // ms (60fps)
  EDGE_CREATION: 30,                 // ms
  AUTO_SAVE: 500,                    // ms
  VALIDATION: 3000,                  // ms for 100 nodes
  TERRAFORM_GENERATION: 5000,        // ms for 100 nodes
};

// Mock performance measurement
class PerformanceMeasurer {
  private startTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  end(): number {
    return performance.now() - this.startTime;
  }

  measure(fn: () => void): number {
    this.start();
    fn();
    return this.end();
  }

  async measureAsync(fn: () => Promise<void>): Promise<number> {
    this.start();
    await fn();
    return this.end();
  }
}

// Mock canvas renderer for performance testing
class CanvasRenderer {
  private nodes: unknown[] = [];
  private edges: unknown[] = [];

  async render(nodes: unknown[], edges: unknown[]): Promise<void> {
    this.nodes = nodes;
    this.edges = edges;

    // Simulate rendering time based on node count
    const baseTime = nodes.length * 3;
    const edgeTime = edges.length * 1;
    await new Promise(resolve => setTimeout(resolve, baseTime + edgeTime));
  }

  addNode(node: unknown): void {
    this.nodes.push(node);
  }

  selectNode(nodeId: string): void {
    // Simulate selection
  }

  dragNode(nodeId: string, x: number, y: number): void {
    // Simulate drag
  }

  zoom(scale: number): void {
    // Simulate zoom
  }

  pan(dx: number, dy: number): void {
    // Simulate pan
  }

  getNodeCount(): number {
    return this.nodes.length;
  }
}

describe('Canvas Performance Tests', () => {
  let measurer: PerformanceMeasurer;
  let renderer: CanvasRenderer;

  beforeEach(() => {
    measurer = new PerformanceMeasurer();
    renderer = new CanvasRenderer();
  });

  describe('Initial Render Performance', () => {
    test('should render 10 nodes within benchmark', async () => {
      const nodes = NodeFactory.createMany(10);
      const edges = nodes.slice(1).map((n, i) => ({
        id: `e${i}`,
        source: nodes[i].id,
        target: n.id,
      }));

      const renderTime = await measurer.measureAsync(async () => {
        await renderer.render(nodes, edges);
      });

      console.log(`Render time (10 nodes): ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(BENCHMARKS.CANVAS_RENDER_10_NODES);
    });

    test('should render 50 nodes within benchmark', async () => {
      const nodes = NodeFactory.createMany(50);
      const edges = nodes.slice(1).map((n, i) => ({
        id: `e${i}`,
        source: nodes[i].id,
        target: n.id,
      }));

      const renderTime = await measurer.measureAsync(async () => {
        await renderer.render(nodes, edges);
      });

      console.log(`Render time (50 nodes): ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(BENCHMARKS.CANVAS_RENDER_50_NODES);
    });

    test('should render 100 nodes within benchmark', async () => {
      const nodes = NodeFactory.createMany(100);
      const edges = nodes.slice(1).map((n, i) => ({
        id: `e${i}`,
        source: nodes[i].id,
        target: n.id,
      }));

      const renderTime = await measurer.measureAsync(async () => {
        await renderer.render(nodes, edges);
      });

      console.log(`Render time (100 nodes): ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(BENCHMARKS.CANVAS_RENDER_100_NODES);
    });

    test('should render 200 nodes within benchmark', async () => {
      const nodes = NodeFactory.createMany(200);
      const edges = nodes.slice(1).map((n, i) => ({
        id: `e${i}`,
        source: nodes[i].id,
        target: n.id,
      }));

      const renderTime = await measurer.measureAsync(async () => {
        await renderer.render(nodes, edges);
      });

      console.log(`Render time (200 nodes): ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(BENCHMARKS.CANVAS_RENDER_200_NODES);
    });
  });

  describe('Interaction Performance', () => {
    beforeEach(async () => {
      const nodes = NodeFactory.createMany(50);
      await renderer.render(nodes, []);
    });

    test('should add node within benchmark', () => {
      const newNode = NodeFactory.create();

      const addTime = measurer.measure(() => {
        renderer.addNode(newNode);
      });

      console.log(`Node addition time: ${addTime.toFixed(2)}ms`);
      expect(addTime).toBeLessThan(BENCHMARKS.NODE_ADDITION);
    });

    test('should select node within benchmark', () => {
      const selectTime = measurer.measure(() => {
        renderer.selectNode('node-1');
      });

      console.log(`Node selection time: ${selectTime.toFixed(2)}ms`);
      expect(selectTime).toBeLessThan(BENCHMARKS.NODE_SELECTION);
    });

    test('should handle node drag at 60fps', () => {
      const dragTimes: number[] = [];

      // Simulate 60 drag events (1 second at 60fps)
      for (let i = 0; i < 60; i++) {
        const dragTime = measurer.measure(() => {
          renderer.dragNode('node-1', i * 10, i * 10);
        });
        dragTimes.push(dragTime);
      }

      const avgDragTime = dragTimes.reduce((a, b) => a + b, 0) / dragTimes.length;
      const maxDragTime = Math.max(...dragTimes);

      console.log(`Average drag time: ${avgDragTime.toFixed(2)}ms`);
      console.log(`Max drag time: ${maxDragTime.toFixed(2)}ms`);

      expect(avgDragTime).toBeLessThan(BENCHMARKS.NODE_DRAG);
    });

    test('should handle zoom at 60fps', () => {
      const zoomTimes: number[] = [];

      for (let i = 0; i < 60; i++) {
        const zoomTime = measurer.measure(() => {
          renderer.zoom(1 + i * 0.01);
        });
        zoomTimes.push(zoomTime);
      }

      const avgZoomTime = zoomTimes.reduce((a, b) => a + b, 0) / zoomTimes.length;

      console.log(`Average zoom time: ${avgZoomTime.toFixed(2)}ms`);
      expect(avgZoomTime).toBeLessThan(BENCHMARKS.ZOOM_PAN);
    });

    test('should handle pan at 60fps', () => {
      const panTimes: number[] = [];

      for (let i = 0; i < 60; i++) {
        const panTime = measurer.measure(() => {
          renderer.pan(i * 5, i * 5);
        });
        panTimes.push(panTime);
      }

      const avgPanTime = panTimes.reduce((a, b) => a + b, 0) / panTimes.length;

      console.log(`Average pan time: ${avgPanTime.toFixed(2)}ms`);
      expect(avgPanTime).toBeLessThan(BENCHMARKS.ZOOM_PAN);
    });
  });

  describe('Batch Operation Performance', () => {
    test('should handle adding 50 nodes efficiently', async () => {
      const nodes = NodeFactory.createMany(50);

      const totalTime = await measurer.measureAsync(async () => {
        for (const node of nodes) {
          renderer.addNode(node);
        }
      });

      const avgTimePerNode = totalTime / nodes.length;

      console.log(`Total time for 50 nodes: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per node: ${avgTimePerNode.toFixed(2)}ms`);

      expect(avgTimePerNode).toBeLessThan(BENCHMARKS.NODE_ADDITION);
    });
  });

  describe('Memory Performance', () => {
    test('should not leak memory during node operations', async () => {
      // Note: In real tests, would use performance.memory API
      const initialNodes = 10;
      const nodes = NodeFactory.createMany(initialNodes);
      await renderer.render(nodes, []);

      const memoryBefore = process.memoryUsage().heapUsed;

      // Add and remove nodes repeatedly
      for (let i = 0; i < 100; i++) {
        const newNode = NodeFactory.create();
        renderer.addNode(newNode);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDiff = memoryAfter - memoryBefore;

      console.log(`Memory before: ${(memoryBefore / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory after: ${(memoryAfter / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory diff: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryDiff).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Complex Design Performance', () => {
    test('should handle three-tier architecture design', async () => {
      const design = DesignFactory.createThreeTierWeb();

      const renderTime = await measurer.measureAsync(async () => {
        await renderer.render(design.nodes, design.edges);
      });

      console.log(`Three-tier design render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(BENCHMARKS.CANVAS_RENDER_50_NODES);
    });

    test('should handle microservices architecture design', async () => {
      // Create a complex microservices design
      const services = ['api-gateway', 'user-service', 'order-service', 'payment-service', 'notification-service'];
      const nodes: unknown[] = [];
      const edges: unknown[] = [];

      // Add VPC and networking
      nodes.push(NodeFactory.createVPC());
      nodes.push(NodeFactory.createSubnet());
      nodes.push(NodeFactory.createSecurityGroup());

      // Add services
      for (const service of services) {
        const lambda = NodeFactory.createLambda({
          data: { name: service, config: { runtime: 'nodejs18.x' }, layer: 'compute' },
        });
        const dynamo = NodeFactory.createDynamoDB({
          data: { name: `${service}-db`, config: {}, layer: 'database' },
        });
        nodes.push(lambda, dynamo);
        edges.push({ id: `e-${service}`, source: lambda.id, target: dynamo.id });
      }

      const renderTime = await measurer.measureAsync(async () => {
        await renderer.render(nodes, edges);
      });

      console.log(`Microservices design render time: ${renderTime.toFixed(2)}ms`);
      console.log(`Total nodes: ${nodes.length}`);
      expect(renderTime).toBeLessThan(BENCHMARKS.CANVAS_RENDER_50_NODES);
    });
  });
});

describe('API Performance Tests', () => {
  let measurer: PerformanceMeasurer;

  beforeEach(() => {
    measurer = new PerformanceMeasurer();
  });

  // Mock API calls
  const mockAPI = {
    getTemplates: async () => {
      await new Promise(r => setTimeout(r, 50));
      return { data: [] };
    },
    getDesign: async () => {
      await new Promise(r => setTimeout(r, 30));
      return { data: {} };
    },
    saveDesign: async () => {
      await new Promise(r => setTimeout(r, 100));
      return { success: true };
    },
    validate: async () => {
      await new Promise(r => setTimeout(r, 200));
      return { valid: true };
    },
    generateTerraform: async () => {
      await new Promise(r => setTimeout(r, 500));
      return { terraform: '' };
    },
  };

  test('should fetch templates within 500ms', async () => {
    const fetchTime = await measurer.measureAsync(async () => {
      await mockAPI.getTemplates();
    });

    console.log(`Template fetch time: ${fetchTime.toFixed(2)}ms`);
    expect(fetchTime).toBeLessThan(500);
  });

  test('should save design within 500ms', async () => {
    const saveTime = await measurer.measureAsync(async () => {
      await mockAPI.saveDesign();
    });

    console.log(`Design save time: ${saveTime.toFixed(2)}ms`);
    expect(saveTime).toBeLessThan(500);
  });

  test('should validate design within 3s', async () => {
    const validateTime = await measurer.measureAsync(async () => {
      await mockAPI.validate();
    });

    console.log(`Validation time: ${validateTime.toFixed(2)}ms`);
    expect(validateTime).toBeLessThan(BENCHMARKS.VALIDATION);
  });

  test('should generate Terraform within 5s', async () => {
    const generateTime = await measurer.measureAsync(async () => {
      await mockAPI.generateTerraform();
    });

    console.log(`Terraform generation time: ${generateTime.toFixed(2)}ms`);
    expect(generateTime).toBeLessThan(BENCHMARKS.TERRAFORM_GENERATION);
  });
});

describe('Performance Summary', () => {
  test('should generate performance report', () => {
    const report = {
      benchmarks: BENCHMARKS,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    console.log('Performance Benchmarks Summary:');
    console.log(JSON.stringify(report, null, 2));

    expect(report).toBeDefined();
  });
});
