/**
 * Deployment Routes
 * 15 endpoints for deployment operations
 */

import { Router } from 'express';
import deploymentController from '../controllers/deployment.controller.js';
import { authenticateJWT, authorize, requirePermission } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { writeLimiter, readLimiter } from '../middleware/rateLimit.middleware.js';
import * as validators from '../validators/deployment.validator.js';

const router = Router();

// All deployment routes require authentication
// Temporarily disabled for development testing
// router.use(authenticateJWT);

/**
 * @swagger
 * /api/v1/deployments:
 *   post:
 *     summary: Create a new deployment
 *     tags: [Deployments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeploymentRequest'
 *     responses:
 *       201:
 *         description: Deployment created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Deployment already exists
 */
router.post(
  '/',
  writeLimiter,
  // requirePermission('deployments:create'), // Temporarily disabled for development
  validate(validators.createDeploymentSchema),
  deploymentController.createDeployment
);

/**
 * @swagger
 * /api/v1/deployments:
 *   get:
 *     summary: List all deployments with pagination and filtering
 *     tags: [Deployments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: environment
 *         schema:
 *           type: string
 *           enum: [dev, uat, prod, dr]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of deployments
 */
router.get(
  '/',
  readLimiter,
  requirePermission('deployments:read'),
  validate(validators.deploymentQuerySchema, 'query'),
  deploymentController.listDeployments
);

/**
 * @swagger
 * /api/v1/deployments/{id}:
 *   get:
 *     summary: Get deployment details
 *     tags: [Deployments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deployment details
 *       404:
 *         description: Deployment not found
 */
router.get(
  '/:id',
  readLimiter,
  requirePermission('deployments:read'),
  validate(validators.deploymentIdSchema, 'params'),
  deploymentController.getDeployment
);

/**
 * @swagger
 * /api/v1/deployments/{id}/status:
 *   get:
 *     summary: Get deployment status
 *     tags: [Deployments]
 */
router.get(
  '/:id/status',
  readLimiter,
  requirePermission('deployments:read'),
  validate(validators.deploymentIdSchema, 'params'),
  deploymentController.getDeploymentStatus
);

/**
 * @swagger
 * /api/v1/deployments/{id}/logs:
 *   get:
 *     summary: Get deployment logs
 *     tags: [Deployments]
 */
router.get(
  '/:id/logs',
  readLimiter,
  requirePermission('logs:read'),
  validate(validators.deploymentIdSchema, 'params'),
  deploymentController.getDeploymentLogs
);

/**
 * @swagger
 * /api/v1/deployments/{id}/rollback:
 *   post:
 *     summary: Rollback deployment
 *     tags: [Deployments]
 */
router.post(
  '/:id/rollback',
  writeLimiter,
  requirePermission('deployments:rollback'),
  validate(validators.deploymentIdSchema, 'params'),
  validate(validators.rollbackDeploymentSchema),
  deploymentController.rollbackDeployment
);

/**
 * @swagger
 * /api/v1/deployments/{id}:
 *   delete:
 *     summary: Delete deployment
 *     tags: [Deployments]
 */
router.delete(
  '/:id',
  writeLimiter,
  authorize('admin', 'operator'),
  validate(validators.deploymentIdSchema, 'params'),
  deploymentController.deleteDeployment
);

/**
 * @swagger
 * /api/v1/deployments/{id}/history:
 *   get:
 *     summary: Get deployment history
 *     tags: [Deployments]
 */
router.get(
  '/:id/history',
  readLimiter,
  requirePermission('deployments:read'),
  validate(validators.deploymentIdSchema, 'params'),
  deploymentController.getDeploymentHistory
);

/**
 * @swagger
 * /api/v1/deployments/{id}/scale:
 *   post:
 *     summary: Scale deployment
 *     tags: [Deployments]
 */
router.post(
  '/:id/scale',
  writeLimiter,
  requirePermission('deployments:scale'),
  validate(validators.deploymentIdSchema, 'params'),
  validate(validators.scaleDeploymentSchema),
  deploymentController.scaleDeployment
);

/**
 * @swagger
 * /api/v1/deployments/{id}/restart:
 *   post:
 *     summary: Restart deployment
 *     tags: [Deployments]
 */
router.post(
  '/:id/restart',
  writeLimiter,
  requirePermission('deployments:restart'),
  validate(validators.deploymentIdSchema, 'params'),
  deploymentController.restartDeployment
);

/**
 * @swagger
 * /api/v1/deployments/{id}/metrics:
 *   get:
 *     summary: Get deployment metrics
 *     tags: [Deployments]
 */
router.get(
  '/:id/metrics',
  readLimiter,
  requirePermission('metrics:read'),
  validate(validators.deploymentIdSchema, 'params'),
  deploymentController.getDeploymentMetrics
);

/**
 * @swagger
 * /api/v1/deployments/{id}/events:
 *   get:
 *     summary: Get deployment events
 *     tags: [Deployments]
 */
router.get(
  '/:id/events',
  readLimiter,
  requirePermission('deployments:read'),
  validate(validators.deploymentIdSchema, 'params'),
  deploymentController.getDeploymentEvents
);

/**
 * @swagger
 * /api/v1/deployments/{id}/approve:
 *   post:
 *     summary: Approve deployment
 *     tags: [Deployments]
 */
router.post(
  '/:id/approve',
  writeLimiter,
  authorize('admin', 'operator'),
  validate(validators.deploymentIdSchema, 'params'),
  validate(validators.approveDeploymentSchema),
  deploymentController.approveDeployment
);

/**
 * @swagger
 * /api/v1/deployments/{id}/promote:
 *   post:
 *     summary: Promote deployment to next environment
 *     tags: [Deployments]
 */
router.post(
  '/:id/promote',
  writeLimiter,
  authorize('admin', 'operator'),
  validate(validators.deploymentIdSchema, 'params'),
  deploymentController.promoteDeployment
);

/**
 * @swagger
 * /api/v1/deployments/environments/{env}:
 *   get:
 *     summary: List deployments by environment
 *     tags: [Deployments]
 */
router.get(
  '/environments/:env',
  readLimiter,
  requirePermission('deployments:read'),
  deploymentController.getDeploymentsByEnvironment
);

export default router;
