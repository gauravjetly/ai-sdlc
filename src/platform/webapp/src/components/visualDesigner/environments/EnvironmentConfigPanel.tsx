/**
 * EnvironmentConfigPanel Component
 * View and edit environment-specific configurations
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Compare as CompareIcon,
  AttachMoney as CostIcon,
  Memory as ComputeIcon,
  Storage as DatabaseIcon,
  Lan as NetworkIcon,
  Folder as StorageIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import {
  Environment,
  EnvironmentConfigPanelProps,
  ConfigOverride,
  ENVIRONMENT_COLORS,
  ENVIRONMENT_DISPLAY_NAMES,
  CostDelta,
} from './types';
import { useDesignWizard } from '../../../contexts/DesignWizardContext';

/**
 * Get category icon
 */
function getCategoryIcon(category: string) {
  switch (category) {
    case 'compute':
      return <ComputeIcon />;
    case 'database':
      return <DatabaseIcon />;
    case 'network':
      return <NetworkIcon />;
    case 'storage':
      return <StorageIcon />;
    default:
      return <InfoIcon />;
  }
}

/**
 * Configuration field component
 */
interface ConfigFieldProps {
  path: string;
  label: string;
  value: unknown;
  baseValue?: unknown;
  isOverride: boolean;
  readOnly: boolean;
  onOverride: (path: string, value: unknown) => void;
  onRevert: (path: string) => void;
}

function ConfigField({
  path,
  label,
  value,
  baseValue,
  isOverride,
  readOnly,
  onOverride,
  onRevert,
}: ConfigFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(String(value ?? ''));

  const handleSave = useCallback(() => {
    let parsedValue: unknown = editValue;

    // Try to parse as number
    if (!isNaN(Number(editValue))) {
      parsedValue = Number(editValue);
    }
    // Try to parse as boolean
    else if (editValue === 'true' || editValue === 'false') {
      parsedValue = editValue === 'true';
    }

    onOverride(path, parsedValue);
    setIsEditing(false);
  }, [path, editValue, onOverride]);

  const handleCancel = useCallback(() => {
    setEditValue(String(value ?? ''));
    setIsEditing(false);
  }, [value]);

  // Render based on value type
  const renderValue = () => {
    if (typeof value === 'boolean') {
      return (
        <FormControlLabel
          control={
            <Switch
              checked={value}
              onChange={(e) => onOverride(path, e.target.checked)}
              disabled={readOnly}
              size="small"
            />
          }
          label={value ? 'Enabled' : 'Disabled'}
        />
      );
    }

    if (isEditing) {
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            sx={{ flex: 1 }}
          />
          <IconButton size="small" color="primary" onClick={handleSave}>
            <SaveIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleCancel}>
            <UndoIcon fontSize="small" />
          </IconButton>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            color: isOverride ? 'warning.main' : 'text.primary',
            fontWeight: isOverride ? 600 : 400,
          }}
        >
          {String(value ?? '-')}
        </Typography>

        {!readOnly && (
          <IconButton
            size="small"
            onClick={() => setIsEditing(true)}
            sx={{ opacity: 0, transition: 'opacity 0.2s' }}
            className="edit-button"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}

        {isOverride && (
          <>
            <Chip
              label="Override"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: 10 } }}
            />
            {!readOnly && (
              <Tooltip title={`Revert to base: ${baseValue}`}>
                <IconButton size="small" onClick={() => onRevert(path)}>
                  <UndoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 1,
        px: 2,
        '&:hover': {
          bgcolor: 'action.hover',
          '& .edit-button': {
            opacity: 1,
          },
        },
        borderLeft: isOverride ? 3 : 0,
        borderColor: 'warning.main',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200 }}>
        {label}
      </Typography>
      {renderValue()}
    </Box>
  );
}

/**
 * Cost comparison component
 */
interface CostComparisonProps {
  costDelta: CostDelta | null;
}

