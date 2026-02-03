# OCI Adapter - Implementation Details

This document provides technical details about the OCI adapter implementation.

## Architecture

### Class Structure

```
OciAdapter (extends BaseCloudAdapter)
├── Connection Management
│   ├── Authentication (ConfigFileAuthenticationDetailsProvider)
│   ├── Client Initialization (VCN, OKE, DB, Storage)
│   └── Health Checks
├── Resource Operations
│   ├── Virtual Networks (VCN + Subnets + Gateways)
│   ├── Kubernetes Clusters (OKE + Node Pools)
│   ├── Managed Databases (Autonomous Database)
│   ├── Object Storage (Buckets)
│   └── Container Deployments (Kubernetes manifests)
├── Resource Mapping
│   ├── Instance Type Mapping
│   ├── Database Class Mapping
│   └── Version Normalization
└── Waiters & Status Checks
    ├── VCN Availability Waiter
    ├── Cluster Active Waiter
    ├── Node Pool Active Waiter
    └── Database Available Waiter
```

## OCI SDK Clients

### Initialized Clients

```typescript
private vcnClient: core.VirtualNetworkClient
private containerEngineClient: containerengine.ContainerEngineClient
private databaseClient: database.DatabaseClient
private objectStorageClient: objectstorage.ObjectStorageClient
private identityClient: identity.IdentityClient
```

### Authentication

Uses `ConfigFileAuthenticationDetailsProvider` which reads from `~/.oci/config`:

```ini
[DEFAULT]
user=ocid1.user.oc1..your-user-ocid
fingerprint=your:fingerprint
tenancy=ocid1.tenancy.oc1..your-tenancy-ocid
region=us-ashburn-1
key_file=~/.oci/oci_api_key.pem
```

## Resource Implementations

### 1. Virtual Network (VCN)

**What it creates**:
- VCN with specified CIDR
- Internet Gateway (for public access)
- Two subnets (public and private)
- Route tables
- Security lists

**OCI APIs used**:
- `createVcn()`
- `createInternetGateway()`
- `createSubnet()`

**Waiter**: Polls VCN status until `lifecycleState === 'AVAILABLE'`

**Time to provision**: ~2-5 minutes

### 2. Kubernetes Cluster (OKE)

**What it creates**:
- OKE cluster (managed Kubernetes control plane)
- Node pool with specified instance shape and count
- Load balancer subnet configuration

**OCI APIs used**:
- `createCluster()`
- `createNodePool()`
- `listAvailabilityDomains()`

**Waiter**:
- Cluster waiter: Polls until `lifecycleState === 'ACTIVE'`
- Node pool waiter: Polls until `lifecycleState === 'ACTIVE'`

**Time to provision**: ~10-15 minutes

### 3. Managed Database (Autonomous Database)

**What it creates**:
- Autonomous Database with specified specs
- Auto-scaling enabled
- Backup configuration
- Encryption at rest

**OCI APIs used**:
- `createAutonomousDatabase()`

**Waiter**: Polls database until `lifecycleState === 'AVAILABLE'`

**Time to provision**: ~5-10 minutes

### 4. Object Storage

**What it creates**:
- Object Storage bucket
- Versioning configuration
- Encryption settings
- Public access controls

**OCI APIs used**:
- `getNamespace()` (get namespace first)
- `createBucket()`

**Waiter**: Not needed (immediate)

**Time to provision**: <1 minute

### 5. Container Deployment

**What it creates**:
- Kubernetes Deployment manifest
- Service (LoadBalancer type)
- ConfigMaps for environment variables

**Note**: This is currently simulated in MVP. In production, it would:
1. Get kubeconfig from OKE cluster
2. Use kubectl or Kubernetes client to apply manifests
3. Wait for deployment rollout

**Time to provision**: ~2-3 minutes

## Resource Mapping

### Instance Types

