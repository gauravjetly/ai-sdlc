# AWS SDK v3 Integration Guide

## Overview

The AWS adapter now uses real AWS SDK v3 to provision actual cloud resources. This enables production-grade infrastructure automation with full AWS service integration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [AWS Credentials Setup](#aws-credentials-setup)
- [IAM Permissions Required](#iam-permissions-required)
- [Usage Examples](#usage-examples)
- [Resource Details](#resource-details)
- [Cost Management](#cost-management)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

---

## Prerequisites

### 1. AWS Account
- Active AWS account with billing enabled
- Access to create IAM users/roles
- Sufficient service quotas for resources

### 2. AWS CLI (Recommended)
```bash
# Install AWS CLI
brew install awscli  # macOS
# or download from https://aws.amazon.com/cli/

# Verify installation
aws --version
```

### 3. Node.js Dependencies
All AWS SDK v3 packages are installed automatically:
- @aws-sdk/client-ec2
- @aws-sdk/client-eks
- @aws-sdk/client-rds
- @aws-sdk/client-s3
- @aws-sdk/client-sts
- @aws-sdk/client-iam

---

## AWS Credentials Setup

### Method 1: Environment Variables (Recommended for CI/CD)

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### Method 2: AWS CLI Profile

```bash
# Configure AWS CLI
aws configure --profile ai-platform

# Set profile in environment
export AWS_PROFILE=ai-platform
```

### Method 3: IAM Instance Profile (For EC2)

When running on EC2, the adapter automatically uses the instance profile. No configuration needed.

### Method 4: Explicit Credentials in Code

```typescript
import { AwsAdapter } from './cloud-abstraction/adapters/aws-adapter';

const adapter = new AwsAdapter();

await adapter.connect({
  provider: 'aws',
  credentials: {
    region: 'us-east-1',
    access_key_id: process.env.AWS_ACCESS_KEY_ID,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY
  }
});
```

---

## IAM Permissions Required

### Minimum IAM Policy

Create an IAM user with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVpc",
        "ec2:DescribeVpcs",
        "ec2:DeleteVpc",
        "ec2:ModifyVpcAttribute",
        "ec2:CreateSubnet",
        "ec2:DescribeSubnets",
        "ec2:DeleteSubnet",
        "ec2:CreateInternetGateway",
        "ec2:AttachInternetGateway",
        "ec2:DetachInternetGateway",
        "ec2:DeleteInternetGateway",
        "ec2:CreateRouteTable",
        "ec2:DescribeRouteTables",
        "ec2:DeleteRouteTable",
        "ec2:CreateRoute",
        "ec2:AssociateRouteTable",
        "ec2:CreateTags",
        "ec2:DescribeTags"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "eks:CreateCluster",
        "eks:DescribeCluster",
        "eks:DeleteCluster",
        "eks:CreateNodegroup",
        "eks:DescribeNodegroup",
        "eks:DeleteNodegroup",
        "eks:ListNodegroups",
        "eks:TagResource"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:CreateDBInstance",
        "rds:DescribeDBInstances",
        "rds:DeleteDBInstance",
        "rds:AddTagsToResource"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:HeadBucket",
        "s3:DeleteBucket",
        "s3:ListBucket",
        "s3:DeleteObject",
        "s3:PutBucketVersioning",
        "s3:PutBucketEncryption",
        "s3:PutPublicAccessBlock",
        "s3:PutBucketTagging"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:GetRole",
        "iam:AttachRolePolicy",
        "iam:PassRole",
        "iam:TagRole"
      ],
      "Resource": [
        "arn:aws:iam::*:role/ai-platform-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

### Creating IAM User

```bash
# Create IAM user
aws iam create-user --user-name ai-platform-automation

# Attach policy (create policy first from JSON above)
aws iam attach-user-policy \
  --user-name ai-platform-automation \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT:policy/AIPlatformAutomation

# Create access key
aws iam create-access-key --user-name ai-platform-automation
```

---

## Usage Examples

### 1. Create VPC with Subnets

```typescript
import { AwsAdapter } from './cloud-abstraction/adapters/aws-adapter';

const adapter = new AwsAdapter();

// Connect
await adapter.connect({
  provider: 'aws',
  credentials: { region: 'us-east-1' }
});

// Create VPC
const vpc = await adapter.createVirtualNetwork({
  name: 'my-app-vpc',
  cidr: '10.0.0.0/16',
  region: 'us-east-1',
  dns_enabled: true,
  enable_flow_logs: true,
  tags: {
    'Environment': 'production',
    'Project': 'my-app'
  }
});

console.log(`VPC Created: ${vpc.id}`);
console.log(`Subnets:`, vpc.metadata.subnets);
```

**Created Resources:**
- VPC with DNS enabled
- Public subnet (10.0.0.0/24)
- Private subnet (10.0.1.0/24)
- Internet Gateway
- Route tables

**Estimated Cost:** ~$10/month

---

### 2. Create EKS Cluster

```typescript
// Requires VPC to be created first

const cluster = await adapter.createKubernetesCluster({
  name: 'my-app-cluster',
  version: '1.28',
  network: 'my-app-vpc',  // Reference to VPC created above
  node_count: 3,
  instance_type: 'small_compute',  // t3.medium
  enable_autoscaling: true,
  min_nodes: 2,
  max_nodes: 10,
  enable_logging: true
});

console.log(`Cluster Created: ${cluster.id}`);
console.log(`Endpoint: ${cluster.metadata.endpoint}`);
```

**Created Resources:**
- EKS control plane
- Node group with EC2 instances
- IAM roles (cluster and node)
- Security groups

**Estimated Cost:** ~$220/month
- EKS control plane: $73/month
- 3x t3.medium nodes: ~$150/month

**Creation Time:** 15-20 minutes

---

### 3. Create RDS Database

```typescript
const database = await adapter.createManagedDatabase({
  name: 'myappdb',
  engine: 'postgresql',
  version: '15.4',
  instance_class: 'small_db',  // db.t3.micro
  storage_size_gb: 20,
  network: 'my-app-vpc',
  high_availability: false,
  backup_retention_days: 7,
  encryption_enabled: true
});

console.log(`Database Created: ${database.id}`);
console.log(`Endpoint: ${database.metadata.endpoint}:${database.metadata.port}`);
```

**Created Resources:**
- RDS PostgreSQL instance
- Automated backups
- Encrypted storage

**Estimated Cost:** ~$16/month (db.t3.micro)

**Creation Time:** 5-10 minutes

---

### 4. Create S3 Bucket

```typescript
const bucket = await adapter.createObjectStorage({
  name: 'my-app-data-2024',
  versioning_enabled: true,
  encryption_enabled: true,
  public_access_blocked: true
});

console.log(`Bucket Created: ${bucket.id}`);
console.log(`URL: ${bucket.metadata.url}`);
```

**Created Resources:**
- S3 bucket with encryption
- Versioning enabled
- Public access blocked

**Estimated Cost:** Storage-based ($0.023/GB/month)

**Creation Time:** < 1 minute

---

## Resource Details

### VPC (Virtual Private Cloud)

**What Gets Created:**
- 1 VPC with specified CIDR
- 2 Subnets (public and private)
- 1 Internet Gateway
- Route tables and associations

**Resource IDs:**
- VPC: `vpc-xxxxxxxxx`
- Subnets: `subnet-xxxxxxxxx`
- IGW: `igw-xxxxxxxxx`

**Cleanup:**
```typescript
await adapter.deleteVirtualNetwork(vpcId);
```

---

### EKS (Elastic Kubernetes Service)

**What Gets Created:**
- EKS control plane
- Node group with EC2 instances
- IAM roles: `ai-platform-eks-cluster-role`, `ai-platform-eks-node-role`
- Security groups
- Auto-scaling configuration

**Resource IDs:**
- Cluster: cluster name
- Node group: `{cluster-name}-nodes`

**Important Notes:**
- Creation takes 15-20 minutes
- Deletion takes 10-15 minutes
- Node group must be deleted before cluster

**Cleanup:**
```typescript
await adapter.deleteKubernetesCluster(clusterName);
```

---

### RDS (Relational Database Service)

**What Gets Created:**
- DB instance
- Automated backups
- Encrypted storage
- Monitoring

**Resource IDs:**
- DB Instance: instance identifier

**Important Notes:**
- Creation takes 5-10 minutes
- Final snapshot created on deletion (can be disabled)
- Password auto-generated (20 characters)

**Cleanup:**
```typescript
await adapter.deleteManagedDatabase(dbInstanceId);
```

---

### S3 (Simple Storage Service)

**What Gets Created:**
- Bucket with encryption
- Versioning (if enabled)
- Public access block

**Resource IDs:**
- Bucket: bucket name (globally unique)

**Important Notes:**
- Bucket must be empty before deletion
- Bucket names are globally unique across all AWS

**Cleanup:**
```typescript
await adapter.deleteObjectStorage(bucketName);
```

---

## Cost Management

### Cost Tracking

All resources are tagged with:
```yaml
ManagedBy: ai-platform
CreatedAt: ISO timestamp
Environment: [as specified]
Project: [as specified]
```

### Cost Breakdown

| Resource | Type | Est. Monthly Cost |
|----------|------|------------------|
| VPC | Free | $0 |
| Subnets | Free | $0 |
| Internet Gateway | Free | $0 |
| NAT Gateway | Optional | ~$32/month |
| EKS Control Plane | Per cluster | $73/month |
| EKS Node (t3.medium) | Per node | ~$30/month |
| RDS db.t3.micro | PostgreSQL | ~$16/month |
| RDS db.t3.medium | PostgreSQL | ~$68/month |
| S3 Storage | Per GB | $0.023/GB/month |
| Data Transfer | Per GB | $0.09/GB (out) |

### Cost Optimization Tips

1. **Use Smaller Instance Types for Testing**
   ```typescript
   instance_type: 'small_compute'  // t3.medium instead of m5.large
   instance_class: 'small_db'      // db.t3.micro instead of db.r5.large
   ```

2. **Enable Auto-scaling**
   ```typescript
   enable_autoscaling: true,
   min_nodes: 2,
   max_nodes: 10
   ```

3. **Clean Up Test Resources**
   ```bash
   # List all resources
   aws resourcegroupstaggingapi get-resources \
     --tag-filters Key=ManagedBy,Values=ai-platform

   # Delete via platform
   platform destroy <resource-id>
   ```

4. **Use Budget Alerts**
   ```bash
   aws budgets create-budget \
     --account-id YOUR_ACCOUNT \
     --budget file://budget.json
   ```

---

## Troubleshooting

### Issue: "AccessDenied" or "UnauthorizedOperation"

**Solution:** Check IAM permissions
```bash
# Verify your identity
aws sts get-caller-identity

# Test specific permission
aws ec2 describe-vpcs --dry-run
```

---

### Issue: "ThrottlingException"

**Solution:** AWS API rate limits hit. The adapter includes retry logic, but you can:
```bash
# Reduce parallel operations
# Wait a few minutes and retry
```

---

### Issue: VPC Deletion Fails

**Solution:** Delete dependent resources first
```bash
# Check for dependencies
aws ec2 describe-vpcs --vpc-ids vpc-xxx

# Order of deletion:
# 1. EKS clusters in VPC
# 2. RDS instances in VPC
# 3. EC2 instances in VPC
# 4. Subnets
# 5. Internet Gateway
# 6. VPC
```

---

### Issue: EKS Cluster Creation Hangs

**Solution:**
- Check CloudFormation console for stack events
- Ensure IAM roles exist and have correct trust relationships
- Verify subnet IDs are valid
- Check service quotas for EKS

```bash
# Check EKS cluster status
aws eks describe-cluster --name my-cluster

# Check CloudFormation
aws cloudformation describe-stacks --stack-name eksctl-my-cluster-cluster
```

---

### Issue: S3 Bucket Name Already Exists

**Solution:** S3 bucket names are globally unique
```typescript
// Add timestamp or random suffix
const bucketName = `my-app-data-${Date.now()}`;
```

---

### Issue: RDS Creation Fails with "InvalidParameterValue"

**Solution:** Check engine version and instance class compatibility
```bash
# List available engine versions
aws rds describe-db-engine-versions --engine postgresql

# List available instance classes
aws rds describe-orderable-db-instance-options \
  --engine postgresql \
  --engine-version 15.4
```

---

## Security Best Practices

### 1. Never Commit Credentials

```bash
# Add to .gitignore
.env
.aws/
credentials.json
*.pem
*.key
```

### 2. Use IAM Roles Instead of Access Keys

When possible, use IAM roles:
- EC2 instance profiles
- ECS task roles
- Lambda execution roles

### 3. Enable Encryption

All resources created with encryption enabled by default:
- S3: AES-256 encryption
- RDS: Storage encryption
- EBS: Volume encryption

### 4. Enable Logging and Monitoring

```typescript
// VPC Flow Logs
enable_flow_logs: true

// EKS Control Plane Logging
enable_logging: true

// RDS Enhanced Monitoring
enable_monitoring: true
```

### 5. Use Least Privilege IAM Policies

Only grant permissions needed for your use case.

### 6. Enable MFA for IAM Users

```bash
aws iam enable-mfa-device \
  --user-name ai-platform-automation \
  --serial-number arn:aws:iam::ACCOUNT:mfa/USER \
  --authentication-code1 123456 \
  --authentication-code2 789012
```

### 7. Regular Security Audits

```bash
# Check for public S3 buckets
aws s3api list-buckets --query 'Buckets[*].Name' | \
  xargs -I {} aws s3api get-bucket-acl --bucket {}

# Review IAM policies
aws iam list-policies --scope Local
```

---

## Advanced Features

### Custom VPC Configuration

```typescript
const vpc = await adapter.createVirtualNetwork({
  name: 'custom-vpc',
  cidr: '172.16.0.0/16',
  region: 'us-west-2',
  dns_enabled: true,
  enable_flow_logs: true,
  tags: {
    'CostCenter': 'engineering',
    'Team': 'platform'
  }
});
```

### Multi-AZ RDS Setup

```typescript
const database = await adapter.createManagedDatabase({
  name: 'production-db',
  engine: 'postgresql',
  version: '15.4',
  instance_class: 'large_db',  // db.r5.large
  storage_size_gb: 100,
  network: 'production-vpc',
  high_availability: true,      // Multi-AZ
  backup_retention_days: 30,
  encryption_enabled: true
});
```

### EKS with Auto-scaling

```typescript
const cluster = await adapter.createKubernetesCluster({
  name: 'production-cluster',
  version: '1.28',
  network: 'production-vpc',
  node_count: 5,
  instance_type: 'medium_compute',  // m5.xlarge
  enable_autoscaling: true,
  min_nodes: 3,
  max_nodes: 20,
  enable_logging: true,
  enable_monitoring: true
});
```

---

## Testing

### Running Integration Tests

```bash
# Set environment variable
export AWS_INTEGRATION_TEST=true
export AWS_TEST_REGION=us-east-1

# Run tests
npm run test:integration

# WARNING: This creates real resources and incurs costs!
```

### Test Cleanup

Tests automatically clean up resources, but if cleanup fails:

```bash
# Manual cleanup
aws eks delete-cluster --name ai-platform-test-eks
aws rds delete-db-instance --db-instance-identifier aiplatformtestdb --skip-final-snapshot
aws s3 rb s3://ai-platform-test-bucket --force
aws ec2 delete-vpc --vpc-id vpc-xxx
```

---

## Support and Resources

- **AWS Documentation:** https://docs.aws.amazon.com/
- **AWS SDK for JavaScript:** https://docs.aws.amazon.com/sdk-for-javascript/v3/
- **AWS Service Quotas:** https://console.aws.amazon.com/servicequotas/
- **AWS Pricing Calculator:** https://calculator.aws/
- **AWS Support:** https://console.aws.amazon.com/support/

---

## Changelog

### v1.0.0 (2024-01-29)
- Initial AWS SDK v3 integration
- Support for VPC, EKS, RDS, S3
- Comprehensive error handling
- Resource tagging and cost tracking
- Integration tests
- Full documentation
