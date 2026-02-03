/**
 * StorageServicesStep Component
 * Configure S3 buckets, EBS volumes, and EFS file systems
 */

import React, { useState, useCallback } from 'react';
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
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudQueue as S3Icon,
  Storage as EBSIcon,
  Folder as EFSIcon,
  Lock as LockIcon,
  History as VersioningIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  StorageConfig,
  S3Bucket,
  EBSVolume,
  EFSFileSystem,
  EFSMountTarget,
  PlatformValidationError,
  EBSVolumeType,
  S3EncryptionType,
  DEFAULT_PUBLIC_ACCESS_BLOCK,
  EBS_PRICING,
} from '../../../../../types/platform';
import { NetworkLayerData } from '../../../../../types/network';

export interface StorageServicesStepProps {
  storage: StorageConfig;
  networkData?: NetworkLayerData;
  onChange: (storage: StorageConfig) => void;
  errors: PlatformValidationError[];
}

type TabValue = 's3' | 'ebs' | 'efs';

export function StorageServicesStep({
  storage,
  networkData,
  onChange,
  errors,
}: StorageServicesStepProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('s3');
  const [s3DialogOpen, setS3DialogOpen] = useState(false);
  const [ebsDialogOpen, setEbsDialogOpen] = useState(false);
  const [efsDialogOpen, setEfsDialogOpen] = useState(false);
  const [editingS3, setEditingS3] = useState<S3Bucket | null>(null);
  const [editingEBS, setEditingEBS] = useState<EBSVolume | null>(null);
  const [editingEFS, setEditingEFS] = useState<EFSFileSystem | null>(null);

  // Get available resources from network layer
  const subnets = networkData?.subnets || [];
  const securityGroups = networkData?.securityGroups || [];
  const availabilityZones = [...new Set(subnets.map((s) => s.availabilityZone))];

  // Get errors for a resource
  const getErrorsForResource = useCallback(
    (resourceId: string) => errors.filter((e) => e.resourceId === resourceId && e.severity === 'error'),
    [errors]
  );

  const getWarningsForResource = useCallback(
    (resourceId: string) => errors.filter((e) => e.resourceId === resourceId && e.severity === 'warning'),
    [errors]
  );

  // ===== S3 Handlers =====

  const handleAddS3 = useCallback(() => {
    const newBucket: S3Bucket = {
      id: uuid(),
      name: '',
      versioningEnabled: true,
      mfaDelete: false,
      encryptionType: 'SSE-S3',
      publicAccessBlock: { ...DEFAULT_PUBLIC_ACCESS_BLOCK },
      corsRules: [],
      lifecycleRules: [],
      loggingEnabled: false,
      tags: [],
    };
    setEditingS3(newBucket);
    setS3DialogOpen(true);
  }, []);

  const handleEditS3 = useCallback((bucket: S3Bucket) => {
    setEditingS3({ ...bucket });
    setS3DialogOpen(true);
  }, []);

  const handleSaveS3 = useCallback(() => {
    if (!editingS3) return;

    const exists = storage.s3Buckets.some((b) => b.id === editingS3.id);
    if (exists) {
      onChange({
        ...storage,
        s3Buckets: storage.s3Buckets.map((b) => (b.id === editingS3.id ? editingS3 : b)),
      });
    } else {
      onChange({
        ...storage,
        s3Buckets: [...storage.s3Buckets, editingS3],
      });
    }

    setS3DialogOpen(false);
    setEditingS3(null);
  }, [editingS3, storage, onChange]);

  const handleDeleteS3 = useCallback(
    (bucketId: string) => {
      onChange({
        ...storage,
        s3Buckets: storage.s3Buckets.filter((b) => b.id !== bucketId),
      });
    },
    [storage, onChange]
  );

  // ===== EBS Handlers =====

  const handleAddEBS = useCallback(() => {
    const newVolume: EBSVolume = {
      id: uuid(),
      name: '',
      volumeType: 'gp3',
      size: 20,
      encrypted: true,
      availabilityZone: availabilityZones[0] || '',
      tags: [],
    };
    setEditingEBS(newVolume);
    setEbsDialogOpen(true);
  }, [availabilityZones]);

  const handleEditEBS = useCallback((volume: EBSVolume) => {
    setEditingEBS({ ...volume });
    setEbsDialogOpen(true);
  }, []);

  const handleSaveEBS = useCallback(() => {
    if (!editingEBS) return;

    const exists = storage.ebsVolumes.some((v) => v.id === editingEBS.id);
    if (exists) {
      onChange({
        ...storage,
        ebsVolumes: storage.ebsVolumes.map((v) => (v.id === editingEBS.id ? editingEBS : v)),
      });
    } else {
      onChange({
        ...storage,
        ebsVolumes: [...storage.ebsVolumes, editingEBS],
      });
    }

    setEbsDialogOpen(false);
    setEditingEBS(null);
  }, [editingEBS, storage, onChange]);

  const handleDeleteEBS = useCallback(
    (volumeId: string) => {
      onChange({
        ...storage,
        ebsVolumes: storage.ebsVolumes.filter((v) => v.id !== volumeId),
      });
    },
    [storage, onChange]
  );

  // ===== EFS Handlers =====

  const handleAddEFS = useCallback(() => {
    const newFS: EFSFileSystem = {
      id: uuid(),
      name: '',
      performanceMode: 'generalPurpose',
      throughputMode: 'bursting',
      encrypted: true,
      mountTargets: [],
      accessPoints: [],
      tags: [],
    };
    setEditingEFS(newFS);
    setEfsDialogOpen(true);
  }, []);

  const handleEditEFS = useCallback((fs: EFSFileSystem) => {
    setEditingEFS({ ...fs });
    setEfsDialogOpen(true);
  }, []);

  const handleSaveEFS = useCallback(() => {
    if (!editingEFS) return;

    const exists = storage.efsFileSystems.some((f) => f.id === editingEFS.id);
    if (exists) {
      onChange({
        ...storage,
        efsFileSystems: storage.efsFileSystems.map((f) => (f.id === editingEFS.id ? editingEFS : f)),
      });
    } else {
      onChange({
        ...storage,
        efsFileSystems: [...storage.efsFileSystems, editingEFS],
      });
    }

    setEfsDialogOpen(false);
    setEditingEFS(null);
  }, [editingEFS, storage, onChange]);

  const handleDeleteEFS = useCallback(
    (fsId: string) => {
      onChange({
        ...storage,
        efsFileSystems: storage.efsFileSystems.filter((f) => f.id !== fsId),
      });
    },
    [storage, onChange]
  );

  const handleAddMountTarget = useCallback(() => {
    if (!editingEFS) return;

    const newMountTarget: EFSMountTarget = {
      id: uuid(),
      subnetId: subnets[0]?.id || '',
      securityGroupIds: [],
    };

    setEditingEFS({
      ...editingEFS,
      mountTargets: [...editingEFS.mountTargets, newMountTarget],
    });
  }, [editingEFS, subnets]);

  const handleDeleteMountTarget = useCallback(
    (mtId: string) => {
      if (!editingEFS) return;

      setEditingEFS({
        ...editingEFS,
        mountTargets: editingEFS.mountTargets.filter((mt) => mt.id !== mtId),
      });
    },
    [editingEFS]
  );

  // ===== Render Functions =====

  const renderS3Tab = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">S3 Buckets</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddS3}>
          Add S3 Bucket
        </Button>
      </Box>

      {storage.s3Buckets.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <S3Icon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            No S3 buckets configured
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Amazon S3 provides scalable object storage for any amount of data.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {storage.s3Buckets.map((bucket) => {
            const bucketErrors = getErrorsForResource(bucket.id);
            const bucketWarnings = getWarningsForResource(bucket.id);

            return (
              <Card key={bucket.id}>
                {bucketErrors.length > 0 && <Box sx={{ height: 4, bgcolor: 'error.main' }} />}
                {bucketErrors.length === 0 && bucketWarnings.length > 0 && (
                  <Box sx={{ height: 4, bgcolor: 'warning.main' }} />
                )}
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <S3Icon color="primary" />
                        {bucket.name || 'Unnamed Bucket'}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEditS3(bucket)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteS3(bucket.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {bucketErrors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {bucketErrors.map((err, i) => (
                        <Typography key={i} variant="body2">{err.message}</Typography>
                      ))}
                    </Alert>
                  )}

                  {bucketWarnings.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      {bucketWarnings.map((warn, i) => (
                        <Typography key={i} variant="body2">{warn.message}</Typography>
                      ))}
                    </Alert>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<VersioningIcon />}
                      label={bucket.versioningEnabled ? 'Versioning ON' : 'Versioning OFF'}
                      size="small"
                      color={bucket.versioningEnabled ? 'success' : 'default'}
                      variant="outlined"
                    />
                    <Chip
                      icon={<LockIcon />}
                      label={bucket.encryptionType === 'NONE' ? 'Not encrypted' : bucket.encryptionType}
                      size="small"
                      color={bucket.encryptionType !== 'NONE' ? 'success' : 'error'}
                      variant="outlined"
                    />
                    <Chip
                      label={bucket.publicAccessBlock.blockPublicAcls ? 'Public blocked' : 'Public allowed'}
                      size="small"
                      color={bucket.publicAccessBlock.blockPublicAcls ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );

  const renderEBSTab = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">EBS Volumes</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddEBS}
          disabled={availabilityZones.length === 0}
        >
          Add EBS Volume
        </Button>
      </Box>

      {availabilityZones.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          EBS volumes require availability zones. Please configure subnets in the Network Layer first.
        </Alert>
      )}

      {storage.ebsVolumes.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <EBSIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            No EBS volumes configured
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Amazon EBS provides persistent block storage for EC2 instances.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {storage.ebsVolumes.map((volume) => {
            const volumeErrors = getErrorsForResource(volume.id);
            const volumeWarnings = getWarningsForResource(volume.id);
            const monthlyCost = volume.size * (EBS_PRICING[volume.volumeType] || 0.10);

            return (
              <Card key={volume.id}>
                {volumeErrors.length > 0 && <Box sx={{ height: 4, bgcolor: 'error.main' }} />}
                {volumeErrors.length === 0 && volumeWarnings.length > 0 && (
                  <Box sx={{ height: 4, bgcolor: 'warning.main' }} />
                )}
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EBSIcon color="primary" />
                        {volume.name || 'Unnamed Volume'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {volume.size}GB {volume.volumeType.toUpperCase()} | {volume.availabilityZone}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEditEBS(volume)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteEBS(volume.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {volumeErrors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {volumeErrors.map((err, i) => (
                        <Typography key={i} variant="body2">{err.message}</Typography>
                      ))}
                    </Alert>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<LockIcon />}
                      label={volume.encrypted ? 'Encrypted' : 'Not encrypted'}
                      size="small"
                      color={volume.encrypted ? 'success' : 'error'}
                      variant="outlined"
                    />
                    <Chip
                      label={`~$${monthlyCost.toFixed(2)}/month`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );

  const renderEFSTab = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">EFS File Systems</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddEFS}>
          Add EFS File System
        </Button>
      </Box>

      {storage.efsFileSystems.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <EFSIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            No EFS file systems configured
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Amazon EFS provides scalable file storage for use with EC2 and EKS.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {storage.efsFileSystems.map((fs) => {
            const fsErrors = getErrorsForResource(fs.id);
            const fsWarnings = getWarningsForResource(fs.id);

            return (
              <Card key={fs.id}>
                {fsErrors.length > 0 && <Box sx={{ height: 4, bgcolor: 'error.main' }} />}
                {fsErrors.length === 0 && fsWarnings.length > 0 && (
                  <Box sx={{ height: 4, bgcolor: 'warning.main' }} />
                )}
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EFSIcon color="primary" />
                        {fs.name || 'Unnamed File System'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fs.performanceMode} | {fs.throughputMode} | {fs.mountTargets.length} mount target(s)
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEditEFS(fs)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteEFS(fs.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {fsErrors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {fsErrors.map((err, i) => (
                        <Typography key={i} variant="body2">{err.message}</Typography>
                      ))}
                    </Alert>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<LockIcon />}
                      label={fs.encrypted ? 'Encrypted' : 'Not encrypted'}
                      size="small"
                      color={fs.encrypted ? 'success' : 'error'}
                      variant="outlined"
                    />
                    {fs.lifecyclePolicy && (
                      <Chip
                        label={`Lifecycle: ${fs.lifecyclePolicy}`}
                        size="small"
                        variant="outlined"
                      />
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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Storage Services
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure storage resources for your application. S3 for objects, EBS for block storage,
          and EFS for shared file systems.
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label={`S3 Buckets (${storage.s3Buckets.length})`} value="s3" />
        <Tab label={`EBS Volumes (${storage.ebsVolumes.length})`} value="ebs" />
        <Tab label={`EFS File Systems (${storage.efsFileSystems.length})`} value="efs" />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 's3' && renderS3Tab()}
      {activeTab === 'ebs' && renderEBSTab()}
      {activeTab === 'efs' && renderEFSTab()}

      {/* S3 Dialog */}
      <Dialog open={s3DialogOpen} onClose={() => setS3DialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingS3 && storage.s3Buckets.some((b) => b.id === editingS3.id)
            ? 'Edit S3 Bucket'
            : 'Add S3 Bucket'}
        </DialogTitle>
        <DialogContent>
          {editingS3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Bucket Name"
                value={editingS3.name}
                onChange={(e) =>
                  setEditingS3({
                    ...editingS3,
                    name: e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''),
                  })
                }
                fullWidth
                required
                helperText="Globally unique. Lowercase letters, numbers, hyphens, and periods only."
              />

              <FormControl fullWidth>
                <InputLabel>Encryption</InputLabel>
                <Select
                  value={editingS3.encryptionType}
                  onChange={(e) =>
                    setEditingS3({ ...editingS3, encryptionType: e.target.value as S3EncryptionType })
                  }
                  label="Encryption"
                >
                  <MenuItem value="SSE-S3">SSE-S3 (Amazon S3-managed keys)</MenuItem>
                  <MenuItem value="SSE-KMS">SSE-KMS (AWS KMS keys)</MenuItem>
                  <MenuItem value="NONE">None (Not recommended)</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={editingS3.versioningEnabled}
                    onChange={(e) =>
                      setEditingS3({ ...editingS3, versioningEnabled: e.target.checked })
                    }
                  />
                }
                label="Enable versioning (recommended)"
              />

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Public Access Settings</Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={editingS3.publicAccessBlock.blockPublicAcls}
                    onChange={(e) =>
                      setEditingS3({
                        ...editingS3,
                        publicAccessBlock: {
                          ...editingS3.publicAccessBlock,
                          blockPublicAcls: e.target.checked,
                          ignorePublicAcls: e.target.checked,
                          blockPublicPolicy: e.target.checked,
                          restrictPublicBuckets: e.target.checked,
                        },
                      })
                    }
                  />
                }
                label="Block all public access (recommended)"
              />

              {!editingS3.publicAccessBlock.blockPublicAcls && (
                <Alert severity="warning">
                  Allowing public access to S3 buckets can expose your data. Only disable if you
                  specifically need public access (e.g., static website hosting).
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setS3DialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveS3} disabled={!editingS3?.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* EBS Dialog */}
      <Dialog open={ebsDialogOpen} onClose={() => setEbsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEBS && storage.ebsVolumes.some((v) => v.id === editingEBS.id)
            ? 'Edit EBS Volume'
            : 'Add EBS Volume'}
        </DialogTitle>
        <DialogContent>
          {editingEBS && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Volume Name"
                value={editingEBS.name}
                onChange={(e) => setEditingEBS({ ...editingEBS, name: e.target.value })}
                fullWidth
                required
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Volume Type</InputLabel>
                    <Select
                      value={editingEBS.volumeType}
                      onChange={(e) =>
                        setEditingEBS({ ...editingEBS, volumeType: e.target.value as EBSVolumeType })
                      }
                      label="Volume Type"
                    >
                      <MenuItem value="gp3">GP3 (Recommended)</MenuItem>
                      <MenuItem value="gp2">GP2</MenuItem>
                      <MenuItem value="io1">IO1 (Provisioned IOPS)</MenuItem>
                      <MenuItem value="io2">IO2 (Provisioned IOPS)</MenuItem>
                      <MenuItem value="st1">ST1 (Throughput Optimized)</MenuItem>
                      <MenuItem value="sc1">SC1 (Cold HDD)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Size (GB)"
                    type="number"
                    value={editingEBS.size}
                    onChange={(e) =>
                      setEditingEBS({ ...editingEBS, size: parseInt(e.target.value) || 1 })
                    }
                    fullWidth
                    inputProps={{ min: 1, max: 16384 }}
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth>
                <InputLabel>Availability Zone</InputLabel>
                <Select
                  value={editingEBS.availabilityZone}
                  onChange={(e) =>
                    setEditingEBS({ ...editingEBS, availabilityZone: e.target.value })
                  }
                  label="Availability Zone"
                >
                  {availabilityZones.map((az) => (
                    <MenuItem key={az} value={az}>{az}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {(editingEBS.volumeType === 'io1' || editingEBS.volumeType === 'io2') && (
                <TextField
                  label="IOPS"
                  type="number"
                  value={editingEBS.iops || ''}
                  onChange={(e) =>
                    setEditingEBS({ ...editingEBS, iops: parseInt(e.target.value) || undefined })
                  }
                  fullWidth
                  required
                  inputProps={{ min: 100, max: 64000 }}
                />
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={editingEBS.encrypted}
                    onChange={(e) => setEditingEBS({ ...editingEBS, encrypted: e.target.checked })}
                  />
                }
                label="Encrypt volume (recommended)"
              />

              <Alert severity="info">
                Estimated cost: ~${(editingEBS.size * (EBS_PRICING[editingEBS.volumeType] || 0.10)).toFixed(2)}/month
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEbsDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEBS} disabled={!editingEBS?.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* EFS Dialog */}
      <Dialog open={efsDialogOpen} onClose={() => setEfsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEFS && storage.efsFileSystems.some((f) => f.id === editingEFS.id)
            ? 'Edit EFS File System'
            : 'Add EFS File System'}
        </DialogTitle>
        <DialogContent>
          {editingEFS && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="File System Name"
                value={editingEFS.name}
                onChange={(e) => setEditingEFS({ ...editingEFS, name: e.target.value })}
                fullWidth
                required
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Performance Mode</InputLabel>
                    <Select
                      value={editingEFS.performanceMode}
                      onChange={(e) =>
                        setEditingEFS({
                          ...editingEFS,
                          performanceMode: e.target.value as 'generalPurpose' | 'maxIO',
                        })
                      }
                      label="Performance Mode"
                    >
                      <MenuItem value="generalPurpose">General Purpose (Recommended)</MenuItem>
                      <MenuItem value="maxIO">Max I/O (Large scale workloads)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Throughput Mode</InputLabel>
                    <Select
                      value={editingEFS.throughputMode}
                      onChange={(e) =>
                        setEditingEFS({
                          ...editingEFS,
                          throughputMode: e.target.value as 'bursting' | 'provisioned' | 'elastic',
                        })
                      }
                      label="Throughput Mode"
                    >
                      <MenuItem value="bursting">Bursting</MenuItem>
                      <MenuItem value="elastic">Elastic (Recommended)</MenuItem>
                      <MenuItem value="provisioned">Provisioned</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <FormControlLabel
                control={
                  <Switch
                    checked={editingEFS.encrypted}
                    onChange={(e) => setEditingEFS({ ...editingEFS, encrypted: e.target.checked })}
                  />
                }
                label="Encrypt at rest (recommended)"
              />

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">Mount Targets</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddMountTarget}>
                  Add Mount Target
                </Button>
              </Box>

              {editingEFS.mountTargets.length === 0 ? (
                <Alert severity="info">
                  Add mount targets to make the file system accessible from your VPC subnets.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {editingEFS.mountTargets.map((mt, index) => {
                    const subnet = subnets.find((s) => s.id === mt.subnetId);
                    return (
                      <Card key={mt.id} variant="outlined" sx={{ p: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Subnet</InputLabel>
                            <Select
                              value={mt.subnetId}
                              onChange={(e) => {
                                const updated = editingEFS.mountTargets.map((m) =>
                                  m.id === mt.id ? { ...m, subnetId: e.target.value } : m
                                );
                                setEditingEFS({ ...editingEFS, mountTargets: updated });
                              }}
                              label="Subnet"
                            >
                              {subnets.map((s) => (
                                <MenuItem key={s.id} value={s.id}>
                                  {s.name} ({s.availabilityZone})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Security Groups</InputLabel>
                            <Select
                              multiple
                              value={mt.securityGroupIds}
                              onChange={(e) => {
                                const updated = editingEFS.mountTargets.map((m) =>
                                  m.id === mt.id
                                    ? { ...m, securityGroupIds: e.target.value as string[] }
                                    : m
                                );
                                setEditingEFS({ ...editingEFS, mountTargets: updated });
                              }}
                              label="Security Groups"
                              renderValue={(selected) => selected.length + ' selected'}
                            >
                              {securityGroups.map((sg) => (
                                <MenuItem key={sg.id} value={sg.id}>
                                  {sg.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteMountTarget(mt.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEfsDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEFS} disabled={!editingEFS?.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StorageServicesStep;
