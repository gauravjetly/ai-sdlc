/**
 * Scheduling DTOs
 *
 * Data Transfer Objects for the scheduling API.
 * These define the shape of request/response data.
 */

import { z } from 'zod';

// ===========================
// Work Item DTOs
// ===========================

export const AgentAssignmentSchema = z.object({
  agentType: z.string().min(1, 'Agent type is required'),
  role: z.enum(['primary', 'reviewer', 'tester', 'monitor', 'advisor']),
  parameters: z.record(z.unknown()).optional().default({}),
  useMemory: z.boolean().optional().default(true),
  saveMemory: z.boolean().optional().default(true),
});

export const CreateWorkItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 chars or less'),
  description: z.string().max(2000).optional(),
  workType: z.enum(['single_app', 'multi_app', 'workflow']),
  scheduleType: z.enum(['one_time', 'recurring', 'trigger_based', 'immediate']),
  cronExpression: z.string().max(100).optional(),
  scheduledAt: z.string().datetime().optional(),
  targetCompletionDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional().default('NORMAL'),
  agentAssignments: z.array(AgentAssignmentSchema).min(1, 'At least one agent assignment is required'),
  templateId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const WorkItemFiltersSchema = z.object({
  status: z.array(z.enum(['scheduled', 'running', 'completed', 'failed', 'paused', 'cancelled'])).optional(),
  scheduleType: z.enum(['one_time', 'recurring', 'trigger_based', 'immediate']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  search: z.string().max(200).optional(),
  offset: z.coerce.number().min(0).optional().default(0),
  limit: z.coerce.number().min(0).max(100).optional().default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'scheduledAt', 'priority', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ===========================
// Trigger DTOs
// ===========================

export const TriggerConditionSchema = z.object({
  field: z.string().min(1).max(200).refine(
    val => !/[;{}()[\]\\]/.test(val),
    'Field contains invalid characters',
  ),
  operator: z.enum(['eq', 'neq', 'contains', 'gt', 'lt', 'in', 'regex']),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const TriggerConditionGroupSchema = z.object({
  operator: z.enum(['AND', 'OR']),
  conditions: z.array(TriggerConditionSchema).min(1).max(20),
});

export const TriggerActionSchema = z.object({
  name: z.string().min(1).max(200),
  agentType: z.string().min(1),
  taskType: z.string().min(1),
  parameters: z.record(z.unknown()).optional().default({}),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
});

export const CreateTriggerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  eventType: z.string().min(1, 'Event type is required').max(200),
  conditions: z.array(TriggerConditionGroupSchema).default([]),
  actions: z.array(TriggerActionSchema).min(1, 'At least one action is required').max(20),
  rateLimitPerMin: z.number().min(1).max(100).optional().default(10),
});

export const TriggerFiltersSchema = z.object({
  eventType: z.string().optional(),
  enabled: z.coerce.boolean().optional(),
  offset: z.coerce.number().min(0).optional().default(0),
  limit: z.coerce.number().min(0).max(100).optional().default(20),
});

// ===========================
// Agent Memory DTOs
// ===========================

export const StoreMemorySchema = z.object({
  key: z.string().min(1).max(500),
  value: z.record(z.unknown()),
  ttlMinutes: z.number().min(1).max(525960).optional(), // Up to ~1 year
});

export const MemoryFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  offset: z.coerce.number().min(0).optional().default(0),
  limit: z.coerce.number().min(0).max(100).optional().default(20),
});

// ===========================
// Template DTOs
// ===========================

export const AppDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  agentType: z.string().min(1),
  taskType: z.string().min(1),
  parameters: z.record(z.unknown()).optional().default({}),
  dependsOn: z.array(z.string()).optional().default([]),
});

export const TemplateVariableSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['string', 'number', 'boolean', 'select']),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  defaultValue: z.unknown().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  apps: z.array(AppDefinitionSchema).min(1, 'At least one app is required'),
  dependencies: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(['hard', 'soft']),
  })).optional().default([]),
  variables: z.array(TemplateVariableSchema).optional().default([]),
  category: z.string().max(50).optional(),
  isPublic: z.boolean().optional().default(false),
});

export const InstantiateTemplateSchema = z.object({
  variables: z.record(z.unknown()).optional().default({}),
  scheduledAt: z.string().datetime().optional(),
  cronExpression: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional().default('NORMAL'),
});

// ===========================
// Execution DTOs
// ===========================

export const ExecutionFiltersSchema = z.object({
  workItemId: z.string().uuid().optional(),
  agentId: z.string().optional(),
  status: z.array(z.enum(['queued', 'running', 'completed', 'failed', 'cancelled', 'timeout'])).optional(),
  offset: z.coerce.number().min(0).optional().default(0),
  limit: z.coerce.number().min(0).max(100).optional().default(20),
});

// Type exports
export type CreateWorkItemInput = z.infer<typeof CreateWorkItemSchema>;
export type WorkItemFiltersInput = z.infer<typeof WorkItemFiltersSchema>;
export type CreateTriggerInput = z.infer<typeof CreateTriggerSchema>;
export type TriggerFiltersInput = z.infer<typeof TriggerFiltersSchema>;
export type StoreMemoryInput = z.infer<typeof StoreMemorySchema>;
export type MemoryFiltersInput = z.infer<typeof MemoryFiltersSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type InstantiateTemplateInput = z.infer<typeof InstantiateTemplateSchema>;
export type ExecutionFiltersInput = z.infer<typeof ExecutionFiltersSchema>;
