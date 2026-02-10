# ADR-002: Account-Level Multi-Tenant Isolation

## Status
Accepted

## Date
2026-01-29

## Context

The AWS DevOps Platform must support multiple tenants (customers, business units, or projects) with varying isolation requirements. The platform must prevent cross-tenant data access, resource interference, and security breaches while maintaining operational efficiency.

### Options Considered

1. **Account-Level Isolation** - Separate AWS accounts per tenant
2. **VPC-Level Isolation** - Shared account, separate VPCs per tenant
3. **Namespace-Level Isolation** - Shared cluster, Kubernetes namespaces per tenant
4. **Resource-Level Isolation** - Tags and IAM policies for logical separation

## Decision

We will implement **Account-Level Isolation** for production workloads, with **VPC-Level Isolation** available for development and test environments where cost optimization is prioritized over isolation strength.

## Rationale

### Isolation Model Comparison

| Criterion | Account | VPC | Namespace | Resource Tags |
|-----------|---------|-----|-----------|---------------|
| Security isolation | Strongest | Strong | Moderate | Weak |
| Blast radius | Limited | Limited | Shared | Shared |
| Cost isolation | Native | Requires work | Complex | Complex |
| IAM complexity | Simple | Moderate | Complex | Very complex |
| Operational overhead | Higher | Moderate | Lower | Lowest |
| Compliance friendly | Best | Good | Challenging | Difficult |
| Service limits | Per-account | Shared | Shared | Shared |

### Key Factors

1. **Security Requirements**: Account boundaries provide the strongest isolation. IAM policies cannot cross account boundaries accidentally. Service Control Policies (SCPs) enable organizational guardrails.

2. **Compliance Needs**: SOC2 and regulatory compliance is easier to demonstrate with account-level separation. Audit boundaries are clear.

3. **Blast Radius**: An incident in one tenant's account cannot affect other tenants. Service limit exhaustion is contained.

4. **Cost Allocation**: AWS Cost Explorer and billing naturally separate at account level. No complex tagging strategy needed for cost attribution.

5. **IAM Simplicity**: Each account has its own IAM namespace. No risk of accidentally granting cross-tenant access through policy errors.

### Trade-offs Accepted

- **Increased Accounts**: More accounts to manage (solved by AWS Organizations)
- **Cross-Account Complexity**: Sharing resources requires explicit setup
- **Cost Overhead**: Each account has baseline costs (CloudTrail, Config, etc.)
- **Network Complexity**: Cross-account networking requires Transit Gateway

## Implementation

### Account Structure

```
AWS Organization (Management Account)
├── Security OU
│   ├── Log Archive Account      # Central logging
│   ├── Audit Account            # Security tools
│   └── Security Tooling         # GuardDuty, Security Hub
├── Infrastructure OU
│   ├── Network Account          # Transit Gateway, DNS
│   ├── Shared Services Account  # ECR, Artifacts
│   └── Platform Account         # DevOps platform control plane
├── Workloads OU
│   └── Tenants OU
│       ├── Tenant-A Account
│       │   └── (Prod VPC, UAT VPC)
│       ├── Tenant-B Account
│       │   └── (Prod VPC, UAT VPC)
│       └── ...
└── Sandbox OU
    └── Development Account      # Shared dev (VPC-level isolation)
```

### Cross-Account Access Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLATFORM ACCOUNT                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Provisioning Agent                                      │   │
│  │  (Assumes role in tenant accounts)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   TENANT-A      │  │   TENANT-B      │  │   TENANT-C      │
│   ACCOUNT       │  │   ACCOUNT       │  │   ACCOUNT       │
│                 │  │                 │  │                 │
│ TenantOpsRole   │  │ TenantOpsRole   │  │ TenantOpsRole   │
│ (Trust: Platform│  │ (Trust: Platform│  │ (Trust: Platform│
│  Account)       │  │  Account)       │  │  Account)       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Service Control Policy (SCP) Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnsupportedRegions",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["us-east-1", "us-west-2", "eu-west-1"]
        }
      }
    },
    {
      "Sid": "RequireEncryption",
      "Effect": "Deny",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "*",
      "Condition": {
        "Null": {
          "s3:x-amz-server-side-encryption": "true"
        }
      }
    },
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Action": [
        "s3:PutBucketPublicAccessBlock",
        "s3:DeletePublicAccessBlock"
      ],
      "Resource": "*"
    }
  ]
}
```

### VPC-Level Isolation (Development)

For development environments where cost optimization is prioritized:

```
┌─────────────────────────────────────────────────────────────────┐
│                  DEVELOPMENT ACCOUNT (Shared)                    │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Tenant-A VPC   │  │  Tenant-B VPC   │  │  Tenant-C VPC   │ │
│  │  10.1.0.0/16    │  │  10.2.0.0/16    │  │  10.3.0.0/16    │ │
│  │                 │  │                 │  │                 │ │
│  │  - No peering   │  │  - No peering   │  │  - No peering   │ │
│  │  - IAM boundary │  │  - IAM boundary │  │  - IAM boundary │ │
│  │  - Resource tags│  │  - Resource tags│  │  - Resource tags│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Consequences

### Positive

- Maximum security isolation between tenants
- Clear compliance boundaries
- Native cost allocation
- Independent service limits per tenant
- Simple IAM model per tenant
- SCPs enforce organizational policies

### Negative

- More AWS accounts to manage
- Cross-account networking complexity
- Higher baseline costs per account
- Longer initial provisioning time

### Neutral

- Must implement AWS Organizations automation
- Need Transit Gateway for cross-account connectivity
- Centralized logging requires cross-account permissions

## Migration Path

For existing shared-account tenants:

1. Create new tenant account
2. Replicate infrastructure using Terraform
3. Migrate data (database export/import)
4. Update DNS to point to new resources
5. Decommission old resources after verification

## References

- [AWS Multi-Account Strategy](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/)
- [AWS Organizations Best Practices](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
- [Control Tower](https://aws.amazon.com/controltower/)

---

*ADR-002 | AWS DevOps Platform*
