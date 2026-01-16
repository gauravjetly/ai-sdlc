import { Router } from 'express';
import { createTaskRouter } from './task.routes';
import { createAuthRouter } from './auth.routes';
import { createHealthRouter } from './health.routes';
import { TaskController } from '../controllers/task.controller';
import { AuthController } from '../controllers/auth.controller';
import { HealthController } from '../controllers/health.controller';

export interface RouterDependencies {
  taskController: TaskController;
  authController: AuthController;
  healthController: HealthController;
  authMiddleware: any;
}

export function createRouter(deps: RouterDependencies): Router {
  const router = Router();

  // Health check routes (no /api/v1 prefix)
  const healthRouter = createHealthRouter(deps.healthController);
  router.use('/', healthRouter);

  // API v1 routes
  const authRouter = createAuthRouter(deps.authController);
  router.use('/api/v1/auth', authRouter);

  const taskRouter = createTaskRouter(deps.taskController, deps.authMiddleware);
  router.use('/api/v1/tasks', taskRouter);

  return router;
}
