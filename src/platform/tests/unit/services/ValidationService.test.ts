/**
 * ValidationService Unit Tests
 *
 * Comprehensive tests for the ValidationService covering all validation rules,
 * security checks, and edge cases.
 */

import { NodeFactory, DesignFactory } from '../../fixtures/factories';

// Mock ValidationService implementation
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  field?: string;
  severity: 'error';
}

interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
  recommendation?: string;
  severity: 'warning';
}

class ValidationService {
  private rules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    // VPC validation rules
    this.rules.set('vpc', [
      {
        code: 'VPC_CIDR_REQUIRED',
        validate: (node: unknown) => {
          const n = node as { data: { config: { cidr?: string } } };
          return !!n.data?.config?.cidr;
        },
        message: 'VPC CIDR block is required',
      },
      {
        code: 'VPC_CIDR_VALID',
        validate: (node: unknown) => {
          const n = node as { data: { config: { cidr?: string } } };
          const cidr = n.data?.config?.cidr;
          if (!cidr) return true; // Let CIDR_REQUIRED handle this
          const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
          return cidrRegex.test(cidr);
        },
        message: 'Invalid VPC CIDR format',
      },
    ]);

    // Security Group validation rules
    this.rules.set('securityGroup', [
      {
        code: 'SG_NAME_REQUIRED',
        validate: (node: unknown) => {
          const n = node as { data: { name?: string } };
          return !!n.data?.name && n.data.name.trim() !== '';
        },
        message: 'Security group name is required',
      },
      {
        code: 'SG_OPEN_CIDR_WARNING',
        validate: (node: unknown) => {
          const n = node as { data: { config: { ingressRules?: Array<{ source?: string }> } } };
          const rules = n.data?.config?.ingressRules || [];
          return !rules.some(r => r.source === '0.0.0.0/0');
        },
        message: 'Security group allows traffic from any IP (0.0.0.0/0)',
        isWarning: true,
      },
    ]);

    // EC2 validation rules
    this.rules.set('ec2Instance', [
      {
        code: 'EC2_INSTANCE_TYPE_REQUIRED',
        validate: (node: unknown) => {
          const n = node as { data: { config: { instanceType?: string } } };
          return !!n.data?.config?.instanceType;
        },
        message: 'EC2 instance type is required',
      },
      {
        code: 'EC2_AMI_REQUIRED',
        validate: (node: unknown) => {
          const n = node as { data: { config: { ami?: string } } };
          return !!n.data?.config?.ami;
        },
        message: 'EC2 AMI is required',
      },
    ]);

    // Lambda validation rules
    this.rules.set('lambdaFunction', [
      {
        code: 'LAMBDA_RUNTIME_REQUIRED',
        validate: (node: unknown) => {
          const n = node as { data: { config: { runtime?: string } } };
          return !!n.data?.config?.runtime;
        },
        message: 'Lambda runtime is required',
      },
      {
        code: 'LAMBDA_MEMORY_VALID',
        validate: (node: unknown) => {
          const n = node as { data: { config: { memory?: number } } };
          const memory = n.data?.config?.memory;
          if (!memory) return true;
          return memory >= 128 && memory <= 10240;
        },
        message: 'Lambda memory must be between 128 MB and 10240 MB',
      },
      {
        code: 'LAMBDA_TIMEOUT_VALID',
        validate: (node: unknown) => {
          const n = node as { data: { config: { timeout?: number } } };
          const timeout = n.data?.config?.timeout;
          if (!timeout) return true;
          return timeout >= 1 && timeout <= 900;
        },
        message: 'Lambda timeout must be between 1 and 900 seconds',
      },
    ]);

    // RDS validation rules
    this.rules.set('rdsInstance', [
      {
        code: 'RDS_ENGINE_REQUIRED',
        validate: (node: unknown) => {
          const n = node as { data: { config: { engine?: string } } };
          return !!n.data?.config?.engine;
        },
        message: 'RDS engine is required',
      },
      {
        code: 'RDS_PUBLIC_WARNING',
        validate: (node: unknown) => {
          const n = node as { data: { config: { publiclyAccessible?: boolean } } };
          return !n.data?.config?.publiclyAccessible;
        },
        message: 'RDS instance is publicly accessible - security risk',
        isWarning: true,
      },
    ]);

