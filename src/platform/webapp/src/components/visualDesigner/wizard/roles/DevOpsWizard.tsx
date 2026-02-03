/**
 * DevOpsWizard Component
 * Orchestrates the 5-step DevOps configuration wizard
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import {
  CICDConfig,
  MonitoringConfig,
  ServiceConnectionConfig,
  LoadBalancerConfig,
  IaCConfig,
  DevOpsLayerData,
  DevOpsValidationResult,
  DNSConfig,
  DEFAULT_CICD_CONFIG,
  DEFAULT_MONITORING_CONFIG,
  DEFAULT_IAC_CONFIG,
  DEFAULT_DNS_CONFIG,
} from '../../../../types/devops';
import { ValidationError, NetworkLayerData } from '../../../../types/network';
import {
  CICDPipelineStep,
  MonitoringObservabilityStep,
  ServiceConnectionsStep,
  InfrastructureAsCodeStep,
  DevOpsValidationStep,
} from '../steps/devops';
import { StepActions } from '../shared';
import { useDevOpsValidation } from '../hooks/useDevOpsValidation';
import { useDesignWizard } from '../../../../contexts/DesignWizardContext';

export interface DevOpsWizardProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  onSave?: () => Promise<void>;
}

export function DevOpsWizard({
  step,
  onStepChange,
  onComplete,
  onSave,
}: DevOpsWizardProps) {
  const {
    layers,
    updateLayerData,
    addNode,
    isLoading,
    isSaving,
    isDeploying,
  } = useDesignWizard();

  const {
    validate,
    validateCICDConfig,
    validateMonitoringConfig,
    validateConnectionsConfig,
    validateLoadBalancerConfig,
    validateDNSConfig,
    validateIaCConfig,
  } = useDevOpsValidation();

  // Get data from other layers
  const networkData = layers.network.data?.config as NetworkLayerData | undefined;
  const platformData = layers.platform.data?.config as Record<string, unknown> | undefined;

  // Initialize state from context or defaults
  const existingData = layers.devops.data?.config as DevOpsLayerData | undefined;

  const [cicd, setCICD] = useState<CICDConfig>(
    existingData?.cicd || { ...DEFAULT_CICD_CONFIG }
  );
  const [monitoring, setMonitoring] = useState<MonitoringConfig>(
    existingData?.monitoring || { ...DEFAULT_MONITORING_CONFIG }
  );
  const [connections, setConnections] = useState<ServiceConnectionConfig[]>(
    existingData?.connections || []
  );
  const [loadBalancers, setLoadBalancers] = useState<LoadBalancerConfig[]>(
    existingData?.loadBalancers || []
  );
  const [dns, setDNS] = useState<DNSConfig>(
    existingData?.dns || { ...DEFAULT_DNS_CONFIG }
  );
  const [iac, setIaC] = useState<IaCConfig>(
    existingData?.iac || { ...DEFAULT_IAC_CONFIG }
  );
  const [stepErrors, setStepErrors] = useState<ValidationError[]>([]);
  const [validationResult, setValidationResult] = useState<DevOpsValidationResult | null>(null);

  // Persist state to context when it changes
  useEffect(() => {
    const devopsData: DevOpsLayerData = {
      cicd,
      monitoring,
      connections,
      loadBalancers,
      dns,
      iac,
      validation: validationResult || undefined,
    };

    updateLayerData('devops', {
      config: devopsData,
      nodes: [],
      edges: [],
    });
  }, [cicd, monitoring, connections, loadBalancers, dns, iac, validationResult, updateLayerData]);

  // Validate current step
  const validateStep = useCallback((): ValidationError[] => {
    let errors: ValidationError[] = [];

    switch (step) {
      case 1:
        errors = validateCICDConfig(cicd);
        break;
      case 2:
        errors = validateMonitoringConfig(monitoring);
        break;
      case 3:
        errors = [
          ...validateConnectionsConfig(connections),
          ...validateLoadBalancerConfig(loadBalancers),
          ...validateDNSConfig(dns),
        ];
        break;
      case 4:
        errors = validateIaCConfig(iac);
        break;
      case 5:
        const result = validate(
          { cicd, monitoring, connections, loadBalancers, dns, iac },
          networkData || null
        );
        errors = result.errors;
        break;
    }

    setStepErrors(errors);
    return errors;
  }, [
    step,
    cicd,
    monitoring,
    connections,
    loadBalancers,
    dns,
    iac,
    networkData,
    validate,
    validateCICDConfig,
    validateMonitoringConfig,
    validateConnectionsConfig,
    validateLoadBalancerConfig,
    validateDNSConfig,
    validateIaCConfig,
  ]);

  // Handle next step
  const handleNext = useCallback(() => {
    const errors = validateStep();
    const criticalErrors = errors.filter((e) => e.severity === 'error');

    if (criticalErrors.length > 0) {
      return;
    }

    if (step < 5) {
      onStepChange(step + 1);
    } else if (step === 5 && validationResult?.isValid) {
      generateDevOpsNodes();
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
  const generateDevOpsNodes = useCallback(() => {
    // CI/CD Pipeline node
    addNode({
      id: 'cicd-pipeline',
      type: 'cicdNode',
      position: { x: 50, y: 50 },
      data: {
        name: 'CI/CD Pipeline',
        provider: cicd.sourceControl.provider,
        repository: cicd.sourceControl.repositoryUrl,
        stages: cicd.buildPipeline.stages.filter((s) => s.enabled).length,
        strategy: cicd.deployment.strategy,
      },
      layer: 'devops',
    });

    // Load Balancers
    loadBalancers.forEach((lb, i) => {
      addNode({
        id: `lb-${lb.id}`,
        type: 'loadBalancerNode',
        position: { x: 300, y: 50 + i * 120 },
        data: {
          name: lb.name,
          type: lb.type,
          scheme: lb.scheme,
          listeners: lb.listeners.length,
          targetGroups: lb.targetGroups.length,
        },
        layer: 'devops',
      });
    });

    // Monitoring node
    if (monitoring.alarms.length > 0 || monitoring.logGroups.length > 0) {
      addNode({
        id: 'monitoring',
        type: 'monitoringNode',
        position: { x: 550, y: 50 },
        data: {
          name: 'CloudWatch Monitoring',
          logGroups: monitoring.logGroups.length,
          alarms: monitoring.alarms.length,
          dashboards: monitoring.dashboards.length,
          tracingEnabled: monitoring.tracing.enabled,
        },
        layer: 'devops',
      });
    }

    // DNS records
    dns.records.forEach((record, i) => {
      addNode({
        id: `dns-${record.id}`,
        type: 'dnsNode',
        position: { x: 550, y: 200 + i * 80 },
        data: {
          name: record.name,
          type: record.type,
          value: record.alias ? 'Alias' : record.value,
        },
        layer: 'devops',
      });
    });

    // Terraform/IaC node
    addNode({
      id: 'terraform',
      type: 'terraformNode',
      position: { x: 800, y: 50 },
      data: {
        name: 'Terraform',
        provider: iac.provider,
        modules: iac.modules.length,
        workspaces: iac.workspaces.length,
        stateBackend: iac.stateBackend.type,
      },
      layer: 'devops',
    });
  }, [cicd, monitoring, loadBalancers, dns, iac, addNode]);

  // Handle validation complete
  const handleValidationComplete = useCallback((result: DevOpsValidationResult) => {
    setValidationResult(result);
  }, []);

  // Handle fix navigation
  const handleFix = useCallback(
    (error: ValidationError) => {
      if (error.fix) {
        onStepChange(error.fix.step);
      } else if (error.path) {
        if (error.path.startsWith('cicd') || error.path.startsWith('sourceControl') || error.path.startsWith('buildPipeline') || error.path.startsWith('deployment') || error.path.startsWith('testAutomation')) {
          onStepChange(1);
        } else if (error.path.startsWith('monitoring')) {
          onStepChange(2);
        } else if (error.path.startsWith('connections') || error.path.startsWith('loadBalancers') || error.path.startsWith('dns')) {
          onStepChange(3);
        } else if (error.path.startsWith('iac')) {
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
        return (
          cicd.sourceControl.repositoryUrl.length > 0 &&
          cicd.buildPipeline.stages.filter((s) => s.enabled).length > 0 &&
          errors.length === 0
        );
      case 2:
        return errors.length === 0;
      case 3:
        return errors.length === 0;
      case 4:
        return iac.stateBackend.type !== undefined && errors.length === 0;
      case 5:
        return validationResult?.isValid || false;
      default:
        return true;
    }
  }, [step, cicd, iac, stepErrors, validationResult]);

  // Get disabled reason
  const getDisabledReason = useCallback((): string | undefined => {
    if (stepErrors.filter((e) => e.severity === 'error').length > 0) {
      return 'Please fix the errors above';
    }

    switch (step) {
      case 1:
        if (!cicd.sourceControl.repositoryUrl) return 'Repository URL is required';
        if (cicd.buildPipeline.stages.filter((s) => s.enabled).length === 0) return 'At least one build stage is required';
        break;
      case 4:
        if (!iac.stateBackend.type) return 'State backend must be configured';
        break;
      case 5:
        if (!validationResult?.isValid) return 'Please resolve all validation errors';
        break;
    }

    return undefined;
  }, [step, cicd, iac, stepErrors, validationResult]);

  // Aggregate all data for IaC and validation steps
  const allDevOpsData: DevOpsLayerData = useMemo(
    () => ({
      cicd,
      monitoring,
      connections,
      loadBalancers,
      dns,
      iac,
    }),
    [cicd, monitoring, connections, loadBalancers, dns, iac]
  );

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <CICDPipelineStep
            cicd={cicd}
            onChange={setCICD}
            errors={stepErrors}
            onValidate={(errors) => setStepErrors(errors)}
          />
        );
      case 2:
        return (
          <MonitoringObservabilityStep
            monitoring={monitoring}
            onChange={setMonitoring}
            errors={stepErrors}
            onValidate={(errors) => setStepErrors(errors)}
          />
        );
      case 3:
        return (
          <ServiceConnectionsStep
            connections={connections}
            onConnectionsChange={setConnections}
            loadBalancers={loadBalancers}
            onLoadBalancersChange={setLoadBalancers}
            dns={dns}
            onDNSChange={setDNS}
            networkData={networkData}
            platformData={platformData}
            errors={stepErrors}
          />
        );
      case 4:
        return (
          <InfrastructureAsCodeStep
            iac={iac}
            onChange={setIaC}
            devopsData={allDevOpsData}
            networkData={networkData}
            platformData={platformData}
            errors={stepErrors}
          />
        );
      case 5:
        return (
          <DevOpsValidationStep
            devopsData={allDevOpsData}
            networkData={networkData}
            platformData={platformData}
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
          nextLabel={step === 5 ? 'Complete DevOps Layer' : undefined}
          disabledReason={getDisabledReason()}
        />
      </Box>
    </Box>
  );
}

export default DevOpsWizard;
