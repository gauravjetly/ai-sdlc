/**
 * Project DTOs
 *
 * Zod validation schemas for the multi-project scheduling API.
 * Validates all request data for project CRUD, phase advancement,
 * and analytics endpoints.
 */

import { z } from 'zod';

// ===========================
// Project DTOs
// ===========================

export const CreateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be 200 characters or less')
    .trim(),
  description: z.string().max(2000).optional(),
  deliveryDate: z.string().datetime({ message: 'Delivery date must be a valid ISO datetime' }),
  scheduledStartDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional().default('NORMAL'),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  estimatedEffortHours: z.number().min(0).max(10000).optional(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  deliveryDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  estimatedEffortHours: z.number().min(0).max(10000).optional(),
});

export const ProjectFiltersSchema = z.object({
  status: z.array(
    z.enum(['draft', 'scheduled', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled'])
  ).optional(),
  priority: z.array(z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(200).optional(),
  offset: z.coerce.number().min(0).optional().default(0),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum([
    'name', 'createdAt', 'updatedAt', 'deliveryDate', 'priority', 'status',
  ]).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const CompletePhaseSchema = z.object({
  artifacts: z.array(z.object({
    name: z.string().min(1).max(200),
    path: z.string().min(1).max(500),
    type: z.string().min(1).max(50),
  })).optional(),
  notes: z.string().max(5000).optional(),
});

export const FailPhaseSchema = z.object({
  error: z.string().min(1, 'Error description is required').max(2000),
});

export const BlockProjectSchema = z.object({
  reason: z.string().min(1, 'Block reason is required').max(2000),
});

// Valid SDLC phase names for URL parameters
export const VALID_PHASES = [
  'requirements', 'architecture', 'development',
  'security', 'testing', 'deployment', 'acceptance',
] as const;

export const PhaseParamSchema = z.enum(VALID_PHASES);

// ===========================
// Type Exports
// ===========================

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type ProjectFiltersInput = z.infer<typeof ProjectFiltersSchema>;
export type CompletePhaseInput = z.infer<typeof CompletePhaseSchema>;
export type FailPhaseInput = z.infer<typeof FailPhaseSchema>;
export type BlockProjectInput = z.infer<typeof BlockProjectSchema>;
