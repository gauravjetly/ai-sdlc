/**
 * Deployment Controller
 * Handles deployment operations (15 endpoints)
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest, DeploymentRequest, DeploymentResponse } from '../types/api-types.js';
import { errors, asyncHandler } from '../middleware/error.middleware.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('DeploymentController');

// Mock deployment store (replace with real database)
const deployments = new Map<string, DeploymentResponse>();

class DeploymentController {
  /**
   * POST /api/v1/deployments
   * Create a new deployment
   */
  createDeployment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const deploymentData: DeploymentRequest = req.body;

    logger.info('Creating deployment', {
      name: deploymentData.name,
      environment: deploymentData.environment,
      userId: req.user?.sub
    });

    // Check for duplicate name in same environment
    const existing = Array.from(deployments.values()).find(
      d => d.name === deploymentData.name && d.environment === deploymentData.environment
    );

    if (existing) {
      throw errors.conflict(`Deployment ${deploymentData.name} already exists in ${deploymentData.environment}`);
    }

    const deployment: DeploymentResponse = {
      id: `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: deploymentData.name,
      environment: deploymentData.environment,
      version: deploymentData.version,
      status: 'pending',
      replicas: deploymentData.replicas || 3,
      strategy: deploymentData.strategy || 'rolling',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user?.email || 'unknown'
    };

    deployments.set(deployment.id, deployment);

    logger.info('Deployment created', { deploymentId: deployment.id });

    res.status(201).json({
      success: true,
      data: deployment
    });
  });

  /**
   * GET /api/v1/deployments
   * List all deployments with pagination and filtering
   */
  listDeployments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { environment, status, cluster, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

    let filtered = Array.from(deployments.values());

    // Apply filters
    if (environment) {
      filtered = filtered.filter(d => d.environment === environment);
    }
    if (status) {
      filtered = filtered.filter(d => d.status === status);
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      const aVal = a[sort as string];
      const bVal = b[sort as string];
      return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    // Paginate
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIdx = (pageNum - 1) * limitNum;
    const endIdx = startIdx + limitNum;
    const paginated = filtered.slice(startIdx, endIdx);

    res.json({
      success: true,
      data: paginated,
      meta: {
        total: filtered.length,
        page: pageNum,
        limit: limitNum,
        hasMore: endIdx < filtered.length
      }
    });
  });

  /**
   * GET /api/v1/deployments/:id
   * Get deployment details
   */
  getDeployment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deployment = deployments.get(id);

    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    res.json({
      success: true,
      data: deployment
    });
  });

  /**
   * GET /api/v1/deployments/:id/status
   * Get deployment status
   */
  getDeploymentStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deployment = deployments.get(id);

    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    res.json({
      success: true,
      data: {
        id: deployment.id,
        status: deployment.status,
        replicas: deployment.replicas,
        readyReplicas: deployment.status === 'running' ? deployment.replicas : 0,
        updatedAt: deployment.updatedAt
      }
    });
  });

  /**
   * GET /api/v1/deployments/:id/logs
   * Get deployment logs
   */
  getDeploymentLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { lines = 100, since, follow } = req.query;

    const deployment = deployments.get(id);
    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    // Mock logs
    const logs = Array.from({ length: Number(lines) }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      pod: `${deployment.name}-${Math.random().toString(36).substr(2, 5)}`,
      level: ['INFO', 'WARN', 'ERROR'][Math.floor(Math.random() * 3)],
      message: `Log line ${i + 1} from deployment ${deployment.name}`
    }));

    res.json({
      success: true,
      data: {
        deploymentId: id,
        logs: logs.reverse()
      }
    });
  });

  /**
   * POST /api/v1/deployments/:id/rollback
   * Rollback deployment
   */
  rollbackDeployment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { targetRevision, reason } = req.body;

    const deployment = deployments.get(id);
    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    logger.warn('Rolling back deployment', {
      deploymentId: id,
      targetRevision,
      reason,
      userId: req.user?.sub
    });

    deployment.status = 'rolled-back';
    deployment.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: deployment,
      message: 'Deployment rollback initiated'
    });
  });

  /**
   * DELETE /api/v1/deployments/:id
   * Delete deployment
   */
  deleteDeployment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    if (!deployments.has(id)) {
      throw errors.notFound('Deployment');
    }

    logger.warn('Deleting deployment', {
      deploymentId: id,
      userId: req.user?.sub
    });

    deployments.delete(id);

    res.status(204).send();
  });

  /**
   * GET /api/v1/deployments/:id/history
   * Get deployment history
   */
  getDeploymentHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deployment = deployments.get(id);

    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    // Mock history
    const history = [
      {
        revision: 3,
        version: deployment.version,
        timestamp: deployment.updatedAt,
        status: deployment.status,
        changedBy: deployment.createdBy
      },
      {
        revision: 2,
        version: '1.0.1',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'completed',
        changedBy: deployment.createdBy
      },
      {
        revision: 1,
        version: '1.0.0',
        timestamp: deployment.createdAt,
        status: 'completed',
        changedBy: deployment.createdBy
      }
    ];

    res.json({
      success: true,
      data: history
    });
  });

  /**
   * POST /api/v1/deployments/:id/scale
   * Scale deployment
   */
  scaleDeployment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { replicas } = req.body;

    const deployment = deployments.get(id);
    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    logger.info('Scaling deployment', {
      deploymentId: id,
      fromReplicas: deployment.replicas,
      toReplicas: replicas,
      userId: req.user?.sub
    });

    deployment.replicas = replicas;
    deployment.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: deployment,
      message: `Scaled deployment to ${replicas} replicas`
    });
  });

  /**
   * POST /api/v1/deployments/:id/restart
   * Restart deployment
   */
  restartDeployment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deployment = deployments.get(id);

    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    logger.info('Restarting deployment', {
      deploymentId: id,
      userId: req.user?.sub
    });

    deployment.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: deployment,
      message: 'Deployment restart initiated'
    });
  });

  /**
   * GET /api/v1/deployments/:id/metrics
   * Get deployment metrics
   */
  getDeploymentMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deployment = deployments.get(id);

    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    // Mock metrics
    const metrics = {
      deploymentId: id,
      cpu: {
        current: '250m',
        limit: '1000m',
        usage: 25
      },
      memory: {
        current: '512Mi',
        limit: '2Gi',
        usage: 25
      },
      replicas: {
        desired: deployment.replicas,
        ready: deployment.status === 'running' ? deployment.replicas : 0,
        unavailable: deployment.status === 'running' ? 0 : deployment.replicas
      },
      requests: {
        total: Math.floor(Math.random() * 10000),
        errors: Math.floor(Math.random() * 100),
        avgLatency: Math.floor(Math.random() * 100) + 'ms'
      }
    };

    res.json({
      success: true,
      data: metrics
    });
  });

  /**
   * GET /api/v1/deployments/:id/events
   * Get deployment events
   */
  getDeploymentEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deployment = deployments.get(id);

    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    // Mock events
    const events = [
      {
        type: 'Normal',
        reason: 'Scaled',
        message: `Scaled deployment to ${deployment.replicas} replicas`,
        timestamp: new Date().toISOString()
      },
      {
        type: 'Normal',
        reason: 'Created',
        message: 'Created deployment',
        timestamp: deployment.createdAt
      }
    ];

    res.json({
      success: true,
      data: events
    });
  });

  /**
   * POST /api/v1/deployments/:id/approve
   * Approve deployment
   */
  approveDeployment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { approved, comment } = req.body;

    const deployment = deployments.get(id);
    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    logger.info('Deployment approval decision', {
      deploymentId: id,
      approved,
      comment,
      userId: req.user?.sub
    });

    if (approved) {
      deployment.status = 'deploying';
    } else {
      deployment.status = 'failed';
    }

    deployment.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: deployment,
      message: approved ? 'Deployment approved' : 'Deployment rejected'
    });
  });

  /**
   * POST /api/v1/deployments/:id/promote
   * Promote deployment to next environment
   */
  promoteDeployment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deployment = deployments.get(id);

    if (!deployment) {
      throw errors.notFound('Deployment');
    }

    const envHierarchy = ['dev', 'uat', 'prod'];
    const currentIndex = envHierarchy.indexOf(deployment.environment);

    if (currentIndex === -1 || currentIndex === envHierarchy.length - 1) {
      throw errors.badRequest('Cannot promote from this environment');
    }

    const nextEnv = envHierarchy[currentIndex + 1];

    logger.info('Promoting deployment', {
      deploymentId: id,
      fromEnv: deployment.environment,
      toEnv: nextEnv,
      userId: req.user?.sub
    });

    // Create new deployment in next environment
    const promoted: DeploymentResponse = {
      ...deployment,
      id: `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      environment: nextEnv,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    deployments.set(promoted.id, promoted);

    res.status(201).json({
      success: true,
      data: promoted,
      message: `Deployment promoted to ${nextEnv}`
    });
  });

  /**
   * GET /api/v1/deployments/environments/:env
   * List deployments by environment
   */
  getDeploymentsByEnvironment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { env } = req.params;
    const filtered = Array.from(deployments.values()).filter(d => d.environment === env);

    res.json({
      success: true,
      data: filtered,
      meta: {
        total: filtered.length,
        environment: env
      }
    });
  });
}

export default new DeploymentController();
