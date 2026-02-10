/**
 * Security Group Generator
 *
 * Generates Terraform code for AWS Security Groups.
 * Terraform Resource: aws_security_group
 */

import {
  BaseGenerator,
  GeneratorContext,
  ResourceOutput,
  CostEstimate,
  hclExpr,
} from '../../core';

// Import type from visual designer
import type { SecurityGroupNodeData, SecurityRule } from '../../../../../webapp/src/components/visualDesigner/nodes/types/security.types';

/**
 * Security Group Generator
 */
export class SecurityGroupGenerator extends BaseGenerator<SecurityGroupNodeData> {
  readonly terraformResourceType = 'aws_security_group';
  readonly nodeServiceType = 'security-group' as const;
  readonly category = 'security' as const;

  protected generateMainTF(
    node: SecurityGroupNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const hcl = this.buildHCL();

    const resource = hcl.resource('aws_security_group', resourceName);

    // Basic attributes
    resource.attribute('name', `var.security_group_name`);
    resource.attribute('description', node.description || `Security group for ${node.name}`);

    // VPC reference
    if (node.vpcId) {
      const vpcRef = this.getDependencyRef(node.vpcId, context);
      resource.attribute('vpc_id', hclExpr(vpcRef));
    } else {
      resource.attribute('vpc_id', hclExpr('var.vpc_id'));
    }

    // Dynamic ingress rules
    if (node.ingressRules && node.ingressRules.length > 0) {
      resource.dynamicBlock('ingress', {
        forEach: 'var.ingress_rules',
        iterator: 'rule',
        content: (iter) => ({
          description: hclExpr(`${iter}.value.description`),
          from_port: hclExpr(`${iter}.value.from_port`),
          to_port: hclExpr(`${iter}.value.to_port`),
          protocol: hclExpr(`${iter}.value.protocol`),
          cidr_blocks: hclExpr(`lookup(${iter}.value, "cidr_blocks", null)`),
          ipv6_cidr_blocks: hclExpr(`lookup(${iter}.value, "ipv6_cidr_blocks", null)`),
          security_groups: hclExpr(`lookup(${iter}.value, "security_groups", null)`),
          prefix_list_ids: hclExpr(`lookup(${iter}.value, "prefix_list_ids", null)`),
        }),
      });
    }

    // Dynamic egress rules
    if (node.egressRules && node.egressRules.length > 0) {
      resource.dynamicBlock('egress', {
        forEach: 'var.egress_rules',
        iterator: 'rule',
        content: (iter) => ({
          description: hclExpr(`${iter}.value.description`),
          from_port: hclExpr(`${iter}.value.from_port`),
          to_port: hclExpr(`${iter}.value.to_port`),
          protocol: hclExpr(`${iter}.value.protocol`),
          cidr_blocks: hclExpr(`lookup(${iter}.value, "cidr_blocks", null)`),
          ipv6_cidr_blocks: hclExpr(`lookup(${iter}.value, "ipv6_cidr_blocks", null)`),
          security_groups: hclExpr(`lookup(${iter}.value, "security_groups", null)`),
          prefix_list_ids: hclExpr(`lookup(${iter}.value, "prefix_list_ids", null)`),
        }),
      });
    }

    // Tags
    resource.tags({
      Name: node.name,
      Category: 'security',
    });

    // Lifecycle
    resource.lifecycle({
      createBeforeDestroy: true,
    });

    resource.build();
    return hcl.toString();
  }

  protected generateVariablesTF(
    node: SecurityGroupNodeData,
    context: GeneratorContext
  ): string {
    const vars = this.buildVariable();

    vars.string(
      'security_group_name',
      'Name of the security group',
      node.name
    );

    vars.string(
      'security_group_description',
      'Description of the security group',
      node.description || `Security group for ${node.name}`
    );

    // VPC ID variable if not from dependency
    if (!node.vpcId) {
      vars.string('vpc_id', 'VPC ID where the security group will be created');
    }

    // Ingress rules variable
    vars.add('ingress_rules', {
      type: 'list(object)' as any,
      description: 'List of ingress rules',
      default: this.formatRulesForVariable(node.ingressRules || []),
    });

    // Egress rules variable
    vars.add('egress_rules', {
      type: 'list(object)' as any,
      description: 'List of egress rules',
      default: this.formatRulesForVariable(node.egressRules || []),
    });

    vars.commonTags();

    return vars.toString();
  }

  protected generateOutputsTF(
    node: SecurityGroupNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const outputs = this.buildOutput();

    outputs.add('security_group_id', {
      description: 'ID of the security group',
      value: `aws_security_group.${resourceName}.id`,
    });

    outputs.add('security_group_arn', {
      description: 'ARN of the security group',
      value: `aws_security_group.${resourceName}.arn`,
    });

    outputs.add('security_group_name', {
      description: 'Name of the security group',
      value: `aws_security_group.${resourceName}.name`,
    });

    outputs.add('security_group_vpc_id', {
      description: 'VPC ID of the security group',
      value: `aws_security_group.${resourceName}.vpc_id`,
    });

    return outputs.toString();
  }

  protected getResourceOutputs(): ResourceOutput[] {
    return [
      { name: 'security_group_id', type: 'string', description: 'Security Group ID' },
      { name: 'security_group_arn', type: 'string', description: 'Security Group ARN' },
      { name: 'security_group_name', type: 'string', description: 'Security Group Name' },
      { name: 'security_group_vpc_id', type: 'string', description: 'VPC ID' },
    ];
  }

  protected getEstimatedCost(node: SecurityGroupNodeData): CostEstimate {
    // Security groups are free
    return {
      hourly: 0,
      monthly: 0,
      currency: 'USD',
    };
  }

  /**
   * Format security rules for variable default value
   */
  private formatRulesForVariable(rules: SecurityRule[]): any[] {
    return rules.map((rule) => ({
      description: rule.description || '',
      from_port: rule.fromPort,
      to_port: rule.toPort,
      protocol: rule.protocol,
      cidr_blocks: rule.cidrBlocks || [],
      ipv6_cidr_blocks: rule.ipv6CidrBlocks || [],
      security_groups: rule.securityGroupIds || [],
      prefix_list_ids: rule.prefixListIds || [],
    }));
  }
}
