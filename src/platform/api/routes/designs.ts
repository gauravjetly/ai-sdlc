/**
 * Design API Routes
 * RESTful endpoints for managing visual designs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { designService } from '../services/DesignService.js';
import {
  createDesignSchema,
  updateDesignSchema,
  listDesignsSchema,
  exportTerraformSchema,
  idParamSchema,
  validateRequest,
} from '../validators/designerValidator.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('DesignRoutes');

/**
 * @swagger
 * /api/v1/designs:
 *   get:
 *     summary: List designs
 *     description: Get a paginated list of user designs
 *     tags: [Designs]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, validated, deploying, deployed, failed, archived]
 *       - in: query
 *         name: environment
 *         schema:
 *           type: string
 *           enum: [dev, uat, production, dr]
 *       - in: query
 *         name: cloud
 *         schema:
 *           type: string
 *           enum: [aws, oci, azure, gcp]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of designs
 */
router.get(
  '/',
  validateRequest(listDesignsSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const result = await designService.listDesigns(req.query as any, userId);

      res.json({
        success: true,
        data: result.items,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/designs:
 *   post:
 *     summary: Create a new design
 *     description: Create a new visual design, optionally from a template
 *     tags: [Designs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, cloud, region]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               templateId:
 *                 type: string
 *                 format: uuid
 *               cloud:
 *                 type: string
 *                 enum: [aws, oci, azure, gcp]
 *               region:
 *                 type: string
 *               environment:
 *                 type: string
 *                 enum: [dev, uat, production, dr]
 *     responses:
 *       201:
 *         description: Design created
 */
router.post(
  '/',
  validateRequest(createDesignSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const design = await designService.createDesign(req.body, userId);

      logger.info('Design created via API', { id: design.id, name: design.name });

      res.status(201).json({
        success: true,
        data: design,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/designs/{id}:
 *   get:
 *     summary: Get design by ID
 *     description: Get a single design with its relations
 *     tags: [Designs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Design details
 *       404:
 *         description: Design not found
 */
router.get(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await designService.getDesignWithRelations(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Design not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          ...result.design,
          versions: result.versions,
          workflow: result.workflow,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/designs/{id}:
 *   put:
 *     summary: Update design
 *     description: Update an existing design
 *     tags: [Designs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Design updated
 *       404:
 *         description: Design not found
 */
router.put(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  validateRequest(updateDesignSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const design = await designService.updateDesign(req.params.id, req.body, userId);

      if (!design) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Design not found',
          },
        });
      }

      logger.info('Design updated via API', { id: design.id });

      res.json({
        success: true,
        data: design,
      });
    } catch (error: any) {
      if (error.message?.includes('FORBIDDEN')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this design',
          },
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/designs/{id}:
 *   delete:
 *     summary: Delete design
 *     description: Delete a design and all related data
 *     tags: [Designs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Design deleted
 *       404:
 *         description: Design not found
 */
router.delete(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const deleted = await designService.deleteDesign(req.params.id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Design not found',
          },
        });
      }

      logger.info('Design deleted via API', { id: req.params.id });

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error: any) {
      if (error.message?.includes('FORBIDDEN')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this design',
          },
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/designs/{id}/versions:
 *   get:
 *     summary: Get design versions
 *     description: Get all versions of a design
 *     tags: [Designs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of design versions
 */
router.get(
  '/:id/versions',
  validateRequest(idParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const versions = await designService.getDesignVersions(req.params.id);

      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/designs/{id}/estimate:
 *   get:
 *     summary: Get cost estimate
 *     description: Get estimated monthly cost for a design
 *     tags: [Designs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cost estimate
 *       404:
 *         description: Design not found
 */
router.get(
  '/:id/estimate',
  validateRequest(idParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estimate = await designService.estimateCost(req.params.id);

      if (!estimate) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Design not found',
          },
        });
      }

      res.json({
        success: true,
        data: estimate,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/designs/{id}/export:
 *   get:
 *     summary: Export design as Terraform
 *     description: Generate Terraform code for a design
 *     tags: [Designs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [terraform, cloudformation]
 *           default: terraform
 *       - in: query
 *         name: environment
 *         schema:
 *           type: string
 *           enum: [dev, uat, production, dr]
 *     responses:
 *       200:
 *         description: Terraform code
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Design not found
 */
router.get(
  '/:id/export',
  validateRequest(idParamSchema, 'params'),
  validateRequest(exportTerraformSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const design = await designService.getDesignById(req.params.id);

      if (!design) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Design not found',
          },
        });
      }

      // TODO: Implement TerraformGenerator service
      // For now, return a placeholder response
      const terraformCode = generatePlaceholderTerraform(design);

      res.json({
        success: true,
        data: {
          format: req.query.format || 'terraform',
          environment: req.query.environment || 'dev',
          files: terraformCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate placeholder Terraform code
 */
function generatePlaceholderTerraform(design: any): any[] {
  return [
    {
      name: 'main.tf',
      content: `# Terraform configuration for ${design.name}
# Generated by Catalyst Infrastructure Designer
# Cloud: ${design.cloud || 'aws'}
# Region: ${design.region || 'us-east-1'}

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# Import layer modules
module "network" {
  source = "./modules/network"

  vpc_cidr           = var.vpc_cidr
  environment        = var.environment
  availability_zones = var.availability_zones
}

module "platform" {
  source = "./modules/platform"

  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  environment        = var.environment

  depends_on = [module.network]
}

module "devops" {
  source = "./modules/devops"

  vpc_id      = module.network.vpc_id
  cluster_arn = module.platform.cluster_arn
  environment = var.environment

  depends_on = [module.platform]
}
`,
    },
    {
      name: 'variables.tf',
      content: `# Variables for ${design.name}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "${design.region || 'us-east-1'}"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "${design.environment || 'dev'}"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
`,
    },
    {
      name: 'outputs.tf',
      content: `# Outputs for ${design.name}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.network.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.network.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.network.public_subnet_ids
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.platform.cluster_endpoint
}
`,
    },
  ];
}

export default router;
