import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../domain/errors';
import { JwtService } from '../../infrastructure/security/jwt.service';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

export function createAuthMiddleware(jwtService: JwtService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedError('Missing authorization header');
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new UnauthorizedError('Invalid authorization header format');
      }

      const token = parts[1];
      const payload = jwtService.verifyAccessToken(token);

      (req as AuthenticatedRequest).user = {
        id: payload.sub,
        email: payload.email,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
