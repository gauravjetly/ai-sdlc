/**
 * Workflow Manager Service
 * Orchestrates the wizard workflow for infrastructure design
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';
import {
  Workflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  LayerType,
  LayerData,
  NetworkLayerData,
  PlatformLayerData,
  DevOpsLayerData,
  EnvironmentConfigs,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DeploymentResult,
  Environment,
  Layer,
} from '../types/designer.js';
import { designService } from './DesignService.js';
import { templateService } from './TemplateService.js';

const logger = createLogger('WorkflowManager');
const prisma = new PrismaClient();

// Layer dependency order
const LAYER_ORDER: LayerType[] = ['network', 'platform', 'devops'];

// Layer dependency map
const LAYER_DEPENDENCIES: Record<LayerType, LayerType[]> = {
  network: [],
  platform: ['network'],
  devops: ['platform'],
  fullstack: [],
};

export class WorkflowManager {
  /**
   * Create a new workflow with associated design
   */
  async createWorkflow(
    data: CreateWorkflowRequest,
    userId?: string
  ): Promise<{ workflow: Workflow; designId: string }> {
    logger.info('Creating workflow', { designName: data.designName, cloud: data.cloud });

    // Create the design first
    const design = await designService.createDesign(
      {
        name: data.designName,
        templateId: data.templateId,
        cloud: data.cloud,
        region: data.region,
        environment: data.environment,
      },
      userId
    );

    // Default environment configs
    const defaultEnvConfigs: EnvironmentConfigs = {
      dev: {
        instanceSizes: {},
        replicaCounts: {},
        enabledFeatures: [],
        variables: {},
      },
      staging: {
        instanceSizes: {},
        replicaCounts: {},
        enabledFeatures: [],
        variables: {},
      },
      prod: {
        instanceSizes: {},
        replicaCounts: {},
        enabledFeatures: [],
        variables: {},
      },
    };

    // Create the workflow
    const workflow = await prisma.designWorkflow.create({
      data: {
        designId: design.id,
        currentLayer: 'network',
        currentStep: 1,
        networkComplete: false,
        platformComplete: false,
        devopsComplete: false,
        environments: defaultEnvConfigs as any,
      },
    });

    // If template was used, increment usage
    if (data.templateId) {
      await templateService.incrementUsage(data.templateId);
    }

    logger.info('Workflow created', { workflowId: workflow.id, designId: design.id });

    return {
      workflow: this.mapToWorkflow(workflow),
      designId: design.id,
    };
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<Workflow | null> {
    const workflow = await prisma.designWorkflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return null;
    }

    return this.mapToWorkflow(workflow);
  }

  /**
   * Get workflow by design ID
   */
  async getWorkflowByDesignId(designId: string): Promise<Workflow | null> {
    const workflow = await prisma.designWorkflow.findUnique({
      where: { designId },
    });

    if (!workflow) {
      return null;
    }

    return this.mapToWorkflow(workflow);
  }

  /**
   * Get workflow with design
   */
  async getWorkflowWithDesign(id: string): Promise<{
    workflow: Workflow;
    design: any;
    layers: Layer[];
  } | null> {
    const workflow = await prisma.designWorkflow.findUnique({
      where: { id },
      include: {
        design: true,
        layers: true,
      },
    });

    if (!workflow) {
      return null;
    }

    return {
      workflow: this.mapToWorkflow(workflow),
      design: workflow.design,
      layers: workflow.layers.map(this.mapToLayer),
    };
  }

  /**
   * Update workflow state
   */
  async updateWorkflow(id: string, data: UpdateWorkflowRequest): Promise<Workflow | null> {
    logger.info('Updating workflow', { id, currentLayer: data.currentLayer });

    const existing = await prisma.designWorkflow.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const updated = await prisma.designWorkflow.update({
      where: { id },
      data: {
        currentLayer: data.currentLayer,
        currentStep: data.currentStep,
        networkData: data.networkData as any,
        platformData: data.platformData as any,
        devopsData: data.devopsData as any,
        environments: data.environments
          ? { ...(existing.environments as any), ...data.environments }
          : undefined,
      },
    });

    logger.info('Workflow updated', { id });
    return this.mapToWorkflow(updated);
  }

  /**
   * Advance workflow to next layer
   */
  async advanceLayer(
    id: string,
    validateFirst: boolean = true
  ): Promise<{
    success: boolean;
    workflow?: Workflow;
    validationResult?: ValidationResult;
    error?: string;
  }> {
    logger.info('Advancing workflow layer', { id, validateFirst });

    const workflow = await this.getWorkflowById(id);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    const currentLayer = workflow.currentLayer;
    if (!currentLayer) {
      return { success: false, error: 'No current layer set' };
    }

    // Validate current layer if requested
    if (validateFirst) {
      const validationResult = await this.validateLayer(id, currentLayer);
      if (!validationResult.valid) {
        return { success: false, validationResult };
      }
    }

    // Determine next layer
    const currentIndex = LAYER_ORDER.indexOf(currentLayer);
    const isLastLayer = currentIndex === LAYER_ORDER.length - 1;

    // Mark current layer complete
    const updateData: any = {};
    if (currentLayer === 'network') {
      updateData.networkComplete = true;
    } else if (currentLayer === 'platform') {
      updateData.platformComplete = true;
    } else if (currentLayer === 'devops') {
      updateData.devopsComplete = true;
    }

    // Set next layer
    if (!isLastLayer) {
      updateData.currentLayer = LAYER_ORDER[currentIndex + 1];
      updateData.currentStep = 1;
    }

    const updated = await prisma.designWorkflow.update({
      where: { id },
      data: updateData,
    });

    logger.info('Workflow advanced', {
      id,
      fromLayer: currentLayer,
      toLayer: isLastLayer ? 'complete' : LAYER_ORDER[currentIndex + 1],
    });

    return {
      success: true,
      workflow: this.mapToWorkflow(updated),
    };
  }

  /**
   * Go back to previous layer
   */
  async goBackLayer(id: string): Promise<Workflow | null> {
    const workflow = await this.getWorkflowById(id);
    if (!workflow || !workflow.currentLayer) {
      return null;
    }

    const currentIndex = LAYER_ORDER.indexOf(workflow.currentLayer);
    if (currentIndex <= 0) {
      return workflow; // Already at first layer
    }

    const previousLayer = LAYER_ORDER[currentIndex - 1];

    const updated = await prisma.designWorkflow.update({
      where: { id },
      data: {
        currentLayer: previousLayer,
        currentStep: 1, // Reset to first step of previous layer
      },
    });

    logger.info('Workflow went back', {
      id,
      fromLayer: workflow.currentLayer,
      toLayer: previousLayer,
    });

    return this.mapToWorkflow(updated);
  }

  /**
   * Validate a specific layer
   */
  async validateLayer(workflowId: string, layer: LayerType): Promise<ValidationResult> {
    logger.info('Validating layer', { workflowId, layer });

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const workflow = await this.getWorkflowById(workflowId);
    if (!workflow) {
      errors.push({
        code: 'WORKFLOW_NOT_FOUND',
        message: 'Workflow not found',
        severity: 'error',
      });
      return { valid: false, errors, warnings };
    }

    // Check layer dependencies
    const dependencies = LAYER_DEPENDENCIES[layer];
    for (const dep of dependencies) {
      const depComplete = this.isLayerComplete(workflow, dep);
      if (!depComplete) {
        errors.push({
          code: 'LAYER_DEPENDENCY',
          message: `Layer "${dep}" must be complete before "${layer}"`,
          severity: 'error',
        });
      }
    }

    // Get layer data
    const layerData = this.getLayerData(workflow, layer);
    if (!layerData || layerData.nodes.length === 0) {
      errors.push({
        code: 'EMPTY_LAYER',
        message: `Layer "${layer}" has no components configured`,
        severity: 'error',
      });
    } else {
      // Validate layer-specific rules
      const layerValidation = await this.validateLayerData(layer, layerData, workflow);
      errors.push(...layerValidation.errors);
      warnings.push(...layerValidation.warnings);
    }

    logger.info('Layer validation complete', {
      workflowId,
      layer,
      valid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate layer-specific data
   */
  private async validateLayerData(
    layer: LayerType,
    data: LayerData,
    workflow: Workflow
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (layer) {
      case 'network':
        // Validate network layer
        const vpcNodes = data.nodes.filter((n) => n.type === 'vpc');
        if (vpcNodes.length === 0) {
          errors.push({
            code: 'MISSING_VPC',
            message: 'Network layer must have at least one VPC',
            severity: 'error',
          });
        }
        if (vpcNodes.length > 1) {
          warnings.push({
            code: 'MULTIPLE_VPCS',
            message: 'Multiple VPCs detected - ensure this is intentional',
            severity: 'warning',
          });
        }

        // Check for subnets
        const subnetNodes = data.nodes.filter((n) => n.type === 'subnet');
        if (subnetNodes.length === 0) {
          errors.push({
            code: 'MISSING_SUBNETS',
            message: 'Network layer must have at least one subnet',
            severity: 'error',
          });
        }

        // Check CIDR overlaps
        const cidrs = this.extractCIDRs(data.nodes);
        const overlaps = this.findCIDROverlaps(cidrs);
        for (const overlap of overlaps) {
          errors.push({
            code: 'CIDR_OVERLAP',
            message: `CIDR ${overlap.cidr1} overlaps with ${overlap.cidr2}`,
            nodeId: overlap.nodeId,
            severity: 'error',
          });
        }
        break;

      case 'platform':
        // Check if network is deployed (for platform resources that need VPC)
        if (!workflow.networkComplete) {
          errors.push({
            code: 'NETWORK_INCOMPLETE',
            message: 'Network layer must be complete before configuring platform',
            severity: 'error',
          });
        }

        // Validate EKS clusters have node groups
        const eksNodes = data.nodes.filter((n) => n.type === 'eks_cluster');
        const nodeGroups = data.nodes.filter((n) => n.type === 'eks_node_group');
        if (eksNodes.length > 0 && nodeGroups.length === 0) {
          errors.push({
            code: 'EKS_NO_NODE_GROUPS',
            message: 'EKS cluster must have at least one node group',
            severity: 'error',
          });
        }

        // Validate RDS has subnet placement
        const rdsNodes = data.nodes.filter(
          (n) => n.type === 'rds_instance' || n.type === 'rds_aurora'
        );
        for (const rds of rdsNodes) {
          if (!rds.data.subnetGroupName && !rds.data.subnetIds) {
            warnings.push({
              code: 'RDS_NO_SUBNET',
              message: `RDS "${rds.data.name || rds.id}" has no subnet configuration`,
              nodeId: rds.id,
              severity: 'warning',
            });
          }
        }
        break;

      case 'devops':
        // Check if platform is complete
        if (!workflow.platformComplete) {
          errors.push({
            code: 'PLATFORM_INCOMPLETE',
            message: 'Platform layer must be complete before configuring DevOps',
            severity: 'error',
          });
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Deploy a layer to AWS
   */
  async deployLayer(
    workflowId: string,
    layer: LayerType,
    environment: Environment,
    dryRun: boolean = false
  ): Promise<DeploymentResult> {
    logger.info('Deploying layer', { workflowId, layer, environment, dryRun });

    // Validate first
    const validation = await this.validateLayer(workflowId, layer);
    if (!validation.valid) {
      return {
        success: false,
        deploymentId: '',
        status: 'failed',
        errors: validation.errors.map((e) => ({
          code: e.code,
          message: e.message,
        })),
      };
    }

    // Check dependencies are deployed
    const workflow = await this.getWorkflowById(workflowId);
    if (!workflow) {
      return {
        success: false,
        deploymentId: '',
        status: 'failed',
        errors: [{ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' }],
      };
    }

    const dependencies = LAYER_DEPENDENCIES[layer];
    for (const dep of dependencies) {
      const depLayer = await this.getDeployedLayer(workflowId, dep);
      if (!depLayer || depLayer.status !== 'deployed') {
        return {
          success: false,
          deploymentId: '',
          status: 'failed',
          errors: [
            {
              code: 'DEPENDENCY_NOT_DEPLOYED',
              message: `Layer "${dep}" must be deployed before "${layer}"`,
            },
          ],
        };
      }
    }

    if (dryRun) {
      logger.info('Dry run complete', { workflowId, layer });
      return {
        success: true,
        deploymentId: `dry-run-${Date.now()}`,
        status: 'validated',
        outputs: {},
      };
    }

    // Create or update the layer record
    const layerData = this.getLayerData(workflow, layer);
    const existingLayer = await prisma.designLayer.findFirst({
      where: { workflowId, layerType: layer },
    });

    const deploymentId = `deploy-${layer}-${Date.now()}`;

    if (existingLayer) {
      await prisma.designLayer.update({
        where: { id: existingLayer.id },
        data: {
          status: 'deploying',
          layerData: layerData as any,
        },
      });
    } else {
      await prisma.designLayer.create({
        data: {
          workflowId,
          designId: workflow.designId,
          layerType: layer,
          layerName: `${layer}-layer`,
          layerData: layerData as any,
          status: 'deploying',
          dependsOn: dependencies,
        },
      });
    }

    // TODO: Actual AWS deployment via Terraform
    // For now, simulate deployment
    logger.info('Layer deployment initiated', { deploymentId, layer });

    // Update layer status to deployed (simulated)
    await prisma.designLayer.updateMany({
      where: { workflowId, layerType: layer },
      data: {
        status: 'deployed',
        deployedAt: new Date(),
        terraformOutput: {
          deploymentId,
          environment,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      deploymentId,
      status: 'deployed',
      outputs: {
        layer,
        environment,
        deployedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get deployed layer
   */
  private async getDeployedLayer(workflowId: string, layerType: LayerType) {
    return prisma.designLayer.findFirst({
      where: { workflowId, layerType },
    });
  }

  /**
   * Helper: Check if a layer is complete
   */
  private isLayerComplete(workflow: Workflow, layer: LayerType): boolean {
    switch (layer) {
      case 'network':
        return workflow.networkComplete;
      case 'platform':
        return workflow.platformComplete;
      case 'devops':
        return workflow.devopsComplete;
      default:
        return false;
    }
  }

  /**
   * Helper: Get layer data from workflow
   */
  private getLayerData(workflow: Workflow, layer: LayerType): LayerData | null {
    switch (layer) {
      case 'network':
        return workflow.networkData || null;
      case 'platform':
        return workflow.platformData || null;
      case 'devops':
        return workflow.devopsData || null;
      default:
        return null;
    }
  }

  /**
   * Helper: Extract CIDRs from nodes
   */
  private extractCIDRs(nodes: any[]): { nodeId: string; cidr: string }[] {
    const cidrs: { nodeId: string; cidr: string }[] = [];

    for (const node of nodes) {
      if (node.data.cidr) {
        cidrs.push({ nodeId: node.id, cidr: node.data.cidr });
      }
      if (node.data.cidrBlock) {
        cidrs.push({ nodeId: node.id, cidr: node.data.cidrBlock });
      }
    }

    return cidrs;
  }

  /**
   * Helper: Find CIDR overlaps
   */
  private findCIDROverlaps(
    cidrs: { nodeId: string; cidr: string }[]
  ): { nodeId: string; cidr1: string; cidr2: string }[] {
    const overlaps: { nodeId: string; cidr1: string; cidr2: string }[] = [];

    for (let i = 0; i < cidrs.length; i++) {
      for (let j = i + 1; j < cidrs.length; j++) {
        if (this.cidrsOverlap(cidrs[i].cidr, cidrs[j].cidr)) {
          overlaps.push({
            nodeId: cidrs[i].nodeId,
            cidr1: cidrs[i].cidr,
            cidr2: cidrs[j].cidr,
          });
        }
      }
    }

    return overlaps;
  }

  /**
   * Helper: Check if two CIDRs overlap
   */
  private cidrsOverlap(cidr1: string, cidr2: string): boolean {
    try {
      const [ip1, prefix1] = cidr1.split('/');
      const [ip2, prefix2] = cidr2.split('/');

      const ip1Num = this.ipToNumber(ip1);
      const ip2Num = this.ipToNumber(ip2);

      const mask1 = ~((1 << (32 - parseInt(prefix1))) - 1) >>> 0;
      const mask2 = ~((1 << (32 - parseInt(prefix2))) - 1) >>> 0;

      const network1 = (ip1Num & mask1) >>> 0;
      const network2 = (ip2Num & mask2) >>> 0;

      const broadcastMask = Math.min(parseInt(prefix1), parseInt(prefix2));
      const commonMask = ~((1 << (32 - broadcastMask)) - 1) >>> 0;

      return ((network1 & commonMask) >>> 0) === ((network2 & commonMask) >>> 0);
    } catch {
      return false;
    }
  }

  /**
   * Helper: Convert IP to number
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  /**
   * Map Prisma model to Workflow type
   */
  private mapToWorkflow(model: any): Workflow {
    return {
      id: model.id,
      designId: model.designId,
      currentLayer: model.currentLayer || undefined,
      currentStep: model.currentStep,
      networkComplete: model.networkComplete,
      platformComplete: model.platformComplete,
      devopsComplete: model.devopsComplete,
      networkData: model.networkData as NetworkLayerData | undefined,
      platformData: model.platformData as PlatformLayerData | undefined,
      devopsData: model.devopsData as DevOpsLayerData | undefined,
      environments: model.environments as EnvironmentConfigs,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }

  /**
   * Map Prisma model to Layer type
   */
  private mapToLayer(model: any): Layer {
    return {
      id: model.id,
      workflowId: model.workflowId,
      designId: model.designId,
      layerType: model.layerType,
      layerName: model.layerName,
      layerData: model.layerData as LayerData,
      status: model.status,
      deployedAt: model.deployedAt || undefined,
      dependsOn: model.dependsOn,
      envOverrides: model.envOverrides || undefined,
      terraformOutput: model.terraformOutput || undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}

// Export singleton instance
export const workflowManager = new WorkflowManager();
