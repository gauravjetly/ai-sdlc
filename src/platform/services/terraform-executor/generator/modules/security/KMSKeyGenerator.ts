/**
 * KMS Key Generator
 *
 * Generates Terraform code for AWS KMS Keys.
 * Terraform Resources: aws_kms_key, aws_kms_alias
 */

import {
  BaseGenerator,
  GeneratorContext,
  ResourceOutput,
  CostEstimate,
  hclExpr,
} from '../../core';

// Import type from visual designer
import type { KMSKeyNodeData } from '../../../../../webapp/src/components/visualDesigner/nodes/types/security.types';

/**
 * KMS Key Generator
 */
export class KMSKeyGenerator extends BaseGenerator<KMSKeyNodeData> {
  readonly terraformResourceType = 'aws_kms_key';
  readonly nodeServiceType = 'kms-key' as const;
  readonly category = 'security' as const;

  protected generateMainTF(
    node: KMSKeyNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const hcl = this.buildHCL();

    // KMS Key resource
    const keyResource = hcl.resource('aws_kms_key', resourceName);

    if (node.description) {
      keyResource.attribute('description', node.description);
    }

    keyResource.attribute('key_usage', node.keyUsage || 'ENCRYPT_DECRYPT');
    keyResource.attribute(
      'customer_master_key_spec',
      node.keySpec || 'SYMMETRIC_DEFAULT'
    );

    // Security defaults - key rotation enabled
    keyResource.attribute('enable_key_rotation', node.enableKeyRotation !== false);

    // Deletion window - minimum 7 days for safety
    const deletionWindow = Math.max(node.deletionWindowInDays || 30, 7);
    keyResource.attribute('deletion_window_in_days', deletionWindow);

    keyResource.attribute('is_enabled', true);
    keyResource.attribute('multi_region', node.multiRegion || false);

    // Key policy
    if (node.policy) {
      keyResource.attribute('policy', hclExpr('var.key_policy'));
    }

    keyResource.tags({
      Name: node.name,
      Category: 'security',
      KeyUsage: node.keyUsage || 'ENCRYPT_DECRYPT',
    });

    keyResource.build();

    // KMS Alias
    if (node.alias) {
      const aliasResource = hcl.resource('aws_kms_alias', `${resourceName}_alias`);

      // Ensure alias starts with 'alias/'
      const aliasName = node.alias.startsWith('alias/')
        ? node.alias
        : `alias/${node.alias}`;

      aliasResource.attribute('name', aliasName);
      aliasResource.attribute('target_key_id', hclExpr(`aws_kms_key.${resourceName}.key_id`));

      aliasResource.build();
    }

    return hcl.toString();
  }

  protected generateVariablesTF(
    node: KMSKeyNodeData,
    context: GeneratorContext
  ): string {
    const vars = this.buildVariable();

    vars.string('key_description', 'Description for the KMS key', node.description || '');

    vars.string(
      'key_usage',
      'Key usage (ENCRYPT_DECRYPT or SIGN_VERIFY)',
      node.keyUsage || 'ENCRYPT_DECRYPT'
    );

    vars.string(
      'key_spec',
      'Key specification',
      node.keySpec || 'SYMMETRIC_DEFAULT'
    );

    vars.bool('enable_key_rotation', 'Enable automatic key rotation', true);

    vars.number(
      'deletion_window_in_days',
      'Deletion window in days (7-30)',
      Math.max(node.deletionWindowInDays || 30, 7),
      [
        {
          condition: 'var.deletion_window_in_days >= 7 && var.deletion_window_in_days <= 30',
          errorMessage: 'deletion_window_in_days must be between 7 and 30',
        },
      ]
    );

    vars.bool('multi_region', 'Enable multi-region key', node.multiRegion || false);

    if (node.alias) {
      const aliasName = node.alias.startsWith('alias/')
        ? node.alias
        : `alias/${node.alias}`;
      vars.string('key_alias', 'Alias for the KMS key', aliasName);
    }

    if (node.policy) {
      vars.add('key_policy', {
        type: 'string',
        description: 'Key policy JSON document',
        default: node.policy,
      });
    }

    vars.commonTags();

    return vars.toString();
  }

  protected generateOutputsTF(
    node: KMSKeyNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const outputs = this.buildOutput();

    outputs.add('key_id', {
      description: 'ID of the KMS key',
      value: `aws_kms_key.${resourceName}.key_id`,
    });

    outputs.add('key_arn', {
      description: 'ARN of the KMS key',
      value: `aws_kms_key.${resourceName}.arn`,
    });

    if (node.alias) {
      outputs.add('key_alias_arn', {
        description: 'ARN of the KMS key alias',
        value: `aws_kms_alias.${resourceName}_alias.arn`,
      });

      outputs.add('key_alias_name', {
        description: 'Name of the KMS key alias',
        value: `aws_kms_alias.${resourceName}_alias.name`,
      });
    }

    return outputs.toString();
  }

  protected getResourceOutputs(): ResourceOutput[] {
    return [
      { name: 'key_id', type: 'string', description: 'KMS Key ID' },
      { name: 'key_arn', type: 'string', description: 'KMS Key ARN' },
      { name: 'key_alias_arn', type: 'string', description: 'KMS Key Alias ARN' },
      { name: 'key_alias_name', type: 'string', description: 'KMS Key Alias Name' },
    ];
  }

  protected getEstimatedCost(node: KMSKeyNodeData): CostEstimate {
    // KMS costs ~$1/month per key + $0.03 per 10,000 requests
    return {
      hourly: 0.00137, // ~$1/month
      monthly: 1.0,
      currency: 'USD',
    };
  }
}
