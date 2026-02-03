/**
 * ComputeServicesStep Component
 * Configure EKS clusters, EC2 instances, and Auto Scaling Groups
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Grid,
  Slider,
  Autocomplete,
  Divider,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  ComputeConfig,
  IAMConfig,
  EKSCluster,
  EKSNodeGroup,
  EC2Instance,
  AutoScalingGroup,
  LaunchTemplate,
  PlatformValidationError,
  EC2_INSTANCE_TYPES,
  EKS_VERSIONS,
  DEFAULT_SCALING_CONFIG,
  DEFAULT_EKS_LOGGING,
  DEFAULT_ROOT_VOLUME,
  ScalingConfig,
} from '../../../../../types/platform';
import { NetworkLayerData, SubnetConfig, SecurityGroupConfig } from '../../../../../types/network';

export interface ComputeServicesStepProps {
  compute: ComputeConfig;
  iam: IAMConfig;
  networkData?: NetworkLayerData;
  onChange: (compute: ComputeConfig) => void;
  errors: PlatformValidationError[];
}

type TabValue = 'eks' | 'ec2' | 'asg';

export function ComputeServicesStep({
  compute,
  iam,
  networkData,
  onChange,
  errors,
}: ComputeServicesStepProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('eks');
  const [eksDialogOpen, setEksDialogOpen] = useState(false);
  const [ec2DialogOpen, setEc2DialogOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<EKSCluster | null>(null);
  const [editingInstance, setEditingInstance] = useState<EC2Instance | null>(null);

  // Get available resources from network layer
  const subnets = networkData?.subnets || [];
  const securityGroups = networkData?.securityGroups || [];
  const privateSubnets = subnets.filter((s) => !s.isPublic);
  const publicSubnets = subnets.filter((s) => s.isPublic);

  // Get available IAM roles
  const eksRoles = iam.roles.filter((r) =>
    r.assumeRolePolicy.Statement.some((s) => s.Principal?.Service === 'eks.amazonaws.com')
  );
  const ec2Roles = iam.roles.filter((r) =>
    r.assumeRolePolicy.Statement.some((s) => s.Principal?.Service === 'ec2.amazonaws.com')
  );
  const instanceProfiles = iam.instanceProfiles;

  // Flatten instance types for autocomplete
  const allInstanceTypes = useMemo(() => {
    return Object.entries(EC2_INSTANCE_TYPES).flatMap(([category, types]) =>
      types.map((t) => ({ ...t, category }))
    );
  }, []);

  // Get errors for a resource
  const getErrorsForResource = useCallback(
    (resourceId: string) => errors.filter((e) => e.resourceId === resourceId && e.severity === 'error'),
    [errors]
  );

  // ===== EKS Handlers =====

  const handleAddEksCluster = useCallback(() => {
    const newCluster: EKSCluster = {
      id: uuid(),
      name: '',
      version: EKS_VERSIONS[0],
      subnetIds: [],
      securityGroupIds: [],
      endpointPublicAccess: true,
      endpointPrivateAccess: true,
      publicAccessCidrs: ['0.0.0.0/0'],
      logging: { ...DEFAULT_EKS_LOGGING },
      nodeGroups: [],
      tags: [],
    };
    setEditingCluster(newCluster);
    setEksDialogOpen(true);
  }, []);

  const handleEditEksCluster = useCallback((cluster: EKSCluster) => {
    setEditingCluster({ ...cluster });
    setEksDialogOpen(true);
  }, []);

  const handleSaveEksCluster = useCallback(() => {
    if (!editingCluster) return;

    const exists = compute.eksClusters.some((c) => c.id === editingCluster.id);
    if (exists) {
      onChange({
        ...compute,
        eksClusters: compute.eksClusters.map((c) =>
          c.id === editingCluster.id ? editingCluster : c
        ),
      });
    } else {
      onChange({
        ...compute,
        eksClusters: [...compute.eksClusters, editingCluster],
      });
    }

    setEksDialogOpen(false);
    setEditingCluster(null);
  }, [editingCluster, compute, onChange]);

  const handleDeleteEksCluster = useCallback(
    (clusterId: string) => {
      onChange({
        ...compute,
        eksClusters: compute.eksClusters.filter((c) => c.id !== clusterId),
      });
    },
    [compute, onChange]
  );

  const handleAddNodeGroup = useCallback(() => {
    if (!editingCluster) return;

    const newNodeGroup: EKSNodeGroup = {
      id: uuid(),
      name: `${editingCluster.name}-ng-${editingCluster.nodeGroups.length + 1}`,
      instanceTypes: ['t3.medium'],
      scalingConfig: { ...DEFAULT_SCALING_CONFIG },
      subnetIds: editingCluster.subnetIds,
      labels: {},
      taints: [],
      tags: [],
    };

    setEditingCluster({
      ...editingCluster,
      nodeGroups: [...editingCluster.nodeGroups, newNodeGroup],
    });
  }, [editingCluster]);

  const handleUpdateNodeGroup = useCallback(
    (nodeGroupId: string, updates: Partial<EKSNodeGroup>) => {
      if (!editingCluster) return;

      setEditingCluster({
        ...editingCluster,
        nodeGroups: editingCluster.nodeGroups.map((ng) =>
          ng.id === nodeGroupId ? { ...ng, ...updates } : ng
        ),
      });
    },
    [editingCluster]
  );

  const handleDeleteNodeGroup = useCallback(
    (nodeGroupId: string) => {
      if (!editingCluster) return;

      setEditingCluster({
        ...editingCluster,
        nodeGroups: editingCluster.nodeGroups.filter((ng) => ng.id !== nodeGroupId),
      });
    },
    [editingCluster]
  );

  // ===== EC2 Handlers =====

  const handleAddEc2Instance = useCallback(() => {
    const newInstance: EC2Instance = {
      id: uuid(),
      name: '',
      instanceType: 't3.medium',
      amiId: '',
      subnetId: privateSubnets[0]?.id || '',
      securityGroupIds: [],
      ebsOptimized: true,
      monitoring: true,
      rootVolume: { ...DEFAULT_ROOT_VOLUME },
      additionalVolumes: [],
      tags: [],
    };
    setEditingInstance(newInstance);
    setEc2DialogOpen(true);
  }, [privateSubnets]);

  const handleEditEc2Instance = useCallback((instance: EC2Instance) => {
    setEditingInstance({ ...instance });
    setEc2DialogOpen(true);
  }, []);

  const handleSaveEc2Instance = useCallback(() => {
    if (!editingInstance) return;

    const exists = compute.ec2Instances.some((i) => i.id === editingInstance.id);
    if (exists) {
      onChange({
        ...compute,
        ec2Instances: compute.ec2Instances.map((i) =>
          i.id === editingInstance.id ? editingInstance : i
        ),
      });
    } else {
      onChange({
        ...compute,
        ec2Instances: [...compute.ec2Instances, editingInstance],
      });
    }

    setEc2DialogOpen(false);
    setEditingInstance(null);
  }, [editingInstance, compute, onChange]);

  const handleDeleteEc2Instance = useCallback(
    (instanceId: string) => {
      onChange({
        ...compute,
        ec2Instances: compute.ec2Instances.filter((i) => i.id !== instanceId),
      });
    },
    [compute, onChange]
  );

  // ===== Render Functions =====

  const renderEksTab = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">EKS Clusters</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddEksCluster}>
          Add EKS Cluster
        </Button>
      </Box>

      {compute.eksClusters.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <CloudIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            No EKS clusters configured
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Amazon EKS provides managed Kubernetes clusters for container workloads.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {compute.eksClusters.map((cluster) => {
            const clusterErrors = getErrorsForResource(cluster.id);

            return (
              <Card key={cluster.id}>
                {clusterErrors.length > 0 && (
                  <Box sx={{ height: 4, bgcolor: 'error.main' }} />
                )}
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudIcon color="primary" />
                        {cluster.name || 'Unnamed Cluster'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Kubernetes {cluster.version} | {cluster.nodeGroups.length} node group(s)
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEditEksCluster(cluster)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteEksCluster(cluster.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {clusterErrors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {clusterErrors.map((err, i) => (
                        <Typography key={i} variant="body2">{err.message}</Typography>
                      ))}
                    </Alert>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`${cluster.subnetIds.length} subnets`} size="small" variant="outlined" />
                    <Chip
                      label={cluster.endpointPrivateAccess ? 'Private endpoint' : 'Public only'}
                      size="small"
                      color={cluster.endpointPrivateAccess ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </Box>

                  {cluster.nodeGroups.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Node Groups
                      </Typography>
                      {cluster.nodeGroups.map((ng) => (
                        <Chip
                          key={ng.id}
                          label={`${ng.name}: ${ng.scalingConfig.desiredSize}x ${ng.instanceTypes[0]}`}
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );

  const renderEc2Tab = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">EC2 Instances</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddEc2Instance}>
          Add EC2 Instance
        </Button>
      </Box>

      {compute.ec2Instances.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <StorageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            No EC2 instances configured
          </Typography>
          <Typography variant="body2" color="text.secondary">
            EC2 provides resizable virtual servers in the cloud.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {compute.ec2Instances.map((instance) => {
            const instanceErrors = getErrorsForResource(instance.id);
            const subnet = subnets.find((s) => s.id === instance.subnetId);

            return (
              <Card key={instance.id}>
                {instanceErrors.length > 0 && (
                  <Box sx={{ height: 4, bgcolor: 'error.main' }} />
                )}
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StorageIcon color="primary" />
                        {instance.name || 'Unnamed Instance'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {instance.instanceType} | {subnet?.name || 'No subnet'}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEditEc2Instance(instance)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteEc2Instance(instance.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {instanceErrors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {instanceErrors.map((err, i) => (
                        <Typography key={i} variant="body2">{err.message}</Typography>
                      ))}
                    </Alert>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={subnet?.isPublic ? 'Public subnet' : 'Private subnet'}
                      size="small"
                      color={subnet?.isPublic ? 'warning' : 'success'}
                      variant="outlined"
                    />
                    <Chip
                      label={instance.rootVolume.encrypted ? 'Encrypted' : 'Not encrypted'}
                      size="small"
                      color={instance.rootVolume.encrypted ? 'success' : 'error'}
                      variant="outlined"
                    />
                    {instance.instanceProfileId && (
                      <Chip label="Has IAM role" size="small" variant="outlined" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );

  const renderAsgTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Auto Scaling Groups require Launch Templates. Configure Launch Templates first, then create ASGs.
      </Alert>
      <Typography variant="body2" color="text.secondary">
        Auto Scaling Groups functionality coming soon. For now, use EKS managed node groups for auto-scaling Kubernetes workloads.
      </Typography>
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Compute Services
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure compute resources for your application workloads. Choose between managed
          Kubernetes (EKS) or traditional virtual machines (EC2).
        </Typography>
      </Box>

      {/* Network Layer Warning */}
      {!networkData && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Network Layer is not configured. Compute resources require subnets and security groups
          from the Network Layer.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label={`EKS Clusters (${compute.eksClusters.length})`} value="eks" />
        <Tab label={`EC2 Instances (${compute.ec2Instances.length})`} value="ec2" />
        <Tab label={`Auto Scaling (${compute.autoScalingGroups.length})`} value="asg" />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'eks' && renderEksTab()}
      {activeTab === 'ec2' && renderEc2Tab()}
      {activeTab === 'asg' && renderAsgTab()}

      {/* EKS Dialog */}
      <Dialog open={eksDialogOpen} onClose={() => setEksDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCluster && compute.eksClusters.some((c) => c.id === editingCluster.id)
            ? 'Edit EKS Cluster'
            : 'Add EKS Cluster'}
        </DialogTitle>
        <DialogContent>
          {editingCluster && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Cluster Name"
                value={editingCluster.name}
                onChange={(e) => setEditingCluster({ ...editingCluster, name: e.target.value })}
                fullWidth
                required
              />

              <FormControl fullWidth>
                <InputLabel>Kubernetes Version</InputLabel>
                <Select
                  value={editingCluster.version}
                  onChange={(e) => setEditingCluster({ ...editingCluster, version: e.target.value })}
                  label="Kubernetes Version"
                >
                  {EKS_VERSIONS.map((v) => (
                    <MenuItem key={v} value={v}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Subnets</InputLabel>
                <Select
                  multiple
                  value={editingCluster.subnetIds}
                  onChange={(e) => setEditingCluster({ ...editingCluster, subnetIds: e.target.value as string[] })}
                  label="Subnets"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((id) => {
                        const subnet = subnets.find((s) => s.id === id);
                        return <Chip key={id} label={subnet?.name || id} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {privateSubnets.map((subnet) => (
                    <MenuItem key={subnet.id} value={subnet.id}>
                      {subnet.name} ({subnet.cidrBlock}) - Private
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Security Groups</InputLabel>
                <Select
                  multiple
                  value={editingCluster.securityGroupIds}
                  onChange={(e) => setEditingCluster({ ...editingCluster, securityGroupIds: e.target.value as string[] })}
                  label="Security Groups"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((id) => {
                        const sg = securityGroups.find((s) => s.id === id);
                        return <Chip key={id} label={sg?.name || id} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {securityGroups.map((sg) => (
                    <MenuItem key={sg.id} value={sg.id}>
                      {sg.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider sx={{ my: 1 }} />

              <Typography variant="subtitle2">Endpoint Access</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingCluster.endpointPrivateAccess}
                    onChange={(e) =>
                      setEditingCluster({ ...editingCluster, endpointPrivateAccess: e.target.checked })
                    }
                  />
                }
                label="Private endpoint access (recommended)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editingCluster.endpointPublicAccess}
                    onChange={(e) =>
                      setEditingCluster({ ...editingCluster, endpointPublicAccess: e.target.checked })
                    }
                  />
                }
                label="Public endpoint access"
              />

              <Divider sx={{ my: 1 }} />

              {/* Node Groups */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">Node Groups</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddNodeGroup}>
                  Add Node Group
                </Button>
              </Box>

              {editingCluster.nodeGroups.map((ng) => (
                <Card key={ng.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <TextField
                      label="Node Group Name"
                      value={ng.name}
                      onChange={(e) => handleUpdateNodeGroup(ng.id, { name: e.target.value })}
                      size="small"
                    />
                    <IconButton size="small" color="error" onClick={() => handleDeleteNodeGroup(ng.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Autocomplete
                        options={allInstanceTypes}
                        getOptionLabel={(opt) => `${opt.type} (${opt.vcpu} vCPU, ${opt.memory}GB)`}
                        groupBy={(opt) => opt.category}
                        value={allInstanceTypes.find((t) => t.type === ng.instanceTypes[0]) || null}
                        onChange={(_, value) =>
                          handleUpdateNodeGroup(ng.id, { instanceTypes: value ? [value.type] : [] })
                        }
                        renderInput={(params) => <TextField {...params} label="Instance Type" size="small" />}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Desired Size"
                        type="number"
                        value={ng.scalingConfig.desiredSize}
                        onChange={(e) =>
                          handleUpdateNodeGroup(ng.id, {
                            scalingConfig: { ...ng.scalingConfig, desiredSize: parseInt(e.target.value) || 1 },
                          })
                        }
                        size="small"
                        fullWidth
                        inputProps={{ min: 1, max: 100 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Min Size"
                        type="number"
                        value={ng.scalingConfig.minSize}
                        onChange={(e) =>
                          handleUpdateNodeGroup(ng.id, {
                            scalingConfig: { ...ng.scalingConfig, minSize: parseInt(e.target.value) || 1 },
                          })
                        }
                        size="small"
                        fullWidth
                        inputProps={{ min: 0, max: 100 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Max Size"
                        type="number"
                        value={ng.scalingConfig.maxSize}
                        onChange={(e) =>
                          handleUpdateNodeGroup(ng.id, {
                            scalingConfig: { ...ng.scalingConfig, maxSize: parseInt(e.target.value) || 1 },
                          })
                        }
                        size="small"
                        fullWidth
                        inputProps={{ min: 1, max: 100 }}
                      />
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEksDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEksCluster} disabled={!editingCluster?.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* EC2 Dialog */}
      <Dialog open={ec2DialogOpen} onClose={() => setEc2DialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingInstance && compute.ec2Instances.some((i) => i.id === editingInstance.id)
            ? 'Edit EC2 Instance'
            : 'Add EC2 Instance'}
        </DialogTitle>
        <DialogContent>
          {editingInstance && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Instance Name"
                value={editingInstance.name}
                onChange={(e) => setEditingInstance({ ...editingInstance, name: e.target.value })}
                fullWidth
                required
              />

              <Autocomplete
                options={allInstanceTypes}
                getOptionLabel={(opt) => `${opt.type} (${opt.vcpu} vCPU, ${opt.memory}GB - $${opt.price}/hr)`}
                groupBy={(opt) => opt.category}
                value={allInstanceTypes.find((t) => t.type === editingInstance.instanceType) || null}
                onChange={(_, value) =>
                  setEditingInstance({ ...editingInstance, instanceType: value?.type || 't3.medium' })
                }
                renderInput={(params) => <TextField {...params} label="Instance Type" />}
              />

              <FormControl fullWidth>
                <InputLabel>Subnet</InputLabel>
                <Select
                  value={editingInstance.subnetId}
                  onChange={(e) => setEditingInstance({ ...editingInstance, subnetId: e.target.value })}
                  label="Subnet"
                >
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">Private Subnets (Recommended)</Typography>
                  </MenuItem>
                  {privateSubnets.map((subnet) => (
                    <MenuItem key={subnet.id} value={subnet.id}>
                      {subnet.name} ({subnet.cidrBlock})
                    </MenuItem>
                  ))}
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">Public Subnets</Typography>
                  </MenuItem>
                  {publicSubnets.map((subnet) => (
                    <MenuItem key={subnet.id} value={subnet.id}>
                      {subnet.name} ({subnet.cidrBlock})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Security Groups</InputLabel>
                <Select
                  multiple
                  value={editingInstance.securityGroupIds}
                  onChange={(e) =>
                    setEditingInstance({ ...editingInstance, securityGroupIds: e.target.value as string[] })
                  }
                  label="Security Groups"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((id) => {
                        const sg = securityGroups.find((s) => s.id === id);
                        return <Chip key={id} label={sg?.name || id} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {securityGroups.map((sg) => (
                    <MenuItem key={sg.id} value={sg.id}>
                      {sg.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Instance Profile (IAM Role)</InputLabel>
                <Select
                  value={editingInstance.instanceProfileId || ''}
                  onChange={(e) =>
                    setEditingInstance({ ...editingInstance, instanceProfileId: e.target.value || undefined })
                  }
                  label="Instance Profile (IAM Role)"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {instanceProfiles.map((ip) => {
                    const role = iam.roles.find((r) => r.id === ip.roleId);
                    return (
                      <MenuItem key={ip.id} value={ip.id}>
                        {ip.name} ({role?.name || 'Unknown role'})
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <Divider sx={{ my: 1 }} />

              <Typography variant="subtitle2">Root Volume</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Size (GB)"
                    type="number"
                    value={editingInstance.rootVolume.size}
                    onChange={(e) =>
                      setEditingInstance({
                        ...editingInstance,
                        rootVolume: { ...editingInstance.rootVolume, size: parseInt(e.target.value) || 20 },
                      })
                    }
                    fullWidth
                    inputProps={{ min: 8, max: 16384 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Volume Type</InputLabel>
                    <Select
                      value={editingInstance.rootVolume.volumeType}
                      onChange={(e) =>
                        setEditingInstance({
                          ...editingInstance,
                          rootVolume: {
                            ...editingInstance.rootVolume,
                            volumeType: e.target.value as any,
                          },
                        })
                      }
                      label="Volume Type"
                    >
                      <MenuItem value="gp3">GP3 (Recommended)</MenuItem>
                      <MenuItem value="gp2">GP2</MenuItem>
                      <MenuItem value="io1">IO1 (Provisioned IOPS)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <FormControlLabel
                control={
                  <Switch
                    checked={editingInstance.rootVolume.encrypted}
                    onChange={(e) =>
                      setEditingInstance({
                        ...editingInstance,
                        rootVolume: { ...editingInstance.rootVolume, encrypted: e.target.checked },
                      })
                    }
                  />
                }
                label="Encrypt root volume (recommended)"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEc2DialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEc2Instance} disabled={!editingInstance?.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ComputeServicesStep;
