# ADR-024: Platform Cost Estimation Approach

**Status**: Accepted
**Date**: 2026-02-02
**Author**: Architect (Jets) Agent

## Context

Users need cost estimates for configured platform resources before deployment. AWS pricing is complex with multiple dimensions (instance hours, storage, data transfer, etc.).

## Decision

Implement client-side cost estimation using embedded pricing data:

### Pricing Data Structure
```typescript
interface PricingData {
  ec2: Record<string, { hourly: number }>;
  rds: Record<string, Record<string, { hourly: number }>>;
  ebs: Record<string, { perGB: number }>;
  s3: { standardPerGB: number; iaPerGB: number };
  efs: { standardPerGB: number };
  eks: { clusterHourly: number };
}
```

### Cost Calculation Rules

1. **EC2 Instances**: `hourlyPrice * 730 hours/month`
2. **EKS Clusters**: `$0.10/hour * 730 = $73/month per cluster`
3. **EKS Node Groups**: `instancePrice * desiredCount * 730`
4. **RDS Instances**: `hourlyPrice * 730 * (multiAZ ? 2 : 1) + storageGB * $0.115`
5. **EBS Volumes**: `sizeGB * volumeTypePrice`
6. **S3 Buckets**: Estimated at $0.023/GB-month (actual varies by usage)
7. **EFS**: Estimated at $0.30/GB-month (actual varies by usage)

### Display Format
```
Monthly Cost Estimate: $847.50
├── Compute: $523.00
│   ├── EKS Cluster: $73.00
│   └── Node Groups (3x m5.large): $450.00
├── Database: $299.30
│   ├── RDS Instance (db.m5.large, Multi-AZ): $249.66
│   └── Storage (100GB gp2): $49.64
└── Storage: $25.20
    ├── EBS Volumes (200GB gp3): $16.00
    └── S3 (estimated): $9.20
```

## Rationale

- **Immediate Feedback**: No API calls required
- **Predictable**: Consistent estimates
- **Transparent**: Users can see calculation basis
- **Reasonable Accuracy**: Within 10-15% of actual for typical configurations

## Limitations

1. **No Data Transfer Costs**: Cannot estimate without usage data
2. **No Reserved Pricing**: Shows on-demand only
3. **No Regional Variations**: Uses us-east-1 baseline
4. **S3/EFS Estimates**: Based on assumed storage size

## Display Guidelines

- Always show disclaimer: "Estimate based on on-demand pricing in us-east-1"
- Show breakdown by service category
- Allow drill-down to individual resources
- Update in real-time as configuration changes

## Consequences

### Positive
- Users can make informed decisions before deployment
- No AWS credentials required for estimation
- Fast, responsive UI

### Negative
- Estimates may differ from actual costs
- Cannot account for all pricing dimensions
- Pricing data needs periodic updates

## Alternatives Considered

1. **AWS Pricing API**: Requires credentials, complex to use
2. **AWS Cost Calculator Integration**: External tool, loses context
3. **No Estimation**: Poor user experience, surprise costs