```typescript
const shapeMap = {
  'small_compute': 'VM.Standard.E4.Flex',      // 1 OCPU, 16GB
  'medium_compute': 'VM.Standard2.4',          // 4 OCPUs, 60GB
  'large_compute': 'VM.Standard2.8',           // 8 OCPUs, 120GB
  'xlarge_compute': 'VM.Standard2.16',         // 16 OCPUs, 240GB
  'small_memory_optimized': 'VM.Standard.E3.Flex',
  'medium_memory_optimized': 'VM.Optimized3.Flex',
  'gpu_compute': 'VM.GPU3.1'
};
```

**Note**:
- 1 OCPU ≈ 2 vCPUs (AWS)
- Flex shapes allow custom OCPU/memory configuration

### Database Classes

```typescript
const cpuMap = {
  'small_db': 1,    // 1 OCPU
  'medium_db': 2,   // 2 OCPUs
  'large_db': 4,    // 4 OCPUs
  'xlarge_db': 8    // 8 OCPUs
};
```

**Note**: Autonomous Database auto-scales up to 3x CPU when needed.

### Kubernetes Versions

```typescript
private normalizeK8sVersion(version: string): string {
  // OCI requires 'v' prefix
  if (!version.startsWith('v')) {
    return `v${version}`;
  }
  return version;
}
```

Supported versions:
- v1.28.2
- v1.27.2
- v1.26.2

## Waiters

Waiters poll resource status until desired state is reached.

### VCN Waiter

```typescript
private async waitForVcnAvailable(vcnId: string): Promise<void> {
  const maxWaitTime = 300000; // 5 minutes
  const checkInterval = 5000; // 5 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const response = await this.vcnClient.getVcn({ vcnId });
    if (response.vcn.lifecycleState === 'Available') {
      return;
    }
    await sleep(checkInterval);
  }
  throw new Error('VCN did not become available');
}
```

### Cluster Waiter

```typescript
private async waitForClusterActive(clusterId: string): Promise<void> {
  const maxWaitTime = 900000; // 15 minutes
  const checkInterval = 30000; // 30 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const response = await this.containerEngineClient.getCluster({ clusterId });
    if (response.cluster.lifecycleState === 'Active') {
      return;
    }
    console.log(`Cluster state: ${response.cluster.lifecycleState}...`);
    await sleep(checkInterval);
  }
  throw new Error('Cluster did not become active');
}
```

## Error Handling

### Connection Errors

```typescript
try {
  await adapter.connect(credentials);
} catch (error) {
  // Possible errors:
  // - Invalid credentials
  // - Network issues
  // - Compartment not found
  // - Permission denied
}
```

### Resource Creation Errors

```typescript
try {
  await adapter.createVirtualNetwork(config);
} catch (error) {
  // Possible errors:
  // - CIDR overlap
  // - Service limit exceeded
  // - Invalid configuration
  // - Timeout waiting for resource
}
```

### Best Practices

1. **Always check error messages**: OCI provides detailed error messages
2. **Implement retry logic**: Some operations may be throttled
3. **Validate before creation**: Check limits, CIDR ranges, etc.
4. **Handle timeouts gracefully**: OKE can take 15+ minutes

## Compartment Management

OCI uses compartments for resource organization:

```typescript
private compartmentId: string | null = null;

async connect(credentials: CloudCredentials): Promise<void> {
  this.compartmentId = credentials.credentials.compartment_id;
  // All resources created in this compartment
}
```

**Best Practices**:
- Use separate compartments for dev/test/prod
- Set up compartment hierarchy for organization
- Apply IAM policies at compartment level

## Tagging Strategy

All resources are tagged with:

```typescript
freeformTags: {
  'ManagedBy': 'multicloud-devops-platform',
  'Platform': 'oci',
  ...customTags
}
```

**Benefits**:
- Cost tracking
- Resource organization
- Automation identification

## Performance Considerations

### Resource Creation Times

