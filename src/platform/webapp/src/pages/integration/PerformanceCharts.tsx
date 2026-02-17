/**
 * PerformanceCharts - Performance Metrics Visualization
 *
 * Displays real-time and historical performance metrics:
 * - Classification latency (avg, p50, p95, p99)
 * - Cache hit rate and efficiency
 * - Async processor queue depth and throughput
 * - Governance decision timing
 * - System health metrics
 *
 * Part of Phase 3: Advanced Dashboard Features.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Paper,
  LinearProgress, Divider, FormControl, InputLabel, Select,
  MenuItem, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area,
  RadialBarChart, RadialBar,
} from 'recharts';
import SpeedIcon from '@mui/icons-material/Speed';
import CachedIcon from '@mui/icons-material/Cached';
import QueueIcon from '@mui/icons-material/Queue';
import TimerIcon from '@mui/icons-material/Timer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MemoryIcon from '@mui/icons-material/Memory';

// Types matching MetricsCollector
interface PerformanceSnapshot {
  classification: {
    avgDurationMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    totalClassifications: number;
    cacheHitRate: number;
  };
  governance: {
    avgDecisionTimeMs: number;
    totalDecisions: number;
  };
  cache: {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
  };
  asyncProcessor: {
    queueDepth: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    avgProcessingTimeMs: number;
  };
  system: {
    totalRequests: number;
    errorRate: number;
    uptimeMs: number;
    memoryUsageMB: number;
  };
}

interface LatencyPoint {
  time: string;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

interface CachePoint {
  time: string;
  hitRate: number;
  size: number;
  evictions: number;
}

interface ThroughputPoint {
  time: string;
  requests: number;
  classifications: number;
  decisions: number;
}

// Mock data generators
function generateMockSnapshot(): PerformanceSnapshot {
  return {
    classification: {
      avgDurationMs: 85 + Math.random() * 30,
      p50Ms: 72 + Math.random() * 20,
      p95Ms: 180 + Math.random() * 40,
      p99Ms: 350 + Math.random() * 80,
      totalClassifications: 1247 + Math.floor(Math.random() * 100),
      cacheHitRate: 0.62 + Math.random() * 0.15,
    },
    governance: {
      avgDecisionTimeMs: 12 + Math.random() * 8,
      totalDecisions: 890 + Math.floor(Math.random() * 50),
    },
    cache: {
      size: 280 + Math.floor(Math.random() * 50),
      maxSize: 500,
      hits: 780 + Math.floor(Math.random() * 100),
      misses: 467 + Math.floor(Math.random() * 50),
      hitRate: 0.62 + Math.random() * 0.15,
      evictions: 45 + Math.floor(Math.random() * 20),
    },
    asyncProcessor: {
      queueDepth: Math.floor(Math.random() * 8),
      activeJobs: Math.floor(Math.random() * 3),
      completedJobs: 1150 + Math.floor(Math.random() * 100),
      failedJobs: 3 + Math.floor(Math.random() * 3),
      avgProcessingTimeMs: 250 + Math.random() * 100,
    },
    system: {
      totalRequests: 2500 + Math.floor(Math.random() * 200),
      errorRate: 0.002 + Math.random() * 0.008,
      uptimeMs: 86400000 + Math.floor(Math.random() * 86400000),
      memoryUsageMB: 120 + Math.random() * 60,
    },
  };
}

function generateLatencyHistory(): LatencyPoint[] {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    avg: 70 + Math.random() * 40,
    p50: 60 + Math.random() * 30,
    p95: 150 + Math.random() * 60,
    p99: 300 + Math.random() * 100,
  }));
}

function generateCacheHistory(): CachePoint[] {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    hitRate: 0.55 + Math.random() * 0.3,
    size: 200 + Math.floor(Math.random() * 200),
    evictions: Math.floor(Math.random() * 10),
  }));
}

function generateThroughputHistory(): ThroughputPoint[] {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    requests: Math.floor(Math.random() * 150) + 20,
    classifications: Math.floor(Math.random() * 80) + 10,
    decisions: Math.floor(Math.random() * 60) + 5,
  }));
}

function formatUptime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

export default function PerformanceCharts() {
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<LatencyPoint[]>([]);
  const [cacheHistory, setCacheHistory] = useState<CachePoint[]>([]);
  const [throughputHistory, setThroughputHistory] = useState<ThroughputPoint[]>([]);
  const [timeRange, setTimeRange] = useState('24h');

  const refreshData = useCallback(() => {
    setSnapshot(generateMockSnapshot());
    setLatencyHistory(generateLatencyHistory());
    setCacheHistory(generateCacheHistory());
    setThroughputHistory(generateThroughputHistory());
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

  if (!snapshot) return <LinearProgress />;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SpeedIcon sx={{ fontSize: 32, color: '#0066CC' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Performance Metrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Classification, cache, processor, and system performance
            </Typography>
          </Box>
        </Box>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="6h">Last 6 Hours</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: '3px solid #0066CC' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TimerIcon sx={{ color: '#0066CC' }} />
                <Typography variant="body2" color="text.secondary">Avg Latency</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {snapshot.classification.avgDurationMs.toFixed(0)}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                p95: {snapshot.classification.p95Ms.toFixed(0)}ms / p99: {snapshot.classification.p99Ms.toFixed(0)}ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: '3px solid #4CAF50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CachedIcon sx={{ color: '#4CAF50' }} />
                <Typography variant="body2" color="text.secondary">Cache Hit Rate</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {(snapshot.cache.hitRate * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {snapshot.cache.size}/{snapshot.cache.maxSize} entries ({snapshot.cache.evictions} evictions)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: '3px solid #FF9800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <QueueIcon sx={{ color: '#FF9800' }} />
                <Typography variant="body2" color="text.secondary">Queue Depth</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {snapshot.asyncProcessor.queueDepth}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {snapshot.asyncProcessor.activeJobs} active / {snapshot.asyncProcessor.completedJobs} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: '3px solid #9C27B0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MemoryIcon sx={{ color: '#9C27B0' }} />
                <Typography variant="body2" color="text.secondary">System Health</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {(100 - snapshot.system.errorRate * 100).toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uptime: {formatUptime(snapshot.system.uptimeMs)} | {snapshot.system.memoryUsageMB.toFixed(0)}MB RAM
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Latency Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <TimerIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Classification Latency
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={latencyHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis unit="ms" />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}ms`} />
                  <Legend />
                  <Line type="monotone" dataKey="avg" stroke="#0066CC" name="Average" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p50" stroke="#4CAF50" name="p50" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="p95" stroke="#FF9800" name="p95" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="p99" stroke="#F44336" name="p99" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Latency Percentiles */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Latency Percentiles</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Percentile</TableCell>
                      <TableCell align="right">Latency</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { label: 'Average', value: snapshot.classification.avgDurationMs, target: 100 },
                      { label: 'p50', value: snapshot.classification.p50Ms, target: 80 },
                      { label: 'p95', value: snapshot.classification.p95Ms, target: 200 },
                      { label: 'p99', value: snapshot.classification.p99Ms, target: 500 },
                    ].map((row) => (
                      <TableRow key={row.label}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.label}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {row.value.toFixed(1)}ms
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.value <= row.target ? 'OK' : 'HIGH'}
                            size="small"
                            color={row.value <= row.target ? 'success' : 'warning'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Governance Decision Time</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0066CC' }}>
                  {snapshot.governance.avgDecisionTimeMs.toFixed(1)}ms
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  avg ({snapshot.governance.totalDecisions} decisions)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Cache Performance */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 380 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <CachedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Cache Performance
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={cacheHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'hitRate' ? `${(value * 100).toFixed(1)}%` : value
                    }
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="hitRate"
                    stroke="#4CAF50"
                    fill="#4CAF50"
                    fillOpacity={0.1}
                    name="Hit Rate"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="size"
                    stroke="#0066CC"
                    name="Cache Size"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Request Throughput */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 380 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Request Throughput
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={throughputHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="requests" fill="#0066CC" name="Requests" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="classifications" fill="#4CAF50" name="Classifications" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="decisions" fill="#FF9800" name="Governance" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Async Processor Stats */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            <QueueIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Async Processor Health
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={6} sm={4} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
                  {snapshot.asyncProcessor.queueDepth}
                </Typography>
                <Typography variant="body2" color="text.secondary">Queue Depth</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0066CC' }}>
                  {snapshot.asyncProcessor.activeJobs}
                </Typography>
                <Typography variant="body2" color="text.secondary">Active Jobs</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                  {snapshot.asyncProcessor.completedJobs}
                </Typography>
                <Typography variant="body2" color="text.secondary">Completed</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#F44336' }}>
                  {snapshot.asyncProcessor.failedJobs}
                </Typography>
                <Typography variant="body2" color="text.secondary">Failed</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#9C27B0' }}>
                  {snapshot.asyncProcessor.avgProcessingTimeMs.toFixed(0)}ms
                </Typography>
                <Typography variant="body2" color="text.secondary">Avg Processing</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {snapshot.system.totalRequests}
                </Typography>
                <Typography variant="body2" color="text.secondary">Total Requests</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
