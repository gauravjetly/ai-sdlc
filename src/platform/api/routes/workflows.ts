/**
 * Workflow API Routes
 * RESTful endpoints for managing design workflows
 */

import { Router, Request, Response, NextFunction } from 'express';
import { workflowManager } from '../services/WorkflowManager.js';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  advanceWorkflowSchema,
  validateWorkflowSchema,
  deployWorkflowSchema,
  idParamSchema,
  validateRequest,
} from '../validators/designerValidator.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('WorkflowRoutes');

/**
 * @swagger
 * /api/v1/workflows:
 *   post:
 *     summary: Create a new workflow
 *     description: Create a new design workflow with associated design
 *     tags: [Workflows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [designName, cloud, region]
 *             properties:
 *               designName:
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
 *         description: Workflow created
 */
router.post(
  '/',
  validateRequest(createWorkflowSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const result = await workflowManager.createWorkflow(req.body, userId);

      logger.info('Workflow created via API', {
        workflowId: result.workflow.id,
        designId: result.designId,
      });

      res.status(201).json({
        success: true,
        data: {
          workflow: result.workflow,
          designId: result.designId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   get:
 *     summary: Get workflow by ID
 *     description: Get workflow state with design and layers
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow state
 *       404:
 *         description: Workflow not found
 */
router.get(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await workflowManager.getWorkflowWithDesign(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          },
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   put:
 *     summary: Update workflow state
 *     description: Update workflow layer data and step
 *     tags: [Workflows]
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
 *         description: Workflow updated
 *       404:
 *         description: Workflow not found
 */
router.put(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  validateRequest(updateWorkflowSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflow = await workflowManager.updateWorkflow(req.params.id, req.body);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          },
        });
      }

      logger.info('Workflow updated via API', { id: workflow.id });

      res.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/workflows/{id}/advance:
 *   post:
 *     summary: Advance to next layer
 *     description: Mark current layer complete and advance to next
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               validateFirst:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Workflow advanced
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Workflow not found
 */
router.post(
  '/:id/advance',
  validateRequest(idParamSchema, 'params'),
  validateRequest(advanceWorkflowSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { validateFirst = true } = req.body;
      const result = await workflowManager.advanceLayer(req.params.id, validateFirst);

      if (!result.success) {
        if (result.error === 'Workflow not found') {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: result.error,
            },
          });
        }

        if (result.validationResult) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Layer validation failed',
              details: result.validationResult.errors,
            },
          });
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'ADVANCE_FAILED',
            message: result.error || 'Failed to advance layer',
          },
        });
      }

      logger.info('Workflow advanced via API', { id: req.params.id });

      res.json({
        success: true,
        data: result.workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/workflows/{id}/back:
 *   post:
 *     summary: Go back to previous layer
 *     description: Navigate back to the previous layer
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow went back
 *       404:
 *         description: Workflow not found
 */
router.post(
  '/:id/back',
  validateRequest(idParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflow = await workflowManager.goBackLayer(req.params.id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          },
        });
      }

      logger.info('Workflow went back via API', { id: workflow.id });

      res.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/workflows/{id}/validate:
 *   post:
 *     summary: Validate layer
 *     description: Validate current or specified layer configuration
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               layer:
 *                 type: string
 *                 enum: [network, platform, devops, fullstack]
 *     responses:
 *       200:
 *         description: Validation result
 *       404:
 *         description: Workflow not found
 */
router.post(
  '/:id/validate',
  validateRequest(idParamSchema, 'params'),
  validateRequest(validateWorkflowSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflow = await workflowManager.getWorkflowById(req.params.id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          },
        });
      }

      const layer = req.body.layer || workflow.currentLayer;

      if (!layer) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_LAYER',
            message: 'No layer specified and no current layer set',
          },
        });
      }

      const result = await workflowManager.validateLayer(req.params.id, layer);

      logger.info('Workflow validation via API', {
        id: req.params.id,
        layer,
        valid: result.valid,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/workflows/{id}/deploy:
 *   post:
 *     summary: Deploy layer
 *     description: Deploy a layer to AWS
 *     tags: [Workflows]
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
 *             required: [layer, environment]
 *             properties:
 *               layer:
 *                 type: string
 *                 enum: [network, platform, devops, fullstack]
 *               environment:
 *                 type: string
 *                 enum: [dev, uat, production, dr]
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Deployment result
 *       400:
 *         description: Deployment failed
 *       404:
 *         description: Workflow not found
 */
router.post(
  '/:id/deploy',
  validateRequest(idParamSchema, 'params'),
  validateRequest(deployWorkflowSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { layer, environment, dryRun = false } = req.body;

      const result = await workflowManager.deployLayer(
        req.params.id,
        layer,
        environment,
        dryRun
      );

      if (!result.success) {
        const statusCode = result.errors?.some((e) => e.code === 'WORKFLOW_NOT_FOUND')
          ? 404
          : 400;

        return res.status(statusCode).json({
          success: false,
          error: {
            code: 'DEPLOYMENT_FAILED',
            message: 'Layer deployment failed',
            details: result.errors,
          },
        });
      }

      logger.info('Layer deployment via API', {
        id: req.params.id,
        layer,
        environment,
        dryRun,
        deploymentId: result.deploymentId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/workflows/by-design/{designId}:
 *   get:
 *     summary: Get workflow by design ID
 *     description: Get workflow associated with a design
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow state
 *       404:
 *         description: Workflow not found
 */
router.get(
  '/by-design/:designId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflow = await workflowManager.getWorkflowByDesignId(req.params.designId);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No workflow found for this design',
          },
        });
      }

      res.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
