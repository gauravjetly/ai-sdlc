import { PrismaClient, Task as PrismaTask, TaskStatus as PrismaTaskStatus, Priority as PrismaPriority } from '@prisma/client';
import { Task } from '../../../domain/entities/task.entity';
import { TaskStatus, Priority } from '../../../domain/value-objects';
import {
  ITaskRepository,
  TaskQueryOptions,
  PaginatedResult,
} from '../../../application/interfaces/task.repository.interface';

export class TaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(task: Task): Promise<Task> {
    const data = {
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description,
      status: this.toPrismaStatus(task.status),
      priority: this.toPrismaPriority(task.priority),
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };

    await this.prisma.task.upsert({
      where: { id: task.id },
      create: data,
      update: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        updatedAt: data.updatedAt,
      },
    });

    return task;
  }

  async findById(id: string): Promise<Task | null> {
    const record = await this.prisma.task.findUnique({
      where: { id },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByUser(userId: string, options: TaskQueryOptions): Promise<PaginatedResult<Task>> {
    const where: any = { userId };

    if (options.status) {
      where.status = this.toPrismaStatus(options.status);
    }

    if (options.priority) {
      where.priority = this.toPrismaPriority(options.priority);
    }

    if (options.search) {
      where.title = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    const orderBy: any = {};
    const sortField = this.mapSortField(options.sortBy);
    orderBy[sortField] = options.order;

    const [records, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        total,
        totalPages: Math.ceil(total / options.pageSize),
      },
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({
      where: { id },
    });
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.task.count({
      where: { userId },
    });
  }

  private toDomain(record: PrismaTask): Task {
    return Task.fromPersistence({
      id: record.id,
      userId: record.userId,
      title: record.title,
      description: record.description,
      status: this.toDomainStatus(record.status),
      priority: this.toDomainPriority(record.priority),
      dueDate: record.dueDate,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private toPrismaStatus(status: TaskStatus): PrismaTaskStatus {
    const map: Record<TaskStatus, PrismaTaskStatus> = {
      [TaskStatus.TODO]: 'todo',
      [TaskStatus.IN_PROGRESS]: 'in_progress',
      [TaskStatus.DONE]: 'done',
    };
    return map[status];
  }

  private toDomainStatus(status: PrismaTaskStatus): TaskStatus {
    const map: Record<PrismaTaskStatus, TaskStatus> = {
      todo: TaskStatus.TODO,
      in_progress: TaskStatus.IN_PROGRESS,
      done: TaskStatus.DONE,
    };
    return map[status];
  }

  private toPrismaPriority(priority: Priority): PrismaPriority {
    const map: Record<Priority, PrismaPriority> = {
      [Priority.LOW]: 'low',
      [Priority.MEDIUM]: 'medium',
      [Priority.HIGH]: 'high',
    };
    return map[priority];
  }

  private toDomainPriority(priority: PrismaPriority): Priority {
    const map: Record<PrismaPriority, Priority> = {
      low: Priority.LOW,
      medium: Priority.MEDIUM,
      high: Priority.HIGH,
    };
    return map[priority];
  }

  private mapSortField(field: string): string {
    const validFields: Record<string, string> = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      dueDate: 'dueDate',
      title: 'title',
      priority: 'priority',
      status: 'status',
    };
    return validFields[field] || 'createdAt';
  }
}
