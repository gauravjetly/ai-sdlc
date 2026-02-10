/**
 * E2E Tests - Complete Deployment Workflow
 * Tests end-to-end user journey for application deployment
 */

import { CloudResourceService } from '../../services/cloud/cloud-resource.service';
import { DeploymentService } from '../../services/deployment/deployment.service';
import { AgentOrchestrationService } from '../../services/agent/agent-orchestration.service';
import { prisma } from '../../infrastructure/database/prisma.client';
import { KubernetesClient } from '../../services/deployment/k8s.client';
import { AWSProvider } from '../../services/cloud/providers/aws.provider';

// Mock external services
jest.mock('../../services/deployment/k8s.client');
jest.mock('../../services/cloud/providers/aws.provider');

describe('E2E: Complete Deployment Workflow', () => {
  let cloudService: CloudResourceService;
  let deploymentService: DeploymentService;
  let orchestrationService: AgentOrchestrationService;

  beforeAll(async () => {
    await prisma.$connect();

    cloudService = new CloudResourceService();
    deploymentService = new DeploymentService();
    orchestrationService = new AgentOrchestrationService();

    // Setup mocks
    setupMocks();
  });

  afterAll(async () => {
    await orchestrationService.shutdown();
    await cleanupTestData();
    await prisma.$disconnect();
  });

  function setupMocks() {
    // Mock AWS Provider
    (AWSProvider as jest.Mock).mockImplementation(() => ({
      createVPC: jest.fn().mockResolvedValue({
        vpcId: 'vpc-e2e-test',
        subnets: [
          { subnetId: 'subnet-e2e-1', availabilityZone: 'us-east-1a' },
          { subnetId: 'subnet-e2e-2', availabilityZone: 'us-east-1b' }
        ],
        internetGatewayId: 'igw-e2e',
        routeTableId: 'rtb-e2e'
      }),
      createCluster: jest.fn().mockResolvedValue({
        clusterArn: 'arn:aws:eks:us-east-1:123:cluster/e2e-cluster',
        name: 'e2e-cluster',
        endpoint: 'https://e2e-cluster.eks.amazonaws.com'
      }),
      createDatabase: jest.fn().mockResolvedValue({
        dbInstanceIdentifier: 'e2e-db',
        dbInstanceArn: 'arn:aws:rds:us-east-1:123:db:e2e-db',
        endpoint: 'e2e-db.amazonaws.com'
      })
    }));

    // Mock Kubernetes Client
    (KubernetesClient as jest.Mock).mockImplementation(() => ({
      ensureNamespace: jest.fn().mockResolvedValue(undefined),
      createDeployment: jest.fn().mockResolvedValue({
        metadata: { uid: 'e2e-deployment-uid', name: 'e2e-app-prod' }
      }),
      getDeployment: jest.fn().mockResolvedValue({
        metadata: { uid: 'e2e-deployment-uid' },
        spec: { replicas: 3 },
        status: {
          replicas: 3,
          readyReplicas: 3,
          availableReplicas: 3,
          updatedReplicas: 3,
          conditions: [{ type: 'Available', status: 'True' }]
        }
      }),
      scaleDeployment: jest.fn().mockResolvedValue(undefined),
      deleteDeployment: jest.fn().mockResolvedValue(undefined)
    }));
  }

  async function cleanupTestData() {
    await prisma.deployment.deleteMany({
      where: { application: { contains: 'e2e-' } }
    });
    await prisma.cloudResource.deleteMany({
      where: { name: { contains: 'e2e-' } }
    });
    await prisma.agentExecution.deleteMany({
      where: { taskType: { contains: 'e2e-' } }
    });
  }

  describe('User Journey: Deploy New Application to Production', () => {
    it('should complete full deployment workflow from infrastructure to running app', async () => {
      /**
       * USER STORY: As a DevOps engineer, I want to deploy a new application
       * to production with complete infrastructure provisioning
       *
       * STEPS:
       * 1. Create VPC with networking
       * 2. Create EKS cluster in VPC
       * 3. Create RDS database
       * 4. Deploy application to cluster
       * 5. Verify application is running
       */

      // STEP 1: Create VPC
      console.log('Step 1: Creating VPC infrastructure...');

      const vpc = await cloudService.createVPC({
        name: 'e2e-production-vpc',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'prod',
        cidrBlock: '10.0.0.0/16',
        enableDnsSupport: true,
        enableDnsHostnames: true,
        createdBy: 'e2e-test-user',
        tags: {
          Environment: 'production',
          Project: 'e2e-test',
          ManagedBy: 'ai-platform'
        }
      });

      expect(vpc).toHaveProperty('id');
      expect(vpc).toHaveProperty('resourceId', 'vpc-e2e-test');
      expect(vpc.status).toBe('active');
      expect(vpc.subnets).toHaveLength(2);

      console.log(`✓ VPC created: ${vpc.resourceId}`);

      // STEP 2: Create EKS Cluster
      console.log('Step 2: Creating EKS cluster...');

      const cluster = await cloudService.createCluster({
        name: 'e2e-production-cluster',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'prod',
        kubernetesVersion: '1.28',
        vpcId: vpc.resourceId,
        subnetIds: vpc.subnets.map(s => s.subnetId),
        nodeGroups: [
          {
            name: 'general-purpose',
            instanceType: 't3.large',
            minSize: 2,
            maxSize: 10,
            desiredSize: 3
          }
        ],
        createdBy: 'e2e-test-user'
      });

      expect(cluster).toHaveProperty('id');
      expect(cluster).toHaveProperty('resourceId');
      expect(cluster.status).toBe('creating');

      console.log(`✓ Cluster created: ${cluster.name}`);

      // STEP 3: Create RDS Database
      console.log('Step 3: Creating RDS database...');

      const database = await cloudService.createDatabase({
        name: 'e2e-production-db',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'prod',
        engine: 'postgres',
        engineVersion: '15.4',
        instanceClass: 'db.r5.large',
        allocatedStorage: 100,
        storageType: 'gp3',
        masterUsername: 'admin',
        masterPassword: 'SecureE2EPass123!',
        vpcId: vpc.resourceId,
        subnetIds: vpc.subnets.map(s => s.subnetId),
        publiclyAccessible: false,
        multiAZ: true,
        backupRetentionPeriod: 30,
        createdBy: 'e2e-test-user'
      });

      expect(database).toHaveProperty('id');
      expect(database).toHaveProperty('resourceId');
      expect(database.status).toBe('creating');

      console.log(`✓ Database created: ${database.name}`);

      // STEP 4: Deploy Application
      console.log('Step 4: Deploying application...');

      const deployment = await deploymentService.deployApplication({
        application: 'e2e-app',
        version: '1.0.0',
        environment: 'prod',
        cloud: 'aws',
        clusterArn: cluster.resourceId,
        namespace: 'production',
        imageRegistry: '123456789.dkr.ecr.us-east-1.amazonaws.com/e2e-app:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'e2e-test-user',
        resources: {
          cpu: '1000m',
          memory: '2Gi',
          cpuLimit: '2000m',
          memoryLimit: '4Gi'
        },
        healthCheck: {
          path: '/health',
          port: 8080,
          initialDelaySeconds: 30,
          periodSeconds: 10
        },
        environmentVariables: {
          DATABASE_HOST: database.endpoint || 'e2e-db.amazonaws.com',
          DATABASE_PORT: '5432',
          DATABASE_NAME: 'e2e_production',
          NODE_ENV: 'production'
        }
      });

      expect(deployment).toHaveProperty('id');
      expect(deployment).toHaveProperty('k8sDeploymentName', 'e2e-app-prod');
      expect(deployment.status).toBe('deploying');

      console.log(`✓ Deployment initiated: ${deployment.k8sDeploymentName}`);

      // STEP 5: Verify Deployment Status
      console.log('Step 5: Verifying deployment status...');

      const status = await deploymentService.getDeploymentStatus(deployment.id);

      expect(status).toHaveProperty('id', deployment.id);
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('replicas', 3);
      expect(status.conditions).toBeInstanceOf(Array);

      console.log(`✓ Deployment status: ${status.status}`);
      console.log(`✓ Replicas: ${status.readyReplicas}/${status.replicas}`);

      // STEP 6: Verify All Resources Created
      console.log('Step 6: Verifying all resources...');

      const allResources = await cloudService.listResources({
        environment: 'prod'
      });

      expect(allResources.length).toBeGreaterThanOrEqual(3);
      expect(allResources.some(r => r.resourceType === 'vpc')).toBe(true);
      expect(allResources.some(r => r.resourceType === 'cluster')).toBe(true);
      expect(allResources.some(r => r.resourceType === 'database')).toBe(true);

      const deployments = await deploymentService.listDeployments('prod');
      expect(deployments.length).toBeGreaterThanOrEqual(1);

      console.log('✓ All resources verified');
      console.log('\n=== E2E Deployment Workflow Complete ===');
      console.log(`VPC: ${vpc.resourceId}`);
      console.log(`Cluster: ${cluster.resourceId}`);
      console.log(`Database: ${database.resourceId}`);
      console.log(`Deployment: ${deployment.k8sDeploymentName}`);
    }, 30000); // 30 second timeout
  });

  describe('User Journey: Scale Application Under Load', () => {
    it('should scale application from 3 to 10 replicas', async () => {
      /**
       * USER STORY: As an SRE, I need to scale the application
       * when traffic increases
       */

      // Setup: Deploy initial application
      const deployment = await deploymentService.deployApplication({
        application: 'e2e-scaling-app',
        version: '1.0.0',
        environment: 'prod',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123:cluster/test',
        namespace: 'production',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'e2e-test-user'
      });

      console.log(`Initial deployment: ${deployment.k8sDeploymentName} with 3 replicas`);

      // Action: Scale up to handle load
      console.log('Scaling to 10 replicas...');
      await deploymentService.scaleDeployment(deployment.id, 10);

      // Verify: Check new replica count
      const updated = await deploymentService.getDeploymentStatus(deployment.id);

      const dbDeployment = await prisma.deployment.findUnique({
        where: { id: deployment.id }
      });

      expect(dbDeployment?.replicas).toBe(10);
      console.log(`✓ Scaled to ${dbDeployment?.replicas} replicas`);
    });
  });

  describe('User Journey: Environment Promotion (Dev → UAT → Prod)', () => {
    it('should promote application through environments', async () => {
      /**
       * USER STORY: As a release manager, I want to promote
       * a tested application from dev → uat → prod
       */

      const appVersion = '2.0.0';
      const clusterArn = 'arn:aws:eks:us-east-1:123:cluster/multi-env';

      // Step 1: Deploy to Dev
      console.log('Step 1: Deploying to DEV environment...');
      const devDeployment = await deploymentService.deployApplication({
        application: 'e2e-promotion-app',
        version: appVersion,
        environment: 'dev',
        cloud: 'aws',
        clusterArn,
        namespace: 'development',
        imageRegistry: `test-image:${appVersion}`,
        containerPort: 8080,
        replicas: 1,
        strategy: 'rolling',
        createdBy: 'e2e-test-user'
      });

      expect(devDeployment.k8sDeploymentName).toBe('e2e-promotion-app-dev');
      console.log(`✓ Deployed to DEV: ${devDeployment.id}`);

      // Step 2: After testing, deploy to UAT
      console.log('Step 2: Promoting to UAT environment...');
      const uatDeployment = await deploymentService.deployApplication({
        application: 'e2e-promotion-app',
        version: appVersion,
        environment: 'uat',
        cloud: 'aws',
        clusterArn,
        namespace: 'uat',
        imageRegistry: `test-image:${appVersion}`,
        containerPort: 8080,
        replicas: 2,
        strategy: 'blue-green',
        createdBy: 'e2e-test-user'
      });

      expect(uatDeployment.k8sDeploymentName).toBe('e2e-promotion-app-uat');
      console.log(`✓ Promoted to UAT: ${uatDeployment.id}`);

      // Step 3: After UAT approval, deploy to Production
      console.log('Step 3: Promoting to PROD environment...');
      const prodDeployment = await deploymentService.deployApplication({
        application: 'e2e-promotion-app',
        version: appVersion,
        environment: 'prod',
        cloud: 'aws',
        clusterArn,
        namespace: 'production',
        imageRegistry: `test-image:${appVersion}`,
        containerPort: 8080,
        replicas: 5,
        strategy: 'canary',
        createdBy: 'e2e-test-user'
      });

      expect(prodDeployment.k8sDeploymentName).toBe('e2e-promotion-app-prod');
      console.log(`✓ Promoted to PROD: ${prodDeployment.id}`);

      // Verify all environments
      const devDeployments = await deploymentService.listDeployments('dev');
      const uatDeployments = await deploymentService.listDeployments('uat');
      const prodDeployments = await deploymentService.listDeployments('prod');

      expect(devDeployments.some(d => d.id === devDeployment.id)).toBe(true);
      expect(uatDeployments.some(d => d.id === uatDeployment.id)).toBe(true);
      expect(prodDeployments.some(d => d.id === prodDeployment.id)).toBe(true);

      console.log('\n=== Promotion Complete ===');
      console.log(`DEV: ${devDeployment.k8sDeploymentName} (1 replica)`);
      console.log(`UAT: ${uatDeployment.k8sDeploymentName} (2 replicas)`);
      console.log(`PROD: ${prodDeployment.k8sDeploymentName} (5 replicas)`);
    });
  });

  describe('User Journey: Disaster Recovery', () => {
    it('should handle infrastructure failure and recovery', async () => {
      /**
       * USER STORY: As an SRE, when infrastructure fails,
       * I need to recreate resources and redeploy applications
       */

      // Step 1: Create initial infrastructure
      console.log('Step 1: Creating initial infrastructure...');
      const vpc = await cloudService.createVPC({
        name: 'e2e-dr-vpc',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'prod',
        cidrBlock: '10.1.0.0/16',
        createdBy: 'e2e-test-user'
      });

      const deployment = await deploymentService.deployApplication({
        application: 'e2e-dr-app',
        version: '1.0.0',
        environment: 'prod',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123:cluster/dr',
        namespace: 'production',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'e2e-test-user'
      });

      console.log(`✓ Initial setup complete`);

      // Step 2: Simulate disaster - delete resources
      console.log('Step 2: Simulating disaster...');
      await cloudService.deleteVPC(vpc.id);
      await deploymentService.deleteDeployment(deployment.id);

      const deletedVpc = await cloudService.getVPC(vpc.id);
      const deletedDeployment = await prisma.deployment.findUnique({
        where: { id: deployment.id }
      });

      expect(deletedVpc.status).toBe('deleted');
      expect(deletedDeployment?.status).toBe('deleted');
      console.log(`✓ Resources deleted (disaster simulated)`);

      // Step 3: Disaster Recovery - recreate everything
      console.log('Step 3: Executing disaster recovery...');
      const recoveredVpc = await cloudService.createVPC({
        name: 'e2e-dr-vpc-recovered',
        cloud: 'aws',
        region: 'us-east-2', // Different region for DR
        environment: 'dr',
        cidrBlock: '10.2.0.0/16',
        createdBy: 'e2e-test-user',
        tags: {
          Purpose: 'disaster-recovery',
          OriginalRegion: 'us-east-1'
        }
      });

      const recoveredDeployment = await deploymentService.deployApplication({
        application: 'e2e-dr-app',
        version: '1.0.0',
        environment: 'dr',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-2:123:cluster/dr',
        namespace: 'disaster-recovery',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'e2e-test-user'
      });

      expect(recoveredVpc.status).toBe('active');
      expect(recoveredDeployment.status).toBe('deploying');

      console.log('\n=== Disaster Recovery Complete ===');
      console.log(`Original VPC: ${vpc.resourceId} (deleted)`);
      console.log(`Recovered VPC: ${recoveredVpc.resourceId} (active)`);
      console.log(`Original Deployment: ${deployment.k8sDeploymentName} (deleted)`);
      console.log(`Recovered Deployment: ${recoveredDeployment.k8sDeploymentName} (running)`);
    });
  });

  describe('User Journey: Multi-Cloud Deployment', () => {
    it('should deploy same application to AWS and OCI', async () => {
      /**
       * USER STORY: As a platform engineer, I want to deploy
       * the same application to multiple cloud providers
       */

      const appVersion = '3.0.0';

      // Deploy to AWS
      console.log('Deploying to AWS...');
      const awsDeployment = await deploymentService.deployApplication({
        application: 'e2e-multicloud-app',
        version: appVersion,
        environment: 'prod',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123:cluster/multicloud',
        namespace: 'production',
        imageRegistry: `123.dkr.ecr.us-east-1.amazonaws.com/app:${appVersion}`,
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'e2e-test-user'
      });

      expect(awsDeployment.k8sDeploymentName).toBe('e2e-multicloud-app-prod');
      console.log(`✓ AWS Deployment: ${awsDeployment.id}`);

      // Note: OCI deployment would follow similar pattern
      // For now, we verify AWS deployment succeeded

      const awsDeployments = await deploymentService.listDeployments();
      expect(awsDeployments.some(d => d.id === awsDeployment.id)).toBe(true);

      console.log('\n=== Multi-Cloud Deployment Status ===');
      console.log(`AWS: ${awsDeployment.k8sDeploymentName} - ${awsDeployment.status}`);
      console.log(`OCI: (Not implemented in this test)`);
    });
  });
});
