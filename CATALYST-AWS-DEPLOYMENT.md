# Catalyst AWS Deployment - Complete Setup

Your GitHub + Catalyst AWS deployment infrastructure is ready.

## What Was Created

### GitHub Actions Workflows

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-catalyst-aws.yml` | Main deployment to Catalyst AWS |
| `.github/workflows/terraform-plan.yml` | Infrastructure changes preview |
| `.github/workflows/ci.yml` | Continuous integration |

### Terraform Infrastructure

```
infrastructure/terraform/
├── environments/
│   └── catalyst-dev/          # Dev environment config
│       ├── main.tf            # Main configuration
│       ├── variables.tf       # Variable definitions
│       ├── outputs.tf         # Output values
│       └── terraform.tfvars   # Variable values
└── modules/
    ├── vpc/                   # VPC, subnets, NAT
    ├── ecs/                   # ECS cluster & services
    ├── rds/                   # PostgreSQL database
    ├── elasticache/           # Redis cache
    ├── ecr/                   # Docker registries
    ├── alb/                   # Load balancer
    ├── iam/                   # IAM roles & policies
    └── s3/                    # Storage bucket
```

### Documentation & Scripts

| File | Purpose |
|------|---------|
| `docs/deployment/CATALYST-AWS-SETUP.md` | Complete setup guide |
| `infrastructure/scripts/bootstrap-catalyst-aws.sh` | One-click AWS setup |

### Docker Files

| File | Purpose |
|------|---------|
| `src/platform/api/Dockerfile` | API container |
| `src/platform/ui/Dockerfile` | UI container |
| `src/platform/ui/nginx.conf` | Nginx configuration |

## Quick Start

### 1. Bootstrap Catalyst AWS Account

```bash
# Run the bootstrap script
./infrastructure/scripts/bootstrap-catalyst-aws.sh

# This creates:
# - S3 bucket for Terraform state
# - DynamoDB table for state locking
# - IAM user with deployment permissions
# - Access keys (save these!)
```

### 2. Configure GitHub Secrets

Go to GitHub repo → Settings → Secrets → Actions

Add these secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID`

### 3. Deploy Infrastructure

```bash
cd infrastructure/terraform/environments/catalyst-dev
terraform init
terraform apply
```

### 4. Push to Deploy

```bash
git add .
git commit -m "Deploy to Catalyst AWS"
git push origin main
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Catalyst AWS Account                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                          VPC (10.0.0.0/16)                    │  │
│  │                                                                │  │
│  │  ┌─────────────────┐              ┌─────────────────┐        │  │
│  │  │ Public Subnet 1 │              │ Public Subnet 2 │        │  │
│  │  │   10.0.1.0/24   │              │   10.0.2.0/24   │        │  │
│  │  │                 │              │                 │        │  │
│  │  │  ┌───────────┐  │              │                 │        │  │
│  │  │  │    ALB    │◄─┼──────────────┼─────── Internet │        │  │
│  │  │  └─────┬─────┘  │              │                 │        │  │
│  │  │        │        │              │                 │        │  │
│  │  │  ┌─────┴─────┐  │              │                 │        │  │
│  │  │  │    NAT    │  │              │                 │        │  │
│  │  │  └─────┬─────┘  │              │                 │        │  │
│  │  └────────┼────────┘              └─────────────────┘        │  │
│  │           │                                                    │  │
│  │  ┌────────┴────────┐              ┌─────────────────┐        │  │
│  │  │Private Subnet 1 │              │Private Subnet 2 │        │  │
│  │  │  10.0.10.0/24   │              │  10.0.11.0/24   │        │  │
│  │  │                 │              │                 │        │  │
│  │  │ ┌─────────────┐ │              │ ┌─────────────┐ │        │  │
│  │  │ │ ECS Fargate │ │              │ │     RDS     │ │        │  │
│  │  │ │  API + UI   │ │              │ │ PostgreSQL  │ │        │  │
│  │  │ └─────────────┘ │              │ └─────────────┘ │        │  │
│  │  │                 │              │                 │        │  │
│  │  │ ┌─────────────┐ │              │ ┌─────────────┐ │        │  │
│  │  │ │ ElastiCache │ │              │ │     S3      │ │        │  │
│  │  │ │    Redis    │ │              │ │   Uploads   │ │        │  │
│  │  │ └─────────────┘ │              │ └─────────────┘ │        │  │
│  │  └─────────────────┘              └─────────────────┘        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │    ECR     │  │ CloudWatch │  │  Secrets   │                    │
│  │ Registries │  │    Logs    │  │  Manager   │                    │
│  └────────────┘  └────────────┘  └────────────┘                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment Pipeline

```
Push to main
     │
     ▼
┌─────────────────┐
│   Build & Test  │ ◄── CI workflow
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Docker   │
│     Images      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Push to ECR   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update ECS     │
│   Services      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Health Check   │
└────────┬────────┘
         │
         ▼
    ✅ Complete
```

## Cost Estimate

| Resource | Specification | Monthly |
|----------|--------------|---------|
| ECS Fargate | 2 tasks (0.25 vCPU, 512MB) | ~$20 |
| RDS PostgreSQL | db.t3.micro, 20GB | ~$15 |
| ElastiCache Redis | cache.t3.micro | ~$12 |
| Application Load Balancer | - | ~$20 |
| NAT Gateway | Single AZ | ~$35 |
| Data Transfer | Estimated | ~$10 |
| **Total** | | **~$112/month** |

## GitHub Secrets Needed

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Catalyst AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Catalyst AWS secret key |
| `AWS_ACCOUNT_ID` | Catalyst AWS account ID |

## Commands Reference

```bash
# Initialize infrastructure
cd infrastructure/terraform/environments/catalyst-dev
terraform init
terraform plan
terraform apply

# View outputs
terraform output

# Get application URL
terraform output alb_url

# Check ECS services
aws ecs list-services --cluster catalyst-dev-cluster

# View logs
aws logs tail /ecs/catalyst-dev/api --follow
```

## Next Steps

1. Run bootstrap script to set up AWS account
2. Add GitHub secrets
3. Run Terraform to create infrastructure
4. Push to main to trigger first deployment
5. Access application via ALB URL
