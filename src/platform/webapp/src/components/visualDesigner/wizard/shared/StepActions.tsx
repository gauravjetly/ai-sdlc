/**
 * StepActions Component
 * Navigation buttons for wizard steps (Back/Next/Save/Deploy)
 */

import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft as BackIcon,
  ChevronRight as NextIcon,
  Save as SaveIcon,
  PlayArrow as DeployIcon,
} from '@mui/icons-material';

export interface StepActionsProps {
  onBack?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  onDeploy?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  canProceed?: boolean;
  canDeploy?: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  isDeploying?: boolean;
  nextLabel?: string;
  backLabel?: string;
  disabledReason?: string;
}

export function StepActions({
  onBack,
  onNext,
  onSave,
  onDeploy,
  isFirstStep = false,
  isLastStep = false,
  canProceed = true,
  canDeploy = false,
  isLoading = false,
  isSaving = false,
  isDeploying = false,
  nextLabel,
  backLabel = 'Back',
  disabledReason,
}: StepActionsProps) {
  const isAnyLoading = isLoading || isSaving || isDeploying;

  const renderNextButton = () => {
    const label = nextLabel || (isLastStep ? 'Complete' : 'Next');
    const button = (
      <Button
        variant="contained"
        onClick={onNext}
        disabled={!canProceed || isAnyLoading}
        endIcon={
          isLoading ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <NextIcon />
          )
        }
        aria-label={label}
      >
        {label}
      </Button>
    );

    if (disabledReason && !canProceed) {
      return (
        <Tooltip title={disabledReason} arrow>
          <span>{button}</span>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pt: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box>
        {onBack && (
          <Button
            onClick={onBack}
            disabled={isFirstStep || isAnyLoading}
            startIcon={<BackIcon />}
            aria-label={backLabel}
          >
            {backLabel}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {onSave && (
          <Button
            variant="outlined"
            onClick={onSave}
            disabled={isAnyLoading}
            startIcon={
              isSaving ? (
                <CircularProgress size={16} />
              ) : (
                <SaveIcon />
              )
            }
            aria-label="Save progress"
          >
            Save
          </Button>
        )}

        {onDeploy && isLastStep && canDeploy && (
          <Button
            variant="outlined"
            color="success"
            onClick={onDeploy}
            disabled={isAnyLoading}
            startIcon={
              isDeploying ? (
                <CircularProgress size={16} />
              ) : (
                <DeployIcon />
              )
            }
            aria-label="Deploy to AWS"
          >
            Deploy
          </Button>
        )}

        {onNext && renderNextButton()}
      </Box>
    </Box>
  );
}

export default StepActions;
