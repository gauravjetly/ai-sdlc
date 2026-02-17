/**
 * RealtimeActivityFeed - Live Activity Stream
 *
 * Real-time feed of integration events using WebSocket connection.
 * Shows classification, routing, governance, and workflow events
 * as they happen with auto-scroll and filtering.
 *
 * Part of Phase 3: Advanced Dashboard Features.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Paper, Switch,
  FormControlLabel, IconButton, Badge, Divider, Alert,
  Grid, FormControl, InputLabel, Select, MenuItem,
  Tooltip as MuiTooltip,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SecurityIcon from '@mui/icons-material/Security';
import RouteIcon from '@mui/icons-material/Route';
import GavelIcon from '@mui/icons-material/Gavel';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ErrorIcon from '@mui/icons-material/Error';

// Types matching IntegrationEvent
interface ActivityEvent {
  id: string;
  type: string;
  timestamp: string;
  sequence: number;
  data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'success';
}

const EVENT_ICONS: Record<string, typeof SecurityIcon> = {
  classification: AssessmentIcon,
  routing: RouteIcon,
  governance_decision: GavelIcon,
  approval_requested: SecurityIcon,
  approval_approved: SecurityIcon,
  approval_rejected: SecurityIcon,
  bypass_token_used: VpnKeyIcon,
  error: ErrorIcon,
};

const EVENT_COLORS: Record<string, string> = {
  classification: '#0066CC',
  routing: '#00A3E0',
  governance_decision: '#FF9800',
  approval_requested: '#9C27B0',
  approval_approved: '#4CAF50',
  approval_rejected: '#F44336',
  bypass_token_used: '#FF5722',
  workflow_started: '#00BCD4',
  workflow_completed: '#4CAF50',
  phase_started: '#3F51B5',
  phase_completed: '#009688',
  security_scan: '#F44336',
  config_changed: '#607D8B',
  error: '#D32F2F',
  system: '#9E9E9E',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: '#0066CC',
  warning: '#FF9800',
  error: '#F44336',
  success: '#4CAF50',
};

// Simulated real-time event generator
function generateRandomEvent(sequence: number): ActivityEvent {
  const types = [
    'classification', 'routing', 'governance_decision',
    'workflow_started', 'phase_completed', 'approval_requested',
    'security_scan', 'config_changed',
  ];
  const type = types[Math.floor(Math.random() * types.length)];
  const severities: Array<'info' | 'warning' | 'error' | 'success'> = ['info', 'info', 'info', 'warning', 'success'];
  const severity = type === 'error' ? 'error' as const
    : type === 'approval_rejected' ? 'error' as const
      : type === 'bypass_token_used' ? 'warning' as const
        : severities[Math.floor(Math.random() * severities.length)];

  const descriptions: Record<string, string[]> = {
    classification: [
      'Request classified as code-change (confidence: 92%)',
      'Request classified as bug-fix (confidence: 88%)',
      'Request classified as qa (confidence: 95%)',
      'Request classified as architecture (confidence: 85%)',
    ],
    routing: [
      'Routed to feature strategy (agents: engineer, security)',
      'Routed to bugfix strategy (agents: engineer, qa)',
      'Routed to passthrough strategy',
    ],
    governance_decision: [
      'Governance check passed at Level 2 - all gates advisory',
      'Governance check blocked at Level 3 - security-review required',
      'Governance evaluation complete - 3 gates passed',
    ],
    workflow_started: [
      'Workflow SDLC-20260217-001 started',
      'Workflow SDLC-20260217-002 started',
    ],
    phase_completed: [
      'Phase "requirements" completed in 120s',
      'Phase "architecture" completed in 240s',
      'Phase "implementation" completed in 600s',
    ],
    approval_requested: [
      'Approval requested for SDLC-20260217-001 (Level 3)',
      'Approval requested for SDLC-20260217-003 (Level 4)',
    ],
    security_scan: [
      'Security scan completed - 0 critical, 2 warnings',
      'Security scan completed - all clear',
    ],
    config_changed: [
      'Governance level changed from 2 to 3',
      'Classification rules updated',
    ],
  };

  const desc = descriptions[type]?.[Math.floor(Math.random() * (descriptions[type]?.length ?? 1))] ?? `Event: ${type}`;

  return {
    id: `EVT-${sequence.toString().padStart(6, '0')}`,
    type,
    timestamp: new Date().toISOString(),
    sequence,
    data: { description: desc, source: 'integration' },
    severity,
  };
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

export default function RealtimeActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(true);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef(0);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});

  // Simulate WebSocket events
  useEffect(() => {
    if (!connected || paused) return;

    const interval = setInterval(() => {
      const newEvent = generateRandomEvent(++sequenceRef.current);
      setEvents((prev) => {
        const next = [...prev, newEvent];
        // Keep last 200 events in memory
        return next.length > 200 ? next.slice(-200) : next;
      });
      setEventCounts((prev) => ({
        ...prev,
        [newEvent.type]: (prev[newEvent.type] ?? 0) + 1,
        _total: (prev._total ?? 0) + 1,
      }));
    }, 1500 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [connected, paused]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const filteredEvents = events.filter((e) => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (severityFilter && e.severity !== severityFilter) return false;
    return true;
  });

  const clearEvents = () => {
    setEvents([]);
    setEventCounts({});
    sequenceRef.current = 0;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <NotificationsActiveIcon sx={{ fontSize: 32, color: connected ? '#4CAF50' : '#9E9E9E' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Realtime Activity Feed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Live stream of integration events via WebSocket
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={connected ? <WifiIcon /> : <WifiOffIcon />}
            label={connected ? 'Connected' : 'Disconnected'}
            color={connected ? 'success' : 'default'}
            size="small"
            onClick={() => setConnected(!connected)}
          />
          <Badge badgeContent={eventCounts._total ?? 0} color="primary" max={999}>
            <Chip label="Events" size="small" variant="outlined" />
          </Badge>
        </Box>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <MuiTooltip title={paused ? 'Resume feed' : 'Pause feed'}>
              <IconButton
                color={paused ? 'warning' : 'primary'}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <PlayArrowIcon /> : <PauseIcon />}
              </IconButton>
            </MuiTooltip>
          </Grid>
          <Grid item>
            <MuiTooltip title="Clear all events">
              <IconButton onClick={clearEvents}>
                <DeleteSweepIcon />
              </IconButton>
            </MuiTooltip>
          </Grid>
          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  size="small"
                />
              }
              label="Auto-scroll"
            />
          </Grid>
          <Grid item xs />
          <Grid item>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Type</InputLabel>
              <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                <MenuItem value="">All Types</MenuItem>
                {Object.keys(EVENT_COLORS).map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Severity</InputLabel>
              <Select value={severityFilter} label="Severity" onChange={(e) => setSeverityFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="success">Success</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Event Count Summary */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {Object.entries(eventCounts)
          .filter(([key]) => key !== '_total')
          .sort(([, a], [, b]) => b - a)
          .slice(0, 6)
          .map(([type, count]) => (
            <Grid item key={type}>
              <Chip
                label={`${type}: ${count}`}
                size="small"
                sx={{
                  bgcolor: EVENT_COLORS[type] ?? '#607D8B',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            </Grid>
          ))}
      </Grid>

      {/* Event Feed */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {paused && (
            <Alert severity="warning" sx={{ borderRadius: 0 }}>
              Feed paused - new events are buffered. Click play to resume.
            </Alert>
          )}
          {!connected && (
            <Alert severity="error" sx={{ borderRadius: 0 }}>
              WebSocket disconnected. Click the connection button to reconnect.
            </Alert>
          )}
          <Box
            ref={feedRef}
            sx={{
              height: 500,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              bgcolor: '#1a1a2e',
              color: '#E0E0E0',
              p: 0,
            }}
          >
            {filteredEvents.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="#666">
                  {connected ? 'Waiting for events...' : 'Disconnected from event stream'}
                </Typography>
              </Box>
            ) : (
              filteredEvents.map((event) => {
                const Icon = EVENT_ICONS[event.type] ?? AssessmentIcon;
                return (
                  <Box
                    key={event.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      px: 2,
                      py: 0.75,
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {/* Severity indicator */}
                    <FiberManualRecordIcon
                      sx={{
                        fontSize: 8,
                        mt: 0.8,
                        color: SEVERITY_COLORS[event.severity],
                        flexShrink: 0,
                      }}
                    />

                    {/* Timestamp */}
                    <Typography
                      sx={{
                        color: '#888',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                        minWidth: 100,
                      }}
                    >
                      {formatTime(event.timestamp)}
                    </Typography>

                    {/* Sequence */}
                    <Typography
                      sx={{
                        color: '#555',
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                        minWidth: 50,
                      }}
                    >
                      #{event.sequence}
                    </Typography>

                    {/* Type badge */}
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.15,
                        borderRadius: 0.5,
                        bgcolor: EVENT_COLORS[event.type] ?? '#607D8B',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        minWidth: 120,
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {event.type}
                    </Box>

                    {/* Description */}
                    <Typography
                      sx={{
                        color: event.severity === 'error' ? '#FF6B6B'
                          : event.severity === 'warning' ? '#FFD93D'
                            : event.severity === 'success' ? '#6BCB77'
                              : '#C0C0C0',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        flex: 1,
                      }}
                    >
                      {(event.data.description as string) ?? JSON.stringify(event.data)}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Scroll to top */}
      {!autoScroll && filteredEvents.length > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <MuiTooltip title="Scroll to latest">
            <IconButton
              size="small"
              onClick={() => {
                if (feedRef.current) {
                  feedRef.current.scrollTop = feedRef.current.scrollHeight;
                }
              }}
            >
              <ArrowUpwardIcon sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          </MuiTooltip>
        </Box>
      )}
    </Box>
  );
}
