import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { PrismaClient } from '@prisma/client';

import { loadConfig, Config } from './infrastructure/config';
import { JwtService } from './infrastructure/security/jwt.service';
import { PasswordService } from './infrastructure/security/password.service';
import { TaskRepository } from './infrastructure/database/repositories/task.repository';
import { UserRepository } from './infrastructure/database/repositories/user.repository';
import { TaskService } from './application/services/task.service';
import { AuthService } from './application/services/auth.service';
import { TaskController } from './presentation/controllers/task.controller';
import { AuthController } from './presentation/controllers/auth.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { createAuthMiddleware } from './presentation/middleware/auth.middleware';
import { requestIdMiddleware } from './presentation/middleware/request-id.middleware';
import { errorHandler, notFoundHandler } from './presentation/middleware/error.middleware';
import { createRouter } from './presentation/routes';
import { logger } from './shared/utils/logger';

export interface AppDependencies {
  config: Config;
  prisma: PrismaClient;
}

export function createApp(deps: AppDependencies): Application {
  const { config, prisma } = deps;
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.security.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMax,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    },
  }));

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(compression());

  // Request ID and logging
  app.use(requestIdMiddleware);
  app.use(pinoHttp({ logger }));

  // Initialize services
  const jwtService = new JwtService({
    privateKey: config.jwt.privateKey,
    publicKey: config.jwt.publicKey,
    accessTokenExpiry: config.jwt.accessTokenExpiry,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });

  const passwordService = new PasswordService(config.security.bcryptCost);

  // Initialize repositories
  const taskRepository = new TaskRepository(prisma);
  const userRepository = new UserRepository(prisma);

  // Initialize application services
  const taskService = new TaskService(taskRepository);
  const authService = new AuthService(userRepository, passwordService, jwtService);

  // Initialize controllers
  const taskController = new TaskController(taskService);
  const authController = new AuthController(authService);
  const healthController = new HealthController(prisma);

  // Initialize middleware
  const authMiddleware = createAuthMiddleware(jwtService);

  // Mount routes
  const router = createRouter({
    taskController,
    authController,
    healthController,
    authMiddleware,
  });

  app.use(router);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function bootstrap(): Promise<{ app: Application; prisma: PrismaClient }> {
  const config = loadConfig();
  const prisma = new PrismaClient();

  // Connect to database
  await prisma.$connect();
  logger.info('Database connected');

  const app = createApp({ config, prisma });

  return { app, prisma };
}
