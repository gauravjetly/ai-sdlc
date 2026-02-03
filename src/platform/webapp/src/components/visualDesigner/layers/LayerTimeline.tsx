/**
 * LayerTimeline Component
 * Historical view of deployment events with filtering
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  PlayArrow as DeployIcon,
  Undo as RollbackIcon,
  Settings as ConfigIcon,
  Check as ValidationIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Refresh as RunningIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  OpenInNew as ViewLogsIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useDesignWizard } from '../../../contexts/DesignWizardContext';
import {
  LayerType,
  DeploymentEvent,
  TimelineFilters,
  LAYER_CONFIG,
  LAYER_ORDER,
} from '../../../types/layers';

interface LayerTimelineProps {
  /** Filter to specific layer */
  filterLayer?: LayerType;
  /** Maximum events to load */
  maxEvents?: number;
  /** Whether to auto-refresh */
  autoRefresh?: boolean;
  /** Refresh interval in ms */
  refreshInterval?: number;
}

/**
 * Event type icons
 */
function EventTypeIcon({ eventType }: { eventType: DeploymentEvent['eventType'] }) {
  switch (eventType) {
    case 'deploy':
      return <DeployIcon />;
    case 'rollback':
      return <RollbackIcon />;
    case 'config_change':
      return <ConfigIcon />;
    case 'validation':
      return <ValidationIcon />;
    default:
      return <DeployIcon />;
  }
}

/**
 * Status icon
 */
function StatusIcon({ status }: { status: DeploymentEvent['status'] }) {
  switch (status) {
    case 'success':
      return <SuccessIcon color="success" fontSize="small" />;
    case 'failed':
      return <ErrorIcon color="error" fontSize="small" />;
    case 'running':
      return <RunningIcon color="warning" fontSize="small" />;
    default:
      return <PendingIcon color="disabled" fontSize="small" />;
  }
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;

  return date.toLocaleDateString();
}

/**
 * Timeline Event Item
 */
