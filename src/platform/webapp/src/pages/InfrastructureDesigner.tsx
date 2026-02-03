/**
 * Infrastructure Designer Page
 * Main page for visual infrastructure design with wizard workflow
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  CloudQueue as CloudIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Check as CheckIcon,
  Visibility as PreviewIcon,
  CloudDownload as ExportIcon,
} from '@mui/icons-material';
import {
  DesignWizardProvider,
  useDesignWizard,
  LayerType,
} from '../contexts/DesignWizardContext';
import { WizardDrawer } from '../components/visualDesigner/wizard';

// =============================================
// LAYER CONFIGURATION
// =============================================

const LAYER_CONFIG = {
  network: {
    title: 'Network Layer',
    description: 'VPC, subnets, security groups, and connectivity',
    icon: <CloudIcon />,
    color: '#2196F3',
  },
  platform: {
    title: 'Platform Layer',
    description: 'Compute, databases, caching, and load balancing',
    icon: <StorageIcon />,
    color: '#4CAF50',
  },
  devops: {
    title: 'DevOps Layer',
    description: 'CI/CD, monitoring, logging, and secrets',
    icon: <SpeedIcon />,
    color: '#FF9800',
  },
};

// =============================================
// NEW DESIGN DIALOG
// =============================================

interface NewDesignDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    cloud: 'aws' | 'oci' | 'azure' | 'gcp';
    region: string;
    templateId?: string;
  }) => void;
}

function NewDesignDialog({ open, onClose, onSubmit }: NewDesignDialogProps) {
  const [name, setName] = useState('');
  const [cloud, setCloud] = useState<'aws' | 'oci' | 'azure' | 'gcp'>('aws');
  const [region, setRegion] = useState('us-east-1');

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit({ name, cloud, region });
      setName('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Infrastructure Design</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Design Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Production EKS Cluster"
          />
          <FormControl fullWidth>
            <InputLabel>Cloud Provider</InputLabel>
            <Select
              value={cloud}
              label="Cloud Provider"
              onChange={(e) => setCloud(e.target.value as 'aws' | 'oci' | 'azure' | 'gcp')}
            >
              <MenuItem value="aws">Amazon Web Services (AWS)</MenuItem>
              <MenuItem value="azure">Microsoft Azure</MenuItem>
              <MenuItem value="gcp">Google Cloud Platform</MenuItem>
              <MenuItem value="oci">Oracle Cloud Infrastructure</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Region</InputLabel>
            <Select
              value={region}
              label="Region"
              onChange={(e) => setRegion(e.target.value)}
            >
              <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
              <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
              <MenuItem value="eu-west-1">EU (Ireland)</MenuItem>
              <MenuItem value="ap-southeast-1">Asia Pacific (Singapore)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          Create Design
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// =============================================
// LAYER STATUS INDICATOR
// =============================================

interface LayerStatusProps {
  layer: LayerType;
  config: typeof LAYER_CONFIG.network;
}

function LayerStatusCard({ layer, config }: LayerStatusProps) {
  const { layers, currentLayer, setCurrentLayer, isLayerComplete, openWizard } = useDesignWizard();
  const layerState = layers[layer];
  const isActive = currentLayer === layer;
  const isComplete = isLayerComplete(layer);

  // Check if layer is locked (dependencies not met)
  const isLocked = (() => {
    if (layer === 'network') return false;
    if (layer === 'platform') return !isLayerComplete('network');
    if (layer === 'devops') return !isLayerComplete('platform');
    return false;
  })();

  const handleConfigure = useCallback(() => {
    if (!isLocked) {
      setCurrentLayer(layer);
      openWizard();
    }
  }, [isLocked, setCurrentLayer, layer, openWizard]);

  return (
    <Card
      sx={{
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.5 : 1,
        border: isActive ? `2px solid ${config.color}` : '1px solid #e0e0e0',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: isLocked ? 'none' : 3,
        },
      }}
      onClick={handleConfigure}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ color: config.color }}>{config.icon}</Box>
          <Typography variant="h6">{config.title}</Typography>
          {isComplete && <CheckIcon color="success" />}
          {layerState.status === 'deployed' && (
            <Chip label="Deployed" size="small" color="success" />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {config.description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          disabled={isLocked}
          onClick={(e) => {
            e.stopPropagation();
            handleConfigure();
          }}
        >
          {isComplete ? 'Edit' : 'Configure'}
        </Button>
      </CardActions>
    </Card>
  );
}

// =============================================
// MAIN DESIGNER COMPONENT
// =============================================

function InfrastructureDesignerContent() {
  const {
    workflowId,
    designName,
    initializeWorkflow,
    openWizard,
  } = useDesignWizard();

  const [newDesignOpen, setNewDesignOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleCreateDesign = async (data: {
    name: string;
    cloud: 'aws' | 'oci' | 'azure' | 'gcp';
    region: string;
  }) => {
    await initializeWorkflow(data.name, data.cloud, data.region);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Infrastructure Designer
          </Typography>
          <Typography color="text.secondary">
            Design and deploy cloud infrastructure with a guided wizard workflow
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            disabled={!workflowId}
          >
            Preview
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            disabled={!workflowId}
          >
            Export Terraform
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewDesignOpen(true)}
          >
            New Design
          </Button>
        </Box>
      </Box>

      {/* Active Design Banner */}
      {workflowId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography>
              Active Design: <strong>{designName}</strong>
            </Typography>
            <Button size="small" onClick={openWizard}>
              Continue Editing
            </Button>
          </Box>
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Layer Overview" />
          <Tab label="Visual Designer" />
          <Tab label="Templates" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {(['network', 'platform', 'devops'] as LayerType[]).map((layer) => (
            <Grid item xs={12} md={4} key={layer}>
              <LayerStatusCard
                layer={layer}
                config={LAYER_CONFIG[layer]}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 3, minHeight: 500, bgcolor: '#fafafa' }}>
          <Typography variant="h6" gutterBottom>
            Visual Designer Canvas
          </Typography>
          <Typography color="text.secondary">
            The interactive visual designer will be rendered here using React Flow.
            Components can be dragged from the palette and connected to build your infrastructure.
          </Typography>

          {/* Placeholder for ReactFlow canvas */}
          <Box
            sx={{
              mt: 2,
              height: 400,
              border: '2px dashed #ccc',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">
              ReactFlow Canvas - Drag components here
            </Typography>
          </Box>
        </Paper>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          {[
            {
              name: '3-Tier Web Application',
              category: 'fullstack',
              description: 'VPC, ALB, EKS cluster, RDS PostgreSQL, ElastiCache Redis',
            },
            {
              name: 'Microservices Platform',
              category: 'compute_platform',
              description: 'EKS with service mesh, RDS, SQS, SNS',
            },
            {
              name: 'Serverless API',
              category: 'compute_platform',
              description: 'API Gateway, Lambda, DynamoDB, CloudWatch',
            },
            {
              name: 'Data Lake Foundation',
              category: 'storage_database',
              description: 'S3, Glue, Athena, Redshift Serverless',
            },
          ].map((template, i) => (
            <Grid item xs={12} md={6} lg={3} key={i}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {template.name}
                  </Typography>
                  <Chip label={template.category} size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {template.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small">Preview</Button>
                  <Button size="small" variant="contained">
                    Use Template
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* New Design Dialog */}
      <NewDesignDialog
        open={newDesignOpen}
        onClose={() => setNewDesignOpen(false)}
        onSubmit={handleCreateDesign}
      />

      {/* Wizard Drawer - Now using the new implementation */}
      <WizardDrawer />
    </Box>
  );
}

// =============================================
// EXPORTED COMPONENT WITH PROVIDER
// =============================================

export default function InfrastructureDesigner() {
  return (
    <DesignWizardProvider apiBaseUrl="/api/v1">
      <InfrastructureDesignerContent />
    </DesignWizardProvider>
  );
}