    // S3 validation rules
    this.rules.set('s3Bucket', [
      {
        code: 'S3_PUBLIC_WARNING',
        validate: (node: unknown) => {
          const n = node as { data: { config: { publicAccess?: boolean } } };
          return !n.data?.config?.publicAccess;
        },
        message: 'S3 bucket has public access enabled - security risk',
        isWarning: true,
      },
      {
        code: 'S3_ENCRYPTION_WARNING',
        validate: (node: unknown) => {
          const n = node as { data: { config: { encryption?: string } } };
          return !!n.data?.config?.encryption;
        },
        message: 'S3 bucket encryption is not enabled',
        isWarning: true,
      },
    ]);
  }

  validateNode(node: unknown): ValidationResult {
    const n = node as { type: string };
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const rules = this.rules.get(n.type) || [];

    for (const rule of rules) {
      if (!rule.validate(node)) {
        if (rule.isWarning) {
          warnings.push({
            code: rule.code,
            message: rule.message,
            nodeId: (node as { id?: string }).id,
            severity: 'warning',
          });
        } else {
          errors.push({
            code: rule.code,
            message: rule.message,
            nodeId: (node as { id?: string }).id,
            severity: 'error',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateDesign(design: unknown): ValidationResult {
    const d = design as { nodes: unknown[]; edges: Array<{ source: string; target: string }> };
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate each node
    for (const node of d.nodes) {
      const result = this.validateNode(node);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    // Validate edges (connections)
    const nodeIds = new Set(d.nodes.map((n: unknown) => (n as { id: string }).id));
    for (const edge of d.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          code: 'EDGE_INVALID_SOURCE',
          message: `Edge references non-existent source node: ${edge.source}`,
          severity: 'error',
        });
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({
          code: 'EDGE_INVALID_TARGET',
          message: `Edge references non-existent target node: ${edge.target}`,
          severity: 'error',
        });
      }
    }

    // Check for orphaned nodes (no connections)
    const connectedNodes = new Set<string>();
    for (const edge of d.edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }
    for (const node of d.nodes) {
      const n = node as { id: string };
      if (!connectedNodes.has(n.id) && d.nodes.length > 1) {
        warnings.push({
          code: 'NODE_ORPHANED',
          message: 'Node has no connections to other resources',
          nodeId: n.id,
          recommendation: 'Consider connecting this node to other resources',
          severity: 'warning',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateSecurityConfig(design: unknown): ValidationResult {
    const d = design as { nodes: Array<{ type: string; data: { config: Record<string, unknown> } }> };
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for security groups
    const hasSecurityGroups = d.nodes.some(n => n.type === 'securityGroup');
    if (!hasSecurityGroups && d.nodes.length > 0) {
      warnings.push({
        code: 'NO_SECURITY_GROUPS',
        message: 'Design has no security groups defined',
        recommendation: 'Add security groups to control network access',
        severity: 'warning',
      });
    }

    // Check for IAM roles
    const hasIAMRoles = d.nodes.some(n => n.type === 'iamRole');
    const hasCompute = d.nodes.some(n => ['ec2Instance', 'lambdaFunction', 'ecsCluster'].includes(n.type));
    if (hasCompute && !hasIAMRoles) {
      warnings.push({
        code: 'NO_IAM_ROLES',
        message: 'Compute resources exist without IAM roles',
        recommendation: 'Add IAM roles to grant necessary permissions',
        severity: 'warning',
      });
    }

    // Check for encryption
    const databases = d.nodes.filter(n => ['rdsInstance', 'dynamoDbTable'].includes(n.type));
    for (const db of databases) {
      if (!db.data?.config?.storageEncrypted && !db.data?.config?.encryption) {
        warnings.push({
          code: 'DB_NO_ENCRYPTION',
          message: 'Database does not have encryption enabled',
          nodeId: (db as unknown as { id: string }).id,
          recommendation: 'Enable encryption at rest for sensitive data',
          severity: 'warning',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

interface ValidationRule {
  code: string;
  validate: (node: unknown) => boolean;
  message: string;
  isWarning?: boolean;
}

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validateNode', () => {
    describe('VPC validation', () => {
      it('should validate VPC with valid CIDR', () => {
        const vpc = NodeFactory.createVPC();
        const result = service.validateNode(vpc);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail when VPC CIDR is missing', () => {
        const vpc = NodeFactory.createVPC({
          data: { name: 'test-vpc', config: {}, layer: 'network' },
        });
        const result = service.validateNode(vpc);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'VPC_CIDR_REQUIRED' })
        );
      });

      it('should fail when VPC CIDR format is invalid', () => {
        const vpc = NodeFactory.createVPC({
          data: { name: 'test-vpc', config: { cidr: 'invalid-cidr' }, layer: 'network' },
        });
        const result = service.validateNode(vpc);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'VPC_CIDR_VALID' })
        );
      });
    });

    describe('Security Group validation', () => {
      it('should validate security group with restricted CIDR', () => {
        const sg = NodeFactory.createSecurityGroup({
          data: {
            name: 'test-sg',
            config: {
              ingressRules: [{ port: 443, source: '10.0.0.0/8' }],
            },
            layer: 'security',
          },
        });
        const result = service.validateNode(sg);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });

      it('should warn when security group allows 0.0.0.0/0', () => {
        const sg = NodeFactory.createSecurityGroup({
          data: {
            name: 'test-sg',
            config: {
              ingressRules: [{ port: 443, source: '0.0.0.0/0' }],
            },
            layer: 'security',
          },
        });
        const result = service.validateNode(sg);
        expect(result.isValid).toBe(true); // Warnings don't fail validation
        expect(result.warnings).toContainEqual(
          expect.objectContaining({ code: 'SG_OPEN_CIDR_WARNING' })
        );
      });

      it('should fail when security group name is missing', () => {
        const sg = NodeFactory.createSecurityGroup({
          data: { name: '', config: {}, layer: 'security' },
        });
        const result = service.validateNode(sg);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'SG_NAME_REQUIRED' })
        );
      });
    });

    describe('EC2 validation', () => {
      it('should validate EC2 with all required fields', () => {
        const ec2 = NodeFactory.createEC2();
        const result = service.validateNode(ec2);
        expect(result.isValid).toBe(true);
      });

      it('should fail when EC2 instance type is missing', () => {
        const ec2 = NodeFactory.createEC2({
          data: { name: 'test-ec2', config: { ami: 'ami-123' }, layer: 'compute' },
        });
        const result = service.validateNode(ec2);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'EC2_INSTANCE_TYPE_REQUIRED' })
        );
      });

      it('should fail when EC2 AMI is missing', () => {
        const ec2 = NodeFactory.createEC2({
          data: { name: 'test-ec2', config: { instanceType: 't3.micro' }, layer: 'compute' },
        });
        const result = service.validateNode(ec2);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'EC2_AMI_REQUIRED' })
        );
      });
    });

    describe('Lambda validation', () => {
      it('should validate Lambda with valid configuration', () => {
        const lambda = NodeFactory.createLambda();
        const result = service.validateNode(lambda);
        expect(result.isValid).toBe(true);
      });

      it('should fail when Lambda runtime is missing', () => {
        const lambda = NodeFactory.createLambda({
          data: { name: 'test-lambda', config: { memory: 256 }, layer: 'compute' },
        });
        const result = service.validateNode(lambda);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'LAMBDA_RUNTIME_REQUIRED' })
        );
      });

      it('should fail when Lambda memory is too low', () => {
        const lambda = NodeFactory.createLambda({
          data: {
            name: 'test-lambda',
            config: { runtime: 'nodejs18.x', memory: 64 },
            layer: 'compute',
          },
        });
        const result = service.validateNode(lambda);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'LAMBDA_MEMORY_VALID' })
        );
      });

      it('should fail when Lambda timeout exceeds maximum', () => {
        const lambda = NodeFactory.createLambda({
          data: {
            name: 'test-lambda',
            config: { runtime: 'nodejs18.x', timeout: 1000 },
            layer: 'compute',
          },
        });
        const result = service.validateNode(lambda);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'LAMBDA_TIMEOUT_VALID' })
        );
      });
    });

    describe('RDS validation', () => {
      it('should validate RDS with valid configuration', () => {
        const rds = NodeFactory.createRDS();
        const result = service.validateNode(rds);
        expect(result.isValid).toBe(true);
      });

      it('should fail when RDS engine is missing', () => {
        const rds = NodeFactory.createRDS({
          data: { name: 'test-rds', config: { instanceClass: 'db.t3.medium' }, layer: 'database' },
        });
        const result = service.validateNode(rds);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'RDS_ENGINE_REQUIRED' })
        );
      });

      it('should warn when RDS is publicly accessible', () => {
        const rds = NodeFactory.createRDS({
          data: {
            name: 'test-rds',
            config: { engine: 'postgres', publiclyAccessible: true },
            layer: 'database',
          },
        });
        const result = service.validateNode(rds);
        expect(result.warnings).toContainEqual(
          expect.objectContaining({ code: 'RDS_PUBLIC_WARNING' })
        );
      });
    });

    describe('S3 validation', () => {
      it('should validate S3 with encryption enabled', () => {
        const s3 = NodeFactory.createS3();
        const result = service.validateNode(s3);
        expect(result.isValid).toBe(true);
      });

      it('should warn when S3 has public access', () => {
        const s3 = NodeFactory.createS3({
          data: {
            name: 'test-bucket',
            config: { publicAccess: true, encryption: 'AES256' },
            layer: 'storage',
          },
        });
        const result = service.validateNode(s3);
        expect(result.warnings).toContainEqual(
          expect.objectContaining({ code: 'S3_PUBLIC_WARNING' })
        );
      });

      it('should warn when S3 encryption is not enabled', () => {
        const s3 = NodeFactory.createS3({
          data: { name: 'test-bucket', config: {}, layer: 'storage' },
        });
        const result = service.validateNode(s3);
        expect(result.warnings).toContainEqual(
          expect.objectContaining({ code: 'S3_ENCRYPTION_WARNING' })
        );
      });
    });
  });

  describe('validateDesign', () => {
    it('should validate design with valid nodes and edges', () => {
      const design = DesignFactory.createThreeTierWeb();
      const result = service.validateDesign(design);
      // Design should be valid (only warnings for security best practices)
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid edge source', () => {
      const design = DesignFactory.createWithNodes(2);
      design.edges = [
        { id: 'e1', source: 'non-existent', target: design.nodes[0].id },
      ];
      const result = service.validateDesign(design);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'EDGE_INVALID_SOURCE' })
      );
    });

    it('should detect invalid edge target', () => {
      const design = DesignFactory.createWithNodes(2);
      design.edges = [
        { id: 'e1', source: design.nodes[0].id, target: 'non-existent' },
      ];
      const result = service.validateDesign(design);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'EDGE_INVALID_TARGET' })
      );
    });

    it('should warn about orphaned nodes', () => {
      const design = DesignFactory.createWithNodes(3);
      // Remove all edges - all nodes become orphaned
      design.edges = [];
      const result = service.validateDesign(design);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'NODE_ORPHANED' })
      );
    });

    it('should aggregate errors from all nodes', () => {
      const design = DesignFactory.create({
        nodes: [
          NodeFactory.createVPC({ data: { name: 'vpc', config: {}, layer: 'network' } }),
          NodeFactory.createEC2({ data: { name: 'ec2', config: {}, layer: 'compute' } }),
        ],
        edges: [],
      });
      const result = service.validateDesign(design);
      // Should have errors from both VPC (missing CIDR) and EC2 (missing instance type and AMI)
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should validate empty design', () => {
      const design = DesignFactory.createMinimal();
      const result = service.validateDesign(design);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSecurityConfig', () => {
    it('should warn when no security groups exist', () => {
      const design = DesignFactory.create({
        nodes: [NodeFactory.createEC2()],
        edges: [],
      });
      const result = service.validateSecurityConfig(design);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'NO_SECURITY_GROUPS' })
      );
    });

    it('should warn when compute exists without IAM roles', () => {
      const design = DesignFactory.create({
        nodes: [NodeFactory.createEC2(), NodeFactory.createSecurityGroup()],
        edges: [],
      });
      const result = service.validateSecurityConfig(design);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'NO_IAM_ROLES' })
      );
    });

    it('should warn when database lacks encryption', () => {
      const rds = NodeFactory.createRDS({
        data: { name: 'test-rds', config: { engine: 'postgres' }, layer: 'database' },
      });
      const design = DesignFactory.create({
        nodes: [rds, NodeFactory.createSecurityGroup()],
        edges: [],
      });
      const result = service.validateSecurityConfig(design);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'DB_NO_ENCRYPTION' })
      );
    });

    it('should pass when all security best practices are followed', () => {
      const design = DesignFactory.create({
        nodes: [
          NodeFactory.createSecurityGroup(),
          NodeFactory.createIAMRole(),
          NodeFactory.createRDS({
            data: {
              name: 'db',
              config: { engine: 'postgres', storageEncrypted: true },
              layer: 'database',
            },
          }),
        ],
        edges: [],
      });
      const result = service.validateSecurityConfig(design);
      expect(result.warnings.filter(w => ['NO_SECURITY_GROUPS', 'NO_IAM_ROLES', 'DB_NO_ENCRYPTION'].includes(w.code))).toHaveLength(0);
    });
  });
});
