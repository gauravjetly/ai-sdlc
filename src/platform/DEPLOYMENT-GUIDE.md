# 🚀 Vintiq Harmony - Deployment Guide

## Overview

This guide covers deploying Vintiq Harmony to various environments.

---

## 📋 Prerequisites

### Required Software
- **Docker** 20.10+
- **Docker Compose** 2.0+
- **kubectl** 1.24+ (for Kubernetes deployment)
- **Node.js** 18+ (for local development)

### Cloud Resources (for production)
- **Kubernetes cluster** (EKS, OKE, AKS, or GKE)
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Domain name** with DNS control
- **SSL certificate** (Let's Encrypt via cert-manager)

---

## 🎯 Deployment Options

### Option 1: Docker Compose (Recommended for Testing)

**Best for**: Local development, testing, demos

```bash
# 1. Navigate to platform directory
cd /Users/gauravjetly/aisdlc-2.1.0/src/platform

# 2. Create .env file from template
cp .env.example .env

# 3. Edit .env with your credentials
nano .env

# 4. Run deployment script
./deploy-production.sh

# 5. Select option 1 (Docker Compose)
```

**Access your application:**
- **Web UI**: http://localhost
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs

---

## 🚀 Quick Deploy Now

Run the deployment:

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/platform
./deploy-production.sh
```

Then select your deployment option!
