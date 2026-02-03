/**
 * LayerDeploymentPanel Component
 * Controls for deploying layers with real-time feedback
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Divider,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  PlayArrow as DeployIcon,
  Undo as RollbackIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  AttachMoney as CostIcon,
  Schedule as TimeIcon,
  Terminal as LogIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useDesignWizard } from '../../../contexts/DesignWizardContext';
import { useLayerManagement } from '../../../hooks/useLayerManagement';
import { useDeploymentWebSocket } from '../../../hooks/useDeploymentWebSocket';
import {
  LayerType,
  Environment,
  DeploymentStatus,
  LogEntry,
  LayerCostEstimate,
  LAYER_CONFIG,
} from '../../../types/layers';

interface LayerDeploymentPanelProps {
  /** Layer to deploy */
  layer: LayerType;
  /** Callback on deployment start */
  onDeploymentStart?: () => void;
  /** Callback on deployment complete */
  onDeploymentComplete?: (success: boolean) => void;
  /** Maximum log lines to display */
  maxLogLines?: number;
}

/**
 * Deployment Log Stream component
 */
function DeploymentLogStream({
  logs,
  logsRef,
  maxLines = 500,
}: {
  logs: LogEntry[];
  logsRef: React.RefObject<HTMLDivElement>;
  maxLines?: number;
}) {
  const displayLogs = logs.slice(-maxLines);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return '#F44336';
      case 'warn':
        return '#FF9800';
      case 'debug':
        return '#9E9E9E';
      default:
        return '#4CAF50';
    }
  };

  return (
    <Box
      ref={logsRef}
      sx={{
        height: 300,
        overflow: 'auto',
        bgcolor: '#1e1e1e',
        borderRadius: 1,
        p: 1,
        fontFamily: 'monospace',
        fontSize: '0.75rem',
      }}
    >
      {displayLogs.length === 0 ? (
        <Typography
          variant="body2"
          sx={{ color: '#9E9E9E', fontFamily: 'monospace' }}
        >
          Waiting for deployment logs...
        </Typography>
      ) : (
        displayLogs.map((log) => (
          <Box
            key={log.id}
            sx={{
              display: 'flex',
              gap: 1,
              py: 0.25,
              '&:hover': { bgcolor: alpha('#fff', 0.05) },
            }}
          >
            <Typography
              component="span"
              sx={{
                color: '#666',
                fontFamily: 'monospace',
                fontSize: 'inherit',
                minWidth: 80,
              }}
            >
              {new Date(log.timestamp).toLocaleTimeString()}
            </Typography>
            <Typography
              component="span"
              sx={{
                color: getLevelColor(log.level),
                fontFamily: 'monospace',
                fontSize: 'inherit',
                minWidth: 50,
                textTransform: 'uppercase',
              }}
            >
              [{log.level}]
            </Typography>
            {log.resource && (
              <Typography
                component="span"
                sx={{
                  color: '#64B5F6',
                  fontFamily: 'monospace',
                  fontSize: 'inherit',
                }}
              >
                [{log.resource}]
              </Typography>
            )}
            <Typography
              component="span"
              sx={{
                color: '#E0E0E0',
                fontFamily: 'monospace',
                fontSize: 'inherit',
                wordBreak: 'break-word',
              }}
            >
              {log.message}
            </Typography>
          </Box>
        ))
      )}
    </Box>
  );
}

/**
 * Cost Estimate Display component
 */
