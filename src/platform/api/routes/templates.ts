/**
 * Template API Routes
 * RESTful endpoints for managing design templates
 */

import { Router, Request, Response, NextFunction } from 'express';
import { templateService } from '../services/TemplateService.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesSchema,
  cloneTemplateSchema,
  idParamSchema,
  validateRequest,
} from '../validators/designerValidator.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('TemplateRoutes');

/**
 * @swagger
 * /api/v1/templates:
 *   get:
 *     summary: List templates
 *     description: Get a paginated list of templates with optional filtering
 *     tags: [Templates]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [network_foundation, compute_platform, storage_database, security, monitoring, fullstack, custom]
 *       - in: query
 *         name: layerType
 *         schema:
 *           type: string
 *           enum: [network, platform, devops, fullstack]
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [private, organization, public]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: List of templates
 */
router.get(
  '/',
  validateRequest(listTemplatesSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const result = await templateService.listTemplates(req.query as any, userId);

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
 * /api/v1/templates:
 *   post:
 *     summary: Create a new template
 *     description: Create a new design template
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, templateData]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               templateData:
 *                 type: object
 *     responses:
 *       201:
 *         description: Template created
 */
router.post(
  '/',
  validateRequest(createTemplateSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const template = await templateService.createTemplate(req.body, userId);

      logger.info('Template created via API', { id: template.id, name: template.name });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/templates/{id}:
 *   get:
 *     summary: Get template by ID
 *     description: Get a single template by its ID
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         description: Template not found
 */
router.get(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await templateService.getTemplateById(req.params.id);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Template not found',
          },
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/templates/{id}:
 *   put:
 *     summary: Update template
 *     description: Update an existing template
 *     tags: [Templates]
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
 *         description: Template updated
 *       404:
 *         description: Template not found
 */
router.put(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  validateRequest(updateTemplateSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const template = await templateService.updateTemplate(req.params.id, req.body, userId);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Template not found',
          },
        });
      }

      logger.info('Template updated via API', { id: template.id });

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      if (error.message?.includes('FORBIDDEN')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this template',
          },
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/templates/{id}:
 *   delete:
 *     summary: Delete template
 *     description: Delete a template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Template deleted
 *       404:
 *         description: Template not found
 */
router.delete(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const deleted = await templateService.deleteTemplate(req.params.id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Template not found',
          },
        });
      }

      logger.info('Template deleted via API', { id: req.params.id });

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
            message: 'You do not have permission to delete this template',
          },
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/templates/{id}/versions:
 *   get:
 *     summary: Get template versions
 *     description: Get all versions of a template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of template versions
 */
router.get(
  '/:id/versions',
  validateRequest(idParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const versions = await templateService.getTemplateVersions(req.params.id);

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
 * /api/v1/templates/{id}/clone:
 *   post:
 *     summary: Clone template
 *     description: Create a copy of an existing template
 *     tags: [Templates]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               visibility:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template cloned
 *       404:
 *         description: Original template not found
 */
router.post(
  '/:id/clone',
  validateRequest(idParamSchema, 'params'),
  validateRequest(cloneTemplateSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { name, visibility } = req.body;

      const template = await templateService.cloneTemplate(
        req.params.id,
        name,
        visibility,
        userId
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Original template not found',
          },
        });
      }

      logger.info('Template cloned via API', {
        originalId: req.params.id,
        newId: template.id,
      });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
