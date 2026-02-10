/**
 * TerraformGenerator Unit Tests
 *
 * Comprehensive tests for the TerraformGenerator service covering
 * HCL generation, variable handling, and multi-node orchestration.
 */

import { NodeFactory, DesignFactory } from '../../fixtures/factories';

// Mock TerraformGenerator implementation
interface TerraformOutput {
  main: string;
  variables: string;
  outputs: string;
  metadata: {
    resourceCount: number;
    estimatedCost: number;
    generatedAt: string;
  };
}

interface GeneratorOptions {
  environment: string;
  region: string;
  prefix?: string;
  tags?: Record<string, string>;
}

class TerraformGenerator {
  private generatorMap: Map<string, (node: unknown, options: GeneratorOptions) => string>;

  constructor() {
    this.generatorMap = new Map();
    this.initializeGenerators();
  }

  private initializeGenerators() {
    // VPC Generator
    this.generatorMap.set('vpc', (node, options) => {
      const n = node as { id: string; data: { name: string; config: { cidr: string; enableDnsHostnames?: boolean; enableDnsSupport?: boolean } } };
      return `
resource "aws_vpc" "${this.sanitizeId(n.id)}" {
  cidr_block           = "${n.data.config.cidr}"
  enable_dns_hostnames = ${n.data.config.enableDnsHostnames ?? true}
  enable_dns_support   = ${n.data.config.enableDnsSupport ?? true}

  tags = ${this.generateTags(n.data.name, options)}
}`;
    });

    // Subnet Generator
    this.generatorMap.set('subnet', (node, options) => {
      const n = node as { id: string; data: { name: string; config: { cidr: string; availabilityZone?: string; mapPublicIpOnLaunch?: boolean } } };
      return `
resource "aws_subnet" "${this.sanitizeId(n.id)}" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "${n.data.config.cidr}"
  availability_zone       = "${n.data.config.availabilityZone || options.region + 'a'}"
  map_public_ip_on_launch = ${n.data.config.mapPublicIpOnLaunch ?? false}

  tags = ${this.generateTags(n.data.name, options)}
}`;
    });

    // Security Group Generator
    this.generatorMap.set('securityGroup', (node, options) => {
      const n = node as { id: string; data: { name: string; config: { description?: string; ingressRules?: Array<{ port: number; protocol: string; source: string }>; egressRules?: Array<{ port: number; protocol: string; destination: string }> } } };
      const ingressBlocks = (n.data.config.ingressRules || []).map(rule => `
  ingress {
    from_port   = ${rule.port}
    to_port     = ${rule.port}
    protocol    = "${rule.protocol}"
    cidr_blocks = ["${rule.source}"]
  }`).join('\n');

      const egressBlocks = (n.data.config.egressRules || [{ port: 0, protocol: '-1', destination: '0.0.0.0/0' }]).map(rule => `
  egress {
    from_port   = ${rule.port}
    to_port     = ${rule.port}
    protocol    = "${rule.protocol}"
    cidr_blocks = ["${rule.destination}"]
  }`).join('\n');

      return `
resource "aws_security_group" "${this.sanitizeId(n.id)}" {
  name        = "${options.prefix || ''}${n.data.name}"
  description = "${n.data.config.description || 'Managed by Terraform'}"
  vpc_id      = aws_vpc.main.id
${ingressBlocks}
${egressBlocks}
  tags = ${this.generateTags(n.data.name, options)}
}`;
    });

    // EC2 Instance Generator
    this.generatorMap.set('ec2Instance', (node, options) => {
      const n = node as { id: string; data: { name: string; config: { instanceType: string; ami: string; keyPair?: string; rootVolumeSize?: number; monitoring?: boolean } } };
      return `
resource "aws_instance" "${this.sanitizeId(n.id)}" {
  ami                    = "${n.data.config.ami}"
  instance_type          = "${n.data.config.instanceType}"
  key_name               = ${n.data.config.keyPair ? `"${n.data.config.keyPair}"` : 'null'}
  monitoring             = ${n.data.config.monitoring ?? false}
  vpc_security_group_ids = [aws_security_group.main.id]
  subnet_id              = aws_subnet.main.id

  root_block_device {
    volume_size = ${n.data.config.rootVolumeSize || 30}
    volume_type = "gp3"
    encrypted   = true
  }

  tags = ${this.generateTags(n.data.name, options)}
}`;
    });

    // Lambda Function Generator
    this.generatorMap.set('lambdaFunction', (node, options) => {
      const n = node as { id: string; data: { name: string; config: { runtime: string; memory?: number; timeout?: number; handler?: string } } };
      return `
resource "aws_lambda_function" "${this.sanitizeId(n.id)}" {
  function_name = "${options.prefix || ''}${n.data.name}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "${n.data.config.handler || 'index.handler'}"
  runtime       = "${n.data.config.runtime}"
  memory_size   = ${n.data.config.memory || 256}
  timeout       = ${n.data.config.timeout || 30}

  filename         = "\${path.module}/lambda/${n.data.name}.zip"
  source_code_hash = filebase64sha256("\${path.module}/lambda/${n.data.name}.zip")

  environment {
    variables = {
      ENVIRONMENT = "${options.environment}"
    }
  }

  tags = ${this.generateTags(n.data.name, options)}
}`;
    });

    // S3 Bucket Generator
    this.generatorMap.set('s3Bucket', (node, options) => {
      const n = node as { id: string; data: { name: string; config: { versioning?: boolean; encryption?: string } } };
      return `
resource "aws_s3_bucket" "${this.sanitizeId(n.id)}" {
  bucket = "${options.prefix || ''}${n.data.name}-${options.environment}"

  tags = ${this.generateTags(n.data.name, options)}
}

resource "aws_s3_bucket_versioning" "${this.sanitizeId(n.id)}_versioning" {
  bucket = aws_s3_bucket.${this.sanitizeId(n.id)}.id
  versioning_configuration {
    status = "${n.data.config.versioning ? 'Enabled' : 'Disabled'}"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "${this.sanitizeId(n.id)}_encryption" {
  bucket = aws_s3_bucket.${this.sanitizeId(n.id)}.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "${n.data.config.encryption || 'AES256'}"
    }
  }
}`;
    });

    // RDS Instance Generator
    this.generatorMap.set('rdsInstance', (node, options) => {
      const n = node as { id: string; data: { name: string; config: { engine: string; engineVersion?: string; instanceClass?: string; allocatedStorage?: number; multiAz?: boolean; storageEncrypted?: boolean } } };
      return `
resource "aws_db_instance" "${this.sanitizeId(n.id)}" {
  identifier             = "${options.prefix || ''}${n.data.name}-${options.environment}"
  engine                 = "${n.data.config.engine}"
  engine_version         = "${n.data.config.engineVersion || 'latest'}"
  instance_class         = "${n.data.config.instanceClass || 'db.t3.medium'}"
  allocated_storage      = ${n.data.config.allocatedStorage || 100}
  storage_encrypted      = ${n.data.config.storageEncrypted ?? true}
  multi_az               = ${n.data.config.multiAz ?? false}

  db_name  = "${n.data.name.replace(/-/g, '_')}"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  skip_final_snapshot    = ${options.environment === 'development'}
  deletion_protection    = ${options.environment === 'production'}

  tags = ${this.generateTags(n.data.name, options)}
}`;
    });

    // IAM Role Generator
    this.generatorMap.set('iamRole', (node, options) => {
      const n = node as { id: string; data: { name: string; config: { assumeRolePolicy?: unknown } } };
      return `
resource "aws_iam_role" "${this.sanitizeId(n.id)}" {
  name = "${options.prefix || ''}${n.data.name}-${options.environment}"

  assume_role_policy = jsonencode(${JSON.stringify(n.data.config.assumeRolePolicy || {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { Service: 'ec2.amazonaws.com' },
          Action: 'sts:AssumeRole',
        }],
      }, null, 2)})

  tags = ${this.generateTags(n.data.name, options)}
}`;
    });
  }

