/**
 * Lambda Function Generator
 *
 * Generates Terraform code for AWS Lambda Functions.
 * Terraform Resource: aws_lambda_function
 */

import {
  BaseGenerator,
  GeneratorContext,
  ResourceOutput,
  CostEstimate,
  hclExpr,
} from '../../core';

// Import type from visual designer
import type { LambdaFunctionNodeData } from '../../../../../webapp/src/components/visualDesigner/nodes/types/compute.types';

/**
 * Lambda Function Generator
 */
export class LambdaGenerator extends BaseGenerator<LambdaFunctionNodeData> {
  readonly terraformResourceType = 'aws_lambda_function';
  readonly nodeServiceType = 'lambda-function' as const;
  readonly category = 'compute' as const;

  protected generateMainTF(
    node: LambdaFunctionNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const hcl = this.buildHCL();

    // Lambda function resource
    const resource = hcl.resource('aws_lambda_function', resourceName);

    resource.attribute('function_name', hclExpr('var.function_name'));
    resource.attribute('role', this.getRoleReference(node, context));
    resource.attribute('handler', node.handler || 'index.handler');
    resource.attribute('runtime', node.runtime || 'nodejs20.x');

    // Code source - placeholder for S3 or local file
    resource.attribute('filename', hclExpr('var.deployment_package'));
    resource.attribute('source_code_hash', hclExpr('filebase64sha256(var.deployment_package)'));

    // Memory and timeout
    resource.attribute('memory_size', node.memorySize || 128);
    resource.attribute('timeout', node.timeout || 3);

    // Reserved concurrency
    if (node.reservedConcurrentExecutions !== undefined) {
      resource.attribute('reserved_concurrent_executions', node.reservedConcurrentExecutions);
    }

    // Environment variables
    if (node.environment && Object.keys(node.environment).length > 0) {
      resource.block('environment', (b) => {
        b.attribute('variables', hclExpr('var.environment_variables'));
      });
    }

    // VPC configuration
    if (node.vpcConfig && node.vpcConfig.subnetIds && node.vpcConfig.subnetIds.length > 0) {
      resource.block('vpc_config', (b) => {
        const subnetRefs = node.vpcConfig!.subnetIds.map((id) =>
          this.getDependencyRef(id, context)
        );
        const sgRefs = node.vpcConfig!.securityGroupIds.map((id) =>
          this.getDependencyRef(id, context)
        );

        b.attribute('subnet_ids', hclExpr(`[${subnetRefs.join(', ')}]`));
        b.attribute('security_group_ids', hclExpr(`[${sgRefs.join(', ')}]`));
      });
    }

    // Layers
    if (node.layers && node.layers.length > 0) {
      resource.attribute('layers', node.layers);
    }

    // Tracing configuration
    if (node.tracingConfig) {
      resource.block('tracing_config', (b) => {
        b.attribute('mode', node.tracingConfig!.mode || 'PassThrough');
      });
    }

    // Dead letter config
    if (node.deadLetterConfig?.targetArn) {
      resource.block('dead_letter_config', (b) => {
        b.attribute('target_arn', node.deadLetterConfig!.targetArn);
      });
    }

    // Ephemeral storage
    if (node.ephemeralStorage && node.ephemeralStorage.size > 512) {
      resource.block('ephemeral_storage', (b) => {
        b.attribute('size', node.ephemeralStorage!.size);
      });
    }

    // Tags
    resource.tags({
      Name: node.name,
      Category: 'compute',
      Runtime: node.runtime || 'nodejs20.x',
    });

    resource.build();

    // CloudWatch Log Group (best practice)
    const logGroup = hcl.resource('aws_cloudwatch_log_group', `${resourceName}_logs`);
    logGroup.attribute('name', `/aws/lambda/\${var.function_name}`);
    logGroup.attribute('retention_in_days', 14);
    logGroup.tags({
      Name: `${node.name}-logs`,
    });
    logGroup.build();

    return hcl.toString();
  }

