import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, IconButton, Table, TableBody, TableCell, TableHead, TableRow
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import StorageIcon from '@mui/icons-material/Storage';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../services/api';

export default function CloudResources() {
  const [openDialog, setOpenDialog] = useState<'vpc' | 'cluster' | 'database' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cloud: 'aws',
    region: 'us-east-1',
    size: 'small',
  });

  const handleCreate = async (type: 'vpc' | 'cluster' | 'database') => {
    try {
      if (type === 'vpc') {
        await api.createVPC(formData);
      } else if (type === 'cluster') {
        await api.createCluster(formData);
      } else {
        await api.createDatabase(formData);
      }
      setOpenDialog(null);
      setFormData({ name: '', cloud: 'aws', region: 'us-east-1', size: 'small' });
    } catch (error) {
      console.error('Failed to create resource:', error);
    }
  };

  const mockResources = [
    { type: 'VPC', name: 'production-vpc', cloud: 'AWS', region: 'us-east-1', status: 'Active' },
    { type: 'Cluster', name: 'eks-production', cloud: 'AWS', region: 'us-east-1', status: 'Running' },
    { type: 'Database', name: 'prod-postgres', cloud: 'OCI', region: 'us-ashburn-1', status: 'Available' },
    { type: 'VPC', name: 'staging-vpc', cloud: 'OCI', region: 'us-ashburn-1', status: 'Active' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <div>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
            Cloud Resources
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage multi-cloud infrastructure
          </Typography>
        </div>
      </Box>

      {/* Quick Create Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={() => setOpenDialog('vpc')}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <AccountTreeIcon sx={{ fontSize: 60, color: '#0066CC', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Create VPC/Network</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Isolated virtual network for your resources
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} fullWidth>
                Create VPC
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={() => setOpenDialog('cluster')}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <CloudQueueIcon sx={{ fontSize: 60, color: '#0066CC', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Create Kubernetes Cluster</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Managed K8s cluster (EKS, OKE, AKS, GKE)
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} fullWidth>
                Create Cluster
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={() => setOpenDialog('database')}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <StorageIcon sx={{ fontSize: 60, color: '#0066CC', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Create Database</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Managed PostgreSQL, MySQL, or MongoDB
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} fullWidth>
                Create Database
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Existing Resources */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>Existing Resources</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Cloud</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockResources.map((resource, idx) => (
                <TableRow key={idx}>
                  <TableCell>{resource.type}</TableCell>
                  <TableCell>{resource.name}</TableCell>
                  <TableCell>{resource.cloud}</TableCell>
                  <TableCell>{resource.region}</TableCell>
                  <TableCell>
                    <Chip 
                      label={resource.status} 
                      color={resource.status === 'Active' || resource.status === 'Running' || resource.status === 'Available' ? 'success' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Resource Dialog */}
      <Dialog open={!!openDialog} onClose={() => setOpenDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create {openDialog === 'vpc' ? 'VPC' : openDialog === 'cluster' ? 'Kubernetes Cluster' : 'Database'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resource Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`e.g., ${openDialog}-production`}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Cloud Provider</InputLabel>
                <Select
                  value={formData.cloud}
                  label="Cloud Provider"
                  onChange={(e) => setFormData({ ...formData, cloud: e.target.value })}
                >
                  <MenuItem value="aws">AWS</MenuItem>
                  <MenuItem value="oci">Oracle OCI</MenuItem>
                  <MenuItem value="azure" disabled>Azure (Coming Soon)</MenuItem>
                  <MenuItem value="gcp" disabled>GCP (Coming Soon)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="e.g., us-east-1"
              />
            </Grid>
            {openDialog !== 'vpc' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Size</InputLabel>
                  <Select
                    value={formData.size}
                    label="Size"
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  >
                    <MenuItem value="small">Small (Development)</MenuItem>
                    <MenuItem value="medium">Medium (Staging)</MenuItem>
                    <MenuItem value="large">Large (Production)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(null)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => openDialog && handleCreate(openDialog)}
            disabled={!formData.name}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
