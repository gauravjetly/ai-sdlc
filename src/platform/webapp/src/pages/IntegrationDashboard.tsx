import { useState, useEffect, useCallback } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, LinearProgress,
  Tabs, Tab, Divider, Alert, Button, IconButton, Tooltip as MuiTooltip,
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import SyncIcon from '@mui/icons-material/Sync';
import RouteIcon from '@mui/icons-material/Route';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GavelIcon from '@mui/icons-material/Gavel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

// Types
interface RequestEntry {
  id: string;
  timestamp: string;
  type: string;
  complexity: string;
  urgency: string;
  confidence: number;
  requiresSDLC: boolean;
  strategy: string;
  status: string;
  duration: number;
}

interface ClassificationMetrics {
  totalRequests: number;
  sdlcRequests: number;
  passthroughRequests: number;
  avgConfidence: number;
  avgClassificationTime: number;
  typeDistribution: Array<{ name: string; value: number; color: string }>;
  complexityDistribution: Array<{ name: string; value: number }>;
}

interface GovernanceMetrics {
  level: number;
  levelName: string;
  complianceRate: number;
  totalDecisions: number;
  blockedCount: number;
  bypassCount: number;
  gateResults: Array<{ gate: string; passRate: number; total: number }>;
}

interface WorkflowEntry {
  id: string;
  description: string;
  status: string;
  strategy: string;
  phases: Array<{ name: string; status: string; duration?: number }>;
  createdAt: string;
}

// Color palette
const COLORS = ['#0066CC', '#00A3E0', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#795548', '#607D8B', '#E91E63', '#00BCD4', '#CDDC39'];

const TYPE_COLORS: Record<string, string> = {
  'qa': '#4CAF50',
  'explanation': '#00BCD4',
  'code-change': '#0066CC',
  'bug-fix': '#FF9800',
  'architecture': '#9C27B0',
  'review': '#795548',
  'emergency': '#F44336',
  'devops': '#607D8B',
  'documentation': '#CDDC39',
  'testing': '#00A3E0',
  'configuration': '#E91E63',
};

// Mock data generators (will be replaced with real API calls)
function generateMockRequestFlow(): RequestEntry[] {
  const types = ['qa', 'code-change', 'bug-fix', 'architecture', 'review', 'explanation', 'emergency'];
  const complexities = ['trivial', 'simple', 'medium', 'complex'];
  const strategies = ['passthrough', 'feature', 'bugfix', 'architecture', 'review', 'emergency', 'trivial'];
  const statuses = ['completed', 'in-progress', 'pending'];

  return Array.from({ length: 15 }, (_, i) => ({
    id: `REQ-${1000 + i}`,
    timestamp: new Date(Date.now() - i * 120000).toISOString(),
    type: types[Math.floor(Math.random() * types.length)],
    complexity: complexities[Math.floor(Math.random() * complexities.length)],
    urgency: 'normal',
    confidence: 0.75 + Math.random() * 0.25,
    requiresSDLC: Math.random() > 0.4,
    strategy: strategies[Math.floor(Math.random() * strategies.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    duration: Math.floor(Math.random() * 500) + 20,
  }));
}

function generateMockClassificationMetrics(): ClassificationMetrics {
  return {
    totalRequests: 247,
    sdlcRequests: 89,
    passthroughRequests: 158,
    avgConfidence: 0.87,
    avgClassificationTime: 120,
    typeDistribution: [
      { name: 'Q&A', value: 45, color: TYPE_COLORS['qa'] },
      { name: 'Code Change', value: 30, color: TYPE_COLORS['code-change'] },
      { name: 'Review', value: 10, color: TYPE_COLORS['review'] },
      { name: 'Bug Fix', value: 8, color: TYPE_COLORS['bug-fix'] },
      { name: 'Architecture', value: 4, color: TYPE_COLORS['architecture'] },
      { name: 'Emergency', value: 2, color: TYPE_COLORS['emergency'] },
      { name: 'Other', value: 1, color: '#607D8B' },
    ],
    complexityDistribution: [
      { name: 'Trivial', value: 35 },
      { name: 'Simple', value: 30 },
      { name: 'Medium', value: 25 },
      { name: 'Complex', value: 8 },
      { name: 'Epic', value: 2 },
    ],
  };
}

function generateMockGovernanceMetrics(): GovernanceMetrics {
  return {
    level: 2,
    levelName: 'Light Governance',
    complianceRate: 0.94,
    totalDecisions: 89,
    blockedCount: 3,
    bypassCount: 2,
    gateResults: [
      { gate: 'Security Review', passRate: 0.94, total: 50 },
      { gate: 'QA Testing', passRate: 0.96, total: 50 },
      { gate: 'Architecture Review', passRate: 0.92, total: 12 },
      { gate: 'Request Logging', passRate: 1.0, total: 89 },
    ],
  };
}

function generateMockWorkflows(): WorkflowEntry[] {
  return [
    {
      id: 'SDLC-20260217-001',
      description: 'Add OAuth 2.0 authentication',
      status: 'in-progress',
      strategy: 'feature',
      phases: [
        { name: 'requirements', status: 'completed', duration: 120 },
        { name: 'architecture', status: 'completed', duration: 240 },
        { name: 'implementation', status: 'in-progress' },
        { name: 'security', status: 'pending' },
        { name: 'testing', status: 'pending' },
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'SDLC-20260217-002',
      description: 'Fix user session timeout bug',
      status: 'completed',
      strategy: 'bugfix',
      phases: [
        { name: 'implementation', status: 'completed', duration: 300 },
        { name: 'security', status: 'completed', duration: 120 },
        { name: 'testing', status: 'completed', duration: 180 },
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'SDLC-20260217-003',
      description: 'Design microservices architecture',
      status: 'in-progress',
      strategy: 'architecture',
      phases: [
        { name: 'requirements', status: 'completed', duration: 90 },
        { name: 'architecture', status: 'in-progress' },
        { name: 'security', status: 'pending' },
      ],
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];
}

function generateMockCostData() {
  return {
    todayCost: 2.30,
    weekCost: 14.50,
    monthCost: 52.00,
    todayTokens: 145000,
    costByType: [
      { type: 'Code Change', cost: 8.20 },
      { type: 'Architecture', cost: 3.10 },
      { type: 'Q&A', cost: 1.50 },
      { type: 'Emergency', cost: 0.80 },
      { type: 'Review', cost: 0.90 },
    ],
    costTimeline: Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      cost: Math.random() * 4 + 1,
      tokens: Math.floor(Math.random() * 200000 + 50000),
    })),
  };
}

// Status icon component
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 18 }} />;
    case 'in-progress':
      return <PlayArrowIcon sx={{ color: '#0066CC', fontSize: 18 }} />;
    case 'failed':
    case 'blocked':
      return <ErrorIcon sx={{ color: '#F44336', fontSize: 18 }} />;
    default:
      return <HourglassEmptyIcon sx={{ color: '#9E9E9E', fontSize: 18 }} />;
  }
}

