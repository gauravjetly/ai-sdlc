/**
 * EC2 Instance Generator
 *
 * Generates Terraform code for AWS EC2 Instances.
 * Terraform Resource: aws_instance
 */

import {
  BaseGenerator,
  GeneratorContext,
  ResourceOutput,
  CostEstimate,
  hclExpr,
} from '../../core';

// Import type from visual designer
import type { EC2InstanceNodeData } from '../../../../../webapp/src/components/visualDesigner/nodes/types/compute.types';

/**
 * EC2 Instance Generator
 */
export class EC2Generator extends BaseGenerator<EC2InstanceNodeData> {
  readonly terraformResourceType = 'aws_instance';
  readonly nodeServiceType = 'ec2-instance' as const;
  readonly category = 'compute' as const;

  protected generateMainTF(
    node: EC2InstanceNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const hcl = this.buildHCL();

    // Data source for latest Amazon Linux 2 AMI (if AMI not specified)
    if (!node.ami) {
      const amiData = hcl.data('aws_ami', 'amazon_linux_2');
      amiData.attribute('most_recent', true);
      amiData.attribute('owners', ['amazon']);
      amiData.block('filter', (b) => {
        b.attribute('name', 'name');
        b.attribute('values', ['amzn2-ami-hvm-*-x86_64-gp2']);
      });
      amiData.build();
    }

    // EC2 Instance resource
    const resource = hcl.resource('aws_instance', resourceName);

    // AMI - use variable or data source
    if (node.ami) {
      resource.attribute('ami', hclExpr('var.ami_id'));
    } else {
      resource.attribute('ami', hclExpr('data.aws_ami.amazon_linux_2.id'));
    }

    resource.attribute('instance_type', hclExpr('var.instance_type'));

    // Subnet
    if (node.subnetId) {
      const subnetRef = this.getDependencyRef(node.subnetId, context);
      resource.attribute('subnet_id', hclExpr(subnetRef));
    } else {
      resource.attribute('subnet_id', hclExpr('var.subnet_id'));
    }

    // Security groups
    if (node.securityGroupIds && node.securityGroupIds.length > 0) {
      const sgRefs = node.securityGroupIds.map((id) =>
        this.getDependencyRef(id, context)
      );
      resource.attribute(
        'vpc_security_group_ids',
        hclExpr(`[${sgRefs.join(', ')}]`)
      );
    } else {
      resource.attribute('vpc_security_group_ids', hclExpr('var.security_group_ids'));
    }

    // IAM Instance Profile
    if (node.iamInstanceProfile) {
      resource.attribute('iam_instance_profile', node.iamInstanceProfile);
    }

    // Key name
    if (node.keyName) {
      resource.attribute('key_name', hclExpr('var.key_name'));
    }

    // User data
    if (node.userData) {
      resource.attribute('user_data', hclExpr('var.user_data'));
    }

    // Root block device - with encryption enabled by default
    resource.block('root_block_device', (b) => {
      const root = node.rootBlockDevice;
      b.attribute('volume_size', root?.volumeSize || 8);
      b.attribute('volume_type', root?.volumeType || 'gp3');
      b.attribute('delete_on_termination', root?.deleteOnTermination !== false);
      b.attribute('encrypted', true); // Security default
      if (root?.kmsKeyId) {
        b.attribute('kms_key_id', root.kmsKeyId);
      }
      if (root?.iops && ['io1', 'io2', 'gp3'].includes(root.volumeType)) {
        b.attribute('iops', root.iops);
      }
      if (root?.throughput && root.volumeType === 'gp3') {
        b.attribute('throughput', root.throughput);
      }
    });

    // Additional EBS volumes
    if (node.additionalVolumes && node.additionalVolumes.length > 0) {
      for (const vol of node.additionalVolumes) {
        resource.block('ebs_block_device', (b) => {
          b.attribute('device_name', vol.deviceName);
          b.attribute('volume_size', vol.volumeSize);
          b.attribute('volume_type', vol.volumeType || 'gp3');
          b.attribute('delete_on_termination', vol.deleteOnTermination !== false);
          b.attribute('encrypted', true); // Security default
          if (vol.kmsKeyId) {
            b.attribute('kms_key_id', vol.kmsKeyId);
          }
        });
      }
    }

    // Monitoring
    resource.attribute('monitoring', node.monitoring || false);

    // Public IP
    resource.attribute(
      'associate_public_ip_address',
      node.associatePublicIpAddress || false
    );

    // EBS optimized
    resource.attribute('ebs_optimized', node.ebsOptimized || false);

    // Metadata options (IMDSv2 for security)
    resource.block('metadata_options', (b) => {
      b.attribute('http_endpoint', 'enabled');
      b.attribute('http_tokens', 'required'); // IMDSv2 only
      b.attribute('http_put_response_hop_limit', 1);
    });

    // Tags
    resource.tags({
      Name: node.name,
      Category: 'compute',
    });

    // Lifecycle
    resource.lifecycle({
      ignoreChanges: ['ami'],
    });

    resource.build();
    return hcl.toString();
  }

