/**
 * MCP Server Integration Tests
 */

import { PlatformMCPClient, createMCPClient } from '../../mcp/client/mcp-client';
import { ToolRegistry } from '../../mcp/server/tool-registry';

describe('MCP Server Integration Tests', () => {
  let client: PlatformMCPClient;

  beforeAll(async () => {
    // Note: In real tests, you'd start the MCP server process
    // For now, we'll test the components directly
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Tool Registry', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it('should register 100+ tools', () => {
      const stats = registry.getStatistics();
      expect(stats.total).toBeGreaterThanOrEqual(100);
    });

    it('should list all tools', () => {
      const tools = registry.listTools();
      expect(tools.length).toBeGreaterThanOrEqual(100);
      expect(tools[0]).toHaveProperty('name');
      expect(tools[0]).toHaveProperty('description');
      expect(tools[0]).toHaveProperty('inputSchema');
    });

    it('should have deployment tools', () => {
      const deploymentTools = registry.getToolsByCategory('deployment');
      expect(deploymentTools.length).toBeGreaterThanOrEqual(10);
    });

    it('should have infrastructure tools', () => {
      const infrastructureTools = registry.getToolsByCategory('infrastructure');
      expect(infrastructureTools.length).toBeGreaterThanOrEqual(10);
    });

    it('should have security tools', () => {
      const securityTools = registry.getToolsByCategory('security');
      expect(securityTools.length).toBeGreaterThanOrEqual(10);
    });

    it('should have cost tools', () => {
      const costTools = registry.getToolsByCategory('cost');
      expect(costTools.length).toBeGreaterThanOrEqual(10);
    });

    it('should have observability tools', () => {
      const observabilityTools = registry.getToolsByCategory('observability');
      expect(observabilityTools.length).toBeGreaterThanOrEqual(10);
    });

    it('should search tools by keyword', () => {
      const results = registry.searchTools('deploy');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(t =>
        t.name.includes('deploy') || t.description.toLowerCase().includes('deploy')
      )).toBe(true);
    });
  });

  describe('Tool Execution', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it('should execute deploy_application tool', async () => {
      const result = await registry.executeTool('deploy_application', {
        application: 'test-app',
        version: '1.0.0',
        environment: 'dev'
      });

      expect(result).toHaveProperty('deployment_id');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('pending');
    });

    it('should execute get_deployment_status tool', async () => {
      const deployResult = await registry.executeTool('deploy_application', {
        application: 'test-app',
        version: '1.0.0',
        environment: 'dev'
      });

      const statusResult = await registry.executeTool('get_deployment_status', {
        deployment_id: deployResult.deployment_id
      });

      expect(statusResult).toHaveProperty('id');
      expect(statusResult).toHaveProperty('status');
    });

    it('should execute provision_infrastructure tool', async () => {
      const result = await registry.executeTool('provision_infrastructure', {
        workflow: 'test-workflow',
        cloud: 'aws',
        environment: 'dev'
      });

      expect(result).toHaveProperty('workflow_id');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('resources');
    });

    it('should execute run_security_scan tool', async () => {
      const result = await registry.executeTool('run_security_scan', {
        target: 'test-target',
        scan_type: 'vulnerabilities'
      });

      expect(result).toHaveProperty('scan_id');
      expect(result).toHaveProperty('findings_count');
      expect(result).toHaveProperty('summary');
    });

    it('should execute get_cost_report tool', async () => {
      const result = await registry.executeTool('get_cost_report', {
        period: 'monthly',
        cloud: 'aws'
      });

      expect(result).toHaveProperty('total_cost');
      expect(result).toHaveProperty('breakdown');
      expect(Array.isArray(result.breakdown)).toBe(true);
    });

    it('should execute get_metrics tool', async () => {
      const result = await registry.executeTool('get_metrics', {
        service: 'test-service',
        metrics: ['cpu', 'memory']
      });

      expect(result).toHaveProperty('service');
      expect(result).toHaveProperty('metrics');
    });

    it('should validate input arguments', async () => {
      await expect(
        registry.executeTool('deploy_application', {
          application: 'test-app',
          version: 'invalid-version', // Should be semver
          environment: 'dev'
        })
      ).rejects.toThrow();
    });

    it('should reject unknown tools', async () => {
      await expect(
        registry.executeTool('unknown_tool', {})
      ).rejects.toThrow('Tool not found');
    });
  });

  describe('Tool Categories', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it('should categorize deployment tools correctly', () => {
      const tools = registry.getToolsByCategory('deployment');
      expect(tools.every(t => t.name.startsWith('deploy_') ||
                             t.name.startsWith('get_deployment') ||
                             t.name.startsWith('rollback_') ||
                             t.name.startsWith('scale_deployment') ||
                             t.name.startsWith('restart_deployment') ||
                             t.name.startsWith('list_deployments') ||
                             t.name.startsWith('pause_') ||
                             t.name.startsWith('resume_') ||
                             t.name.startsWith('update_') ||
                             t.name.startsWith('validate_deployment')
      )).toBe(true);
    });

    it('should categorize security tools correctly', () => {
      const tools = registry.getToolsByCategory('security');
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should categorize cost tools correctly', () => {
      const tools = registry.getToolsByCategory('cost');
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Statistics', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it('should provide accurate statistics', () => {
      const stats = registry.getStatistics();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byCategory');
      expect(stats.total).toBeGreaterThanOrEqual(100);

      const categorySum = Object.values(stats.byCategory).reduce((a: number, b: number) => a + b, 0);
      expect(categorySum).toBe(stats.total);
    });
  });

  describe('Zod Validation', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it('should validate environment enum', async () => {
      await expect(
        registry.executeTool('deploy_application', {
          application: 'test',
          version: '1.0.0',
          environment: 'invalid-env'
        })
      ).rejects.toThrow();
    });

    it('should validate semver version format', async () => {
      await expect(
        registry.executeTool('deploy_application', {
          application: 'test',
          version: 'not-semver',
          environment: 'dev'
        })
      ).rejects.toThrow();
    });

    it('should validate numeric ranges', async () => {
      await expect(
        registry.executeTool('scale_deployment', {
          deployment_id: '123e4567-e89b-12d3-a456-426614174000',
          replicas: 150 // Max is 100
        })
      ).rejects.toThrow();
    });

    it('should validate UUID format', async () => {
      await expect(
        registry.executeTool('get_deployment_status', {
          deployment_id: 'not-a-uuid'
        })
      ).rejects.toThrow();
    });
  });
});
