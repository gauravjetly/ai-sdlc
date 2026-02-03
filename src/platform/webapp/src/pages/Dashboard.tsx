import { Grid, Card, CardContent, Typography, Box, Button, LinearProgress, Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const deploymentData = [
  { day: 'Mon', count: 12 },
  { day: 'Tue', count: 15 },
  { day: 'Wed', count: 20 },
  { day: 'Thu', count: 18 },
  { day: 'Fri', count: 22 },
  { day: 'Sat', count: 8 },
  { day: 'Sun', count: 5 },
];

export default function Dashboard() {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Welcome to Deltek Catalyst
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your AI-Powered Multi-Cloud Control Center
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #0066CC 0%, #004C99 100%)', color: 'white' }}>
            <CardContent>
              <RocketLaunchIcon sx={{ fontSize: 40, mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Deploy Application</Typography>
              <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                Launch apps with zero-downtime strategies
              </Typography>
              <Button 
                component={Link} 
                to="/deploy" 
                variant="contained" 
                fullWidth
                sx={{ 
                  bgcolor: 'white', 
                  color: '#0066CC',
                  '&:hover': { bgcolor: '#f0f0f0' }
                }}
              >
                Start Deployment
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <CloudQueueIcon sx={{ fontSize: 40, mb: 2, color: '#0066CC' }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Cloud Resources</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create VPCs, Clusters, Databases
              </Typography>
              <Button 
                component={Link} 
                to="/resources" 
                variant="contained" 
                fullWidth
              >
                Manage Resources
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <SmartToyIcon sx={{ fontSize: 40, mb: 2, color: '#0066CC' }} />
              <Typography variant="h6" sx={{ mb: 1 }}>AI Agents</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Control 8 intelligent agents
              </Typography>
              <Button 
                component={Link} 
                to="/agents" 
                variant="contained" 
                fullWidth
              >
                Control Agents
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <TrendingDownIcon sx={{ fontSize: 40, mb: 2, color: '#10b981' }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Cost Optimization</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Save 20% on cloud costs
              </Typography>
              <Button 
                component={Link} 
                to="/costs" 
                variant="contained" 
                fullWidth
              >
                Optimize Costs
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Metrics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>Deployment Activity</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deploymentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0066CC" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Platform Status</Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">System Health</Typography>
                  <Chip label="Healthy" color="success" size="small" />
                </Box>
                <LinearProgress variant="determinate" value={99} color="success" />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Automation Level</Typography>
                  <Typography variant="body2" fontWeight="bold">96%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={96} color="primary" />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Active Deployments</Typography>
                  <Typography variant="body2" fontWeight="bold">3</Typography>
                </Box>
                <LinearProgress variant="determinate" value={30} color="info" />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Recent Activity</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">User Portal Deployed</Typography>
                  <Typography variant="caption" color="text.secondary">2 minutes ago • AWS</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight="bold">Security Scan Completed</Typography>
                  <Typography variant="caption" color="text.secondary">15 minutes ago • All clouds</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight="bold">Cost Analysis Run</Typography>
                  <Typography variant="caption" color="text.secondary">1 hour ago • OCI vs AWS</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
