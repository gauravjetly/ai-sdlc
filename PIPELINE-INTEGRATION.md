# 🔄 Vintiq Catalyst - CI/CD Pipeline Integration

## How to Run Vintiq Catalyst in Your Pipelines

The platform you've built provides **REST APIs** that your CI/CD pipelines can call. Here's how:

---

## 🎯 Pipeline Integration Methods

### Method 1: API-Based Integration (Recommended)

Your pipelines call the **102 REST APIs** to automate deployments:

```yaml
# Example: GitHub Actions
name: Deploy to Production
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via Vintiq Catalyst
        run: |
          curl -X POST http://catalyst.company.com/api/v1/deployments \
            -H "Authorization: Bearer ${{ secrets.HARMONY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "application": "my-app",
              "version": "${{ github.sha }}",
              "environment": "production",
              "cloud": "aws",
              "strategy": "canary"
            }'
```

### Method 2: MCP Tools Integration

Your AI agents can be triggered from pipelines:

```yaml
# GitLab CI example
deploy_with_ai:
  script:
    - |
      curl -X POST http://catalyst.company.com/api/v1/agents/developer-agent/execute \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
          "task": "deploy_application",
          "parameters": {
            "app": "myapp",
            "env": "prod"
          }
        }'
```

### Method 3: Platform CLI (Coming Soon)

```bash
# Future: Vintiq Catalyst CLI
catalyst deploy myapp --env prod --strategy canary
catalyst agents execute sre-agent --task health-check
catalyst clouds compare-costs --workload myapp
```

---

## 🚀 Complete Pipeline Example

### Jenkins Pipeline (Jenkinsfile)

```groovy
pipeline {
    agent any
    
    environment {
        HARMONY_API = 'http://catalyst.company.com'
        HARMONY_TOKEN = credentials('catalyst-api-token')
    }
    
    stages {
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        
        stage('Test') {
            steps {
                // Trigger QA Agent via Catalyst
                sh '''
                    curl -X POST ${HARMONY_API}/api/v1/agents/qa-agent/execute \
                      -H "Authorization: Bearer ${HARMONY_TOKEN}" \
                      -d '{"task": "run_tests", "target": "my-app"}'
                '''
            }
        }
        
        stage('Security Scan') {
            steps {
                // Trigger Security Agent
                sh '''
                    curl -X POST ${HARMONY_API}/api/v1/agents/security-agent/execute \
                      -H "Authorization: Bearer ${HARMONY_TOKEN}" \
                      -d '{"task": "scan_vulnerabilities", "target": "my-app"}'
                '''
            }
        }
        
        stage('Deploy to Dev') {
            steps {
                sh '''
                    curl -X POST ${HARMONY_API}/api/v1/deployments \
                      -H "Authorization: Bearer ${HARMONY_TOKEN}" \
                      -H "Content-Type: application/json" \
                      -d '{
                        "application": "my-app",
                        "version": "'${BUILD_NUMBER}'",
                        "environment": "dev",
                        "cloud": "aws",
                        "strategy": "rolling"
                      }'
                '''
            }
        }
        
        stage('Deploy to Prod') {
            when {
                branch 'main'
            }
            steps {
                // Use canary deployment for prod
                sh '''
                    DEPLOYMENT_ID=$(curl -X POST ${HARMONY_API}/api/v1/deployments \
                      -H "Authorization: Bearer ${HARMONY_TOKEN}" \
                      -H "Content-Type: application/json" \
                      -d '{
                        "application": "my-app",
                        "version": "'${BUILD_NUMBER}'",
                        "environment": "production",
                        "cloud": "aws",
                        "strategy": "canary"
                      }' | jq -r '.data.id')
                    
                    # Monitor deployment
                    while true; do
                        STATUS=$(curl -s ${HARMONY_API}/api/v1/deployments/${DEPLOYMENT_ID}/status \
                          -H "Authorization: Bearer ${HARMONY_TOKEN}" | jq -r '.data.status')
                        
                        if [ "$STATUS" = "completed" ]; then
                            echo "Deployment successful!"
                            break
                        elif [ "$STATUS" = "failed" ]; then
                            echo "Deployment failed!"
                            exit 1
                        fi
                        sleep 30
                    done
                '''
            }
        }
    }
    
    post {
        failure {
            // Automatic rollback via Catalyst
            sh '''
                curl -X POST ${HARMONY_API}/api/v1/deployments/${DEPLOYMENT_ID}/rollback \
                  -H "Authorization: Bearer ${HARMONY_TOKEN}"
            '''
        }
    }
}
```

