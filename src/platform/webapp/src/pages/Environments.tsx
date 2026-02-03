import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, TextField,
  Alert, Tabs, Tab, IconButton, Chip, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

interface Environment {
  id: string;
  name: string;
  type: 'dev' | 'uat' | 'production' | 'dr';
  cloud: 'aws' | 'oci' | 'azure' | 'gcp';
  region: string;
  clusterArn: string;
  namespace: string;
  configured: boolean;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

const defaultEnvironments: Environment[] = [
  {
    id: '1',
    name: 'Development',
    type: 'dev',
    cloud: 'aws',
    region: 'us-east-1',
    clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/dev-cluster',
    namespace: 'default',
    configured: true
  },
  {
    id: '2',
    name: 'UAT',
    type: 'uat',
    cloud: 'aws',
    region: 'us-east-1',
    clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/uat-cluster',
    namespace: 'default',
    configured: false
  },
  {
    id: '3',
    name: 'Production',
    type: 'production',
    cloud: 'aws',
    region: 'us-east-1',
    clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/prod-cluster',
    namespace: 'default',
    configured: false
  }
];

export default function Environments() {
  const [environments, setEnvironments] = useState<Environment[]>(defaultEnvironments);
  const [selectedTab, setSelectedTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);

  const handleAddEnvironment = () => {
    setEditingEnv({
      id: Date.now().toString(),
      name: '',
      type: 'dev',
      cloud: 'aws',
      region: 'us-east-1',
      clusterArn: '',
      namespace: 'default',
      configured: false
    });
    setOpenDialog(true);
  };

  const handleEditEnvironment = (env: Environment) => {
    setEditingEnv(env);
    setOpenDialog(true);
  };

  const handleSaveEnvironment = () => {
    if (!editingEnv) return;

    const updatedEnv = { ...editingEnv, configured: true };
    const exists = environments.find(e => e.id === editingEnv.id);

    if (exists) {
      setEnvironments(environments.map(e => e.id === editingEnv.id ? updatedEnv : e));
    } else {
      setEnvironments([...environments, updatedEnv]);
    }

    // Save to localStorage
    localStorage.setItem('catalyst-environments', JSON.stringify(environments));
    localStorage.setItem('catalyst-demo-mode', demoMode.toString());

    setOpenDialog(false);
    setEditingEnv(null);
  };

  const handleDeleteEnvironment = (id: string) => {
    setEnvironments(environments.filter(e => e.id !== id));
  };

  const handleTestConnection = async (env: Environment) => {
    // In demo mode, always succeed
    if (demoMode) {
      alert(`✅ Demo Mode: Connection successful to ${env.name}!`);
      return;
    }

    // Real connection test would go here
    alert(`Testing connection to ${env.name}...`);
  };

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('catalyst-environments');
    const savedDemo = localStorage.getItem('catalyst-demo-mode');
    if (saved) {
      setEnvironments(JSON.parse(saved));
    }
    if (savedDemo !== null) {
      setDemoMode(savedDemo === 'true');
    }
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Environment Configuration
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={demoMode}
                onChange={(e) => {
                  setDemoMode(e.target.checked);
                  localStorage.setItem('catalyst-demo-mode', e.target.checked.toString());
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>Demo Mode</Typography>
                <Chip
                  label={demoMode ? 'ON' : 'OFF'}
                  color={demoMode ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            }
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEnvironment}
          >
            Add Environment
          </Button>
        </Box>
      </Box>

      {demoMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Demo Mode is ON</strong> - Deployments will be simulated without requiring real AWS credentials or Kubernetes clusters.
            Perfect for testing the platform! Turn off Demo Mode when you're ready to deploy to real infrastructure.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {environments.map((env) => (
          <Grid item xs={12} md={6} lg={4} key={env.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {env.name}
                    </Typography>
                    <Chip
                      label={env.type.toUpperCase()}
                      size="small"
                      color={env.type === 'production' ? 'error' : env.type === 'uat' ? 'warning' : 'primary'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box>
                    {env.configured ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <WarningIcon color="warning" />
                    )}
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Cloud Provider
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {env.cloud.toUpperCase()} - {env.region}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Cluster ARN
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ wordBreak: 'break-all' }}>
                    {env.clusterArn || 'Not configured'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Namespace
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {env.namespace}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={env.configured ? 'success.main' : 'warning.main'}
                  >
                    {env.configured ? '✓ Configured' : '⚠ Not Configured'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleTestConnection(env)}
                    fullWidth
                  >
                    Test Connection
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleEditEnvironment(env)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  {env.type !== 'dev' && (
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteEnvironment(env.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit/Add Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEnv?.name ? `Edit ${editingEnv.name}` : 'Add New Environment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Environment Name"
              value={editingEnv?.name || ''}
              onChange={(e) => setEditingEnv({ ...editingEnv!, name: e.target.value })}
              placeholder="e.g., Development, Staging, Production"
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Environment Type"
                  value={editingEnv?.type || 'dev'}
                  onChange={(e) => setEditingEnv({ ...editingEnv!, type: e.target.value as any })}
                  SelectProps={{ native: true }}
                >
                  <option value="dev">Development</option>
                  <option value="uat">UAT</option>
                  <option value="production">Production</option>
                  <option value="dr">Disaster Recovery</option>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Cloud Provider"
                  value={editingEnv?.cloud || 'aws'}
                  onChange={(e) => setEditingEnv({ ...editingEnv!, cloud: e.target.value as any })}
                  SelectProps={{ native: true }}
                >
                  <option value="aws">AWS</option>
                  <option value="oci">Oracle OCI</option>
                  <option value="azure">Azure (Coming Soon)</option>
                  <option value="gcp">GCP (Coming Soon)</option>
                </TextField>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Region"
              value={editingEnv?.region || ''}
              onChange={(e) => setEditingEnv({ ...editingEnv!, region: e.target.value })}
              placeholder="e.g., us-east-1, us-west-2"
            />

            <TextField
              fullWidth
              label="Cluster ARN / ID"
              value={editingEnv?.clusterArn || ''}
              onChange={(e) => setEditingEnv({ ...editingEnv!, clusterArn: e.target.value })}
              placeholder="arn:aws:eks:us-east-1:123456789012:cluster/my-cluster"
              helperText="For AWS EKS, use the full ARN. For OCI OKE, use the cluster OCID."
            />

            <TextField
              fullWidth
              label="Kubernetes Namespace"
              value={editingEnv?.namespace || 'default'}
              onChange={(e) => setEditingEnv({ ...editingEnv!, namespace: e.target.value })}
              placeholder="default"
            />

            {!demoMode && (
              <>
                <Divider sx={{ my: 2 }}>
                  <Chip label="AWS Credentials (Optional)" size="small" />
                </Divider>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Leave empty to use instance role or environment variables
                </Alert>
                <TextField
                  fullWidth
                  label="AWS Access Key ID"
                  value={editingEnv?.credentials?.accessKeyId || ''}
                  onChange={(e) => setEditingEnv({
                    ...editingEnv!,
                    credentials: { ...editingEnv?.credentials, accessKeyId: e.target.value }
                  })}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
                <TextField
                  fullWidth
                  type="password"
                  label="AWS Secret Access Key"
                  value={editingEnv?.credentials?.secretAccessKey || ''}
                  onChange={(e) => setEditingEnv({
                    ...editingEnv!,
                    credentials: { ...editingEnv?.credentials, secretAccessKey: e.target.value }
                  })}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEnvironment}
            disabled={!editingEnv?.name || !editingEnv?.clusterArn}
          >
            Save Environment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
