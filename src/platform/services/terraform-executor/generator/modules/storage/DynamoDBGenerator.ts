/**
 * DynamoDB Table Generator
 *
 * Generates Terraform code for AWS DynamoDB Tables.
 * Terraform Resource: aws_dynamodb_table
 */

import {
  BaseGenerator,
  GeneratorContext,
  ResourceOutput,
  CostEstimate,
  hclExpr,
} from '../../core';

// Import type from visual designer
import type { DynamoDBNodeData } from '../../../../../webapp/src/components/visualDesigner/nodes/types/storage.types';

/**
 * DynamoDB Table Generator
 */
export class DynamoDBGenerator extends BaseGenerator<DynamoDBNodeData> {
  readonly terraformResourceType = 'aws_dynamodb_table';
  readonly nodeServiceType = 'dynamodb-table' as const;
  readonly category = 'storage' as const;

  protected generateMainTF(
    node: DynamoDBNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const hcl = this.buildHCL();

    const resource = hcl.resource('aws_dynamodb_table', resourceName);

    resource.attribute('name', hclExpr('var.table_name'));
    resource.attribute('billing_mode', node.billingMode || 'PAY_PER_REQUEST');

    // Hash key
    resource.attribute('hash_key', node.hashKey.name);

    // Range key (optional)
    if (node.rangeKey) {
      resource.attribute('range_key', node.rangeKey.name);
    }

    // Attribute definitions
    resource.block('attribute', (b) => {
      b.attribute('name', node.hashKey.name);
      b.attribute('type', node.hashKey.type);
    });

    if (node.rangeKey) {
      resource.block('attribute', (b) => {
        b.attribute('name', node.rangeKey!.name);
        b.attribute('type', node.rangeKey!.type);
      });
    }

    // Global Secondary Indexes
    if (node.globalSecondaryIndexes && node.globalSecondaryIndexes.length > 0) {
      for (const gsi of node.globalSecondaryIndexes) {
        // Add attribute definitions for GSI keys
        resource.block('attribute', (b) => {
          b.attribute('name', gsi.keySchema.hashKey.name);
          b.attribute('type', gsi.keySchema.hashKey.type);
        });

        if (gsi.keySchema.rangeKey) {
          resource.block('attribute', (b) => {
            b.attribute('name', gsi.keySchema.rangeKey!.name);
            b.attribute('type', gsi.keySchema.rangeKey!.type);
          });
        }

        resource.block('global_secondary_index', (b) => {
          b.attribute('name', gsi.indexName);
          b.attribute('hash_key', gsi.keySchema.hashKey.name);

          if (gsi.keySchema.rangeKey) {
            b.attribute('range_key', gsi.keySchema.rangeKey.name);
          }

          b.attribute('projection_type', gsi.projection.type);

          if (
            gsi.projection.type === 'INCLUDE' &&
            gsi.projection.nonKeyAttributes
          ) {
            b.attribute('non_key_attributes', gsi.projection.nonKeyAttributes);
          }

          if (node.billingMode === 'PROVISIONED') {
            b.attribute('read_capacity', gsi.readCapacity || 5);
            b.attribute('write_capacity', gsi.writeCapacity || 5);
          }
        });
      }
    }

    // Local Secondary Indexes
    if (node.localSecondaryIndexes && node.localSecondaryIndexes.length > 0) {
      for (const lsi of node.localSecondaryIndexes) {
        resource.block('attribute', (b) => {
          b.attribute('name', lsi.rangeKey.name);
          b.attribute('type', lsi.rangeKey.type);
        });

        resource.block('local_secondary_index', (b) => {
          b.attribute('name', lsi.indexName);
          b.attribute('range_key', lsi.rangeKey.name);
          b.attribute('projection_type', lsi.projection.type);

          if (
            lsi.projection.type === 'INCLUDE' &&
            lsi.projection.nonKeyAttributes
          ) {
            b.attribute('non_key_attributes', lsi.projection.nonKeyAttributes);
          }
        });
      }
    }

    // Provisioned capacity (if not PAY_PER_REQUEST)
    if (node.billingMode === 'PROVISIONED') {
      resource.attribute('read_capacity', node.readCapacity || 5);
      resource.attribute('write_capacity', node.writeCapacity || 5);
    }

    // Server-side encryption - enabled by default
    resource.block('server_side_encryption', (b) => {
      b.attribute('enabled', true);
      if (node.encryption?.kmsKeyArn) {
        b.attribute('kms_key_arn', node.encryption.kmsKeyArn);
      }
    });

    // Point-in-time recovery - enabled by default for data protection
    resource.block('point_in_time_recovery', (b) => {
      b.attribute('enabled', node.pointInTimeRecovery !== false);
    });

    // TTL
    if (node.ttl?.enabled) {
      resource.block('ttl', (b) => {
        b.attribute('enabled', true);
        b.attribute('attribute_name', node.ttl!.attributeName);
      });
    }

    // DynamoDB Streams
    if (node.streamEnabled) {
      resource.attribute('stream_enabled', true);
      resource.attribute('stream_view_type', node.streamViewType || 'NEW_AND_OLD_IMAGES');
    }

    // Table class
    if (node.tableClass !== 'STANDARD') {
      resource.attribute('table_class', node.tableClass);
    }

    // Tags
    resource.tags({
      Name: node.name,
      Category: 'storage',
      BillingMode: node.billingMode || 'PAY_PER_REQUEST',
    });

    resource.build();
    return hcl.toString();
  }

