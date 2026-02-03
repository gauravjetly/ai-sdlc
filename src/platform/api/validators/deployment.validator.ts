/**
 * Deployment API Validators
 * Joi schemas for deployment endpoints
 */

import Joi from 'joi';
import { commonSchemas } from '../middleware/validation.middleware.js';

export const createDeploymentSchema = Joi.object({
  application: Joi.string().min(3).max(50).required(),
  version: Joi.string().min(1).max(50).required(), // Allow any version format
  environment: Joi.string().valid('dev', 'uat', 'production', 'dr').required(),
  cloud: Joi.string().valid('aws', 'oci', 'azure', 'gcp').required(),
  clusterArn: Joi.string().required(),
  namespace: Joi.string().default('default'),
  replicas: Joi.number().integer().min(1).max(100).default(3),
  strategy: Joi.string().valid('rolling', 'blue_green', 'canary').default('rolling'),
  imageRegistry: Joi.string().required(),
  containerPort: Joi.number().integer().min(1).max(65535).optional(),
  resources: Joi.object({
    cpu: Joi.string().optional(),
    memory: Joi.string().optional(),
    cpuLimit: Joi.string().optional(),
    memoryLimit: Joi.string().optional()
  }).optional(),
  environmentVariables: Joi.object().pattern(
    Joi.string(),
    Joi.string()
  ).optional(),
  healthCheck: Joi.object({
    path: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    initialDelaySeconds: Joi.number().integer().min(0).default(30),
    periodSeconds: Joi.number().integer().min(1).default(10)
  }).optional(),
  createdBy: Joi.string().optional()
});

export const updateDeploymentSchema = Joi.object({
  replicas: Joi.number().integer().min(1).max(100).optional(),
  image: Joi.string().optional(),
  environmentVariables: Joi.object().pattern(
    Joi.string(),
    Joi.string()
  ).optional(),
  resourceLimits: Joi.object({
    cpu: Joi.string().pattern(/^\d+m?$/),
    memory: Joi.string().pattern(/^\d+Mi|Gi$/)
  }).optional()
}).min(1); // At least one field must be present

export const scaleDeploymentSchema = Joi.object({
  replicas: Joi.number().integer().min(0).max(100).required()
});

export const rollbackDeploymentSchema = Joi.object({
  targetRevision: Joi.number().integer().min(1).optional(),
  reason: Joi.string().max(500).optional()
});

export const deploymentIdSchema = Joi.object({
  id: commonSchemas.id.required()
});

export const deploymentQuerySchema = Joi.object({
  environment: commonSchemas.environment.optional(),
  status: Joi.string().valid('pending', 'deploying', 'running', 'failed', 'rolled-back').optional(),
  cluster: Joi.string().optional(),
  ...commonSchemas.pagination.keys
});

export const approveDeploymentSchema = Joi.object({
  approved: Joi.boolean().required(),
  comment: Joi.string().max(500).optional(),
  conditions: Joi.array().items(Joi.string()).optional()
});
