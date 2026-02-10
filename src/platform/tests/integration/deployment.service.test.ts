/**
 * Integration Tests - DeploymentService
 * Tests real Kubernetes operations with mock K8s client
 */

import { DeploymentService } from '../../services/deployment/deployment.service';
import { KubernetesClient } from '../../services/deployment/k8s.client';
import { prisma } from '../../infrastructure/database/prisma.client';
import { DeploymentConfig } from '../../services/deployment/types';

// Mock Kubernetes client
jest.mock('../../services/deployment/k8s.client');

describe('DeploymentService - Integration Tests', () => {
  let deploymentService: DeploymentService;
  let mockK8sClient: jest.Mocked<KubernetesClient>;

  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup and disconnect
    await prisma.$disconnect();
  });

  beforeEach(() => {
    deploymentService = new DeploymentService();

    // Setup K8s client mock
    mockK8sClient = {
      ensureNamespace: jest.fn().mockResolvedValue(undefined),
      createDeployment: jest.fn().mockResolvedValue({
        metadata: {
          uid: 'test-uid-12345',
          name: 'test-app-dev'
        }
      }),
      getDeployment: jest.fn().mockResolvedValue({
        metadata: { uid: 'test-uid-12345' },
        spec: { replicas: 3 },
        status: {
          replicas: 3,
          readyReplicas: 3,
          availableReplicas: 3,
          updatedReplicas: 3,
          conditions: [
            { type: 'Available', status: 'True' }
          ]
        }
      }),
      scaleDeployment: jest.fn().mockResolvedValue(undefined),
      deleteDeployment: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Mock the private getK8sClient method
    (deploymentService as any).getK8sClient = jest.fn().mockReturnValue(mockK8sClient);
  });

  afterEach(async () => {
    // Clean up test deployments
    await prisma.deployment.deleteMany({
      where: {
        application: { contains: 'test-' }
      }
    });
  });

  describe('deployApplication', () => {
    it('should create deployment in database and Kubernetes', async () => {
      // Arrange
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'dev',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/test',
        namespace: 'test-ns',
        imageRegistry: '123456789.dkr.ecr.us-east-1.amazonaws.com/test-app:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'test-user',
        resources: {
          cpu: '500m',
          memory: '1Gi'
        },
        healthCheck: {
          path: '/health',
          port: 8080
        }
      };

      // Act
      const result = await deploymentService.deployApplication(config);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('k8sDeploymentName');
      expect(result).toHaveProperty('status', 'deploying');
      expect(result.k8sDeploymentUid).toBe('test-uid-12345');

      // Verify database record
      const deployment = await prisma.deployment.findUnique({
        where: { id: result.id }
      });

      expect(deployment).toBeTruthy();
      expect(deployment?.application).toBe('test-app');
      expect(deployment?.version).toBe('1.0.0');
      expect(deployment?.environment).toBe('dev');
      expect(deployment?.replicas).toBe(3);
      expect(deployment?.k8sDeploymentUid).toBe('test-uid-12345');

      // Verify K8s operations
      expect(mockK8sClient.ensureNamespace).toHaveBeenCalledWith('test-ns');
      expect(mockK8sClient.createDeployment).toHaveBeenCalledWith(
        'test-ns',
        expect.objectContaining({
          metadata: expect.objectContaining({
            name: 'test-app-dev'
          })
        })
      );
    });

    it('should fail deployment and update database on K8s error', async () => {
      // Arrange
      mockK8sClient.createDeployment.mockRejectedValueOnce(
        new Error('K8s API error')
      );

      const config: DeploymentConfig = {
        application: 'test-failing-app',
        version: '1.0.0',
        environment: 'dev',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/test',
        namespace: 'test-ns',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'test-user'
      };

      // Act & Assert
      await expect(deploymentService.deployApplication(config)).rejects.toThrow(
        'Deployment failed: K8s API error'
      );

      // Verify database was updated with failed status
      const deployments = await prisma.deployment.findMany({
        where: { application: 'test-failing-app' }
      });

      expect(deployments.length).toBeGreaterThan(0);
      expect(deployments[0].status).toBe('failed');
    });

    it('should handle deployment with custom resources', async () => {
      // Arrange
      const config: DeploymentConfig = {
        application: 'test-resource-app',
        version: '1.0.0',
        environment: 'prod',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/prod',
        namespace: 'production',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 5,
        strategy: 'blue-green',
        createdBy: 'test-user',
        resources: {
          cpu: '2000m',
          memory: '4Gi',
          cpuLimit: '4000m',
          memoryLimit: '8Gi'
        }
      };

      // Act
      const result = await deploymentService.deployApplication(config);

      // Assert
      const deployment = await prisma.deployment.findUnique({
        where: { id: result.id }
      });

      expect(deployment?.cpuRequest).toBe('2000m');
      expect(deployment?.memoryRequest).toBe('4Gi');
      expect(deployment?.cpuLimit).toBe('4000m');
      expect(deployment?.memoryLimit).toBe('8Gi');
      expect(deployment?.strategy).toBe('blue-green');
    });
  });

  describe('getDeploymentStatus', () => {
    it('should return status from database and Kubernetes', async () => {
      // Arrange - Create a deployment first
      const config: DeploymentConfig = {
        application: 'test-status-app',
        version: '1.0.0',
        environment: 'dev',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/test',
        namespace: 'test-ns',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'test-user'
      };

      const deployment = await deploymentService.deployApplication(config);

      // Act
      const status = await deploymentService.getDeploymentStatus(deployment.id);

      // Assert
      expect(status).toHaveProperty('id', deployment.id);
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('replicas', 3);
      expect(status).toHaveProperty('readyReplicas', 3);
      expect(status).toHaveProperty('availableReplicas', 3);
      expect(status.conditions).toBeInstanceOf(Array);
    });

    it('should throw error for non-existent deployment', async () => {
      // Act & Assert
      await expect(
        deploymentService.getDeploymentStatus('non-existent-id')
      ).rejects.toThrow('Deployment not found');
    });

    it('should return cached status for completed deployments', async () => {
      // Arrange - Create and mark as completed
      const config: DeploymentConfig = {
        application: 'test-completed-app',
        version: '1.0.0',
        environment: 'dev',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/test',
        namespace: 'test-ns',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'test-user'
      };

      const deployment = await deploymentService.deployApplication(config);

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'completed' }
      });

      // Act
      const status = await deploymentService.getDeploymentStatus(deployment.id);

      // Assert
      expect(status.status).toBe('completed');
      // K8s should not be called for completed deployments
      expect(mockK8sClient.getDeployment).not.toHaveBeenCalled();
    });
  });

  describe('scaleDeployment', () => {
    it('should scale deployment in K8s and database', async () => {
      // Arrange
      const config: DeploymentConfig = {
        application: 'test-scale-app',
        version: '1.0.0',
        environment: 'dev',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/test',
        namespace: 'test-ns',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'test-user'
      };

      const deployment = await deploymentService.deployApplication(config);

      // Act
      await deploymentService.scaleDeployment(deployment.id, 5);

      // Assert
      const updated = await prisma.deployment.findUnique({
        where: { id: deployment.id }
      });

      expect(updated?.replicas).toBe(5);
      expect(mockK8sClient.scaleDeployment).toHaveBeenCalledWith(
        'test-ns',
        'test-scale-app-dev',
        5
      );
    });
  });

  describe('listDeployments', () => {
    it('should list all deployments', async () => {
      // Arrange - Create multiple deployments
      const configs = [
        {
          application: 'test-list-app-1',
          version: '1.0.0',
          environment: 'dev',
          cloud: 'aws',
          clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/test',
          namespace: 'test-ns',
          imageRegistry: 'test-image:1.0.0',
          containerPort: 8080,
          replicas: 3,
          strategy: 'rolling',
          createdBy: 'test-user'
        } as DeploymentConfig,
        {
          application: 'test-list-app-2',
          version: '1.0.0',
          environment: 'prod',
          cloud: 'aws',
          clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/test',
          namespace: 'test-ns',
          imageRegistry: 'test-image:1.0.0',
          containerPort: 8080,
          replicas: 3,
          strategy: 'rolling',
          createdBy: 'test-user'
        } as DeploymentConfig
      ];

      await Promise.all(
        configs.map(config => deploymentService.deployApplication(config))
      );

      // Act
      const allDeployments = await deploymentService.listDeployments();
      const devDeployments = await deploymentService.listDeployments('dev');

      // Assert
      expect(allDeployments.length).toBeGreaterThanOrEqual(2);
      expect(devDeployments.length).toBeGreaterThanOrEqual(1);
      expect(devDeployments.every(d => d.status)).toBe(true);
    });
  });

  describe('deleteDeployment', () => {
    it('should delete deployment from K8s and mark as deleted in database', async () => {
      // Arrange
      const config: DeploymentConfig = {
        application: 'test-delete-app',
        version: '1.0.0',
        environment: 'dev',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/test',
        namespace: 'test-ns',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'test-user'
      };

      const deployment = await deploymentService.deployApplication(config);

      // Act
      await deploymentService.deleteDeployment(deployment.id);

      // Assert
      const deleted = await prisma.deployment.findUnique({
        where: { id: deployment.id }
      });

      expect(deleted?.status).toBe('deleted');
      expect(mockK8sClient.deleteDeployment).toHaveBeenCalledWith(
        'test-ns',
        'test-delete-app-dev'
      );
    });
  });
});