  protected generateVariablesTF(
    node: DynamoDBNodeData,
    context: GeneratorContext
  ): string {
    const vars = this.buildVariable();

    vars.string('table_name', 'Name of the DynamoDB table', node.tableName || node.name);

    vars.string(
      'billing_mode',
      'Billing mode (PAY_PER_REQUEST or PROVISIONED)',
      node.billingMode || 'PAY_PER_REQUEST'
    );

    vars.string('hash_key_name', 'Name of the hash key', node.hashKey.name);

    vars.string('hash_key_type', 'Type of the hash key (S, N, or B)', node.hashKey.type);

    if (node.rangeKey) {
      vars.string('range_key_name', 'Name of the range key', node.rangeKey.name);
      vars.string('range_key_type', 'Type of the range key', node.rangeKey.type);
    }

    if (node.billingMode === 'PROVISIONED') {
      vars.number('read_capacity', 'Read capacity units', node.readCapacity || 5);
      vars.number('write_capacity', 'Write capacity units', node.writeCapacity || 5);
    }

    vars.bool(
      'enable_point_in_time_recovery',
      'Enable point-in-time recovery',
      node.pointInTimeRecovery !== false
    );

    vars.bool('enable_encryption', 'Enable server-side encryption', true);

    if (node.ttl?.enabled) {
      vars.string('ttl_attribute', 'TTL attribute name', node.ttl.attributeName);
    }

    vars.commonTags();

    return vars.toString();
  }

  protected generateOutputsTF(
    node: DynamoDBNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const outputs = this.buildOutput();

    outputs.add('table_arn', {
      description: 'ARN of the DynamoDB table',
      value: `aws_dynamodb_table.${resourceName}.arn`,
    });

    outputs.add('table_id', {
      description: 'ID of the DynamoDB table',
      value: `aws_dynamodb_table.${resourceName}.id`,
    });

    outputs.add('table_name', {
      description: 'Name of the DynamoDB table',
      value: `aws_dynamodb_table.${resourceName}.name`,
    });

    if (node.streamEnabled) {
      outputs.add('stream_arn', {
        description: 'ARN of the DynamoDB stream',
        value: `aws_dynamodb_table.${resourceName}.stream_arn`,
      });
    }

    return outputs.toString();
  }

  protected getResourceOutputs(): ResourceOutput[] {
    return [
      { name: 'table_arn', type: 'string', description: 'DynamoDB Table ARN' },
      { name: 'table_id', type: 'string', description: 'DynamoDB Table ID' },
      { name: 'table_name', type: 'string', description: 'DynamoDB Table Name' },
      { name: 'stream_arn', type: 'string', description: 'Stream ARN' },
    ];
  }

  protected getEstimatedCost(node: DynamoDBNodeData): CostEstimate {
    // DynamoDB cost varies significantly by usage
    // PAY_PER_REQUEST: $1.25 per million writes, $0.25 per million reads
    // Estimate for light usage
    if (node.billingMode === 'PROVISIONED') {
      const readCost = (node.readCapacity || 5) * 0.00013 * 730;
      const writeCost = (node.writeCapacity || 5) * 0.00065 * 730;
      return {
        hourly: (readCost + writeCost) / 730,
        monthly: readCost + writeCost,
        currency: 'USD',
      };
    }

    // PAY_PER_REQUEST - estimate based on typical usage
    return {
      hourly: 0,
      monthly: 5.0, // Estimate for light usage
      currency: 'USD',
    };
  }

  protected validateNode(node: DynamoDBNodeData): void {
    super.validateNode(node);

    if (!node.hashKey?.name || !node.hashKey?.type) {
      throw new Error('DynamoDB table requires a hash key with name and type');
    }

    if (!['S', 'N', 'B'].includes(node.hashKey.type)) {
      throw new Error('DynamoDB hash key type must be S, N, or B');
    }
  }
}
