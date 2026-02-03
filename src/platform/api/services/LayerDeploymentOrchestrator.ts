/**
 * Layer Deployment Orchestrator
 * Orchestrates layer-by-layer infrastructure deployment with dependency management
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger.js';
import {
  LayerType,
  Environment,
  DeploymentResult,
  ValidationResult,
  LayerDeploymentStatus,
  DesignNode,
} from '../types/designer.js';
import { validationService } from './ValidationService.js';
import { terraformGenerator, TerraformCode } from './TerraformGenerator.js';

const logger = createLogger('LayerDeploymentOrchestrator');
const prisma = new PrismaClient();

// Layer dependency order
const LAYER_ORDER: LayerType[] = ['network', 'platform', 'devops'];

// Layer dependencies (DAG)
const LAYER_DEPENDENCIES: Record<LayerType, LayerType[]> = {
  network: [],
  platform: ['network'],
  devops: ['platform'],
  fullstack: ['network', 'platform', 'devops'],
};

export interface DeploymentStatus {
  designId: string;
  layerType: LayerType;
  status: LayerDeploymentStatus;
  phase: 'validating' | 'generating' | 'planning' | 'applying' | 'completed' | 'failed';
  progress: number;
  resourcesCreated: number;
  resourcesUpdated: number;
  resourcesDeleted: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  terraformPlan?: string;
  outputs?: Record<string, any>;
}

export interface DependencyGraph {
  layers: LayerType[];
  edges: { from: LayerType; to: LayerType }[];
  order: LayerType[];
}

export interface DeploymentContext {
  designId: string;
  layerType: LayerType;
  environment: Environment;
  dryRun: boolean;
  autoApprove: boolean;
  terraformCode?: TerraformCode;
  plan?: string;
  outputs?: Record<string, any>;
}

export class LayerDeploymentOrchestrator {
  private eventEmitter: EventEmitter;
  private activeDeployments: Map<string, DeploymentStatus>;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.activeDeployments = new Map();
  }

  /**
   * Deploy a single layer
   */
  async deployLayer(
    designId: string,
    layerType: LayerType,
    environment: Environment,
    options: { dryRun?: boolean; autoApprove?: boolean } = {}
  ): Promise<DeploymentResult> {
    const { dryRun = false, autoApprove = true } = options;
    const deploymentKey = `${designId}-${layerType}`;

    logger.info('Starting layer deployment', { designId, layerType, environment, dryRun });

    try {
      // Initialize deployment status
      const status: DeploymentStatus = {
        designId,
        layerType,
        status: 'deploying',
        phase: 'validating',
        progress: 0,
        resourcesCreated: 0,
        resourcesUpdated: 0,
        resourcesDeleted: 0,
        startedAt: new Date(),
      };
      this.activeDeployments.set(deploymentKey, status);
      this.emitProgress(deploymentKey, status);

      // Step 1: Validate deployment readiness
      const readiness = await this.validateDeploymentReadiness(designId, layerType);
      if (!readiness.valid) {
        throw new Error(
          `Deployment validation failed: ${readiness.errors.map((e) => e.message).join(', ')}`
        );
      }

      status.phase = 'generating';
      status.progress = 20;
      this.emitProgress(deploymentKey, status);

      // Step 2: Generate Terraform code
      const terraformCode = await terraformGenerator.generateFromDesign(designId, environment);

      status.phase = 'planning';
      status.progress = 40;
      this.emitProgress(deploymentKey, status);

      // Step 3: Simulate Terraform plan (in production, would exec terraform plan)
      const plan = await this.simulateTerraformPlan(designId, layerType, terraformCode);
      status.terraformPlan = plan;

      if (dryRun) {
        // Dry run - return plan without applying
        status.status = 'validated';
        status.phase = 'completed';
        status.progress = 100;
        status.completedAt = new Date();
        this.emitProgress(deploymentKey, status);

        return {
          success: true,
          deploymentId: `dry-run-${Date.now()}`,
          status: 'validated',
          outputs: { plan },
        };
      }

      status.phase = 'applying';
      status.progress = 60;
      this.emitProgress(deploymentKey, status);

      // Step 4: Simulate Terraform apply (in production, would exec terraform apply)
      const result = await this.simulateTerraformApply(designId, layerType, environment);

      status.resourcesCreated = result.created;
      status.resourcesUpdated = result.updated;
      status.resourcesDeleted = result.deleted;
      status.outputs = result.outputs;
      status.progress = 90;
      this.emitProgress(deploymentKey, status);

      // Step 5: Update layer status in database
      await this.updateLayerStatus(designId, layerType, 'deployed', result.outputs);

      // Step 6: Finalize
      status.status = 'deployed';
      status.phase = 'completed';
      status.progress = 100;
      status.completedAt = new Date();
      this.emitProgress(deploymentKey, status);

      logger.info('Layer deployment complete', {
        designId,
        layerType,
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
      });

      return {
        success: true,
        deploymentId: `deploy-${layerType}-${Date.now()}`,
        status: 'deployed',
        outputs: result.outputs,
        duration: Date.now() - status.startedAt!.getTime(),
      };
    } catch (error: any) {
      logger.error('Layer deployment failed', { designId, layerType, error: error.message });

      const status = this.activeDeployments.get(deploymentKey);
      if (status) {
        status.status = 'failed';
        status.phase = 'failed';
        status.error = error.message;
        status.completedAt = new Date();
        this.emitProgress(deploymentKey, status);
      }

      // Update layer status to failed
      await this.updateLayerStatus(designId, layerType, 'failed');

      return {
        success: false,
        deploymentId: `failed-${layerType}-${Date.now()}`,
        status: 'failed',
        errors: [{ code: 'DEPLOYMENT_FAILED', message: error.message }],
      };
    } finally {
      this.activeDeployments.delete(deploymentKey);
    }
  }

  /**
   * Deploy all layers in dependency order
   */
  async deployAllLayers(
    designId: string,
    environment: Environment,
    options: { dryRun?: boolean; autoApprove?: boolean } = {}
  ): Promise<DeploymentResult> {
    logger.info('Starting full deployment', { designId, environment });

    const design = await prisma.visualDesign.findUnique({
      where: { id: designId },
    });

    if (!design) {
      return {
        success: false,
        deploymentId: '',
        status: 'failed',
        errors: [{ code: 'DESIGN_NOT_FOUND', message: `Design ${designId} not found` }],
      };
    }

    const designData = design.designData as { nodes: DesignNode[] };
    const nodes = designData.nodes || [];

    // Determine which layers have nodes
    const layersWithNodes: LayerType[] = [];
    if (nodes.some((n) => n.layer === 'network')) layersWithNodes.push('network');
    if (nodes.some((n) => n.layer === 'platform')) layersWithNodes.push('platform');
    if (nodes.some((n) => n.layer === 'devops')) layersWithNodes.push('devops');

    // Resolve deployment order
    const deploymentOrder = this.resolveDependencies(layersWithNodes);

    const results: DeploymentResult[] = [];
    let allSuccessful = true;

    for (const layer of deploymentOrder) {
      const result = await this.deployLayer(designId, layer, environment, options);
      results.push(result);

      if (!result.success) {
        allSuccessful = false;
        break; // Stop deployment on first failure
      }
    }

    // Update design status
    await prisma.visualDesign.update({
      where: { id: designId },
      data: {
        status: allSuccessful ? 'deployed' : 'failed',
        lastDeployedAt: allSuccessful ? new Date() : undefined,
      },
    });

    return {
      success: allSuccessful,
      deploymentId: `full-deploy-${Date.now()}`,
      status: allSuccessful ? 'deployed' : 'failed',
      outputs: {
        layers: results.map((r) => ({
          status: r.status,
          outputs: r.outputs,
        })),
      },
      errors: allSuccessful
        ? undefined
        : results.filter((r) => !r.success).flatMap((r) => r.errors || []),
    };
  }

  /**
   * Validate deployment readiness
   */
  async validateDeploymentReadiness(
    designId: string,
    layerType: LayerType
  ): Promise<ValidationResult> {
    logger.info('Validating deployment readiness', { designId, layerType });

    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Check design exists
    const design = await prisma.visualDesign.findUnique({
      where: { id: designId },
      include: { workflow: { include: { layers: true } } },
    });

    if (!design) {
      errors.push({
        code: 'DESIGN_NOT_FOUND',
        message: `Design ${designId} not found`,
        severity: 'error',
      });
      return { valid: false, errors, warnings };
    }

    // Check dependent layers are deployed
    const dependencies = LAYER_DEPENDENCIES[layerType];
    for (const dep of dependencies) {
      const depLayer = design.workflow?.layers.find((l) => l.layerType === dep);
      if (!depLayer || depLayer.status !== 'deployed') {
        errors.push({
          code: 'DEPENDENCY_NOT_DEPLOYED',
          message: `Dependent layer "${dep}" must be deployed before "${layerType}"`,
          severity: 'error',
        });
      }
    }

    // Check no conflicting deployment in progress
    const deploymentKey = `${designId}-${layerType}`;
    if (this.activeDeployments.has(deploymentKey)) {
      errors.push({
        code: 'DEPLOYMENT_IN_PROGRESS',
        message: `Deployment for layer "${layerType}" is already in progress`,
        severity: 'error',
      });
    }

    // Check AWS credentials exist (in production)
    const credentials = await prisma.aWSCredential.findFirst({
      where: { isDefault: true },
    });
    if (!credentials) {
      warnings.push({
        code: 'NO_DEFAULT_CREDENTIALS',
        message:
          'No default AWS credentials configured - deployment may fail',
        severity: 'warning',
      });
    }

    // Validate the design itself
    const designValidation = await validationService.validateDesign(designId);
    errors.push(...designValidation.errors);
    warnings.push(...designValidation.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(designId: string, layerType: LayerType): Promise<DeploymentStatus> {
    const deploymentKey = `${designId}-${layerType}`;

    // Check active deployments first
    const activeStatus = this.activeDeployments.get(deploymentKey);
    if (activeStatus) {
      return activeStatus;
    }

    // Check database for historical status
    const layer = await prisma.designLayer.findFirst({
      where: { designId, layerType },
    });

    if (!layer) {
      return {
        designId,
        layerType,
        status: 'pending',
        phase: 'completed',
        progress: 0,
        resourcesCreated: 0,
        resourcesUpdated: 0,
        resourcesDeleted: 0,
      };
    }

    return {
      designId,
      layerType,
      status: layer.status as LayerDeploymentStatus,
      phase: 'completed',
      progress: 100,
      resourcesCreated: 0,
      resourcesUpdated: 0,
      resourcesDeleted: 0,
      completedAt: layer.deployedAt || undefined,
      outputs: layer.terraformOutput as Record<string, any> | undefined,
    };
  }

  /**
   * Rollback a deployed layer
   */
  async rollbackLayer(designId: string, layerType: LayerType): Promise<void> {
    logger.info('Rolling back layer', { designId, layerType });

    // In production, would execute terraform destroy or apply previous state
    // For now, just update status

    await prisma.designLayer.updateMany({
      where: { designId, layerType },
      data: {
        status: 'rolled_back',
        terraformOutput: null,
      },
    });

    // Also roll back dependent layers
    const dependentLayers = Object.entries(LAYER_DEPENDENCIES)
      .filter(([_, deps]) => deps.includes(layerType))
      .map(([layer]) => layer as LayerType);

    for (const depLayer of dependentLayers) {
      await prisma.designLayer.updateMany({
        where: { designId, layerType: depLayer },
        data: {
          status: 'pending',
          terraformOutput: null,
        },
      });
    }

    logger.info('Layer rollback complete', { designId, layerType, dependentLayers });
  }

  /**
   * Cancel an in-progress deployment
   */
  async cancelDeployment(designId: string, layerType: LayerType): Promise<void> {
    const deploymentKey = `${designId}-${layerType}`;

    if (this.activeDeployments.has(deploymentKey)) {
      const status = this.activeDeployments.get(deploymentKey)!;
      status.status = 'failed';
      status.phase = 'failed';
      status.error = 'Deployment cancelled by user';
      this.emitProgress(deploymentKey, status);
      this.activeDeployments.delete(deploymentKey);

      logger.info('Deployment cancelled', { designId, layerType });
    }
  }

  /**
   * Resolve layer dependencies using topological sort
   */
  resolveDependencies(layers: LayerType[]): LayerType[] {
    const sorted: LayerType[] = [];
    const visited = new Set<LayerType>();
    const visiting = new Set<LayerType>();

    const visit = (layer: LayerType) => {
      if (visiting.has(layer)) {
        throw new Error(`Circular dependency detected involving layer: ${layer}`);
      }
      if (visited.has(layer)) return;

      visiting.add(layer);

      const deps = LAYER_DEPENDENCIES[layer] || [];
      for (const dep of deps) {
        if (layers.includes(dep)) {
          visit(dep);
        }
      }

      visiting.delete(layer);
      visited.add(layer);
      sorted.push(layer);
    };

    for (const layer of layers) {
      visit(layer);
    }

    return sorted;
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(layers: LayerType[]): DependencyGraph {
    const edges: { from: LayerType; to: LayerType }[] = [];

    for (const layer of layers) {
      const deps = LAYER_DEPENDENCIES[layer] || [];
      for (const dep of deps) {
        if (layers.includes(dep)) {
          edges.push({ from: dep, to: layer });
        }
      }
    }

    return {
      layers,
      edges,
      order: this.resolveDependencies(layers),
    };
  }

  /**
   * Subscribe to deployment events
   */
  onProgress(callback: (status: DeploymentStatus) => void): void {
    this.eventEmitter.on('progress', callback);
  }

  /**
   * Unsubscribe from deployment events
   */
  offProgress(callback: (status: DeploymentStatus) => void): void {
    this.eventEmitter.off('progress', callback);
  }

  // Private methods

  private emitProgress(deploymentKey: string, status: DeploymentStatus): void {
    this.eventEmitter.emit('progress', status);
    logger.debug('Deployment progress', {
      key: deploymentKey,
      phase: status.phase,
      progress: status.progress,
    });
  }

  private async simulateTerraformPlan(
    designId: string,
    layerType: LayerType,
    terraformCode: TerraformCode
  ): Promise<string> {
    // In production, would execute: terraform plan -out=plan.tfplan
    // For now, simulate a plan output

    const module = terraformCode.modules.find((m) => m.layer === layerType);
    if (!module) {
      return 'No resources to create for this layer.';
    }

    const mainTf = module.files.find((f) => f.name === 'main.tf')?.content || '';
    const resourceMatches = mainTf.match(/resource "([^"]+)" "([^"]+)"/g) || [];

    const planLines = [
      `Terraform will perform the following actions for ${layerType} layer:`,
      '',
      ...resourceMatches.map((r) => `  + ${r.replace('resource ', '').replace(/"/g, '')}`),
      '',
      `Plan: ${resourceMatches.length} to add, 0 to change, 0 to destroy.`,
    ];

    return planLines.join('\n');
  }

  private async simulateTerraformApply(
    designId: string,
    layerType: LayerType,
    environment: Environment
  ): Promise<{
    created: number;
    updated: number;
    deleted: number;
    outputs: Record<string, any>;
  }> {
    // In production, would execute: terraform apply plan.tfplan
    // For now, simulate apply output

    const design = await prisma.visualDesign.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new Error('Design not found');
    }

    const designData = design.designData as { nodes: DesignNode[] };
    const nodes = designData.nodes.filter((n) => n.layer === layerType);

    // Simulate creating deployed resources
    for (const node of nodes) {
      await prisma.deployedResource.upsert({
        where: {
          designId_nodeId: {
            designId,
            nodeId: node.id,
          },
        },
        create: {
          designId,
          nodeId: node.id,
          resourceId: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          resourceType: node.type,
          cloud: design.cloud || 'aws',
          region: design.region || 'us-east-1',
          environment: environment,
          status: 'active',
          config: node.data,
        },
        update: {
          status: 'active',
          config: node.data,
        },
      });
    }

    // Generate simulated outputs
    const outputs: Record<string, any> = {};
    for (const node of nodes) {
      if (node.type === 'vpc') {
        outputs.vpc_id = `vpc-${Date.now().toString(36)}`;
      } else if (node.type === 'subnet') {
        outputs[`subnet_${node.id}_id`] = `subnet-${Date.now().toString(36)}`;
      } else if (node.type === 'eks_cluster') {
        outputs.cluster_endpoint = `https://eks.${design.region}.amazonaws.com/${node.data.name || node.id}`;
      } else if (node.type === 'rds_instance') {
        outputs.db_endpoint = `${node.data.identifier || node.id}.${Date.now().toString(36)}.${design.region}.rds.amazonaws.com:5432`;
      }
    }

    return {
      created: nodes.length,
      updated: 0,
      deleted: 0,
      outputs,
    };
  }

  private async updateLayerStatus(
    designId: string,
    layerType: LayerType,
    status: LayerDeploymentStatus,
    outputs?: Record<string, any>
  ): Promise<void> {
    const workflow = await prisma.designWorkflow.findUnique({
      where: { designId },
    });

    if (!workflow) {
      // Create workflow if it doesn't exist
      await prisma.designWorkflow.create({
        data: {
          designId,
          currentLayer: layerType,
          environments: { dev: {}, staging: {}, prod: {} },
        },
      });
    }

    // Upsert layer
    const existingLayer = await prisma.designLayer.findFirst({
      where: { designId, layerType },
    });

    if (existingLayer) {
      await prisma.designLayer.update({
        where: { id: existingLayer.id },
        data: {
          status,
          deployedAt: status === 'deployed' ? new Date() : undefined,
          terraformOutput: outputs || undefined,
        },
      });
    } else {
      const workflowRecord = await prisma.designWorkflow.findUnique({
        where: { designId },
      });

      if (workflowRecord) {
        await prisma.designLayer.create({
          data: {
            workflowId: workflowRecord.id,
            designId,
            layerType,
            layerName: `${layerType}-layer`,
            layerData: {},
            status,
            dependsOn: LAYER_DEPENDENCIES[layerType],
            deployedAt: status === 'deployed' ? new Date() : undefined,
            terraformOutput: outputs || undefined,
          },
        });
      }
    }

    // Update workflow completion flags
    if (status === 'deployed') {
      const updateData: Record<string, boolean> = {};
      if (layerType === 'network') updateData.networkComplete = true;
      if (layerType === 'platform') updateData.platformComplete = true;
      if (layerType === 'devops') updateData.devopsComplete = true;

      await prisma.designWorkflow.update({
        where: { designId },
        data: updateData,
      });
    }
  }
}

// Export singleton instance
export const layerDeploymentOrchestrator = new LayerDeploymentOrchestrator();
