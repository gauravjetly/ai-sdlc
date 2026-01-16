export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export const isValidTaskStatus = (value: string): value is TaskStatus => {
  return Object.values(TaskStatus).includes(value as TaskStatus);
};

export const isValidPriority = (value: string): value is Priority => {
  return Object.values(Priority).includes(value as Priority);
};

export { Email } from './email';
