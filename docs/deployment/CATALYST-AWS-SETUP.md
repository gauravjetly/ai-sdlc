# Catalyst AWS Account Setup Guide

This guide walks you through setting up deployment to a dedicated Catalyst AWS account using GitHub Actions.

## Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   GitHub Repo   │──────│  GitHub Actions │──────│  Catalyst AWS   │
│                 │      │    CI/CD        │      │    Account      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                       │                        │
         │                       │                        ▼
    Push to main ──────► Build & Test ──────► Deploy to ECS Fargate
```

## Prerequisites

- GitHub repository with admin access
- Dedicated AWS account for Catalyst (separate from personal)
- AWS CLI installed locally
- Terraform 1.6+ installed locally

## Step 1: Create Catalyst AWS Account

### Option A: AWS Organizations (Recommended)

If you have AWS Organizations:

```bash
# Create new account in your organization
aws organizations create-account \
  --email catalyst-dev@yourdomain.com \
  --account-name "Catalyst Dev"

# Note the AccountId from the output
```

### Option B: Standalone AWS Account

1. Go to https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Use email: `catalyst-dev@yourdomain.com`
4. Account name: "Catalyst Dev"
5. Complete verification and billing setup

## Step 2: Create IAM User for GitHub Actions

In the Catalyst AWS account:

```bash
# Set your Catalyst account ID
export CATALYST_ACCOUNT_ID="123456789012"

# Create IAM user for GitHub Actions
aws iam create-user --user-name github-actions-deploy

# Create access key
aws iam create-access-key --user-name github-actions-deploy

# IMPORTANT: Save the AccessKeyId and SecretAccessKey!
```

### Attach Deployment Policy

```bash
# Create the policy
cat > /tmp/github-deploy-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:CreateRepository",
        "ecr:DescribeRepositories"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSAccess",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:DeregisterTaskDefinition",
        "ecs:DescribeClusters",
        "ecs:CreateCluster"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ELBAccess",
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:Describe*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::*:role/catalyst-*"
    },
    {
      "Sid": "TerraformStateAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::catalyst-terraform-state",
        "arn:aws:s3:::catalyst-terraform-state/*"
      ]
    },
    {
      "Sid": "TerraformLockAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/catalyst-terraform-locks"
    }
  ]
}
EOF

# Create and attach policy
aws iam create-policy \
  --policy-name github-actions-deploy-policy \
  --policy-document file:///tmp/github-deploy-policy.json

aws iam attach-user-policy \
  --user-name github-actions-deploy \
  --policy-arn "arn:aws:iam::${CATALYST_ACCOUNT_ID}:policy/github-actions-deploy-policy"
```

## Step 3: Create Terraform State Backend

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://catalyst-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket catalyst-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket catalyst-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name catalyst-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Step 4: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | From Step 2 | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | From Step 2 | `wJal...` |
| `AWS_ACCOUNT_ID` | Catalyst account ID | `123456789012` |

## Step 5: Initialize Infrastructure

Run Terraform locally to create initial infrastructure:

```bash
cd infrastructure/terraform/environments/catalyst-dev

# Initialize Terraform
terraform init \
  -backend-config="bucket=catalyst-terraform-state" \
  -backend-config="key=catalyst-dev/terraform.tfstate" \
  -backend-config="region=us-east-1"

# Review the plan
terraform plan

# Apply infrastructure
terraform apply
```

This creates:
- VPC with public/private subnets
- RDS PostgreSQL database
- ElastiCache Redis cluster
- ECS Fargate cluster
- Application Load Balancer
- ECR repositories
- S3 bucket for uploads
- IAM roles and policies

## Step 6: First Deployment

Push to main branch to trigger deployment:

```bash
git add .
git commit -m "Configure Catalyst AWS deployment"
git push origin main
```

Monitor the deployment:
1. Go to GitHub → Actions
2. Watch the "Deploy to Catalyst AWS" workflow
3. Once complete, get the ALB URL from the workflow output

## Verification

### Check ECS Services

```bash
aws ecs list-services --cluster catalyst-dev-cluster

aws ecs describe-services \
  --cluster catalyst-dev-cluster \
  --services catalyst-dev-api catalyst-dev-ui
```

### Get Application URL

```bash
aws elbv2 describe-load-balancers \
  --names catalyst-dev-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

### Test Health Endpoint

```bash
ALB_URL=$(aws elbv2 describe-load-balancers \
  --names catalyst-dev-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

curl http://$ALB_URL/health
```

## Cost Estimate (Dev Environment)

| Resource | Type | Monthly Cost |
|----------|------|--------------|
| ECS Fargate | 2 tasks (0.25 vCPU, 0.5GB) | ~$20 |
| RDS PostgreSQL | db.t3.micro, 20GB | ~$15 |
| ElastiCache Redis | cache.t3.micro | ~$12 |
| ALB | Application Load Balancer | ~$20 |
| NAT Gateway | Single AZ | ~$35 |
| Data Transfer | Estimated | ~$10 |
| **Total** | | **~$112/month** |

To reduce costs:
- Use NAT Instance instead of NAT Gateway (~$5 vs $35)
- Stop services when not in use

## Troubleshooting

### Deployment Fails - ECS Service Not Found

Run Terraform first to create infrastructure:

```bash
cd infrastructure/terraform/environments/catalyst-dev
terraform apply
```

### Health Check Fails

Check ECS task logs:

```bash
aws logs get-log-events \
  --log-group-name /ecs/catalyst-dev/api \
  --log-stream-name $(aws logs describe-log-streams \
    --log-group-name /ecs/catalyst-dev/api \
    --order-by LastEventTime \
    --descending \
    --limit 1 \
    --query 'logStreams[0].logStreamName' \
    --output text)
```

### Database Connection Issues

Verify security groups allow traffic:

```bash
# Get ECS security group
ECS_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=catalyst-dev-ecs-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Get RDS security group
RDS_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=catalyst-dev-rds-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Verify ingress rule exists
aws ec2 describe-security-groups --group-ids $RDS_SG
```

## Next Steps

1. **Custom Domain**: Add Route 53 hosted zone and ACM certificate
2. **HTTPS**: Update `certificate_arn` in terraform.tfvars
3. **Monitoring**: Set up CloudWatch alarms
4. **Backups**: Enable RDS automated backups
5. **Scaling**: Configure ECS auto-scaling