export default function IntegrationDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [requestFlow, setRequestFlow] = useState<RequestEntry[]>([]);
  const [classMetrics, setClassMetrics] = useState<ClassificationMetrics | null>(null);
  const [govMetrics, setGovMetrics] = useState<GovernanceMetrics | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowEntry[]>([]);
  const [costData, setCostData] = useState<ReturnType<typeof generateMockCostData> | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refreshData = useCallback(() => {
    setRequestFlow(generateMockRequestFlow());
    setClassMetrics(generateMockClassificationMetrics());
    setGovMetrics(generateMockGovernanceMetrics());
    setWorkflows(generateMockWorkflows());
    setCostData(generateMockCostData());
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [refreshData]);

  if (!classMetrics || !govMetrics || !costData) {
    return <LinearProgress />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Integration Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Claude Code + AI-SDLC Real-Time Request Flow & Agent Activity
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={<SyncIcon sx={{ fontSize: 16 }} />}
            label={`Updated ${lastRefresh.toLocaleTimeString()}`}
            size="small"
            variant="outlined"
          />
          <IconButton onClick={refreshData} size="small">
            <SyncIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <RouteIcon sx={{ color: '#0066CC' }} />
                <Typography variant="body2" color="text.secondary">Total Requests</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{classMetrics.totalRequests}</Typography>
              <Typography variant="body2" color="text.secondary">
                {classMetrics.sdlcRequests} SDLC / {classMetrics.passthroughRequests} passthrough
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AssessmentIcon sx={{ color: '#4CAF50' }} />
                <Typography variant="body2" color="text.secondary">Avg Confidence</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{(classMetrics.avgConfidence * 100).toFixed(0)}%</Typography>
              <Typography variant="body2" color="text.secondary">
                {classMetrics.avgClassificationTime}ms avg classification
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <GavelIcon sx={{ color: '#FF9800' }} />
                <Typography variant="body2" color="text.secondary">Governance</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>L{govMetrics.level}</Typography>
              <Typography variant="body2" color="text.secondary">
                {govMetrics.levelName} - {(govMetrics.complianceRate * 100).toFixed(0)}% compliant
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SpeedIcon sx={{ color: '#9C27B0' }} />
                <Typography variant="body2" color="text.secondary">Cost Today</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>${costData.todayCost.toFixed(2)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {(costData.todayTokens / 1000).toFixed(0)}K tokens
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Request Flow" />
          <Tab label="Classification" />
          <Tab label="Governance" />
          <Tab label="Workflows" />
          <Tab label="Cost Tracking" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Live Request Feed */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Live Request Flow
                  <Chip label="LIVE" size="small" color="success" sx={{ ml: 1 }} />
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Complexity</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Strategy</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Duration</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requestFlow.map((req) => (
                        <TableRow key={req.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(req.timestamp).toLocaleTimeString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={req.type}
                              size="small"
                              sx={{
                                bgcolor: TYPE_COLORS[req.type] || '#607D8B',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell>{req.complexity}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LinearProgress
                                variant="determinate"
                                value={req.confidence * 100}
                                sx={{ width: 60, height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="body2">
                                {(req.confidence * 100).toFixed(0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={req.strategy}
                              size="small"
                              variant="outlined"
                              color={req.strategy === 'passthrough' ? 'default' : 'primary'}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <StatusIcon status={req.status} />
                              <Typography variant="body2">{req.status}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{req.duration}ms</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          {/* Type Distribution Pie Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Request Type Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={classMetrics.typeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {classMetrics.typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Complexity Distribution */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Complexity Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classMetrics.complexityDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0066CC" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          {/* Governance Status */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Governance Compliance</Typography>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Compliance Rate</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {(govMetrics.complianceRate * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={govMetrics.complianceRate * 100}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#0066CC' }}>
                        {govMetrics.totalDecisions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Decisions</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#F44336' }}>
                        {govMetrics.blockedCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Blocked</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
                        {govMetrics.bypassCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Bypassed</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Gate Results */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Gate Pass Rates</Typography>
                {govMetrics.gateResults.map((gate) => (
                  <Box key={gate.gate} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{gate.gate}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {(gate.passRate * 100).toFixed(0)}% ({gate.total})
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={gate.passRate * 100}
                      color={gate.passRate >= 0.95 ? 'success' : gate.passRate >= 0.8 ? 'warning' : 'error'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && (
        <Grid container spacing={3}>
          {/* Active Workflows */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Active Workflows</Typography>
                {workflows.map((workflow) => (
                  <Paper key={workflow.id} elevation={1} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {workflow.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {workflow.description}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={workflow.strategy}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <StatusIcon status={workflow.status} />
                      </Box>
                    </Box>

                    {/* Phase Progress */}
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      {workflow.phases.map((phase, index) => (
                        <MuiTooltip key={phase.name} title={`${phase.name}: ${phase.status}${phase.duration ? ` (${phase.duration}s)` : ''}`}>
                          <Box
                            sx={{
                              flex: 1,
                              height: 24,
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: phase.status === 'completed' ? '#4CAF50'
                                : phase.status === 'in-progress' ? '#0066CC'
                                  : phase.status === 'failed' ? '#F44336'
                                    : '#E0E0E0',
                              color: phase.status === 'pending' ? '#666' : 'white',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': { opacity: 0.8 },
                            }}
                          >
                            {phase.name.slice(0, 4).toUpperCase()}
                          </Box>
                        </MuiTooltip>
                      ))}
                    </Box>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 4 && (
        <Grid container spacing={3}>
          {/* Cost Timeline */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Cost Timeline (Last 7 Days)</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={costData.costTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Area type="monotone" dataKey="cost" stroke="#0066CC" fill="#0066CC" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Cost by Type */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Cost by Request Type</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costData.costByType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="type" width={100} />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="cost" fill="#00A3E0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Cost Summary */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Today</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#0066CC' }}>
                        ${costData.todayCost.toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">This Week</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#00A3E0' }}>
                        ${costData.weekCost.toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">This Month</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                        ${costData.monthCost.toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
