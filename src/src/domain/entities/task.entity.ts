import { v4 as uuidv4 } from 'uuid';
import { TaskStatus, Priority } from '../value-objects';
import { ValidationError } from '../errors/validation.error';

export interface TaskProps {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskProps {
  userId: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: Date | null;
}

export interface UpdateTaskProps {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: Date | null;
}

export class Task {
  readonly id: string;
  readonly userId: string;
  private _title: string;
  private _description: string | null;
  private _status: TaskStatus;
  private _priority: Priority;
  private _dueDate: Date | null;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: TaskProps) {
    this.id = props.id;
    this.userId = props.userId;
    this._title = props.title;
    this._description = props.description;
    this._status = props.status;
    this._priority = props.priority;
    this._dueDate = props.dueDate;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create a new Task
   */
  static create(props: CreateTaskProps): Task {
    Task.validateTitle(props.title);

    if (props.description !== undefined && props.description !== null) {
      Task.validateDescription(props.description);
    }

    const now = new Date();
    return new Task({
      id: uuidv4(),
      userId: props.userId,
      title: props.title.trim(),
      description: props.description?.trim() || null,
      status: props.status || TaskStatus.TODO,
      priority: props.priority || Priority.MEDIUM,
      dueDate: props.dueDate || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Factory method to reconstitute Task from persistence
   */
  static fromPersistence(props: TaskProps): Task {
    return new Task(props);
  }

  /**
   * Update task properties
   */
  update(props: UpdateTaskProps): void {
    if (props.title !== undefined) {
      Task.validateTitle(props.title);
      this._title = props.title.trim();
    }

    if (props.description !== undefined) {
      if (props.description !== null) {
        Task.validateDescription(props.description);
        this._description = props.description.trim();
      } else {
        this._description = null;
      }
    }

    if (props.status !== undefined) {
      this._status = props.status;
    }

    if (props.priority !== undefined) {
      this._priority = props.priority;
    }

    if (props.dueDate !== undefined) {
      this._dueDate = props.dueDate;
    }

    this._updatedAt = new Date();
  }

  /**
   * Mark task as complete
   */
  complete(): void {
    this._status = TaskStatus.DONE;
    this._updatedAt = new Date();
  }

  /**
   * Check if task belongs to user
   */
  belongsTo(userId: string): boolean {
    return this.userId === userId;
  }

  // Validation methods
  private static validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new ValidationError('Title is required');
    }
    if (title.trim().length > 200) {
      throw new ValidationError('Title must be 200 characters or less');
    }
  }

  private static validateDescription(description: string): void {
    if (description.length > 2000) {
      throw new ValidationError('Description must be 2000 characters or less');
    }
  }

  // Getters
  get title(): string {
    return this._title;
  }

  get description(): string | null {
    return this._description;
  }

  get status(): TaskStatus {
    return this._status;
  }

  get priority(): Priority {
    return this._priority;
  }

  get dueDate(): Date | null {
    return this._dueDate;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): TaskProps {
    return {
      id: this.id,
      userId: this.userId,
      title: this._title,
      description: this._description,
      status: this._status,
      priority: this._priority,
      dueDate: this._dueDate,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
