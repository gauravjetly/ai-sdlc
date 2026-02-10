/**
 * Project Routes
 *
 * Express router for the multi-project scheduling API.
 * Handles project lifecycle, phase advancement, agent pool status,
 * and analytics/dashboard endpoints.
 *
 * Security:
 * - JWT authentication required for all endpoints except dashboard
 * - Role-based access control (RBAC) for admin operations
 * - Permission-based authorization for sensitive operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectFiltersSchema,
  CompletePhaseSchema,
  FailPhaseSchema,
  BlockProjectSchema,
  PhaseParamSchema,
} from '../dto/project-dto';
import { ProjectOrchestrationService } from '../../application/services/ProjectOrchestrationService';
import { SDLCPhase } from '../../domain/entities/ScheduledProject';
import {
  authenticateJWT,
  optionalAuth,
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth';
import {
  requireRole,
  requirePermission,
  requireAdmin,
  PERMISSIONS,
} from '../middleware/rbac';

/**
 * Zod validation middleware factory
 */
function validate(schema: any, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = source === 'body'
      ? req.body
      : source === 'query'
        ? req.query
        : req.params;

    const result = schema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      (req as any).validatedQuery = result.data;
    }
    next();
  };
}

/**
 * Async route handler wrapper
 */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

/**
 * Create project routes
 */
