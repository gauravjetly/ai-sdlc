import { Task, CreateTaskProps, UpdateTaskProps } from '../../domain/entities/task.entity';
import { TaskStatus, Priority } from '../../domain/value-objects';
import { NotFoundError, ForbiddenError } from '../../domain/errors';
import {
  ITaskRepository,
  TaskQueryOptions,
  PaginatedResult,
} from '../interfaces/task.repository.interface';

export interface CreateTaskDto {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
}

export interface TaskQueryDto {
  status?: TaskStatus;
  priority?: Priority;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export class TaskService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * Create a new task for a user
   */
  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    const createProps: CreateTaskProps = {
      userId,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    };

    const task = Task.create(createProps);
    return this.taskRepository.save(task);
  }

  /**
   * Find a task by ID with authorization check
   */
  async findById(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    if (!task.belongsTo(userId)) {
      throw new ForbiddenError('You do not have access to this task');
    }

    return task;
  }

  /**
   * Find all tasks for a user with filtering and pagination
   */
  async findAll(userId: string, query: TaskQueryDto): Promise<PaginatedResult<Task>> {
    const options: TaskQueryOptions = {
      status: query.status,
      priority: query.priority,
      search: query.search,
      page: query.page || 1,
      pageSize: Math.min(query.pageSize || 20, 100),
      sortBy: query.sortBy || 'createdAt',
      order: query.order || 'desc',
    };

    return this.taskRepository.findByUser(userId, options);
  }

  /**
   * Update an existing task
   */
  async update(taskId: string, userId: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findById(taskId, userId);

    const updateProps: UpdateTaskProps = {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
    };

    task.update(updateProps);
    return this.taskRepository.save(task);
  }

  /**
   * Delete a task
   */
  async delete(taskId: string, userId: string): Promise<void> {
    // Authorization check
    await this.findById(taskId, userId);
    await this.taskRepository.delete(taskId);
  }

  /**
   * Get task count for a user
   */
  async countByUser(userId: string): Promise<number> {
    return this.taskRepository.countByUser(userId);
  }
}
