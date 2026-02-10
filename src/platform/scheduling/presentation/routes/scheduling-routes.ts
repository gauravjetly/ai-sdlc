/**
 * Scheduling Routes
 *
 * Express router for all scheduling-related API endpoints.
 * Handles work items, triggers, agent memory, templates, executions, and dashboard.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateWorkItemSchema,
  WorkItemFiltersSchema,
  CreateTriggerSchema,
  TriggerFiltersSchema,
  StoreMemorySchema,
  MemoryFiltersSchema,
  CreateTemplateSchema,
  InstantiateTemplateSchema,
  ExecutionFiltersSchema,
} from '../dto/scheduling-dto';
import { SchedulingService } from '../../application/services/SchedulingService';
import { TriggerService } from '../../application/services/TriggerService';
import { AgentMemoryService } from '../../application/services/AgentMemoryService';

/**
 * Zod validation middleware factory
 */
function validate(schema: any, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(source === 'body' ? req.body : req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    if (source === 'body') {
      req.body = result.data;
    } else {
      (req as any).validatedQuery = result.data;
    }
    next();
  };
}

/**
 * Async route handler wrapper
 */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

/**
 * Create scheduling routes
 */
export function createSchedulingRoutes(
  schedulingService: SchedulingService,
  triggerService: TriggerService,
  memoryService: AgentMemoryService,
): Router {
  const router = Router();

  // ===========================
  // Dashboard
  // ===========================

  router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const dashboard = await schedulingService.getDashboard(userId);
    res.json(dashboard);
  }));

  // ===========================
  // Work Items
  // ===========================

  router.post(
    '/work',
    validate(CreateWorkItemSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id || 'system';
      const workItem = await schedulingService.createWorkItem({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(workItem.toJSON());
    }),
  );

  router.get(
    '/work',
    validate(WorkItemFiltersSchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      const filters = (req as any).validatedQuery;
      const userId = (req as any).user?.id;
      const result = await schedulingService.listWorkItems({
        ...filters,
        createdBy: userId,
      });
      res.json({
        items: result.items.map(item => item.toJSON()),
        total: result.total,
        offset: filters.offset,
        limit: filters.limit,
      });
    }),
  );

  router.get('/work/:id', asyncHandler(async (req: Request, res: Response) => {
    const workItem = await schedulingService.getWorkItem(req.params.id);
    if (!workItem) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    res.json(workItem.toJSON());
  }));

  router.post('/work/:id/pause', asyncHandler(async (req: Request, res: Response) => {
    const workItem = await schedulingService.pauseWorkItem(req.params.id);
    res.json(workItem.toJSON());
  }));

  router.post('/work/:id/resume', asyncHandler(async (req: Request, res: Response) => {
    const workItem = await schedulingService.resumeWorkItem(req.params.id);
    res.json(workItem.toJSON());
  }));

  router.post('/work/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
    const workItem = await schedulingService.cancelWorkItem(req.params.id);
    res.json(workItem.toJSON());
  }));

  router.delete('/work/:id', asyncHandler(async (req: Request, res: Response) => {
    await schedulingService.deleteWorkItem(req.params.id);
    res.status(204).send();
  }));

  // ===========================
  // Triggers
  // ===========================

  router.post(
    '/triggers',
    validate(CreateTriggerSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id || 'system';
      const trigger = await triggerService.createTrigger({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(trigger.toJSON());
    }),
  );

  router.get(
    '/triggers',
    validate(TriggerFiltersSchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      const filters = (req as any).validatedQuery;
      const result = await triggerService.listTriggers(filters);
      res.json({
        items: result.items.map(item => item.toJSON()),
        total: result.total,
        offset: filters.offset,
        limit: filters.limit,
      });
    }),
  );

  router.get('/triggers/:id', asyncHandler(async (req: Request, res: Response) => {
    const trigger = await triggerService.getTrigger(req.params.id);
    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }
    res.json(trigger.toJSON());
  }));

  router.post('/triggers/:id/enable', asyncHandler(async (req: Request, res: Response) => {
    const trigger = await triggerService.enableTrigger(req.params.id);
    res.json(trigger.toJSON());
  }));

  router.post('/triggers/:id/disable', asyncHandler(async (req: Request, res: Response) => {
    const trigger = await triggerService.disableTrigger(req.params.id);
    res.json(trigger.toJSON());
  }));

  router.delete('/triggers/:id', asyncHandler(async (req: Request, res: Response) => {
    await triggerService.deleteTrigger(req.params.id);
    res.status(204).send();
  }));

  // ===========================
  // Agent Memory
  // ===========================

  router.get(
    '/agents/:agentId/memory',
    validate(MemoryFiltersSchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      const filters = (req as any).validatedQuery;
      const result = await memoryService.retrieveAll(req.params.agentId, filters);
      res.json({
        items: result.items.map(item => item.toJSON()),
        total: result.total,
        offset: filters.offset,
        limit: filters.limit,
      });
    }),
  );

  router.get('/agents/:agentId/memory/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = await memoryService.getStats(req.params.agentId);
    res.json(stats);
  }));

  router.get('/agents/:agentId/memory/:key', asyncHandler(async (req: Request, res: Response) => {
    const value = await memoryService.retrieve(req.params.agentId, req.params.key);
    if (value === null) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }
    res.json({ key: req.params.key, value });
  }));

  router.post(
    '/agents/:agentId/memory',
    validate(StoreMemorySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const memory = await memoryService.store(
        req.params.agentId,
        req.body.key,
        req.body.value,
        req.body.ttlMinutes,
      );
      res.status(201).json(memory.toJSON());
    }),
  );

  router.delete('/agents/:agentId/memory/:key', asyncHandler(async (req: Request, res: Response) => {
    await memoryService.delete(req.params.agentId, req.params.key);
    res.status(204).send();
  }));

  router.delete('/agents/:agentId/memory', asyncHandler(async (req: Request, res: Response) => {
    const count = await memoryService.clearAll(req.params.agentId);
    res.json({ deletedCount: count });
  }));

  // ===========================
  // Executions
  // ===========================

  router.get(
    '/executions',
    validate(ExecutionFiltersSchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      const filters = (req as any).validatedQuery;
      const workItemId = filters.workItemId;

      if (workItemId) {
        const executions = await schedulingService.getExecutionHistory(workItemId);
        res.json({
          items: executions.map(e => e.toJSON()),
          total: executions.length,
        });
      } else {
        res.json({ items: [], total: 0, message: 'Provide workItemId filter' });
      }
    }),
  );

  router.get('/executions/:id', asyncHandler(async (req: Request, res: Response) => {
    // Execution detail would be looked up directly
    res.json({ id: req.params.id, message: 'Execution detail endpoint' });
  }));

  // ===========================
  // Error handling middleware
  // ===========================

  router.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Scheduling API error:', err.message);

    // Domain validation errors
    if (err.message.includes('required') || err.message.includes('Invalid') || err.message.includes('Cannot')) {
      return res.status(400).json({ error: err.message });
    }

    // Not found errors
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    // Generic server error
    res.status(500).json({ error: 'Internal server error' });
  });

  return router;
}
