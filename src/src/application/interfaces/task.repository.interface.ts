import { Task } from '../../domain/entities/task.entity';
import { TaskStatus, Priority } from '../../domain/value-objects';

export interface TaskQueryOptions {
  status?: TaskStatus;
  priority?: Priority;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  order: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ITaskRepository {
  save(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findByUser(userId: string, options: TaskQueryOptions): Promise<PaginatedResult<Task>>;
  delete(id: string): Promise<void>;
  countByUser(userId: string): Promise<number>;
}
