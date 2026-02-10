/**
 * HCL Builder Unit Tests
 */

import { HCLBuilder, hclExpr } from '../../../core/HCLBuilder';

describe('HCLBuilder', () => {
  describe('resource', () => {
    it('should generate a basic resource block', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_vpc', 'main')
        .attribute('cidr_block', '10.0.0.0/16')
        .build();

      const result = hcl.toString();

      expect(result).toContain('resource "aws_vpc" "main"');
      expect(result).toContain('cidr_block = "10.0.0.0/16"');
    });

    it('should handle boolean attributes', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_vpc', 'main')
        .attribute('enable_dns_support', true)
        .attribute('enable_dns_hostnames', false)
        .build();

      const result = hcl.toString();

      expect(result).toContain('enable_dns_support = true');
      expect(result).toContain('enable_dns_hostnames = false');
    });

    it('should handle number attributes', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_instance', 'web')
        .attribute('root_block_device_size', 100)
        .build();

      const result = hcl.toString();

      expect(result).toContain('root_block_device_size = 100');
    });

    it('should handle HCL expressions without quotes', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_instance', 'web')
        .attribute('vpc_id', hclExpr('aws_vpc.main.id'))
        .attribute('subnet_id', hclExpr('var.subnet_id'))
        .build();

      const result = hcl.toString();

      expect(result).toContain('vpc_id = aws_vpc.main.id');
      expect(result).toContain('subnet_id = var.subnet_id');
    });

    it('should handle nested blocks', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_instance', 'web')
        .block('root_block_device', (b) => {
          b.attribute('volume_size', 100);
          b.attribute('encrypted', true);
        })
        .build();

      const result = hcl.toString();

      expect(result).toContain('root_block_device {');
      expect(result).toContain('volume_size = 100');
      expect(result).toContain('encrypted = true');
    });

    it('should handle tags with merge', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_vpc', 'main')
        .tags({ Name: 'my-vpc', Environment: 'dev' })
        .build();

      const result = hcl.toString();

      expect(result).toContain('tags = merge(var.common_tags');
      expect(result).toContain('Name = "my-vpc"');
      expect(result).toContain('Environment = "dev"');
    });

    it('should handle lifecycle blocks', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_security_group', 'main')
        .lifecycle({
          createBeforeDestroy: true,
          preventDestroy: false,
        })
        .build();

      const result = hcl.toString();

      expect(result).toContain('lifecycle {');
      expect(result).toContain('create_before_destroy = true');
      expect(result).toContain('prevent_destroy = false');
    });

    it('should handle depends_on', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_instance', 'web')
        .dependsOn(['aws_vpc.main', 'aws_subnet.public'])
        .build();

      const result = hcl.toString();

      expect(result).toContain('depends_on = [');
      expect(result).toContain('aws_vpc.main');
      expect(result).toContain('aws_subnet.public');
    });

    it('should handle count meta-argument', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_instance', 'web')
        .count('var.instance_count')
        .build();

      const result = hcl.toString();

      expect(result).toContain('count = var.instance_count');
    });

    it('should handle for_each meta-argument', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_instance', 'web')
        .forEach('var.instances')
        .build();

      const result = hcl.toString();

      expect(result).toContain('for_each = var.instances');
    });

    it('should handle dynamic blocks', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_security_group', 'main')
        .dynamicBlock('ingress', {
          forEach: 'var.ingress_rules',
          iterator: 'rule',
          content: (iter) => ({
            from_port: hclExpr(`${iter}.value.from_port`),
            to_port: hclExpr(`${iter}.value.to_port`),
            protocol: hclExpr(`${iter}.value.protocol`),
          }),
        })
        .build();

      const result = hcl.toString();

      expect(result).toContain('dynamic "ingress"');
      expect(result).toContain('for_each = var.ingress_rules');
      expect(result).toContain('iterator = rule');
      expect(result).toContain('content {');
      expect(result).toContain('from_port = rule.value.from_port');
    });
  });

  describe('data', () => {
    it('should generate a data source block', () => {
      const hcl = new HCLBuilder();

      hcl.data('aws_ami', 'amazon_linux')
        .attribute('most_recent', true)
        .attribute('owners', ['amazon'])
        .build();

      const result = hcl.toString();

      expect(result).toContain('data "aws_ami" "amazon_linux"');
      expect(result).toContain('most_recent = true');
      expect(result).toContain('owners = [');
    });
  });

  describe('locals', () => {
    it('should generate a locals block', () => {
      const hcl = new HCLBuilder();

      hcl.locals()
        .add('project_name', 'my-project')
        .add('environment', 'dev')
        .build();

      const result = hcl.toString();

      expect(result).toContain('locals {');
      expect(result).toContain('project_name = "my-project"');
      expect(result).toContain('environment = "dev"');
    });
  });

  describe('array formatting', () => {
    it('should format arrays correctly', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_lb', 'main')
        .attribute('subnets', ['subnet-1', 'subnet-2', 'subnet-3'])
        .build();

      const result = hcl.toString();

      expect(result).toContain('subnets = [');
      expect(result).toContain('"subnet-1"');
      expect(result).toContain('"subnet-2"');
      expect(result).toContain('"subnet-3"');
    });

    it('should handle empty arrays', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_instance', 'web')
        .attribute('security_groups', [])
        .build();

      const result = hcl.toString();

      expect(result).toContain('security_groups = []');
    });
  });

  describe('object formatting', () => {
    it('should format objects correctly', () => {
      const hcl = new HCLBuilder();

      hcl.resource('aws_s3_bucket', 'main')
        .attribute('website', {
          index_document: 'index.html',
          error_document: 'error.html',
        })
        .build();

      const result = hcl.toString();

      expect(result).toContain('website = {');
      expect(result).toContain('index_document = "index.html"');
      expect(result).toContain('error_document = "error.html"');
    });
  });
});
