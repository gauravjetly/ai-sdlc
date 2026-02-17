/**
 * ApprovalQueue - Pending Approval Workflows
 *
 * Displays pending approval requests for Level 3+ governance.
 * Users can approve, reject, or view details of each request.
 *
 * Part of Phase 3: Advanced Dashboard Features.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Alert, LinearProgress, Badge, Tabs, Tab, Grid, Divider,
  Tooltip as MuiTooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import GavelIcon from '@mui/icons-material/Gavel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerIcon from '@mui/icons-material/Timer';
import PersonIcon from '@mui/icons-material/Person';

// Types matching the integration module's ApprovalWorkflow types
interface ApprovalRequest {
  id: string;
  workflowId: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  governanceLevel: number;
  gates: string[];
  classification: {
    type: string;
    complexity: string;
    confidence: number;
  };
  description: string;
}

// Mock data for demonstration - will connect to real WebSocket API
function generateMockApprovals(): ApprovalRequest[] {
  return [
    {
      id: 'APR-001',
      workflowId: 'SDLC-20260217-001',
      requestedBy: 'engineer-1',
      requestedAt: new Date(Date.now() - 300000).toISOString(),
      expiresAt: new Date(Date.now() + 3300000).toISOString(),
      status: 'pending',
      governanceLevel: 3,
      gates: ['security-review', 'architecture-review'],
      classification: { type: 'code-change', complexity: 'complex', confidence: 0.92 },
      description: 'Implement OAuth 2.0 authentication flow with MFA support',
    },
    {
      id: 'APR-002',
      workflowId: 'SDLC-20260217-002',
      requestedBy: 'engineer-2',
      requestedAt: new Date(Date.now() - 600000).toISOString(),
      expiresAt: new Date(Date.now() + 3000000).toISOString(),
      status: 'pending',
      governanceLevel: 3,
      gates: ['security-review'],
      classification: { type: 'architecture', complexity: 'complex', confidence: 0.88 },
      description: 'Refactor database schema for multi-tenancy support',
    },
    {
      id: 'APR-003',
      workflowId: 'SDLC-20260217-003',
      requestedBy: 'engineer-1',
      requestedAt: new Date(Date.now() - 1800000).toISOString(),
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
      status: 'approved',
      approvedBy: 'tech-lead',
      approvedAt: new Date(Date.now() - 900000).toISOString(),
      governanceLevel: 3,
      gates: ['qa-testing'],
      classification: { type: 'bug-fix', complexity: 'medium', confidence: 0.95 },
      description: 'Fix race condition in session management',
    },
    {
      id: 'APR-004',
      workflowId: 'SDLC-20260217-004',
      requestedBy: 'engineer-3',
      requestedAt: new Date(Date.now() - 7200000).toISOString(),
      expiresAt: new Date(Date.now() - 3600000).toISOString(),
      status: 'expired',
      governanceLevel: 4,
      gates: ['security-review', 'architecture-review', 'qa-testing'],
      classification: { type: 'code-change', complexity: 'complex', confidence: 0.85 },
      description: 'Add payment processing integration',
    },
    {
      id: 'APR-005',
      workflowId: 'SDLC-20260217-005',
      requestedBy: 'engineer-2',
      requestedAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 200000).toISOString(),
      status: 'rejected',
      approvedBy: 'security-lead',
      approvedAt: new Date(Date.now() - 1200000).toISOString(),
      rejectionReason: 'Missing threat model documentation',
      governanceLevel: 3,
      gates: ['security-review'],
      classification: { type: 'code-change', complexity: 'medium', confidence: 0.91 },
      description: 'Implement external API integration with third-party service',
    },
  ];
}

const STATUS_CONFIG: Record<string, { color: 'warning' | 'success' | 'error' | 'default'; label: string }> = {
  pending: { color: 'warning', label: 'Pending' },
  approved: { color: 'success', label: 'Approved' },
  rejected: { color: 'error', label: 'Rejected' },
  expired: { color: 'default', label: 'Expired' },
  cancelled: { color: 'default', label: 'Cancelled' },
};

function getTimeRemaining(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return 'Expired';
  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function getTimeRemainingColor(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return '#9E9E9E';
  if (remaining < 600000) return '#F44336'; // < 10 min
  if (remaining < 1800000) return '#FF9800'; // < 30 min
  return '#4CAF50';
}

export default function ApprovalQueue() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ type: 'approve' | 'reject'; approval: ApprovalRequest } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const refreshData = useCallback(() => {
    setApprovals(generateMockApprovals());
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const resolvedApprovals = approvals.filter((a) => a.status !== 'pending');

  const handleAction = (type: 'approve' | 'reject', approval: ApprovalRequest) => {
    setActionDialog({ type, approval });
    setRejectionReason('');
  };

  const confirmAction = () => {
    if (!actionDialog) return;
    // In production, this would call the integration API
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === actionDialog.approval.id
          ? {
              ...a,
              status: actionDialog.type === 'approve' ? 'approved' as const : 'rejected' as const,
              approvedBy: 'current-user',
              approvedAt: new Date().toISOString(),
              rejectionReason: actionDialog.type === 'reject' ? rejectionReason : undefined,
            }
          : a,
      ),
    );
    setActionDialog(null);
  };

  const displayedApprovals = tabValue === 0 ? pendingApprovals : resolvedApprovals;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <GavelIcon sx={{ fontSize: 32, color: '#FF9800' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Approval Queue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Level 3+ governance approval requests
            </Typography>
          </Box>
        </Box>
        <Badge badgeContent={pendingApprovals.length} color="warning">
          <Chip
            icon={<HourglassEmptyIcon />}
            label={`${pendingApprovals.length} pending`}
            color={pendingApprovals.length > 0 ? 'warning' : 'default'}
          />
        </Badge>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF9800' }}>
                {pendingApprovals.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                {approvals.filter((a) => a.status === 'approved').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Approved</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#F44336' }}>
                {approvals.filter((a) => a.status === 'rejected').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Rejected</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#9E9E9E' }}>
                {approvals.filter((a) => a.status === 'expired').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Expired</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab
            label={
              <Badge badgeContent={pendingApprovals.length} color="warning" sx={{ '& .MuiBadge-badge': { right: -12 } }}>
                Pending Approvals
              </Badge>
            }
          />
          <Tab label="History" />
        </Tabs>
      </Paper>

      {/* Approval List */}
      {displayedApprovals.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {tabValue === 0
            ? 'No pending approval requests. All workflows are clear.'
            : 'No resolved approval requests yet.'}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Request</TableCell>
                <TableCell>Workflow</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Gates</TableCell>
                <TableCell>Status</TableCell>
                {tabValue === 0 && <TableCell>Time Left</TableCell>}
                <TableCell>Requested By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedApprovals.map((approval) => (
                <TableRow key={approval.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {approval.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 250 }} noWrap>
                        {approval.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={approval.workflowId} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`L${approval.governanceLevel}`}
                      size="small"
                      color={approval.governanceLevel >= 4 ? 'error' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {approval.gates.map((gate) => (
                        <Chip key={gate} label={gate} size="small" sx={{ fontSize: '0.65rem' }} />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_CONFIG[approval.status].label}
                      color={STATUS_CONFIG[approval.status].color}
                      size="small"
                    />
                  </TableCell>
                  {tabValue === 0 && (
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TimerIcon sx={{ fontSize: 16, color: getTimeRemainingColor(approval.expiresAt) }} />
                        <Typography
                          variant="body2"
                          sx={{ color: getTimeRemainingColor(approval.expiresAt), fontWeight: 600 }}
                        >
                          {getTimeRemaining(approval.expiresAt)}
                        </Typography>
                      </Box>
                    </TableCell>
                  )}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 16, color: '#666' }} />
                      <Typography variant="body2">{approval.requestedBy}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <MuiTooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setDetailOpen(true);
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </MuiTooltip>
                      {approval.status === 'pending' && (
                        <>
                          <MuiTooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleAction('approve', approval)}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </MuiTooltip>
                          <MuiTooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleAction('reject', approval)}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </MuiTooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selectedApproval && (
          <>
            <DialogTitle>
              Approval Request: {selectedApproval.id}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Workflow ID</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedApproval.workflowId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Governance Level</Typography>
                  <Chip label={`Level ${selectedApproval.governanceLevel}`} color="warning" size="small" />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{selectedApproval.description}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Classification</Typography>
                  <Typography variant="body1">
                    {selectedApproval.classification.type} / {selectedApproval.classification.complexity} ({(selectedApproval.classification.confidence * 100).toFixed(0)}%)
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Requested By</Typography>
                  <Typography variant="body1">{selectedApproval.requestedBy}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Blocking Gates</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedApproval.gates.map((gate) => (
                      <Chip key={gate} label={gate} icon={<WarningAmberIcon />} color="warning" />
                    ))}
                  </Box>
                </Grid>
                {selectedApproval.rejectionReason && (
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ mt: 1 }}>
                      <strong>Rejection Reason:</strong> {selectedApproval.rejectionReason}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
              {selectedApproval.status === 'pending' && (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => {
                      setDetailOpen(false);
                      handleAction('reject', selectedApproval);
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => {
                      setDetailOpen(false);
                      handleAction('approve', selectedApproval);
                    }}
                  >
                    Approve
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!actionDialog} onClose={() => setActionDialog(null)} maxWidth="sm" fullWidth>
        {actionDialog && (
          <>
            <DialogTitle>
              {actionDialog.type === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {actionDialog.type === 'approve'
                  ? `Are you sure you want to approve ${actionDialog.approval.id}?`
                  : `Are you sure you want to reject ${actionDialog.approval.id}?`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {actionDialog.approval.description}
              </Typography>
              {actionDialog.type === 'reject' && (
                <TextField
                  label="Rejection Reason"
                  fullWidth
                  multiline
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  placeholder="Provide a reason for rejection..."
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button
                variant="contained"
                color={actionDialog.type === 'approve' ? 'success' : 'error'}
                onClick={confirmAction}
                disabled={actionDialog.type === 'reject' && !rejectionReason.trim()}
              >
                {actionDialog.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
