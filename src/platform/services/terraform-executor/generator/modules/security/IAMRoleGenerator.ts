/**
 * IAM Role Generator
 *
 * Generates Terraform code for AWS IAM Roles.
 * Terraform Resources: aws_iam_role, aws_iam_role_policy_attachment, aws_iam_role_policy
 */

import {
  BaseGenerator,
  GeneratorContext,
  ResourceOutput,
  CostEstimate,
  hclExpr,
} from '../../core';

// Import type from visual designer
import type { IAMRoleNodeData } from '../../../../../webapp/src/components/visualDesigner/nodes/types/security.types';

/**
 * IAM Role Generator
 */
export class IAMRoleGenerator extends BaseGenerator<IAMRoleNodeData> {
  readonly terraformResourceType = 'aws_iam_role';
  readonly nodeServiceType = 'iam-role' as const;
  readonly category = 'security' as const;

  protected generateMainTF(
    node: IAMRoleNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const hcl = this.buildHCL();

    // Main IAM Role resource
    const roleResource = hcl.resource('aws_iam_role', resourceName);

    roleResource.attribute('name', `var.role_name`);
    roleResource.attribute('path', node.path || '/');
    roleResource.attribute('assume_role_policy', hclExpr('var.assume_role_policy'));

    if (node.description) {
      roleResource.attribute('description', node.description);
    }

    roleResource.attribute('max_session_duration', node.maxSessionDuration || 3600);

    if (node.permissionsBoundary) {
      roleResource.attribute('permissions_boundary', node.permissionsBoundary);
    }

    roleResource.tags({
      Name: node.name,
      Category: 'security',
    });

    roleResource.build();

    // Managed policy attachments
    if (node.managedPolicyArns && node.managedPolicyArns.length > 0) {
      const attachResource = hcl.resource(
        'aws_iam_role_policy_attachment',
        `${resourceName}_managed`
      );

      attachResource.forEach('toset(var.managed_policy_arns)');
      attachResource.attribute('role', hclExpr(`aws_iam_role.${resourceName}.name`));
      attachResource.attribute('policy_arn', hclExpr('each.value'));
      attachResource.build();
    }

    // Inline policies
    if (node.inlinePolicies && node.inlinePolicies.length > 0) {
      for (let i = 0; i < node.inlinePolicies.length; i++) {
        const policy = node.inlinePolicies[i];
        const policyResourceName = `${resourceName}_inline_${i}`;

        const policyResource = hcl.resource('aws_iam_role_policy', policyResourceName);

        policyResource.attribute('name', policy.name);
        policyResource.attribute('role', hclExpr(`aws_iam_role.${resourceName}.id`));
        policyResource.attribute('policy', hclExpr(`var.inline_policy_${i}`));

        policyResource.build();
      }
    }

    return hcl.toString();
  }

  protected generateVariablesTF(
    node: IAMRoleNodeData,
    context: GeneratorContext
  ): string {
    const vars = this.buildVariable();

    vars.string('role_name', 'Name of the IAM role', node.name);

    vars.string(
      'role_path',
      'Path for the IAM role',
      node.path || '/'
    );

    // Assume role policy - typically JSON
    vars.add('assume_role_policy', {
      type: 'string',
      description: 'The policy that grants an entity permission to assume the role',
      default: node.assumeRolePolicy,
      sensitive: false,
    });

    if (node.description) {
      vars.string('role_description', 'Description of the IAM role', node.description);
    }

    vars.number(
      'max_session_duration',
      'Maximum session duration in seconds (3600-43200)',
      node.maxSessionDuration || 3600,
      [
        {
          condition: 'var.max_session_duration >= 3600 && var.max_session_duration <= 43200',
          errorMessage: 'max_session_duration must be between 3600 and 43200 seconds',
        },
      ]
    );

    if (node.managedPolicyArns && node.managedPolicyArns.length > 0) {
      vars.listString(
        'managed_policy_arns',
        'List of managed policy ARNs to attach to the role',
        node.managedPolicyArns
      );
    }

    // Inline policies as separate variables
    if (node.inlinePolicies && node.inlinePolicies.length > 0) {
      for (let i = 0; i < node.inlinePolicies.length; i++) {
        const policy = node.inlinePolicies[i];
        vars.add(`inline_policy_${i}`, {
          type: 'string',
          description: `Inline policy: ${policy.name}`,
          default: policy.policy,
        });
      }
    }

    vars.commonTags();

    return vars.toString();
  }

  protected generateOutputsTF(
    node: IAMRoleNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const outputs = this.buildOutput();

    outputs.add('role_arn', {
      description: 'ARN of the IAM role',
      value: `aws_iam_role.${resourceName}.arn`,
    });

    outputs.add('role_id', {
      description: 'ID of the IAM role',
      value: `aws_iam_role.${resourceName}.id`,
    });

    outputs.add('role_name', {
      description: 'Name of the IAM role',
      value: `aws_iam_role.${resourceName}.name`,
    });

    outputs.add('role_unique_id', {
      description: 'Unique ID of the IAM role',
      value: `aws_iam_role.${resourceName}.unique_id`,
    });

    return outputs.toString();
  }

  protected getResourceOutputs(): ResourceOutput[] {
    return [
      { name: 'role_arn', type: 'string', description: 'IAM Role ARN' },
      { name: 'role_id', type: 'string', description: 'IAM Role ID' },
      { name: 'role_name', type: 'string', description: 'IAM Role Name' },
      { name: 'role_unique_id', type: 'string', description: 'IAM Role Unique ID' },
    ];
  }

  protected getEstimatedCost(node: IAMRoleNodeData): CostEstimate {
    // IAM resources are free
    return {
      hourly: 0,
      monthly: 0,
      currency: 'USD',
    };
  }

  protected validateNode(node: IAMRoleNodeData): void {
    super.validateNode(node);

    if (!node.assumeRolePolicy) {
      throw new Error('IAM Role requires an assume role policy');
    }

    // Validate assume role policy is valid JSON
    try {
      JSON.parse(node.assumeRolePolicy);
    } catch (e) {
      throw new Error('IAM Role assume role policy must be valid JSON');
    }
  }
}
