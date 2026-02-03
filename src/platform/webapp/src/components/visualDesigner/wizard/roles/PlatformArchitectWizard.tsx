/**
 * PlatformArchitectWizard Component
 * Orchestrates the 5-step platform configuration wizard
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { v4 as uuid } from 'uuid';
import {
  IAMConfig,
  ComputeConfig,
  DatabaseConfig,
  StorageConfig,
  PlatformLayerData,
  PlatformValidationResult,
  PlatformValidationError,
  DEFAULT_IAM_CONFIG,
  DEFAULT_COMPUTE_CONFIG,
  DEFAULT_DATABASE_CONFIG,
  DEFAULT_STORAGE_CONFIG,
} from '../../../../types/platform';
import { NetworkLayerData } from '../../../../types/network';
import {
  IAMRolesPoliciesStep,
  ComputeServicesStep,
  DatabaseServicesStep,
  StorageServicesStep,
  PlatformValidationStep,
} from '../steps/platform';
import { StepActions } from '../shared';
import { usePlatformValidation } from '../hooks/usePlatformValidation';
import { useDesignWizard } from '../../../../contexts/DesignWizardContext';

export interface PlatformArchitectWizardProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  onSave?: () => Promise<void>;
}

export function PlatformArchitectWizard({
  step,
  onStepChange,
  onComplete,
  onSave,
}: PlatformArchitectWizardProps) {
  const {
    region,
    layers,
    updateLayerData,
    addNode,
    isLoading,
    isSaving,
    isDeploying,
  } = useDesignWizard();

  const {
    validate,
    validateIAMConfig,
    validateComputeConfig,
    validateDatabaseConfig,
    validateStorageConfig,
  } = usePlatformValidation();

  // Get network layer data for cross-layer validation
  const networkData = layers.network.data?.config as NetworkLayerData | undefined;

  // Initialize state from context or defaults
  const existingData = layers.platform.data?.config as PlatformLayerData | undefined;

  const [iam, setIAM] = useState<IAMConfig>(
    existingData?.iam || { ...DEFAULT_IAM_CONFIG }
  );
  const [compute, setCompute] = useState<ComputeConfig>(
    existingData?.compute || { ...DEFAULT_COMPUTE_CONFIG }
  );
  const [database, setDatabase] = useState<DatabaseConfig>(
    existingData?.database || { ...DEFAULT_DATABASE_CONFIG }
  );
  const [storage, setStorage] = useState<StorageConfig>(
    existingData?.storage || { ...DEFAULT_STORAGE_CONFIG }
  );
  const [stepErrors, setStepErrors] = useState<PlatformValidationError[]>([]);
  const [validationResult, setValidationResult] = useState<PlatformValidationResult | null>(null);

  // Persist state to context when it changes
  useEffect(() => {
    const platformData: PlatformLayerData = {
      iam,
      compute,
      database,
      storage,
      validationResult: validationResult || undefined,
    };

    updateLayerData('platform', {
      config: platformData,
      nodes: [],
      edges: [],
    });
  }, [iam, compute, database, storage, validationResult, updateLayerData]);

  // Validate current step
  const validateStep = useCallback((): PlatformValidationError[] => {
    let errors: PlatformValidationError[] = [];

    switch (step) {
      case 1:
        errors = validateIAMConfig(iam);
        break;
      case 2:
        errors = validateComputeConfig(compute, networkData, iam);
        break;
      case 3:
        errors = validateDatabaseConfig(database, networkData);
        break;
      case 4:
        errors = validateStorageConfig(storage);
        break;
      case 5:
        const result = validate({ iam, compute, database, storage }, networkData);
        errors = [...result.errors, ...result.warnings];
        break;
    }

    setStepErrors(errors);
    return errors;
  }, [step, iam, compute, database, storage, networkData, validate, validateIAMConfig, validateComputeConfig, validateDatabaseConfig, validateStorageConfig]);

  // Handle next step
  const handleNext = useCallback(() => {
    const errors = validateStep();
    const criticalErrors = errors.filter((e) => e.severity === 'error');

    if (criticalErrors.length > 0) {
      return; // Don't advance with errors
    }

    if (step < 5) {
      onStepChange(step + 1);
    } else if (step === 5 && validationResult?.isValid) {
      // Complete the wizard - generate nodes
      generatePlatformNodes();
      if (onComplete) {
        onComplete();
      }
    }
  }, [step, validateStep, onStepChange, validationResult, onComplete]);

  // Handle back step
  const handleBack = useCallback(() => {
    if (step > 1) {
      onStepChange(step - 1);
    }
  }, [step, onStepChange]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (onSave) {
      await onSave();
    }
  }, [onSave]);

  // Generate ReactFlow nodes from configuration
  const generatePlatformNodes = useCallback(() => {
    // IAM Roles
    iam.roles.forEach((role, i) => {
      addNode({
        id: `iam-role-${role.id}`,
        type: 'iamRoleNode',
        position: { x: 50, y: 50 + i * 100 },
        data: {
          name: role.name,
          description: role.description,
          managedPolicies: role.managedPolicies.length,
          inlinePolicies: role.inlinePolicies.length,
        },
        layer: 'platform',
      });
    });

    // EKS Clusters
    compute.eksClusters.forEach((cluster, i) => {
      addNode({
        id: `eks-${cluster.id}`,
        type: 'eksClusterNode',
        position: { x: 300, y: 50 + i * 180 },
        data: {
          name: cluster.name,
          version: cluster.version,
          nodeGroupCount: cluster.nodeGroups.length,
          subnetCount: cluster.subnetIds.length,
        },
        layer: 'platform',
        width: 200,
        height: 150,
      });

      // Node groups as children
      cluster.nodeGroups.forEach((ng, j) => {
        addNode({
          id: `eks-ng-${ng.id}`,
          type: 'eksNodeGroupNode',
          position: { x: 20, y: 50 + j * 50 },
          data: {
            name: ng.name,
            instanceTypes: ng.instanceTypes,
            desiredSize: ng.scalingConfig.desiredSize,
          },
          layer: 'platform',
          parentId: `eks-${cluster.id}`,
        });
      });
    });

    // EC2 Instances
    compute.ec2Instances.forEach((instance, i) => {
      addNode({
        id: `ec2-${instance.id}`,
        type: 'ec2InstanceNode',
        position: { x: 550, y: 50 + i * 100 },
        data: {
          name: instance.name,
          instanceType: instance.instanceType,
          hasInstanceProfile: !!instance.instanceProfileId,
        },
        layer: 'platform',
      });
    });

    // RDS Instances
    database.rdsInstances.forEach((db, i) => {
      addNode({
        id: `rds-${db.id}`,
        type: 'rdsNode',
        position: { x: 800, y: 50 + i * 120 },
        data: {
          identifier: db.identifier,
          engine: db.engine,
          instanceClass: db.instanceClass,
          multiAZ: db.multiAZ,
          encrypted: db.encrypted,
        },
        layer: 'platform',
      });
    });

    // S3 Buckets
    storage.s3Buckets.forEach((bucket, i) => {
      addNode({
        id: `s3-${bucket.id}`,
        type: 's3BucketNode',
        position: { x: 1050, y: 50 + i * 80 },
        data: {
          name: bucket.name,
          encrypted: bucket.encryptionType !== 'NONE',
          versioning: bucket.versioningEnabled,
        },
        layer: 'platform',
      });
    });

    // EFS File Systems
    storage.efsFileSystems.forEach((efs, i) => {
      addNode({
        id: `efs-${efs.id}`,
        type: 'efsNode',
        position: { x: 1050, y: 300 + i * 80 },
        data: {
          name: efs.name,
          performanceMode: efs.performanceMode,
          encrypted: efs.encrypted,
          mountTargetCount: efs.mountTargets.length,
        },
        layer: 'platform',
      });
    });

    // EBS Volumes
    storage.ebsVolumes.forEach((vol, i) => {
      addNode({
        id: `ebs-${vol.id}`,
        type: 'ebsVolumeNode',
        position: { x: 1050, y: 500 + i * 60 },
        data: {
          name: vol.name,
          volumeType: vol.volumeType,
          size: vol.size,
          encrypted: vol.encrypted,
        },
        layer: 'platform',
      });
    });
  }, [iam, compute, database, storage, addNode]);

  // Handle validation complete
  const handleValidationComplete = useCallback((result: PlatformValidationResult) => {
    setValidationResult(result);
  }, []);

  // Handle fix navigation
  const handleFix = useCallback(
    (error: PlatformValidationError) => {
      if (error.fix) {
        onStepChange(error.fix.step);
      } else if (error.category) {
        // Determine step from category
        const categoryToStep: Record<string, number> = {
          iam: 1,
          compute: 2,
          database: 3,
          storage: 4,
          security: 5,
          cost: 5,
        };
        const targetStep = categoryToStep[error.category] || 5;
        onStepChange(targetStep);
      }
    },
    [onStepChange]
  );

  // Can proceed to next step?
  const canProceed = useMemo(() => {
    const errors = stepErrors.filter((e) => e.severity === 'error');

    switch (step) {
      case 1:
        // IAM step - can proceed even without roles (they're optional)
        return errors.length === 0;
      case 2:
        // Compute step - can proceed without resources (they're optional)
        return errors.length === 0;
      case 3:
        // Database step - can proceed without databases
        return errors.length === 0;
      case 4:
        // Storage step - can proceed without storage
        return errors.length === 0;
      case 5:
        // Validation step - must be valid to complete
        return validationResult?.isValid || false;
      default:
        return true;
    }
  }, [step, stepErrors, validationResult]);

  // Get disabled reason
  const getDisabledReason = useCallback((): string | undefined => {
    const errors = stepErrors.filter((e) => e.severity === 'error');
    if (errors.length > 0) {
      return `Please fix ${errors.length} error(s) before continuing`;
    }

    switch (step) {
      case 5:
        if (!validationResult?.isValid) {
          return 'Please resolve all validation errors';
        }
        break;
    }

    return undefined;
  }, [step, stepErrors, validationResult]);

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <IAMRolesPoliciesStep
            iam={iam}
            onChange={setIAM}
            errors={stepErrors}
            onValidate={(errors) => setStepErrors(errors)}
          />
        );
      case 2:
        return (
          <ComputeServicesStep
            compute={compute}
            iam={iam}
            networkData={networkData}
            onChange={setCompute}
            errors={stepErrors}
          />
        );
      case 3:
        return (
          <DatabaseServicesStep
            database={database}
            networkData={networkData}
            onChange={setDatabase}
            errors={stepErrors}
          />
        );
      case 4:
        return (
          <StorageServicesStep
            storage={storage}
            networkData={networkData}
            onChange={setStorage}
            errors={stepErrors}
          />
        );
      case 5:
        return (
          <PlatformValidationStep
            iam={iam}
            compute={compute}
            database={database}
            storage={storage}
            networkData={networkData}
            onFix={handleFix}
            onValidationComplete={handleValidationComplete}
          />
        );
      default:
        return <Alert severity="error">Invalid step</Alert>;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Network Layer Dependency Check */}
      {!networkData && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Network Layer is not configured. Some platform resources require network configuration (subnets, security groups).
        </Alert>
      )}

      {/* Step Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {renderStep()}
      </Box>

      {/* Actions */}
      <Box sx={{ p: 2 }}>
        <StepActions
          onBack={handleBack}
          onNext={handleNext}
          onSave={handleSave}
          isFirstStep={step === 1}
          isLastStep={step === 5}
          canProceed={canProceed}
          canDeploy={validationResult?.isValid || false}
          isLoading={isLoading}
          isSaving={isSaving}
          isDeploying={isDeploying}
          nextLabel={step === 5 ? 'Complete Platform Layer' : undefined}
          disabledReason={getDisabledReason()}
        />
      </Box>
    </Box>
  );
}

export default PlatformArchitectWizard;
