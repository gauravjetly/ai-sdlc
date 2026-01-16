import { TaskService, CreateTaskDto, UpdateTaskDto, TaskQueryDto } from '../../../src/application/services/task.service';
import { Task } from '../../../src/domain/entities/task.entity';
import { TaskStatus, Priority } from '../../../src/domain/value-objects';
import { NotFoundError, ForbiddenError } from '../../../src/domain/errors';
import { ITaskRepository, PaginatedResult } from '../../../src/application/interfaces/task.repository.interface';

describe('TaskService', () => {
  let taskService: TaskService;
  let mockTaskRepository: jest.Mocked<ITaskRepository>;

  const userId = 'user-123';
  const taskId = 'task-456';

  const mockTask = Task.create({
    userId,
    title: 'Test Task',
    description: 'Test description',
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
  });

  beforeEach(() => {
    mockTaskRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      delete: jest.fn(),
      countByUser: jest.fn(),
    };

    taskService = new TaskService(mockTaskRepository);
  });

  describe('create', () => {
    it('should create a task successfully', async () => {
      const dto: CreateTaskDto = {
        title: 'New Task',
        description: 'Description',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
      };

      mockTaskRepository.save.mockImplementation(async (task) => task);

      const result = await taskService.create(userId, dto);

      expect(result).toBeInstanceOf(Task);
      expect(result.title).toBe(dto.title);
      expect(result.userId).toBe(userId);
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should create task with default values when not provided', async () => {
      const dto: CreateTaskDto = {
        title: 'Minimal Task',
      };

      mockTaskRepository.save.mockImplementation(async (task) => task);

      const result = await taskService.create(userId, dto);

      expect(result.status).toBe(TaskStatus.TODO);
      expect(result.priority).toBe(Priority.MEDIUM);
      expect(result.description).toBeNull();
    });

    it('should parse dueDate string to Date', async () => {
      const dto: CreateTaskDto = {
        title: 'Task with Due Date',
        dueDate: '2026-01-30T00:00:00.000Z',
      };

      mockTaskRepository.save.mockImplementation(async (task) => task);

      const result = await taskService.create(userId, dto);

      expect(result.dueDate).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('should return task when found and user owns it', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);

      const result = await taskService.findById(taskId, userId);

      expect(result).toBe(mockTask);
      expect(mockTaskRepository.findById).toHaveBeenCalledWith(taskId);
    });

    it('should throw NotFoundError when task does not exist', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(taskService.findById(taskId, userId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user does not own task', async () => {
      const otherUserTask = Task.create({
        userId: 'other-user',
        title: 'Other Task',
      });
      mockTaskRepository.findById.mockResolvedValue(otherUserTask);

      await expect(taskService.findById(taskId, userId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('findAll', () => {
    it('should return paginated tasks for user', async () => {
      const paginatedResult: PaginatedResult<Task> = {
        items: [mockTask],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockTaskRepository.findByUser.mockResolvedValue(paginatedResult);

      const query: TaskQueryDto = {};
      const result = await taskService.findAll(userId, query);

      expect(result).toEqual(paginatedResult);
      expect(mockTaskRepository.findByUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          page: 1,
          pageSize: 20,
          sortBy: 'createdAt',
          order: 'desc',
        })
      );
    });

    it('should apply filters from query', async () => {
      mockTaskRepository.findByUser.mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const query: TaskQueryDto = {
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        page: 2,
        pageSize: 10,
      };

      await taskService.findAll(userId, query);

      expect(mockTaskRepository.findByUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.HIGH,
          page: 2,
          pageSize: 10,
        })
      );
    });

    it('should limit pageSize to maximum 100', async () => {
      mockTaskRepository.findByUser.mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      });

      const query: TaskQueryDto = {
        pageSize: 500,
      };

      await taskService.findAll(userId, query);

      expect(mockTaskRepository.findByUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          pageSize: 100,
        })
      );
    });
  });

  describe('update', () => {
    it('should update task successfully', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockImplementation(async (task) => task);

      const dto: UpdateTaskDto = {
        title: 'Updated Title',
        status: TaskStatus.IN_PROGRESS,
      };

      const result = await taskService.update(taskId, userId, dto);

      expect(result.title).toBe('Updated Title');
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundError when task does not exist', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(
        taskService.update(taskId, userId, { title: 'Updated' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user does not own task', async () => {
      const otherUserTask = Task.create({
        userId: 'other-user',
        title: 'Other Task',
      });
      mockTaskRepository.findById.mockResolvedValue(otherUserTask);

      await expect(
        taskService.update(taskId, userId, { title: 'Updated' })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('delete', () => {
    it('should delete task successfully', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockResolvedValue();

      await taskService.delete(taskId, userId);

      expect(mockTaskRepository.delete).toHaveBeenCalledWith(taskId);
    });

    it('should throw NotFoundError when task does not exist', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(taskService.delete(taskId, userId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user does not own task', async () => {
      const otherUserTask = Task.create({
        userId: 'other-user',
        title: 'Other Task',
      });
      mockTaskRepository.findById.mockResolvedValue(otherUserTask);

      await expect(taskService.delete(taskId, userId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('countByUser', () => {
    it('should return task count for user', async () => {
      mockTaskRepository.countByUser.mockResolvedValue(5);

      const result = await taskService.countByUser(userId);

      expect(result).toBe(5);
      expect(mockTaskRepository.countByUser).toHaveBeenCalledWith(userId);
    });
  });
});
