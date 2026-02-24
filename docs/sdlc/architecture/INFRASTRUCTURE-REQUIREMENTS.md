# Infrastructure Requirements

## Overview

This document details the infrastructure required to run the Vintiq Catalyst platform with **REAL** services. No mock data means real infrastructure.

---

## 1. Core Infrastructure

### 1.1 PostgreSQL Database

**Purpose**: Persistent storage for all platform data

```yaml
Service: PostgreSQL
Version: 15+
Purpose: Primary data store

Minimum Specs:
  CPU: 2 vCPU
  Memory: 4 GB
  Storage: 100 GB SSD
  IOPS: 3000

Production Specs:
  CPU: 4+ vCPU
  Memory: 16 GB
  Storage: 500 GB SSD
  IOPS: 10000
  High Availability: Multi-AZ
  Backup: Daily automated
```

**Tables Stored**:
- deployments
- deployment_history
- cloud_resources
- agent_executions
- agent_schedules
- security_scans
- dependency_audits
- cost_recommendations
- compliance_checks

**Setup**:
```bash
# Local development
docker run -d \
  --name catalyst-postgres \
  -e POSTGRES_USER=catalyst \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=catalyst \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15

# Run migrations
npm run db:migrate
```

**AWS RDS Setup**:
```bash
aws rds create-db-instance \
  --db-instance-identifier catalyst-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username catalyst \
  --master-user-password "$(aws secretsmanager get-random-password --query RandomPassword --output text)" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --multi-az \
  --backup-retention-period 30
```

---

### 1.2 Redis

**Purpose**: BullMQ job queue backend, caching, session management

```yaml
Service: Redis
Version: 7+
Purpose: Job queue + cache

Minimum Specs:
  Memory: 2 GB
  Persistence: RDB snapshots

Production Specs:
  Memory: 8 GB
  Persistence: AOF + RDB
  High Availability: Redis Cluster or ElastiCache
```

**Setup**:
```bash
# Local development
docker run -d \
  --name catalyst-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7 redis-server --appendonly yes

# AWS ElastiCache
aws elasticache create-replication-group \
  --replication-group-id catalyst-redis \
  --replication-group-description "Catalyst Redis cluster" \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --num-cache-clusters 2 \
  --automatic-failover-enabled
```

---

### 1.3 Node.js Runtime

**Purpose**: API server and background workers

```yaml
Service: Node.js
Version: 20 LTS
Purpose: Application runtime

Minimum Specs:
  CPU: 2 vCPU
  Memory: 4 GB

Production Specs:
  CPU: 4+ vCPU
  Memory: 8 GB
  Instances: 3+ (load balanced)
  Auto-scaling: Based on CPU/memory
```

**Dependencies**:
```json
{
  "dependencies": {
    "@kubernetes/client-node": "^0.20.0",
    "@aws-sdk/client-ec2": "^3.500.0",
    "@aws-sdk/client-eks": "^3.500.0",
    "@aws-sdk/client-rds": "^3.500.0",
    "@aws-sdk/client-cost-explorer": "^3.500.0",
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "pg": "^8.11.0",
    "socket.io": "^4.7.0",
    "express": "^4.18.0",
    "node-cron": "^3.0.0"
  }
}
```

---

## 2. External Tool Requirements

### 2.1 Trivy (Container Scanning)

**Purpose**: Real vulnerability scanning of container images

```bash
# Installation
# macOS
brew install trivy

# Linux
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -

# Docker
docker pull aquasec/trivy:latest

# Verify
trivy --version
# trivy version 0.50.0
```

**Configuration**:
```yaml
# ~/.trivy.yaml
cache:
  dir: /tmp/trivy

db:
  repository: ghcr.io/aquasecurity/trivy-db

vulnerability:
  type: os,library
```

---

### 2.2 Checkov (Infrastructure Scanning)

**Purpose**: Real security scanning of Terraform/IaC

```bash
# Installation
pip install checkov

# Verify
checkov --version
# 3.2.0

# Or via Docker
docker pull bridgecrew/checkov:latest
```

---