  private sanitizeId(id: string): string {
    return id.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  }

  private generateTags(name: string, options: GeneratorOptions): string {
    const tags = {
      Name: `${options.prefix || ''}${name}`,
      Environment: options.environment,
      ManagedBy: 'terraform',
      ...(options.tags || {}),
    };
    return JSON.stringify(tags, null, 4).replace(/"/g, '"');
  }

  generateForNode(node: unknown, options: GeneratorOptions): string {
    const n = node as { type: string };
    const generator = this.generatorMap.get(n.type);
    if (!generator) {
      throw new Error(`No generator found for node type: ${n.type}`);
    }
    return generator(node, options);
  }

  generateVariables(design: unknown, options: GeneratorOptions): string {
    const d = design as { nodes: Array<{ type: string }> };
    const variables: string[] = [
      `variable "environment" {
  description = "Environment name"
  type        = string
  default     = "${options.environment}"
}`,
      `variable "region" {
  description = "AWS region"
  type        = string
  default     = "${options.region}"
}`,
    ];

    // Add RDS-specific variables if needed
    const hasRDS = d.nodes.some(n => n.type === 'rdsInstance');
    if (hasRDS) {
      variables.push(`variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}`);
      variables.push(`variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}`);
    }

    return variables.join('\n\n');
  }

  generateOutputs(design: unknown): string {
    const d = design as { nodes: Array<{ type: string; id: string; data: { name: string } }> };
    const outputs: string[] = [];

    for (const node of d.nodes) {
      switch (node.type) {
        case 'vpc':
          outputs.push(`output "${this.sanitizeId(node.id)}_id" {
  description = "VPC ID for ${node.data.name}"
  value       = aws_vpc.${this.sanitizeId(node.id)}.id
}`);
          break;
        case 'ec2Instance':
          outputs.push(`output "${this.sanitizeId(node.id)}_public_ip" {
  description = "Public IP of ${node.data.name}"
  value       = aws_instance.${this.sanitizeId(node.id)}.public_ip
}`);
          break;
        case 'rdsInstance':
          outputs.push(`output "${this.sanitizeId(node.id)}_endpoint" {
  description = "RDS endpoint for ${node.data.name}"
  value       = aws_db_instance.${this.sanitizeId(node.id)}.endpoint
}`);
          break;
        case 's3Bucket':
          outputs.push(`output "${this.sanitizeId(node.id)}_arn" {
  description = "S3 bucket ARN for ${node.data.name}"
  value       = aws_s3_bucket.${this.sanitizeId(node.id)}.arn
}`);
          break;
        case 'lambdaFunction':
          outputs.push(`output "${this.sanitizeId(node.id)}_arn" {
  description = "Lambda function ARN for ${node.data.name}"
  value       = aws_lambda_function.${this.sanitizeId(node.id)}.arn
}`);
          break;
      }
    }

    return outputs.join('\n\n');
  }

  generate(design: unknown, options: GeneratorOptions): TerraformOutput {
    const d = design as { nodes: unknown[] };
    const mainBlocks: string[] = [
      `# Generated by Infrastructure Designer
# Environment: ${options.environment}
# Region: ${options.region}
# Generated at: ${new Date().toISOString()}

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}`,
    ];

    for (const node of d.nodes) {
      try {
        const terraform = this.generateForNode(node, options);
        mainBlocks.push(terraform);
      } catch (error) {
        console.warn(`Skipping node: ${(error as Error).message}`);
      }
    }

    return {
      main: mainBlocks.join('\n'),
      variables: this.generateVariables(design, options),
      outputs: this.generateOutputs(design),
      metadata: {
        resourceCount: d.nodes.length,
        estimatedCost: this.estimateCost(design),
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private estimateCost(design: unknown): number {
    const d = design as { nodes: Array<{ type: string; data: { config: Record<string, unknown> } }> };
    let totalCost = 0;

    const costMap: Record<string, number> = {
      vpc: 0,
      subnet: 0,
      securityGroup: 0,
      ec2Instance: 50,
      lambdaFunction: 10,
      s3Bucket: 5,
      rdsInstance: 150,
      dynamoDbTable: 25,
      loadBalancer: 30,
      iamRole: 0,
      iamPolicy: 0,
    };

    for (const node of d.nodes) {
      totalCost += costMap[node.type] || 0;
    }

    return totalCost;
  }

  validateHCL(hcl: string): boolean {
    // Basic HCL validation
    const openBraces = (hcl.match(/{/g) || []).length;
    const closeBraces = (hcl.match(/}/g) || []).length;
    return openBraces === closeBraces;
  }
}

describe('TerraformGenerator', () => {
  let generator: TerraformGenerator;
  const defaultOptions: GeneratorOptions = {
    environment: 'development',
    region: 'us-east-1',
    prefix: 'test-',
    tags: { Project: 'test-project' },
  };

  beforeEach(() => {
    generator = new TerraformGenerator();
  });

  describe('generateForNode', () => {
    describe('VPC generation', () => {
      it('should generate valid VPC Terraform', () => {
        const vpc = NodeFactory.createVPC();
        const result = generator.generateForNode(vpc, defaultOptions);

        expect(result).toContain('resource "aws_vpc"');
        expect(result).toContain('cidr_block');
        expect(result).toContain('enable_dns_hostnames');
        expect(result).toContain('tags');
      });

      it('should include CIDR from node config', () => {
        const vpc = NodeFactory.createVPC({
          data: {
            name: 'main-vpc',
            config: { cidr: '10.0.0.0/16', enableDnsHostnames: true, enableDnsSupport: true },
            layer: 'network',
          },
        });
        const result = generator.generateForNode(vpc, defaultOptions);

        expect(result).toContain('10.0.0.0/16');
      });
    });

    describe('Security Group generation', () => {
      it('should generate security group with ingress rules', () => {
        const sg = NodeFactory.createSecurityGroup({
          data: {
            name: 'web-sg',
            config: {
              description: 'Web security group',
              ingressRules: [
                { port: 443, protocol: 'tcp', source: '0.0.0.0/0' },
                { port: 80, protocol: 'tcp', source: '0.0.0.0/0' },
              ],
            },
            layer: 'security',
          },
        });
        const result = generator.generateForNode(sg, defaultOptions);

        expect(result).toContain('resource "aws_security_group"');
        expect(result).toContain('ingress');
        expect(result).toContain('from_port   = 443');
        expect(result).toContain('from_port   = 80');
      });

      it('should include default egress rule', () => {
        const sg = NodeFactory.createSecurityGroup();
        const result = generator.generateForNode(sg, defaultOptions);

        expect(result).toContain('egress');
        expect(result).toContain('protocol    = "-1"');
      });
    });

    describe('EC2 Instance generation', () => {
      it('should generate valid EC2 Terraform', () => {
        const ec2 = NodeFactory.createEC2();
        const result = generator.generateForNode(ec2, defaultOptions);

        expect(result).toContain('resource "aws_instance"');
        expect(result).toContain('ami');
        expect(result).toContain('instance_type');
        expect(result).toContain('root_block_device');
      });

      it('should include encryption on root volume', () => {
        const ec2 = NodeFactory.createEC2();
        const result = generator.generateForNode(ec2, defaultOptions);

        expect(result).toContain('encrypted   = true');
      });

      it('should use specified instance type', () => {
        const ec2 = NodeFactory.createEC2({
          data: {
            name: 'web-server',
            config: { instanceType: 'm5.large', ami: 'ami-123' },
            layer: 'compute',
          },
        });
        const result = generator.generateForNode(ec2, defaultOptions);

        expect(result).toContain('instance_type          = "m5.large"');
      });
    });

    describe('Lambda Function generation', () => {
      it('should generate valid Lambda Terraform', () => {
        const lambda = NodeFactory.createLambda();
        const result = generator.generateForNode(lambda, defaultOptions);

        expect(result).toContain('resource "aws_lambda_function"');
        expect(result).toContain('runtime');
        expect(result).toContain('memory_size');
        expect(result).toContain('timeout');
      });

      it('should include environment variables', () => {
        const lambda = NodeFactory.createLambda();
        const result = generator.generateForNode(lambda, defaultOptions);

        expect(result).toContain('environment {');
        expect(result).toContain('ENVIRONMENT = "development"');
      });
    });

    describe('S3 Bucket generation', () => {
      it('should generate S3 bucket with versioning', () => {
        const s3 = NodeFactory.createS3({
          data: { name: 'data-bucket', config: { versioning: true, encryption: 'AES256' }, layer: 'storage' },
        });
        const result = generator.generateForNode(s3, defaultOptions);

        expect(result).toContain('resource "aws_s3_bucket"');
        expect(result).toContain('aws_s3_bucket_versioning');
        expect(result).toContain('status = "Enabled"');
      });

      it('should generate S3 bucket with encryption', () => {
        const s3 = NodeFactory.createS3();
        const result = generator.generateForNode(s3, defaultOptions);

        expect(result).toContain('aws_s3_bucket_server_side_encryption_configuration');
        expect(result).toContain('sse_algorithm');
      });
    });

    describe('RDS Instance generation', () => {
      it('should generate valid RDS Terraform', () => {
        const rds = NodeFactory.createRDS();
        const result = generator.generateForNode(rds, defaultOptions);

        expect(result).toContain('resource "aws_db_instance"');
        expect(result).toContain('engine');
        expect(result).toContain('instance_class');
        expect(result).toContain('storage_encrypted');
      });

      it('should include sensitive variable references', () => {
        const rds = NodeFactory.createRDS();
        const result = generator.generateForNode(rds, defaultOptions);

        expect(result).toContain('var.db_username');
        expect(result).toContain('var.db_password');
      });

      it('should set deletion protection for production', () => {
        const rds = NodeFactory.createRDS();
        const prodOptions = { ...defaultOptions, environment: 'production' };
        const result = generator.generateForNode(rds, prodOptions);

        expect(result).toContain('deletion_protection    = true');
      });
    });

    it('should throw error for unsupported node type', () => {
      const unknownNode = { id: 'test', type: 'unknownType', data: {} };

      expect(() => generator.generateForNode(unknownNode, defaultOptions))
        .toThrow('No generator found for node type: unknownType');
    });
  });

  describe('generateVariables', () => {
    it('should generate base variables', () => {
      const design = DesignFactory.createMinimal();
      const result = generator.generateVariables(design, defaultOptions);

      expect(result).toContain('variable "environment"');
      expect(result).toContain('variable "region"');
    });

    it('should include database variables when RDS exists', () => {
      const design = DesignFactory.create({
        nodes: [NodeFactory.createRDS()],
        edges: [],
      });
      const result = generator.generateVariables(design, defaultOptions);

      expect(result).toContain('variable "db_username"');
      expect(result).toContain('variable "db_password"');
      expect(result).toContain('sensitive   = true');
    });

    it('should not include database variables when no RDS', () => {
      const design = DesignFactory.create({
        nodes: [NodeFactory.createEC2()],
        edges: [],
      });
      const result = generator.generateVariables(design, defaultOptions);

      expect(result).not.toContain('db_username');
      expect(result).not.toContain('db_password');
    });
  });

  describe('generateOutputs', () => {
    it('should generate VPC output', () => {
      const design = DesignFactory.create({
        nodes: [NodeFactory.createVPC()],
        edges: [],
      });
      const result = generator.generateOutputs(design);

      expect(result).toContain('output');
      expect(result).toContain('_id"');
      expect(result).toContain('aws_vpc.');
    });

    it('should generate EC2 output with public IP', () => {
      const design = DesignFactory.create({
        nodes: [NodeFactory.createEC2()],
        edges: [],
      });
      const result = generator.generateOutputs(design);

      expect(result).toContain('_public_ip"');
      expect(result).toContain('aws_instance.');
    });

    it('should generate RDS output with endpoint', () => {
      const design = DesignFactory.create({
        nodes: [NodeFactory.createRDS()],
        edges: [],
      });
      const result = generator.generateOutputs(design);

      expect(result).toContain('_endpoint"');
      expect(result).toContain('aws_db_instance.');
    });
  });

  describe('generate', () => {
    it('should generate complete Terraform output', () => {
      const design = DesignFactory.createWithNodes(3);
      const result = generator.generate(design, defaultOptions);

      expect(result).toHaveProperty('main');
      expect(result).toHaveProperty('variables');
      expect(result).toHaveProperty('outputs');
      expect(result).toHaveProperty('metadata');
    });

    it('should include provider configuration', () => {
      const design = DesignFactory.createMinimal();
      const result = generator.generate(design, defaultOptions);

      expect(result.main).toContain('terraform {');
      expect(result.main).toContain('provider "aws"');
      expect(result.main).toContain('required_version');
    });

    it('should include metadata with resource count', () => {
      const design = DesignFactory.createWithNodes(5);
      const result = generator.generate(design, defaultOptions);

      expect(result.metadata.resourceCount).toBe(5);
    });

    it('should estimate cost based on resources', () => {
      const design = DesignFactory.create({
        nodes: [
          NodeFactory.createEC2(),
          NodeFactory.createRDS(),
          NodeFactory.createS3(),
        ],
        edges: [],
      });
      const result = generator.generate(design, defaultOptions);

      expect(result.metadata.estimatedCost).toBeGreaterThan(0);
    });

    it('should generate valid HCL', () => {
      const design = DesignFactory.createThreeTierWeb();
      const result = generator.generate(design, defaultOptions);

      expect(generator.validateHCL(result.main)).toBe(true);
    });
  });

  describe('validateHCL', () => {
    it('should return true for valid HCL', () => {
      const validHCL = `
resource "aws_instance" "test" {
  ami = "ami-123"
  instance_type = "t3.micro"

  tags = {
    Name = "test"
  }
}`;
      expect(generator.validateHCL(validHCL)).toBe(true);
    });

    it('should return false for unbalanced braces', () => {
      const invalidHCL = `
resource "aws_instance" "test" {
  ami = "ami-123"
  instance_type = "t3.micro"`;
      expect(generator.validateHCL(invalidHCL)).toBe(false);
    });
  });

  describe('environment-specific generation', () => {
    it('should use environment in resource names', () => {
      const design = DesignFactory.create({
        nodes: [NodeFactory.createS3({ data: { name: 'data', config: {}, layer: 'storage' } })],
        edges: [],
      });
      const result = generator.generate(design, { ...defaultOptions, environment: 'staging' });

      expect(result.main).toContain('-staging');
    });

    it('should set production-specific settings', () => {
      const design = DesignFactory.create({
        nodes: [NodeFactory.createRDS()],
        edges: [],
      });
      const result = generator.generate(design, { ...defaultOptions, environment: 'production' });

      expect(result.main).toContain('deletion_protection    = true');
      expect(result.main).toContain('skip_final_snapshot    = false');
    });
  });
});