---

## 📊 GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Vintiq Catalyst Deployment

on:
  push:
    branches: [main]

env:
  HARMONY_API: https://catalyst.company.com
  
jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Application
        run: npm run build
        
      - name: Run Tests via Catalyst QA Agent
        run: |
          RESULT=$(curl -X POST $HARMONY_API/api/v1/agents/qa-agent/execute \
            -H "Authorization: Bearer ${{ secrets.HARMONY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "task": "run_integration_tests",
              "target": "my-app",
              "environment": "staging"
            }')
          
          echo "Test Results: $RESULT"
          
      - name: Security Scan via Catalyst
        run: |
          curl -X POST $HARMONY_API/api/v1/agents/security-agent/execute \
            -H "Authorization: Bearer ${{ secrets.HARMONY_TOKEN }}" \
            -d '{
              "task": "scan_vulnerabilities",
              "target": "my-app"
            }'
            
      - name: Deploy to AWS via Catalyst
        run: |
          DEPLOYMENT=$(curl -X POST $HARMONY_API/api/v1/deployments \
            -H "Authorization: Bearer ${{ secrets.HARMONY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "application": "my-app",
              "version": "${{ github.sha }}",
              "environment": "production",
              "cloud": "aws",
              "region": "us-east-1",
              "strategy": "blue-green"
            }')
          
          DEPLOYMENT_ID=$(echo $DEPLOYMENT | jq -r '.data.id')
          echo "Deployment ID: $DEPLOYMENT_ID"
          
      - name: Wait for Deployment
        run: |
          for i in {1..20}; do
            STATUS=$(curl -s $HARMONY_API/api/v1/deployments/$DEPLOYMENT_ID/status \
              -H "Authorization: Bearer ${{ secrets.HARMONY_TOKEN }}" | jq -r '.data.status')
            
            echo "Deployment status: $STATUS"
            
            if [ "$STATUS" = "completed" ]; then
              echo "✅ Deployment successful!"
              exit 0
            elif [ "$STATUS" = "failed" ]; then
              echo "❌ Deployment failed!"
              exit 1
            fi
            
            sleep 30
          done
```

---

## 🔧 How It Works

### Your Current Setup:

```
Your CI/CD Pipeline
      ↓
   (API Call)
      ↓
Vintiq Catalyst Platform (localhost:3000)
      ↓
   (Routes to)
      ↓
┌─────────────────────────────────┐
│  REST API (102 endpoints)       │
│  ↓                               │
│  MCP Server (102 tools)          │
│  ↓                               │
│  AI Agents (8 agents)            │
│  ↓                               │
│  Cloud Adapters (AWS, OCI)       │
│  ↓                               │
│  Actual Cloud (AWS/OCI/etc)      │
└─────────────────────────────────┘
```

### Flow:

1. **Pipeline triggers** (git push, manual, schedule)
2. **Pipeline calls** Catalyst API
3. **Catalyst receives** deployment request
4. **AI Agents** orchestrate the deployment
5. **Cloud Adapters** deploy to actual cloud
6. **Pipeline polls** for completion
7. **Gets result** back to pipeline

---

## 🎯 Real-World Scenarios

### Scenario 1: Multi-Cloud Deployment

```bash
# Your pipeline can deploy to multiple clouds
curl -X POST ${HARMONY_API}/api/v1/clouds/deploy \
  -d '{
    "application": "myapp",
    "clouds": ["aws", "oci"],
    "strategy": "blue-green"
  }'

# Catalyst handles deployment to BOTH clouds automatically
```

### Scenario 2: Cost-Optimized Deployment

```bash
# Let FinOps agent choose cheapest cloud
curl -X POST ${HARMONY_API}/api/v1/clouds/compare-costs \
  -d '{"workload": {...}}'

