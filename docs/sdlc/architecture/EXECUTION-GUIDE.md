# Execution Guide: How to Execute Each Service

## Overview

This guide provides step-by-step instructions for executing real operations in the Deltek Catalyst platform. Every operation described here performs REAL actions - there is no mock data.

---

## 1. Deployment Service Execution

### 1.1 Prerequisites

```bash
# Required tools
kubectl version --client  # Must be >= 1.28
aws --version            # AWS CLI v2

# Required credentials
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
```

### 1.2 How Deployments Execute

```
Step 1: Retrieve Cluster Credentials
+------------------------------------------+
| Call AWS EKS API to get cluster config   |
|                                          |
| aws eks describe-cluster --name <name>   |
| aws eks get-token --cluster-name <name>  |
|                                          |
| Result: kubeconfig with auth token       |
+------------------------------------------+
                    |
                    v
Step 2: Initialize Kubernetes Client
+------------------------------------------+
| Load kubeconfig into @kubernetes/client  |
|                                          |
| const kc = new KubeConfig();             |
| kc.loadFromString(kubeconfigYaml);       |
| const api = kc.makeApiClient(AppsV1Api); |
|                                          |
| Result: Authenticated K8s client         |
+------------------------------------------+
                    |
                    v
Step 3: Create Namespace (if needed)
+------------------------------------------+
| api.createNamespace({                    |
|   metadata: { name: 'my-app-prod' }      |
| });                                      |
|                                          |
| K8s API creates the namespace            |
+------------------------------------------+
                    |
                    v
Step 4: Apply Deployment Manifest
+------------------------------------------+
| api.createNamespacedDeployment(          |
|   namespace,                             |
|   deploymentManifest                     |
| );                                       |
|                                          |
| K8s API creates Deployment resource      |
| Deployment controller starts pods        |
+------------------------------------------+
                    |
                    v
Step 5: Create Service for Networking
+------------------------------------------+
| api.createNamespacedService(             |
|   namespace,                             |
|   serviceManifest                        |
| );                                       |
|                                          |
| K8s creates Service & load balancer      |
+------------------------------------------+
                    |
                    v
Step 6: Monitor Rollout Status
+------------------------------------------+
| Poll every 5 seconds:                    |
|                                          |
| api.readNamespacedDeploymentStatus(      |
|   deploymentName,                        |
|   namespace                              |
| );                                       |
|                                          |
| Check: status.readyReplicas ==           |
|        spec.replicas                     |
|                                          |
| Send WebSocket updates to frontend       |
+------------------------------------------+
                    |
                    v
Step 7: Update Database
+------------------------------------------+
| INSERT INTO deployments (                |
|   id, name, k8s_uid, status, ...        |
| ) VALUES (...);                          |
|                                          |
| Real data persisted in PostgreSQL        |
+------------------------------------------+
```

### 1.3 Code Example: Real Deployment

```typescript
async function deployApplication(config: DeploymentConfig) {
  // 1. Get cluster credentials from AWS
  const eksClient = new EKSClient({ region: config.region });
  const clusterInfo = await eksClient.send(
    new DescribeClusterCommand({ name: config.clusterName })
  );

  // 2. Get authentication token
  const stsClient = new STSClient({ region: config.region });
  const token = await getToken({
    clusterName: config.clusterName,
    stsClient
  });

  // 3. Build kubeconfig
  const kubeconfig = {
    apiVersion: 'v1',
    kind: 'Config',
    clusters: [{
      name: config.clusterName,
      cluster: {
        server: clusterInfo.cluster.endpoint,
        'certificate-authority-data': clusterInfo.cluster.certificateAuthority.data
      }
    }],
    contexts: [{
      name: 'default',
      context: { cluster: config.clusterName, user: 'aws' }
    }],
    'current-context': 'default',
    users: [{
      name: 'aws',
      user: { token }
    }]
  };

  // 4. Initialize K8s client
  const kc = new KubeConfig();
  kc.loadFromString(yaml.dump(kubeconfig));
  const appsApi = kc.makeApiClient(AppsV1Api);

  // 5. Create deployment
  const manifest = buildDeploymentManifest(config);
  const response = await appsApi.createNamespacedDeployment(
    config.namespace,
    manifest
  );

  // 6. Return real deployment info
  return {
    id: uuid(),
    k8sName: response.body.metadata.name,
    k8sUid: response.body.metadata.uid,
    status: 'deploying'
  };
}
```