function CostComparison({ costDelta }: CostComparisonProps) {
  if (!costDelta) return null;

  const isIncrease = costDelta.delta > 0;
  const color = isIncrease ? 'error.main' : 'success.main';

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CostIcon color="primary" />
        <Typography variant="subtitle2">Cost Impact</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Typography variant="caption" color="text.secondary">
            Base Cost
          </Typography>
          <Typography variant="h6">
            ${costDelta.baseCost.toFixed(2)}/mo
          </Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="caption" color="text.secondary">
            New Cost
          </Typography>
          <Typography variant="h6">
            ${costDelta.effectiveCost.toFixed(2)}/mo
          </Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="caption" color="text.secondary">
            Change
          </Typography>
          <Typography variant="h6" sx={{ color }}>
            {isIncrease ? '+' : ''}
            ${costDelta.delta.toFixed(2)}
            <Typography
              component="span"
              variant="caption"
              sx={{ ml: 0.5, color }}
            >
              ({isIncrease ? '+' : ''}
              {costDelta.percentChange.toFixed(1)}%)
            </Typography>
          </Typography>
        </Grid>
      </Grid>

      {costDelta.breakdown.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Breakdown
          </Typography>
          {costDelta.breakdown.map((item) => (
            <Box
              key={item.category}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 0.5,
              }}
            >
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {item.category}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: item.delta > 0 ? 'error.main' : 'success.main',
                }}
              >
                {item.delta > 0 ? '+' : ''}${item.delta.toFixed(2)}
              </Typography>
            </Box>
          ))}
        </>
      )}
    </Paper>
  );
}

