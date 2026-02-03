/**
 * Architecture Routes
 * 10 endpoints for architecture reviews, ADRs, and tech stack management
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT, requirePermission, authorize } from '../middleware/auth.middleware.js';
import { readLimiter, writeLimiter } from '../middleware/rateLimit.middleware.js';
import { asyncHandler, errors } from '../middleware/error.middleware.js';

const router = Router();
router.use(authenticateJWT);

const reviews = new Map();
const adrs = new Map();

// POST /api/v1/architecture/review
router.post('/review', writeLimiter, requirePermission('architecture:review'),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, proposedChanges, techStack, diagrams, risks } = req.body;
    const id = `review-${Date.now()}`;
    const review = {
      id,
      title,
      description,
      proposedChanges,
      techStack,
      diagrams: diagrams || [],
      risks: risks || [],
      status: 'pending',
      createdBy: (req as any).user.email,
      createdAt: new Date().toISOString(),
      comments: []
    };
    reviews.set(id, review);
    res.status(201).json({ success: true, data: review });
  })
);

// GET /api/v1/architecture/reviews
router.get('/reviews', readLimiter, requirePermission('architecture:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;
    let items = Array.from(reviews.values());

    if (status) {
      items = items.filter(r => r.status === status);
    }

    res.json({ success: true, data: items, meta: { total: items.length } });
  })
);

// GET /api/v1/architecture/reviews/:id
router.get('/reviews/:id', readLimiter, requirePermission('architecture:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const review = reviews.get(req.params.id);
    if (!review) throw errors.notFound('Architecture review');
    res.json({ success: true, data: review });
  })
);

// POST /api/v1/architecture/adrs
router.post('/adrs', writeLimiter, requirePermission('architecture:create'),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, status, context, decision, consequences, alternatives } = req.body;
    const adrNumber = adrs.size + 1;
    const id = `ADR-${String(adrNumber).padStart(4, '0')}`;
    const adr = {
      id,
      number: adrNumber,
      title,
      status,
      context,
      decision,
      consequences,
      alternatives: alternatives || [],
      createdBy: (req as any).user.email,
      createdAt: new Date().toISOString()
    };
    adrs.set(id, adr);
    res.status(201).json({ success: true, data: adr });
  })
);

// GET /api/v1/architecture/adrs
router.get('/adrs', readLimiter, requirePermission('architecture:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;
    let items = Array.from(adrs.values());

    if (status) {
      items = items.filter(a => a.status === status);
    }

    // Sort by ADR number
    items.sort((a, b) => b.number - a.number);

    res.json({ success: true, data: items, meta: { total: items.length } });
  })
);

// GET /api/v1/architecture/adrs/:id
router.get('/adrs/:id', readLimiter, requirePermission('architecture:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const adr = adrs.get(req.params.id);
    if (!adr) throw errors.notFound('ADR');
    res.json({ success: true, data: adr });
  })
);

// POST /api/v1/architecture/diagram
router.post('/diagram', readLimiter, requirePermission('architecture:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, components } = req.body;
    const diagram = {
      type,
      format: 'mermaid',
      content: `
graph TD
  A[Client] --> B[API Gateway]
  B --> C[Service Layer]
  C --> D[Database]
  C --> E[Cache]
      `.trim(),
      components
    };
    res.json({ success: true, data: diagram });
  })
);

// GET /api/v1/architecture/patterns
router.get('/patterns', readLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const patterns = [
      {
        id: 'microservices',
        name: 'Microservices Architecture',
        description: 'Distributed system with independent services',
        useCases: ['Large-scale applications', 'Independent team deployments'],
        tradeoffs: {
          pros: ['Scalability', 'Technology diversity', 'Fault isolation'],
          cons: ['Complexity', 'Network overhead', 'Data consistency challenges']
        }
      },
      {
        id: 'event-driven',
        name: 'Event-Driven Architecture',
        description: 'Asynchronous communication through events',
        useCases: ['Real-time systems', 'Decoupled components'],
        tradeoffs: {
          pros: ['Loose coupling', 'Scalability', 'Resilience'],
          cons: ['Eventual consistency', 'Debugging complexity', 'Event schema management']
        }
      },
      {
        id: 'layered',
        name: 'Layered Architecture',
        description: 'Separation of concerns through layers',
        useCases: ['Traditional web apps', 'Clear separation needed'],
        tradeoffs: {
          pros: ['Clear structure', 'Easy to understand', 'Testable'],
          cons: ['Performance overhead', 'Tight coupling between layers']
        }
      }
    ];
    res.json({ success: true, data: patterns });
  })
);

// POST /api/v1/architecture/evaluate
router.post('/evaluate', writeLimiter, requirePermission('architecture:evaluate'),
  asyncHandler(async (req: Request, res: Response) => {
    const { techStack, requirements } = req.body;
    const evaluation = {
      techStack,
      requirements,
      score: 85,
      strengths: [
        'Modern, well-supported technologies',
        'Good community and documentation',
        'Scalable architecture'
      ],
      weaknesses: [
        'Steep learning curve for some components',
        'Potential vendor lock-in'
      ],
      recommendations: [
        'Consider adding caching layer',
        'Implement API versioning strategy',
        'Add comprehensive monitoring'
      ]
    };
    res.json({ success: true, data: evaluation });
  })
);

// GET /api/v1/architecture/dependencies
router.get('/dependencies', readLimiter, requirePermission('architecture:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const dependencies = {
      services: [
        { name: 'api-server', dependsOn: ['database', 'cache', 'auth-service'] },
        { name: 'worker', dependsOn: ['queue', 'database'] },
        { name: 'auth-service', dependsOn: ['database', 'identity-provider'] }
      ],
      graph: {
        nodes: ['api-server', 'worker', 'auth-service', 'database', 'cache', 'queue'],
        edges: [
          { from: 'api-server', to: 'database' },
          { from: 'api-server', to: 'cache' },
          { from: 'api-server', to: 'auth-service' },
          { from: 'worker', to: 'queue' },
          { from: 'worker', to: 'database' }
        ]
      }
    };
    res.json({ success: true, data: dependencies });
  })
);

export default router;