### 1.4 Rollback Execution

```typescript
async function rollbackDeployment(deploymentId: string) {
  // Get deployment record
  const deployment = await db.query(
    'SELECT * FROM deployments WHERE id = $1',
    [deploymentId]
  );

  // Get previous revision
  const previousRevision = await db.query(
    'SELECT * FROM deployment_history WHERE deployment_id = $1 ORDER BY revision DESC LIMIT 1 OFFSET 1',
    [deploymentId]
  );

  // Apply previous manifest (real K8s operation)
  await appsApi.replaceNamespacedDeployment(
    deployment.k8s_deployment_name,
    deployment.namespace,
    previousRevision.manifest
  );

  // K8s controller handles pod replacement
}
```

---

## 2. Cloud Resource Service Execution

### 2.1 VPC Creation (AWS)

```
Step 1: Create VPC
+------------------------------------------+
| ec2.send(new CreateVpcCommand({          |
|   CidrBlock: '10.0.0.0/16',              |
|   TagSpecifications: [...]               |
| }));                                     |
|                                          |
| AWS creates VPC, returns vpc-xxxxx       |
+------------------------------------------+
                    |
                    v
Step 2: Create Subnets
+------------------------------------------+
| For each AZ:                             |
| ec2.send(new CreateSubnetCommand({       |
|   VpcId: vpcId,                          |
|   CidrBlock: '10.0.x.0/24',             |
|   AvailabilityZone: 'us-east-1a'        |
| }));                                     |
|                                          |
| AWS creates subnets in each AZ           |
+------------------------------------------+
                    |
                    v
Step 3: Create Internet Gateway
+------------------------------------------+
| ec2.send(new CreateInternetGatewayCommand({...}));
| ec2.send(new AttachInternetGatewayCommand({
|   VpcId: vpcId,
|   InternetGatewayId: igwId
| }));                                     |
|                                          |
| Enables internet access for VPC          |
+------------------------------------------+
                    |
                    v
Step 4: Create Route Table
+------------------------------------------+
| ec2.send(new CreateRouteTableCommand({...}));
| ec2.send(new CreateRouteCommand({        |
|   RouteTableId: rtId,                    |
|   DestinationCidrBlock: '0.0.0.0/0',    |
|   GatewayId: igwId                       |
| }));                                     |
|                                          |
| Routes internet traffic through IGW      |
+------------------------------------------+
                    |
                    v
Step 5: Persist to Database
+------------------------------------------+
| INSERT INTO cloud_resources (            |
|   resource_type: 'vpc',                  |
|   resource_id: 'vpc-12345',              |
|   config: { subnets: [...], ... }        |
| );                                       |
+------------------------------------------+
```

### 2.2 EKS Cluster Creation