  protected generateVariablesTF(
    node: EC2InstanceNodeData,
    context: GeneratorContext
  ): string {
    const vars = this.buildVariable();

    if (node.ami) {
      vars.string('ami_id', 'AMI ID for the EC2 instance', node.ami);
    }

    vars.string('instance_type', 'EC2 instance type', node.instanceType || 't3.micro');

    if (!node.subnetId) {
      vars.string('subnet_id', 'Subnet ID for the EC2 instance');
    }

    if (!node.securityGroupIds || node.securityGroupIds.length === 0) {
      vars.listString('security_group_ids', 'Security group IDs for the EC2 instance', []);
    }

    if (node.keyName) {
      vars.string('key_name', 'SSH key pair name', node.keyName);
    }

    if (node.userData) {
      vars.add('user_data', {
        type: 'string',
        description: 'User data script for EC2 instance',
        default: node.userData,
      });
    }

    vars.number('root_volume_size', 'Size of root volume in GB', node.rootBlockDevice?.volumeSize || 8);

    vars.string('root_volume_type', 'Type of root volume', node.rootBlockDevice?.volumeType || 'gp3');

    vars.bool('enable_monitoring', 'Enable detailed monitoring', node.monitoring || false);

    vars.commonTags();

    return vars.toString();
  }

  protected generateOutputsTF(
    node: EC2InstanceNodeData,
    context: GeneratorContext
  ): string {
    const resourceName = this.sanitizeResourceName(node.name);
    const outputs = this.buildOutput();

    outputs.add('instance_id', {
      description: 'ID of the EC2 instance',
      value: `aws_instance.${resourceName}.id`,
    });

    outputs.add('instance_arn', {
      description: 'ARN of the EC2 instance',
      value: `aws_instance.${resourceName}.arn`,
    });

    outputs.add('private_ip', {
      description: 'Private IP address of the EC2 instance',
      value: `aws_instance.${resourceName}.private_ip`,
    });

    outputs.add('public_ip', {
      description: 'Public IP address of the EC2 instance (if assigned)',
      value: `aws_instance.${resourceName}.public_ip`,
    });

    outputs.add('private_dns', {
      description: 'Private DNS name of the EC2 instance',
      value: `aws_instance.${resourceName}.private_dns`,
    });

    outputs.add('public_dns', {
      description: 'Public DNS name of the EC2 instance (if assigned)',
      value: `aws_instance.${resourceName}.public_dns`,
    });

    return outputs.toString();
  }

  protected getResourceOutputs(): ResourceOutput[] {
    return [
      { name: 'instance_id', type: 'string', description: 'EC2 Instance ID' },
      { name: 'instance_arn', type: 'string', description: 'EC2 Instance ARN' },
      { name: 'private_ip', type: 'string', description: 'Private IP Address' },
      { name: 'public_ip', type: 'string', description: 'Public IP Address' },
      { name: 'private_dns', type: 'string', description: 'Private DNS Name' },
      { name: 'public_dns', type: 'string', description: 'Public DNS Name' },
    ];
  }

  protected getEstimatedCost(node: EC2InstanceNodeData): CostEstimate {
    // Basic cost estimate based on instance type
    const instanceCosts: Record<string, number> = {
      't3.micro': 0.0104,
      't3.small': 0.0208,
      't3.medium': 0.0416,
      't3.large': 0.0832,
      't3.xlarge': 0.1664,
      'm5.large': 0.096,
      'm5.xlarge': 0.192,
      'c5.large': 0.085,
      'r5.large': 0.126,
    };

    const hourly = instanceCosts[node.instanceType] || 0.05;

    return {
      hourly,
      monthly: hourly * 730,
      currency: 'USD',
    };
  }
}
