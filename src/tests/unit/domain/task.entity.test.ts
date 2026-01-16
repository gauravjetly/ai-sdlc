import { Task, CreateTaskProps } from '../../../src/domain/entities/task.entity';
import { TaskStatus, Priority } from '../../../src/domain/value-objects';
import { ValidationError } from '../../../src/domain/errors';

describe('Task Entity', () => {
  const validCreateProps: CreateTaskProps = {
    userId: 'user-123',
    title: 'Test Task',
    description: 'Test description',
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
    dueDate: new Date('2026-01-30'),
  };

  describe('create', () => {
    it('should create a task with valid properties', () => {
      const task = Task.create(validCreateProps);

      expect(task.id).toBeDefined();
      expect(task.userId).toBe(validCreateProps.userId);
      expect(task.title).toBe(validCreateProps.title);
      expect(task.description).toBe(validCreateProps.description);
      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.priority).toBe(Priority.MEDIUM);
      expect(task.dueDate).toEqual(validCreateProps.dueDate);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a task with default values when optional fields are not provided', () => {
      const task = Task.create({
        userId: 'user-123',
        title: 'Minimal Task',
      });

      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.priority).toBe(Priority.MEDIUM);
      expect(task.description).toBeNull();
      expect(task.dueDate).toBeNull();
    });

    it('should trim the title', () => {
      const task = Task.create({
        userId: 'user-123',
        title: '  Trimmed Title  ',
      });

      expect(task.title).toBe('Trimmed Title');
    });

    it('should throw ValidationError for empty title', () => {
      expect(() =>
        Task.create({
          userId: 'user-123',
          title: '',
        })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for whitespace-only title', () => {
      expect(() =>
        Task.create({
          userId: 'user-123',
          title: '   ',
        })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for title exceeding 200 characters', () => {
      const longTitle = 'a'.repeat(201);
      expect(() =>
        Task.create({
          userId: 'user-123',
          title: longTitle,
        })
      ).toThrow(ValidationError);
    });

    it('should accept title with exactly 200 characters', () => {
      const maxTitle = 'a'.repeat(200);
      const task = Task.create({
        userId: 'user-123',
        title: maxTitle,
      });

      expect(task.title).toBe(maxTitle);
    });

    it('should throw ValidationError for description exceeding 2000 characters', () => {
      const longDescription = 'a'.repeat(2001);
      expect(() =>
        Task.create({
          userId: 'user-123',
          title: 'Test',
          description: longDescription,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('should update title', () => {
      const task = Task.create(validCreateProps);
      const originalUpdatedAt = task.updatedAt;

      // Small delay to ensure updatedAt changes
      task.update({ title: 'Updated Title' });

      expect(task.title).toBe('Updated Title');
      expect(task.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update status', () => {
      const task = Task.create(validCreateProps);
      task.update({ status: TaskStatus.IN_PROGRESS });

      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should update priority', () => {
      const task = Task.create(validCreateProps);
      task.update({ priority: Priority.HIGH });

      expect(task.priority).toBe(Priority.HIGH);
    });

    it('should update description to null', () => {
      const task = Task.create(validCreateProps);
      task.update({ description: null });

      expect(task.description).toBeNull();
    });

    it('should update dueDate', () => {
      const task = Task.create(validCreateProps);
      const newDate = new Date('2026-02-15');
      task.update({ dueDate: newDate });

      expect(task.dueDate).toEqual(newDate);
    });

    it('should throw ValidationError for empty title on update', () => {
      const task = Task.create(validCreateProps);

      expect(() => task.update({ title: '' })).toThrow(ValidationError);
    });

    it('should not modify other fields when updating specific field', () => {
      const task = Task.create(validCreateProps);
      const originalDescription = task.description;
      const originalPriority = task.priority;

      task.update({ status: TaskStatus.DONE });

      expect(task.description).toBe(originalDescription);
      expect(task.priority).toBe(originalPriority);
    });
  });

  describe('complete', () => {
    it('should set status to DONE', () => {
      const task = Task.create(validCreateProps);
      task.complete();

      expect(task.status).toBe(TaskStatus.DONE);
    });
  });

  describe('belongsTo', () => {
    it('should return true for matching userId', () => {
      const task = Task.create(validCreateProps);

      expect(task.belongsTo('user-123')).toBe(true);
    });

    it('should return false for non-matching userId', () => {
      const task = Task.create(validCreateProps);

      expect(task.belongsTo('other-user')).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return all task properties', () => {
      const task = Task.create(validCreateProps);
      const json = task.toJSON();

      expect(json).toEqual({
        id: task.id,
        userId: task.userId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      });
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute task from persistence data', () => {
      const persistedData = {
        id: 'task-uuid',
        userId: 'user-123',
        title: 'Persisted Task',
        description: 'From database',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        dueDate: new Date('2026-02-01'),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-15'),
      };

      const task = Task.fromPersistence(persistedData);

      expect(task.id).toBe(persistedData.id);
      expect(task.userId).toBe(persistedData.userId);
      expect(task.title).toBe(persistedData.title);
      expect(task.description).toBe(persistedData.description);
      expect(task.status).toBe(persistedData.status);
      expect(task.priority).toBe(persistedData.priority);
      expect(task.dueDate).toEqual(persistedData.dueDate);
      expect(task.createdAt).toEqual(persistedData.createdAt);
      expect(task.updatedAt).toEqual(persistedData.updatedAt);
    });
  });
});
