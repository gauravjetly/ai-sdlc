import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Switch,
  FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, List, ListItem, ListItemText, IconButton
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import BugReportIcon from '@mui/icons-material/BugReport';
import { api } from '../services/api';

const agents = [
  { id: 'developer-agent', name: 'Developer Agent', role: 'Dependency Updates & Code Reviews', status: 'active' },
  { id: 'sre-agent', name: 'SRE Agent', role: 'Health Monitoring & Auto-scaling', status: 'active' },
  { id: 'security-agent', name: 'Security Agent', role: 'Vulnerability Scans & Compliance', status: 'active' },
  { id: 'qa-agent', name: 'QA Agent', role: 'Automated Testing & Quality Gates', status: 'active' },
  { id: 'release-manager', name: 'Release Manager', role: 'Deployment Orchestration', status: 'active' },
  { id: 'architect-agent', name: 'Architect Agent', role: 'Design Reviews & Best Practices', status: 'active' },
  { id: 'finops-agent', name: 'FinOps Agent', role: 'Cost Optimization & Budget Tracking', status: 'active' },
  { id: 'conductor-agent', name: 'Conductor Agent', role: 'Multi-Agent Orchestration', status: 'active' },
];

export default function AgentControl() {
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [configDialog, setConfigDialog] = useState(false);
  const [logsDialog, setLogsDialog] = useState(false);

  const handleExecuteTask = async (agentId: string, task: string) => {
    try {
      await api.executeAgent(agentId, { task });
      alert(`Task "${task}" executed successfully by ${agentId}`);
    } catch (error) {
      console.error('Failed to execute task:', error);
    }
  };

  const mockLogs = [
    '[2024-01-30 14:23:45] Agent started successfully',
    '[2024-01-30 14:24:12] Scanning for vulnerabilities...',
    '[2024-01-30 14:24:45] Found 0 critical vulnerabilities',
    '[2024-01-30 14:25:10] Scan completed successfully',
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        AI Agent Control Center
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage and monitor your 8 intelligent agents
      </Typography>

      <Grid container spacing={3}>
        {agents.map((agent) => (
          <Grid item xs={12} md={6} key={agent.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">{agent.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {agent.role}
                    </Typography>
                  </Box>
                  <Chip 
                    label={agent.status === 'active' ? 'Active' : 'Inactive'} 
                    color={agent.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    size="small"
                    onClick={() => handleExecuteTask(agent.id, 'manual_trigger')}
                  >
                    Run Now
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<StopIcon />}
                    size="small"
                    color="error"
                  >
                    Stop
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedAgent(agent);
                      setConfigDialog(true);
                    }}
                  >
                    <SettingsIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedAgent(agent);
                      setLogsDialog(true);
                    }}
                  >
                    <BugReportIcon />
                  </IconButton>
                </Box>

                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Enable Scheduled Execution"
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Configuration Dialog */}
      <Dialog open={configDialog} onClose={() => setConfigDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure {selectedAgent?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Schedule (Cron Format)"
                defaultValue="0 2 * * *"
                helperText="e.g., 0 2 * * * = Daily at 2 AM"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Max Concurrent Tasks"
                type="number"
                defaultValue="5"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Timeout (seconds)"
                type="number"
                defaultValue="300"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Send Notifications"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Auto-retry on Failure"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setConfigDialog(false)}>
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsDialog} onClose={() => setLogsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedAgent?.name} - Recent Logs</DialogTitle>
        <DialogContent>
          <List sx={{ bgcolor: '#f5f5f5', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {mockLogs.map((log, idx) => (
              <ListItem key={idx} sx={{ py: 0.5 }}>
                <ListItemText primary={log} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialog(false)}>Close</Button>
          <Button variant="contained">Download Full Logs</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
