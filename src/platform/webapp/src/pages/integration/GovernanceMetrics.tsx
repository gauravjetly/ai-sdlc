/**
 * GovernanceMetrics - Governance Metrics Visualization
 *
 * Displays comprehensive governance metrics including:
 * - Current governance level and configuration
 * - Gate pass/fail rates over time
 * - Bypass token usage tracking
 * - Compliance trends
 * - Decision distribution
 *
 * Part of Phase 3: Advanced Dashboard Features.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Paper,
  LinearProgress, Divider, Alert, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Color palette
const LEVEL_COLORS: Record<number, string> = {
  1: '#4CAF50',
  2: '#0066CC',
  3: '#FF9800',
  4: '#F44336',
};

const GATE_COLORS: Record<string, string> = {
  'security-review': '#F44336',
  'qa-testing': '#4CAF50',
  'architecture-review': '#9C27B0',
  'request-logging': '#0066CC',
  'approval-required': '#FF9800',
};

// Types
interface GovernanceOverview {
  currentLevel: number;
  levelName: string;
  complianceRate: number;
  totalDecisions: number;
  blockedCount: number;
  allowedCount: number;
  bypassCount: number;
  pendingApprovals: number;
}

interface GateMetric {
  gate: string;
  behavior: 'skip' | 'advisory' | 'blocking';
  evaluations: number;
  passes: number;
  failures: number;
  passRate: number;
}

interface ComplianceTrend {
  date: string;
  complianceRate: number;
  decisions: number;
  blocked: number;
}

interface BypassUsage {
  date: string;
  tokensGenerated: number;
  tokensUsed: number;
  tokensExpired: number;
  tokensRevoked: number;
}

// Mock data generators
function generateMockOverview(): GovernanceOverview {
  return {
    currentLevel: 2,
    levelName: 'Light Governance',
    complianceRate: 0.94,
    totalDecisions: 247,
    blockedCount: 15,
    allowedCount: 230,
    bypassCount: 2,
    pendingApprovals: 3,
  };
}

function generateMockGateMetrics(): GateMetric[] {
  return [
    { gate: 'request-logging', behavior: 'advisory', evaluations: 247, passes: 247, failures: 0, passRate: 1.0 },
    { gate: 'security-review', behavior: 'advisory', evaluations: 89, passes: 83, failures: 6, passRate: 0.933 },
    { gate: 'qa-testing', behavior: 'advisory', evaluations: 89, passes: 85, failures: 4, passRate: 0.955 },
    { gate: 'architecture-review', behavior: 'skip', evaluations: 12, passes: 11, failures: 1, passRate: 0.917 },
    { gate: 'approval-required', behavior: 'skip', evaluations: 0, passes: 0, failures: 0, passRate: 1.0 },
  ];
}

function generateMockComplianceTrend(): ComplianceTrend[] {
  return Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    complianceRate: 0.88 + Math.random() * 0.12,
    decisions: Math.floor(Math.random() * 30) + 10,
    blocked: Math.floor(Math.random() * 4),
  }));
}

function generateMockBypassUsage(): BypassUsage[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    tokensGenerated: Math.floor(Math.random() * 5),
    tokensUsed: Math.floor(Math.random() * 3),
    tokensExpired: Math.floor(Math.random() * 2),
    tokensRevoked: Math.floor(Math.random() * 1),
  }));
}

function generateDecisionDistribution() {
  return [
    { name: 'Allowed (No Gates)', value: 158, color: '#E0E0E0' },
    { name: 'Allowed (Passed)', value: 72, color: '#4CAF50' },
    { name: 'Blocked', value: 15, color: '#F44336' },
    { name: 'Bypassed', value: 2, color: '#FF9800' },
  ];
}

export default function GovernanceMetrics() {
  const [overview, setOverview] = useState<GovernanceOverview | null>(null);
  const [gateMetrics, setGateMetrics] = useState<GateMetric[]>([]);
  const [complianceTrend, setComplianceTrend] = useState<ComplianceTrend[]>([]);
  const [bypassUsage, setBypassUsage] = useState<BypassUsage[]>([]);
  const [decisionDist, setDecisionDist] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [timeRange, setTimeRange] = useState('14d');

  const refreshData = useCallback(() => {
    setOverview(generateMockOverview());
    setGateMetrics(generateMockGateMetrics());
    setComplianceTrend(generateMockComplianceTrend());
    setBypassUsage(generateMockBypassUsage());
    setDecisionDist(generateDecisionDistribution());
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 15000);
    return () => clearInterval(interval);
  }, [refreshData]);

  if (!overview) return <LinearProgress />;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <GavelIcon sx={{ fontSize: 32, color: LEVEL_COLORS[overview.currentLevel] }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Governance Metrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Level {overview.currentLevel}: {overview.levelName}
            </Typography>
          </Box>
        </Box>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="14d">Last 14 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: `3px solid ${LEVEL_COLORS[overview.currentLevel]}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SecurityIcon sx={{ color: LEVEL_COLORS[overview.currentLevel] }} />
                <Typography variant="body2" color="text.secondary">Compliance Rate</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {(overview.complianceRate * 100).toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={overview.complianceRate * 100}
                color={overview.complianceRate >= 0.95 ? 'success' : overview.complianceRate >= 0.8 ? 'warning' : 'error'}
                sx={{ height: 6, borderRadius: 3, mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon sx={{ color: '#4CAF50' }} />
                <Typography variant="body2" color="text.secondary">Total Decisions</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{overview.totalDecisions}</Typography>
              <Typography variant="body2" color="text.secondary">
                {overview.allowedCount} allowed / {overview.blockedCount} blocked
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <VpnKeyIcon sx={{ color: '#FF9800' }} />
                <Typography variant="body2" color="text.secondary">Bypass Tokens</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{overview.bypassCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                tokens used this period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BlockIcon sx={{ color: '#F44336' }} />
                <Typography variant="body2" color="text.secondary">Blocked</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{overview.blockedCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                {overview.pendingApprovals} pending approval
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Compliance Trend */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Compliance Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={complianceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0.8, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
                  <Area
                    type="monotone"
                    dataKey="complianceRate"
                    stroke="#4CAF50"
                    fill="#4CAF50"
                    fillOpacity={0.1}
                    name="Compliance Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Decision Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Decision Distribution</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={decisionDist}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  >
                    {decisionDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Gate Pass Rates */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Gate Performance</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Gate</TableCell>
                      <TableCell>Behavior</TableCell>
                      <TableCell align="center">Evaluated</TableCell>
                      <TableCell align="center">Pass Rate</TableCell>
                      <TableCell>Progress</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gateMetrics.map((gate) => (
                      <TableRow key={gate.gate} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {gate.gate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={gate.behavior}
                            size="small"
                            color={gate.behavior === 'blocking' ? 'error' : gate.behavior === 'advisory' ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">{gate.evaluations}</TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: gate.passRate >= 0.95 ? '#4CAF50' : gate.passRate >= 0.8 ? '#FF9800' : '#F44336',
                            }}
                          >
                            {gate.evaluations > 0 ? `${(gate.passRate * 100).toFixed(1)}%` : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <LinearProgress
                            variant="determinate"
                            value={gate.evaluations > 0 ? gate.passRate * 100 : 100}
                            color={gate.passRate >= 0.95 ? 'success' : gate.passRate >= 0.8 ? 'warning' : 'error'}
                            sx={{ height: 8, borderRadius: 4, minWidth: 80 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Bypass Token Usage */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <VpnKeyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Bypass Token Activity
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={bypassUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tokensGenerated" name="Generated" fill="#0066CC" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="tokensUsed" name="Used" fill="#4CAF50" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="tokensExpired" name="Expired" fill="#9E9E9E" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Governance Level Matrix */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Governance Level Matrix</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current configuration: Level {overview.currentLevel} ({overview.levelName})
          </Typography>
          <Grid container spacing={1}>
            {[
              { level: 1, name: 'Tracking Only', desc: 'All gates skip, logging only' },
              { level: 2, name: 'Light Governance', desc: 'Security/QA advisory, no blocking' },
              { level: 3, name: 'Full Governance', desc: 'Security/QA blocking, bypass available' },
              { level: 4, name: 'Audit Mode', desc: 'All blocking, no bypass, hash chain' },
            ].map((lvl) => (
              <Grid item xs={12} sm={6} md={3} key={lvl.level}>
                <Paper
                  elevation={lvl.level === overview.currentLevel ? 3 : 0}
                  sx={{
                    p: 2,
                    border: lvl.level === overview.currentLevel
                      ? `2px solid ${LEVEL_COLORS[lvl.level]}`
                      : '1px solid #E0E0E0',
                    opacity: lvl.level === overview.currentLevel ? 1 : 0.6,
                    transition: 'all 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      label={`L${lvl.level}`}
                      size="small"
                      sx={{ bgcolor: LEVEL_COLORS[lvl.level], color: 'white', fontWeight: 700 }}
                    />
                    {lvl.level === overview.currentLevel && (
                      <Chip label="ACTIVE" size="small" color="primary" />
                    )}
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{lvl.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{lvl.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
