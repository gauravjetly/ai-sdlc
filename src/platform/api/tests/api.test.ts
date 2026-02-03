/**
 * API Integration Tests
 * Tests for REST API endpoints
 */

import request from 'supertest';
import { ApiServer } from '../server.js';

describe('REST API Tests', () => {
  let server: ApiServer;
  let app: any;
  let authToken: string;

  beforeAll(async () => {
    // Create server instance
    server = new ApiServer(3001);
    app = server.getApp();

    // For tests, we'll use development mode (bypasses JWT verification)
    process.env.NODE_ENV = 'development';
  });

  describe('Health and Info Endpoints', () => {
    it('GET /health - should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data).toHaveProperty('uptime');
    });

    it('GET /api/v1 - should return API version info', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('v1');
      expect(response.body.data.endpoints.total).toBeGreaterThanOrEqual(102);
    });
  });

  describe('Deployment Endpoints', () => {
    let deploymentId: string;

    it('POST /api/v1/deployments - should create deployment', async () => {
      const response = await request(app)
        .post('/api/v1/deployments')
        .send({
          name: 'test-app',
          environment: 'dev',
          version: '1.0.0',
          image: 'test-app:1.0.0',
          cluster: 'test-cluster',
          replicas: 3
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('test-app');
      expect(response.body.data.status).toBe('pending');

      deploymentId = response.body.data.id;
    });

    it('GET /api/v1/deployments - should list deployments', async () => {
      const response = await request(app)
        .get('/api/v1/deployments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/deployments/:id - should get deployment details', async () => {
      const response = await request(app)
        .get(`/api/v1/deployments/${deploymentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(deploymentId);
    });

    it('GET /api/v1/deployments/:id/status - should get deployment status', async () => {
      const response = await request(app)
        .get(`/api/v1/deployments/${deploymentId}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
    });

    it('POST /api/v1/deployments/:id/scale - should scale deployment', async () => {
      const response = await request(app)
        .post(`/api/v1/deployments/${deploymentId}/scale`)
        .send({ replicas: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.replicas).toBe(5);
    });

    it('POST /api/v1/deployments - should fail with invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/deployments')
        .send({
          name: 'ab', // Too short
          environment: 'invalid', // Not in enum
          version: '1.0' // Invalid semver
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });
  });

  describe('Infrastructure Endpoints', () => {
    let infraId: string;

    it('POST /api/v1/infrastructure/provision - should provision infrastructure', async () => {
      const response = await request(app)
        .post('/api/v1/infrastructure/provision')
        .send({
          provider: 'aws',
          region: 'us-east-1',
          resources: [
            { type: 'virtual_network', name: 'test-vpc', config: { cidr: '10.0.0.0/16' } }
          ]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      infraId = response.body.data.id;
    });

    it('GET /api/v1/infrastructure - should list infrastructure', async () => {
      const response = await request(app)
        .get('/api/v1/infrastructure')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /api/v1/infrastructure/clouds - should list supported clouds', async () => {
      const response = await request(app)
        .get('/api/v1/infrastructure/clouds')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('supported');
    });
  });

  describe('Security Endpoints', () => {
    it('POST /api/v1/security/scan - should initiate security scan', async () => {
      const response = await request(app)
        .post('/api/v1/security/scan')
        .send({
          target: 'test-app:1.0.0',
          scanType: 'vulnerability'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('running');
    });

    it('GET /api/v1/security/vulnerabilities - should list vulnerabilities', async () => {
      const response = await request(app)
        .get('/api/v1/security/vulnerabilities')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /api/v1/security/compliance - should get compliance status', async () => {
      const response = await request(app)
        .get('/api/v1/security/compliance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data).toHaveProperty('standards');
    });
  });

  describe('Cost Endpoints', () => {
    it('GET /api/v1/costs - should get current costs', async () => {
      const response = await request(app)
        .get('/api/v1/costs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data).toHaveProperty('byService');
    });

    it('GET /api/v1/costs/forecast - should get cost forecast', async () => {
      const response = await request(app)
        .get('/api/v1/costs/forecast')
        .query({ horizon: 'month' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('predicted');
      expect(response.body.data).toHaveProperty('confidence');
    });

    it('POST /api/v1/costs/optimize - should get optimization recommendations', async () => {
      const response = await request(app)
        .post('/api/v1/costs/optimize')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('totalPotentialSavings');
    });
  });

  describe('Observability Endpoints', () => {
    it('GET /api/v1/observability/health - should get platform health', async () => {
      const response = await request(app)
        .get('/api/v1/observability/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data).toHaveProperty('components');
    });

    it('GET /api/v1/observability/logs - should query logs', async () => {
      const response = await request(app)
        .get('/api/v1/observability/logs')
        .query({ limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('POST /api/v1/observability/alerts - should create alert', async () => {
      const response = await request(app)
        .post('/api/v1/observability/alerts')
        .send({
          name: 'High CPU',
          condition: 'cpu > 80',
          threshold: 80,
          severity: 'warning'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });
  });

  describe('Testing Endpoints', () => {
    it('POST /api/v1/tests/run - should run tests', async () => {
      const response = await request(app)
        .post('/api/v1/tests/run')
        .send({
          suite: 'integration',
          environment: 'dev'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('running');
    });

    it('GET /api/v1/tests/coverage - should get coverage report', async () => {
      const response = await request(app)
        .get('/api/v1/tests/coverage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data.overall).toBeGreaterThan(0);
    });
  });

  describe('Release Endpoints', () => {
    let releaseId: string;

    it('POST /api/v1/releases - should plan release', async () => {
      const response = await request(app)
        .post('/api/v1/releases')
        .send({
          name: 'Release 1.0.0',
          version: '1.0.0',
          environment: 'prod',
          deployments: ['deploy-123']
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('draft');
      releaseId = response.body.data.id;
    });

    it('GET /api/v1/releases/calendar - should get release calendar', async () => {
      const response = await request(app)
        .get('/api/v1/releases/calendar')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Architecture Endpoints', () => {
    it('GET /api/v1/architecture/patterns - should list architecture patterns', async () => {
      const response = await request(app)
        .get('/api/v1/architecture/patterns')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/architecture/adrs - should create ADR', async () => {
      const response = await request(app)
        .post('/api/v1/architecture/adrs')
        .send({
          title: 'Use PostgreSQL for primary database',
          status: 'accepted',
          context: 'Need reliable ACID database',
          decision: 'Choose PostgreSQL',
          consequences: ['Excellent reliability', 'Strong community support']
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toMatch(/^ADR-\d{4}$/);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .get('/api/v1/deployments/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Pagination', () => {
    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/deployments')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('total');
    });
  });
});
