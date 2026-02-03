/**
 * EnvironmentDiff Component
 * Visual comparison of configurations between environments
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  ArrowForward as ArrowIcon,
  ArrowBack as ArrowBackIcon,
  Download as ExportIcon,
  Sync as SyncIcon,
  FilterList as FilterIcon,
  CompareArrows as CompareIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as ModifyIcon,
} from '@mui/icons-material';

import {
  Environment,
  EnvironmentDiffProps,
  DiffEntry,
  DiffResult,
  DiffFilter,
  DiffType,
  ENVIRONMENT_COLORS,
  ENVIRONMENT_DISPLAY_NAMES,
} from './types';
import {
  calculateDiff,
  filterDiff,
  formatValueForDisplay,
  getDiffColor,
  getDiffIcon,
  exportDiffAsJson,
} from './utils';
import { useDesignWizard } from '../../../contexts/DesignWizardContext';

/**
 * Get diff type icon
 */
function getDiffTypeIcon(type: DiffType) {
  switch (type) {
    case 'added':
      return <AddIcon sx={{ fontSize: 16 }} />;
    case 'removed':
      return <RemoveIcon sx={{ fontSize: 16 }} />;
    case 'modified':
      return <ModifyIcon sx={{ fontSize: 16 }} />;
    default:
      return null;
  }
}

/**
 * Diff entry row component
 */
interface DiffRowProps {
  entry: DiffEntry;
  onSync?: (path: string, direction: 'toSource' | 'toTarget') => void;
}

function DiffRow({ entry, onSync }: DiffRowProps) {
  const color = getDiffColor(entry.type);

  return (
    <TableRow
      sx={{
        '&:hover': {
          bgcolor: alpha(color, 0.05),
        },
      }}
    >
      {/* Path */}
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={entry.category}
            size="small"
            sx={{
              height: 20,
              '& .MuiChip-label': { px: 1, fontSize: 10, textTransform: 'uppercase' },
            }}
          />
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {entry.displayName}
          </Typography>
        </Box>
      </TableCell>

      {/* Source value */}
      <TableCell>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: entry.type === 'added' ? color : 'text.primary',
          }}
        >
          {entry.type === 'added' && getDiffTypeIcon('added')}
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              textDecoration: entry.type === 'removed' ? 'line-through' : 'none',
              opacity: entry.type === 'removed' ? 0.6 : 1,
            }}
          >
            {formatValueForDisplay(entry.sourceValue)}
          </Typography>
        </Box>
      </TableCell>

      {/* Arrow */}
      <TableCell align="center" sx={{ width: 60 }}>
        {entry.type !== 'unchanged' && (
          <ArrowIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
        )}
      </TableCell>

      {/* Target value */}
      <TableCell>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: entry.type === 'removed' ? color : 'text.primary',
          }}
        >
          {entry.type === 'removed' && getDiffTypeIcon('removed')}
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontWeight: entry.type === 'modified' ? 600 : 400,
            }}
          >
            {formatValueForDisplay(entry.targetValue)}
          </Typography>
        </Box>
      </TableCell>

      {/* Type indicator */}
      <TableCell align="center" sx={{ width: 100 }}>
        <Chip
          icon={getDiffTypeIcon(entry.type) || undefined}
          label={entry.type}
          size="small"
          sx={{
            bgcolor: alpha(color, 0.1),
            color,
            border: 1,
            borderColor: color,
            height: 24,
            '& .MuiChip-label': { px: 1, fontSize: 11 },
            '& .MuiChip-icon': { color },
          }}
        />
      </TableCell>

      {/* Actions */}
      <TableCell align="right" sx={{ width: 100 }}>
        {onSync && entry.type !== 'unchanged' && (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Tooltip title="Copy to Source">
              <IconButton
                size="small"
                onClick={() => onSync(entry.path, 'toSource')}
              >
                <ArrowBackIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy to Target">
              <IconButton
                size="small"
                onClick={() => onSync(entry.path, 'toTarget')}
              >
                <ArrowIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </TableCell>
    </TableRow>
  );
}

