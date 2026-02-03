/**
 * Express API Server
 * Main entry point for REST API with 120+ endpoints
 */

import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { createLogger } from '../utils/logger.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { standardLimiter } from './middleware/rateLimit.middleware.js';

// Import routes
import deploymentRoutes from './routes/deployments.js';
import infrastructureRoutes from './routes/infrastructure.js';
import securityRoutes from './routes/security.js';
import costRoutes from './routes/costs.js';
import observabilityRoutes from './routes/observability.js';
import testingRoutes from './routes/testing.js';
import releaseRoutes from './routes/releases.js';
import architectureRoutes from './routes/architecture.js';

// Import Infrastructure Designer routes
import templateRoutes from './routes/templates.js';
import designRoutes from './routes/designs.js';
import workflowRoutes from './routes/workflows.js';

const logger = createLogger('APIServer');

class ApiServer {
  public app: Application;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSwagger();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      const traceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      (req as any).traceId = traceId;

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('HTTP Request', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          traceId,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      });

      next();
    });

    // Global rate limiting
    this.app.use('/api/', standardLimiter);
  }

  private setupRoutes(): void {
    // Health check endpoint (no auth required)
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0'
        }
      });
    });

    // API version info
    this.app.get('/api/v1', (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          version: 'v1',
          endpoints: {
            deployments: 15,
            infrastructure: 15,
            security: 15,
            costs: 12,
            observability: 15,
            testing: 10,
            releases: 10,
            architecture: 10,
            templates: 7,
            designs: 7,
            workflows: 8,
            total: 124
          },
          documentation: '/api-docs'
        }
      });
    });

    // Register API routes - Core Platform
    this.app.use('/api/v1/deployments', deploymentRoutes);
    this.app.use('/api/v1/infrastructure', infrastructureRoutes);
    this.app.use('/api/v1/security', securityRoutes);
    this.app.use('/api/v1/costs', costRoutes);
    this.app.use('/api/v1/observability', observabilityRoutes);
    this.app.use('/api/v1/tests', testingRoutes);
    this.app.use('/api/v1/releases', releaseRoutes);
    this.app.use('/api/v1/architecture', architectureRoutes);

    // Register API routes - Infrastructure Designer
    this.app.use('/api/v1/templates', templateRoutes);
    this.app.use('/api/v1/designs', designRoutes);
    this.app.use('/api/v1/workflows', workflowRoutes);

    logger.info('API routes registered', {
      totalEndpoints: 124
    });
  }

  private setupSwagger(): void {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Catalyst Cloud Management Platform API',
          version: '1.0.0',
          description: 'Complete REST API for multi-cloud platform operations with 120+ endpoints including Infrastructure Designer',
          contact: {
            name: 'Platform Team',
            email: 'platform@example.com'
          },
          license: {
            name: 'ISC',
            url: 'https://opensource.org/licenses/ISC'
          }
        },
        servers: [
          {
            url: `http://localhost:${this.port}`,
            description: 'Development server'
          },
          {
            url: 'https://api.platform.example.com',
            description: 'Production server'
          }
        ],
        tags: [
          { name: 'Templates', description: 'Infrastructure template management' },
          { name: 'Designs', description: 'Visual design management' },
          { name: 'Workflows', description: 'Design workflow orchestration' },
          { name: 'Deployments', description: 'Deployment management' },
          { name: 'Infrastructure', description: 'Infrastructure resource management' },
          { name: 'Security', description: 'Security scanning and compliance' },
          { name: 'Costs', description: 'Cost management and optimization' },
          { name: 'Observability', description: 'Monitoring and logging' },
          { name: 'Testing', description: 'Test execution and results' },
          { name: 'Releases', description: 'Release management' },
          { name: 'Architecture', description: 'Architecture documentation' }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'RS256 JWT authentication. Use format: Bearer <token>'
            }
          },
          schemas: {
            ApiResponse: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: { type: 'object' },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                    details: { type: 'array' },
                    traceId: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                },
                meta: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    hasMore: { type: 'boolean' }
                  }
                }
              }
            },
            Template: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string', enum: ['network_foundation', 'compute_platform', 'storage_database', 'security', 'monitoring', 'fullstack', 'custom'] },
                visibility: { type: 'string', enum: ['private', 'organization', 'public'] },
                templateData: { type: 'object' },
                layerType: { type: 'string', enum: ['network', 'platform', 'devops', 'fullstack'] },
                version: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                usageCount: { type: 'integer' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            Design: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                description: { type: 'string' },
                designData: { type: 'object' },
                status: { type: 'string', enum: ['draft', 'validated', 'deploying', 'deployed', 'failed', 'archived'] },
                environment: { type: 'string', enum: ['dev', 'uat', 'production', 'dr'] },
                cloud: { type: 'string', enum: ['aws', 'oci', 'azure', 'gcp'] },
                region: { type: 'string' },
                estimatedMonthlyCost: { type: 'number' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            Workflow: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                designId: { type: 'string', format: 'uuid' },
                currentLayer: { type: 'string', enum: ['network', 'platform', 'devops', 'fullstack'] },
                currentStep: { type: 'integer' },
                networkComplete: { type: 'boolean' },
                platformComplete: { type: 'boolean' },
                devopsComplete: { type: 'boolean' },
                environments: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            DeploymentRequest: {
              type: 'object',
              required: ['name', 'environment', 'version', 'image', 'cluster'],
              properties: {
                name: { type: 'string', pattern: '^[a-z0-9-]+$' },
                environment: { type: 'string', enum: ['dev', 'uat', 'prod', 'dr'] },
                version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
                replicas: { type: 'integer', minimum: 1, maximum: 100, default: 3 },
                strategy: { type: 'string', enum: ['rolling', 'blue-green', 'canary'], default: 'rolling' },
                image: { type: 'string' },
                cluster: { type: 'string' },
                environmentVariables: { type: 'object', additionalProperties: { type: 'string' } }
              }
            }
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      },
      apis: ['./api/routes/*.ts', './api/routes/*.js']
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'Catalyst Platform API Documentation',
      customCss: '.swagger-ui .topbar { display: none }'
    }));

    logger.info('Swagger UI available at /api-docs');
  }

  private setupErrorHandling(): void {
    // 404 handler for undefined routes
    this.app.use(notFoundHandler);

    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info('API Server started', {
        port: this.port,
        environment: process.env.NODE_ENV || 'development',
        documentation: `http://localhost:${this.port}/api-docs`,
        health: `http://localhost:${this.port}/health`
      });

      // Log all registered routes in development
      if (process.env.NODE_ENV === 'development') {
        this.logRoutes();
      }
    });
  }

  private logRoutes(): void {
    const routes: string[] = [];

    const extractRoutes = (stack: any[], basePath: string = '') => {
      stack.forEach(layer => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(', ');
          routes.push(`${methods.padEnd(10)} ${basePath}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
          const path = layer.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\^/g, '')
            .replace(/\$/g, '');
          extractRoutes(layer.handle.stack, basePath + path);
        }
      });
    };

    extractRoutes(this.app._router.stack);

    logger.info('Registered routes:', {
      total: routes.length,
      routes: routes.slice(0, 20) // Log first 20 for brevity
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

// Create and export server instance
const apiServer = new ApiServer(Number(process.env.PORT) || 3000);

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  apiServer.start();
}

export default apiServer;
export { ApiServer };
