/**
 * IAM Policy Generator
 *
 * Generates Terraform code for AWS IAM Policies.
 * Terraform Resource: aws_iam_policy
 */

import {
  BaseGenerator,
  GeneratorContext,
  ResourceOutput,
  CostEstimate,
  hclExpr,
} from '../../core';

// Import type from visual designer
import type { IAMPolicyNodeData } from '../../../../../webapp/src/components/visualDesigner/nodes/types/security.types';

/**
 * IAM Policy Generator
 */
export class IAMPolicyGenerator extends BaseGenerator<IAMPolicyNodeData> {
  readonly terraformResourceType = 'aws_iam_policy';
  readonly nodeServiceType = 'iam-policy' as const;
  readonly category = 'security' as const;

  protected generateMainTF(
    node: IAMPolicyNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const hcl = this.buildHCL();

    const resource = hcl.resource('aws_iam_policy', resourceName);

    resource.attribute('name', 'var.policy_name');
    resource.attribute('path', node.path || '/');

    if (node.description) {
      resource.attribute('description', node.description);
    }

    resource.attribute('policy', hclExpr('var.policy_document'));

    resource.tags({
      Name: node.name,
      Category: 'security',
    });

    resource.build();
    return hcl.toString();
  }

  protected generateVariablesTF(
    node: IAMPolicyNodeData,
    context: GeneratorContext
  ): string {
    const vars = this.buildVariable();

    vars.string('policy_name', 'Name of the IAM policy', node.name);

    vars.string('policy_path', 'Path for the IAM policy', node.path || '/');

    if (node.description) {
      vars.string('policy_description', 'Description of the IAM policy', node.description);
    }

    vars.add('policy_document', {
      type: 'string',
      description: 'The policy document (JSON)',
      default: node.policy,
    });

    vars.commonTags();

    return vars.toString();
  }

  protected generateOutputsTF(
    node: IAMPolicyNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const outputs = this.buildOutput();

    outputs.add('policy_arn', {
      description: 'ARN of the IAM policy',
      value: `aws_iam_policy.${resourceName}.arn`,
    });

    outputs.add('policy_id', {
      description: 'ID of the IAM policy',
      value: `aws_iam_policy.${resourceName}.id`,
    });

    outputs.add('policy_name', {
      description: 'Name of the IAM policy',
      value: `aws_iam_policy.${resourceName}.name`,
    });

    return outputs.toString();
  }

  protected getResourceOutputs(): ResourceOutput[] {
    return [
      { name: 'policy_arn', type: 'string', description: 'IAM Policy ARN' },
      { name: 'policy_id', type: 'string', description: 'IAM Policy ID' },
      { name: 'policy_name', type: 'string', description: 'IAM Policy Name' },
    ];
  }

  protected getEstimatedCost(node: IAMPolicyNodeData): CostEstimate {
    return {
      hourly: 0,
      monthly: 0,
      currency: 'USD',
    };
  }

  protected validateNode(node: IAMPolicyNodeData): void {
    super.validateNode(node);

    if (!node.policy) {
      throw new Error('IAM Policy requires a policy document');
    }

    try {
      JSON.parse(node.policy);
    } catch (e) {
      throw new Error('IAM Policy document must be valid JSON');
    }
  }
}