```typescript
async function createCluster(config: ClusterConfig) {
  // 1. Create EKS cluster (takes 10-15 minutes)
  const eksClient = new EKSClient({ region: config.region });

  const cluster = await eksClient.send(new CreateClusterCommand({
    name: config.name,
    version: '1.29',
    roleArn: config.clusterRoleArn,
    resourcesVpcConfig: {
      subnetIds: config.subnetIds,
      securityGroupIds: config.securityGroupIds,
      endpointPublicAccess: true,
      endpointPrivateAccess: true
    },
    logging: {
      clusterLogging: [{
        types: ['api', 'audit', 'authenticator'],
        enabled: true
      }]
    }
  }));

  // 2. Wait for cluster to be ACTIVE
  let status = 'CREATING';
  while (status !== 'ACTIVE') {
    await sleep(30000); // Wait 30 seconds

    const response = await eksClient.send(new DescribeClusterCommand({
      name: config.name
    }));

    status = response.cluster.status;

    // Emit WebSocket update
    websocket.emit(`resource:${config.name}`, {
      status,
      message: `Cluster is ${status}`
    });

    if (status === 'FAILED') {
      throw new Error('Cluster creation failed');
    }
  }

  // 3. Create node group
  await eksClient.send(new CreateNodegroupCommand({
    clusterName: config.name,
    nodegroupName: `${config.name}-nodes`,
    nodeRole: config.nodeRoleArn,
    subnets: config.subnetIds,
    scalingConfig: {
      minSize: 2,
      maxSize: 10,
      desiredSize: 3
    },
    instanceTypes: ['m5.large']
  }));

  // 4. Wait for node group to be ACTIVE
  // (similar polling loop)

  return {
    id: uuid(),
    resourceId: cluster.cluster.arn,
    endpoint: cluster.cluster.endpoint,
    status: 'active'
  };
}
```

### 2.3 RDS Database Creation

```typescript
async function createDatabase(config: DatabaseConfig) {
  const rdsClient = new RDSClient({ region: config.region });

  // Create RDS instance (takes 5-15 minutes)
  const db = await rdsClient.send(new CreateDBInstanceCommand({
    DBInstanceIdentifier: config.name,
    DBInstanceClass: config.instanceClass || 'db.t3.medium',
    Engine: 'postgres',
    EngineVersion: '15.4',
    MasterUsername: config.username,
    MasterUserPassword: config.password, // From secrets manager
    AllocatedStorage: 100,
    StorageType: 'gp3',
    VpcSecurityGroupIds: config.securityGroupIds,
    DBSubnetGroupName: config.subnetGroup,
    MultiAZ: config.environment === 'production',
    StorageEncrypted: true,
    BackupRetentionPeriod: 30
  }));

  // Wait for database to be available
  let status = 'creating';
  while (status !== 'available') {
    await sleep(30000);

    const response = await rdsClient.send(new DescribeDBInstancesCommand({
      DBInstanceIdentifier: config.name
    }));

    status = response.DBInstances[0].DBInstanceStatus;

    websocket.emit(`resource:${config.name}`, { status });
  }

  return {
    id: uuid(),
    resourceId: db.DBInstance.DBInstanceArn,
    endpoint: db.DBInstance.Endpoint.Address,
    port: db.DBInstance.Endpoint.Port,
    status: 'available'
  };
}
```

---

## 3. Agent Execution Guide

### 3.1 BullMQ Job Queue Architecture

```
                    +------------------+
                    |   API Request    |
                    |   POST /execute  |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   BullMQ Queue   |
                    |   (Redis-backed) |
                    +--------+---------+
                             |
          +------------------+------------------+
          |                  |                  |
          v                  v                  v
    +-----------+      +-----------+      +-----------+
    | Worker 1  |      | Worker 2  |      | Worker 3  |
    | (security)|      | (devops)  |      | (finops)  |
    +-----------+      +-----------+      +-----------+
          |                  |                  |
          v                  v                  v
    +-----------+      +-----------+      +-----------+
    |   Trivy   |      | kubectl   |      | Cost API  |
    |   npm     |      | terraform |      | CloudWatch|
    +-----------+      +-----------+      +-----------+
          |                  |                  |
          +------------------+------------------+
                             |
                             v
                    +------------------+
                    |    PostgreSQL    |
                    |  (Results + Logs)|
                    +------------------+
                             |
                             v
                    +------------------+
                    |    WebSocket     |
                    | (Real-time UI)   |
                    +------------------+
```

### 3.2 Security Agent Execution

