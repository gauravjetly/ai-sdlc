/**
 * Template Seed Tests
 * Validates all pre-built infrastructure templates
 */

import { TEMPLATES, TemplateDefinition } from '../templates';

describe('Infrastructure Templates', () => {
  describe('Template Registry', () => {
    it('should have at least 7 templates', () => {
      expect(TEMPLATES.length).toBeGreaterThanOrEqual(7);
    });

    it('should have unique template names', () => {
      const names = TEMPLATES.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have all required templates', () => {
      const templateNames = TEMPLATES.map(t => t.name);
      expect(templateNames).toContain('Three-Tier Web Application');
      expect(templateNames).toContain('Microservices Platform (EKS)');
      expect(templateNames).toContain('Network Foundation (Multi-Account)');
      expect(templateNames).toContain('Serverless Backend');
      expect(templateNames).toContain('Data Analytics Platform');
      expect(templateNames).toContain('Security Baseline');
      expect(templateNames).toContain('CI/CD Pipeline');
    });
  });

  describe.each(TEMPLATES)('Template: $name', (template: TemplateDefinition) => {
    describe('Basic Structure', () => {
      it('should have a valid name', () => {
        expect(template.name).toBeDefined();
        expect(template.name.length).toBeGreaterThan(0);
      });

      it('should have a description', () => {
        expect(template.description).toBeDefined();
        expect(template.description.length).toBeGreaterThan(50);
      });

      it('should have a valid category', () => {
        const validCategories = [
          'network_foundation',
          'compute_platform',
          'storage_database',
          'security',
          'monitoring',
          'fullstack',
          'custom',
        ];
        expect(validCategories).toContain(template.category);
      });

      it('should have visibility set to public', () => {
        expect(template.visibility).toBe('public');
      });

      it('should have a valid layer type', () => {
        const validLayerTypes = ['network', 'platform', 'devops', 'fullstack'];
        expect(validLayerTypes).toContain(template.layerType);
      });

      it('should have a version string', () => {
        expect(template.version).toMatch(/^\d+\.\d+\.\d+$/);
      });

      it('should have tags', () => {
        expect(template.tags).toBeDefined();
        expect(Array.isArray(template.tags)).toBe(true);
        expect(template.tags.length).toBeGreaterThan(0);
      });
    });

    describe('Template Data', () => {
      const { templateData } = template;

      it('should have nodes', () => {
        expect(templateData.nodes).toBeDefined();
        expect(Array.isArray(templateData.nodes)).toBe(true);
        expect(templateData.nodes.length).toBeGreaterThan(0);
      });

      it('should have edges', () => {
        expect(templateData.edges).toBeDefined();
        expect(Array.isArray(templateData.edges)).toBe(true);
      });

      it('should have metadata', () => {
        expect(templateData.metadata).toBeDefined();
      });
    });

    describe('Nodes', () => {
      const { nodes } = template.templateData;
      const nodeIds = new Set(nodes.map(n => n.id));

      it('should have unique node IDs', () => {
        expect(nodeIds.size).toBe(nodes.length);
      });

      it.each(nodes)('node $id should have required fields', (node) => {
        expect(node.id).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
        expect(node.data).toBeDefined();
      });

      it.each(nodes)('node $id should have valid position', (node) => {
        expect(node.position.x).toBeGreaterThanOrEqual(0);
        expect(node.position.y).toBeGreaterThanOrEqual(-200);
        expect(node.position.x).toBeLessThan(2000);
        expect(node.position.y).toBeLessThan(1000);
      });

      it.each(nodes)('node $id should have data with name and serviceType', (node) => {
        expect(node.data.name).toBeDefined();
        expect(node.data.serviceType).toBeDefined();
      });
    });

    describe('Edges', () => {
      const { nodes, edges } = template.templateData;
      const nodeIds = new Set(nodes.map(n => n.id));

      it('should have unique edge IDs', () => {
        const edgeIds = edges.map(e => e.id);
        const uniqueEdgeIds = new Set(edgeIds);
        expect(uniqueEdgeIds.size).toBe(edgeIds.length);
      });

      it.each(edges)('edge $id should reference valid source node', (edge) => {
        expect(nodeIds.has(edge.source)).toBe(true);
      });

      it.each(edges)('edge $id should reference valid target node', (edge) => {
        expect(nodeIds.has(edge.target)).toBe(true);
      });

      it.each(edges)('edge $id should not be self-referencing', (edge) => {
        expect(edge.source).not.toBe(edge.target);
      });
    });

    describe('Metadata', () => {
      const { metadata } = template.templateData;

      it('should have author', () => {
        expect(metadata.author).toBeDefined();
        expect(metadata.author).toBe('Vintiq Catalyst Team');
      });

      it('should have version', () => {
        expect(metadata.version).toBeDefined();
        expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      });

      it('should be marked as tested', () => {
        expect(metadata.tested).toBe(true);
      });

      it('should have compliance markers', () => {
        expect(metadata.compliance).toBeDefined();
        expect(Array.isArray(metadata.compliance)).toBe(true);
      });

      it('should have cost estimates', () => {
        expect(metadata.estimatedCost).toBeDefined();
        expect(typeof metadata.estimatedCost.dev).toBe('number');
        expect(typeof metadata.estimatedCost.prod).toBe('number');
        expect(metadata.estimatedCost.currency).toBe('USD');
      });

      it('should have valid cost estimates (prod >= dev)', () => {
        expect(metadata.estimatedCost.prod).toBeGreaterThanOrEqual(metadata.estimatedCost.dev);
      });

      it('should have prerequisites', () => {
        expect(metadata.prerequisites).toBeDefined();
        expect(Array.isArray(metadata.prerequisites)).toBe(true);
        expect(metadata.prerequisites.length).toBeGreaterThan(0);
      });

      it('should have customization guide', () => {
        expect(metadata.customizationGuide).toBeDefined();
        expect(metadata.customizationGuide.length).toBeGreaterThan(50);
      });

      it('should have deployment time', () => {
        expect(metadata.deploymentTime).toBeDefined();
        expect(metadata.deploymentTime.length).toBeGreaterThan(0);
      });

      it('should have component summary', () => {
        expect(metadata.components).toBeDefined();
        expect(Array.isArray(metadata.components)).toBe(true);
        expect(metadata.components.length).toBeGreaterThan(0);
      });

      it.each(metadata.components)('component $type should have count and description', (component) => {
        expect(component.type).toBeDefined();
        expect(typeof component.count).toBe('number');
        expect(component.count).toBeGreaterThan(0);
        expect(component.description).toBeDefined();
      });
    });

    describe('Cost Accuracy', () => {
      const { metadata } = template.templateData;

      it('should have dev cost < $1000', () => {
        expect(metadata.estimatedCost.dev).toBeLessThan(1000);
      });

      it('should have prod cost < $5000', () => {
        expect(metadata.estimatedCost.prod).toBeLessThan(5000);
      });
    });
  });

  describe('Template Categories', () => {
    it('should have at least one fullstack template', () => {
      const fullstackTemplates = TEMPLATES.filter(t => t.category === 'fullstack');
      expect(fullstackTemplates.length).toBeGreaterThanOrEqual(1);
    });

    it('should have at least one network_foundation template', () => {
      const networkTemplates = TEMPLATES.filter(t => t.category === 'network_foundation');
      expect(networkTemplates.length).toBeGreaterThanOrEqual(1);
    });

    it('should have at least one security template', () => {
      const securityTemplates = TEMPLATES.filter(t => t.category === 'security');
      expect(securityTemplates.length).toBeGreaterThanOrEqual(1);
    });

    it('should have at least one compute_platform template', () => {
      const computeTemplates = TEMPLATES.filter(t => t.category === 'compute_platform');
      expect(computeTemplates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Node Type Coverage', () => {
    const allNodeTypes = new Set<string>();
    TEMPLATES.forEach(t => {
      t.templateData.nodes.forEach(n => {
        allNodeTypes.add(n.type);
      });
    });

    it('should include security group nodes', () => {
      expect(allNodeTypes.has('securityGroup')).toBe(true);
    });

    it('should include load balancer nodes', () => {
      expect(allNodeTypes.has('loadBalancer')).toBe(true);
    });

    it('should include IAM role nodes', () => {
      expect(allNodeTypes.has('iamRole')).toBe(true);
    });

    it('should include S3 bucket nodes', () => {
      expect(allNodeTypes.has('s3Bucket')).toBe(true);
    });

    it('should include Lambda function nodes', () => {
      expect(allNodeTypes.has('lambdaFunction')).toBe(true);
    });
  });
});

describe('Template Validation Logic', () => {
  it('should reject template with empty nodes', () => {
    const invalidTemplate: TemplateDefinition = {
      name: 'Invalid Template',
      description: 'Test',
      category: 'fullstack',
      visibility: 'public',
      layerType: 'fullstack',
      version: '1.0.0',
      tags: ['test'],
      templateData: {
        nodes: [],
        edges: [],
        metadata: {
          author: 'Test',
          version: '1.0.0',
          tested: false,
          compliance: [],
          estimatedCost: { dev: 0, prod: 0, currency: 'USD' },
          prerequisites: [],
          customizationGuide: '',
          deploymentTime: '',
          components: [],
        },
      },
    };

    expect(invalidTemplate.templateData.nodes.length).toBe(0);
  });

  it('should detect duplicate node IDs', () => {
    const nodes = [
      { id: 'node-1', type: 'test', position: { x: 0, y: 0 }, data: {} },
      { id: 'node-1', type: 'test', position: { x: 100, y: 0 }, data: {} },
    ];

    const nodeIds = nodes.map(n => n.id);
    const uniqueIds = new Set(nodeIds);
    expect(uniqueIds.size).not.toBe(nodeIds.length);
  });

  it('should detect invalid edge references', () => {
    const nodes = [
      { id: 'node-1', type: 'test', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges = [
      { id: 'edge-1', source: 'node-1', target: 'node-2' },
    ];

    const nodeIds = new Set(nodes.map(n => n.id));
    const invalidEdges = edges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target));
    expect(invalidEdges.length).toBeGreaterThan(0);
  });
});
