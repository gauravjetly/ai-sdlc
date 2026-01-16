import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validation.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';

export function createAuthRouter(authController: AuthController): Router {
  const router = Router();

  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  router.post(
    '/register',
    validateBody(registerSchema),
    authController.register
  );

  /**
   * POST /api/v1/auth/login
   * Login and get access tokens
   */
  router.post(
    '/login',
    validateBody(loginSchema),
    authController.login
  );

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  router.post(
    '/refresh',
    authController.refresh
  );

  return router;
}
