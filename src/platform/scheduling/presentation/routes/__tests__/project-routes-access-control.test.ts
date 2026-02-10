/**
 * Access Control Integration Tests for Project Routes
 *
 * Validates that all endpoints have proper role-based and permission-based
 * access control according to the defined access control matrix.
 *
 * Access Control Matrix:
 * - POST /projects                     -> authenticated users (projects:create)
 * - GET /projects                      -> authenticated users (projects:list)
 * - GET /projects/:id                  -> authenticated users (projects:read)
 * - PUT /projects/:id                  -> authenticated users (projects:update)
 * - POST /projects/:id/start           -> authenticated users (projects:update)
 * - POST /projects/:id/cancel          -> admin or operator
 * - POST /projects/:id/phases/:phase/* -> authenticated users with phase permissions
 * - POST /scheduler/process            -> admin only
 * - GET /dashboard                     -> public (no auth required)
 * - GET /analytics/*                   -> authenticated users (analytics:view)
 */

import request from 'supertest';
import express, { Express } from 'express';
import * as jwt from 'jsonwebtoken';
import { createProjectRoutes } from '../project-routes';
import { ProjectOrchestrationService } from '../../../application/services/ProjectOrchestrationService';
import { ScheduledProject, SDLCPhase } from '../../../domain/entities/ScheduledProject';

