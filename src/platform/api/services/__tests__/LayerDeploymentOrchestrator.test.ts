/**
 * Unit Tests for LayerDeploymentOrchestrator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayerDeploymentOrchestrator } from '../LayerDeploymentOrchestrator.js';
import { LayerType } from '../../types/designer.js';

// Mock dependencies
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    visualDesign: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    designWorkflow: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    designLayer: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    deployedResource: {
      upsert: vi.fn(),
    },
    aWSCredential: {
      findFirst: vi.fn(),
    },
  })),
}));

vi.mock('../ValidationService.js', () => ({
  validationService: {
    validateDesign: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
  },
}));

vi.mock('../TerraformGenerator.js', () => ({
  terraformGenerator: {
    generateFromDesign: vi.fn().mockResolvedValue({
      rootModule: {},
      modules: [
        {
          name: 'network',
          layer: 'network',
          files: [{ name: 'main.tf', content: 'resource "aws_vpc" "main" {}' }],
        },
      ],
      environments: {},
    }),
  },
}));

vi.mock('../../../utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('LayerDeploymentOrchestrator', () => {
  let orchestrator: LayerDeploymentOrchestrator;

  beforeEach(() => {
    orchestrator = new LayerDeploymentOrchestrator();
  });

  describe('resolveDependencies', () => {
    it('should return network first when all layers present', () => {
      const layers: LayerType[] = ['devops', 'platform', 'network'];
      const result = orchestrator.resolveDependencies(layers);

      expect(result).toEqual(['network', 'platform', 'devops']);
    });

    it('should handle single layer', () => {
      const layers: LayerType[] = ['network'];
      const result = orchestrator.resolveDependencies(layers);

      expect(result).toEqual(['network']);
    });

    it('should handle platform and devops without network', () => {
      const layers: LayerType[] = ['devops', 'platform'];
      const result = orchestrator.resolveDependencies(layers);

      expect(result).toEqual(['platform', 'devops']);
    });

    it('should maintain order when already sorted', () => {
      const layers: LayerType[] = ['network', 'platform', 'devops'];
      const result = orchestrator.resolveDependencies(layers);

      expect(result).toEqual(['network', 'platform', 'devops']);
    });
  });

  describe('getDependencyGraph', () => {
    it('should return correct graph for all layers', () => {
      const layers: LayerType[] = ['network', 'platform', 'devops'];
      const result = orchestrator.getDependencyGraph(layers);

      expect(result.layers).toEqual(layers);
      expect(result.edges).toContainEqual({ from: 'network', to: 'platform' });
      expect(result.edges).toContainEqual({ from: 'platform', to: 'devops' });
      expect(result.order).toEqual(['network', 'platform', 'devops']);
    });

    it('should return empty edges for single layer', () => {
      const layers: LayerType[] = ['network'];
      const result = orchestrator.getDependencyGraph(layers);

      expect(result.edges).toHaveLength(0);
    });

    it('should not include edges for missing layers', () => {
      const layers: LayerType[] = ['devops'];
      const result = orchestrator.getDependencyGraph(layers);

      // devops depends on platform, but platform is not in layers
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('getDeploymentStatus', () => {
    it('should return pending status for non-existent deployment', async () => {
      const result = await orchestrator.getDeploymentStatus('design-1', 'network');

      expect(result.status).toBe('pending');
      expect(result.progress).toBe(0);
    });
  });

  describe('onProgress / offProgress', () => {
    it('should allow subscribing to progress events', () => {
      const callback = vi.fn();
      orchestrator.onProgress(callback);

      // Manually trigger event (internal method)
      (orchestrator as any).eventEmitter.emit('progress', {
        designId: 'test',
        layerType: 'network',
        status: 'deploying',
        phase: 'validating',
        progress: 10,
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should allow unsubscribing from progress events', () => {
      const callback = vi.fn();
      orchestrator.onProgress(callback);
      orchestrator.offProgress(callback);

      (orchestrator as any).eventEmitter.emit('progress', {
        designId: 'test',
        layerType: 'network',
        status: 'deploying',
        phase: 'validating',
        progress: 10,
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('cancelDeployment', () => {
    it('should cancel active deployment', async () => {
      // Simulate an active deployment
      const deploymentKey = 'design-1-network';
      (orchestrator as any).activeDeployments.set(deploymentKey, {
        designId: 'design-1',
        layerType: 'network',
        status: 'deploying',
        phase: 'applying',
        progress: 50,
      });

      await orchestrator.cancelDeployment('design-1', 'network');

      expect((orchestrator as any).activeDeployments.has(deploymentKey)).toBe(false);
    });

    it('should do nothing for non-existent deployment', async () => {
      // Should not throw
      await expect(orchestrator.cancelDeployment('nonexistent', 'network')).resolves.not.toThrow();
    });
  });

  describe('validateDeploymentReadiness', () => {
    it('should be defined', () => {
      expect(orchestrator.validateDeploymentReadiness).toBeDefined();
    });
  });

  describe('deployLayer', () => {
    it('should be defined', () => {
      expect(orchestrator.deployLayer).toBeDefined();
    });
  });

  describe('deployAllLayers', () => {
    it('should be defined', () => {
      expect(orchestrator.deployAllLayers).toBeDefined();
    });
  });

  describe('rollbackLayer', () => {
    it('should be defined', () => {
      expect(orchestrator.rollbackLayer).toBeDefined();
    });
  });
});
