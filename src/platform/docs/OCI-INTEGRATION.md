# OCI (Oracle Cloud Infrastructure) Integration Guide

Complete guide for deploying to Oracle Cloud Infrastructure with full AWS feature parity.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Authentication Setup](#authentication-setup)
3. [Quick Start](#quick-start)
4. [Feature Parity with AWS](#feature-parity-with-aws)
5. [OCI vs AWS Mapping](#oci-vs-aws-mapping)
6. [Configuration](#configuration)
7. [IAM Policies Required](#iam-policies-required)
8. [Cost Management](#cost-management)
9. [Troubleshooting](#troubleshooting)
10. [Examples](#examples)

---

## Prerequisites

### Software Requirements
- Node.js >= 18.0.0
- OCI CLI (optional but recommended)
- kubectl (for Kubernetes operations)

### OCI Account Requirements
- Active OCI account with valid subscription
- Access to a compartment with appropriate permissions
- API signing key configured

### Installation

```bash
# Install OCI CLI (optional)
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Verify installation
oci --version
```

---

## Authentication Setup

### Step 1: Generate API Signing Key

```bash
# Create .oci directory
mkdir -p ~/.oci

# Generate RSA key pair
openssl genrsa -out ~/.oci/oci_api_key.pem 2048

# Generate public key
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem

# Set proper permissions
chmod 600 ~/.oci/oci_api_key.pem
chmod 644 ~/.oci/oci_api_key_public.pem
```

### Step 2: Add Public Key to OCI

1. Log in to OCI Console: https://cloud.oracle.com
2. Navigate to: **Profile Icon > User Settings**
3. Under **Resources**, click **API Keys**
4. Click **Add API Key**
5. Select **Paste Public Key**
6. Copy contents of `~/.oci/oci_api_key_public.pem` and paste
7. Click **Add**
8. **IMPORTANT**: Copy the configuration file preview shown

### Step 3: Create OCI Config File

Create or edit `~/.oci/config`:

```ini
[DEFAULT]
user=ocid1.user.oc1..aaaaaaaabcdefghijklmnopqrstuvwxyz123456
fingerprint=ab:cd:ef:12:34:56:78:90:ab:cd:ef:12:34:56:78:90
tenancy=ocid1.tenancy.oc1..aaaaaaaabcdefghijklmnopqrstuvwxyz123456
region=us-ashburn-1
key_file=~/.oci/oci_api_key.pem
```

**Replace with your actual values from Step 2!**

### Step 4: Get Your Compartment OCID

```bash
# List all compartments
oci iam compartment list --all

# Or via OCI Console:
# Identity & Security > Compartments > Click your compartment > Copy OCID
```

### Step 5: Verify Configuration

```bash
# Test OCI CLI
oci iam region list

# Expected output: List of OCI regions
```

---

## Quick Start

### 1. Create a Simple Workflow (OCI)

Create `workflow-oci-hello-world.yaml`:

```yaml
workflow:
  name: hello-world-oci
  target_cloud: oci  # 👈 Changed from 'aws' to 'oci'
  region: us-ashburn-1

  resources:
    - type: virtual_network
      name: my-network
      cidr: 10.0.0.0/16

    - type: kubernetes_cluster
      name: my-cluster
      version: v1.28.2
      network: my-network
      node_count: 2
      instance_type: small_compute

    - type: container_deployment
      name: hello-app
      cluster: my-cluster
      image: nginx:latest
      replicas: 3
      port: 80
```

### 2. Set Environment Variables

```bash
export OCI_COMPARTMENT_ID="ocid1.compartment.oc1..your-compartment-ocid"
```

### 3. Deploy to OCI

```bash
# Navigate to platform directory
cd src/platform

# Install dependencies (if not done)
npm install

# Deploy workflow
npm run build
node dist/cli/platform-cli.js deploy workflow-oci-hello-world.yaml
```

### 4. Verify Deployment

```bash
# Check resources in OCI Console
# Or use OCI CLI:
oci network vcn list --compartment-id $OCI_COMPARTMENT_ID
oci ce cluster list --compartment-id $OCI_COMPARTMENT_ID
```

---

## Feature Parity with AWS

The OCI adapter provides 100% feature parity with the AWS adapter:

| Feature | AWS | OCI | Status |
|---------|-----|-----|--------|
| Virtual Networks | VPC | VCN | ✅ |
| Kubernetes | EKS | OKE | ✅ |
| Managed Database | RDS | Autonomous DB | ✅ |
| Object Storage | S3 | Object Storage | ✅ |
| Container Deployment | EKS + kubectl | OKE + kubectl | ✅ |
| Auto-scaling | ✅ | ✅ | ✅ |
| High Availability | ✅ | ✅ | ✅ |
| Encryption | ✅ | ✅ | ✅ |
| Monitoring | CloudWatch | OCI Monitoring | ✅ |
| IAM | IAM | IAM | ✅ |

### Validate Feature Parity

```typescript
import { FeatureParityValidator } from './utils/feature-parity-validator';
import { AwsAdapter } from './adapters/aws-adapter';
import { OciAdapter } from './adapters/oci-adapter';

const awsAdapter = new AwsAdapter();
const ociAdapter = new OciAdapter();

const report = FeatureParityValidator.validateParity(awsAdapter, ociAdapter);
console.log(FeatureParityValidator.generateReport(report));
```

---

## OCI vs AWS Mapping

### Instance Types

| Generic Type | AWS | OCI | Notes |
|-------------|-----|-----|-------|
| `small_compute` | `t3.medium` | `VM.Standard.E4.Flex` | 1 OCPU, 16GB RAM |
| `medium_compute` | `m5.xlarge` | `VM.Standard2.4` | 4 OCPUs, 60GB RAM |
| `large_compute` | `m5.4xlarge` | `VM.Standard2.8` | 8 OCPUs, 120GB RAM |
| `xlarge_compute` | `m5.12xlarge` | `VM.Standard2.16` | 16 OCPUs, 240GB RAM |
| `small_memory_optimized` | `r5.large` | `VM.Standard.E3.Flex` | Memory optimized |
| `medium_memory_optimized` | `r5.2xlarge` | `VM.Optimized3.Flex` | Memory optimized |
| `gpu_compute` | `p3.2xlarge` | `VM.GPU3.1` | GPU instance |

**Note**: 1 OCPU ≈ 2 vCPUs (AWS)

### Database Classes

| Generic Class | AWS | OCI | Notes |
|--------------|-----|-----|-------|
| `small_db` | `db.t3.small` | 1 OCPU | 20GB storage |
| `medium_db` | `db.t3.medium` | 2 OCPUs | 50GB storage |
| `large_db` | `db.m5.large` | 4 OCPUs | 100GB storage |
| `xlarge_db` | `db.m5.xlarge` | 8 OCPUs | 200GB storage |

### Kubernetes Versions

| AWS EKS | OCI OKE |
|---------|---------|
| 1.28.x | v1.28.2 |
| 1.27.x | v1.27.2 |
| 1.26.x | v1.26.2 |

### Networking

| AWS | OCI | Purpose |
|-----|-----|---------|
| VPC | VCN | Virtual network |
| Subnet | Subnet | Network subdivision |
| Internet Gateway | Internet Gateway | Internet access |
| NAT Gateway | NAT Gateway | Outbound internet |
| Route Table | Route Table | Traffic routing |
| Security Group | Security List | Firewall rules |

### Regions

| AWS Region | OCI Region | Location |
|------------|------------|----------|
| `us-east-1` | `us-ashburn-1` | US East (Virginia / Ashburn) |
| `us-west-1` | `us-phoenix-1` | US West (N. California / Phoenix) |
| `eu-west-1` | `eu-frankfurt-1` | Europe (Ireland / Frankfurt) |
| `ap-northeast-1` | `ap-tokyo-1` | Asia Pacific (Tokyo) |

---

## Configuration

### Environment Variables

```bash
# Required
export OCI_COMPARTMENT_ID="ocid1.compartment.oc1..your-ocid"

# Optional (if not using default profile)
export OCI_PROFILE="MY_PROFILE"
export OCI_CONFIG_FILE="/custom/path/to/config"
```

### OCI Config File (~/.oci/config)

```ini
[DEFAULT]
user=ocid1.user.oc1..your-user-ocid
fingerprint=your:api:key:fingerprint
tenancy=ocid1.tenancy.oc1..your-tenancy-ocid
region=us-ashburn-1
key_file=~/.oci/oci_api_key.pem

[PRODUCTION]
user=ocid1.user.oc1..prod-user-ocid
fingerprint=prod:fingerprint
tenancy=ocid1.tenancy.oc1..prod-tenancy-ocid
region=eu-frankfurt-1
key_file=~/.oci/oci_api_key_prod.pem
```

### Workflow Configuration

```yaml
workflow:
  name: my-app
  target_cloud: oci
  region: us-ashburn-1

  # OCI-specific settings (optional)
  oci:
    compartment_id: ocid1.compartment.oc1..your-ocid
    profile: DEFAULT

  resources:
    # ... your resources
```

---

## IAM Policies Required

### Minimum Policies for Platform Operations

Create a policy in your compartment with these statements:

```
Allow group PlatformUsers to manage virtual-network-family in compartment MyCompartment
Allow group PlatformUsers to manage cluster-family in compartment MyCompartment
Allow group PlatformUsers to manage autonomous-database-family in compartment MyCompartment
Allow group PlatformUsers to manage object-family in compartment MyCompartment
Allow group PlatformUsers to read all-resources in compartment MyCompartment
Allow group PlatformUsers to use tag-namespaces in compartment MyCompartment
```

### Detailed Permissions by Resource

#### Virtual Networks (VCN)
```
Allow group PlatformUsers to manage vcns in compartment MyCompartment
Allow group PlatformUsers to manage subnets in compartment MyCompartment
Allow group PlatformUsers to manage internet-gateways in compartment MyCompartment
Allow group PlatformUsers to manage route-tables in compartment MyCompartment
Allow group PlatformUsers to manage security-lists in compartment MyCompartment
```

#### Kubernetes (OKE)
```
Allow group PlatformUsers to manage cluster-family in compartment MyCompartment
Allow group PlatformUsers to manage instance-family in compartment MyCompartment
Allow group PlatformUsers to use vnics in compartment MyCompartment
Allow group PlatformUsers to use subnets in compartment MyCompartment
Allow group PlatformUsers to use network-security-groups in compartment MyCompartment
```

#### Autonomous Database
```
Allow group PlatformUsers to manage autonomous-database-family in compartment MyCompartment
Allow group PlatformUsers to use virtual-network-family in compartment MyCompartment
```

#### Object Storage
```
Allow group PlatformUsers to manage buckets in compartment MyCompartment
Allow group PlatformUsers to manage objects in compartment MyCompartment
```

---

## Cost Management

### Estimated Costs (USD/month)

| Resource | Spec | Cost (approx.) |
|----------|------|----------------|
| VCN | Standard | Free |
| OKE Cluster | Control plane | Free |
| VM.Standard.E4.Flex | 1 OCPU, 16GB | $30 |
| VM.Standard2.4 | 4 OCPUs, 60GB | $150 |
| Autonomous DB | 1 OCPU | $280 |
| Object Storage | 10GB | $0.23 |
| Data Transfer | 10GB out | $0.85 |

### Cost Optimization Tips

1. **Use Flex Shapes**: Pay only for OCPUs and memory you use
2. **Stop Non-Production**: Stop dev/test resources after hours
3. **Auto-Scaling**: Enable auto-scaling to scale down during low usage
4. **Reserved Instances**: Save up to 40% with committed use
5. **Free Tier**: Take advantage of Always Free resources
6. **Monitoring**: Set up budget alerts in OCI Console

### Budget Alerts

```bash
# Create budget via OCI CLI
oci budgets budget create \
  --compartment-id $OCI_COMPARTMENT_ID \
  --amount 1000 \
  --display-name "Monthly Platform Budget" \
  --reset-period MONTHLY \
  --alert-rule-recipients example@email.com \
  --alert-rule-threshold 80 \
  --alert-rule-type ACTUAL
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failed

**Error**: `ServiceError: The required information to complete authentication was not provided`

**Solution**:
```bash
# Verify config file exists
cat ~/.oci/config

# Verify permissions
chmod 600 ~/.oci/oci_api_key.pem

# Test authentication
oci iam region list
```

#### 2. Compartment Not Found

**Error**: `NotAuthorizedOrNotFound: Authorization failed or requested resource not found`

**Solution**:
```bash
# Verify compartment OCID
oci iam compartment get --compartment-id $OCI_COMPARTMENT_ID

# Check if you have access
oci iam compartment list --compartment-id-in-subtree true
```

#### 3. Insufficient Permissions

**Error**: `NotAuthorizedOrNotFound: Authorization failed`

**Solution**: Verify IAM policies are correctly configured (see [IAM Policies](#iam-policies-required))

#### 4. Service Limits Exceeded

**Error**: `LimitExceeded: The following service limits were exceeded`

**Solution**:
```bash
# Check current limits
oci limits resource-availability get \
  --compartment-id $OCI_COMPARTMENT_ID \
  --service-name compute

# Request limit increase via OCI Console:
# Governance > Limits, Quotas and Usage > Request a service limit increase
```

#### 5. VCN Creation Failed

**Error**: `VCN did not become available`

**Solution**:
```bash
# Check VCN status in console
oci network vcn list --compartment-id $OCI_COMPARTMENT_ID

# Verify CIDR doesn't overlap with existing VCNs
# Ensure compartment has capacity for new VCNs
```

#### 6. OKE Cluster Takes Too Long

**Issue**: OKE cluster creation takes 10-15 minutes

**This is normal**: OKE cluster provisioning includes:
- Control plane setup
- Node pool creation
- Load balancer provisioning
- Networking configuration

**Monitor progress**:
```bash
oci ce cluster get --cluster-id <cluster-ocid> --query 'data."lifecycle-state"'
```

### Debug Mode

Enable debug logging:

```bash
export OCI_CLI_DEBUG=1
export DEBUG=platform:*

# Run your workflow
npm run dev deploy your-workflow.yaml
```

### Getting Help

1. **OCI Documentation**: https://docs.oracle.com/en-us/iaas/
2. **OCI Support**: https://support.oracle.com
3. **Community Forums**: https://community.oracle.com/customerconnect/
4. **GitHub Issues**: [Open an issue](https://github.com/your-repo/issues)

---

## Examples

### Example 1: Full-Stack Application (OCI)

```yaml
workflow:
  name: fullstack-app-oci
  target_cloud: oci
  region: us-ashburn-1

  resources:
    # Network
    - type: virtual_network
      name: app-network
      cidr: 10.0.0.0/16
      enable_flow_logs: true

    # Kubernetes Cluster
    - type: kubernetes_cluster
      name: app-cluster
      version: v1.28.2
      network: app-network
      node_count: 3
      instance_type: medium_compute
      enable_autoscaling: true
      min_nodes: 2
      max_nodes: 10

    # Database
    - type: managed_database
      name: app-database
      engine: oracle
      version: 19c
      instance_class: medium_db
      storage_size_gb: 100
      network: app-network
      high_availability: true
      backup_retention_days: 30

    # Object Storage
    - type: object_storage
      name: app-assets
      versioning_enabled: true
      encryption_enabled: true

    # Application Deployment
    - type: container_deployment
      name: web-app
      cluster: app-cluster
      image: myapp:latest
      replicas: 5
      port: 8080
      environment_variables:
        DATABASE_HOST: "{{app-database.endpoint}}"
        STORAGE_BUCKET: "{{app-assets.name}}"
```

### Example 2: Same Workflow, Different Cloud

**AWS Workflow** (`workflow-aws.yaml`):
```yaml
workflow:
  name: multi-cloud-app
  target_cloud: aws  # 👈 AWS
  region: us-east-1
  # ... resources (same as below)
```

**OCI Workflow** (`workflow-oci.yaml`):
```yaml
workflow:
  name: multi-cloud-app
  target_cloud: oci  # 👈 OCI
  region: us-ashburn-1
  # ... resources (identical!)
```

**Deploy to both**:
```bash
# Deploy to AWS
node dist/cli/platform-cli.js deploy workflow-aws.yaml

# Deploy to OCI (same workflow!)
node dist/cli/platform-cli.js deploy workflow-oci.yaml
```

### Example 3: Cross-Cloud Migration

```bash
# Export from AWS
node dist/cli/platform-cli.js export aws-workflow.yaml > state.json

# Convert to OCI
cat state.json | jq '.target_cloud = "oci" | .region = "us-ashburn-1"' > state-oci.json

# Import to OCI
node dist/cli/platform-cli.js import state-oci.json
```

---

## Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests (Requires OCI Credentials)

```bash
# Set environment variables
export RUN_OCI_INTEGRATION_TESTS=true
export OCI_TEST_REGION=us-ashburn-1
export OCI_TEST_COMPARTMENT_ID=ocid1.compartment.oc1..your-ocid

# Run tests
npm run test:integration
```

### Feature Parity Validation

```bash
# Run parity validation
npm run test:parity
```

---

## Next Steps

1. ✅ Review [IAM Policies](#iam-policies-required) and configure access
2. ✅ Set up [Authentication](#authentication-setup) with API keys
3. ✅ Deploy your first [workflow](#quick-start)
4. ✅ Monitor [costs](#cost-management) in OCI Console
5. ✅ Enable [budget alerts](#budget-alerts)

---

## Resources

- [OCI Documentation](https://docs.oracle.com/en-us/iaas/)
- [OCI CLI Reference](https://docs.oracle.com/en-us/iaas/tools/oci-cli/)
- [OKE Documentation](https://docs.oracle.com/en-us/iaas/Content/ContEng/home.htm)
- [Autonomous Database Docs](https://docs.oracle.com/en/cloud/paas/autonomous-database/)
- [OCI Pricing](https://www.oracle.com/cloud/price-list.html)
- [OCI Free Tier](https://www.oracle.com/cloud/free/)

---

**Last Updated**: 2025-01-29
**Version**: 1.0.0
**Maintainer**: Platform Team
