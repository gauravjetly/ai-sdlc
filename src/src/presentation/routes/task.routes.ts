import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  taskIdSchema,
} from '../validators/task.validator';

export function createTaskRouter(
  taskController: TaskController,
  authMiddleware: any
): Router {
  const router = Router();

  // All task routes require authentication
  router.use(authMiddleware);

  /**
   * GET /api/v1/tasks
   * List all tasks with optional filtering and pagination
   */
  router.get(
    '/',
    validateQuery(taskQuerySchema),
    taskController.findAll
  );

  /**
   * POST /api/v1/tasks
   * Create a new task
   */
  router.post(
    '/',
    validateBody(createTaskSchema),
    taskController.create
  );

  /**
   * GET /api/v1/tasks/:id
   * Get a specific task by ID
   */
  router.get(
    '/:id',
    validateParams(taskIdSchema),
    taskController.findById
  );

  /**
   * PUT /api/v1/tasks/:id
   * Update a specific task
   */
  router.put(
    '/:id',
    validateParams(taskIdSchema),
    validateBody(updateTaskSchema),
    taskController.update
  );

  /**
   * DELETE /api/v1/tasks/:id
   * Delete a specific task
   */
  router.delete(
    '/:id',
    validateParams(taskIdSchema),
    taskController.delete
  );

  return router;
}
