import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export class HealthController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Liveness probe - is the service running?
   * GET /health
   */
  health = (req: Request, res: Response): void => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Readiness probe - is the service ready to handle requests?
   * GET /ready
   */
  ready = async (req: Request, res: Response): Promise<void> => {
    const checks: Record<string, string> = {};
    let isReady = true;

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch (error) {
      checks.database = 'disconnected';
      isReady = false;
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 500 * 1024 * 1024; // 500MB
    if (memoryUsage.heapUsed < memoryThreshold) {
      checks.memory = 'ok';
    } else {
      checks.memory = 'high';
      isReady = false;
    }

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  };
}
