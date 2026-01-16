import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

export function createHealthRouter(healthController: HealthController): Router {
  const router = Router();

  /**
   * GET /health
   * Liveness probe
   */
  router.get('/health', healthController.health);

  /**
   * GET /ready
   * Readiness probe
   */
  router.get('/ready', healthController.ready);

  return router;
}