| Resource | Average Time | Max Time |
|----------|--------------|----------|
| VCN | 2-5 min | 10 min |
| OKE Cluster | 10-15 min | 20 min |
| Node Pool | 5-10 min | 15 min |
| Autonomous DB | 5-10 min | 15 min |
| Object Storage | <1 min | 2 min |

### Optimization Tips

1. **Parallel creation**: Create independent resources in parallel
2. **Use waiters efficiently**: Don't check too frequently (30s intervals)
3. **Pre-create networks**: Create VCN first, then dependent resources
4. **Cache availability domains**: Get once, reuse for all resources

## Testing

### Unit Tests

```bash
npm run test
```

Tests adapter methods in isolation with mocked OCI SDK.

### Integration Tests

```bash
export RUN_OCI_INTEGRATION_TESTS=true
export OCI_TEST_COMPARTMENT_ID="your-compartment-ocid"
npm run test:integration
```

Creates real resources in OCI (incurs costs).

### Feature Parity Tests

```bash
npm run test:parity
```

Validates 100% feature parity with AWS adapter.

## Troubleshooting

### Common Issues

#### 1. Authentication Failed

**Symptoms**: `ServiceError: The required information to complete authentication was not provided`

**Solution**:
```bash
# Check config file
cat ~/.oci/config

# Verify permissions
chmod 600 ~/.oci/oci_api_key.pem

# Test with CLI
oci iam region list
```

#### 2. Compartment Not Found

**Symptoms**: `NotAuthorizedOrNotFound: Authorization failed or requested resource not found`

**Solution**:
```bash
# List accessible compartments
oci iam compartment list --all

# Verify compartment OCID
oci iam compartment get --compartment-id $OCI_COMPARTMENT_ID
```

#### 3. Service Limit Exceeded

**Symptoms**: `LimitExceeded: The following service limits were exceeded`

**Solution**:
```bash
# Check limits
oci limits resource-availability get \
  --compartment-id $OCI_COMPARTMENT_ID \
  --service-name compute

# Request limit increase via OCI Console
```

#### 4. Timeout Creating OKE Cluster

**Symptoms**: `Cluster did not become active within 900000ms`

**Possible causes**:
- OCI capacity issues in region
- Network configuration problems
- Service limits reached

**Solution**:
```bash
# Check cluster status manually
oci ce cluster get --cluster-id <cluster-ocid>

# Try different region or availability domain
```

## Future Enhancements

### Phase 1 (Implemented)
- ✅ VCN creation with subnets
- ✅ OKE cluster provisioning
- ✅ Autonomous Database
- ✅ Object Storage
- ✅ Feature parity with AWS

### Phase 2 (Planned)
- [ ] Real kubectl integration for container deployments
- [ ] Load balancer configuration
- [ ] DNS management
- [ ] Monitoring and alerts setup
- [ ] Auto-scaling policies
- [ ] Backup and disaster recovery

### Phase 3 (Future)
- [ ] Multi-region deployments
- [ ] OCI Functions integration
- [ ] API Gateway configuration
- [ ] Service Mesh (Istio on OKE)
- [ ] GitOps integration (ArgoCD)

## Contributing

### Adding New Features

1. Add method to `OciAdapter` class
2. Implement using OCI SDK
3. Add waiter if needed
4. Update tests
5. Update documentation
6. Validate feature parity

### Testing Checklist

- [ ] Unit tests pass
- [ ] Integration tests pass (if applicable)
- [ ] Feature parity tests pass
- [ ] Documentation updated
- [ ] Examples added

## References

- [OCI SDK for TypeScript](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/typescriptsdk.htm)
- [OCI VCN Documentation](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/overview.htm)
- [OKE Documentation](https://docs.oracle.com/en-us/iaas/Content/ContEng/home.htm)
- [Autonomous Database Docs](https://docs.oracle.com/en/cloud/paas/autonomous-database/)
- [Object Storage Docs](https://docs.oracle.com/en-us/iaas/Content/Object/home.htm)

---

**Last Updated**: 2025-01-29
**Version**: 1.0.0
**Maintainer**: Platform Team