# Returns: OCI is 30% cheaper
# Then deploy to OCI

curl -X POST ${HARMONY_API}/api/v1/deployments \
  -d '{"cloud": "oci", ...}'
```

### Scenario 3: AI-Driven Testing

```bash
# QA Agent runs comprehensive tests
curl -X POST ${HARMONY_API}/api/v1/agents/qa-agent/execute \
  -d '{
    "task": "full_regression",
    "coverage_threshold": 85
  }'

# Agent automatically:
# 1. Runs unit tests
# 2. Runs integration tests
# 3. Checks coverage
# 4. Reports results
```

---

## 📋 Available API Endpoints for Pipelines

### Deployment APIs
```
POST   /api/v1/deployments                    # Create deployment
GET    /api/v1/deployments/:id/status        # Check status
POST   /api/v1/deployments/:id/rollback      # Rollback
POST   /api/v1/deployments/:id/promote       # Promote env
```

### Agent APIs
```
POST   /api/v1/agents/:id/execute            # Execute agent task
GET    /api/v1/agents/:id/status             # Agent status
GET    /api/v1/agents                        # List all agents
```

### Cloud APIs
```
POST   /api/v1/clouds/deploy                 # Multi-cloud deploy
POST   /api/v1/clouds/compare-costs          # Cost comparison
POST   /api/v1/clouds/migrate                # Cloud migration
```

### Infrastructure APIs
```
POST   /api/v1/infrastructure/networks       # Create network
POST   /api/v1/infrastructure/clusters       # Create K8s
POST   /api/v1/infrastructure/databases      # Create DB
```

---

## 🔐 Authentication in Pipelines

### 1. Generate API Token

```bash
# In Catalyst platform, generate JWT token
curl -X POST http://localhost:3000/api/v1/auth/token \
  -d '{"username": "pipeline", "role": "operator"}'

# Returns: {"token": "eyJhbGc..."}
```

### 2. Store in Pipeline Secrets

**GitHub Actions:**
```
Settings → Secrets → New secret
Name: HARMONY_TOKEN
Value: eyJhbGc...
```

**Jenkins:**
```
Credentials → Add Credentials
Kind: Secret text
Secret: eyJhbGc...
ID: catalyst-api-token
```

**GitLab CI:**
```
Settings → CI/CD → Variables
Key: HARMONY_TOKEN
Value: eyJhbGc...
Protected: Yes
```

### 3. Use in Pipeline

```yaml
env:
  HARMONY_TOKEN: ${{ secrets.HARMONY_TOKEN }}
```

---

## 🚀 Production Deployment

### Deploy Catalyst Platform to Production

```bash
# 1. Deploy Catalyst API to your server/cloud
docker build -t catalyst-api src/platform
docker run -d -p 3000:3000 catalyst-api

# 2. Set up domain
catalyst.company.com → your-server:3000

# 3. Enable HTTPS
certbot --nginx -d catalyst.company.com

# 4. Configure pipelines
# Update HARMONY_API in all pipelines to:
# https://catalyst.company.com
```

---

## 💡 Summary

**How Pipelines Use Vintiq Catalyst:**

1. **Your Pipeline** → Calls Catalyst REST API
2. **Catalyst API** → Routes to AI agents
3. **AI Agents** → Orchestrate deployment
4. **Cloud Adapters** → Deploy to actual cloud
5. **Results** → Return to pipeline

**Benefits:**

✅ **Single API** for all clouds (AWS, OCI, Azure, GCP)
✅ **AI-powered** decisions (cost, performance, reliability)
✅ **Zero-downtime** deployments automatically
✅ **Self-healing** if issues occur
✅ **Cost-optimized** cloud selection
✅ **Consistent** interface across all clouds

**Your pipelines stay simple:**
```bash
# Instead of complex cloud-specific commands:
aws eks update-kubeconfig...
kubectl apply -f...
kubectl rollout status...

# You just call:
curl catalyst.company.com/api/v1/deployments -d {...}
```

**Catalyst handles all the complexity!** 🚀

---

**Next Steps:**

1. Deploy Catalyst API to production server
2. Get API token for your pipeline
3. Update pipeline to call Catalyst APIs
4. Let AI agents handle the rest!

