/**
 * Security Group Generator Unit Tests
 */

import { SecurityGroupGenerator } from '../../../modules/security/SecurityGroupGenerator';
import { GeneratorContext } from '../../../core/types';

describe('SecurityGroupGenerator', () => {
  let generator: SecurityGroupGenerator;
  let mockContext: GeneratorContext;

  beforeEach(() => {
    generator = new SecurityGroupGenerator();
    mockContext = {
      environment: 'dev',
      projectName: 'test-project',
      region: 'us-east-1',
      commonTags: { Project: 'test' },
      allNodes: new Map(),
      resolvedDependencies: new Map(),
      outputPath: '/tmp/test',
    };
  });

  describe('properties', () => {
    it('should have correct terraform resource type', () => {
      expect(generator.terraformResourceType).toBe('aws_security_group');
    });

    it('should have correct node service type', () => {
      expect(generator.nodeServiceType).toBe('security-group');
    });

    it('should have correct category', () => {
      expect(generator.category).toBe('security');
    });
  });

  describe('generate', () => {
    it('should generate valid main.tf', () => {
      const node = {
        id: 'sg-1',
        name: 'web-security-group',
        serviceType: 'security-group' as const,
        category: 'security' as const,
        description: 'Security group for web servers',
        vpcId: 'vpc-123',
        ingressRules: [
          {
            id: 'rule-1',
            protocol: 'tcp' as const,
            fromPort: 80,
            toPort: 80,
            cidrBlocks: ['0.0.0.0/0'],
            description: 'HTTP',
          },
          {
            id: 'rule-2',
            protocol: 'tcp' as const,
            fromPort: 443,
            toPort: 443,
            cidrBlocks: ['0.0.0.0/0'],
            description: 'HTTPS',
          },
        ],
        egressRules: [
          {
            id: 'egress-1',
            protocol: '-1' as const,
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ['0.0.0.0/0'],
            description: 'Allow all outbound',
          },
        ],
        ruleCount: 3,
        tags: {},
        status: 'configured' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const output = generator.generate(node, mockContext);

      // Check main.tf
      expect(output.mainTf).toContain('resource "aws_security_group"');
      expect(output.mainTf).toContain('web_security_group');
      expect(output.mainTf).toContain('name = var.security_group_name');
      expect(output.mainTf).toContain('description');
      expect(output.mainTf).toContain('dynamic "ingress"');
      expect(output.mainTf).toContain('dynamic "egress"');
      expect(output.mainTf).toContain('create_before_destroy = true');
    });

    it('should generate valid variables.tf', () => {
      const node = {
        id: 'sg-1',
        name: 'test-sg',
        serviceType: 'security-group' as const,
        category: 'security' as const,
        description: 'Test SG',
        vpcId: '',
        ingressRules: [],
        egressRules: [],
        ruleCount: 0,
        tags: {},
        status: 'unconfigured' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const output = generator.generate(node, mockContext);

      expect(output.variablesTf).toContain('variable "security_group_name"');
      expect(output.variablesTf).toContain('variable "security_group_description"');
      expect(output.variablesTf).toContain('variable "ingress_rules"');
      expect(output.variablesTf).toContain('variable "egress_rules"');
      expect(output.variablesTf).toContain('variable "common_tags"');
    });

    it('should generate valid outputs.tf', () => {
      const node = {
        id: 'sg-1',
        name: 'test-sg',
        serviceType: 'security-group' as const,
        category: 'security' as const,
        description: 'Test SG',
        vpcId: '',
        ingressRules: [],
        egressRules: [],
        ruleCount: 0,
        tags: {},
        status: 'unconfigured' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const output = generator.generate(node, mockContext);

      expect(output.outputsTf).toContain('output "security_group_id"');
      expect(output.outputsTf).toContain('output "security_group_arn"');
      expect(output.outputsTf).toContain('output "security_group_name"');
      expect(output.outputsTf).toContain('output "security_group_vpc_id"');
    });

    it('should generate valid versions.tf', () => {
      const node = {
        id: 'sg-1',
        name: 'test-sg',
        serviceType: 'security-group' as const,
        category: 'security' as const,
        description: '',
        vpcId: '',
        ingressRules: [],
        egressRules: [],
        ruleCount: 0,
        tags: {},
        status: 'unconfigured' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const output = generator.generate(node, mockContext);

      expect(output.versionsTf).toContain('terraform {');
      expect(output.versionsTf).toContain('required_version');
      expect(output.versionsTf).toContain('required_providers');
      expect(output.versionsTf).toContain('hashicorp/aws');
    });

    it('should return correct metadata', () => {
      const node = {
        id: 'sg-1',
        name: 'my-security-group',
        serviceType: 'security-group' as const,
        category: 'security' as const,
        description: '',
        vpcId: '',
        ingressRules: [],
        egressRules: [],
        ruleCount: 0,
        tags: {},
        status: 'unconfigured' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const output = generator.generate(node, mockContext);

      expect(output.metadata.resourceType).toBe('aws_security_group');
      expect(output.metadata.resourceName).toBe('my_security_group');
      expect(output.metadata.category).toBe('security');
      expect(output.metadata.outputs.length).toBeGreaterThan(0);
    });
  });

  describe('resource name sanitization', () => {
    it('should sanitize resource names correctly', () => {
      const testCases = [
        { input: 'my-security-group', expected: 'my_security_group' },
        { input: 'MySecurityGroup', expected: 'mysecuritygroup' },
        { input: '123-invalid', expected: 'r_123_invalid' },
        { input: 'valid_name', expected: 'valid_name' },
      ];

      for (const { input, expected } of testCases) {
        const node = {
          id: 'sg-1',
          name: input,
          serviceType: 'security-group' as const,
          category: 'security' as const,
          description: '',
          vpcId: '',
          ingressRules: [],
          egressRules: [],
          ruleCount: 0,
          tags: {},
          status: 'unconfigured' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const output = generator.generate(node, mockContext);
        expect(output.metadata.resourceName).toBe(expected);
      }
    });
  });

  describe('cost estimation', () => {
    it('should return zero cost for security groups', () => {
      const node = {
        id: 'sg-1',
        name: 'test-sg',
        serviceType: 'security-group' as const,
        category: 'security' as const,
        description: '',
        vpcId: '',
        ingressRules: [],
        egressRules: [],
        ruleCount: 0,
        tags: {},
        status: 'unconfigured' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const output = generator.generate(node, mockContext);

      expect(output.metadata.estimatedCost?.monthly).toBe(0);
      expect(output.metadata.estimatedCost?.hourly).toBe(0);
    });
  });
});