```bash
# What actually runs when security agent executes

# Container vulnerability scan
trivy image --format json nginx:latest
# Returns: JSON with all CVEs found

# Dependency audit (npm)
npm audit --json
# Returns: JSON with vulnerable packages

# Infrastructure scan
checkov -d ./terraform --output json
# Returns: JSON with misconfigurations
```

```typescript
async function executeSecurityScan(task: SecurityTask) {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  // Log start
  await logToExecution(task.executionId, 'Starting security scan...');

  // Run REAL Trivy scan
  const { stdout } = await execAsync(
    `trivy image --format json ${task.target}`,
    { maxBuffer: 50 * 1024 * 1024 }
  );

  const results = JSON.parse(stdout);

  // Process vulnerabilities
  const vulnerabilities = results.Results.flatMap(r =>
    r.Vulnerabilities || []
  );

  // Log results
  await logToExecution(
    task.executionId,
    `Found ${vulnerabilities.length} vulnerabilities`
  );

  // Store in database
  await db.query(
    'INSERT INTO security_scans (scan_id, target, results) VALUES ($1, $2, $3)',
    [task.scanId, task.target, JSON.stringify(vulnerabilities)]
  );

  return vulnerabilities;
}
```

### 3.3 FinOps Agent Execution

```typescript
async function executeFinOpsAnalysis(task: FinOpsTask) {
  const costExplorer = new CostExplorerClient({
    region: 'us-east-1' // Cost Explorer only in us-east-1
  });

  // Get REAL costs from AWS
  const costs = await costExplorer.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: task.startDate,
      End: task.endDate
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
  }));

  // Get REAL rightsizing recommendations
  const recommendations = await costExplorer.send(
    new GetRightsizingRecommendationCommand({
      Service: 'AmazonEC2'
    })
  );

  // Process and return real data
  return {
    totalCost: costs.ResultsByTime.reduce((sum, day) =>
      sum + parseFloat(day.Total.UnblendedCost.Amount), 0
    ),
    recommendations: recommendations.RightsizingRecommendations.map(r => ({
      instanceId: r.CurrentInstance.ResourceId,
      currentType: r.CurrentInstance.InstanceType,
      recommendedType: r.ModifyRecommendationDetail?.TargetInstances?.[0]?.InstanceType,
      savings: r.ModifyRecommendationDetail?.TargetInstances?.[0]?.EstimatedMonthlySavings
    }))
  };
}
```

### 3.4 Scheduling with Cron

```typescript
import * as cron from 'node-cron';

// Schedule security agent to run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  await agentService.executeAgent('security-agent', {
    type: 'daily_scan',
    params: {}
  });
});

// Schedule FinOps agent to run weekly on Monday
cron.schedule('0 8 * * 1', async () => {
  await agentService.executeAgent('finops-agent', {
    type: 'weekly_report',
    params: {}
  });
});
```

---

## 4. Cost Analysis Execution

### 4.1 Getting Real Cost Data

```typescript
async function getCurrentCosts() {
  const costExplorer = new CostExplorerClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  // Get month-to-date costs (REAL DATA)
  const response = await costExplorer.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: getFirstDayOfMonth(),
      End: getTodayDate()
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost', 'UsageQuantity'],
    GroupBy: [
      { Type: 'DIMENSION', Key: 'SERVICE' }
    ]
  }));

  // Process REAL response
  const costByService = {};
  let total = 0;

  response.ResultsByTime.forEach(day => {
    day.Groups.forEach(group => {
      const service = group.Keys[0];
      const cost = parseFloat(group.Metrics.UnblendedCost.Amount);
      costByService[service] = (costByService[service] || 0) + cost;
      total += cost;
    });
  });

  return {
    total,
    currency: 'USD',
    byService: costByService,
    lastUpdated: new Date().toISOString()
  };
}
```

### 4.2 Applying Cost Optimizations

