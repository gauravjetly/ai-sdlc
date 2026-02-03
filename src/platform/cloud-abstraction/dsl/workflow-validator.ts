/**
 * Workflow Validator
 * Validates workflow definitions against schema and cloud capabilities
 */

import {
  WorkflowDefinition,
  WorkflowValidationResult,
  ValidationError,
  ValidationWarning
} from '../types/workflow-types.js';
import { CloudProvider } from '../types/cloud-types.js';

const VALID_CLOUD_PROVIDERS: CloudProvider[] = ['aws', 'oci', 'azure', 'gcp'];

const VALID_RESOURCE_TYPES = [
  'virtual_network',
  'kubernetes_cluster',
  'managed_database',
  'object_storage',
  'container_deployment'
];

const CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const NAME_REGEX = /^[a-z][a-z0-9-]*$/;

export class WorkflowValidator {
  /**
   * Validate workflow definition
   */
  static validate(workflow: WorkflowDefinition): WorkflowValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate workflow metadata
    this.validateMetadata(workflow, errors, warnings);

    // Validate resources
    this.validateResources(workflow, errors, warnings);

    // Check resource dependencies
    this.validateDependencies(workflow, errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static validateMetadata(
    workflow: WorkflowDefinition,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { name, target_cloud, region } = workflow.workflow;

    // Validate workflow name
    if (!NAME_REGEX.test(name)) {
      errors.push({
        field: 'workflow.name',
        message: 'Workflow name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens',
        code: 'INVALID_NAME_FORMAT'
      });
    }

    // Validate target cloud
    if (!VALID_CLOUD_PROVIDERS.includes(target_cloud)) {
      errors.push({
        field: 'workflow.target_cloud',
        message: `Invalid cloud provider. Must be one of: ${VALID_CLOUD_PROVIDERS.join(', ')}`,
        code: 'INVALID_CLOUD_PROVIDER'
      });
    }

    // Validate region
    if (!region || region.length === 0) {
      errors.push({
        field: 'workflow.region',
        message: 'Region must be specified',
        code: 'MISSING_REGION'
      });
    }

    // Warning for non-AWS/OCI clouds (Phase 1)
    if (target_cloud !== 'aws' && target_cloud !== 'oci') {
      warnings.push({
        field: 'workflow.target_cloud',
        message: `Cloud provider '${target_cloud}' is not yet supported in Phase 1. Currently supported: aws, oci`,
        suggestion: 'Use aws or oci for Phase 1 deployment'
      });
    }
  }

  private static validateResources(
    workflow: WorkflowDefinition,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { resources } = workflow.workflow;

    if (!resources || resources.length === 0) {
      errors.push({
        field: 'workflow.resources',
        message: 'Workflow must define at least one resource',
        code: 'NO_RESOURCES'
      });
      return;
    }

    const resourceNames = new Set<string>();

    resources.forEach((resource, index) => {
      const prefix = `workflow.resources[${index}]`;

      // Validate resource type
      if (!VALID_RESOURCE_TYPES.includes(resource.type)) {
        errors.push({
          field: `${prefix}.type`,
          message: `Invalid resource type '${resource.type}'. Must be one of: ${VALID_RESOURCE_TYPES.join(', ')}`,
          code: 'INVALID_RESOURCE_TYPE'
        });
      }

      // Validate resource name
      if (!resource.name) {
        errors.push({
          field: `${prefix}.name`,
          message: 'Resource name is required',
          code: 'MISSING_RESOURCE_NAME'
        });
      } else if (!NAME_REGEX.test(resource.name)) {
        errors.push({
          field: `${prefix}.name`,
          message: 'Resource name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens',
          code: 'INVALID_NAME_FORMAT'
        });
      }

      // Check for duplicate names
      if (resourceNames.has(resource.name)) {
        errors.push({
          field: `${prefix}.name`,
          message: `Duplicate resource name '${resource.name}'`,
          code: 'DUPLICATE_RESOURCE_NAME'
        });
      }
      resourceNames.add(resource.name);

      // Type-specific validation
      this.validateResourceType(resource, prefix, errors, warnings);
    });
  }

  private static validateResourceType(
    resource: any,
    prefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    switch (resource.type) {
      case 'virtual_network':
        if (!resource.cidr) {
          errors.push({
            field: `${prefix}.cidr`,
            message: 'CIDR block is required for virtual_network',
            code: 'MISSING_CIDR'
          });
        } else if (!CIDR_REGEX.test(resource.cidr)) {
          errors.push({
            field: `${prefix}.cidr`,
            message: 'Invalid CIDR format. Expected format: 10.0.0.0/16',
            code: 'INVALID_CIDR_FORMAT'
          });
        }
        break;

      case 'kubernetes_cluster':
        if (!resource.version) {
          errors.push({
            field: `${prefix}.version`,
            message: 'Kubernetes version is required',
            code: 'MISSING_VERSION'
          });
        }
        if (!resource.instance_type) {
          warnings.push({
            field: `${prefix}.instance_type`,
            message: 'No instance_type specified, will use default (small_compute)',
            suggestion: 'Specify instance_type for better control'
          });
        }
        if (!resource.node_count || resource.node_count < 1) {
          errors.push({
            field: `${prefix}.node_count`,
            message: 'node_count must be at least 1',
            code: 'INVALID_NODE_COUNT'
          });
        }
        if (!resource.network) {
          errors.push({
            field: `${prefix}.network`,
            message: 'Kubernetes cluster must reference a virtual_network',
            code: 'MISSING_NETWORK_REFERENCE'
          });
        }
        break;

      case 'container_deployment':
        if (!resource.cluster) {
          errors.push({
            field: `${prefix}.cluster`,
            message: 'Container deployment must reference a kubernetes_cluster',
            code: 'MISSING_CLUSTER_REFERENCE'
          });
        }
        if (!resource.image) {
          errors.push({
            field: `${prefix}.image`,
            message: 'Container image is required',
            code: 'MISSING_IMAGE'
          });
        }
        if (!resource.replicas || resource.replicas < 1) {
          warnings.push({
            field: `${prefix}.replicas`,
            message: 'replicas not specified or less than 1, using default of 2',
            suggestion: 'Specify replicas for production deployments'
          });
        }
        break;

      case 'managed_database':
        if (!resource.engine) {
          errors.push({
            field: `${prefix}.engine`,
            message: 'Database engine is required (postgresql, mysql, oracle)',
            code: 'MISSING_ENGINE'
          });
        }
        if (!resource.version) {
          errors.push({
            field: `${prefix}.version`,
            message: 'Database version is required',
            code: 'MISSING_VERSION'
          });
        }
        break;

      case 'object_storage':
        // Optional validation - object storage has sensible defaults
        break;
    }
  }

  private static validateDependencies(
    workflow: WorkflowDefinition,
    errors: ValidationError[]
  ): void {
    const { resources } = workflow.workflow;
    const resourceNames = new Set(resources.map(r => r.name));

    resources.forEach((resource, index) => {
      // Check if referenced resources exist
      if (resource.network && !resourceNames.has(resource.network)) {
        errors.push({
          field: `workflow.resources[${index}].network`,
          message: `Referenced network '${resource.network}' does not exist`,
          code: 'INVALID_REFERENCE'
        });
      }

      if (resource.cluster && !resourceNames.has(resource.cluster)) {
        errors.push({
          field: `workflow.resources[${index}].cluster`,
          message: `Referenced cluster '${resource.cluster}' does not exist`,
          code: 'INVALID_REFERENCE'
        });
      }
    });
  }
}
