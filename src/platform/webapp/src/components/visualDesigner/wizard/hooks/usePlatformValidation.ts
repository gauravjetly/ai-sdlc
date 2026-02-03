/**
 * Platform Validation Hook
 * Provides validation functions for platform layer configuration
 */

import { useCallback, useMemo } from 'react';
import {
  IAMConfig,
  IAMRole,
  ComputeConfig,
  DatabaseConfig,
  StorageConfig,
  PlatformLayerData,
  PlatformValidationResult,
  PlatformValidationError,
  PolicyDocument,
  TrustPolicy,
  CostEstimate,
  SecurityScore,
  SecurityFinding,
  CostBreakdown,
  getEC2Price,
  getRDSPrice,
  EBS_PRICING,
} from '../../../../types/platform';
import { NetworkLayerData, SubnetConfig } from '../../../../types/network';

// =============================================
// Constants
// =============================================

const HOURS_PER_MONTH = 730;
const EKS_CLUSTER_HOURLY = 0.10;
const S3_STANDARD_PER_GB = 0.023;
const EFS_STANDARD_PER_GB = 0.30;

// =============================================
// Hook Interface
// =============================================

export interface UsePlatformValidationResult {
  // Full validation
  validate: (config: PlatformLayerData, networkData?: NetworkLayerData) => PlatformValidationResult;

  // Component-level validation
  validateIAMConfig: (iam: IAMConfig) => PlatformValidationError[];
  validateIAMRole: (role: IAMRole) => PlatformValidationError[];
  validatePolicyDocument: (policy: PolicyDocument | TrustPolicy, policyName?: string) => PlatformValidationError[];
  validateComputeConfig: (compute: ComputeConfig, networkData?: NetworkLayerData, iam?: IAMConfig) => PlatformValidationError[];
  validateDatabaseConfig: (database: DatabaseConfig, networkData?: NetworkLayerData) => PlatformValidationError[];
  validateStorageConfig: (storage: StorageConfig) => PlatformValidationError[];

  // Cost estimation
  estimateCosts: (config: PlatformLayerData) => CostEstimate;

  // Security assessment
  assessSecurity: (config: PlatformLayerData) => SecurityScore;

  // Error helpers
  getErrorsForCategory: (errors: PlatformValidationError[], category: string) => PlatformValidationError[];
  getErrorsForResource: (errors: PlatformValidationError[], resourceId: string) => PlatformValidationError[];
  hasErrors: (errors: PlatformValidationError[]) => boolean;
}

// =============================================
// Hook Implementation
// =============================================

