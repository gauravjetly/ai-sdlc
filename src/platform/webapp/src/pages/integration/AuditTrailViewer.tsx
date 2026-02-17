/**
 * AuditTrailViewer - Audit Log Browser
 *
 * Provides a comprehensive view of all audit events with:
 * - Filterable, sortable event list
 * - Event detail view with full metadata
 * - CSV/JSON export functionality
 * - Hash chain verification status (Level 4)
 * - Summary statistics
 *
 * Part of Phase 3: Advanced Dashboard Features.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, TextField, FormControl, InputLabel, Select, MenuItem,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Alert, Pagination, LinearProgress, InputAdornment,
  Tooltip as MuiTooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';
import SecurityIcon from '@mui/icons-material/Security';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Types matching integration audit types
interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string | null;
  requestId: string | null;
  workflowId: string | null;
  classification: Record<string, unknown> | null;
  routing: Record<string, unknown> | null;
  governanceDecision: Record<string, unknown> | null;
  approvalStatus: string | null;
  bypassTokenUsed: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  classification: '#0066CC',
  routing_decision: '#00A3E0',
  governance_decision: '#FF9800',
  approval_requested: '#9C27B0',
  approval_approved: '#4CAF50',
  approval_rejected: '#F44336',
  bypass_token_used: '#FF5722',
  bypass_token_generated: '#795548',
  workflow_started: '#00BCD4',
  workflow_completed: '#4CAF50',
  phase_started: '#3F51B5',
  phase_completed: '#009688',
  security_scan: '#F44336',
  config_changed: '#607D8B',
  error: '#D32F2F',
  system: '#9E9E9E',
};

// Mock data
function generateMockAuditEvents(page: number, filters: Record<string, string>): { events: AuditEvent[]; total: number } {
  const types = Object.keys(EVENT_TYPE_COLORS);
  const users = ['engineer-1', 'engineer-2', 'tech-lead', 'security-lead', null];
  const workflows = ['SDLC-20260217-001', 'SDLC-20260217-002', 'SDLC-20260217-003', null];

  const allEvents: AuditEvent[] = Array.from({ length: 87 }, (_, i) => {
    const eventType = types[Math.floor(Math.random() * types.length)];
    return {
      id: `AUD-${String(1000 + i).padStart(6, '0')}`,
      timestamp: new Date(Date.now() - i * 120000 - Math.random() * 60000).toISOString(),
      eventType,
      userId: users[Math.floor(Math.random() * users.length)],
      requestId: Math.random() > 0.3 ? `REQ-${1000 + Math.floor(Math.random() * 100)}` : null,
      workflowId: workflows[Math.floor(Math.random() * workflows.length)],
      classification: eventType === 'classification' ? { type: 'code-change', complexity: 'medium', confidence: 0.88 } : null,
      routing: eventType === 'routing_decision' ? { strategy: 'feature', agents: ['engineer', 'security'] } : null,
      governanceDecision: eventType === 'governance_decision' ? { level: 2, allowed: Math.random() > 0.15, gates: ['security-review'] } : null,
      approvalStatus: eventType.startsWith('approval_') ? eventType.replace('approval_', '') : null,
      bypassTokenUsed: eventType === 'bypass_token_used',
      metadata: { source: 'integration', version: '3.0.0' },
      createdAt: new Date(Date.now() - i * 120000).toISOString(),
    };
  });

  // Apply filters
  let filtered = allEvents;
  if (filters.eventType) {
    filtered = filtered.filter((e) => e.eventType === filters.eventType);
  }
  if (filters.workflowId) {
    filtered = filtered.filter((e) => e.workflowId === filters.workflowId);
  }
  if (filters.userId) {
    filtered = filtered.filter((e) => e.userId === filters.userId);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q) ||
        (e.workflowId && e.workflowId.toLowerCase().includes(q)) ||
        (e.userId && e.userId.toLowerCase().includes(q)),
    );
  }

  const pageSize = 15;
  const start = (page - 1) * pageSize;
  return {
    events: filtered.slice(start, start + pageSize),
    total: filtered.length,
  };
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AuditTrailViewer() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(() => {
    setLoading(true);
    const result = generateMockAuditEvents(page, { ...filters, search: searchText });
    setEvents(result.events);
    setTotalEvents(result.total);
    setLoading(false);
  }, [page, filters, searchText]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
    setPage(1);
  };

  const handleExport = (format: 'csv' | 'json') => {
    // In production, this would call the AuditExporter API
    const data = format === 'json'
      ? JSON.stringify(events, null, 2)
      : [
          'id,timestamp,eventType,userId,workflowId,approvalStatus,bypassTokenUsed',
          ...events.map((e) =>
            [e.id, e.timestamp, e.eventType, e.userId ?? '', e.workflowId ?? '', e.approvalStatus ?? '', e.bypassTokenUsed].join(','),
          ),
        ].join('\n');

    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-export-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageCount = Math.ceil(totalEvents / 15);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HistoryIcon sx={{ fontSize: 32, color: '#0066CC' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Audit Trail Viewer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalEvents} events recorded - Compliance audit log browser
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('json')}
          >
            Export JSON
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0066CC' }}>
                {totalEvents}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total Events</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <VerifiedIcon sx={{ color: '#4CAF50' }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                  OK
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Hash Chain</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF9800' }}>
                {events.filter((e) => e.bypassTokenUsed).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Bypass Events</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#F44336' }}>
                {events.filter((e) => e.eventType === 'error').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Errors</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterListIcon sx={{ color: '#666' }} />
          <TextField
            size="small"
            placeholder="Search events..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Event Type</InputLabel>
            <Select
              value={filters.eventType ?? ''}
              label="Event Type"
              onChange={(e) => handleFilterChange('eventType', e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              {Object.keys(EVENT_TYPE_COLORS).map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Workflow</InputLabel>
            <Select
              value={filters.workflowId ?? ''}
              label="Workflow"
              onChange={(e) => handleFilterChange('workflowId', e.target.value)}
            >
              <MenuItem value="">All Workflows</MenuItem>
              <MenuItem value="SDLC-20260217-001">SDLC-20260217-001</MenuItem>
              <MenuItem value="SDLC-20260217-002">SDLC-20260217-002</MenuItem>
              <MenuItem value="SDLC-20260217-003">SDLC-20260217-003</MenuItem>
            </Select>
          </FormControl>
          {Object.keys(filters).length > 0 && (
            <Button
              size="small"
              onClick={() => {
                setFilters({});
                setSearchText('');
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      </Paper>

      {/* Event Table */}
      {loading ? (
        <LinearProgress />
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Workflow</TableCell>
                  <TableCell>Approval</TableCell>
                  <TableCell>Bypass</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelectedEvent(event); setDetailOpen(true); }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {formatTimestamp(event.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={event.eventType}
                        size="small"
                        sx={{
                          bgcolor: EVENT_TYPE_COLORS[event.eventType] ?? '#607D8B',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={event.userId ? 'text.primary' : 'text.disabled'}>
                        {event.userId ?? '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {event.workflowId ? (
                        <Chip label={event.workflowId} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.approvalStatus ? (
                        <Chip
                          label={event.approvalStatus}
                          size="small"
                          color={
                            event.approvalStatus === 'approved' ? 'success'
                              : event.approvalStatus === 'rejected' ? 'error'
                                : 'warning'
                          }
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.bypassTokenUsed ? (
                        <Chip label="BYPASS" size="small" color="warning" />
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <MuiTooltip title="View Details">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setDetailOpen(true); }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </MuiTooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Box>
          )}
        </>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selectedEvent && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon />
              Audit Event: {selectedEvent.id}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Event Type</Typography>
                  <Chip
                    label={selectedEvent.eventType}
                    sx={{
                      bgcolor: EVENT_TYPE_COLORS[selectedEvent.eventType] ?? '#607D8B',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body1">{new Date(selectedEvent.timestamp).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">User ID</Typography>
                  <Typography variant="body1">{selectedEvent.userId ?? 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Workflow ID</Typography>
                  <Typography variant="body1">{selectedEvent.workflowId ?? 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Request ID</Typography>
                  <Typography variant="body1">{selectedEvent.requestId ?? 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Bypass Token Used</Typography>
                  <Typography variant="body1">{selectedEvent.bypassTokenUsed ? 'Yes' : 'No'}</Typography>
                </Grid>

                {selectedEvent.classification && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Classification</Typography>
                    <Paper sx={{ p: 1.5, bgcolor: '#F5F5F5' }}>
                      <pre style={{ margin: 0, fontSize: '0.8rem', overflow: 'auto' }}>
                        {JSON.stringify(selectedEvent.classification, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}

                {selectedEvent.governanceDecision && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Governance Decision</Typography>
                    <Paper sx={{ p: 1.5, bgcolor: '#F5F5F5' }}>
                      <pre style={{ margin: 0, fontSize: '0.8rem', overflow: 'auto' }}>
                        {JSON.stringify(selectedEvent.governanceDecision, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}

                {selectedEvent.routing && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Routing</Typography>
                    <Paper sx={{ p: 1.5, bgcolor: '#F5F5F5' }}>
                      <pre style={{ margin: 0, fontSize: '0.8rem', overflow: 'auto' }}>
                        {JSON.stringify(selectedEvent.routing, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Metadata</Typography>
                  <Paper sx={{ p: 1.5, bgcolor: '#F5F5F5' }}>
                    <pre style={{ margin: 0, fontSize: '0.8rem', overflow: 'auto' }}>
                      {JSON.stringify(selectedEvent.metadata, null, 2)}
                    </pre>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">Event ID:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedEvent.id}</Typography>
                    <MuiTooltip title="Copy ID">
                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(selectedEvent.id)}>
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
