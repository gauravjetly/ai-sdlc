/**
 * LayerSelector Component
 * Visual navigation between infrastructure layers with status and dependency indication
 */

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CloudQueue as NetworkIcon,
  Storage as PlatformIcon,
  Speed as DevOpsIcon,
  CheckCircle as DeployedIcon,
  RadioButtonUnchecked as PendingIcon,
  Error as FailedIcon,
  Schedule as CompleteIcon,
  ArrowForward as ArrowIcon,
  Lock as LockedIcon,
} from '@mui/icons-material';
import { useDesignWizard } from '../../../contexts/DesignWizardContext';
import {
  LayerType,
  LayerStatus,
  LAYER_CONFIG,
  LAYER_DEPENDENCIES,
  STATUS_COLORS,
} from '../../../types/layers';

interface LayerSelectorProps {
  /** Currently selected layer */
  selectedLayer?: LayerType;
  /** Handler for layer selection */
  onSelectLayer: (layer: LayerType) => void;
  /** Whether selector is in compact mode */
  compact?: boolean;
  /** Show dependency arrows */
  showDependencies?: boolean;
}

interface LayerCardProps {
  layer: LayerType;
  status: LayerStatus;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  completionPercentage: number;
  onClick: () => void;
  compact: boolean;
}

/**
 * Status Badge component
 */
function StatusBadge({ status }: { status: LayerStatus }) {
  const getStatusIcon = () => {
    switch (status) {
      case 'deployed':
        return <DeployedIcon fontSize="small" />;
      case 'complete':
        return <CompleteIcon fontSize="small" />;
      case 'failed':
        return <FailedIcon fontSize="small" />;
      default:
        return <PendingIcon fontSize="small" />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'deployed':
        return 'Deployed';
      case 'complete':
        return 'Complete';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <Chip
      icon={getStatusIcon()}
      label={getStatusLabel()}
      size="small"
      sx={{
        bgcolor: alpha(STATUS_COLORS[status], 0.15),
        color: STATUS_COLORS[status],
        fontWeight: 500,
        '& .MuiChip-icon': {
          color: STATUS_COLORS[status],
        },
      }}
    />
  );
}

/**
 * Individual Layer Card component
 */
function LayerCard({
  layer,
  status,
  isSelected,
  isDisabled,
  disabledReason,
  completionPercentage,
  onClick,
  compact,
}: LayerCardProps) {
  const theme = useTheme();
  const config = LAYER_CONFIG[layer];

  const getIcon = () => {
    switch (layer) {
      case 'network':
        return <NetworkIcon />;
      case 'platform':
        return <PlatformIcon />;
      case 'devops':
        return <DevOpsIcon />;
      default:
        return <NetworkIcon />;
    }
  };

  const cardContent = (
    <Paper
      elevation={isSelected ? 4 : 1}
      onClick={isDisabled ? undefined : onClick}
      sx={{
        p: compact ? 1.5 : 2,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        borderLeft: `4px solid ${config.color}`,
        bgcolor: isSelected ? alpha(config.color, 0.08) : 'background.paper',
        transition: 'all 0.2s ease-in-out',
        minWidth: compact ? 120 : 180,
        position: 'relative',
        '&:hover': {
          elevation: isDisabled ? 1 : 3,
          bgcolor: isDisabled ? 'background.paper' : alpha(config.color, 0.05),
        },
      }}
    >
      {/* Lock icon for disabled layers */}
      {isDisabled && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'text.disabled',
          }}
        >
          <LockedIcon fontSize="small" />
        </Box>
      )}

      {/* Layer Icon and Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: compact ? 32 : 40,
            height: compact ? 32 : 40,
            borderRadius: 1,
            bgcolor: alpha(config.color, 0.15),
            color: config.color,
          }}
        >
          {getIcon()}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant={compact ? 'body2' : 'subtitle1'}
            fontWeight={600}
            color={isDisabled ? 'text.disabled' : 'text.primary'}
          >
            {config.title.replace(' Layer', '')}
          </Typography>
          {!compact && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {config.description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Status and Progress */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mt: 1,
        }}
      >
        <StatusBadge status={status} />
        {completionPercentage > 0 && completionPercentage < 100 && (
          <Typography variant="caption" color="text.secondary">
            {completionPercentage}%
          </Typography>
        )}
      </Box>

      {/* Progress bar */}
      {completionPercentage > 0 && completionPercentage < 100 && (
        <Box
          sx={{
            mt: 1,
            height: 4,
            borderRadius: 2,
            bgcolor: alpha(config.color, 0.2),
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${completionPercentage}%`,
              height: '100%',
              bgcolor: config.color,
              transition: 'width 0.3s ease-in-out',
            }}
          />
        </Box>
      )}
    </Paper>
  );

  if (isDisabled && disabledReason) {
    return (
      <Tooltip title={disabledReason} placement="top" arrow>
        {cardContent}
      </Tooltip>
    );
  }

  return cardContent;
}

/**
 * Dependency Arrow component
 */
function DependencyArrow({ color }: { color: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1,
        color: alpha(color, 0.5),
      }}
    >
      <ArrowIcon />
    </Box>
  );
}

/**
 * LayerSelector main component
 */
export function LayerSelector({
  selectedLayer,
  onSelectLayer,
  compact = false,
  showDependencies = true,
}: LayerSelectorProps) {
  const { layers, currentLayer } = useDesignWizard();

  // Use currentLayer from context if selectedLayer not provided
  const activeLayer = selectedLayer ?? currentLayer;

  /**
   * Check if a layer can be selected based on dependencies
   */
  const canSelectLayer = useCallback(
    (layer: LayerType): { allowed: boolean; reason?: string } => {
      const deps = LAYER_DEPENDENCIES[layer] || [];

      for (const dep of deps) {
        const depStatus = layers[dep]?.status;
        if (depStatus !== 'complete' && depStatus !== 'deployed') {
          return {
            allowed: false,
            reason: `Complete the ${dep} layer first`,
          };
        }
      }

      return { allowed: true };
    },
    [layers]
  );

  /**
   * Calculate completion percentage for a layer
   */
  const getCompletionPercentage = useCallback(
    (layer: LayerType): number => {
      const layerData = layers[layer]?.data;
      const status = layers[layer]?.status;

      if (status === 'deployed') return 100;
      if (status === 'complete') return 100;
      if (!layerData || !layerData.nodes) return 0;

      // Estimate based on number of configured nodes
      const nodeCount = layerData.nodes.length;
      const expectedNodes = LAYER_CONFIG[layer].steps;

      return Math.min(Math.round((nodeCount / expectedNodes) * 100), 99);
    },
    [layers]
  );

  /**
   * Render layers with arrows
   */
  const layerOrder: LayerType[] = ['network', 'platform', 'devops'];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: compact ? 0.5 : 1,
        overflowX: 'auto',
        py: 1,
      }}
    >
      {layerOrder.map((layer, index) => {
        const status = layers[layer]?.status || 'pending';
        const { allowed, reason } = canSelectLayer(layer);
        const isSelected = activeLayer === layer;
        const completionPercentage = getCompletionPercentage(layer);

        return (
          <React.Fragment key={layer}>
            <LayerCard
              layer={layer}
              status={status}
              isSelected={isSelected}
              isDisabled={!allowed}
              disabledReason={reason}
              completionPercentage={completionPercentage}
              onClick={() => onSelectLayer(layer)}
              compact={compact}
            />
            {showDependencies && index < layerOrder.length - 1 && (
              <DependencyArrow color={LAYER_CONFIG[layerOrder[index + 1]].color} />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

export default LayerSelector;