function CostEstimateDisplay({
  estimate,
  expanded,
  onToggle,
}: {
  estimate?: LayerCostEstimate;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!estimate) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        <CostIcon fontSize="small" />
        <Typography variant="body2">Cost estimate unavailable</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CostIcon color="primary" fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            ${estimate.monthlyCost.toFixed(2)}/month
          </Typography>
          <Chip
            label={estimate.environment}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
          />
        </Box>
        <IconButton size="small">
          {expanded ? <CollapseIcon /> : <ExpandIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1, ml: 3 }}>
          {estimate.breakdown.map((item, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 0.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {item.resourceType}: {item.resourceName}
              </Typography>
              <Typography variant="caption" fontWeight={500}>
                ${item.monthlyCost.toFixed(2)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * LayerDeploymentPanel main component
 */
export function LayerDeploymentPanel({
  layer,
  onDeploymentStart,
  onDeploymentComplete,
  maxLogLines = 500,
}: LayerDeploymentPanelProps) {
  const { workflowId, selectedEnvironment, selectEnvironment } = useDesignWizard();
  const { canDeployLayer, canRollbackLayer, deployLayer, rollbackLayer, isDeploying } =
    useLayerManagement();

  // Local state
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [costExpanded, setCostExpanded] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(true);
  const [costEstimate, setCostEstimate] = useState<LayerCostEstimate | undefined>();
  const [estimatedDuration, setEstimatedDuration] = useState<number | undefined>();

  const logsRef = useRef<HTMLDivElement>(null);
  const config = LAYER_CONFIG[layer];

  // WebSocket for deployment updates
  const { isConnected, connect } = useDeploymentWebSocket(
    workflowId,
    { autoConnect: true },
    {
      onLog: (log) => {
        setLogs((prev) => [...prev, log]);
        // Auto-scroll
        if (logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
      },
      onProgress: (newProgress, stage) => {
        setProgress(newProgress);
      },
      onComplete: (outputs) => {
        setDeploymentStatus('success');
        onDeploymentComplete?.(true);
      },
      onError: (err) => {
        setError(err);
        setDeploymentStatus('failed');
        onDeploymentComplete?.(false);
      },
      onStart: (startedLayer, deploymentId) => {
        if (startedLayer === layer) {
          setDeploymentStatus('deploying');
          setProgress(0);
          setLogs([]);
          setError(null);
        }
      },
    }
  );

  // Check deployment permissions
  const deployCheck = useMemo(() => canDeployLayer(layer), [canDeployLayer, layer]);
  const rollbackCheck = useMemo(() => canRollbackLayer(layer), [canRollbackLayer, layer]);

  // Fetch cost estimate
  useEffect(() => {
    async function fetchCostEstimate() {
      if (!workflowId) return;

      try {
        const response = await fetch(
          `/api/v1/workflows/${workflowId}/cost-estimate?layer=${layer}&environment=${selectedEnvironment}`
        );
        if (response.ok) {
          const data = await response.json();
          setCostEstimate(data.data);
        }
      } catch {
        // Cost estimate is optional
      }
    }

    fetchCostEstimate();
  }, [workflowId, layer, selectedEnvironment]);

  /**
   * Handle deploy button click
   */
  const handleDeployClick = useCallback(() => {
    if (selectedEnvironment === 'prod') {
      setShowConfirmDialog(true);
    } else {
      handleDeploy();
    }
  }, [selectedEnvironment]);

  /**
   * Execute deployment
   */
  const handleDeploy = useCallback(async () => {
    setShowConfirmDialog(false);
    setDeploymentStatus('deploying');
    setProgress(0);
    setLogs([]);
    setError(null);
    onDeploymentStart?.();

    const result = await deployLayer(layer, selectedEnvironment);

    if (!result.success) {
      setError(result.error || 'Deployment failed');
      setDeploymentStatus('failed');
      onDeploymentComplete?.(false);
    }
    // Success will be handled by WebSocket
  }, [layer, selectedEnvironment, deployLayer, onDeploymentStart, onDeploymentComplete]);

  /**
   * Handle rollback button click
   */
  const handleRollbackClick = useCallback(() => {
    setShowRollbackDialog(true);
  }, []);

  /**
   * Execute rollback
   */
  const handleRollback = useCallback(async () => {
    setShowRollbackDialog(false);
    setDeploymentStatus('rolling_back');
    setProgress(0);
    setLogs([]);
    setError(null);

    const result = await rollbackLayer(layer);

    if (!result.success) {
      setError(result.error || 'Rollback failed');
      setDeploymentStatus('failed');
    } else {
      setDeploymentStatus('success');
    }
  }, [layer, rollbackLayer]);

  /**
   * Get status icon
   */
  const getStatusIcon = () => {
    switch (deploymentStatus) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'deploying':
      case 'rolling_back':
        return <CircularProgress size={20} />;
      default:
        return null;
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: isConnected ? '#4CAF50' : '#9E9E9E',
            }}
          />
          <Typography variant="h6" fontWeight={600}>
            Deploy {config.title}
          </Typography>
          {getStatusIcon()}
        </Box>
        <Chip
          label={deploymentStatus.replace('_', ' ')}
          size="small"
          color={
            deploymentStatus === 'success'
              ? 'success'
              : deploymentStatus === 'failed'
              ? 'error'
              : deploymentStatus === 'deploying' || deploymentStatus === 'rolling_back'
              ? 'warning'
              : 'default'
          }
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Environment Selection */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Environment</InputLabel>
          <Select
            value={selectedEnvironment}
            label="Environment"
            onChange={(e) => selectEnvironment(e.target.value as Environment)}
            disabled={isDeploying}
          >
            <MenuItem value="dev">Development</MenuItem>
            <MenuItem value="staging">Staging</MenuItem>
            <MenuItem value="prod">Production</MenuItem>
          </Select>
        </FormControl>

        {estimatedDuration && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
            <TimeIcon fontSize="small" />
            <Typography variant="body2">~{Math.ceil(estimatedDuration / 60)} min</Typography>
          </Box>
        )}
      </Box>

      {/* Cost Estimate */}
      <Box sx={{ mb: 2 }}>
        <CostEstimateDisplay
          estimate={costEstimate}
          expanded={costExpanded}
          onToggle={() => setCostExpanded(!costExpanded)}
        />
      </Box>

      {/* Deployment Check Warnings */}
      {!deployCheck.canDeploy && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Cannot Deploy</AlertTitle>
          {deployCheck.reason}
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Deployment Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Progress */}
      {(deploymentStatus === 'deploying' || deploymentStatus === 'rolling_back') && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {deploymentStatus === 'rolling_back' ? 'Rolling back...' : 'Deploying...'}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {progress}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 1 }} />
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<DeployIcon />}
          onClick={handleDeployClick}
          disabled={!deployCheck.canDeploy || isDeploying}
          sx={{ flex: 1 }}
        >
          {isDeploying ? 'Deploying...' : `Deploy to ${selectedEnvironment}`}
        </Button>

        <Tooltip title={rollbackCheck.reason || 'Rollback to previous state'}>
          <span>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RollbackIcon />}
              onClick={handleRollbackClick}
              disabled={!rollbackCheck.canDeploy || isDeploying}
            >
              Rollback
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Logs Section */}
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            mb: 1,
          }}
          onClick={() => setLogsExpanded(!logsExpanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LogIcon fontSize="small" />
            <Typography variant="subtitle2">Deployment Logs</Typography>
            <Chip label={logs.length} size="small" />
          </Box>
          <IconButton size="small">
            {logsExpanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </Box>

        <Collapse in={logsExpanded}>
          <DeploymentLogStream logs={logs} logsRef={logsRef} maxLines={maxLogLines} />
        </Collapse>
      </Box>

      {/* Production Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Production Deployment
        </DialogTitle>
        <DialogContent>
          <Typography>
            You are about to deploy to <strong>PRODUCTION</strong>. This action will affect live
            infrastructure.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleDeploy}>
            Deploy to Production
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={showRollbackDialog} onClose={() => setShowRollbackDialog(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Confirm Rollback
        </DialogTitle>
        <DialogContent>
          <Typography>
            You are about to rollback the <strong>{config.title}</strong> to its previous state.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will destroy any resources created in the current deployment.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRollbackDialog(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleRollback}>
            Rollback
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default LayerDeploymentPanel;
