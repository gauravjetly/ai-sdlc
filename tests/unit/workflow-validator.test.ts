/**
 * Unit Tests for Workflow Validator
 */

import { WorkflowValidator } from '../../src/platform/cloud-abstraction/dsl/workflow-validator';
import { WorkflowDefinition } from '../../src/platform/cloud-abstraction/types/workflow-types';

describe('WorkflowValidator', () => {
  describe('validate', () => {
    it('should validate correct workflow', () => {
      const workflow: WorkflowDefinition = {
        workflow: {
          name: 'test-workflow',
          target_cloud: 'aws',
          region: 'us-east-1',
          resources: [
            {
              type: 'virtual_network',
              name: 'test-vpc',
              cidr: '10.0.0.0/16'
            },
            {
              type: 'kubernetes_cluster',
              name: 'test-eks',
              version: '1.28',
              node_count: 2,
              network: 'test-vpc'
            }
          ]
        }
      };

      const result = WorkflowValidator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid workflow name', () => {
      const workflow: WorkflowDefinition = {
        workflow: {
          name: 'Test-Workflow',  // Uppercase not allowed
          target_cloud: 'aws',
          region: 'us-east-1',
          resources: []
        }
      };

      const result = WorkflowValidator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_NAME_FORMAT')).toBe(true);
    });

    it('should reject invalid cloud provider', () => {
      const workflow: WorkflowDefinition = {
        workflow: {
          name: 'test-workflow',
          target_cloud: 'invalid' as any,
          region: 'us-east-1',
          resources: []
        }
      };

      const result = WorkflowValidator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CLOUD_PROVIDER')).toBe(true);
    });

    it('should reject empty resources', () => {
      const workflow: WorkflowDefinition = {
        workflow: {
          name: 'test-workflow',
          target_cloud: 'aws',
          region: 'us-east-1',
          resources: []
        }
      };

      const result = WorkflowValidator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_RESOURCES')).toBe(true);
    });

    it('should reject invalid CIDR format', () => {
      const workflow: WorkflowDefinition = {
        workflow: {
          name: 'test-workflow',
          target_cloud: 'aws',
          region: 'us-east-1',
          resources: [
            {
              type: 'virtual_network',
              name: 'test-vpc',
              cidr: 'invalid-cidr'
            }
          ]
        }
      };

      const result = WorkflowValidator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CIDR_FORMAT')).toBe(true);
    });

    it('should reject duplicate resource names', () => {
      const workflow: WorkflowDefinition = {
        workflow: {
          name: 'test-workflow',
          target_cloud: 'aws',
          region: 'us-east-1',
          resources: [
            {
              type: 'virtual_network',
              name: 'duplicate',
              cidr: '10.0.0.0/16'
            },
            {
              type: 'virtual_network',
              name: 'duplicate',
              cidr: '10.1.0.0/16'
            }
          ]
        }
      };

      const result = WorkflowValidator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_RESOURCE_NAME')).toBe(true);
    });

    it('should reject invalid resource references', () => {
      const workflow: WorkflowDefinition = {
        workflow: {
          name: 'test-workflow',
          target_cloud: 'aws',
          region: 'us-east-1',
          resources: [
            {
              type: 'kubernetes_cluster',
              name: 'test-eks',
              version: '1.28',
              node_count: 2,
              network: 'nonexistent-vpc'  // This VPC doesn't exist
            }
          ]
        }
      };

      const result = WorkflowValidator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_REFERENCE')).toBe(true);
    });

    it('should warn about unsupported clouds', () => {
      const workflow: WorkflowDefinition = {
        workflow: {
          name: 'test-workflow',
          target_cloud: 'azure',  // Not yet supported in Phase 1
          region: 'eastus',
          resources: [
            {
              type: 'virtual_network',
              name: 'test-vpc',
              cidr: '10.0.0.0/16'
            }
          ]
        }
      };

      const result = WorkflowValidator.validate(workflow);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('not yet supported'))).toBe(true);
    });
  });
});