export function createProjectRoutes(
  orchestrationService: ProjectOrchestrationService,
): Router {
  const router = Router();

  // ===========================
  // Multi-Project Dashboard
  // ===========================

  /**
   * GET /dashboard - Get multi-project dashboard
   * Public endpoint - no authentication required
   */
  router.get('/dashboard', asyncHandler(async (_req: Request, res: Response) => {
    const dashboard = await orchestrationService.getDashboard();
    res.json(dashboard);
  }));

  // ===========================
  // Project CRUD
  // ===========================

  /**
   * POST /projects - Create a new SDLC project
   * Requires: Authentication + projects:create permission
   */
  router.post(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.PROJECTS_CREATE),
    validate(CreateProjectSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user?.sub || 'system';
      const project = await orchestrationService.createProject({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(project.toJSON());
    }),
  );

  /**
   * GET /projects - List projects with filters
   * Requires: Authentication + projects:list permission
   */
  router.get(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.PROJECTS_LIST),
    validate(ProjectFiltersSchema, 'query'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const filters = (req as any).validatedQuery;
      const result = await orchestrationService.listProjects(filters);
      res.json({
        items: result.items.map(item => item.toJSON()),
        total: result.total,
        offset: filters.offset,
        limit: filters.limit,
      });
    }),
  );

  /**
   * GET /projects/:id - Get project detail
   * Requires: Authentication + projects:read permission
   */
  router.get(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.PROJECTS_READ),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const project = await orchestrationService.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project.toJSON());
    })
  );

  // ===========================
  // Project Lifecycle
  // ===========================

  /**
   * POST /projects/:id/start - Start a project
   * Requires: Authentication + projects:update permission
   */
  router.post(
    '/:id/start',
    requireAuth,
    requirePermission(PERMISSIONS.PROJECTS_UPDATE),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const project = await orchestrationService.startProject(req.params.id);
      res.json(project.toJSON());
    })
  );

  /**
   * POST /projects/:id/cancel - Cancel a project
   * Requires: Authentication + admin or operator role
   */
  router.post(
    '/:id/cancel',
    requireAuth,
    requireRole('admin', 'operator'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const project = await orchestrationService.cancelProject(req.params.id);
      res.json(project.toJSON());
    })
  );

  // ===========================
  // Phase Management
  // ===========================

  /**
   * GET /projects/:id/phases - Get all phases for a project
   * Requires: Authentication + phases:read permission
   */
  router.get(
    '/:id/phases',
    requireAuth,
    requirePermission(PERMISSIONS.PHASES_READ),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const project = await orchestrationService.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json({
        projectId: project.id,
        currentPhase: project.currentPhase,
        progressPercent: project.progressPercent,
        phases: project.phases.map(p => ({
          ...p,
          startedAt: p.startedAt?.toISOString() || null,
          completedAt: p.completedAt?.toISOString() || null,
        })),
      });
    })
  );

  /**
   * POST /projects/:id/phases/:phase/complete - Complete a phase
   * Requires: Authentication + phases:complete permission
   */
  router.post(
    '/:id/phases/:phase/complete',
    requireAuth,
    requirePermission(PERMISSIONS.PHASES_COMPLETE),
    validate(CompletePhaseSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const phaseResult = PhaseParamSchema.safeParse(req.params.phase);
      if (!phaseResult.success) {
        return res.status(400).json({
          error: `Invalid phase: ${req.params.phase}. Valid phases: requirements, architecture, development, security, testing, deployment, acceptance`,
        });
      }

      const project = await orchestrationService.completePhase(
        req.params.id,
        phaseResult.data as SDLCPhase,
        req.body.artifacts,
        req.body.notes,
      );
      res.json(project.toJSON());
    }),
  );

  /**
   * POST /projects/:id/phases/:phase/fail - Fail a phase
   * Requires: Authentication + phases:fail permission
   */
  router.post(
    '/:id/phases/:phase/fail',
    requireAuth,
    requirePermission(PERMISSIONS.PHASES_FAIL),
    validate(FailPhaseSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const phaseResult = PhaseParamSchema.safeParse(req.params.phase);
      if (!phaseResult.success) {
        return res.status(400).json({
          error: `Invalid phase: ${req.params.phase}`,
        });
      }

      const project = await orchestrationService.failPhase(
        req.params.id,
        phaseResult.data as SDLCPhase,
        req.body.error,
      );
      res.json(project.toJSON());
    }),
  );

  // ===========================
  // Agent Pool & Analytics
  // ===========================

  /**
   * GET /projects/agents/pool - Get agent pool status
   * Requires: Authentication + scheduler:view permission
   */
  router.get(
    '/agents/pool',
    requireAuth,
    requirePermission(PERMISSIONS.SCHEDULER_VIEW),
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
      const dashboard = await orchestrationService.getDashboard();
      res.json({
        agents: dashboard.agentPool,
        totalUtilization: dashboard.metrics.agentUtilizationPercent,
      });
    })
  );

  /**
   * GET /projects/analytics/throughput - Get weekly throughput
   * Requires: Authentication + analytics:view permission
   */
  router.get(
    '/analytics/throughput',
    requireAuth,
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
      const dashboard = await orchestrationService.getDashboard();
      res.json({
        weeklyThroughput: dashboard.weeklyThroughput,
        velocityTrend: dashboard.metrics.weeklyVelocityTrend,
      });
    })
  );

  /**
   * GET /projects/analytics/phase-durations - Get average phase durations
   * Requires: Authentication + analytics:view permission
   */
  router.get(
    '/analytics/phase-durations',
    requireAuth,
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
      const dashboard = await orchestrationService.getDashboard();
      res.json({
        phaseDurations: dashboard.phaseDurations,
        avgPhaseDurationDays: dashboard.metrics.avgPhaseDurationDays,
      });
    })
  );

  /**
   * POST /projects/scheduler/process - Trigger scheduler loop (admin only)
   * Requires: Authentication + admin role
   */
  router.post(
    '/scheduler/process',
    requireAuth,
    requireAdmin,
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
      const allocated = await orchestrationService.processReadyProjects();
      res.json({
        allocated,
        message: `Allocated agents to ${allocated} project phase(s)`,
      });
    })
  );

  // ===========================
  // Error handling middleware
  // ===========================

  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Project API error:', err.message);

    if (err.message.includes('required') || err.message.includes('Invalid') || err.message.includes('Cannot')) {
      return res.status(400).json({ error: err.message });
    }

    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  });

  return router;
}
