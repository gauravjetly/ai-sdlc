/**
 * Infrastructure Designer Validators
 * Joi schemas for request validation
 */

import Joi from 'joi';
import {
  TemplateCategory,
  TemplateVisibility,
  LayerType,
  DesignStatus,
  Environment,
  CloudProvider,
  LayerDeploymentStatus,
} from '../types/designer.js';

// =============================================
// COMMON SCHEMAS
// =============================================

const positionSchema = Joi.object({
  x: Joi.number().required(),
  y: Joi.number().required(),
});

const designNodeSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().required(),
  position: positionSchema.required(),
  data: Joi.object().required(),
  layer: Joi.string().valid('network', 'platform', 'devops', 'fullstack').required(),
  parentId: Joi.string().optional(),
  width: Joi.number().optional(),
  height: Joi.number().optional(),
});

const designEdgeSchema = Joi.object({
  id: Joi.string().required(),
  source: Joi.string().required(),
  target: Joi.string().required(),
  sourceHandle: Joi.string().optional(),
  targetHandle: Joi.string().optional(),
  type: Joi.string().optional(),
  label: Joi.string().optional(),
  data: Joi.object().optional(),
});

const viewportSchema = Joi.object({
  x: Joi.number().required(),
  y: Joi.number().required(),
  zoom: Joi.number().min(0.1).max(4).required(),
});

const designDataSchema = Joi.object({
  nodes: Joi.array().items(designNodeSchema).required(),
  edges: Joi.array().items(designEdgeSchema).required(),
  viewport: viewportSchema.optional(),
  metadata: Joi.object().optional(),
});

const layerDataSchema = Joi.object({
  nodes: Joi.array().items(designNodeSchema).required(),
  edges: Joi.array().items(designEdgeSchema).required(),
  config: Joi.object().optional(),
});

const environmentConfigSchema = Joi.object({
  instanceSizes: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  replicaCounts: Joi.object().pattern(Joi.string(), Joi.number()).optional(),
  enabledFeatures: Joi.array().items(Joi.string()).optional(),
  variables: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});

// =============================================
// TEMPLATE VALIDATORS
// =============================================

export const createTemplateSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string()
    .valid(
      'network_foundation',
      'compute_platform',
      'storage_database',
      'security',
      'monitoring',
      'fullstack',
      'custom'
    )
    .required(),
  visibility: Joi.string().valid('private', 'organization', 'public').default('private'),
  templateData: Joi.object({
    nodes: Joi.array().items(designNodeSchema).required(),
    edges: Joi.array().items(designEdgeSchema).required(),
    metadata: Joi.object({
      estimatedCost: Joi.number().optional(),
      deploymentTime: Joi.string().optional(),
      complexity: Joi.string().valid('simple', 'moderate', 'complex').optional(),
      awsServices: Joi.array().items(Joi.string()).optional(),
    }).optional(),
  }).required(),
  layerType: Joi.string().valid('network', 'platform', 'devops', 'fullstack').optional(),
  thumbnail: Joi.string().uri().optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
});

export const updateTemplateSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  visibility: Joi.string().valid('private', 'organization', 'public').optional(),
  templateData: Joi.object({
    nodes: Joi.array().items(designNodeSchema).required(),
    edges: Joi.array().items(designEdgeSchema).required(),
    metadata: Joi.object().optional(),
  }).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  changeLog: Joi.string().max(500).optional(),
}).min(1);

export const listTemplatesSchema = Joi.object({
  category: Joi.string()
    .valid(
      'network_foundation',
      'compute_platform',
      'storage_database',
      'security',
      'monitoring',
      'fullstack',
      'custom'
    )
    .optional(),
  layerType: Joi.string().valid('network', 'platform', 'devops', 'fullstack').optional(),
  visibility: Joi.string().valid('private', 'organization', 'public').optional(),
  search: Joi.string().max(100).optional(),
  tags: Joi.alternatives()
    .try(Joi.string(), Joi.array().items(Joi.string()))
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('usageCount', 'createdAt', 'name').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const cloneTemplateSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  visibility: Joi.string().valid('private', 'organization', 'public').optional(),
});

// =============================================
// DESIGN VALIDATORS
// =============================================

