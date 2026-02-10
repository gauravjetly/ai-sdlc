/**
 * SchedulingDashboard Component
 *
 * Main dashboard view for the Scheduled Agent Work Builder.
 * Shows summary cards, upcoming work timeline, agent status, and recent activity.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  PlayArrow as RunningIcon,
  CheckCircle as CompletedIcon,
  Error as FailedIcon,
  Pause as PausedIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Memory as MemoryIcon,
  Notifications as NotificationsIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';

// Types matching the backend DTOs
interface DashboardSummary {
  scheduled: number;
  running: number;
  completed: number;
  failed: number;
  paused: number;
}

interface WorkItem {
  id: string;
  name: string;
  description: string;
  workType: string;
  scheduleType: string;
  status: string;
  priority: string;
  scheduledAt: string | null;
  cronExpression: string | null;
  createdAt: string;
  agentAssignments: Array<{
    agentType: string;
    role: string;
  }>;
}

interface WorkExecution {
  id: string;
  workItemId: string;
  agentId: string;
  status: string;
  progress: number;
  startedAt: string;
  durationMs: number | null;
}

interface AgentStatus {
  id: string;
  name: string;
  type: string;
  healthy: boolean;
  queuedTasks: number;
  memoryUsageMB: number;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface DashboardData {
  summary: DashboardSummary;
  recentItems: WorkItem[];
  upcomingItems: WorkItem[];
  activeExecutions: WorkExecution[];
  queueStats: QueueStats;
}

// Status color mapping
const STATUS_COLORS: Record<string, 'info' | 'success' | 'error' | 'warning' | 'default'> = {
  scheduled: 'info',
  running: 'warning',
  completed: 'success',
  failed: 'error',
  paused: 'default',
  cancelled: 'default',
};

// Priority color mapping
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#90caf9',
  NORMAL: '#4caf50',
  HIGH: '#ff9800',
  CRITICAL: '#f44336',
};

/**
 * Summary Card Component
 */
function SummaryCard({
  title,
  count,
  icon,
  color,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card
      sx={{
        height: '100%',
        borderTop: `4px solid ${color}`,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-2px)' },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 600, color }}>
              {count}
            </Typography>
          </Box>
          <Box sx={{ color, opacity: 0.3, fontSize: 48 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Agent Status Card Component
 */
function AgentStatusCard({ agent }: { agent: AgentStatus }) {
  const healthColor = agent.healthy ? '#4caf50' : '#f44336';

  return (
    <Card sx={{ minWidth: 200 }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: healthColor,
            }}
            role="img"
            aria-label={agent.healthy ? 'Healthy' : 'Unhealthy'}
          />
          <Typography variant="subtitle2" noWrap>
            {agent.name}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {agent.queuedTasks} task{agent.queuedTasks !== 1 ? 's' : ''} queued
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <MemoryIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {agent.memoryUsageMB} MB
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Active Execution Row Component
 */
function ExecutionRow({ execution }: { execution: WorkExecution }) {
  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
          {execution.workItemId.slice(0, 8)}...
        </Typography>
      </TableCell>
      <TableCell>{execution.agentId}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
          <LinearProgress
            variant="determinate"
            value={execution.progress}
            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" sx={{ minWidth: 35 }}>
            {execution.progress}%
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={execution.status}
          size="small"
          color={STATUS_COLORS[execution.status] || 'default'}
        />
      </TableCell>
      <TableCell>
        {execution.durationMs
          ? `${Math.round(execution.durationMs / 1000)}s`
          : 'Running...'}
      </TableCell>
    </TableRow>
  );
}

/**
 * Main SchedulingDashboard Component
 */
export function SchedulingDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/scheduling/dashboard');
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={40} sx={{ mb: 3 }} />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={300} />
      </Box>
    );
  }

  // Mock data for initial render when API is not yet connected
  const dashboardData: DashboardData = data || {
    summary: { scheduled: 0, running: 0, completed: 0, failed: 0, paused: 0 },
    recentItems: [],
    upcomingItems: [],
    activeExecutions: [],
    queueStats: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Scheduling Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage scheduled work, triggers, and agent activity
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchDashboard} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Work Item
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Scheduled"
            count={dashboardData.summary.scheduled}
            icon={<ScheduleIcon sx={{ fontSize: 'inherit' }} />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Running"
            count={dashboardData.summary.running}
            icon={<RunningIcon sx={{ fontSize: 'inherit' }} />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Completed"
            count={dashboardData.summary.completed}
            icon={<CompletedIcon sx={{ fontSize: 'inherit' }} />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Failed"
            count={dashboardData.summary.failed}
            icon={<FailedIcon sx={{ fontSize: 'inherit' }} />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Active Executions */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Active Executions
            </Typography>
            {dashboardData.activeExecutions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  No active executions
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Work Item</TableCell>
                      <TableCell>Agent</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.activeExecutions.map(execution => (
                      <ExecutionRow key={execution.id} execution={execution} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Queue Stats */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Queue Status
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Waiting', value: dashboardData.queueStats.waiting, color: '#90caf9' },
                { label: 'Active', value: dashboardData.queueStats.active, color: '#ff9800' },
                { label: 'Delayed', value: dashboardData.queueStats.delayed, color: '#ce93d8' },
                { label: 'Completed', value: dashboardData.queueStats.completed, color: '#4caf50' },
                { label: 'Failed', value: dashboardData.queueStats.failed, color: '#f44336' },
              ].map(stat => (
                <Box key={stat.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stat.color }} />
                    <Typography variant="body2">{stat.label}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Upcoming Work Items */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Upcoming Work
              </Typography>
              <TimelineIcon color="action" />
            </Box>
            {dashboardData.upcomingItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  No upcoming work scheduled
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Schedule Work
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {dashboardData.upcomingItems.map(item => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.name}
                      </Typography>
                      <Chip
                        label={item.priority}
                        size="small"
                        sx={{
                          bgcolor: PRIORITY_COLORS[item.priority] || '#ccc',
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.scheduledAt
                        ? `Scheduled: ${new Date(item.scheduledAt).toLocaleString()}`
                        : item.cronExpression
                          ? `Recurring: ${item.cronExpression}`
                          : 'Trigger-based'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Activity
            </Typography>
            {dashboardData.recentItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  No recent activity
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {dashboardData.recentItems.map(item => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.name}
                      </Typography>
                      <Chip
                        label={item.status}
                        size="small"
                        color={STATUS_COLORS[item.status] || 'default'}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.createdAt).toLocaleString()}
                      {item.agentAssignments.length > 0 &&
                        ` | ${item.agentAssignments.map(a => a.agentType).join(', ')}`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Create Work Dialog placeholder */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Create Scheduled Work Item
          </Typography>
          <Typography color="text.secondary">
            Work item creation form will be implemented here.
            This dialog will contain a multi-step wizard for configuring
            work details, schedule, and agent assignments.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setCreateDialogOpen(false)}>
              Close
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}

export default SchedulingDashboard;
