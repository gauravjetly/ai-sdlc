import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../../application/services/task.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CreateTaskInput, UpdateTaskInput, TaskQueryInput } from '../validators/task.validator';

export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  /**
   * Create a new task
   * POST /api/v1/tasks
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const dto = req.body as CreateTaskInput;

      const task = await this.taskService.create(authReq.user.id, dto);

      res.status(201).json({
        data: task.toJSON(),
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
   * Get task by ID
   * GET /api/v1/tasks/:id
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      const task = await this.taskService.findById(id, authReq.user.id);

      res.status(200).json({
        data: task.toJSON(),
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
   * List tasks with filtering and pagination
   * GET /api/v1/tasks
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = req.query as unknown as TaskQueryInput;

      const result = await this.taskService.findAll(authReq.user.id, query);

      res.status(200).json({
        data: result.items.map((task) => task.toJSON()),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req as any).id,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a task
   * PUT /api/v1/tasks/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const dto = req.body as UpdateTaskInput;

      const task = await this.taskService.update(id, authReq.user.id, dto);

      res.status(200).json({
        data: task.toJSON(),
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
   * Delete a task
   * DELETE /api/v1/tasks/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.taskService.delete(id, authReq.user.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