function TimelineEventItem({
  event,
  isLast,
  onViewLogs,
}: {
  event: DeploymentEvent;
  isLast: boolean;
  onViewLogs: (event: DeploymentEvent) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const layerConfig = LAYER_CONFIG[event.layerType];
  const eventDate = new Date(event.startedAt);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Timeline connector */}
      {!isLast && (
        <Box
          sx={{
            position: 'absolute',
            left: 19,
            top: 44,
            width: 2,
            height: 'calc(100% - 20px)',
            bgcolor: 'divider',
          }}
        />
      )}

      <ListItem
        alignItems="flex-start"
        sx={{
          py: 1,
          px: 0,
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha('#000', 0.02) },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Event icon with layer color */}
        <ListItemIcon sx={{ mt: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: alpha(layerConfig.color, 0.15),
              color: layerConfig.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${layerConfig.color}`,
            }}
          >
            <EventTypeIcon eventType={event.eventType} />
          </Box>
        </ListItemIcon>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {event.eventType.replace('_', ' ').toUpperCase()}
              </Typography>
              <Chip
                label={event.layerType}
                size="small"
                sx={{
                  bgcolor: alpha(layerConfig.color, 0.1),
                  color: layerConfig.color,
                  fontWeight: 500,
                  fontSize: '0.7rem',
                }}
              />
              <StatusIcon status={event.status} />
              {event.duration && (
                <Chip
                  icon={<TimeIcon sx={{ fontSize: 14 }} />}
                  label={formatDuration(event.duration)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <PersonIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption">{event.initiatedBy}</Typography>
                <Typography variant="caption">|</Typography>
                <Typography variant="caption">{formatRelativeTime(eventDate)}</Typography>
                <Typography variant="caption">|</Typography>
                <Chip
                  label={event.environment}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              </Box>
              {event.error && (
                <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                  Error: {event.error}
                </Typography>
              )}
            </Box>
          }
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {event.logs && event.logs.length > 0 && (
            <Tooltip title="View logs">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLogs(event);
                }}
              >
                <ViewLogsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small">
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </Box>
      </ListItem>

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Box
          sx={{
            ml: 7,
            mb: 2,
            p: 2,
            bgcolor: alpha('#000', 0.02),
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Event Details
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Started
              </Typography>
              <Typography variant="body2">{eventDate.toLocaleString()}</Typography>
            </Box>

            {event.completedAt && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Completed
                </Typography>
                <Typography variant="body2">
                  {new Date(event.completedAt).toLocaleString()}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary">
                Environment
              </Typography>
              <Typography variant="body2">{event.environment}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={event.status}
                size="small"
                color={
                  event.status === 'success'
                    ? 'success'
                    : event.status === 'failed'
                    ? 'error'
                    : event.status === 'running'
                    ? 'warning'
                    : 'default'
                }
              />
            </Box>
          </Box>

          {event.terraformOutput && Object.keys(event.terraformOutput).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Terraform Outputs
              </Typography>
              <Box
                sx={{
                  p: 1,
                  bgcolor: '#1e1e1e',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: '#E0E0E0',
                  maxHeight: 150,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(event.terraformOutput, null, 2)}
              </Box>
            </Box>
          )}

          {event.logs && event.logs.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Recent Logs ({event.logs.length} entries)
              </Typography>
              <Box
                sx={{
                  p: 1,
                  bgcolor: '#1e1e1e',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  color: '#E0E0E0',
                  maxHeight: 150,
                  overflow: 'auto',
                }}
              >
                {event.logs.slice(-10).map((log, i) => (
                  <Box key={i}>{log}</Box>
                ))}
                {event.logs.length > 10 && (
                  <Box sx={{ color: '#9E9E9E', mt: 1 }}>
                    ... and {event.logs.length - 10} more lines
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * Timeline Filters
 */
function TimelineFiltersPanel({
  filters,
  onFilterChange,
}: {
  filters: TimelineFilters;
  onFilterChange: (filters: TimelineFilters) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        p: 2,
        bgcolor: alpha('#000', 0.02),
        borderRadius: 1,
        flexWrap: 'wrap',
      }}
    >
      {/* Layer Filter */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Layer</InputLabel>
        <Select
          multiple
          value={filters.layers}
          label="Layer"
          onChange={(e) =>
            onFilterChange({ ...filters, layers: e.target.value as LayerType[] })
          }
        >
          {LAYER_ORDER.map((layer) => (
            <MenuItem key={layer} value={layer}>
              {LAYER_CONFIG[layer].title.replace(' Layer', '')}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Event Type Filter */}
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Event Type</InputLabel>
        <Select
          multiple
          value={filters.eventTypes}
          label="Event Type"
          onChange={(e) =>
            onFilterChange({
              ...filters,
              eventTypes: e.target.value as TimelineFilters['eventTypes'],
            })
          }
        >
          <MenuItem value="deploy">Deploy</MenuItem>
          <MenuItem value="rollback">Rollback</MenuItem>
          <MenuItem value="config_change">Config Change</MenuItem>
          <MenuItem value="validation">Validation</MenuItem>
        </Select>
      </FormControl>

      {/* Status Filter */}
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={filters.status || ''}
          label="Status"
          onChange={(e) =>
            onFilterChange({
              ...filters,
              status: e.target.value as TimelineFilters['status'],
            })
          }
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="success">Success</MenuItem>
          <MenuItem value="failed">Failed</MenuItem>
        </Select>
      </FormControl>

      {/* Clear Filters */}
      <Button
        size="small"
        onClick={() =>
          onFilterChange({
            layers: [],
            eventTypes: [],
            dateRange: {},
          })
        }
      >
        Clear
      </Button>
    </Box>
  );
}

/**
 * LayerTimeline main component
 */
export function LayerTimeline({
  filterLayer,
  maxEvents = 50,
  autoRefresh = true,
  refreshInterval = 30000,
}: LayerTimelineProps) {
  const { workflowId } = useDesignWizard();

  const [events, setEvents] = useState<DeploymentEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TimelineFilters>({
    layers: filterLayer ? [filterLayer] : [],
    eventTypes: [],
    dateRange: {},
  });

  // Fetch timeline events
  const fetchEvents = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: String(maxEvents),
        ...(filters.layers.length > 0 && { layers: filters.layers.join(',') }),
        ...(filters.eventTypes.length > 0 && { eventTypes: filters.eventTypes.join(',') }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await fetch(`/api/v1/workflows/${workflowId}/timeline?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch timeline');
      }

      const data = await response.json();
      setEvents(data.data?.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
      // Set mock data for development
      setEvents([
        {
          id: '1',
          layerType: 'network',
          eventType: 'deploy',
          status: 'success',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3600000 + 120000).toISOString(),
          duration: 120000,
          initiatedBy: 'user@example.com',
          environment: 'dev',
          logs: ['Initializing...', 'Creating VPC...', 'Complete'],
        },
        {
          id: '2',
          layerType: 'platform',
          eventType: 'config_change',
          status: 'success',
          startedAt: new Date(Date.now() - 1800000).toISOString(),
          completedAt: new Date(Date.now() - 1800000 + 5000).toISOString(),
          duration: 5000,
          initiatedBy: 'admin@example.com',
          environment: 'staging',
        },
        {
          id: '3',
          layerType: 'devops',
          eventType: 'deploy',
          status: 'failed',
          startedAt: new Date(Date.now() - 900000).toISOString(),
          completedAt: new Date(Date.now() - 900000 + 60000).toISOString(),
          duration: 60000,
          initiatedBy: 'user@example.com',
          environment: 'prod',
          error: 'Timeout waiting for health check',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [workflowId, maxEvents, filters]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, fetchEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filters.layers.length > 0 && !filters.layers.includes(event.layerType)) {
        return false;
      }
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.eventType)) {
        return false;
      }
      if (filters.status && event.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [events, filters]);

  const handleViewLogs = useCallback((event: DeploymentEvent) => {
    console.log('View logs for event:', event.id);
    // Would open log viewer modal
  }, []);

  return (
    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Deployment Timeline
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={`${filteredEvents.length} events`} size="small" />
          <Tooltip title={showFilters ? 'Hide filters' : 'Show filters'}>
            <IconButton size="small" onClick={() => setShowFilters(!showFilters)}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchEvents} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Filters */}
      <Collapse in={showFilters}>
        <TimelineFiltersPanel filters={filters} onFilterChange={setFilters} />
      </Collapse>

      <Divider />

      {/* Events List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error} (showing cached data)
          </Alert>
        )}

        {filteredEvents.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: 'text.secondary',
            }}
          >
            <Typography>No deployment events found</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredEvents.map((event, index) => (
              <TimelineEventItem
                key={event.id}
                event={event}
                isLast={index === filteredEvents.length - 1}
                onViewLogs={handleViewLogs}
              />
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}

export default LayerTimeline;