  protected generateVariablesTF(
    node: LambdaFunctionNodeData,
    context: GeneratorContext
  ): string {
    const vars = this.buildVariable();

    vars.string('function_name', 'Name of the Lambda function', node.functionName || node.name);

    vars.string('handler', 'Function handler', node.handler || 'index.handler');

    vars.string('runtime', 'Lambda runtime', node.runtime || 'nodejs20.x');

    vars.string(
      'deployment_package',
      'Path to the deployment package (zip file)',
      'lambda.zip'
    );

    if (!node.role) {
      vars.string('role_arn', 'ARN of the IAM role for Lambda execution');
    }

    vars.number('memory_size', 'Memory size in MB', node.memorySize || 128, [
      {
        condition: 'var.memory_size >= 128 && var.memory_size <= 10240',
        errorMessage: 'memory_size must be between 128 and 10240 MB',
      },
    ]);

    vars.number('timeout', 'Timeout in seconds', node.timeout || 3, [
      {
        condition: 'var.timeout >= 1 && var.timeout <= 900',
        errorMessage: 'timeout must be between 1 and 900 seconds',
      },
    ]);

    if (node.environment && Object.keys(node.environment).length > 0) {
      vars.mapString(
        'environment_variables',
        'Environment variables for the Lambda function',
        node.environment
      );
    }

    if (node.layers && node.layers.length > 0) {
      vars.listString('layers', 'List of Lambda layer ARNs', node.layers);
    }

    vars.commonTags();

    return vars.toString();
  }

  protected generateOutputsTF(
    node: LambdaFunctionNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const outputs = this.buildOutput();

    outputs.add('function_arn', {
      description: 'ARN of the Lambda function',
      value: `aws_lambda_function.${resourceName}.arn`,
    });

    outputs.add('function_name', {
      description: 'Name of the Lambda function',
      value: `aws_lambda_function.${resourceName}.function_name`,
    });

    outputs.add('invoke_arn', {
      description: 'ARN to be used for invoking the Lambda function from API Gateway',
      value: `aws_lambda_function.${resourceName}.invoke_arn`,
    });

    outputs.add('qualified_arn', {
      description: 'Qualified ARN (ARN with version) of the Lambda function',
      value: `aws_lambda_function.${resourceName}.qualified_arn`,
    });

    outputs.add('version', {
      description: 'Latest published version of the Lambda function',
      value: `aws_lambda_function.${resourceName}.version`,
    });

    outputs.add('log_group_name', {
      description: 'CloudWatch Log Group name',
      value: `aws_cloudwatch_log_group.${resourceName}_logs.name`,
    });

    return outputs.toString();
  }

  protected getResourceOutputs(): ResourceOutput[] {
    return [
      { name: 'function_arn', type: 'string', description: 'Lambda Function ARN' },
      { name: 'function_name', type: 'string', description: 'Lambda Function Name' },
      { name: 'invoke_arn', type: 'string', description: 'Invoke ARN' },
      { name: 'qualified_arn', type: 'string', description: 'Qualified ARN' },
      { name: 'version', type: 'string', description: 'Function Version' },
      { name: 'log_group_name', type: 'string', description: 'Log Group Name' },
    ];
  }

  protected getEstimatedCost(node: LambdaFunctionNodeData): CostEstimate {
    // Lambda pricing is based on invocations and duration
    // Estimate based on 1M requests/month, 1s avg duration
    const memoryGB = (node.memorySize || 128) / 1024;
    const durationCost = memoryGB * 0.0000166667 * 1000000; // 1M invocations, 1s each
    const requestCost = 0.2; // $0.20 per 1M requests

    return {
      hourly: 0, // Pay per use
      monthly: durationCost + requestCost,
      currency: 'USD',
    };
  }

  /**
   * Get the IAM role reference
   */
  private getRoleReference(
    node: LambdaFunctionNodeData,
    context: GeneratorContext
  ): ReturnType<typeof hclExpr> {
    if (node.role) {
      const roleRef = this.getDependencyRef(node.role, context, 'arn');
      return hclExpr(roleRef);
    }
    return hclExpr('var.role_arn');
  }
}
