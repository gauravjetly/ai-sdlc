import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stepper, Step, StepLabel,
  TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, LinearProgress, Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../services/api';
import type { DeploymentRequest, DeploymentStatus } from '../types';

const steps = ['Select Application', 'Choose Cloud & Environment', 'Deployment Strategy', 'Configure Resources', 'Review & Deploy'];

export default function DeploymentWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [deploying, setDeploying] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  
  const [formData, setFormData] = useState<DeploymentRequest>({
    application: '',
    version: '',
    environment: 'dev',
    cloud: 'aws',
    clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/my-cluster',
    namespace: 'default',
    strategy: 'rolling',
    replicas: 3,
    imageRegistry: 'nginx',
    containerPort: 80,
    resources: {
      cpu: '500m',
      memory: '512Mi',
    },
  });

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const result = await api.createDeployment(formData);
      setDeploymentId(result.id);
      setDeploymentStatus(result);
      
      // Poll for status updates
      const interval = setInterval(async () => {
        if (result.id) {
          const status = await api.getDeploymentStatus(result.id);
          setDeploymentStatus(status);
          
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(interval);
            setDeploying(false);
          }
        }
      }, 3000);
    } catch (error) {
      console.error('Deployment failed:', error);
      setDeploying(false);
    }
  };

  const handleRollback = async () => {
    if (deploymentId) {
      await api.rollbackDeployment(deploymentId);
      setDeploymentStatus(null);
      setDeploymentId(null);
      setActiveStep(0);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Application Name"
                value={formData.application}
                onChange={(e) => setFormData({ ...formData, application: e.target.value })}
                placeholder="e.g., user-portal, api-gateway"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Version / Git SHA"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g., v1.2.3, abc123def"
                required
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Cloud Provider</InputLabel>
                <Select
                  value={formData.cloud}
                  label="Cloud Provider"
                  onChange={(e) => setFormData({ ...formData, cloud: e.target.value as any })}
                >
                  <MenuItem value="aws">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>☁️</span> Amazon Web Services (AWS)
                    </Box>
                  </MenuItem>
                  <MenuItem value="oci">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>☁️</span> Oracle Cloud Infrastructure (OCI)
                    </Box>
                  </MenuItem>
                  <MenuItem value="azure" disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>☁️</span> Microsoft Azure (Coming Soon)
                    </Box>
                  </MenuItem>
                  <MenuItem value="gcp" disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>☁️</span> Google Cloud Platform (Coming Soon)
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Environment</InputLabel>
                <Select
                  value={formData.environment}
                  label="Environment"
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                >
                  <MenuItem value="dev">Development (Dev)</MenuItem>
                  <MenuItem value="uat">User Acceptance Testing (UAT)</MenuItem>
                  <MenuItem value="production">Production (Prod)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Deployment Strategy</InputLabel>
                <Select
                  value={formData.strategy}
                  label="Deployment Strategy"
                  onChange={(e) => setFormData({ ...formData, strategy: e.target.value as any })}
                >
                  <MenuItem value="rolling">
                    <Box>
                      <Typography fontWeight="bold">Rolling Update</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Gradual replacement of old pods with new ones (Safest)
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="blue-green">
                    <Box>
                      <Typography fontWeight="bold">Blue-Green Deployment</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Run two identical environments, instant switch (Fast rollback)
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="canary">
                    <Box>
                      <Typography fontWeight="bold">Canary Deployment</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Test on small % of traffic first (Best for testing)
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>{formData.strategy === 'rolling' ? 'Rolling Update' : formData.strategy === 'blue-green' ? 'Blue-Green' : 'Canary'}</strong> strategy ensures zero-downtime deployment.
                  {formData.strategy === 'rolling' && ' Pods are updated gradually.'}
                  {formData.strategy === 'blue-green' && ' You can switch between environments instantly.'}
                  {formData.strategy === 'canary' && ' Start with 10% traffic, then scale up.'}
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cluster ARN"
                value={formData.clusterArn}
                onChange={(e) => setFormData({ ...formData, clusterArn: e.target.value })}
                placeholder="arn:aws:eks:us-east-1:123456789012:cluster/my-cluster"
                helperText="EKS cluster ARN or OKE cluster ID"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Kubernetes Namespace"
                value={formData.namespace}
                onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                placeholder="default"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Container Image"
                value={formData.imageRegistry}
                onChange={(e) => setFormData({ ...formData, imageRegistry: e.target.value })}
                placeholder="nginx or myregistry.io/myapp"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Number of Replicas"
                value={formData.replicas || 3}
                onChange={(e) => setFormData({ ...formData, replicas: parseInt(e.target.value) || 3 })}
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Container Port"
                value={formData.containerPort || 80}
                onChange={(e) => setFormData({ ...formData, containerPort: parseInt(e.target.value) || 80 })}
                inputProps={{ min: 1, max: 65535 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CPU Request"
                value={formData.resources?.cpu}
                onChange={(e) => setFormData({
                  ...formData,
                  resources: { ...formData.resources!, cpu: e.target.value }
                })}
                placeholder="e.g., 500m, 1"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Memory Request"
                value={formData.resources?.memory}
                onChange={(e) => setFormData({
                  ...formData,
                  resources: { ...formData.resources!, memory: e.target.value }
                })}
                placeholder="e.g., 512Mi, 1Gi"
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Resource Recommendations:</strong> For production workloads, we recommend at least 3 replicas with 500m CPU and 512Mi memory per pod.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>Review Your Deployment</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Application</Typography>
                    <Typography variant="h6">{formData.application}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Version</Typography>
                    <Typography variant="h6">{formData.version}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Cloud Provider</Typography>
                    <Typography variant="h6">{formData.cloud.toUpperCase()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Environment</Typography>
                    <Typography variant="h6">{formData.environment.toUpperCase()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Strategy</Typography>
                    <Typography variant="h6">{formData.strategy.replace('-', ' ').toUpperCase()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Replicas</Typography>
                    <Typography variant="h6">{formData.replicas}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  if (deploymentStatus) {
    return (
      <Box>
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              {deploymentStatus.status === 'completed' ? (
                <>
                  <CheckCircleIcon sx={{ fontSize: 80, color: '#10b981', mb: 2 }} />
                  <Typography variant="h4" sx={{ mb: 2 }}>Deployment Successful!</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    {formData.application} has been deployed to {formData.cloud.toUpperCase()} {formData.environment}
                  </Typography>
                  <Chip label="Deployment ID: " sx={{ mb: 3 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    {deploymentId}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button variant="contained" onClick={() => window.location.reload()}>
                      New Deployment
                    </Button>
                    <Button variant="outlined" color="error" onClick={handleRollback}>
                      Rollback
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <CircularProgress size={80} sx={{ mb: 2 }} />
                  <Typography variant="h5" sx={{ mb: 1 }}>Deployment In Progress</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {deploymentStatus.message}
                  </Typography>
                  <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
                    <LinearProgress variant="determinate" value={deploymentStatus.progress} />
                    <Typography variant="body2" sx={{ mt: 1 }}>{deploymentStatus.progress}%</Typography>
                  </Box>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        Deploy Application
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Deploy your application with zero-downtime strategies
      </Typography>

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mb: 4, minHeight: 300 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleDeploy}
                  disabled={deploying}
                  startIcon={deploying ? <CircularProgress size={20} /> : null}
                >
                  {deploying ? 'Deploying...' : 'Deploy Now'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={
                    (activeStep === 0 && (!formData.application || !formData.version))
                  }
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