export function usePlatformValidation(): UsePlatformValidationResult {
  // -------------------------
  // Policy Validation
  // -------------------------

  const validatePolicyDocument = useCallback(
    (policy: PolicyDocument | TrustPolicy, policyName?: string): PlatformValidationError[] => {
      const errors: PlatformValidationError[] = [];
      const prefix = policyName ? `${policyName}: ` : '';

      // Check Version
      if (policy.Version !== '2012-10-17') {
        errors.push({
          code: 'IAM_INVALID_VERSION',
          message: `${prefix}Policy version must be "2012-10-17"`,
          severity: 'error',
          category: 'iam',
        });
      }

      // Check Statement exists
      if (!policy.Statement || !Array.isArray(policy.Statement) || policy.Statement.length === 0) {
        errors.push({
          code: 'IAM_MISSING_STATEMENT',
          message: `${prefix}Policy must have at least one statement`,
          severity: 'error',
          category: 'iam',
        });
        return errors;
      }

      // Validate each statement
      policy.Statement.forEach((stmt, index) => {
        const stmtPrefix = `${prefix}Statement ${index + 1}: `;

        // Check Effect
        if (stmt.Effect !== 'Allow' && stmt.Effect !== 'Deny') {
          errors.push({
            code: 'IAM_INVALID_EFFECT',
            message: `${stmtPrefix}Effect must be "Allow" or "Deny"`,
            severity: 'error',
            category: 'iam',
          });
        }

        // Check Action (for policy documents, not trust policies)
        if ('Action' in stmt && 'Resource' in stmt) {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];

          // Check for overly permissive actions
          if (actions.includes('*')) {
            errors.push({
              code: 'IAM_OVERLY_PERMISSIVE_ACTION',
              message: `${stmtPrefix}Using "*" for Action grants all permissions - consider restricting to specific actions`,
              severity: 'warning',
              category: 'security',
            });
          }

          // Check for service-wide permissions
          actions.forEach((action) => {
            if (typeof action === 'string' && action.endsWith(':*')) {
              errors.push({
                code: 'IAM_SERVICE_WILDCARD',
                message: `${stmtPrefix}Using "${action}" grants all ${action.split(':')[0]} permissions`,
                severity: 'warning',
                category: 'security',
              });
            }
          });

          // Check for overly permissive resources
          if (resources.includes('*')) {
            errors.push({
              code: 'IAM_OVERLY_PERMISSIVE_RESOURCE',
              message: `${stmtPrefix}Using "*" for Resource allows access to all resources - consider restricting`,
              severity: 'warning',
              category: 'security',
            });
          }
        }

        // Check Principal (for trust policies)
        if ('Principal' in stmt) {
          const principal = stmt.Principal;
          if (!principal || (typeof principal === 'object' && Object.keys(principal).length === 0)) {
            errors.push({
              code: 'IAM_MISSING_PRINCIPAL',
              message: `${stmtPrefix}Trust policy statement must have a Principal`,
              severity: 'error',
              category: 'iam',
            });
          }
        }
      });

      return errors;
    },
    []
  );

  // -------------------------
  // IAM Role Validation
  // -------------------------

  const validateIAMRole = useCallback(
    (role: IAMRole): PlatformValidationError[] => {
      const errors: PlatformValidationError[] = [];

      // Name validation
      if (!role.name || role.name.trim().length === 0) {
        errors.push({
          code: 'IAM_ROLE_NAME_REQUIRED',
          message: 'Role name is required',
          resourceId: role.id,
          resourceType: 'iam-role',
          severity: 'error',
          category: 'iam',
          fix: { step: 1, field: 'name' },
        });
      } else if (!/^[\w+=,.@-]+$/.test(role.name)) {
        errors.push({
          code: 'IAM_ROLE_NAME_INVALID',
          message: 'Role name contains invalid characters. Use alphanumeric characters, plus (+), equals (=), comma (,), period (.), at (@), and hyphen (-).',
          resourceId: role.id,
          resourceType: 'iam-role',
          severity: 'error',
          category: 'iam',
          fix: { step: 1, field: 'name' },
        });
      } else if (role.name.length > 64) {
        errors.push({
          code: 'IAM_ROLE_NAME_TOO_LONG',
          message: 'Role name must be 64 characters or less',
          resourceId: role.id,
          resourceType: 'iam-role',
          severity: 'error',
          category: 'iam',
          fix: { step: 1, field: 'name' },
        });
      }

      // Trust policy validation
      const trustPolicyErrors = validatePolicyDocument(role.assumeRolePolicy, `Role "${role.name}" trust policy`);
      errors.push(...trustPolicyErrors.map((e) => ({ ...e, resourceId: role.id, resourceType: 'iam-role' })));

      // Inline policies validation
      role.inlinePolicies.forEach((policy) => {
        const policyErrors = validatePolicyDocument(policy.document, `Role "${role.name}" inline policy "${policy.name}"`);
        errors.push(...policyErrors.map((e) => ({ ...e, resourceId: role.id, resourceType: 'iam-role' })));
      });

      // Max session duration validation
      if (role.maxSessionDuration < 3600 || role.maxSessionDuration > 43200) {
        errors.push({
          code: 'IAM_ROLE_SESSION_DURATION_INVALID',
          message: 'Max session duration must be between 3600 (1 hour) and 43200 (12 hours) seconds',
          resourceId: role.id,
          resourceType: 'iam-role',
          severity: 'error',
          category: 'iam',
        });
      }

      return errors;
    },
    [validatePolicyDocument]
  );

  // -------------------------
  // IAM Config Validation
  // -------------------------

  const validateIAMConfig = useCallback(
    (iam: IAMConfig): PlatformValidationError[] => {
      const errors: PlatformValidationError[] = [];

      // Validate each role
      iam.roles.forEach((role) => {
        errors.push(...validateIAMRole(role));
      });

      // Check for duplicate role names
      const roleNames = iam.roles.map((r) => r.name);
      const duplicates = roleNames.filter((name, index) => roleNames.indexOf(name) !== index);
      duplicates.forEach((dup) => {
        errors.push({
          code: 'IAM_DUPLICATE_ROLE_NAME',
          message: `Duplicate role name: "${dup}"`,
          severity: 'error',
          category: 'iam',
        });
      });

      // Validate instance profiles reference valid roles
      iam.instanceProfiles.forEach((profile) => {
        const roleExists = iam.roles.some((r) => r.id === profile.roleId);
        if (!roleExists) {
          errors.push({
            code: 'IAM_INSTANCE_PROFILE_INVALID_ROLE',
            message: `Instance profile "${profile.name}" references non-existent role`,
            resourceId: profile.id,
            resourceType: 'instance-profile',
            severity: 'error',
            category: 'iam',
          });
        }
      });

      return errors;
    },
    [validateIAMRole]
  );

  // -------------------------
  // Compute Config Validation
  // -------------------------

  const validateComputeConfig = useCallback(
    (compute: ComputeConfig, networkData?: NetworkLayerData, iam?: IAMConfig): PlatformValidationError[] => {
      const errors: PlatformValidationError[] = [];
      const subnets = networkData?.subnets || [];
      const securityGroups = networkData?.securityGroups || [];

      // Helper to check if subnet exists
      const subnetExists = (id: string) => subnets.some((s) => s.id === id);
      const sgExists = (id: string) => securityGroups.some((sg) => sg.id === id);
      const isPrivateSubnet = (id: string) => subnets.find((s) => s.id === id)?.isPublic === false;
      const roleExists = (id: string) => iam?.roles.some((r) => r.id === id);
      const instanceProfileExists = (id: string) => iam?.instanceProfiles.some((ip) => ip.id === id);

      // Validate EKS Clusters
      compute.eksClusters.forEach((cluster) => {
        if (!cluster.name || cluster.name.trim().length === 0) {
          errors.push({
            code: 'EKS_NAME_REQUIRED',
            message: 'EKS cluster name is required',
            resourceId: cluster.id,
            resourceType: 'eks-cluster',
            severity: 'error',
            category: 'compute',
            fix: { step: 2, field: 'name' },
          });
        }

        if (cluster.subnetIds.length < 2) {
          errors.push({
            code: 'EKS_INSUFFICIENT_SUBNETS',
            message: 'EKS cluster requires at least 2 subnets in different availability zones',
            resourceId: cluster.id,
            resourceType: 'eks-cluster',
            severity: 'error',
            category: 'compute',
            fix: { step: 2, field: 'subnets' },
          });
        }

        // Validate subnet references
        cluster.subnetIds.forEach((subnetId) => {
          if (!subnetExists(subnetId)) {
            errors.push({
              code: 'EKS_INVALID_SUBNET',
              message: `EKS cluster "${cluster.name}" references non-existent subnet`,
              resourceId: cluster.id,
              resourceType: 'eks-cluster',
              severity: 'error',
              category: 'compute',
            });
          }
        });

        // Recommend private subnets for control plane
        const hasPublicSubnets = cluster.subnetIds.some((id) => !isPrivateSubnet(id));
        if (hasPublicSubnets && !cluster.endpointPrivateAccess) {
          errors.push({
            code: 'EKS_PUBLIC_ENDPOINT_WARNING',
            message: `EKS cluster "${cluster.name}" has public endpoint access. Consider enabling private endpoint access for better security.`,
            resourceId: cluster.id,
            resourceType: 'eks-cluster',
            severity: 'warning',
            category: 'security',
          });
        }

        // Validate security group references
        cluster.securityGroupIds.forEach((sgId) => {
          if (!sgExists(sgId)) {
            errors.push({
              code: 'EKS_INVALID_SECURITY_GROUP',
              message: `EKS cluster "${cluster.name}" references non-existent security group`,
              resourceId: cluster.id,
              resourceType: 'eks-cluster',
              severity: 'error',
              category: 'compute',
            });
          }
        });

        // Validate IAM role reference
        if (cluster.roleId && !roleExists(cluster.roleId)) {
          errors.push({
            code: 'EKS_INVALID_ROLE',
            message: `EKS cluster "${cluster.name}" references non-existent IAM role`,
            resourceId: cluster.id,
            resourceType: 'eks-cluster',
            severity: 'error',
            category: 'compute',
          });
        }

        // Validate node groups
        cluster.nodeGroups.forEach((ng) => {
          if (ng.instanceTypes.length === 0) {
            errors.push({
              code: 'EKS_NODE_GROUP_NO_INSTANCE_TYPE',
              message: `Node group "${ng.name}" must have at least one instance type`,
              resourceId: ng.id,
              resourceType: 'eks-node-group',
              severity: 'error',
              category: 'compute',
            });
          }

          if (ng.scalingConfig.minSize > ng.scalingConfig.maxSize) {
            errors.push({
              code: 'EKS_NODE_GROUP_INVALID_SCALING',
              message: `Node group "${ng.name}" min size cannot exceed max size`,
              resourceId: ng.id,
              resourceType: 'eks-node-group',
              severity: 'error',
              category: 'compute',
            });
          }

          if (ng.scalingConfig.desiredSize < ng.scalingConfig.minSize ||
              ng.scalingConfig.desiredSize > ng.scalingConfig.maxSize) {
            errors.push({
              code: 'EKS_NODE_GROUP_DESIRED_OUT_OF_RANGE',
              message: `Node group "${ng.name}" desired size must be between min and max`,
              resourceId: ng.id,
              resourceType: 'eks-node-group',
              severity: 'error',
              category: 'compute',
            });
          }

          if (ng.roleId && !roleExists(ng.roleId)) {
            errors.push({
              code: 'EKS_NODE_GROUP_INVALID_ROLE',
              message: `Node group "${ng.name}" references non-existent IAM role`,
              resourceId: ng.id,
              resourceType: 'eks-node-group',
              severity: 'error',
              category: 'compute',
            });
          }
        });
      });

      // Validate EC2 Instances
      compute.ec2Instances.forEach((instance) => {
        if (!instance.name || instance.name.trim().length === 0) {
          errors.push({
            code: 'EC2_NAME_REQUIRED',
            message: 'EC2 instance name is required',
            resourceId: instance.id,
            resourceType: 'ec2-instance',
            severity: 'error',
            category: 'compute',
            fix: { step: 2, field: 'name' },
          });
        }

        if (!instance.instanceType) {
          errors.push({
            code: 'EC2_INSTANCE_TYPE_REQUIRED',
            message: `EC2 instance "${instance.name}" requires an instance type`,
            resourceId: instance.id,
            resourceType: 'ec2-instance',
            severity: 'error',
            category: 'compute',
          });
        }

        if (!instance.subnetId) {
          errors.push({
            code: 'EC2_SUBNET_REQUIRED',
            message: `EC2 instance "${instance.name}" requires a subnet`,
            resourceId: instance.id,
            resourceType: 'ec2-instance',
            severity: 'error',
            category: 'compute',
          });
        } else if (!subnetExists(instance.subnetId)) {
          errors.push({
            code: 'EC2_INVALID_SUBNET',
            message: `EC2 instance "${instance.name}" references non-existent subnet`,
            resourceId: instance.id,
            resourceType: 'ec2-instance',
            severity: 'error',
            category: 'compute',
          });
        } else if (!isPrivateSubnet(instance.subnetId)) {
          errors.push({
            code: 'EC2_PUBLIC_SUBNET_WARNING',
            message: `EC2 instance "${instance.name}" is in a public subnet. Consider using a private subnet for better security.`,
            resourceId: instance.id,
            resourceType: 'ec2-instance',
            severity: 'warning',
            category: 'security',
          });
        }

        // Validate security groups
        instance.securityGroupIds.forEach((sgId) => {
          if (!sgExists(sgId)) {
            errors.push({
              code: 'EC2_INVALID_SECURITY_GROUP',
              message: `EC2 instance "${instance.name}" references non-existent security group`,
              resourceId: instance.id,
              resourceType: 'ec2-instance',
              severity: 'error',
              category: 'compute',
            });
          }
        });

        // Validate instance profile
        if (instance.instanceProfileId && !instanceProfileExists(instance.instanceProfileId)) {
          errors.push({
            code: 'EC2_INVALID_INSTANCE_PROFILE',
            message: `EC2 instance "${instance.name}" references non-existent instance profile`,
            resourceId: instance.id,
            resourceType: 'ec2-instance',
            severity: 'error',
            category: 'compute',
          });
        }

        // Check EBS encryption
        if (!instance.rootVolume.encrypted) {
          errors.push({
            code: 'EC2_ROOT_VOLUME_NOT_ENCRYPTED',
            message: `EC2 instance "${instance.name}" root volume is not encrypted`,
            resourceId: instance.id,
            resourceType: 'ec2-instance',
            severity: 'warning',
            category: 'security',
          });
        }
      });

      // Validate Auto Scaling Groups
      compute.autoScalingGroups.forEach((asg) => {
        if (!asg.name || asg.name.trim().length === 0) {
          errors.push({
            code: 'ASG_NAME_REQUIRED',
            message: 'Auto Scaling Group name is required',
            resourceId: asg.id,
            resourceType: 'asg',
            severity: 'error',
            category: 'compute',
          });
        }

        if (!asg.launchTemplateId) {
          errors.push({
            code: 'ASG_LAUNCH_TEMPLATE_REQUIRED',
            message: `ASG "${asg.name}" requires a launch template`,
            resourceId: asg.id,
            resourceType: 'asg',
            severity: 'error',
            category: 'compute',
          });
        } else {
          const ltExists = compute.launchTemplates.some((lt) => lt.id === asg.launchTemplateId);
          if (!ltExists) {
            errors.push({
              code: 'ASG_INVALID_LAUNCH_TEMPLATE',
              message: `ASG "${asg.name}" references non-existent launch template`,
              resourceId: asg.id,
              resourceType: 'asg',
              severity: 'error',
              category: 'compute',
            });
          }
        }

        if (asg.subnetIds.length === 0) {
          errors.push({
            code: 'ASG_SUBNETS_REQUIRED',
            message: `ASG "${asg.name}" requires at least one subnet`,
            resourceId: asg.id,
            resourceType: 'asg',
            severity: 'error',
            category: 'compute',
          });
        }

        if (asg.scalingConfig.minSize > asg.scalingConfig.maxSize) {
          errors.push({
            code: 'ASG_INVALID_SCALING',
            message: `ASG "${asg.name}" min size cannot exceed max size`,
            resourceId: asg.id,
            resourceType: 'asg',
            severity: 'error',
            category: 'compute',
          });
        }
      });

      return errors;
    },
    []
  );

  // -------------------------
  // Database Config Validation
  // -------------------------

  const validateDatabaseConfig = useCallback(
    (database: DatabaseConfig, networkData?: NetworkLayerData): PlatformValidationError[] => {
      const errors: PlatformValidationError[] = [];
      const subnets = networkData?.subnets || [];
      const securityGroups = networkData?.securityGroups || [];

      const subnetExists = (id: string) => subnets.some((s) => s.id === id);
      const sgExists = (id: string) => securityGroups.some((sg) => sg.id === id);
      const isPrivateSubnet = (id: string) => subnets.find((s) => s.id === id)?.isPublic === false;
      const subnetGroupExists = (id: string) => database.subnetGroups.some((sg) => sg.id === id);

      // Validate DB Subnet Groups
      database.subnetGroups.forEach((group) => {
        if (!group.name || group.name.trim().length === 0) {
          errors.push({
            code: 'DB_SUBNET_GROUP_NAME_REQUIRED',
            message: 'DB subnet group name is required',
            resourceId: group.id,
            resourceType: 'db-subnet-group',
            severity: 'error',
            category: 'database',
          });
        }

        if (group.subnetIds.length < 2) {
          errors.push({
            code: 'DB_SUBNET_GROUP_INSUFFICIENT_SUBNETS',
            message: `DB subnet group "${group.name}" requires at least 2 subnets in different availability zones`,
            resourceId: group.id,
            resourceType: 'db-subnet-group',
            severity: 'error',
            category: 'database',
          });
        }

        // Check that all subnets exist and are private
        group.subnetIds.forEach((subnetId) => {
          if (!subnetExists(subnetId)) {
            errors.push({
              code: 'DB_SUBNET_GROUP_INVALID_SUBNET',
              message: `DB subnet group "${group.name}" references non-existent subnet`,
              resourceId: group.id,
              resourceType: 'db-subnet-group',
              severity: 'error',
              category: 'database',
            });
          } else if (!isPrivateSubnet(subnetId)) {
            errors.push({
              code: 'DB_SUBNET_GROUP_PUBLIC_SUBNET',
              message: `DB subnet group "${group.name}" should only contain private subnets`,
              resourceId: group.id,
              resourceType: 'db-subnet-group',
              severity: 'warning',
              category: 'security',
            });
          }
        });

        // Check that subnets are in different AZs
        const subnetAZs = group.subnetIds
          .map((id) => subnets.find((s) => s.id === id)?.availabilityZone)
          .filter(Boolean);
        const uniqueAZs = new Set(subnetAZs);
        if (uniqueAZs.size < 2) {
          errors.push({
            code: 'DB_SUBNET_GROUP_SINGLE_AZ',
            message: `DB subnet group "${group.name}" should have subnets in at least 2 availability zones for high availability`,
            resourceId: group.id,
            resourceType: 'db-subnet-group',
            severity: 'warning',
            category: 'database',
          });
        }
      });

      // Validate RDS Instances
      database.rdsInstances.forEach((db) => {
        if (!db.identifier || db.identifier.trim().length === 0) {
          errors.push({
            code: 'RDS_IDENTIFIER_REQUIRED',
            message: 'RDS instance identifier is required',
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'error',
            category: 'database',
            fix: { step: 3, field: 'identifier' },
          });
        } else if (!/^[a-z][a-z0-9-]*$/.test(db.identifier)) {
          errors.push({
            code: 'RDS_IDENTIFIER_INVALID',
            message: 'RDS identifier must start with a letter, contain only lowercase letters, numbers, and hyphens',
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'error',
            category: 'database',
          });
        }

        if (!db.instanceClass) {
          errors.push({
            code: 'RDS_INSTANCE_CLASS_REQUIRED',
            message: `RDS instance "${db.identifier}" requires an instance class`,
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'error',
            category: 'database',
          });
        }

        if (!db.subnetGroupId) {
          errors.push({
            code: 'RDS_SUBNET_GROUP_REQUIRED',
            message: `RDS instance "${db.identifier}" requires a DB subnet group`,
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'error',
            category: 'database',
          });
        } else if (!subnetGroupExists(db.subnetGroupId)) {
          errors.push({
            code: 'RDS_INVALID_SUBNET_GROUP',
            message: `RDS instance "${db.identifier}" references non-existent subnet group`,
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'error',
            category: 'database',
          });
        }

        // Validate security groups
        db.securityGroupIds.forEach((sgId) => {
          if (!sgExists(sgId)) {
            errors.push({
              code: 'RDS_INVALID_SECURITY_GROUP',
              message: `RDS instance "${db.identifier}" references non-existent security group`,
              resourceId: db.id,
              resourceType: 'rds-instance',
              severity: 'error',
              category: 'database',
            });
          }
        });

        // Storage validation
        if (db.allocatedStorage < 20) {
          errors.push({
            code: 'RDS_STORAGE_TOO_SMALL',
            message: `RDS instance "${db.identifier}" storage must be at least 20 GB`,
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'error',
            category: 'database',
          });
        }

        // Backup retention validation
        if (db.backupRetentionPeriod < 7) {
          errors.push({
            code: 'RDS_BACKUP_RETENTION_TOO_SHORT',
            message: `RDS instance "${db.identifier}" backup retention should be at least 7 days for production workloads`,
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'error',
            category: 'database',
            fix: { step: 3, field: 'backupRetention' },
          });
        }

        // Encryption validation
        if (!db.encrypted) {
          errors.push({
            code: 'RDS_NOT_ENCRYPTED',
            message: `RDS instance "${db.identifier}" storage is not encrypted`,
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'warning',
            category: 'security',
          });
        }

        // Public accessibility warning
        if (db.publiclyAccessible) {
          errors.push({
            code: 'RDS_PUBLICLY_ACCESSIBLE',
            message: `RDS instance "${db.identifier}" is publicly accessible. This is a security risk.`,
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'error',
            category: 'security',
          });
        }

        // Multi-AZ recommendation for production
        if (!db.multiAZ) {
          errors.push({
            code: 'RDS_NO_MULTI_AZ',
            message: `RDS instance "${db.identifier}" does not have Multi-AZ enabled. Consider enabling for high availability.`,
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'info',
            category: 'database',
          });
        }

        // Deletion protection recommendation
        if (!db.deletionProtection) {
          errors.push({
            code: 'RDS_NO_DELETION_PROTECTION',
            message: `RDS instance "${db.identifier}" does not have deletion protection enabled`,
            resourceId: db.id,
            resourceType: 'rds-instance',
            severity: 'info',
            category: 'database',
          });
        }
      });

      return errors;
    },
    []
  );

  // -------------------------
  // Storage Config Validation
  // -------------------------

  const validateStorageConfig = useCallback((storage: StorageConfig): PlatformValidationError[] => {
    const errors: PlatformValidationError[] = [];

    // Validate S3 Buckets
    storage.s3Buckets.forEach((bucket) => {
      // Name validation
      if (!bucket.name || bucket.name.trim().length === 0) {
        errors.push({
          code: 'S3_NAME_REQUIRED',
          message: 'S3 bucket name is required',
          resourceId: bucket.id,
          resourceType: 's3-bucket',
          severity: 'error',
          category: 'storage',
          fix: { step: 4, field: 'name' },
        });
      } else {
        // S3 bucket naming rules
        if (bucket.name.length < 3 || bucket.name.length > 63) {
          errors.push({
            code: 'S3_NAME_LENGTH',
            message: 'S3 bucket name must be between 3 and 63 characters',
            resourceId: bucket.id,
            resourceType: 's3-bucket',
            severity: 'error',
            category: 'storage',
          });
        }
        if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucket.name)) {
          errors.push({
            code: 'S3_NAME_INVALID',
            message: 'S3 bucket name must start and end with lowercase letter or number, and can only contain lowercase letters, numbers, hyphens, and periods',
            resourceId: bucket.id,
            resourceType: 's3-bucket',
            severity: 'error',
            category: 'storage',
          });
        }
        if (bucket.name.includes('..')) {
          errors.push({
            code: 'S3_NAME_CONSECUTIVE_PERIODS',
            message: 'S3 bucket name cannot contain consecutive periods',
            resourceId: bucket.id,
            resourceType: 's3-bucket',
            severity: 'error',
            category: 'storage',
          });
        }
      }

      // Versioning recommendation
      if (!bucket.versioningEnabled) {
        errors.push({
          code: 'S3_VERSIONING_DISABLED',
          message: `S3 bucket "${bucket.name}" does not have versioning enabled. This is recommended for data protection.`,
          resourceId: bucket.id,
          resourceType: 's3-bucket',
          severity: 'warning',
          category: 'storage',
        });
      }

      // Encryption validation
      if (bucket.encryptionType === 'NONE') {
        errors.push({
          code: 'S3_NOT_ENCRYPTED',
          message: `S3 bucket "${bucket.name}" does not have encryption enabled`,
          resourceId: bucket.id,
          resourceType: 's3-bucket',
          severity: 'warning',
          category: 'security',
        });
      }

      // Public access block validation
      const pab = bucket.publicAccessBlock;
      if (!pab.blockPublicAcls || !pab.blockPublicPolicy || !pab.ignorePublicAcls || !pab.restrictPublicBuckets) {
        errors.push({
          code: 'S3_PUBLIC_ACCESS_ALLOWED',
          message: `S3 bucket "${bucket.name}" allows some form of public access. Ensure this is intentional.`,
          resourceId: bucket.id,
          resourceType: 's3-bucket',
          severity: 'warning',
          category: 'security',
        });
      }
    });

    // Validate EBS Volumes
    storage.ebsVolumes.forEach((volume) => {
      if (!volume.name || volume.name.trim().length === 0) {
        errors.push({
          code: 'EBS_NAME_REQUIRED',
          message: 'EBS volume name is required',
          resourceId: volume.id,
          resourceType: 'ebs-volume',
          severity: 'error',
          category: 'storage',
        });
      }

      if (volume.size < 1) {
        errors.push({
          code: 'EBS_SIZE_TOO_SMALL',
          message: `EBS volume "${volume.name}" must be at least 1 GB`,
          resourceId: volume.id,
          resourceType: 'ebs-volume',
          severity: 'error',
          category: 'storage',
        });
      }

      if (!volume.encrypted) {
        errors.push({
          code: 'EBS_NOT_ENCRYPTED',
          message: `EBS volume "${volume.name}" is not encrypted`,
          resourceId: volume.id,
          resourceType: 'ebs-volume',
          severity: 'warning',
          category: 'security',
        });
      }

      // IOPS validation for io1/io2
      if ((volume.volumeType === 'io1' || volume.volumeType === 'io2') && !volume.iops) {
        errors.push({
          code: 'EBS_IOPS_REQUIRED',
          message: `EBS volume "${volume.name}" with ${volume.volumeType} type requires IOPS to be specified`,
          resourceId: volume.id,
          resourceType: 'ebs-volume',
          severity: 'error',
          category: 'storage',
        });
      }
    });

    // Validate EFS File Systems
    storage.efsFileSystems.forEach((efs) => {
      if (!efs.name || efs.name.trim().length === 0) {
        errors.push({
          code: 'EFS_NAME_REQUIRED',
          message: 'EFS file system name is required',
          resourceId: efs.id,
          resourceType: 'efs-filesystem',
          severity: 'error',
          category: 'storage',
        });
      }

      if (efs.mountTargets.length === 0) {
        errors.push({
          code: 'EFS_NO_MOUNT_TARGETS',
          message: `EFS file system "${efs.name}" has no mount targets configured`,
          resourceId: efs.id,
          resourceType: 'efs-filesystem',
          severity: 'warning',
          category: 'storage',
        });
      }

      if (!efs.encrypted) {
        errors.push({
          code: 'EFS_NOT_ENCRYPTED',
          message: `EFS file system "${efs.name}" is not encrypted at rest`,
          resourceId: efs.id,
          resourceType: 'efs-filesystem',
          severity: 'warning',
          category: 'security',
        });
      }

      // Provisioned throughput validation
      if (efs.throughputMode === 'provisioned' && !efs.provisionedThroughputInMibps) {
        errors.push({
          code: 'EFS_PROVISIONED_THROUGHPUT_REQUIRED',
          message: `EFS file system "${efs.name}" with provisioned throughput mode requires a throughput value`,
          resourceId: efs.id,
          resourceType: 'efs-filesystem',
          severity: 'error',
          category: 'storage',
        });
      }
    });

    return errors;
  }, []);

  // -------------------------
  // Cost Estimation
  // -------------------------

  const estimateCosts = useCallback((config: PlatformLayerData): CostEstimate => {
    const byService: Record<string, number> = {
      iam: 0,
      compute: 0,
      database: 0,
      storage: 0,
    };
    const byResource: CostBreakdown[] = [];

    // IAM is free
    byService.iam = 0;

    // Compute costs
    // EKS Clusters
    config.compute.eksClusters.forEach((cluster) => {
      const clusterCost = EKS_CLUSTER_HOURLY * HOURS_PER_MONTH;
      byResource.push({
        resourceType: 'eks-cluster',
        resourceId: cluster.id,
        resourceName: cluster.name,
        monthlyCost: clusterCost,
        details: `EKS cluster at $${EKS_CLUSTER_HOURLY}/hour`,
      });
      byService.compute += clusterCost;

      // Node groups
      cluster.nodeGroups.forEach((ng) => {
        const instancePrice = getEC2Price(ng.instanceTypes[0] || 't3.medium');
        const ngCost = instancePrice * ng.scalingConfig.desiredSize * HOURS_PER_MONTH;
        byResource.push({
          resourceType: 'eks-node-group',
          resourceId: ng.id,
          resourceName: ng.name,
          monthlyCost: ngCost,
          details: `${ng.scalingConfig.desiredSize}x ${ng.instanceTypes[0]} at $${instancePrice}/hour`,
        });
        byService.compute += ngCost;
      });
    });

    // EC2 Instances
    config.compute.ec2Instances.forEach((instance) => {
      const instancePrice = getEC2Price(instance.instanceType);
      const instanceCost = instancePrice * HOURS_PER_MONTH;
      byResource.push({
        resourceType: 'ec2-instance',
        resourceId: instance.id,
        resourceName: instance.name,
        monthlyCost: instanceCost,
        details: `${instance.instanceType} at $${instancePrice}/hour`,
      });
      byService.compute += instanceCost;

      // Root volume
      const rootVolCost = instance.rootVolume.size * (EBS_PRICING[instance.rootVolume.volumeType] || 0.10);
      byService.storage += rootVolCost;
    });

    // Auto Scaling Groups
    config.compute.autoScalingGroups.forEach((asg) => {
      const lt = config.compute.launchTemplates.find((t) => t.id === asg.launchTemplateId);
      if (lt) {
        const instancePrice = getEC2Price(lt.instanceType);
        const asgCost = instancePrice * asg.scalingConfig.desiredSize * HOURS_PER_MONTH;
        byResource.push({
          resourceType: 'asg',
          resourceId: asg.id,
          resourceName: asg.name,
          monthlyCost: asgCost,
          details: `${asg.scalingConfig.desiredSize}x ${lt.instanceType} at $${instancePrice}/hour`,
        });
        byService.compute += asgCost;
      }
    });

    // Database costs
    config.database.rdsInstances.forEach((db) => {
      const instancePrice = getRDSPrice(db.instanceClass);
      let dbCost = instancePrice * HOURS_PER_MONTH;
      if (db.multiAZ) {
        dbCost *= 2;
      }

      // Storage cost
      const storageCost = db.allocatedStorage * 0.115;
      dbCost += storageCost;

      byResource.push({
        resourceType: 'rds-instance',
        resourceId: db.id,
        resourceName: db.identifier,
        monthlyCost: dbCost,
        details: `${db.instanceClass} ${db.multiAZ ? '(Multi-AZ)' : ''} + ${db.allocatedStorage}GB storage`,
      });
      byService.database += dbCost;
    });

    // Storage costs
    // S3 (estimated based on assumed 100GB)
    config.storage.s3Buckets.forEach((bucket) => {
      const s3Cost = 100 * S3_STANDARD_PER_GB; // Estimate 100GB
      byResource.push({
        resourceType: 's3-bucket',
        resourceId: bucket.id,
        resourceName: bucket.name,
        monthlyCost: s3Cost,
        details: 'Estimated 100GB at S3 Standard pricing',
      });
      byService.storage += s3Cost;
    });

    // EBS Volumes
    config.storage.ebsVolumes.forEach((volume) => {
      const volCost = volume.size * (EBS_PRICING[volume.volumeType] || 0.10);
      byResource.push({
        resourceType: 'ebs-volume',
        resourceId: volume.id,
        resourceName: volume.name,
        monthlyCost: volCost,
        details: `${volume.size}GB ${volume.volumeType}`,
      });
      byService.storage += volCost;
    });

    // EFS (estimated based on assumed 50GB)
    config.storage.efsFileSystems.forEach((efs) => {
      const efsCost = 50 * EFS_STANDARD_PER_GB; // Estimate 50GB
      byResource.push({
        resourceType: 'efs-filesystem',
        resourceId: efs.id,
        resourceName: efs.name,
        monthlyCost: efsCost,
        details: 'Estimated 50GB at EFS Standard pricing',
      });
      byService.storage += efsCost;
    });

    const total = Object.values(byService).reduce((sum, val) => sum + val, 0);

    return {
      monthly: {
        total: Math.round(total * 100) / 100,
        byService: Object.fromEntries(
          Object.entries(byService).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
        byResource: byResource.map((r) => ({
          ...r,
          monthlyCost: Math.round(r.monthlyCost * 100) / 100,
        })),
      },
      currency: 'USD',
    };
  }, []);

  // -------------------------
  // Security Assessment
  // -------------------------

  const assessSecurity = useCallback((config: PlatformLayerData): SecurityScore => {
    const findings: SecurityFinding[] = [];
    const categoryScores = {
      iam: 100,
      encryption: 100,
      networkIsolation: 100,
      backupRecovery: 100,
    };

    // IAM Security
    config.iam.roles.forEach((role) => {
      role.inlinePolicies.forEach((policy) => {
        policy.document.Statement.forEach((stmt) => {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];

          if (actions.includes('*') && resources.includes('*')) {
            categoryScores.iam -= 30;
            findings.push({
              id: `iam-${role.id}-admin`,
              title: 'Administrator Access Policy',
              description: `Role "${role.name}" has a policy with full administrator access`,
              severity: 'critical',
              resourceId: role.id,
              recommendation: 'Follow least privilege principle - restrict to specific actions and resources',
            });
          } else if (actions.includes('*')) {
            categoryScores.iam -= 15;
            findings.push({
              id: `iam-${role.id}-all-actions`,
              title: 'Overly Permissive Actions',
              description: `Role "${role.name}" allows all actions`,
              severity: 'high',
              resourceId: role.id,
              recommendation: 'Restrict to specific actions needed for the use case',
            });
          }
        });
      });
    });

    // Encryption checks
    config.database.rdsInstances.forEach((db) => {
      if (!db.encrypted) {
        categoryScores.encryption -= 20;
        findings.push({
          id: `rds-${db.id}-unencrypted`,
          title: 'Unencrypted Database',
          description: `RDS instance "${db.identifier}" is not encrypted`,
          severity: 'high',
          resourceId: db.id,
          recommendation: 'Enable encryption at rest for the database',
        });
      }
    });

    config.storage.s3Buckets.forEach((bucket) => {
      if (bucket.encryptionType === 'NONE') {
        categoryScores.encryption -= 15;
        findings.push({
          id: `s3-${bucket.id}-unencrypted`,
          title: 'Unencrypted S3 Bucket',
          description: `S3 bucket "${bucket.name}" is not encrypted`,
          severity: 'medium',
          resourceId: bucket.id,
          recommendation: 'Enable server-side encryption (SSE-S3 or SSE-KMS)',
        });
      }
    });

    config.storage.ebsVolumes.forEach((volume) => {
      if (!volume.encrypted) {
        categoryScores.encryption -= 10;
        findings.push({
          id: `ebs-${volume.id}-unencrypted`,
          title: 'Unencrypted EBS Volume',
          description: `EBS volume "${volume.name}" is not encrypted`,
          severity: 'medium',
          resourceId: volume.id,
          recommendation: 'Enable encryption for the EBS volume',
        });
      }
    });

    // Network isolation
    config.database.rdsInstances.forEach((db) => {
      if (db.publiclyAccessible) {
        categoryScores.networkIsolation -= 30;
        findings.push({
          id: `rds-${db.id}-public`,
          title: 'Publicly Accessible Database',
          description: `RDS instance "${db.identifier}" is publicly accessible`,
          severity: 'critical',
          resourceId: db.id,
          recommendation: 'Disable public accessibility and access through VPC',
        });
      }
    });

    // Backup/Recovery
    config.database.rdsInstances.forEach((db) => {
      if (db.backupRetentionPeriod < 7) {
        categoryScores.backupRecovery -= 20;
        findings.push({
          id: `rds-${db.id}-backup`,
          title: 'Insufficient Backup Retention',
          description: `RDS instance "${db.identifier}" has backup retention of ${db.backupRetentionPeriod} days`,
          severity: 'medium',
          resourceId: db.id,
          recommendation: 'Increase backup retention to at least 7 days',
        });
      }
    });

    // Ensure scores don't go below 0
    Object.keys(categoryScores).forEach((key) => {
      const k = key as keyof typeof categoryScores;
      if (categoryScores[k] < 0) categoryScores[k] = 0;
    });

    const overall = Math.round(
      (categoryScores.iam + categoryScores.encryption + categoryScores.networkIsolation + categoryScores.backupRecovery) / 4
    );

    return {
      overall,
      categories: categoryScores,
      findings: findings.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
    };
  }, []);

  // -------------------------
  // Full Validation
  // -------------------------

  const validate = useCallback(
    (config: PlatformLayerData, networkData?: NetworkLayerData): PlatformValidationResult => {
      const allErrors: PlatformValidationError[] = [];

      // Run all validations
      allErrors.push(...validateIAMConfig(config.iam));
      allErrors.push(...validateComputeConfig(config.compute, networkData, config.iam));
      allErrors.push(...validateDatabaseConfig(config.database, networkData));
      allErrors.push(...validateStorageConfig(config.storage));

      // Separate by severity
      const errors = allErrors.filter((e) => e.severity === 'error');
      const warnings = allErrors.filter((e) => e.severity === 'warning');
      const info = allErrors.filter((e) => e.severity === 'info');

      // Get cost estimate
      const costEstimate = estimateCosts(config);

      // Get security score
      const securityScore = assessSecurity(config);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        info,
        costEstimate,
        securityScore,
      };
    },
    [validateIAMConfig, validateComputeConfig, validateDatabaseConfig, validateStorageConfig, estimateCosts, assessSecurity]
  );

  // -------------------------
  // Helper Functions
  // -------------------------

  const getErrorsForCategory = useCallback(
    (errors: PlatformValidationError[], category: string): PlatformValidationError[] => {
      return errors.filter((e) => e.category === category);
    },
    []
  );

  const getErrorsForResource = useCallback(
    (errors: PlatformValidationError[], resourceId: string): PlatformValidationError[] => {
      return errors.filter((e) => e.resourceId === resourceId);
    },
    []
  );

  const hasErrors = useCallback((errors: PlatformValidationError[]): boolean => {
    return errors.some((e) => e.severity === 'error');
  }, []);

  // -------------------------
  // Return Hook Value
  // -------------------------

  return useMemo(
    () => ({
      validate,
      validateIAMConfig,
      validateIAMRole,
      validatePolicyDocument,
      validateComputeConfig,
      validateDatabaseConfig,
      validateStorageConfig,
      estimateCosts,
      assessSecurity,
      getErrorsForCategory,
      getErrorsForResource,
      hasErrors,
    }),
    [
      validate,
      validateIAMConfig,
      validateIAMRole,
      validatePolicyDocument,
      validateComputeConfig,
      validateDatabaseConfig,
      validateStorageConfig,
      estimateCosts,
      assessSecurity,
      getErrorsForCategory,
      getErrorsForResource,
      hasErrors,
    ]
  );
}

export default usePlatformValidation;
