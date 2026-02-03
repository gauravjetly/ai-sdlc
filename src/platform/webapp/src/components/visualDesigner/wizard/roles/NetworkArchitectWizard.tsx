/**
 * NetworkArchitectWizard Component
 * Orchestrates the 5-step network configuration wizard
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { v4 as uuid } from 'uuid';
import {
  VPCConfig,
  SubnetConfig,
  RoutingConfig,
  SecurityGroupConfig,
  NetworkLayerData,
  ValidationError,
  ValidationResult,
  DEFAULT_VPC_CONFIG,
  DEFAULT_ROUTING_CONFIG,
} from '../../../../types/network';
import {
  VPCConfigurationStep,
  SubnetDesignStep,
  RoutingConfigurationStep,
  SecurityGroupsStep,
  NetworkValidationStep,
} from '../steps/network';
import { StepActions } from '../shared';
import { useNetworkValidation } from '../hooks';
import { useDesignWizard } from '../../../../contexts/DesignWizardContext';

export interface NetworkArchitectWizardProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  onSave?: () => Promise<void>;
}

export function NetworkArchitectWizard({
  step,
  onStepChange,
  onComplete,
  onSave,
}: NetworkArchitectWizardProps) {
  const {
    region,
    layers,
    updateLayerData,
    addNode,
    isLoading,
    isSaving,
    isDeploying,
  } = useDesignWizard();

  const { validate, validateVPCConfig, validateAllSubnets, validateRoutingConfig, validateAllSecurityGroups } =
    useNetworkValidation();

  // Initialize state from context or defaults
  const existingData = layers.network.data?.config as NetworkLayerData | undefined;

  const [vpc, setVPC] = useState<VPCConfig>(
    existingData?.vpc || { ...DEFAULT_VPC_CONFIG }
  );
  const [subnets, setSubnets] = useState<SubnetConfig[]>(
    existingData?.subnets || []
  );
  const [routing, setRouting] = useState<RoutingConfig>(
    existingData?.routing || { ...DEFAULT_ROUTING_CONFIG }
  );
  const [securityGroups, setSecurityGroups] = useState<SecurityGroupConfig[]>(
    existingData?.securityGroups || []
  );
  const [stepErrors, setStepErrors] = useState<ValidationError[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Persist state to context when it changes
  useEffect(() => {
    const networkData: NetworkLayerData = {
      vpc,
      subnets,
      routing,
      securityGroups,
      validationResult: validationResult || undefined,
    };

    updateLayerData('network', {
      config: networkData,
      nodes: [], // Will be populated on completion
      edges: [],
    });
  }, [vpc, subnets, routing, securityGroups, validationResult, updateLayerData]);

  // Validate current step
  const validateStep = useCallback((): ValidationError[] => {
    let errors: ValidationError[] = [];

    switch (step) {
      case 1:
        errors = validateVPCConfig(vpc);
        break;
      case 2:
        errors = validateAllSubnets(subnets, vpc.cidrBlock);
        break;
      case 3:
        errors = validateRoutingConfig(routing, subnets);
        break;
      case 4:
        errors = validateAllSecurityGroups(securityGroups);
        break;
      case 5:
        const result = validate({ vpc, subnets, routing, securityGroups });
        errors = result.errors;
        break;
    }

    setStepErrors(errors);
    return errors;
  }, [step, vpc, subnets, routing, securityGroups, validate, validateVPCConfig, validateAllSubnets, validateRoutingConfig, validateAllSecurityGroups]);

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
      generateNetworkNodes();
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
  const generateNetworkNodes = useCallback(() => {
    // VPC node (container)
    addNode({
      id: `vpc-${vpc.name}`,
      type: 'vpcNode',
      position: { x: 50, y: 50 },
      data: {
        name: vpc.name,
        cidrBlock: vpc.cidrBlock,
        enableDnsSupport: vpc.enableDnsSupport,
        enableDnsHostnames: vpc.enableDnsHostnames,
      },
      layer: 'network',
      width: 800,
      height: 600,
    });

    // Group subnets by AZ
    const azGroups = subnets.reduce((acc, subnet) => {
      const az = subnet.availabilityZone;
      if (!acc[az]) acc[az] = [];
      acc[az].push(subnet);
      return acc;
    }, {} as Record<string, SubnetConfig[]>);

    let azX = 100;
    Object.entries(azGroups).forEach(([az, azSubnets]) => {
      let subnetY = 100;
      azSubnets.forEach((subnet) => {
        addNode({
          id: `subnet-${subnet.id}`,
          type: 'subnetNode',
          position: { x: azX, y: subnetY },
          data: {
            name: subnet.name,
            cidrBlock: subnet.cidrBlock,
            isPublic: subnet.isPublic,
            availabilityZone: subnet.availabilityZone,
          },
          layer: 'network',
          parentId: `vpc-${vpc.name}`,
        });
        subnetY += 120;
      });
      azX += 200;
    });

    // Internet Gateway
    if (routing.internetGateway.enabled) {
      addNode({
        id: 'igw',
        type: 'igwNode',
        position: { x: 400, y: -50 },
        data: { name: routing.internetGateway.name },
        layer: 'network',
      });
    }

    // NAT Gateways
    routing.natGateways.forEach((nat, i) => {
      addNode({
        id: `nat-${nat.id}`,
        type: 'natNode',
        position: { x: 100 + i * 200, y: 50 },
        data: {
          name: nat.name,
          subnetId: nat.subnetId,
        },
        layer: 'network',
      });
    });

    // Security Groups (as reference nodes)
    securityGroups.forEach((sg, i) => {
      addNode({
        id: `sg-${sg.id}`,
        type: 'sgNode',
        position: { x: 650, y: 100 + i * 80 },
        data: {
          name: sg.name,
          description: sg.description,
          ingressCount: sg.ingressRules.length,
          egressCount: sg.egressRules.length,
        },
        layer: 'network',
      });
    });
  }, [vpc, subnets, routing, securityGroups, addNode]);

  // Handle validation complete
  const handleValidationComplete = useCallback((result: ValidationResult) => {
    setValidationResult(result);
  }, []);

  // Handle fix navigation
  const handleFix = useCallback(
    (error: ValidationError) => {
      if (error.fix) {
        onStepChange(error.fix.step);
      } else if (error.path) {
        // Determine step from path
        if (error.path.startsWith('vpc')) {
          onStepChange(1);
        } else if (error.path.startsWith('subnet')) {
          onStepChange(2);
        } else if (error.path.startsWith('routing')) {
          onStepChange(3);
        } else if (error.path.startsWith('security')) {
          onStepChange(4);
        }
      }
    },
    [onStepChange]
  );

  // Can proceed to next step?
  const canProceed = useMemo(() => {
    const errors = stepErrors.filter((e) => e.severity === 'error');

    switch (step) {
      case 1:
        return vpc.name.length > 0 && vpc.cidrBlock.length > 0 && errors.length === 0;
      case 2:
        return subnets.length > 0 && errors.length === 0;
      case 3:
        return errors.length === 0;
      case 4:
        return securityGroups.length > 0 && errors.length === 0;
      case 5:
        return validationResult?.isValid || false;
      default:
        return true;
    }
  }, [step, vpc, subnets, securityGroups, stepErrors, validationResult]);

  // Get disabled reason
  const getDisabledReason = useCallback((): string | undefined => {
    if (stepErrors.filter((e) => e.severity === 'error').length > 0) {
      return 'Please fix the errors above';
    }

    switch (step) {
      case 1:
        if (!vpc.name) return 'VPC name is required';
        if (!vpc.cidrBlock) return 'CIDR block is required';
        break;
      case 2:
        if (subnets.length === 0) return 'At least one subnet is required';
        break;
      case 4:
        if (securityGroups.length === 0) return 'At least one security group is required';
        break;
      case 5:
        if (!validationResult?.isValid) return 'Please resolve all errors';
        break;
    }

    return undefined;
  }, [step, vpc, subnets, securityGroups, stepErrors, validationResult]);

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <VPCConfigurationStep
            vpc={vpc}
            onChange={setVPC}
            errors={stepErrors}
            onValidate={(errors) => setStepErrors(errors)}
          />
        );
      case 2:
        return (
          <SubnetDesignStep
            vpcCidr={vpc.cidrBlock}
            region={region}
            subnets={subnets}
            onChange={setSubnets}
            errors={stepErrors}
          />
        );
      case 3:
        return (
          <RoutingConfigurationStep
            subnets={subnets}
            routing={routing}
            onChange={setRouting}
            errors={stepErrors}
          />
        );
      case 4:
        return (
          <SecurityGroupsStep
            securityGroups={securityGroups}
            onChange={setSecurityGroups}
            errors={stepErrors}
          />
        );
      case 5:
        return (
          <NetworkValidationStep
            vpc={vpc}
            subnets={subnets}
            routing={routing}
            securityGroups={securityGroups}
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
          nextLabel={step === 5 ? 'Complete Network Layer' : undefined}
          disabledReason={getDisabledReason()}
        />
      </Box>
    </Box>
  );
}

export default NetworkArchitectWizard;
