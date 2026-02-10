/**
 * EnvironmentPromotion Component
 * Manage configuration promotion between environments
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  IconButton,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  ArrowForward as ArrowIcon,
  CheckCircle as SuccessIcon,
  Cancel as FailedIcon,
  Schedule as PendingIcon,
  PlayArrow as ExecuteIcon,
  Undo as RollbackIcon,
  ThumbUp as ApproveIcon,
  ThumbDown as RejectIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import {
  Environment,
  EnvironmentPromotionProps,
  PromotionStatus,
  PromotionRecord,
  PromotionChange,
  ENVIRONMENT_COLORS,
  ENVIRONMENT_DISPLAY_NAMES,
} from './types';
import { useDesignWizard } from '../../../contexts/DesignWizardContext';

/**
 * Get status icon
 */
function getStatusIcon(status: PromotionStatus) {
  switch (status) {
    case 'completed':
      return <SuccessIcon color="success" />;
    case 'failed':
    case 'rejected':
      return <FailedIcon color="error" />;
    case 'pending_approval':
    case 'validating':
    case 'executing':
      return <PendingIcon color="warning" />;
    case 'rolled_back':
      return <RollbackIcon color="warning" />;
    default:
      return <InfoIcon color="action" />;
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Environment pipeline step
 */
interface PipelineStepProps {
  environment: Environment;
  isActive: boolean;
  canPromote: boolean;
  onPromote: () => void;
}

function PipelineStep({
  environment,
  isActive,
  canPromote,
  onPromote,
}: PipelineStepProps) {
  const color = ENVIRONMENT_COLORS[environment];
  const displayName = ENVIRONMENT_DISPLAY_NAMES[environment];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: 2,
          bgcolor: isActive ? color : 'grey.200',
          color: isActive ? 'white' : 'text.secondary',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: 2,
          borderColor: isActive ? color : 'grey.300',
          transition: 'all 0.2s',
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          {displayName.substring(0, 3).toUpperCase()}
        </Typography>
        {isActive && (
          <Chip
            label="Active"
            size="small"
            sx={{
              mt: 0.5,
              height: 16,
              bgcolor: 'white',
              color: color,
              '& .MuiChip-label': { px: 1, fontSize: 9 },
            }}
          />
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {displayName}
      </Typography>
    </Box>
  );
}

/**
 * Promotion history item
 */
interface HistoryItemProps {
  record: PromotionRecord;
  onRollback?: () => void;
}

function HistoryItem({ record, onRollback }: HistoryItemProps) {
  return (
    <TimelineItem>
      <TimelineSeparator>
        <TimelineDot
          sx={{
            bgcolor:
              record.status === 'completed'
                ? 'success.main'
                : record.status === 'failed' || record.status === 'rejected'
                ? 'error.main'
                : 'warning.main',
          }}
        >
          {getStatusIcon(record.status)}
        </TimelineDot>
        <TimelineConnector />
      </TimelineSeparator>
      <TimelineContent>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={ENVIRONMENT_DISPLAY_NAMES[record.sourceEnvironment]}
                  size="small"
                  sx={{
                    bgcolor: alpha(
                      ENVIRONMENT_COLORS[record.sourceEnvironment],
                      0.1
                    ),
                    color: ENVIRONMENT_COLORS[record.sourceEnvironment],
                    height: 20,
                  }}
                />
                <ArrowIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Chip
                  label={ENVIRONMENT_DISPLAY_NAMES[record.targetEnvironment]}
                  size="small"
                  sx={{
                    bgcolor: alpha(
                      ENVIRONMENT_COLORS[record.targetEnvironment],
                      0.1
                    ),
                    color: ENVIRONMENT_COLORS[record.targetEnvironment],
                    height: 20,
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {record.changes.length} change(s) | {record.requestedBy} |{' '}
                {formatDate(record.requestedAt)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={record.status.replace('_', ' ')}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
              {record.status === 'completed' && onRollback && (
                <IconButton size="small" onClick={onRollback}>
                  <RollbackIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          </Box>
        </Paper>
      </TimelineContent>
    </TimelineItem>
  );
}

export function EnvironmentPromotion({
  onPromotionComplete,
  showHistory = true,
  autoPromoteRules,
}: EnvironmentPromotionProps) {
  const { selectedEnvironment, environments } = useDesignWizard();

  // Local state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionStatus, setPromotionStatus] = useState<PromotionStatus>('idle');

  // Available changes for promotion
  const availableChanges: PromotionChange[] = useMemo(() => {
    // In a real implementation, this would calculate actual differences
    return [
      {
        path: 'compute.instanceType',
        previousValue: 't3.medium',
        newValue: 't3.large',
        category: 'compute',
      },
      {
        path: 'compute.replicas',
        previousValue: 2,
        newValue: 3,
        category: 'compute',
      },
      {
        path: 'database.storageSize',
        previousValue: 100,
        newValue: 200,
        category: 'database',
      },
      {
        path: 'network.enableVPN',
        previousValue: false,
        newValue: true,
        category: 'network',
      },
      {
        path: 'cache.enabled',
        previousValue: false,
        newValue: true,
        category: 'compute',
      },
    ];
  }, []);

  // Promotion history
  const promotionHistory: PromotionRecord[] = useMemo(() => {
    return [
      {
        id: '1',
        sourceEnvironment: 'dev',
        targetEnvironment: 'staging',
        changes: availableChanges.slice(0, 3),
        status: 'completed',
        requestedBy: 'john@example.com',
        requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 300000),
      },
      {
        id: '2',
        sourceEnvironment: 'staging',
        targetEnvironment: 'prod',
        changes: availableChanges.slice(0, 2),
        status: 'pending_approval',
        requestedBy: 'jane@example.com',
        requestedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        id: '3',
        sourceEnvironment: 'dev',
        targetEnvironment: 'staging',
        changes: availableChanges.slice(2, 5),
        status: 'rolled_back',
        requestedBy: 'john@example.com',
        requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 600000),
        rolledBackAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ];
  }, [availableChanges]);

  // Determine target environment
  const targetEnvironment: Environment | null = useMemo(() => {
    switch (selectedEnvironment) {
      case 'dev':
        return 'staging';
      case 'staging':
        return 'prod';
      default:
        return null;
    }
  }, [selectedEnvironment]);

  // Handle change selection
  const handleToggleChange = useCallback((path: string) => {
    setSelectedChanges((prev) =>
      prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [...prev, path]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedChanges(
      selectedChanges.length === availableChanges.length
        ? []
        : availableChanges.map((c) => c.path)
    );
  }, [selectedChanges.length, availableChanges]);

  // Handle promotion
  const handleStartPromotion = useCallback(() => {
    if (targetEnvironment === 'prod') {
      setApprovalDialogOpen(true);
    } else {
      setPromotionDialogOpen(true);
    }
  }, [targetEnvironment]);

  const handleConfirmPromotion = useCallback(async () => {
    setIsPromoting(true);
    setPromotionStatus('validating');

    try {
      // Simulate validation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPromotionStatus('executing');

      // Simulate promotion
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setPromotionStatus('completed');

      onPromotionComplete?.({
        promotionId: crypto.randomUUID(),
        status: 'completed',
        sourceEnvironment: selectedEnvironment,
        targetEnvironment: targetEnvironment!,
        changes: availableChanges.filter((c) =>
          selectedChanges.includes(c.path)
        ),
        requiresApproval: false,
        costImpact: {
          baseCost: 150,
          effectiveCost: 195,
          delta: 45,
          percentChange: 30,
          breakdown: [],
        },
      });

      setPromotionDialogOpen(false);
      setApprovalDialogOpen(false);
      setSelectedChanges([]);
      setReason('');
    } catch (error) {
      setPromotionStatus('failed');
    } finally {
      setIsPromoting(false);
    }
  }, [
    selectedEnvironment,
    targetEnvironment,
    availableChanges,
    selectedChanges,
    onPromotionComplete,
  ]);

  // Cost impact calculation
  const estimatedCostImpact = useMemo(() => {
    const costPerChange = 15;
    return selectedChanges.length * costPerChange;
  }, [selectedChanges.length]);

  return (
    <Box>
      {/* Pipeline visualization */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Promotion Pipeline
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            my: 3,
          }}
        >
          <PipelineStep
            environment="dev"
            isActive={selectedEnvironment === 'dev'}
            canPromote={true}
            onPromote={() => {}}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              maxWidth: 100,
            }}
          >
            <Box
              sx={{
                flex: 1,
                height: 2,
                bgcolor:
                  selectedEnvironment === 'staging' ||
                  selectedEnvironment === 'prod'
                    ? 'success.main'
                    : 'grey.300',
              }}
            />
            <ArrowIcon
              sx={{
                color:
                  selectedEnvironment === 'staging' ||
                  selectedEnvironment === 'prod'
                    ? 'success.main'
                    : 'grey.400',
              }}
            />
          </Box>

          <PipelineStep
            environment="staging"
            isActive={selectedEnvironment === 'staging'}
            canPromote={true}
            onPromote={() => {}}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              maxWidth: 100,
            }}
          >
            <Box
              sx={{
                flex: 1,
                height: 2,
                bgcolor:
                  selectedEnvironment === 'prod' ? 'success.main' : 'grey.300',
              }}
            />
            <ArrowIcon
              sx={{
                color:
                  selectedEnvironment === 'prod' ? 'success.main' : 'grey.400',
              }}
            />
          </Box>

          <PipelineStep
            environment="prod"
            isActive={selectedEnvironment === 'prod'}
            canPromote={false}
            onPromote={() => {}}
          />
        </Box>

        {selectedEnvironment === 'prod' && (
          <Alert severity="info">
            Production is the final environment. Changes can only be promoted
            from staging.
          </Alert>
        )}
      </Paper>

      {/* Pending changes */}
      {targetEnvironment && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="subtitle2">
              Changes to Promote ({selectedChanges.length} selected)
            </Typography>
            <Button size="small" onClick={handleSelectAll}>
              {selectedChanges.length === availableChanges.length
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </Box>

          <List dense disablePadding>
            {availableChanges.map((change) => (
              <ListItem
                key={change.path}
                button
                onClick={() => handleToggleChange(change.path)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: selectedChanges.includes(change.path)
                    ? alpha(ENVIRONMENT_COLORS.dev, 0.08)
                    : 'transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Checkbox
                    checked={selectedChanges.includes(change.path)}
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {change.path}
                      </Typography>
                      <Chip
                        label={change.category}
                        size="small"
                        sx={{ height: 18, '& .MuiChip-label': { px: 1, fontSize: 10 } }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      component="span"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {String(change.previousValue)} {'->'}{' '}
                      <strong>{String(change.newValue)}</strong>
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Estimated cost impact:{' '}
              <strong>+${estimatedCostImpact}/month</strong>
            </Typography>

            <Button
              variant="contained"
              startIcon={<ArrowIcon />}
              onClick={handleStartPromotion}
              disabled={selectedChanges.length === 0}
            >
              Promote to {ENVIRONMENT_DISPLAY_NAMES[targetEnvironment]}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Promotion history */}
      {showHistory && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Promotion History
          </Typography>

          <Timeline sx={{ p: 0, m: 0 }}>
            {promotionHistory.map((record) => (
              <HistoryItem
                key={record.id}
                record={record}
                onRollback={
                  record.status === 'completed'
                    ? () => console.log('Rollback', record.id)
                    : undefined
                }
              />
            ))}
          </Timeline>
        </Paper>
      )}

      {/* Promotion confirmation dialog */}
      <Dialog
        open={promotionDialogOpen}
        onClose={() => !isPromoting && setPromotionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Promote to {targetEnvironment && ENVIRONMENT_DISPLAY_NAMES[targetEnvironment]}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to promote {selectedChanges.length} change(s) from{' '}
            {ENVIRONMENT_DISPLAY_NAMES[selectedEnvironment]} to{' '}
            {targetEnvironment && ENVIRONMENT_DISPLAY_NAMES[targetEnvironment]}.
          </DialogContentText>

          {promotionStatus !== 'idle' && (
            <Alert
              severity={
                promotionStatus === 'completed'
                  ? 'success'
                  : promotionStatus === 'failed'
                  ? 'error'
                  : 'info'
              }
              sx={{ mt: 2 }}
            >
              {promotionStatus === 'validating' && 'Validating changes...'}
              {promotionStatus === 'executing' && 'Promoting changes...'}
              {promotionStatus === 'completed' && 'Promotion completed successfully!'}
              {promotionStatus === 'failed' && 'Promotion failed. Please try again.'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPromotionDialogOpen(false)}
            disabled={isPromoting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPromotion}
            variant="contained"
            disabled={isPromoting || promotionStatus === 'completed'}
            startIcon={
              isPromoting ? <CircularProgress size={16} /> : <ExecuteIcon />
            }
          >
            {isPromoting ? 'Promoting...' : 'Confirm Promotion'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Production approval dialog */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => !isPromoting && setApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Production Promotion Requires Approval
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Promoting changes to production requires approval. Please provide a
            reason for this promotion.
          </DialogContentText>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for promotion"
            placeholder="Describe why these changes need to be promoted to production..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 2 }}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            This request will be sent to the following approvers:
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>admin@example.com</li>
              <li>devops-lead@example.com</li>
            </ul>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setApprovalDialogOpen(false)}
            disabled={isPromoting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPromotion}
            variant="contained"
            color="warning"
            disabled={isPromoting || reason.trim().length < 10}
            startIcon={
              isPromoting ? <CircularProgress size={16} /> : <ApproveIcon />
            }
          >
            {isPromoting ? 'Submitting...' : 'Request Approval'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EnvironmentPromotion;