### 2.3 AWS CLI

**Purpose**: Cloud operations and verification

```bash
# Installation
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
# aws-cli/2.15.0

# Configure
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: us-east-1
# Default output format: json
```

---

### 2.4 kubectl

**Purpose**: Kubernetes operations

```bash
# Installation
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify
kubectl version --client
# Client Version: v1.29.0
```

---

## 3. Cloud Account Requirements

### 3.1 AWS Account

**Services Required**:
| Service | Purpose | Required |
|---------|---------|----------|
| EC2 | VPC/networking | Yes |
| EKS | Kubernetes clusters | Yes |
| RDS | Managed databases | Yes |
| Cost Explorer | Cost analysis | Yes |
| IAM | Authentication | Yes |
| Secrets Manager | Credentials | Recommended |
| CloudWatch | Monitoring | Recommended |
| S3 | Artifact storage | Recommended |

**Cost Explorer Enablement**:
```bash
# Must be enabled in AWS Console or via CLI
# Note: Takes 24 hours to have data after enabling

# Check if enabled
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-30 \
  --granularity MONTHLY \
  --metrics UnblendedCost
```

**IAM Permissions**: See [EXECUTION-GUIDE.md](./EXECUTION-GUIDE.md#81-aws-iam-policy)

---

### 3.2 OCI Account (Optional)

**Services Required**:
| Service | Purpose |
|---------|---------|
| OKE | Kubernetes clusters |
| Compute | VCN/networking |
| DB Service | Managed databases |
| Cost Management | Cost analysis |

---

## 4. Kubernetes Cluster Requirements

### 4.1 Development Cluster

For local development, use minikube or kind:

```bash
# Minikube
brew install minikube
minikube start --cpus 4 --memory 8192 --driver docker
minikube addons enable ingress
minikube addons enable metrics-server

# Kind (Kubernetes in Docker)
brew install kind
kind create cluster --name catalyst-dev --config kind-config.yaml
```

**kind-config.yaml**:
```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
```

### 4.2 Test/Production Cluster

EKS cluster requirements:

```yaml
Cluster:
  Kubernetes Version: 1.28+
  Node Groups:
    - Name: general
      Instance Type: m5.large
      Min Size: 2
      Max Size: 10
      Desired Size: 3

  Add-ons:
    - CoreDNS
    - kube-proxy
    - vpc-cni
    - metrics-server (for HPA)

  IAM:
    - Cluster role with EKS policies
    - Node role with EC2, ECR policies
    - OIDC provider for IRSA
```

---

## 5. Networking Requirements

### 5.1 Ports

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | API Server | REST API |
| 3001 | WebSocket | Real-time updates |
| 5432 | PostgreSQL | Database |
| 6379 | Redis | Cache/Queue |
| 443 | HTTPS | External traffic |

### 5.2 Security Groups

```hcl
# API Server security group
resource "aws_security_group" "api" {
  ingress {
    from_port   = 3000
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]  # VPC CIDR
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]  # Allow all outbound
  }
}
```

---

## 6. Environment Configuration

### 6.1 Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://catalyst:password@localhost:5432/catalyst
DATABASE_SSL=false  # true in production

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=  # Set in production

# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# For EKS access
AWS_EKS_CLUSTER_NAME=catalyst-cluster

# Security Tools
TRIVY_PATH=/usr/local/bin/trivy
CHECKOV_PATH=/usr/local/bin/checkov
NVD_API_KEY=...  # For CVE lookups

# Application
NODE_ENV=development  # or production
PORT=3000
WEBSOCKET_PORT=3001
JWT_SECRET=your-256-bit-secret

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

### 6.2 Sample .env File

```bash
# .env.development
DATABASE_URL=postgresql://catalyst:catalyst123@localhost:5432/catalyst
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3001
JWT_SECRET=development-secret-do-not-use-in-production
LOG_LEVEL=debug
```

---

## 7. Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: catalyst
      POSTGRES_PASSWORD: catalyst123
      POSTGRES_DB: catalyst
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U catalyst"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://catalyst:catalyst123@postgres:5432/catalyst
      REDIS_URL: redis://redis:6379
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_REGION: ${AWS_REGION:-us-east-1}
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ~/.aws:/root/.aws:ro
      - ~/.kube:/root/.kube:ro

volumes:
  pgdata:
  redis-data:
```

---

## 8. Production Infrastructure (AWS)

### 8.1 Terraform Module

```hcl
# main.tf
module "catalyst_platform" {
  source = "./modules/catalyst"

  environment = "production"
  region      = "us-east-1"

  # VPC
  vpc_cidr = "10.0.0.0/16"
  azs      = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # EKS
  eks_cluster_name    = "catalyst-prod"
  eks_cluster_version = "1.29"
  eks_node_groups = {
    general = {
      desired_size = 3
      min_size     = 2
      max_size     = 10
      instance_types = ["m5.large"]
    }
  }

  # RDS
  rds_instance_class    = "db.r6i.large"
  rds_allocated_storage = 500
  rds_multi_az          = true

  # ElastiCache
  elasticache_node_type = "cache.t3.medium"
  elasticache_num_nodes = 2

  tags = {
    Project     = "catalyst"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

### 8.2 Architecture Diagram

```
                                     +----------------+
                                     |   CloudFront   |
                                     +-------+--------+
                                             |
                                     +-------v--------+
                                     |      ALB       |
                                     +-------+--------+
                                             |
                          +------------------+------------------+
                          |                                     |
                  +-------v--------+                   +--------v-------+
                  |   API Server   |                   | WebSocket Srv  |
                  |   (3 x t3.large)|                   | (2 x t3.medium)|
                  +-------+--------+                   +--------+-------+
                          |                                     |
          +---------------+-----------------+                   |
          |               |                 |                   |
  +-------v------+ +------v-------+ +------v-------+           |
  | RDS PostgreSQL| |  ElastiCache  | |    EKS       |<---------+
  | (Multi-AZ)    | |  (Redis)      | | (3 nodes)    |
  +---------------+ +--------------+ +--------------+
```

---

## 9. Monitoring Infrastructure

### 9.1 Required Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| API Response Time | Application | > 500ms |
| Database Connections | PostgreSQL | > 80% pool |
| Redis Memory | Redis | > 80% |
| Queue Length | BullMQ | > 1000 jobs |
| K8s Deploy Failures | Application | > 5/hour |
| Scan Errors | Application | > 10/hour |

### 9.2 CloudWatch Dashboard

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "API Response Time",
        "metrics": [
          ["Catalyst", "APIResponseTime", "Environment", "production"]
        ],
        "period": 60
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Database Connections",
        "metrics": [
          ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "catalyst-db"]
        ]
      }
    }
  ]
}
```

---

## 10. Cost Estimates

### 10.1 Development Environment

| Resource | Monthly Cost |
|----------|--------------|
| Local Docker | $0 |
| AWS (minimal) | ~$50 |
| Total | ~$50/month |

### 10.2 Production Environment

| Resource | Spec | Monthly Cost |
|----------|------|--------------|
| EKS Cluster | 3 x m5.large | ~$300 |
| RDS PostgreSQL | db.r6i.large Multi-AZ | ~$400 |
| ElastiCache Redis | 2 x cache.t3.medium | ~$100 |
| ALB | 1 | ~$25 |
| NAT Gateway | 2 | ~$100 |
| Data Transfer | ~500GB | ~$50 |
| **Total** | | **~$975/month** |

---

## Summary

To run Vintiq Catalyst with real services, you need:

| Component | Minimum | Production |
|-----------|---------|------------|
| PostgreSQL | 2 vCPU, 4GB | Multi-AZ RDS |
| Redis | 2GB | ElastiCache cluster |
| Node.js | 2 vCPU | 3+ load-balanced |
| Kubernetes | minikube | EKS 3+ nodes |
| Trivy | Installed | Installed |
| Checkov | Installed | Installed |
| AWS Account | With Cost Explorer | With all services |

**Remember**: This infrastructure supports REAL operations. No mock data, no simulations.
