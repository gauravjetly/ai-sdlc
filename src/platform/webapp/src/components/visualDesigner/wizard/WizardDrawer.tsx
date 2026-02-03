/**
 * WizardDrawer Component
 * Main drawer container for the Infrastructure Designer wizard
 */

import React, { useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudQueue as CloudIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useDesignWizard, LayerType } from '../../../contexts/DesignWizardContext';
import { NetworkArchitectWizard } from './roles';
import { NETWORK_WIZARD_STEPS } from './utils/constants';

// Layer configuration
const LAYER_CONFIG = {
  network: {
    title: 'Network Layer',
    description: 'VPC, subnets, security groups, and connectivity',
    icon: <CloudIcon />,
    color: '#2196F3',
    steps: NETWORK_WIZARD_STEPS,
  },
  platform: {
    title: 'Platform Layer',
    description: 'Compute, databases, caching, and load balancing',
    icon: <StorageIcon />,
    color: '#4CAF50',
    steps: [
      { key: 'compute', label: 'Compute Selection', description: '' },
      { key: 'database', label: 'Database Setup', description: '' },
      { key: 'cache', label: 'Caching & Messaging', description: '' },
      { key: 'loadbalancer', label: 'Load Balancing', description: '' },
      { key: 'review', label: 'Review', description: '' },
    ],
  },
  devops: {
    title: 'DevOps Layer',
    description: 'CI/CD, monitoring, logging, and secrets',
    icon: <SpeedIcon />,
    color: '#FF9800',
    steps: [
      { key: 'cicd', label: 'CI/CD Pipeline', description: '' },
      { key: 'monitoring', label: 'Monitoring Setup', description: '' },
      { key: 'logging', label: 'Logging', description: '' },
      { key: 'secrets', label: 'Secrets Management', description: '' },
      { key: 'review', label: 'Review', description: '' },
    ],
  },
};

export interface WizardDrawerProps {
  width?: number;
}

export function WizardDrawer({ width = 520 }: WizardDrawerProps) {
  const {
    isWizardOpen,
    closeWizard,
    currentLayer,
    currentStep,
    setCurrentStep,
    validationErrors,
    clearErrors,
    saveProgress,
    advanceToNextLayer,
  } = useDesignWizard();

  // Get current layer config
  const layerConfig = currentLayer ? LAYER_CONFIG[currentLayer] : null;
  const steps = layerConfig?.steps || [];

  // Handle step change
  const handleStepChange = useCallback(
    (step: number) => {
      setCurrentStep(step);
    },
    [setCurrentStep]
  );

  // Handle wizard completion
  const handleComplete = useCallback(async () => {
    const success = await advanceToNextLayer();
    if (success) {
      // Layer completed, context will update currentLayer
    }
  }, [advanceToNextLayer]);

  // Handle save
  const handleSave = useCallback(async () => {
    await saveProgress();
  }, [saveProgress]);

  // Render layer-specific wizard
  const renderWizard = () => {
    if (!currentLayer) return null;

    switch (currentLayer) {
      case 'network':
        return (
          <NetworkArchitectWizard
            step={currentStep}
            onStepChange={handleStepChange}
            onComplete={handleComplete}
            onSave={handleSave}
          />
        );
      case 'platform':
        // TODO: Implement PlatformArchitectWizard
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              Platform Layer wizard is coming soon. Complete the Network Layer first.
            </Alert>
          </Box>
        );
      case 'devops':
        // TODO: Implement DevOpsArchitectWizard
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              DevOps Layer wizard is coming soon. Complete the Platform Layer first.
            </Alert>
          </Box>
        );
      default:
        return null;
    }
  };

  if (!layerConfig) return null;

  return (
    <Drawer
      anchor="right"
      open={isWizardOpen}
      onClose={closeWizard}
      PaperProps={{
        sx: {
          width,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      ModalProps={{
        keepMounted: false, // Better performance
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: layerConfig.color,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {layerConfig.icon}
          <Box>
            <Typography variant="h6" component="h2">
              {layerConfig.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {layerConfig.description}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={closeWizard}
          sx={{ color: 'white' }}
          aria-label="Close wizard"
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Stepper */}
      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Stepper activeStep={currentStep - 1} alternativeLabel>
          {steps.map((step, index) => (
            <Step
              key={step.key}
              completed={currentStep > index + 1}
              sx={{
                '& .MuiStepLabel-label': {
                  fontSize: '0.75rem',
                },
              }}
            >
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Divider />

      {/* Validation Errors (sticky) */}
      {validationErrors.length > 0 && (
        <Alert
          severity="error"
          onClose={clearErrors}
          sx={{ mx: 2, mt: 2 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following issues:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.slice(0, 3).map((error, i) => (
              <li key={i}>
                <Typography variant="body2">{error.message}</Typography>
              </li>
            ))}
            {validationErrors.length > 3 && (
              <li>
                <Typography variant="body2">
                  ...and {validationErrors.length - 3} more
                </Typography>
              </li>
            )}
          </ul>
        </Alert>
      )}

      {/* Wizard Content */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderWizard()}
      </Box>
    </Drawer>
  );
}

export default WizardDrawer;