export function EnvironmentConfigPanel({
  environment,
  readOnly = false,
  showCost = true,
  comparisonEnvironment,
  onSave,
  onOverrideChange,
}: EnvironmentConfigPanelProps) {
  const { environments, updateEnvironmentConfig, isSaving } = useDesignWizard();

  // Local state
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'compute',
  ]);
  const [hasChanges, setHasChanges] = useState(false);

  // Get configuration for current environment
  const config = useMemo(() => {
    return environments[environment === 'staging' ? 'staging' : environment];
  }, [environments, environment]);

  // Get base configuration (dev)
  const baseConfig = useMemo(() => {
    return environments.dev;
  }, [environments]);

  // Calculate overrides
  const overrides = useMemo<Record<string, ConfigOverride>>(() => {
    // In a real implementation, this would come from the environment config
    // For now, we'll compare with base config
    const result: Record<string, ConfigOverride> = {};

    // Compare instance sizes
    if (config.instanceSizes && baseConfig.instanceSizes) {
      for (const [key, value] of Object.entries(config.instanceSizes)) {
        if (baseConfig.instanceSizes[key] !== value) {
          result[`compute.${key}`] = {
            path: `compute.${key}`,
            originalValue: baseConfig.instanceSizes[key],
            overrideValue: value,
            modifiedBy: 'system',
            modifiedAt: new Date(),
          };
        }
      }
    }

    // Compare replica counts
    if (config.replicaCounts && baseConfig.replicaCounts) {
      for (const [key, value] of Object.entries(config.replicaCounts)) {
        if (baseConfig.replicaCounts[key] !== value) {
          result[`compute.replicas.${key}`] = {
            path: `compute.replicas.${key}`,
            originalValue: baseConfig.replicaCounts[key],
            overrideValue: value,
            modifiedBy: 'system',
            modifiedAt: new Date(),
          };
        }
      }
    }

    return result;
  }, [config, baseConfig]);

  // Calculate cost delta
  const costDelta = useMemo<CostDelta | null>(() => {
    // Simplified cost calculation
    const baseCost = 100; // Would be calculated from base config
    const overrideCost = Object.keys(overrides).length * 15; // Simplified

    return {
      baseCost,
      effectiveCost: baseCost + overrideCost,
      delta: overrideCost,
      percentChange: (overrideCost / baseCost) * 100,
      breakdown: [
        {
          category: 'compute',
          baseCost: 60,
          newCost: 60 + overrideCost,
          delta: overrideCost,
        },
      ],
    };
  }, [overrides]);

  // Handle section expand
  const handleSectionToggle = useCallback((section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  }, []);

  // Handle override change
  const handleOverride = useCallback(
    (path: string, value: unknown) => {
      // Update environment config
      const parts = path.split('.');
      const category = parts[0];

      if (category === 'compute' && parts.length > 1) {
        if (parts[1] === 'replicas' && parts[2]) {
          updateEnvironmentConfig(environment, {
            replicaCounts: {
              ...config.replicaCounts,
              [parts[2]]: value as number,
            },
          });
        } else {
          updateEnvironmentConfig(environment, {
            instanceSizes: {
              ...config.instanceSizes,
              [parts[1]]: value as string,
            },
          });
        }
      }

      setHasChanges(true);
      onOverrideChange?.(path, value);
    },
    [environment, config, updateEnvironmentConfig, onOverrideChange]
  );

  // Handle revert
  const handleRevert = useCallback(
    (path: string) => {
      const parts = path.split('.');
      const originalValue = overrides[path]?.originalValue;

      if (originalValue !== undefined) {
        handleOverride(path, originalValue);
      }
    },
    [overrides, handleOverride]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    await onSave?.();
    setHasChanges(false);
  }, [onSave]);

  // Configuration sections
  const sections = [
    {
      id: 'compute',
      title: 'Compute Resources',
      icon: <ComputeIcon />,
      fields: [
        {
          path: 'compute.instanceType',
          label: 'Instance Type',
          value: config.instanceSizes?.default || 't3.medium',
        },
        {
          path: 'compute.replicas.default',
          label: 'Replica Count',
          value: config.replicaCounts?.default || 2,
        },
      ],
    },
    {
      id: 'database',
      title: 'Database Configuration',
      icon: <DatabaseIcon />,
      fields: [
        {
          path: 'database.instanceClass',
          label: 'Instance Class',
          value: 'db.t3.medium',
        },
        { path: 'database.storageSize', label: 'Storage Size (GB)', value: 100 },
        { path: 'database.multiAZ', label: 'Multi-AZ', value: environment === 'prod' },
      ],
    },
    {
      id: 'network',
      title: 'Network Settings',
      icon: <NetworkIcon />,
      fields: [
        { path: 'network.enableNAT', label: 'NAT Gateway', value: true },
        { path: 'network.enableVPN', label: 'VPN Connection', value: environment === 'prod' },
      ],
    },
    {
      id: 'storage',
      title: 'Storage Configuration',
      icon: <StorageIcon />,
      fields: [
        { path: 'storage.type', label: 'Storage Type', value: 'gp3' },
        { path: 'storage.encrypted', label: 'Encryption', value: true },
      ],
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" gutterBottom={false}>
            {ENVIRONMENT_DISPLAY_NAMES[environment]} Configuration
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {Object.keys(overrides).length} override(s) from base
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {comparisonEnvironment && (
            <Button
              startIcon={<CompareIcon />}
              variant="outlined"
              size="small"
            >
              Compare with {ENVIRONMENT_DISPLAY_NAMES[comparisonEnvironment]}
            </Button>
          )}

          {!readOnly && hasChanges && (
            <Button
              startIcon={
                isSaving ? (
                  <CircularProgress size={16} />
                ) : (
                  <SaveIcon />
                )
              }
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={isSaving}
            >
              Save Changes
            </Button>
          )}
        </Box>
      </Box>

      {/* Warning for production */}
      {environment === 'prod' && !readOnly && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You are editing <strong>production</strong> configuration. Changes may
          require approval before deployment.
        </Alert>
      )}

      {/* Configuration sections */}
      {sections.map((section) => (
        <Accordion
          key={section.id}
          expanded={expandedSections.includes(section.id)}
          onChange={() => handleSectionToggle(section.id)}
          sx={{
            '&:before': { display: 'none' },
            mb: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            '&:first-of-type': { borderRadius: 1 },
            '&:last-of-type': { borderRadius: 1 },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: 'background.default',
              '& .MuiAccordionSummary-content': {
                alignItems: 'center',
                gap: 1,
              },
            }}
          >
            {section.icon}
            <Typography variant="subtitle2">{section.title}</Typography>
            {section.fields.some((f) => overrides[f.path]) && (
              <Chip
                label={`${section.fields.filter((f) => overrides[f.path]).length} override(s)`}
                size="small"
                color="warning"
                sx={{
                  height: 20,
                  '& .MuiChip-label': { px: 1, fontSize: 10 },
                }}
              />
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {section.fields.map((field) => (
              <ConfigField
                key={field.path}
                path={field.path}
                label={field.label}
                value={field.value}
                baseValue={
                  overrides[field.path]?.originalValue ?? field.value
                }
                isOverride={!!overrides[field.path]}
                readOnly={readOnly}
                onOverride={handleOverride}
                onRevert={handleRevert}
              />
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Cost comparison */}
      {showCost && costDelta && (
        <Box sx={{ mt: 2 }}>
          <CostComparison costDelta={costDelta} />
        </Box>
      )}
    </Box>
  );
}

export default EnvironmentConfigPanel;
