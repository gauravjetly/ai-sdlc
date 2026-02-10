/**
 * MultiProjectDashboard Component
 *
 * Compact, insight-dense dashboard for multi-project SDLC orchestration.
 * Inspired by modern observability tools (Grafana, Linear, Vercel).
 *
 * Layout:
 *   1. Metrics Strip (48px) -- 5 key metrics, always visible
 *   2. Project Pipeline Table -- compact rows with 7-dot phase indicators
 *   3. Bottom Analytics Panel -- tabbed: Agent Pool | Phase Durations | Throughput
 *
 * Design: UX-20260210-0011-v2
 * Architecture: ARCH-20260210-0011-v2
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Alert,
  Collapse,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  FiberManualRecord as DotIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

// ===========================
// Types (matching backend DTOs)
// ===========================

interface ProjectPhaseView {
  phase: string;
  status: string;
  agentId: string | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  priority: string;
  deliveryDate: string;
  deliveryHealth: 'on_track' | 'at_risk' | 'behind' | 'completed' | 'unknown';
  estimatedCompletion: string;
  phases: ProjectPhaseView[];
}

interface AgentPoolStatus {
  agentType: string;
  displayName: string;
  totalInstances: number;
  busyInstances: number;
  idleInstances: number;
  queuedPhases: number;
  avgPhaseDurationMin: number;
  estimatedWaitMin: number;
}

interface DashboardMetrics {
  activeProjects: number;
  atRiskProjects: number;
  agentUtilizationPercent: number;
  avgPhaseDurationDays: number;
  weeklyVelocityTrend: number;
}

interface MultiProjectDashboardData {
  metrics: DashboardMetrics;
  projects: ProjectSummary[];
  agentPool: AgentPoolStatus[];
  phaseDurations: Record<string, number>;
  weeklyThroughput: number[];
}

// ===========================
// Constants
// ===========================

const PHASE_LABELS = ['Req', 'Arch', 'Dev', 'Sec', 'QA', 'Dep', 'UAT'];
const PHASE_FULL_LABELS = [
  'Requirements', 'Architecture', 'Development',
  'Security', 'Testing', 'Deployment', 'Acceptance',
];

const HEALTH_COLORS: Record<string, { light: string; dark: string; label: string }> = {
  on_track: { light: '#10B981', dark: '#34D399', label: 'On Track' },
  at_risk: { light: '#F59E0B', dark: '#FBBF24', label: 'At Risk' },
  behind: { light: '#EF4444', dark: '#F87171', label: 'Behind' },
  completed: { light: '#10B981', dark: '#34D399', label: 'Complete' },
  unknown: { light: '#9CA3AF', dark: '#6B7280', label: 'Unknown' },
};

const PHASE_STATUS_COLORS: Record<string, { light: string; dark: string }> = {
  completed: { light: '#10B981', dark: '#34D399' },
  in_progress: { light: '#3B82F6', dark: '#60A5FA' },
  failed: { light: '#EF4444', dark: '#F87171' },
  blocked: { light: '#F59E0B', dark: '#FBBF24' },
  pending: { light: '#D1D5DB', dark: '#4B5563' },
  skipped: { light: '#9CA3AF', dark: '#6B7280' },
};

const PRIORITY_LABELS: Record<string, { color: string; short: string }> = {
  CRITICAL: { color: '#EF4444', short: 'CRIT' },
  HIGH: { color: '#F59E0B', short: 'HIGH' },
  NORMAL: { color: '#3B82F6', short: 'NORM' },
  LOW: { color: '#9CA3AF', short: 'LOW' },
};

// ===========================
// MetricsStrip Component (48px)
// ===========================

function MetricsStrip({ metrics }: { metrics: DashboardMetrics }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const chips = [
    {
      value: metrics.activeProjects,
      label: 'Active',
      color: '#3B82F6',
    },
    {
      value: metrics.atRiskProjects,
      label: 'At Risk',
      color: metrics.atRiskProjects > 0 ? '#F59E0B' : '#10B981',
    },
    {
      value: `${metrics.agentUtilizationPercent}%`,
      label: 'Agents',
      color: metrics.agentUtilizationPercent > 95
        ? '#EF4444'
        : metrics.agentUtilizationPercent > 80
          ? '#F59E0B'
          : '#10B981',
    },
    {
      value: `${metrics.avgPhaseDurationDays}d`,
      label: 'Avg Phase',
      color: isDark ? '#A78BFA' : '#8B5CF6',
    },
    {
      value: `${metrics.weeklyVelocityTrend >= 0 ? '+' : ''}${metrics.weeklyVelocityTrend}%`,
      label: 'Velocity',
      color: metrics.weeklyVelocityTrend >= 0 ? '#10B981' : '#EF4444',
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        height: 48,
        px: 2,
        bgcolor: isDark ? '#1F2937' : '#F9FAFB',
        borderRadius: 1,
        border: '1px solid',
        borderColor: isDark ? '#374151' : '#E5E7EB',
        overflow: 'hidden',
        flexWrap: 'wrap',
      }}
    >
      {chips.map((chip) => (
        <Box
          key={chip.label}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: isDark ? '#111827' : '#FFFFFF',
            border: '1px solid',
            borderColor: isDark ? '#374151' : '#E5E7EB',
            minWidth: 'fit-content',
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: chip.color, fontSize: '0.875rem', lineHeight: 1 }}
          >
            {chip.value}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1 }}
          >
            {chip.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ===========================
// PhaseDots Component (7 dots per row)
// ===========================

function PhaseDots({ phases }: { phases: ProjectPhaseView[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          {phases.map((p, i) => (
            <Box key={p.phase} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.2 }}>
              <DotIcon
                sx={{
                  fontSize: 8,
                  color: isDark
                    ? PHASE_STATUS_COLORS[p.status]?.dark
                    : PHASE_STATUS_COLORS[p.status]?.light,
                }}
              />
              <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                {PHASE_FULL_LABELS[i]}: {p.status.replace('_', ' ')}
              </Typography>
            </Box>
          ))}
        </Box>
      }
      arrow
      placement="top"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {phases.map((p, i) => {
          const colors = PHASE_STATUS_COLORS[p.status] || PHASE_STATUS_COLORS.pending;
          const fillColor = isDark ? colors.dark : colors.light;
          const isPulsing = p.status === 'in_progress';
          const isEmpty = p.status === 'pending';
          const isSkipped = p.status === 'skipped';

          return (
            <Box
              key={p.phase}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: isEmpty ? 'transparent' : fillColor,
                border: `2px solid ${fillColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                ...(isPulsing && {
                  animation: 'pulse-ring 1.5s ease-in-out infinite',
                  '@keyframes pulse-ring': {
                    '0%': { boxShadow: `0 0 0 0px ${fillColor}66` },
                    '50%': { boxShadow: `0 0 0 4px ${fillColor}00` },
                    '100%': { boxShadow: `0 0 0 0px ${fillColor}00` },
                  },
                }),
              }}
            >
              {isSkipped && (
                <Box
                  sx={{
                    width: 6,
                    height: 2,
                    bgcolor: fillColor,
                    borderRadius: 1,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Tooltip>
  );
}

// ===========================
// ProjectRow Component (40px each)
// ===========================

function ProjectRow({
  project,
  expanded,
  onToggle,
}: {
  project: ProjectSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const health = HEALTH_COLORS[project.deliveryHealth] || HEALTH_COLORS.unknown;
  const priority = PRIORITY_LABELS[project.priority] || PRIORITY_LABELS.NORMAL;
  const deliveryDate = new Date(project.deliveryDate);
  const daysUntil = Math.ceil((deliveryDate.getTime() - Date.now()) / 86400000);

  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{
          cursor: 'pointer',
          height: 40,
          '& td': { py: 0.5, borderBottom: expanded ? 'none' : undefined },
        }}
      >
        {/* Name */}
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
              {expanded ? <CollapseIcon sx={{ fontSize: 16 }} /> : <ExpandIcon sx={{ fontSize: 16 }} />}
            </IconButton>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }} noWrap>
              {project.name}
            </Typography>
          </Box>
        </TableCell>

        {/* Pipeline Dots */}
        <TableCell align="center">
          <PhaseDots phases={project.phases} />
        </TableCell>

        {/* Priority */}
        <TableCell align="center">
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: priority.color,
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
            }}
          >
            {priority.short}
          </Typography>
        </TableCell>

        {/* Delivery Date */}
        <TableCell align="center">
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              color: daysUntil < 0 ? '#EF4444' : daysUntil < 7 ? '#F59E0B' : 'text.secondary',
            }}
          >
            {deliveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Typography>
        </TableCell>

        {/* Health */}
        <TableCell align="center">
          <Chip
            label={health.label}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 600,
              bgcolor: `${isDark ? health.dark : health.light}20`,
              color: isDark ? health.dark : health.light,
              border: `1px solid ${isDark ? health.dark : health.light}40`,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        </TableCell>
      </TableRow>

      {/* Expanded Detail */}
      <TableRow>
        <TableCell colSpan={5} sx={{ py: 0, px: 0, border: expanded ? undefined : 'none' }}>
          <Collapse in={expanded} timeout={200}>
            <ProjectDetail project={project} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ===========================
// ProjectDetail (inline accordion)
// ===========================

function ProjectDetail({ project }: { project: ProjectSummary }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const activePhaseIndex = project.phases.findIndex(p => p.status === 'in_progress');
  const completedCount = project.phases.filter(p => p.status === 'completed' || p.status === 'skipped').length;
  const estimatedCompletion = new Date(project.estimatedCompletion);

  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        bgcolor: isDark ? '#111827' : '#F9FAFB',
        borderTop: '1px solid',
        borderColor: isDark ? '#1F2937' : '#E5E7EB',
      }}
    >
      {/* Phase progress bar */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
        {project.phases.map((p, i) => {
          const colors = PHASE_STATUS_COLORS[p.status] || PHASE_STATUS_COLORS.pending;
          const fillColor = isDark ? colors.dark : colors.light;

          return (
            <Tooltip key={p.phase} title={`${PHASE_FULL_LABELS[i]}: ${p.status.replace('_', ' ')}`}>
              <Box
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: p.status === 'pending' ? (isDark ? '#374151' : '#E5E7EB') : fillColor,
                  transition: 'background-color 300ms ease',
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      {/* Detail grid */}
      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Progress
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Phase {completedCount + 1} of 7
            {activePhaseIndex >= 0 && ` (${PHASE_FULL_LABELS[activePhaseIndex]})`}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Active Agent
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {activePhaseIndex >= 0 && project.phases[activePhaseIndex].agentId
              ? project.phases[activePhaseIndex].agentId
              : 'None assigned'}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Est. Completion
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {estimatedCompletion.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Delivery Date
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {new Date(project.deliveryDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ===========================
// AgentPoolPanel Component
// ===========================

function AgentPoolPanel({ agents }: { agents: AgentPoolStatus[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {agents.map((agent) => {
        const utilPercent = agent.totalInstances > 0
          ? Math.round((agent.busyInstances / agent.totalInstances) * 100)
          : 0;
        const barColor = utilPercent > 95
          ? '#EF4444'
          : utilPercent > 80
            ? '#F59E0B'
            : isDark ? '#A78BFA' : '#8B5CF6';

        return (
          <Box key={agent.agentType} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              variant="caption"
              sx={{ width: 80, fontSize: '0.7rem', fontWeight: 500, textAlign: 'right' }}
              noWrap
            >
              {agent.displayName}
            </Typography>

            {/* Utilization bar */}
            <Box
              sx={{
                flex: 1,
                maxWidth: 200,
                height: 8,
                borderRadius: 4,
                bgcolor: isDark ? '#374151' : '#E5E7EB',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${utilPercent}%`,
                  height: '100%',
                  bgcolor: barColor,
                  borderRadius: 4,
                  transition: 'width 500ms ease',
                }}
              />
            </Box>

            <Typography variant="caption" sx={{ width: 35, fontSize: '0.7rem', fontWeight: 600 }}>
              {utilPercent}%
            </Typography>

            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
              ({agent.busyInstances}/{agent.totalInstances})
            </Typography>

            {agent.queuedPhases > 0 && (
              <Chip
                label={`Q:${agent.queuedPhases}`}
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                  bgcolor: isDark ? '#7C3AED30' : '#EDE9FE',
                  color: isDark ? '#C4B5FD' : '#7C3AED',
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ===========================
// PhaseDurationsPanel Component
// ===========================

function PhaseDurationsPanel({ durations }: { durations: Record<string, number> }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const maxDuration = Math.max(...Object.values(durations), 1);

  const phaseKeys = [
    'requirements', 'architecture', 'development',
    'security', 'testing', 'deployment', 'acceptance',
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {phaseKeys.map((key, i) => {
        const duration = durations[key] || 0;
        const barPercent = Math.round((duration / maxDuration) * 100);

        return (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              variant="caption"
              sx={{ width: 80, fontSize: '0.7rem', fontWeight: 500, textAlign: 'right' }}
              noWrap
            >
              {PHASE_FULL_LABELS[i]}
            </Typography>

            <Box
              sx={{
                flex: 1,
                maxWidth: 200,
                height: 8,
                borderRadius: 4,
                bgcolor: isDark ? '#374151' : '#E5E7EB',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${barPercent}%`,
                  height: '100%',
                  bgcolor: isDark ? '#60A5FA' : '#3B82F6',
                  borderRadius: 4,
                  transition: 'width 500ms ease',
                }}
              />
            </Box>

            <Typography variant="caption" sx={{ width: 40, fontSize: '0.7rem', fontWeight: 600 }}>
              {duration.toFixed(1)}d
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

// ===========================
// ThroughputPanel Component
// ===========================

function ThroughputPanel({
  throughput,
  velocityTrend,
}: {
  throughput: number[];
  velocityTrend: number;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const maxVal = Math.max(...throughput, 1);

  return (
    <Box>
      {/* Sparkline-style bars */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '4px',
          height: 60,
          mb: 1.5,
        }}
      >
        {throughput.map((val, i) => {
          const heightPercent = Math.round((val / maxVal) * 100);
          const isRecent = i >= throughput.length - 4;
          const barColor = isRecent
            ? (isDark ? '#34D399' : '#10B981')
            : (isDark ? '#4B5563' : '#D1D5DB');

          return (
            <Tooltip key={i} title={`Week ${i + 1}: ${val} completed`}>
              <Box
                sx={{
                  flex: 1,
                  height: `${Math.max(heightPercent, 4)}%`,
                  bgcolor: barColor,
                  borderRadius: '2px 2px 0 0',
                  transition: 'height 500ms ease',
                  minHeight: 3,
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      {/* Week labels */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
          {throughput.length > 0 ? `${throughput.length} weeks ago` : ''}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
          This week
        </Typography>
      </Box>

      {/* Trend */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Trend:
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: velocityTrend >= 0
              ? (isDark ? '#34D399' : '#10B981')
              : (isDark ? '#F87171' : '#EF4444'),
          }}
        >
          {velocityTrend >= 0 ? '+' : ''}{velocityTrend}%
        </Typography>
      </Box>
    </Box>
  );
}

// ===========================
// CreateProjectDialog Component
// ===========================

function CreateProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !deliveryDate) {
      setError('Name and delivery date are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/scheduling/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          deliveryDate: new Date(deliveryDate).toISOString(),
          priority,
          tags: tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create project');
      }

      setName('');
      setDescription('');
      setDeliveryDate('');
      setPriority('NORMAL');
      setTags('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>New Project</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          required
          size="small"
          sx={{ mb: 2, mt: 1 }}
          inputProps={{ maxLength: 200 }}
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={2}
          size="small"
          sx={{ mb: 2 }}
          inputProps={{ maxLength: 2000 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Delivery Date"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            required
            size="small"
            sx={{ flex: 1 }}
            InputLabelProps={{ shrink: true }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(e.target.value)}
            >
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="NORMAL">Normal</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TextField
          label="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          placeholder="auth, backend, api"
        />

        <Box
          sx={{
            p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Lifecycle: Full SDLC (7 phases) -- Req, Arch, Dev, Sec, QA, Deploy, UAT
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !name.trim() || !deliveryDate}
        >
          {submitting ? 'Creating...' : 'Create Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ===========================
// Main MultiProjectDashboard Component
// ===========================

export function MultiProjectDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [data, setData] = useState<MultiProjectDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/v1/scheduling/projects/dashboard');
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
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setCreateDialogOpen(true);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        fetchDashboard();
      } else if (e.key === 'Escape') {
        setExpandedProject(null);
        setCreateDialogOpen(false);
      } else if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (data && index < data.projects.length) {
          const projectId = data.projects[index].id;
          setExpandedProject(prev => prev === projectId ? null : projectId);
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [data, fetchDashboard]);

  // Loading skeleton
  if (loading && !data) {
    return (
      <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }}>
        <Skeleton variant="rectangular" height={48} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  // Fallback data
  const dashboard: MultiProjectDashboardData = data || {
    metrics: {
      activeProjects: 0,
      atRiskProjects: 0,
      agentUtilizationPercent: 0,
      avgPhaseDurationDays: 0,
      weeklyVelocityTrend: 0,
    },
    projects: [],
    agentPool: [],
    phaseDurations: {},
    weeklyThroughput: [],
  };

  return (
    <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
          Project Orchestration
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Refresh (R)">
            <IconButton size="small" onClick={fetchDashboard} disabled={loading}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ fontSize: '0.75rem', py: 0.5 }}
          >
            New Project
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Metrics Strip */}
      <MetricsStrip metrics={dashboard.metrics} />

      {/* Project Pipeline Table */}
      <Box
        sx={{
          mt: 1.5,
          flex: bottomPanelCollapsed ? 1 : '0 1 auto',
          overflow: 'auto',
          border: '1px solid',
          borderColor: isDark ? '#374151' : '#E5E7EB',
          borderRadius: 1,
          bgcolor: isDark ? '#111827' : '#FFFFFF',
        }}
      >
        {dashboard.projects.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              No projects scheduled
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create First Project
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { py: 0.5, fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' } }}>
                  <TableCell>Project</TableCell>
                  <TableCell align="center" sx={{ width: 120 }}>Pipeline</TableCell>
                  <TableCell align="center" sx={{ width: 50 }}>Pri</TableCell>
                  <TableCell align="center" sx={{ width: 70 }}>Due</TableCell>
                  <TableCell align="center" sx={{ width: 90 }}>Health</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboard.projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    expanded={expandedProject === project.id}
                    onToggle={() =>
                      setExpandedProject(prev => prev === project.id ? null : project.id)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Bottom Analytics Panel */}
      <Box
        sx={{
          mt: 1.5,
          border: '1px solid',
          borderColor: isDark ? '#374151' : '#E5E7EB',
          borderRadius: 1,
          bgcolor: isDark ? '#111827' : '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        {/* Panel header with tabs */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: bottomPanelCollapsed ? 'none' : '1px solid',
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <Tabs
            value={bottomTab}
            onChange={(_, v) => {
              setBottomTab(v);
              if (bottomPanelCollapsed) setBottomPanelCollapsed(false);
            }}
            sx={{
              minHeight: 32,
              '& .MuiTab-root': { minHeight: 32, py: 0, fontSize: '0.7rem', textTransform: 'none' },
              '& .MuiTabs-indicator': { height: 2 },
            }}
          >
            <Tab label="Agent Pool" />
            <Tab label="Phase Durations" />
            <Tab label="Throughput" />
          </Tabs>

          <IconButton
            size="small"
            onClick={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
            sx={{ mr: 0.5 }}
          >
            {bottomPanelCollapsed
              ? <ExpandIcon sx={{ fontSize: 16 }} />
              : <CollapseIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Box>

        {/* Panel content */}
        <Collapse in={!bottomPanelCollapsed} timeout={200}>
          <Box sx={{ p: 2, minHeight: 100 }}>
            {bottomTab === 0 && (
              <AgentPoolPanel agents={dashboard.agentPool} />
            )}
            {bottomTab === 1 && (
              <PhaseDurationsPanel durations={dashboard.phaseDurations} />
            )}
            {bottomTab === 2 && (
              <ThroughputPanel
                throughput={dashboard.weeklyThroughput}
                velocityTrend={dashboard.metrics.weeklyVelocityTrend}
              />
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={fetchDashboard}
      />
    </Box>
  );
}

export default MultiProjectDashboard;
