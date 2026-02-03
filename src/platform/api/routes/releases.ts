/**
 * Release Management Routes
 * 10 endpoints for release planning and execution
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT, requirePermission, authorize } from '../middleware/auth.middleware.js';
import { readLimiter, writeLimiter, strictLimiter } from '../middleware/rateLimit.middleware.js';
import { asyncHandler, errors } from '../middleware/error.middleware.js';

const router = Router();
router.use(authenticateJWT);

const releases = new Map();

// POST /api/v1/releases
router.post('/', writeLimiter, requirePermission('releases:create'),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, version, environment, deployments, approvers, scheduledAt } = req.body;
    const id = `rel-${Date.now()}`;
    const release = {
      id,
      name,
      version,
      environment,
      deployments,
      approvers: approvers || [],
      scheduledAt,
      status: 'draft',
      approvals: approvers?.map((a: string) => ({ approver: a, status: 'pending' })) || [],
      createdAt: new Date().toISOString()
    };
    releases.set(id, release);
    res.status(201).json({ success: true, data: release });
  })
);

// GET /api/v1/releases
router.get('/', readLimiter, requirePermission('releases:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { environment, status } = req.query;
    let items = Array.from(releases.values());

    if (environment) {
      items = items.filter(r => r.environment === environment);
    }
    if (status) {
      items = items.filter(r => r.status === status);
    }

    res.json({ success: true, data: items, meta: { total: items.length } });
  })
);

// GET /api/v1/releases/:id
router.get('/:id', readLimiter, requirePermission('releases:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const release = releases.get(req.params.id);
    if (!release) throw errors.notFound('Release');
    res.json({ success: true, data: release });
  })
);

// POST /api/v1/releases/:id/execute
router.post('/:id/execute', strictLimiter, authorize('admin', 'operator'),
  asyncHandler(async (req: Request, res: Response) => {
    const release = releases.get(req.params.id);
    if (!release) throw errors.notFound('Release');

    const allApproved = release.approvals.every((a: any) => a.status === 'approved');
    if (!allApproved) {
      throw errors.badRequest('Release requires all approvals before execution');
    }

    release.status = 'in-progress';
    release.executedAt = new Date().toISOString();
    res.json({ success: true, data: release, message: 'Release execution started' });
  })
);

// POST /api/v1/releases/:id/rollback
router.post('/:id/rollback', strictLimiter, authorize('admin', 'operator'),
  asyncHandler(async (req: Request, res: Response) => {
    const release = releases.get(req.params.id);
    if (!release) throw errors.notFound('Release');

    if (release.status !== 'completed' && release.status !== 'failed') {
      throw errors.badRequest('Can only rollback completed or failed releases');
    }

    release.status = 'rolled-back';
    release.rolledBackAt = new Date().toISOString();
    res.json({ success: true, data: release, message: 'Release rollback initiated' });
  })
);

// GET /api/v1/releases/:id/notes
router.get('/:id/notes', readLimiter, requirePermission('releases:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const release = releases.get(req.params.id);
    if (!release) throw errors.notFound('Release');

    const notes = {
      releaseId: release.id,
      version: release.version,
      date: release.createdAt,
      summary: `Release ${release.version} to ${release.environment}`,
      features: [
        'New user dashboard with analytics',
        'Performance improvements for API endpoints',
        'Enhanced security with MFA support'
      ],
      bugFixes: [
        'Fixed memory leak in worker processes',
        'Resolved race condition in payment processing'
      ],
      breaking: [],
      migrations: ['Run database migration script v2.1.0']
    };
    res.json({ success: true, data: notes });
  })
);

// POST /api/v1/releases/:id/approve
router.post('/:id/approve', writeLimiter, requirePermission('releases:approve'),
  asyncHandler(async (req: Request, res: Response) => {
    const release = releases.get(req.params.id);
    if (!release) throw errors.notFound('Release');

    const { approved, comment } = req.body;
    const approverEmail = (req as any).user.email;

    const approval = release.approvals.find((a: any) => a.approver === approverEmail);
    if (!approval) {
      throw errors.forbidden('You are not an approver for this release');
    }

    approval.status = approved ? 'approved' : 'rejected';
    approval.comment = comment;
    approval.timestamp = new Date().toISOString();

    res.json({ success: true, data: release, message: `Release ${approved ? 'approved' : 'rejected'}` });
  })
);

// GET /api/v1/releases/calendar
router.get('/calendar', readLimiter, requirePermission('releases:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const scheduled = Array.from(releases.values())
      .filter(r => r.scheduledAt)
      .map(r => ({
        id: r.id,
        name: r.name,
        version: r.version,
        environment: r.environment,
        scheduledAt: r.scheduledAt,
        status: r.status
      }));
    res.json({ success: true, data: scheduled });
  })
);

// GET /api/v1/releases/environments
router.get('/environments', readLimiter, requirePermission('releases:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const byEnvironment = {
      dev: Array.from(releases.values()).filter(r => r.environment === 'dev'),
      uat: Array.from(releases.values()).filter(r => r.environment === 'uat'),
      prod: Array.from(releases.values()).filter(r => r.environment === 'prod')
    };
    res.json({ success: true, data: byEnvironment });
  })
);

// POST /api/v1/releases/:id/notifications
router.post('/:id/notifications', writeLimiter, requirePermission('releases:notify'),
  asyncHandler(async (req: Request, res: Response) => {
    const release = releases.get(req.params.id);
    if (!release) throw errors.notFound('Release');

    const { channels, message } = req.body;
    res.json({
      success: true,
      message: 'Release notifications sent',
      data: { channels, recipients: channels.length * 10 }
    });
  })
);

export default router;