export function EnvironmentDiff({
  sourceEnvironment: initialSource = 'dev',
  targetEnvironment: initialTarget = 'prod',
  filter: initialFilter = 'all',
  onSync,
  onExport,
}: EnvironmentDiffProps) {
  const { environments } = useDesignWizard();

  // Local state
  const [source, setSource] = useState<Environment>(initialSource);
  const [target, setTarget] = useState<Environment>(initialTarget);
  const [filter, setFilter] = useState<DiffFilter>(initialFilter);
  const [isCalculating, setIsCalculating] = useState(false);

  // Available environments
  const availableEnvironments: Environment[] = ['dev', 'staging', 'prod'];

  // Mock diff result for demonstration
  // In a real implementation, this would use actual environment configs
  const diffResult = useMemo<DiffResult>(() => {
    // Create mock environment configs
    const sourceConfig = {
      metadata: {
        id: source,
        name: source,
        displayName: ENVIRONMENT_DISPLAY_NAMES[source],
        color: ENVIRONMENT_COLORS[source],
        status: 'healthy' as const,
        isProtected: source === 'prod',
        approvalRequired: source === 'prod',
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        resourceCount: 0,
      },
      baseConfig: {
        compute: {
          instanceType: source === 'prod' ? 't3.xlarge' : 't3.medium',
          replicas: source === 'prod' ? 6 : 2,
          autoScaling: {
            enabled: source === 'prod',
            minReplicas: 2,
            maxReplicas: 10,
            targetCPU: 70,
          },
          resources: {
            cpu: source === 'prod' ? '2' : '1',
            memory: source === 'prod' ? '4Gi' : '2Gi',
          },
        },
        database: {
          instanceClass: source === 'prod' ? 'db.r5.large' : 'db.t3.medium',
          storageSize: source === 'prod' ? 500 : 100,
          storageType: 'gp3',
          multiAZ: source === 'prod',
          readReplicas: source === 'prod' ? 2 : 0,
          backupRetention: source === 'prod' ? 30 : 7,
        },
        network: {
          enableNAT: true,
          enableVPN: source === 'prod',
          enablePrivateLink: source === 'prod',
          vpcEndpoints: source === 'prod' ? ['s3', 'dynamodb', 'sqs'] : ['s3'],
        },
      },
      overrides: {},
      variables: [],
      costEstimate: {
        monthly: source === 'prod' ? 850 : 150,
        breakdown: {
          compute: source === 'prod' ? 400 : 80,
          database: source === 'prod' ? 350 : 50,
          network: source === 'prod' ? 80 : 15,
          storage: source === 'prod' ? 20 : 5,
          other: 0,
        },
        currency: 'USD',
        lastCalculated: new Date(),
      },
    };

    const targetConfig = {
      metadata: {
        id: target,
        name: target,
        displayName: ENVIRONMENT_DISPLAY_NAMES[target],
        color: ENVIRONMENT_COLORS[target],
        status: 'healthy' as const,
        isProtected: target === 'prod',
        approvalRequired: target === 'prod',
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        resourceCount: 0,
      },
      baseConfig: {
        compute: {
          instanceType: target === 'prod' ? 't3.xlarge' : 't3.medium',
          replicas: target === 'prod' ? 6 : 2,
          autoScaling: {
            enabled: target === 'prod',
            minReplicas: 2,
            maxReplicas: 10,
            targetCPU: 70,
          },
          resources: {
            cpu: target === 'prod' ? '2' : '1',
            memory: target === 'prod' ? '4Gi' : '2Gi',
          },
        },
        database: {
          instanceClass: target === 'prod' ? 'db.r5.large' : 'db.t3.medium',
          storageSize: target === 'prod' ? 500 : 100,
          storageType: 'gp3',
          multiAZ: target === 'prod',
          readReplicas: target === 'prod' ? 2 : 0,
          backupRetention: target === 'prod' ? 30 : 7,
        },
        network: {
          enableNAT: true,
          enableVPN: target === 'prod',
          enablePrivateLink: target === 'prod',
          vpcEndpoints: target === 'prod' ? ['s3', 'dynamodb', 'sqs'] : ['s3'],
        },
      },
      overrides: {},
      variables: [],
      costEstimate: {
        monthly: target === 'prod' ? 850 : 150,
        breakdown: {
          compute: target === 'prod' ? 400 : 80,
          database: target === 'prod' ? 350 : 50,
          network: target === 'prod' ? 80 : 15,
          storage: target === 'prod' ? 20 : 5,
          other: 0,
        },
        currency: 'USD',
        lastCalculated: new Date(),
      },
    };

    return calculateDiff(sourceConfig, targetConfig);
  }, [source, target]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return filterDiff(diffResult, filter);
  }, [diffResult, filter]);

  // Handle swap environments
  const handleSwap = useCallback(() => {
    setSource(target);
    setTarget(source);
  }, [source, target]);

  // Handle export
  const handleExport = useCallback(
    (format: 'json' | 'pdf') => {
      if (format === 'json') {
        const json = exportDiffAsJson(diffResult);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diff-${source}-${target}-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      onExport?.(format);
    },
    [diffResult, source, target, onExport]
  );

  // Handle sync
  const handleSync = useCallback(
    (path: string, direction: 'toSource' | 'toTarget') => {
      onSync?.(path, direction);
    },
    [onSync]
  );

  return (
    <Box>
      {/* Header */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {/* Environment selectors */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={source}
                label="Source"
                onChange={(e) => setSource(e.target.value as Environment)}
              >
                {availableEnvironments
                  .filter((env) => env !== target)
                  .map((env) => (
                    <MenuItem key={env} value={env}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: ENVIRONMENT_COLORS[env],
                          }}
                        />
                        {ENVIRONMENT_DISPLAY_NAMES[env]}
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <IconButton onClick={handleSwap} size="small">
              <CompareIcon />
            </IconButton>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Target</InputLabel>
              <Select
                value={target}
                label="Target"
                onChange={(e) => setTarget(e.target.value as Environment)}
              >
                {availableEnvironments
                  .filter((env) => env !== source)
                  .map((env) => (
                    <MenuItem key={env} value={env}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: ENVIRONMENT_COLORS[env],
                          }}
                        />
                        {ENVIRONMENT_DISPLAY_NAMES[env]}
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<ExportIcon />}
              variant="outlined"
              size="small"
              onClick={() => handleExport('json')}
            >
              Export
            </Button>
            {onSync && (
              <Button
                startIcon={<SyncIcon />}
                variant="contained"
                size="small"
                disabled={filteredEntries.length === 0}
              >
                Sync All
              </Button>
            )}
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <FilterIcon color="action" sx={{ fontSize: 20 }} />
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, value) => value && setFilter(value)}
            size="small"
          >
            <ToggleButton value="all">
              All ({diffResult.summary.total})
            </ToggleButton>
            <ToggleButton value="additions" sx={{ color: getDiffColor('added') }}>
              Added ({diffResult.summary.additions})
            </ToggleButton>
            <ToggleButton value="deletions" sx={{ color: getDiffColor('removed') }}>
              Removed ({diffResult.summary.deletions})
            </ToggleButton>
            <ToggleButton value="modifications" sx={{ color: getDiffColor('modified') }}>
              Modified ({diffResult.summary.modifications})
            </ToggleButton>
          </ToggleButtonGroup>

          <Divider orientation="vertical" flexItem />

          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, value) => value && setFilter(value)}
            size="small"
          >
            <ToggleButton value="compute">Compute</ToggleButton>
            <ToggleButton value="database">Database</ToggleButton>
            <ToggleButton value="network">Network</ToggleButton>
            <ToggleButton value="storage">Storage</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Summary */}
      <Alert
        severity={diffResult.summary.total > 0 ? 'info' : 'success'}
        sx={{ mb: 2 }}
      >
        {diffResult.summary.total > 0 ? (
          <>
            Found <strong>{diffResult.summary.total}</strong> difference(s)
            between {ENVIRONMENT_DISPLAY_NAMES[source]} and{' '}
            {ENVIRONMENT_DISPLAY_NAMES[target]}:{' '}
            <strong>{diffResult.summary.additions}</strong> addition(s),{' '}
            <strong>{diffResult.summary.deletions}</strong> removal(s),{' '}
            <strong>{diffResult.summary.modifications}</strong> modification(s)
          </>
        ) : (
          <>
            {ENVIRONMENT_DISPLAY_NAMES[source]} and{' '}
            {ENVIRONMENT_DISPLAY_NAMES[target]} configurations are identical
          </>
        )}
      </Alert>

      {/* Diff table */}
      {isCalculating ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredEntries.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>Property</TableCell>
                <TableCell sx={{ color: ENVIRONMENT_COLORS[source] }}>
                  {ENVIRONMENT_DISPLAY_NAMES[source]}
                </TableCell>
                <TableCell align="center"></TableCell>
                <TableCell sx={{ color: ENVIRONMENT_COLORS[target] }}>
                  {ENVIRONMENT_DISPLAY_NAMES[target]}
                </TableCell>
                <TableCell align="center">Change</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEntries.map((entry) => (
                <DiffRow
                  key={entry.path}
                  entry={entry}
                  onSync={onSync ? handleSync : undefined}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No differences found with current filter
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default EnvironmentDiff;