export const createDesignSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000).optional(),
  templateId: Joi.string().uuid().optional(),
  cloud: Joi.string().valid('aws', 'oci', 'azure', 'gcp').required(),
  region: Joi.string().max(50).required(),
  environment: Joi.string().valid('dev', 'uat', 'production', 'dr').optional(),
});

export const updateDesignSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  designData: designDataSchema.optional(),
  environment: Joi.string().valid('dev', 'uat', 'production', 'dr').optional(),
  createVersion: Joi.boolean().default(false),
  changeLog: Joi.string().max(500).optional(),
}).min(1);

export const listDesignsSchema = Joi.object({
  status: Joi.string()
    .valid('draft', 'validated', 'deploying', 'deployed', 'failed', 'archived')
    .optional(),
  environment: Joi.string().valid('dev', 'uat', 'production', 'dr').optional(),
  cloud: Joi.string().valid('aws', 'oci', 'azure', 'gcp').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name').default('updatedAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// =============================================
// WORKFLOW VALIDATORS
// =============================================

export const createWorkflowSchema = Joi.object({
  designName: Joi.string().min(3).max(100).required(),
  templateId: Joi.string().uuid().optional(),
  cloud: Joi.string().valid('aws', 'oci', 'azure', 'gcp').required(),
  region: Joi.string().max(50).required(),
  environment: Joi.string().valid('dev', 'uat', 'production', 'dr').optional(),
});

export const updateWorkflowSchema = Joi.object({
  currentLayer: Joi.string().valid('network', 'platform', 'devops', 'fullstack').optional(),
  currentStep: Joi.number().integer().min(1).max(10).optional(),
  networkData: layerDataSchema.optional(),
  platformData: layerDataSchema.optional(),
  devopsData: layerDataSchema.optional(),
  environments: Joi.object({
    dev: environmentConfigSchema.optional(),
    staging: environmentConfigSchema.optional(),
    prod: environmentConfigSchema.optional(),
  }).optional(),
}).min(1);

export const advanceWorkflowSchema = Joi.object({
  validateFirst: Joi.boolean().default(true),
});

export const validateWorkflowSchema = Joi.object({
  layer: Joi.string().valid('network', 'platform', 'devops', 'fullstack').optional(),
});

export const deployWorkflowSchema = Joi.object({
  layer: Joi.string().valid('network', 'platform', 'devops', 'fullstack').required(),
  environment: Joi.string().valid('dev', 'uat', 'production', 'dr').required(),
  dryRun: Joi.boolean().default(false),
});

// =============================================
// LAYER VALIDATORS
// =============================================

export const createLayerSchema = Joi.object({
  workflowId: Joi.string().uuid().required(),
  designId: Joi.string().uuid().required(),
  layerType: Joi.string().valid('network', 'platform', 'devops', 'fullstack').required(),
  layerName: Joi.string().min(3).max(100).required(),
  layerData: layerDataSchema.required(),
  dependsOn: Joi.array().items(Joi.string().uuid()).optional(),
});

export const updateLayerSchema = Joi.object({
  layerData: layerDataSchema.optional(),
  status: Joi.string()
    .valid('pending', 'validating', 'deploying', 'deployed', 'failed', 'rolled_back')
    .optional(),
  envOverrides: Joi.object()
    .pattern(
      Joi.string().valid('dev', 'uat', 'production', 'dr'),
      layerDataSchema.optional()
    )
    .optional(),
}).min(1);

export const deployLayerSchema = Joi.object({
  environment: Joi.string().valid('dev', 'uat', 'production', 'dr').required(),
  dryRun: Joi.boolean().default(false),
});

// =============================================
// EXPORT VALIDATORS
// =============================================

export const exportTerraformSchema = Joi.object({
  format: Joi.string().valid('terraform', 'cloudformation').default('terraform'),
  environment: Joi.string().valid('dev', 'uat', 'production', 'dr').optional(),
  layers: Joi.array()
    .items(Joi.string().valid('network', 'platform', 'devops', 'fullstack'))
    .optional(),
  includeState: Joi.boolean().default(false),
});

// =============================================
// VALIDATION MIDDLEWARE FACTORY
// =============================================

export function validateRequest(schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
    }

    req[property] = value;
    next();
  };
}

// =============================================
// ID VALIDATION
// =============================================

export const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const workflowIdParamSchema = Joi.object({
  workflowId: Joi.string().uuid().required(),
});
