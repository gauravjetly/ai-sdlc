#!/bin/bash
# Bootstrap script for Catalyst AWS account
# Run this once to set up the initial infrastructure prerequisites

set -e

echo "======================================"
echo "Catalyst AWS Account Bootstrap"
echo "======================================"

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo "AWS CLI required but not installed. Aborting." >&2; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "Terraform required but not installed. Aborting." >&2; exit 1; }

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
STATE_BUCKET="catalyst-terraform-state"
LOCK_TABLE="catalyst-terraform-locks"
GITHUB_USER="github-actions-deploy"

echo ""
echo "Configuration:"
echo "  Region: $AWS_REGION"
echo "  State Bucket: $STATE_BUCKET"
echo "  Lock Table: $LOCK_TABLE"
echo ""

# Verify AWS credentials
echo "Verifying AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Using AWS Account: $ACCOUNT_ID"
echo ""

read -p "Continue with this account? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Create S3 bucket for Terraform state
echo ""
echo "Creating S3 bucket for Terraform state..."
if aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
    echo "  Bucket $STATE_BUCKET already exists"
else
    aws s3 mb "s3://$STATE_BUCKET" --region "$AWS_REGION"
    echo "  Created bucket $STATE_BUCKET"
fi

# Enable versioning
echo "Enabling versioning on state bucket..."
aws s3api put-bucket-versioning \
    --bucket "$STATE_BUCKET" \
    --versioning-configuration Status=Enabled

# Enable encryption
echo "Enabling encryption on state bucket..."
aws s3api put-bucket-encryption \
    --bucket "$STATE_BUCKET" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }'

# Block public access
echo "Blocking public access on state bucket..."
aws s3api put-public-access-block \
    --bucket "$STATE_BUCKET" \
    --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
    }'

# Create DynamoDB table for locking
echo ""
echo "Creating DynamoDB table for state locking..."
if aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$AWS_REGION" 2>/dev/null; then
    echo "  Table $LOCK_TABLE already exists"
else
    aws dynamodb create-table \
        --table-name "$LOCK_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$AWS_REGION"
    echo "  Created table $LOCK_TABLE"
    echo "  Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "$LOCK_TABLE" --region "$AWS_REGION"
fi

# Create IAM user for GitHub Actions
echo ""
echo "Creating IAM user for GitHub Actions..."
if aws iam get-user --user-name "$GITHUB_USER" 2>/dev/null; then
    echo "  User $GITHUB_USER already exists"
else
    aws iam create-user --user-name "$GITHUB_USER"
    echo "  Created user $GITHUB_USER"
fi

# Create deployment policy
echo "Creating deployment policy..."
POLICY_DOC=$(cat << 'POLICY'
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
        "ecs:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ELBAccess",
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EC2Access",
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "ec2:CreateSecurityGroup",
        "ec2:DeleteSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupEgress",
        "ec2:CreateVpc",
        "ec2:DeleteVpc",
        "ec2:CreateSubnet",
        "ec2:DeleteSubnet",
        "ec2:CreateInternetGateway",
        "ec2:DeleteInternetGateway",
        "ec2:AttachInternetGateway",
        "ec2:DetachInternetGateway",
        "ec2:CreateNatGateway",
        "ec2:DeleteNatGateway",
        "ec2:AllocateAddress",
        "ec2:ReleaseAddress",
        "ec2:CreateRouteTable",
        "ec2:DeleteRouteTable",
        "ec2:CreateRoute",
        "ec2:DeleteRoute",
        "ec2:AssociateRouteTable",
        "ec2:DisassociateRouteTable",
        "ec2:ModifyVpcAttribute",
        "ec2:CreateTags",
        "ec2:DeleteTags"
      ],
      "Resource": "*"
    },
    {
      "Sid": "RDSAccess",
      "Effect": "Allow",
      "Action": [
        "rds:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ElastiCacheAccess",
      "Effect": "Allow",
      "Action": [
        "elasticache:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMAccess",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PassRole",
        "iam:CreatePolicy",
        "iam:DeletePolicy",
        "iam:GetPolicy",
        "iam:GetPolicyVersion",
        "iam:ListPolicyVersions",
        "iam:TagRole",
        "iam:UntagRole",
        "iam:ListRolePolicies",
        "iam:ListAttachedRolePolicies"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DynamoDBStateAccess",
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
POLICY
)

POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/catalyst-deploy-policy"
if aws iam get-policy --policy-arn "$POLICY_ARN" 2>/dev/null; then
    echo "  Policy already exists, updating..."
    # Create new version
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "$POLICY_DOC" \
        --set-as-default || true
else
    aws iam create-policy \
        --policy-name "catalyst-deploy-policy" \
        --policy-document "$POLICY_DOC"
    echo "  Created policy catalyst-deploy-policy"
fi

# Attach policy to user
echo "Attaching policy to user..."
aws iam attach-user-policy \
    --user-name "$GITHUB_USER" \
    --policy-arn "$POLICY_ARN" || true

# Create access key
echo ""
echo "Creating access key for GitHub Actions..."
echo ""
echo "======================================"
echo "IMPORTANT: Save these credentials!"
echo "======================================"
aws iam create-access-key --user-name "$GITHUB_USER"
echo ""
echo "Add these as GitHub Secrets:"
echo "  AWS_ACCESS_KEY_ID     = <AccessKeyId from above>"
echo "  AWS_SECRET_ACCESS_KEY = <SecretAccessKey from above>"
echo "  AWS_ACCOUNT_ID        = $ACCOUNT_ID"
echo ""

# Summary
echo "======================================"
echo "Bootstrap Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Add the GitHub secrets shown above"
echo "2. Run Terraform to create infrastructure:"
echo "   cd infrastructure/terraform/environments/catalyst-dev"
echo "   terraform init"
echo "   terraform apply"
echo "3. Push to main branch to trigger deployment"
echo ""