```typescript
async function applyRightsizingRecommendation(instanceId: string, newType: string) {
  const ec2 = new EC2Client({});

  // Step 1: Stop the instance (REAL)
  console.log(`Stopping instance ${instanceId}...`);
  await ec2.send(new StopInstancesCommand({
    InstanceIds: [instanceId]
  }));

  // Step 2: Wait for stopped state (REAL polling)
  let state = 'stopping';
  while (state !== 'stopped') {
    await sleep(10000);
    const response = await ec2.send(new DescribeInstancesCommand({
      InstanceIds: [instanceId]
    }));
    state = response.Reservations[0].Instances[0].State.Name;
    console.log(`Instance state: ${state}`);
  }

  // Step 3: Modify instance type (REAL)
  console.log(`Changing instance type to ${newType}...`);
  await ec2.send(new ModifyInstanceAttributeCommand({
    InstanceId: instanceId,
    InstanceType: { Value: newType }
  }));

  // Step 4: Start the instance (REAL)
  console.log(`Starting instance ${instanceId}...`);
  await ec2.send(new StartInstancesCommand({
    InstanceIds: [instanceId]
  }));

  // Step 5: Wait for running state
  state = 'pending';
  while (state !== 'running') {
    await sleep(10000);
    const response = await ec2.send(new DescribeInstancesCommand({
      InstanceIds: [instanceId]
    }));
    state = response.Reservations[0].Instances[0].State.Name;
  }

  return {
    success: true,
    instanceId,
    newType,
    message: 'Instance resized successfully'
  };
}
```

---

## 5. Security Scanning Execution

### 5.1 Container Scanning with Trivy

```bash
# Install Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -

# Run scan (what the service actually executes)
trivy image --format json nginx:1.21

# Output: Real vulnerabilities from NVD, Alpine SecDB, etc.
{
  "Results": [
    {
      "Target": "nginx:1.21",
      "Vulnerabilities": [
        {
          "VulnerabilityID": "CVE-2021-44228",
          "PkgName": "log4j",
          "InstalledVersion": "2.14.0",
          "FixedVersion": "2.17.0",
          "Severity": "CRITICAL",
          "Title": "Remote code execution..."
        }
      ]
    }
  ]
}
```

### 5.2 Dependency Audit Execution

```typescript
async function auditNpmDependencies(projectPath: string) {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  // Run REAL npm audit
  let auditResult;
  try {
    auditResult = await execAsync('npm audit --json', {
      cwd: projectPath
    });
  } catch (error) {
    // npm audit exits with code 1 if vulnerabilities found
    auditResult = error;
  }

  const audit = JSON.parse(auditResult.stdout || '{}');

  // Process REAL vulnerabilities
  const vulnerabilities = Object.entries(audit.vulnerabilities || {}).map(
    ([pkg, data]: [string, any]) => ({
      package: pkg,
      severity: data.severity,
      via: data.via,
      range: data.range,
      fixAvailable: data.fixAvailable
    })
  );

  return vulnerabilities;
}
```

### 5.3 Infrastructure Scanning with Checkov

```bash
# Install Checkov
pip install checkov

# Run scan (what the service actually executes)
checkov -d ./terraform --output json

# Output: Real misconfigurations
{
  "results": {
    "failed_checks": [
      {
        "check_id": "CKV_AWS_20",
        "check_name": "Ensure S3 bucket is not publicly accessible",
        "file_path": "/s3.tf",
        "resource": "aws_s3_bucket.data",
        "guideline": "..."
      }
    ],
    "passed_checks": [...],
    "skipped_checks": [...]
  }
}
```

---

## 6. WebSocket Real-Time Updates

### 6.1 Server Setup

```typescript
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Emit real deployment updates
async function monitorDeployment(deploymentId: string) {
  while (true) {
    const status = await getDeploymentStatus(deploymentId);

    // Send REAL status to connected clients
    io.emit(`deployment:${deploymentId}`, {
      type: 'status_update',
      data: {
        status: status.status,
        replicas: status.replicas,
        readyReplicas: status.readyReplicas,
        progress: calculateProgress(status),
        conditions: status.conditions
      }
    });

    if (status.status === 'completed' || status.status === 'failed') {
      break;
    }

    await sleep(5000);
  }
}
```

