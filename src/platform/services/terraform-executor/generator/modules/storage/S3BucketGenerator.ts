/**
 * S3 Bucket Generator
 *
 * Generates Terraform code for AWS S3 Buckets.
 * Terraform Resources: aws_s3_bucket, aws_s3_bucket_versioning,
 *                      aws_s3_bucket_server_side_encryption_configuration,
 *                      aws_s3_bucket_public_access_block
 */

import {
  BaseGenerator,
  GeneratorContext,
  ResourceOutput,
  CostEstimate,
  hclExpr,
} from '../../core';

// Import type from visual designer
import type { S3BucketNodeData } from '../../../../../webapp/src/components/visualDesigner/nodes/types/storage.types';

/**
 * S3 Bucket Generator
 */
export class S3BucketGenerator extends BaseGenerator<S3BucketNodeData> {
  readonly terraformResourceType = 'aws_s3_bucket';
  readonly nodeServiceType = 's3-bucket' as const;
  readonly category = 'storage' as const;

  protected generateMainTF(
    node: S3BucketNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const hcl = this.buildHCL();

    // Main S3 bucket resource
    const bucket = hcl.resource('aws_s3_bucket', resourceName);
    bucket.attribute('bucket', hclExpr('var.bucket_name'));
    bucket.tags({
      Name: node.name,
      Category: 'storage',
    });
    bucket.build();

    // Versioning - enabled by default for data protection
    const versioning = hcl.resource('aws_s3_bucket_versioning', `${resourceName}_versioning`);
    versioning.attribute('bucket', hclExpr(`aws_s3_bucket.${resourceName}.id`));
    versioning.block('versioning_configuration', (b) => {
      b.attribute('status', node.versioning !== false ? 'Enabled' : 'Suspended');
    });
    versioning.build();

    // Server-side encryption - always enabled for security
    const encryption = hcl.resource(
      'aws_s3_bucket_server_side_encryption_configuration',
      `${resourceName}_encryption`
    );
    encryption.attribute('bucket', hclExpr(`aws_s3_bucket.${resourceName}.id`));
    encryption.block('rule', (b) => {
      b.block('apply_server_side_encryption_by_default', (inner) => {
        const algo = node.encryption?.algorithm || 'AES256';
        inner.attribute('sse_algorithm', algo === 'aws:kms' ? 'aws:kms' : 'AES256');
        if (algo === 'aws:kms' && node.encryption?.kmsKeyId) {
          inner.attribute('kms_master_key_id', node.encryption.kmsKeyId);
        }
      });
      b.attribute('bucket_key_enabled', true);
    });
    encryption.build();

    // Public access block - always block public access by default
    const publicBlock = hcl.resource(
      'aws_s3_bucket_public_access_block',
      `${resourceName}_public_access`
    );
    publicBlock.attribute('bucket', hclExpr(`aws_s3_bucket.${resourceName}.id`));
    publicBlock.attribute(
      'block_public_acls',
      node.blockPublicAccess?.blockPublicAcls !== false
    );
    publicBlock.attribute(
      'block_public_policy',
      node.blockPublicAccess?.blockPublicPolicy !== false
    );
    publicBlock.attribute(
      'ignore_public_acls',
      node.blockPublicAccess?.ignorePublicAcls !== false
    );
    publicBlock.attribute(
      'restrict_public_buckets',
      node.blockPublicAccess?.restrictPublicBuckets !== false
    );
    publicBlock.build();

    // Lifecycle rules
    if (node.lifecycleRules && node.lifecycleRules.length > 0) {
      const lifecycle = hcl.resource(
        'aws_s3_bucket_lifecycle_configuration',
        `${resourceName}_lifecycle`
      );
      lifecycle.attribute('bucket', hclExpr(`aws_s3_bucket.${resourceName}.id`));

      for (const rule of node.lifecycleRules) {
        lifecycle.block('rule', (b) => {
          b.attribute('id', rule.id);
          b.attribute('status', rule.enabled ? 'Enabled' : 'Disabled');

          if (rule.prefix) {
            b.block('filter', (f) => {
              f.attribute('prefix', rule.prefix);
            });
          }

          for (const transition of rule.transitions || []) {
            b.block('transition', (t) => {
              t.attribute('days', transition.days);
              t.attribute('storage_class', transition.storageClass);
            });
          }

          if (rule.expiration?.days) {
            b.block('expiration', (e) => {
              e.attribute('days', rule.expiration!.days);
            });
          }

          if (rule.noncurrentVersionExpiration?.days) {
            b.block('noncurrent_version_expiration', (e) => {
              e.attribute('noncurrent_days', rule.noncurrentVersionExpiration!.days);
            });
          }
        });
      }

      lifecycle.build();
    }

    // CORS configuration
    if (node.corsRules && node.corsRules.length > 0) {
      const cors = hcl.resource('aws_s3_bucket_cors_configuration', `${resourceName}_cors`);
      cors.attribute('bucket', hclExpr(`aws_s3_bucket.${resourceName}.id`));

      for (const rule of node.corsRules) {
        cors.block('cors_rule', (b) => {
          b.attribute('allowed_headers', rule.allowedHeaders);
          b.attribute('allowed_methods', rule.allowedMethods);
          b.attribute('allowed_origins', rule.allowedOrigins);
          if (rule.exposeHeaders) {
            b.attribute('expose_headers', rule.exposeHeaders);
          }
          if (rule.maxAgeSeconds) {
            b.attribute('max_age_seconds', rule.maxAgeSeconds);
          }
        });
      }

      cors.build();
    }

    // Website configuration
    if (node.websiteConfiguration) {
      const website = hcl.resource(
        'aws_s3_bucket_website_configuration',
        `${resourceName}_website`
      );
      website.attribute('bucket', hclExpr(`aws_s3_bucket.${resourceName}.id`));
      website.block('index_document', (b) => {
        b.attribute('suffix', node.websiteConfiguration!.indexDocument);
      });
      if (node.websiteConfiguration.errorDocument) {
        website.block('error_document', (b) => {
          b.attribute('key', node.websiteConfiguration!.errorDocument);
        });
      }
      website.build();
    }

    return hcl.toString();
  }

