/**
 * Monitoring & Observability Step Component
 * Configure CloudWatch, logging, metrics, alarms, tracing, and dashboards
 */

import React, { useCallback, useState } from 'react';
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
  FormControlLabel,
  Switch,
  Slider,
  Chip,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  CloudQueue as CloudIcon,
  Notifications as AlarmIcon,
  Speed as MetricIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  MonitoringConfig,
  LogGroupConfig,
  AlarmConfig,
  DashboardConfig,
  DashboardWidget,
  AlarmStatistic,
  AlarmComparison,
  LOG_RETENTION_OPTIONS,
  ALARM_PRESETS,
} from '../../../../../types/devops';
import { ValidationError, Tag } from '../../../../../types/network';

interface MonitoringObservabilityStepProps {
  monitoring: MonitoringConfig;
  onChange: (config: MonitoringConfig) => void;
  errors: ValidationError[];
  onValidate?: (errors: ValidationError[]) => void;
}

export function MonitoringObservabilityStep({
  monitoring,
  onChange,
  errors,
  onValidate,
}: MonitoringObservabilityStepProps) {
  const [expandedPanel, setExpandedPanel] = useState<string | false>('log-groups');
  const [alarmDialogOpen, setAlarmDialogOpen] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<AlarmConfig | null>(null);
  const [logGroupDialogOpen, setLogGroupDialogOpen] = useState(false);
  const [editingLogGroup, setEditingLogGroup] = useState<LogGroupConfig | null>(null);

  const handlePanelChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Log Group handlers
  const handleAddLogGroup = useCallback(() => {
    const newLogGroup: LogGroupConfig = {
      id: uuid(),
      name: '/aws/service/new-service',
      serviceName: 'new-service',
      retentionDays: 30,
      tags: [],
    };
    setEditingLogGroup(newLogGroup);
    setLogGroupDialogOpen(true);
  }, []);

  const handleSaveLogGroup = useCallback(
    (logGroup: LogGroupConfig) => {
      const exists = monitoring.logGroups.find((lg) => lg.id === logGroup.id);
      if (exists) {
        onChange({
          ...monitoring,
          logGroups: monitoring.logGroups.map((lg) =>
            lg.id === logGroup.id ? logGroup : lg
          ),
        });
      } else {
        onChange({
          ...monitoring,
          logGroups: [...monitoring.logGroups, logGroup],
        });
      }
      setLogGroupDialogOpen(false);
      setEditingLogGroup(null);
    },
    [monitoring, onChange]
  );

  const handleDeleteLogGroup = useCallback(
    (id: string) => {
      onChange({
        ...monitoring,
        logGroups: monitoring.logGroups.filter((lg) => lg.id !== id),
      });
    },
    [monitoring, onChange]
  );

  // Alarm handlers
  const handleAddAlarm = useCallback(() => {
    const newAlarm: AlarmConfig = {
      id: uuid(),
      name: '',
      description: '',
      metricName: 'CPUUtilization',
      metricNamespace: 'AWS/ECS',
      statistic: 'Average',
      period: 300,
      evaluationPeriods: 2,
      threshold: 80,
      comparisonOperator: 'GreaterThanThreshold',
      actions: [],
      enabled: true,
    };
    setEditingAlarm(newAlarm);
    setAlarmDialogOpen(true);
  }, []);

  const handleAddPresetAlarm = useCallback(
    (preset: typeof ALARM_PRESETS[0]) => {
      const newAlarm: AlarmConfig = {
        id: uuid(),
        name: `${preset.metric}-alarm`,
        description: `Alert when ${preset.metric} exceeds ${preset.threshold}${preset.unit}`,
        metricName: preset.metric,
        metricNamespace: preset.namespace,
        statistic: 'Average',
        period: 300,
        evaluationPeriods: 2,
        threshold: preset.threshold,
        comparisonOperator: preset.comparison,
        actions: [],
        enabled: true,
      };
      onChange({
        ...monitoring,
        alarms: [...monitoring.alarms, newAlarm],
      });
    },
    [monitoring, onChange]
  );

  const handleSaveAlarm = useCallback(
    (alarm: AlarmConfig) => {
      const exists = monitoring.alarms.find((a) => a.id === alarm.id);
      if (exists) {
        onChange({
          ...monitoring,
          alarms: monitoring.alarms.map((a) => (a.id === alarm.id ? alarm : a)),
        });
      } else {
        onChange({
          ...monitoring,
          alarms: [...monitoring.alarms, alarm],
        });
      }
      setAlarmDialogOpen(false);
      setEditingAlarm(null);
    },
    [monitoring, onChange]
  );

  const handleDeleteAlarm = useCallback(
    (id: string) => {
      onChange({
        ...monitoring,
        alarms: monitoring.alarms.filter((a) => a.id !== id),
      });
    },
    [monitoring, onChange]
  );

  const handleToggleAlarm = useCallback(
    (id: string) => {
      onChange({
        ...monitoring,
        alarms: monitoring.alarms.map((a) =>
          a.id === id ? { ...a, enabled: !a.enabled } : a
        ),
      });
    },
    [monitoring, onChange]
  );

  // Tracing handlers
  const handleTracingChange = useCallback(
    (field: keyof MonitoringConfig['tracing'], value: unknown) => {
      onChange({
        ...monitoring,
        tracing: {
          ...monitoring.tracing,
          [field]: value,
        },
      });
    },
    [monitoring, onChange]
  );

  // Dashboard handlers
  const handleAddDashboard = useCallback(() => {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: uuid(),
        type: 'metric',
        title: 'CPU Utilization',
        width: 6,
        height: 6,
        x: 0,
        y: 0,
        properties: { metricName: 'CPUUtilization', stat: 'Average' },
      },
      {
        id: uuid(),
        type: 'metric',
        title: 'Memory Utilization',
        width: 6,
        height: 6,
        x: 6,
        y: 0,
        properties: { metricName: 'MemoryUtilization', stat: 'Average' },
      },
      {
        id: uuid(),
        type: 'alarm',
        title: 'Alarm Status',
        width: 12,
        height: 3,
        x: 0,
        y: 6,
        properties: {},
      },
    ];

    const newDashboard: DashboardConfig = {
      id: uuid(),
      name: `Dashboard-${monitoring.dashboards.length + 1}`,
      widgets: defaultWidgets,
    };
    onChange({
      ...monitoring,
      dashboards: [...monitoring.dashboards, newDashboard],
    });
  }, [monitoring, onChange]);

  const handleDeleteDashboard = useCallback(
    (id: string) => {
      onChange({
        ...monitoring,
        dashboards: monitoring.dashboards.filter((d) => d.id !== id),
      });
    },
    [monitoring, onChange]
  );

  // Get errors for specific paths
  const getFieldErrors = (path: string) =>
    errors.filter((e) => e.path?.includes(path));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Monitoring & Observability
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure CloudWatch logging, metrics, alarms, distributed tracing, and dashboards.
      </Typography>

      {errors.filter((e) => e.severity === 'error').length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.filter((e) => e.severity === 'error').length} configuration error(s) found.
        </Alert>
      )}

      {/* Log Groups Section */}
      <Accordion
        expanded={expandedPanel === 'log-groups'}
        onChange={handlePanelChange('log-groups')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudIcon />
            <Typography>Log Groups</Typography>
            <Chip
              size="small"
              label={`${monitoring.logGroups.length} configured`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddLogGroup}
            >
              Add Log Group
            </Button>
          </Box>

          {monitoring.logGroups.length === 0 ? (
            <Alert severity="info">
              No log groups configured. Add log groups to enable centralized logging.
            </Alert>
          ) : (
            <List dense>
              {monitoring.logGroups.map((lg) => (
                <ListItem
                  key={lg.id}
                  sx={{
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={lg.name}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip size="small" label={lg.serviceName} />
                        <Typography variant="caption">
                          Retention: {LOG_RETENTION_OPTIONS.find((o) => o.value === lg.retentionDays)?.label || `${lg.retentionDays} days`}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingLogGroup(lg);
                        setLogGroupDialogOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteLogGroup(lg.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Alarms Section */}
      <Accordion
        expanded={expandedPanel === 'alarms'}
        onChange={handlePanelChange('alarms')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlarmIcon />
            <Typography>Alarms</Typography>
            <Chip
              size="small"
              label={`${monitoring.alarms.filter((a) => a.enabled).length} active`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Add Preset Alarms:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {ALARM_PRESETS.map((preset) => (
                <Chip
                  key={preset.metric}
                  label={`${preset.metric} > ${preset.threshold}${preset.unit}`}
                  onClick={() => handleAddPresetAlarm(preset)}
                  variant="outlined"
                  size="small"
                  clickable
                />
              ))}
            </Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddAlarm}
            >
              Add Custom Alarm
            </Button>
          </Box>

          {monitoring.alarms.length === 0 ? (
            <Alert severity="info">
              No alarms configured. Add alarms to get notified of issues.
            </Alert>
          ) : (
            <List dense>
              {monitoring.alarms.map((alarm) => (
                <ListItem
                  key={alarm.id}
                  sx={{
                    bgcolor: alarm.enabled ? 'background.paper' : 'action.disabledBackground',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{alarm.name || 'Unnamed Alarm'}</Typography>
                        {!alarm.enabled && <Chip size="small" label="Disabled" color="default" />}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption">
                        {alarm.metricName} {alarm.comparisonOperator.replace(/([A-Z])/g, ' $1').trim()} {alarm.threshold}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={alarm.enabled}
                          onChange={() => handleToggleAlarm(alarm.id)}
                        />
                      }
                      label=""
                    />
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingAlarm(alarm);
                        setAlarmDialogOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteAlarm(alarm.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Tracing Section */}
      <Accordion
        expanded={expandedPanel === 'tracing'}
        onChange={handlePanelChange('tracing')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MetricIcon />
            <Typography>Distributed Tracing</Typography>
            <Chip
              size="small"
              label={monitoring.tracing.enabled ? 'Enabled' : 'Disabled'}
              color={monitoring.tracing.enabled ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={monitoring.tracing.enabled}
                    onChange={(e) => handleTracingChange('enabled', e.target.checked)}
                  />
                }
                label="Enable AWS X-Ray Tracing"
              />
            </Grid>
            {monitoring.tracing.enabled && (
              <>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Sampling Rate: {(monitoring.tracing.samplingRate * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={monitoring.tracing.samplingRate * 100}
                    onChange={(_, value) => handleTracingChange('samplingRate', (value as number) / 100)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v}%`}
                    step={1}
                    min={1}
                    max={100}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Higher sampling rates provide more visibility but increase costs.
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={monitoring.tracing.serviceMapEnabled}
                        onChange={(e) => handleTracingChange('serviceMapEnabled', e.target.checked)}
                      />
                    }
                    label="Enable Service Map"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Dashboards Section */}
      <Accordion
        expanded={expandedPanel === 'dashboards'}
        onChange={handlePanelChange('dashboards')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DashboardIcon />
            <Typography>Dashboards</Typography>
            <Chip
              size="small"
              label={`${monitoring.dashboards.length} configured`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddDashboard}
            >
              Add Dashboard
            </Button>
          </Box>

          {monitoring.dashboards.length === 0 ? (
            <Alert severity="info">
              No dashboards configured. Add a dashboard to visualize your metrics.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {monitoring.dashboards.map((dashboard) => (
                <Grid item xs={12} md={6} key={dashboard.id}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2">{dashboard.name}</Typography>
                      <Box>
                        <Tooltip title="Preview Dashboard">
                          <IconButton size="small">
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleDeleteDashboard(dashboard.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {dashboard.widgets.length} widgets
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {dashboard.widgets.map((w) => (
                        <Chip key={w.id} size="small" label={w.type} variant="outlined" />
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Warnings */}
      {errors.filter((e) => e.severity === 'warning').length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Warnings:</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors
              .filter((e) => e.severity === 'warning')
              .map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
          </ul>
        </Alert>
      )}

      {/* Log Group Dialog */}
      <Dialog
        open={logGroupDialogOpen}
        onClose={() => {
          setLogGroupDialogOpen(false);
          setEditingLogGroup(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingLogGroup && monitoring.logGroups.find((lg) => lg.id === editingLogGroup.id)
            ? 'Edit Log Group'
            : 'Add Log Group'}
        </DialogTitle>
        <DialogContent>
          {editingLogGroup && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Log Group Name"
                  value={editingLogGroup.name}
                  onChange={(e) =>
                    setEditingLogGroup({ ...editingLogGroup, name: e.target.value })
                  }
                  placeholder="/aws/ecs/my-service"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Service Name"
                  value={editingLogGroup.serviceName}
                  onChange={(e) =>
                    setEditingLogGroup({ ...editingLogGroup, serviceName: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Retention Period</InputLabel>
                  <Select
                    value={editingLogGroup.retentionDays}
                    label="Retention Period"
                    onChange={(e) =>
                      setEditingLogGroup({
                        ...editingLogGroup,
                        retentionDays: e.target.value as number,
                      })
                    }
                  >
                    {LOG_RETENTION_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setLogGroupDialogOpen(false);
              setEditingLogGroup(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => editingLogGroup && handleSaveLogGroup(editingLogGroup)}
            disabled={!editingLogGroup?.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alarm Dialog */}
      <Dialog
        open={alarmDialogOpen}
        onClose={() => {
          setAlarmDialogOpen(false);
          setEditingAlarm(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAlarm && monitoring.alarms.find((a) => a.id === editingAlarm.id)
            ? 'Edit Alarm'
            : 'Add Alarm'}
        </DialogTitle>
        <DialogContent>
          {editingAlarm && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Alarm Name"
                  value={editingAlarm.name}
                  onChange={(e) =>
                    setEditingAlarm({ ...editingAlarm, name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  value={editingAlarm.description}
                  onChange={(e) =>
                    setEditingAlarm({ ...editingAlarm, description: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Metric Name"
                  value={editingAlarm.metricName}
                  onChange={(e) =>
                    setEditingAlarm({ ...editingAlarm, metricName: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Metric Namespace"
                  value={editingAlarm.metricNamespace}
                  onChange={(e) =>
                    setEditingAlarm({ ...editingAlarm, metricNamespace: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Statistic</InputLabel>
                  <Select
                    value={editingAlarm.statistic}
                    label="Statistic"
                    onChange={(e) =>
                      setEditingAlarm({
                        ...editingAlarm,
                        statistic: e.target.value as AlarmStatistic,
                      })
                    }
                  >
                    <MenuItem value="Average">Average</MenuItem>
                    <MenuItem value="Sum">Sum</MenuItem>
                    <MenuItem value="Minimum">Minimum</MenuItem>
                    <MenuItem value="Maximum">Maximum</MenuItem>
                    <MenuItem value="SampleCount">Sample Count</MenuItem>
                    <MenuItem value="p99">p99</MenuItem>
                    <MenuItem value="p95">p95</MenuItem>
                    <MenuItem value="p90">p90</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Comparison</InputLabel>
                  <Select
                    value={editingAlarm.comparisonOperator}
                    label="Comparison"
                    onChange={(e) =>
                      setEditingAlarm({
                        ...editingAlarm,
                        comparisonOperator: e.target.value as AlarmComparison,
                      })
                    }
                  >
                    <MenuItem value="GreaterThanThreshold">&gt; Greater Than</MenuItem>
                    <MenuItem value="GreaterThanOrEqualToThreshold">&gt;= Greater Than or Equal</MenuItem>
                    <MenuItem value="LessThanThreshold">&lt; Less Than</MenuItem>
                    <MenuItem value="LessThanOrEqualToThreshold">&lt;= Less Than or Equal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Threshold"
                  value={editingAlarm.threshold}
                  onChange={(e) =>
                    setEditingAlarm({
                      ...editingAlarm,
                      threshold: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Period (seconds)"
                  value={editingAlarm.period}
                  onChange={(e) =>
                    setEditingAlarm({
                      ...editingAlarm,
                      period: parseInt(e.target.value) || 300,
                    })
                  }
                  inputProps={{ min: 60, step: 60 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Evaluation Periods"
                  value={editingAlarm.evaluationPeriods}
                  onChange={(e) =>
                    setEditingAlarm({
                      ...editingAlarm,
                      evaluationPeriods: parseInt(e.target.value) || 1,
                    })
                  }
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAlarmDialogOpen(false);
              setEditingAlarm(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => editingAlarm && handleSaveAlarm(editingAlarm)}
            disabled={!editingAlarm?.name || !editingAlarm?.metricName}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MonitoringObservabilityStep;
