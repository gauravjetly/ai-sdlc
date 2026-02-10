/**
 * Unit Tests for Workflow Parser
 */

import { WorkflowParser } from '../../src/platform/cloud-abstraction/dsl/workflow-parser';

describe('WorkflowParser', () => {
  describe('parseYaml', () => {
    it('should parse valid workflow YAML', () => {
      const yaml = `
workflow:
  name: test-workflow
  target_cloud: aws
  region: us-east-1
  resources:
    - type: virtual_network
      name: test-vpc
      cidr: "10.0.0.0/16"
`;

      const result = WorkflowParser.parseYaml(yaml);

      expect(result.workflow.name).toBe('test-workflow');
      expect(result.workflow.target_cloud).toBe('aws');
      expect(result.workflow.region).toBe('us-east-1');
      expect(result.workflow.resources).toHaveLength(1);
      expect(result.workflow.resources[0].type).toBe('virtual_network');
    });

    it('should throw error for missing workflow key', () => {
      const yaml = `
name: test-workflow
target_cloud: aws
`;

      expect(() => WorkflowParser.parseYaml(yaml)).toThrow('missing "workflow" key');
    });

    it('should throw error for missing name', () => {
      const yaml = `
workflow:
  target_cloud: aws
  region: us-east-1
  resources: []
`;

      expect(() => WorkflowParser.parseYaml(yaml)).toThrow('missing "workflow.name"');
    });

    it('should throw error for invalid YAML', () => {
      const yaml = `
workflow:
  name: test
  invalid yaml syntax here [[[
`;

      expect(() => WorkflowParser.parseYaml(yaml)).toThrow();
    });
  });

  describe('toYaml', () => {
    it('should convert workflow back to YAML', () => {
      const workflow = {
        workflow: {
          name: 'test-workflow',
          target_cloud: 'aws' as const,
          region: 'us-east-1',
          resources: [
            {
              type: 'virtual_network' as const,
              name: 'test-vpc',
              cidr: '10.0.0.0/16'
            }
          ]
        }
      };

      const yaml = WorkflowParser.toYaml(workflow);

      expect(yaml).toContain('name: test-workflow');
      expect(yaml).toContain('target_cloud: aws');
      expect(yaml).toContain('type: virtual_network');
    });
  });
});