  protected generateVariablesTF(
    node: S3BucketNodeData,
    context: GeneratorContext
  ): string {
    const vars = this.buildVariable();

    vars.string('bucket_name', 'Name of the S3 bucket', node.bucketName || node.name);

    vars.bool('enable_versioning', 'Enable bucket versioning', node.versioning !== false);

    vars.string(
      'encryption_algorithm',
      'Encryption algorithm (AES256 or aws:kms)',
      node.encryption?.algorithm || 'AES256'
    );

    if (node.encryption?.algorithm === 'aws:kms' && node.encryption?.kmsKeyId) {
      vars.string('kms_key_id', 'KMS key ID for bucket encryption', node.encryption.kmsKeyId);
    }

    vars.bool(
      'block_public_acls',
      'Block public ACLs',
      node.blockPublicAccess?.blockPublicAcls !== false
    );

    vars.bool(
      'block_public_policy',
      'Block public bucket policy',
      node.blockPublicAccess?.blockPublicPolicy !== false
    );

    vars.commonTags();

    return vars.toString();
  }

  protected generateOutputsTF(
    node: S3BucketNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const outputs = this.buildOutput();

    outputs.add('bucket_id', {
      description: 'ID of the S3 bucket',
      value: `aws_s3_bucket.${resourceName}.id`,
    });

    outputs.add('bucket_arn', {
      description: 'ARN of the S3 bucket',
      value: `aws_s3_bucket.${resourceName}.arn`,
    });

    outputs.add('bucket_domain_name', {
      description: 'Domain name of the S3 bucket',
      value: `aws_s3_bucket.${resourceName}.bucket_domain_name`,
    });

    outputs.add('bucket_regional_domain_name', {
      description: 'Regional domain name of the S3 bucket',
      value: `aws_s3_bucket.${resourceName}.bucket_regional_domain_name`,
    });

    if (node.websiteConfiguration) {
      outputs.add('website_endpoint', {
        description: 'Website endpoint of the S3 bucket',
        value: `aws_s3_bucket_website_configuration.${resourceName}_website.website_endpoint`,
      });
    }

    return outputs.toString();
  }

  protected getResourceOutputs(): ResourceOutput[] {
    return [
      { name: 'bucket_id', type: 'string', description: 'S3 Bucket ID' },
      { name: 'bucket_arn', type: 'string', description: 'S3 Bucket ARN' },
      { name: 'bucket_domain_name', type: 'string', description: 'Bucket Domain Name' },
      {
        name: 'bucket_regional_domain_name',
        type: 'string',
        description: 'Regional Domain Name',
      },
    ];
  }

  protected getEstimatedCost(node: S3BucketNodeData): CostEstimate {
    // S3 cost is usage-based, estimate for 100GB storage
    return {
      hourly: 0.003, // ~$2.30/month for 100GB
      monthly: 2.3,
      currency: 'USD',
    };
  }
}
