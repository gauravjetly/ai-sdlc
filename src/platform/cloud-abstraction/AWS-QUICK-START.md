# AWS SDK Integration - Quick Start Guide

## 1-Minute Setup

### Install Dependencies (Already Done)
```bash
npm install  # All AWS SDK packages included
```

### Configure AWS Credentials
```bash
# Method 1: Environment Variables
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_DEFAULT_REGION="us-east-1"

# Method 2: AWS CLI
aws configure
```

---

## Basic Usage

### Import and Connect
```typescript
import { AwsAdapter } from './cloud-abstraction/adapters/aws-adapter';

const adapter = new AwsAdapter();
await adapter.connect({
  provider: 'aws',
  credentials: { region: 'us-east-1' }
});
```

---

## Create Resources (Copy-Paste Examples)

### 1. Create VPC (~2 minutes)
```typescript
const vpc = await adapter.createVirtualNetwork({
  name: 'my-app-vpc',
  cidr: '10.0.0.0/16',
  region: 'us-east-1'
});
console.log(`VPC ID: ${vpc.id}`);
```

**Cost:** Free (VPC and subnets are free)

---

### 2. Create S3 Bucket (~10 seconds)
```typescript
const bucket = await adapter.createObjectStorage({
  name: `my-app-data-${Date.now()}`,  // Must be globally unique
  versioning_enabled: true,
  encryption_enabled: true
});
console.log(`Bucket: ${bucket.id}`);
```

**Cost:** $0.023 per GB per month

---

### 3. Create RDS Database (~5-10 minutes)
```typescript
const database = await adapter.createManagedDatabase({
  name: 'myappdb',
  engine: 'postgresql',
  version: '15.4',
  instance_class: 'small_db',  // db.t3.micro
  storage_size_gb: 20,
  network: 'my-app-vpc',
  encryption_enabled: true
});
console.log(`Endpoint: ${database.metadata.endpoint}:${database.metadata.port}`);
```

**Cost:** ~$16/month for db.t3.micro

---

### 4. Create EKS Cluster (~15-20 minutes)
```typescript
const cluster = await adapter.createKubernetesCluster({
  name: 'my-cluster',
  version: '1.28',
  network: 'my-app-vpc',
  node_count: 3,
  instance_type: 'small_compute',  // t3.medium
  enable_autoscaling: true,
  min_nodes: 2,
  max_nodes: 10
});
console.log(`Endpoint: ${cluster.metadata.endpoint}`);
```

**Cost:** $73/month (control plane) + ~$90/month (3 t3.medium nodes) = $163/month

---

## Check Status

```typescript
// VPC
const vpcStatus = await adapter.getVirtualNetworkStatus(vpc.id);

// S3
const bucketStatus = await adapter.getObjectStorageStatus(bucket.id);

// RDS
const dbStatus = await adapter.getManagedDatabaseStatus(database.id);

// EKS
const clusterStatus = await adapter.getKubernetesClusterStatus(cluster.id);
```

---

## Delete Resources (Important!)

```typescript
// Delete in reverse order of dependencies
await adapter.deleteKubernetesCluster(cluster.id);  // 10-15 mins
await adapter.deleteManagedDatabase(database.id);   // 5-10 mins
await adapter.deleteObjectStorage(bucket.id);       // <1 min
await adapter.deleteVirtualNetwork(vpc.id);         // ~1 min
```

---

## Common Errors and Solutions

### Error: "AccessDenied"
**Solution:** Check IAM permissions
```bash
aws sts get-caller-identity  # Verify credentials work
```

### Error: "Bucket name already exists"
**Solution:** S3 bucket names are globally unique
```typescript
name: `my-app-${Date.now()}`  // Add timestamp
```

### Error: "VPC deletion failed"
**Solution:** Delete dependent resources first
```bash
# Order: EKS → RDS → S3 → VPC
```

---

## Instance Type Mappings

| Normalized | AWS Type | Use Case | Cost/Month |
|------------|----------|----------|------------|
| `small_compute` | t3.medium | Dev/Test | ~$30 |
| `medium_compute` | m5.xlarge | Production | ~$140 |
| `small_db` | db.t3.micro | Dev | ~$16 |
| `medium_db` | db.t3.medium | Staging | ~$68 |

---

## Testing

```bash
# Set environment variable
export AWS_INTEGRATION_TEST=true

# Run tests (WARNING: Creates real resources, costs $10-50)
npm run test:integration
```

---

## Cost Tracking

All resources are tagged with:
```yaml
ManagedBy: ai-platform
CreatedAt: <timestamp>
```

View costs in AWS Cost Explorer filtered by tag.

---

## Need More Help?

- **Full Documentation:** `docs/AWS-INTEGRATION.md`
- **Examples:** `tests/integration/aws-adapter.test.ts`
- **Configuration:** `config/aws.yaml`
- **AWS Docs:** https://docs.aws.amazon.com/

---

## Complete Example (15-Minute Stack)

```typescript
import { AwsAdapter } from './cloud-abstraction/adapters/aws-adapter';

async function deployStack() {
  const adapter = new AwsAdapter();

  // Connect
  await adapter.connect({
    provider: 'aws',
    credentials: { region: 'us-east-1' }
  });

  try {
    // 1. Create VPC
    console.log('Creating VPC...');
    const vpc = await adapter.createVirtualNetwork({
      name: 'demo-vpc',
      cidr: '10.0.0.0/16',
      region: 'us-east-1'
    });
    console.log(`✓ VPC: ${vpc.id}`);

    // 2. Create S3 Bucket
    console.log('Creating S3 bucket...');
    const bucket = await adapter.createObjectStorage({
      name: `demo-bucket-${Date.now()}`
    });
    console.log(`✓ Bucket: ${bucket.id}`);

    // 3. Create RDS Database
    console.log('Creating database (5-10 mins)...');
    const database = await adapter.createManagedDatabase({
      name: 'demodb',
      engine: 'postgresql',
      version: '15.4',
      instance_class: 'small_db',
      storage_size_gb: 20,
      network: 'demo-vpc'
    });
    console.log(`✓ Database: ${database.metadata.endpoint}`);

    console.log('\nStack deployed successfully!');
    console.log('Resources created:', { vpc, bucket, database });

    // REMEMBER TO CLEAN UP
    console.log('\nTo clean up:');
    console.log(`await adapter.deleteManagedDatabase("${database.id}")`);
    console.log(`await adapter.deleteObjectStorage("${bucket.id}")`);
    console.log(`await adapter.deleteVirtualNetwork("${vpc.id}")`);

  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}

// Run it
deployStack();
```

---

## Minimum IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ec2:CreateVpc",
      "ec2:CreateSubnet",
      "s3:CreateBucket",
      "rds:CreateDBInstance",
      "eks:CreateCluster"
    ],
    "Resource": "*"
  }]
}
```

See `docs/AWS-INTEGRATION.md` for complete policy.

---

**Ready to deploy? Start with VPC and S3 (free/cheap) before EKS/RDS (expensive)!**
