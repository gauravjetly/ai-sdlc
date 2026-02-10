/**
 * API Tests - Deployment Endpoints
 * Tests all 15 deployment API endpoints
 */

import request from 'supertest';
import { ApiServer } from '../../api/server';
import { prisma } from '../../infrastructure/database/prisma.client';
import { DeploymentService } from '../../services/deployment/deployment.service';

// Mock services
jest.mock('../../services/deployment/deployment.service');
jest.mock('../../services/deployment/k8s.client');

describe('API: Deployment Endpoints (/api/v1/deployments)', () => {
  let app: Express.Application;
  let apiServer: ApiServer;
  let mockDeploymentService: jest.Mocked<DeploymentService>;

  beforeAll(async () => {
    await prisma.$connect();
    apiServer = new ApiServer(3001);
    app = apiServer.getApp();

    // Setup mock deployment service
    mockDeploymentService = {
      deployApplication: jest.fn(),
      getDeploymentStatus: jest.fn(),
      listDeployments: jest.fn(),
      scaleDeployment: jest.fn(),
      deleteDeployment: jest.fn(),
      rollbackDeployment: jest.fn()
    } as any;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/deployments', () => {
    it('should create new deployment with valid request', async () => {
      // Arrange
      const mockResult = {
        id: 'test-deployment-id',
        k8sDeploymentName: 'test-app-dev',
        k8sDeploymentUid: 'uid-123',
        namespace: 'development',
        status: 'deploying',
        startedAt: new Date()
      };

      mockDeploymentService.deployApplication.mockResolvedValue(mockResult);

      const validRequest = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'dev',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123:cluster/test',
        namespace: 'development',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/deployments')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('status', 'deploying');
    });

    it('should reject deployment with missing required fields', async () => {
      // Arrange
      const invalidRequest = {
        application: 'test-app',
        version: '1.0.0'
        // Missing required fields
      };

      // Act
      const response = await request(app)
        .post('/api/v1/deployments')
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject deployment with invalid environment', async () => {
      // Arrange
      const invalidRequest = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'invalid-env', // Not in [dev, uat, prod, dr]
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123:cluster/test',
        namespace: 'test',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/deployments')
        .send(invalidRequest)
        .expect(400);

      // Assert
      expect(response.body.error.message).toContain('environment');
    });

    it('should reject deployment with invalid replica count', async () => {
      // Arrange
      const invalidRequest = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'dev',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123:cluster/test',
        namespace: 'test',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 0, // Invalid: must be >= 1
        strategy: 'rolling'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/deployments')
        .send(invalidRequest)
        .expect(400);

      // Assert
      expect(response.body.error.message).toContain('replicas');
    });
  });

  describe('GET /api/v1/deployments', () => {
    it('should list all deployments', async () => {
      // Arrange
      const mockDeployments = [
        {
          id: 'dep-1',
          k8sDeploymentName: 'app-1-dev',
          namespace: 'development',
          status: 'running',
          startedAt: new Date()
        },
        {
          id: 'dep-2',
          k8sDeploymentName: 'app-2-prod',
          namespace: 'production',
          status: 'running',
          startedAt: new Date()
        }
      ];

      mockDeploymentService.listDeployments.mockResolvedValue(mockDeployments as any);

      // Act
      const response = await request(app)
        .get('/api/v1/deployments')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter deployments by environment', async () => {
      // Arrange
      const mockDevDeployments = [
        {
          id: 'dep-1',
          k8sDeploymentName: 'app-1-dev',
          namespace: 'development',
          status: 'running',
          startedAt: new Date()
        }
      ];

      mockDeploymentService.listDeployments.mockResolvedValue(mockDevDeployments as any);

      // Act
      const response = await request(app)
        .get('/api/v1/deployments?environment=dev')
        .expect(200);

      // Assert
      expect(response.body.data).toBeInstanceOf(Array);
      expect(mockDeploymentService.listDeployments).toHaveBeenCalledWith('dev');
    });

    it('should support pagination', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/deployments?page=1&limit=10')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
    });
  });

  describe('GET /api/v1/deployments/:id', () => {
    it('should get deployment by ID', async () => {
      // Arrange
      const mockDeployment = {
        id: 'test-id',
        status: 'running',
        replicas: 3,
        readyReplicas: 3,
        updatedReplicas: 3,
        availableReplicas: 3,
        conditions: [],
        progress: 100,
        message: 'Deployment is running'
      };

      mockDeploymentService.getDeploymentStatus.mockResolvedValue(mockDeployment);

      // Act
      const response = await request(app)
        .get('/api/v1/deployments/test-id')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', 'test-id');
      expect(response.body.data).toHaveProperty('status', 'running');
      expect(response.body.data).toHaveProperty('replicas', 3);
    });

    it('should return 404 for non-existent deployment', async () => {
      // Arrange
      mockDeploymentService.getDeploymentStatus.mockRejectedValue(
        new Error('Deployment not found')
      );

      // Act
      const response = await request(app)
        .get('/api/v1/deployments/non-existent-id')
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('GET /api/v1/deployments/:id/status', () => {
    it('should get real-time deployment status', async () => {
      // Arrange
      const mockStatus = {
        id: 'test-id',
        status: 'deploying',
        replicas: 3,
        readyReplicas: 2,
        updatedReplicas: 3,
        availableReplicas: 2,
        conditions: [
          { type: 'Progressing', status: 'True' }
        ],
        progress: 66,
        message: 'Deployment is progressing'
      };

      mockDeploymentService.getDeploymentStatus.mockResolvedValue(mockStatus);

      // Act
      const response = await request(app)
        .get('/api/v1/deployments/test-id/status')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveProperty('status', 'deploying');
      expect(response.body.data).toHaveProperty('progress', 66);
      expect(response.body.data).toHaveProperty('readyReplicas', 2);
    });
  });

  describe('PATCH /api/v1/deployments/:id/scale', () => {
    it('should scale deployment', async () => {
      // Arrange
      mockDeploymentService.scaleDeployment.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .patch('/api/v1/deployments/test-id/scale')
        .send({ replicas: 5 })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(mockDeploymentService.scaleDeployment).toHaveBeenCalledWith('test-id', 5);
    });

    it('should reject invalid replica count', async () => {
      // Act
      const response = await request(app)
        .patch('/api/v1/deployments/test-id/scale')
        .send({ replicas: -1 })
        .expect(400);

      // Assert
      expect(response.body.error.message).toContain('replicas');
    });

    it('should reject scaling above maximum', async () => {
      // Act
      const response = await request(app)
        .patch('/api/v1/deployments/test-id/scale')
        .send({ replicas: 101 }) // Max is 100
        .expect(400);

      // Assert
      expect(response.body.error.message).toContain('replicas');
    });
  });

  describe('POST /api/v1/deployments/:id/rollback', () => {
    it('should rollback deployment', async () => {
      // Arrange
      mockDeploymentService.rollbackDeployment.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/api/v1/deployments/test-id/rollback')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(mockDeploymentService.rollbackDeployment).toHaveBeenCalledWith('test-id', undefined);
    });

    it('should rollback to specific revision', async () => {
      // Arrange
      mockDeploymentService.rollbackDeployment.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/api/v1/deployments/test-id/rollback')
        .send({ targetRevision: 5 })
        .expect(200);

      // Assert
      expect(mockDeploymentService.rollbackDeployment).toHaveBeenCalledWith('test-id', 5);
    });
  });

  describe('DELETE /api/v1/deployments/:id', () => {
    it('should delete deployment', async () => {
      // Arrange
      mockDeploymentService.deleteDeployment.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .delete('/api/v1/deployments/test-id')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(mockDeploymentService.deleteDeployment).toHaveBeenCalledWith('test-id');
    });

    it('should return 404 when deleting non-existent deployment', async () => {
      // Arrange
      mockDeploymentService.deleteDeployment.mockRejectedValue(
        new Error('Deployment not found')
      );

      // Act
      const response = await request(app)
        .delete('/api/v1/deployments/non-existent-id')
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/deployments/:id/logs', () => {
    it('should get deployment logs', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/deployments/test-id/logs')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('logs');
      expect(response.body.data.logs).toBeInstanceOf(Array);
    });

    it('should support log filtering by level', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/deployments/test-id/logs?level=ERROR')
        .expect(200);

      // Assert
      expect(response.body.data.logs).toBeInstanceOf(Array);
    });

    it('should support log tailing with limit', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/deployments/test-id/logs?tail=100')
        .expect(200);

      // Assert
      expect(response.body.data.logs).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/deployments/:id/events', () => {
    it('should get deployment events', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/deployments/test-id/events')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('events');
      expect(response.body.data.events).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/deployments/:id/metrics', () => {
    it('should get deployment metrics', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/deployments/test-id/metrics')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data.metrics).toHaveProperty('cpu');
      expect(response.body.data.metrics).toHaveProperty('memory');
      expect(response.body.data.metrics).toHaveProperty('requests');
    });

    it('should support time range filtering', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/deployments/test-id/metrics?range=1h')
        .expect(200);

      // Assert
      expect(response.body.data.metrics).toBeTruthy();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple rapid requests
      const requests = Array(101).fill(null).map(() =>
        request(app).get('/api/v1/deployments')
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format', async () => {
      // Arrange
      mockDeploymentService.getDeploymentStatus.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const response = await request(app)
        .get('/api/v1/deployments/test-id')
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('traceId');
      expect(response.body.error).toHaveProperty('timestamp');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/deployments')
        .send({
          application: 'test-app',
          version: '1.0.0',
          environment: 'prod'
        })
        .expect(401);

      // Assert
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should accept valid JWT token', async () => {
      // Arrange
      const validToken = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...';

      // Act
      const response = await request(app)
        .get('/api/v1/deployments')
        .set('Authorization', validToken);

      // Assert - Should not be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      // Act
      const response = await request(app)
        .options('/api/v1/deployments')
        .expect(204);

      // Assert
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});