describe('Project Routes - Access Control', () => {
  let app: Express;
  let mockOrchestrationService: jest.Mocked<ProjectOrchestrationService>;
  let privateKey: string;
  let publicKey: string;

  // Helper to generate test JWT tokens
  function generateToken(payload: {
    sub: string;
    email: string;
    role: 'admin' | 'developer' | 'viewer' | 'operator';
    permissions: string[];
  }): string {
    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });
  }

  beforeAll(() => {
    // Generate RS256 key pair for testing
    const crypto = require('crypto');
    const { privateKey: privKey, publicKey: pubKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    privateKey = privKey;
    publicKey = pubKey;

    // Mock public key loading in auth middleware
    process.env.JWT_PUBLIC_KEY_PATH = '/tmp/test-public.key';
    require('fs').writeFileSync(process.env.JWT_PUBLIC_KEY_PATH, publicKey);
  });

  afterAll(() => {
    // Cleanup test key
    if (process.env.JWT_PUBLIC_KEY_PATH) {
      require('fs').unlinkSync(process.env.JWT_PUBLIC_KEY_PATH);
    }
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock orchestration service
    mockOrchestrationService = {
      createProject: jest.fn(),
      listProjects: jest.fn(),
      getProject: jest.fn(),
      startProject: jest.fn(),
      cancelProject: jest.fn(),
      completePhase: jest.fn(),
      failPhase: jest.fn(),
      getDashboard: jest.fn(),
      processReadyProjects: jest.fn(),
    } as any;

    // Setup mock responses
    const mockProject = {
      id: 'project-123',
      name: 'Test Project',
      currentPhase: 'requirements' as SDLCPhase,
      phases: [],
      progressPercent: 0,
      toJSON: () => ({ id: 'project-123', name: 'Test Project' }),
    } as ScheduledProject;

    mockOrchestrationService.createProject.mockResolvedValue(mockProject);
    mockOrchestrationService.listProjects.mockResolvedValue({
      items: [mockProject],
      total: 1,
    });
    mockOrchestrationService.getProject.mockResolvedValue(mockProject);
    mockOrchestrationService.startProject.mockResolvedValue(mockProject);
    mockOrchestrationService.cancelProject.mockResolvedValue(mockProject);
    mockOrchestrationService.completePhase.mockResolvedValue(mockProject);
    mockOrchestrationService.failPhase.mockResolvedValue(mockProject);
    mockOrchestrationService.getDashboard.mockResolvedValue({
      projects: { active: [], queued: [], blocked: [], completed: [] },
      agentPool: [],
      weeklyThroughput: [],
      phaseDurations: {},
      metrics: {} as any,
    });
    mockOrchestrationService.processReadyProjects.mockResolvedValue(2);

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/projects', createProjectRoutes(mockOrchestrationService));
  });

  // ===========================
  // Public Endpoints (No Auth)
  // ===========================

  describe('GET /projects/dashboard - Public Access', () => {
    it('should allow access without authentication', async () => {
      const response = await request(app)
        .get('/projects/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(mockOrchestrationService.getDashboard).toHaveBeenCalled();
    });
  });

  // ===========================
  // Admin-Only Endpoints
  // ===========================

  describe('POST /projects/scheduler/process - Admin Only', () => {
    it('should allow access for admin users', async () => {
      const token = generateToken({
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['*'],
      });

      const response = await request(app)
        .post('/projects/scheduler/process')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('allocated');
      expect(mockOrchestrationService.processReadyProjects).toHaveBeenCalled();
    });

    it('should deny access for developer users', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:*', 'phases:*'],
      });

      const response = await request(app)
        .post('/projects/scheduler/process')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'INSUFFICIENT_PERMISSIONS');
      expect(mockOrchestrationService.processReadyProjects).not.toHaveBeenCalled();
    });

    it('should deny access for operator users', async () => {
      const token = generateToken({
        sub: 'op-123',
        email: 'operator@example.com',
        role: 'operator',
        permissions: ['scheduler:view'],
      });

      const response = await request(app)
        .post('/projects/scheduler/process')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'INSUFFICIENT_PERMISSIONS');
      expect(mockOrchestrationService.processReadyProjects).not.toHaveBeenCalled();
    });

    it('should deny access for viewer users', async () => {
      const token = generateToken({
        sub: 'viewer-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['projects:read', 'analytics:view'],
      });

      const response = await request(app)
        .post('/projects/scheduler/process')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'INSUFFICIENT_PERMISSIONS');
      expect(mockOrchestrationService.processReadyProjects).not.toHaveBeenCalled();
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .post('/projects/scheduler/process')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'AUTH_REQUIRED');
      expect(mockOrchestrationService.processReadyProjects).not.toHaveBeenCalled();
    });
  });

  // ===========================
  // Admin or Operator Endpoints
  // ===========================

  describe('POST /projects/:id/cancel - Admin or Operator', () => {
    it('should allow access for admin users', async () => {
      const token = generateToken({
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['*'],
      });

      await request(app)
        .post('/projects/project-123/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockOrchestrationService.cancelProject).toHaveBeenCalledWith('project-123');
    });

    it('should allow access for operator users', async () => {
      const token = generateToken({
        sub: 'op-123',
        email: 'operator@example.com',
        role: 'operator',
        permissions: ['projects:cancel', 'scheduler:view'],
      });

      await request(app)
        .post('/projects/project-123/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockOrchestrationService.cancelProject).toHaveBeenCalledWith('project-123');
    });

    it('should deny access for developer users', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:create', 'projects:update'],
      });

      const response = await request(app)
        .post('/projects/project-123/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'INSUFFICIENT_PERMISSIONS');
      expect(mockOrchestrationService.cancelProject).not.toHaveBeenCalled();
    });

    it('should deny access for viewer users', async () => {
      const token = generateToken({
        sub: 'viewer-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['projects:read'],
      });

      const response = await request(app)
        .post('/projects/project-123/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'INSUFFICIENT_PERMISSIONS');
      expect(mockOrchestrationService.cancelProject).not.toHaveBeenCalled();
    });
  });

  // ===========================
  // Authenticated User Endpoints
  // ===========================

  describe('POST /projects - Create Project', () => {
    const validProjectData = {
      name: 'New Project',
      description: 'Test project',
      requirements: 'Build a feature',
    };

    it('should allow access for authenticated users with projects:create permission', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:create'],
      });

      const response = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(validProjectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(mockOrchestrationService.createProject).toHaveBeenCalled();
    });

    it('should allow access for admin users', async () => {
      const token = generateToken({
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['*'],
      });

      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(validProjectData)
        .expect(201);

      expect(mockOrchestrationService.createProject).toHaveBeenCalled();
    });

    it('should deny access for users without projects:create permission', async () => {
      const token = generateToken({
        sub: 'viewer-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['projects:read'],
      });

      const response = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(validProjectData)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_DENIED');
      expect(mockOrchestrationService.createProject).not.toHaveBeenCalled();
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .post('/projects')
        .send(validProjectData)
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'AUTH_REQUIRED');
      expect(mockOrchestrationService.createProject).not.toHaveBeenCalled();
    });
  });

  describe('GET /projects - List Projects', () => {
    it('should allow access for authenticated users with projects:list permission', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:list', 'projects:read'],
      });

      const response = await request(app)
        .get('/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(mockOrchestrationService.listProjects).toHaveBeenCalled();
    });

    it('should deny access for users without projects:list permission', async () => {
      const token = generateToken({
        sub: 'viewer-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['analytics:view'], // No projects permission
      });

      const response = await request(app)
        .get('/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_DENIED');
      expect(mockOrchestrationService.listProjects).not.toHaveBeenCalled();
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/projects')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'AUTH_REQUIRED');
      expect(mockOrchestrationService.listProjects).not.toHaveBeenCalled();
    });
  });

  describe('GET /projects/:id - Get Project Detail', () => {
    it('should allow access for authenticated users with projects:read permission', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:read'],
      });

      const response = await request(app)
        .get('/projects/project-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(mockOrchestrationService.getProject).toHaveBeenCalledWith('project-123');
    });

    it('should allow access with wildcard permission', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:*'],
      });

      await request(app)
        .get('/projects/project-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockOrchestrationService.getProject).toHaveBeenCalledWith('project-123');
    });

    it('should deny access without projects:read permission', async () => {
      const token = generateToken({
        sub: 'viewer-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['analytics:view'],
      });

      const response = await request(app)
        .get('/projects/project-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_DENIED');
      expect(mockOrchestrationService.getProject).not.toHaveBeenCalled();
    });
  });

  describe('POST /projects/:id/start - Start Project', () => {
    it('should allow access for users with projects:update permission', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:update'],
      });

      await request(app)
        .post('/projects/project-123/start')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockOrchestrationService.startProject).toHaveBeenCalledWith('project-123');
    });

    it('should deny access without projects:update permission', async () => {
      const token = generateToken({
        sub: 'viewer-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['projects:read'],
      });

      const response = await request(app)
        .post('/projects/project-123/start')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_DENIED');
      expect(mockOrchestrationService.startProject).not.toHaveBeenCalled();
    });
  });

  // ===========================
  // Phase Management Endpoints
  // ===========================

  describe('POST /projects/:id/phases/:phase/complete - Complete Phase', () => {
    const phaseData = {
      artifacts: { file: 'output.txt' },
      notes: 'Phase completed successfully',
    };

    it('should allow access for users with phases:complete permission', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['phases:complete'],
      });

      await request(app)
        .post('/projects/project-123/phases/requirements/complete')
        .set('Authorization', `Bearer ${token}`)
        .send(phaseData)
        .expect(200);

      expect(mockOrchestrationService.completePhase).toHaveBeenCalled();
    });

    it('should deny access without phases:complete permission', async () => {
      const token = generateToken({
        sub: 'viewer-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['phases:read'],
      });

      const response = await request(app)
        .post('/projects/project-123/phases/requirements/complete')
        .set('Authorization', `Bearer ${token}`)
        .send(phaseData)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_DENIED');
      expect(mockOrchestrationService.completePhase).not.toHaveBeenCalled();
    });
  });

  describe('POST /projects/:id/phases/:phase/fail - Fail Phase', () => {
    const failData = {
      error: 'Phase failed due to validation error',
    };

    it('should allow access for users with phases:fail permission', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['phases:fail'],
      });

      await request(app)
        .post('/projects/project-123/phases/requirements/fail')
        .set('Authorization', `Bearer ${token}`)
        .send(failData)
        .expect(200);

      expect(mockOrchestrationService.failPhase).toHaveBeenCalled();
    });

    it('should deny access without phases:fail permission', async () => {
      const token = generateToken({
        sub: 'viewer-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['phases:read'],
      });

      const response = await request(app)
        .post('/projects/project-123/phases/requirements/fail')
        .set('Authorization', `Bearer ${token}`)
        .send(failData)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_DENIED');
      expect(mockOrchestrationService.failPhase).not.toHaveBeenCalled();
    });
  });

  // ===========================
  // Analytics Endpoints
  // ===========================

  describe('GET /projects/analytics/throughput - Get Throughput', () => {
    it('should allow access for users with analytics:view permission', async () => {
      const token = generateToken({
        sub: 'analyst-123',
        email: 'analyst@example.com',
        role: 'viewer',
        permissions: ['analytics:view'],
      });

      const response = await request(app)
        .get('/projects/analytics/throughput')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('weeklyThroughput');
      expect(mockOrchestrationService.getDashboard).toHaveBeenCalled();
    });

    it('should deny access without analytics:view permission', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:create'],
      });

      const response = await request(app)
        .get('/projects/analytics/throughput')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_DENIED');
    });
  });

  describe('GET /projects/analytics/phase-durations - Get Phase Durations', () => {
    it('should allow access for users with analytics:view permission', async () => {
      const token = generateToken({
        sub: 'analyst-123',
        email: 'analyst@example.com',
        role: 'viewer',
        permissions: ['analytics:view'],
      });

      const response = await request(app)
        .get('/projects/analytics/phase-durations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('phaseDurations');
      expect(mockOrchestrationService.getDashboard).toHaveBeenCalled();
    });

    it('should deny access without analytics:view permission', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:read'],
      });

      const response = await request(app)
        .get('/projects/analytics/phase-durations')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_DENIED');
    });
  });

  // ===========================
  // Agent Pool Endpoints
  // ===========================

  describe('GET /projects/agents/pool - Get Agent Pool Status', () => {
    it('should allow access for users with scheduler:view permission', async () => {
      const token = generateToken({
        sub: 'op-123',
        email: 'operator@example.com',
        role: 'operator',
        permissions: ['scheduler:view'],
      });

      const response = await request(app)
        .get('/projects/agents/pool')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('agents');
      expect(mockOrchestrationService.getDashboard).toHaveBeenCalled();
    });

    it('should deny access without scheduler:view permission', async () => {
      const token = generateToken({
        sub: 'viewer-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['projects:read'],
      });

      const response = await request(app)
        .get('/projects/agents/pool')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'PERMISSION_DENIED');
    });
  });

  // ===========================
  // Security Edge Cases
  // ===========================

  describe('Security - Edge Cases', () => {
    it('should reject expired JWT tokens', async () => {
      const token = jwt.sign(
        {
          sub: 'admin-123',
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['*'],
        },
        privateKey,
        {
          algorithm: 'RS256',
          expiresIn: '-1h', // Expired 1 hour ago
        }
      );

      const response = await request(app)
        .post('/projects/scheduler/process')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'TOKEN_EXPIRED');
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .post('/projects/scheduler/process')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'INVALID_TOKEN');
    });

    it('should reject malformed Authorization headers', async () => {
      const response = await request(app)
        .post('/projects/scheduler/process')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'AUTH_REQUIRED');
    });

    it('should include trace ID in all error responses', async () => {
      const response = await request(app)
        .post('/projects/scheduler/process')
        .expect(401);

      expect(response.body.error).toHaveProperty('traceId');
      expect(response.body.error.traceId).toMatch(/^trace-/);
    });

    it('should include timestamp in all error responses', async () => {
      const response = await request(app)
        .post('/projects/scheduler/process')
        .expect(401);

      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ===========================
  // Permission Wildcard Tests
  // ===========================

  describe('Permission Wildcards', () => {
    it('should allow projects:* to access all project endpoints', async () => {
      const token = generateToken({
        sub: 'dev-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:*'],
      });

      // Should work for all project operations
      await request(app)
        .get('/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app)
        .get('/projects/project-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Project',
          description: 'Test',
          requirements: 'Build feature',
        })
        .expect(201);
    });

    it('should allow * (admin wildcard) to access all endpoints', async () => {
      const token = generateToken({
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['*'],
      });

      // Admin should access everything
      await request(app)
        .post('/projects/scheduler/process')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app)
        .post('/projects/project-123/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app)
        .get('/projects/analytics/throughput')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