### 6.2 Client Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Subscribe to real deployment updates
socket.on(`deployment:${deploymentId}`, (event) => {
  // Update UI with REAL data
  setDeploymentStatus(event.data);
});

// Subscribe to real agent logs
socket.on(`agent:${executionId}`, (event) => {
  if (event.type === 'log') {
    appendLog(event.message); // Real log line
  } else if (event.type === 'progress') {
    setProgress(event.progress); // Real progress
  }
});
```

---

## 7. Error Handling

### 7.1 Real Error Scenarios

```typescript
// AWS API errors
try {
  await ec2.send(new CreateVpcCommand({...}));
} catch (error) {
  if (error.name === 'VpcLimitExceeded') {
    throw new Error('VPC limit reached in this region');
  }
  if (error.name === 'UnauthorizedOperation') {
    throw new Error('Insufficient IAM permissions');
  }
  throw error;
}

// Kubernetes errors
try {
  await k8sApi.createNamespacedDeployment(namespace, manifest);
} catch (error) {
  if (error.response?.statusCode === 409) {
    throw new Error('Deployment already exists');
  }
  if (error.response?.statusCode === 403) {
    throw new Error('RBAC permission denied');
  }
  throw error;
}

// Trivy scan errors
try {
  await execAsync(`trivy image ${imageUri}`);
} catch (error) {
  if (error.message.includes('unauthorized')) {
    throw new Error('Cannot pull image - authentication required');
  }
  if (error.message.includes('not found')) {
    throw new Error('Image not found in registry');
  }
  throw error;
}
```

---

## 8. Required Permissions

### 8.1 AWS IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVpc",
        "ec2:CreateSubnet",
        "ec2:CreateInternetGateway",
        "ec2:AttachInternetGateway",
        "ec2:CreateRouteTable",
        "ec2:CreateRoute",
        "ec2:DescribeVpcs",
        "ec2:DeleteVpc",
        "ec2:ModifyInstanceAttribute",
        "ec2:StopInstances",
        "ec2:StartInstances",
        "ec2:DescribeInstances"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "eks:CreateCluster",
        "eks:DeleteCluster",
        "eks:DescribeCluster",
        "eks:CreateNodegroup",
        "eks:DeleteNodegroup"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:CreateDBInstance",
        "rds:DeleteDBInstance",
        "rds:DescribeDBInstances"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetRightsizingRecommendation",
        "ce:GetReservationUtilization"
      ],
      "Resource": "*"
    }
  ]
}
```

### 8.2 Kubernetes RBAC

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: catalyst-deployer
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["create", "get", "list", "update", "delete", "patch"]
  - apiGroups: [""]
    resources: ["namespaces", "services", "pods", "pods/log"]
    verbs: ["create", "get", "list", "delete", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: catalyst-deployer-binding
subjects:
  - kind: ServiceAccount
    name: catalyst-sa
    namespace: catalyst-system
roleRef:
  kind: ClusterRole
  name: catalyst-deployer
  apiGroup: rbac.authorization.k8s.io
```

---

## Summary

Every operation in this guide performs **REAL** actions:

| Operation | What Actually Happens |
|-----------|----------------------|
| Deploy | Real K8s API creates pods |
| Create VPC | Real AWS API creates VPC |
| Create Cluster | Real EKS cluster (10-15 min) |
| Create Database | Real RDS instance (5-15 min) |
| Run Agent | Real commands execute |
| Security Scan | Real Trivy/Checkov output |
| Cost Analysis | Real AWS Cost Explorer data |
| Apply Optimization | Real instance resize |

**NO MOCK DATA. NO SIMULATIONS. ONLY REAL OPERATIONS.**
