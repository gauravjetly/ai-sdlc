/**
 * EnvironmentSwitcher Component
 * Primary interface for switching between environments (dev/staging/prod)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  TextField,
  Badge,
  Divider,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Warning as WarningIcon,
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  MoreVert as MoreIcon,
  Schedule as ScheduleIcon,
  CloudDone as DeployedIcon,
} from '@mui/icons-material';

import {
  Environment,
  EnvironmentSwitcherProps,
  EnvironmentStatus,
  EnvironmentMetadata,
  ENVIRONMENT_COLORS,
  ENVIRONMENT_DISPLAY_NAMES,
} from './types';
import { useDesignWizard } from '../../../contexts/DesignWizardContext';

/**
 * Get status icon based on environment health
 */
function getStatusIcon(status: EnvironmentStatus) {
  switch (status) {
    case 'healthy':
      return <HealthyIcon sx={{ fontSize: 16, color: 'success.main' }} />;
    case 'warning':
      return <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />;
    case 'error':
      return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
    default:
      return null;
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date | undefined): string {
  if (!date) return 'Never';

  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Default environment metadata
 */
function getDefaultMetadata(env: Environment): EnvironmentMetadata {
  return {
    id: env,
    name: env,
    displayName: ENVIRONMENT_DISPLAY_NAMES[env],
    color: ENVIRONMENT_COLORS[env],
    status: 'unknown',
    isProtected: env === 'prod',
    approvalRequired: env === 'prod',
    createdAt: new Date(),
    lastModifiedAt: new Date(),
    resourceCount: 0,
  };
}

export function EnvironmentSwitcher({
  variant = 'tabs',
  showStatus = true,
  showMetadata = true,
  allowAddEnvironment = false,
  onEnvironmentChange,
  disabled = false,
}: EnvironmentSwitcherProps) {
  const {
    selectedEnvironment,
    selectEnvironment,
    environments,
  } = useDesignWizard();

  // Local state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingEnvironment, setPendingEnvironment] = useState<Environment | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuEnvironment, setMenuEnvironment] = useState<Environment | null>(null);

  // Available environments with metadata
  const availableEnvironments: EnvironmentMetadata[] = useMemo(() => {
    return (['dev', 'staging', 'prod'] as Environment[]).map((env) => {
      const config = environments[env === 'staging' ? 'staging' : env];
      return {
        ...getDefaultMetadata(env),
        lastDeployedAt: undefined, // Would come from API
        resourceCount: Object.keys(config?.instanceSizes || {}).length,
      };
    });
  }, [environments]);

  // Handle environment change
  const handleEnvironmentChange = useCallback(
    (env: Environment) => {
      if (disabled) return;

      // Production requires confirmation
      if (env === 'prod' && selectedEnvironment !== 'prod') {
        setPendingEnvironment(env);
        setConfirmDialogOpen(true);
        return;
      }

      selectEnvironment(env);
      onEnvironmentChange?.(env);
    },
    [disabled, selectedEnvironment, selectEnvironment, onEnvironmentChange]
  );

  // Confirm production switch
  const handleConfirmSwitch = useCallback(() => {
    if (pendingEnvironment) {
      selectEnvironment(pendingEnvironment);
      onEnvironmentChange?.(pendingEnvironment);
    }
    setConfirmDialogOpen(false);
    setPendingEnvironment(null);
  }, [pendingEnvironment, selectEnvironment, onEnvironmentChange]);

  // Cancel production switch
  const handleCancelSwitch = useCallback(() => {
    setConfirmDialogOpen(false);
    setPendingEnvironment(null);
  }, []);

  // Handle add environment
  const handleAddEnvironment = useCallback(() => {
    // In a real implementation, this would create a new environment
    console.log('Creating environment:', newEnvName);
    setAddDialogOpen(false);
    setNewEnvName('');
  }, [newEnvName]);

  // Handle context menu
  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, env: Environment) => {
      event.stopPropagation();
      setMenuAnchor(event.currentTarget);
      setMenuEnvironment(env);
    },
    []
  );

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setMenuEnvironment(null);
  }, []);

  // Render tabs variant
  const renderTabs = () => (
    <Box>
      <Tabs
        value={selectedEnvironment}
        onChange={(_, value) => handleEnvironmentChange(value as Environment)}
        variant="fullWidth"
        sx={{
          minHeight: 48,
          '& .MuiTabs-indicator': {
            backgroundColor: ENVIRONMENT_COLORS[selectedEnvironment],
          },
        }}
      >
        {availableEnvironments.map((env) => (
          <Tab
            key={env.name}
            value={env.name}
            disabled={disabled}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge
                  variant="dot"
                  sx={{
                    '& .MuiBadge-dot': {
                      backgroundColor: env.color,
                    },
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {env.displayName}
                  </Typography>
                </Badge>
                {showStatus && getStatusIcon(env.status)}
              </Box>
            }
            sx={{
              minHeight: 48,
              '&.Mui-selected': {
                color: env.color,
              },
            }}
          />
        ))}
      </Tabs>

      {showMetadata && (
        <Box
          sx={{
            p: 1.5,
            bgcolor: alpha(ENVIRONMENT_COLORS[selectedEnvironment], 0.08),
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Last Deployed">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DeployedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {formatRelativeTime(
                    availableEnvironments.find(
                      (e) => e.name === selectedEnvironment
                    )?.lastDeployedAt
                  )}
                </Typography>
              </Box>
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              {availableEnvironments.find(
                (e) => e.name === selectedEnvironment
              )?.resourceCount || 0}{' '}
              resources
            </Typography>
          </Box>

          {selectedEnvironment === 'prod' && (
            <Chip
              size="small"
              label="Protected"
              color="error"
              variant="outlined"
              sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: 11 } }}
            />
          )}
        </Box>
      )}
    </Box>
  );

  // Render chips variant
  const renderChips = () => (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      {availableEnvironments.map((env) => (
        <Chip
          key={env.name}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {env.displayName}
              {showStatus && getStatusIcon(env.status)}
            </Box>
          }
          onClick={() => handleEnvironmentChange(env.name)}
          disabled={disabled}
          variant={selectedEnvironment === env.name ? 'filled' : 'outlined'}
          sx={{
            borderColor: env.color,
            color: selectedEnvironment === env.name ? 'white' : env.color,
            bgcolor:
              selectedEnvironment === env.name ? env.color : 'transparent',
            '&:hover': {
              bgcolor:
                selectedEnvironment === env.name
                  ? env.color
                  : alpha(env.color, 0.1),
            },
          }}
          onDelete={
            env.name !== 'prod'
              ? (e) => handleMenuOpen(e as any, env.name)
              : undefined
          }
          deleteIcon={
            <IconButton
              size="small"
              sx={{ p: 0.25 }}
              onClick={(e) => handleMenuOpen(e, env.name)}
            >
              <MoreIcon sx={{ fontSize: 16 }} />
            </IconButton>
          }
        />
      ))}

      {allowAddEnvironment && (
        <Tooltip title="Add Environment">
          <IconButton
            size="small"
            onClick={() => setAddDialogOpen(true)}
            disabled={disabled}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderStyle: 'dashed',
            }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  return (
    <Box>
      {/* Environment selector */}
      {variant === 'tabs' && renderTabs()}
      {variant === 'chips' && renderChips()}

      {/* Production confirmation dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelSwitch}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Switch to Production?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to switch to the <strong>Production</strong>{' '}
            environment. Changes in this environment can affect live systems.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            Please ensure you have the necessary permissions and understand the
            impact of any changes you make.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSwitch}>Cancel</Button>
          <Button
            onClick={handleConfirmSwitch}
            color="error"
            variant="contained"
          >
            Switch to Production
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add environment dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add Custom Environment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Environment Name"
            fullWidth
            variant="outlined"
            value={newEnvName}
            onChange={(e) => setNewEnvName(e.target.value)}
            placeholder="e.g., qa, demo, sandbox"
            helperText="Use lowercase letters and hyphens only"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddEnvironment}
            variant="contained"
            disabled={!newEnvName.trim()}
          >
            Create Environment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            // View details action
          }}
        >
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            // Export config action
          }}
        >
          Export Configuration
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={handleMenuClose}
          disabled={menuEnvironment === 'prod'}
          sx={{ color: 'error.main' }}
        >
          Delete Environment
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default EnvironmentSwitcher;
