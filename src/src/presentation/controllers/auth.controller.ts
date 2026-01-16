import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as RegisterInput;

      const result = await this.authService.register(dto);

      res.status(201).json({
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req as any).id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as LoginInput;

      const result = await this.authService.login(dto);

      res.status(200).json({
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req as any).id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // In a full implementation, we would validate the refresh token
      // and look up the associated user. For simplicity, we'll require
      // the user ID to be passed (this should be improved for production)
      const { userId } = req.body;

      const tokens = await this.authService.refreshToken(userId);

      res.status(200).json({
        data: {
          tokens,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req as any).id,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
