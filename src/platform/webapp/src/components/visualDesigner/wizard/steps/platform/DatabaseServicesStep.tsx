/**
 * DatabaseServicesStep Component
 * Configure RDS instances and database settings
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
  FormControlLabel,
  Switch,
  Grid,
  Slider,
  Autocomplete,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon,
  Lock as LockIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  DatabaseConfig,
  RDSInstance,
  DBSubnetGroup,
  PlatformValidationError,
  RDS_INSTANCE_CLASSES,
  DATABASE_ENGINES,
  DatabaseEngine,
  RDSStorageType,
} from '../../../../../types/platform';
import { NetworkLayerData, SubnetConfig, SecurityGroupConfig } from '../../../../../types/network';

export interface DatabaseServicesStepProps {
  database: DatabaseConfig;
  networkData?: NetworkLayerData;
  onChange: (database: DatabaseConfig) => void;
  errors: PlatformValidationError[];
}

export function DatabaseServicesStep({
  database,
  networkData,
  onChange,
  errors,
}: DatabaseServicesStepProps) {
  const [rdsDialogOpen, setRdsDialogOpen] = useState(false);
  const [subnetGroupDialogOpen, setSubnetGroupDialogOpen] = useState(false);
  const [editingRds, setEditingRds] = useState<RDSInstance | null>(null);
  const [editingSubnetGroup, setEditingSubnetGroup] = useState<DBSubnetGroup | null>(null);

  // Get available resources from network layer
  const subnets = networkData?.subnets || [];
  const securityGroups = networkData?.securityGroups || [];
  const privateSubnets = subnets.filter((s) => !s.isPublic);

  // Flatten instance classes for autocomplete
  const allInstanceClasses = useMemo(() => {
    return Object.entries(RDS_INSTANCE_CLASSES).flatMap(([category, classes]) =>
      classes.map((c) => ({ ...c, category }))
    );
  }, []);

  // Get errors for a resource
  const getErrorsForResource = useCallback(
    (resourceId: string) => errors.filter((e) => e.resourceId === resourceId && e.severity === 'error'),
    [errors]
  );

  const getWarningsForResource = useCallback(
    (resourceId: string) => errors.filter((e) => e.resourceId === resourceId && e.severity === 'warning'),
    [errors]
  );

  // ===== Subnet Group Handlers =====

  const handleAddSubnetGroup = useCallback(() => {
    const newGroup: DBSubnetGroup = {
      id: uuid(),
      name: '',
      description: '',
      subnetIds: [],
      tags: [],
    };
    setEditingSubnetGroup(newGroup);
    setSubnetGroupDialogOpen(true);
  }, []);

  const handleSaveSubnetGroup = useCallback(() => {
    if (!editingSubnetGroup) return;

    const exists = database.subnetGroups.some((g) => g.id === editingSubnetGroup.id);
    if (exists) {
      onChange({
        ...database,
        subnetGroups: database.subnetGroups.map((g) =>
          g.id === editingSubnetGroup.id ? editingSubnetGroup : g
        ),
      });
    } else {
      onChange({
        ...database,
        subnetGroups: [...database.subnetGroups, editingSubnetGroup],
      });
    }

    setSubnetGroupDialogOpen(false);
    setEditingSubnetGroup(null);
  }, [editingSubnetGroup, database, onChange]);

  const handleDeleteSubnetGroup = useCallback(
    (groupId: string) => {
      // Check if any RDS instance uses this subnet group
      const inUse = database.rdsInstances.some((db) => db.subnetGroupId === groupId);
      if (inUse) {
        alert('Cannot delete subnet group that is in use by an RDS instance');
        return;
      }

      onChange({
        ...database,
        subnetGroups: database.subnetGroups.filter((g) => g.id !== groupId),
      });
    },
    [database, onChange]
  );

  // ===== RDS Handlers =====

  const handleAddRds = useCallback(() => {
    const engine: DatabaseEngine = 'postgres';
    const engineInfo = DATABASE_ENGINES[engine];

    const newRds: RDSInstance = {
      id: uuid(),
      identifier: '',
      engine,
      engineVersion: engineInfo.versions[0],
      instanceClass: 'db.t3.medium',
      allocatedStorage: 20,
      storageType: 'gp2',
      multiAZ: false,
      subnetGroupId: database.subnetGroups[0]?.id || '',
      securityGroupIds: [],
      publiclyAccessible: false,
      masterUsername: 'admin',
      port: engineInfo.defaultPort,
      encrypted: true,
      backupRetentionPeriod: 7,
      autoMinorVersionUpgrade: true,
      performanceInsightsEnabled: false,
      deletionProtection: false,
      tags: [],
    };
    setEditingRds(newRds);
    setRdsDialogOpen(true);
  }, [database.subnetGroups]);

  const handleEditRds = useCallback((rds: RDSInstance) => {
    setEditingRds({ ...rds });
    setRdsDialogOpen(true);
  }, []);

  const handleSaveRds = useCallback(() => {
    if (!editingRds) return;

    const exists = database.rdsInstances.some((r) => r.id === editingRds.id);
    if (exists) {
      onChange({
        ...database,
        rdsInstances: database.rdsInstances.map((r) =>
          r.id === editingRds.id ? editingRds : r
        ),
      });
    } else {
      onChange({
        ...database,
        rdsInstances: [...database.rdsInstances, editingRds],
      });
    }

    setRdsDialogOpen(false);
    setEditingRds(null);
  }, [editingRds, database, onChange]);

  const handleDeleteRds = useCallback(
    (rdsId: string) => {
      onChange({
        ...database,
        rdsInstances: database.rdsInstances.filter((r) => r.id !== rdsId),
      });
    },
    [database, onChange]
  );

  const handleEngineChange = useCallback(
    (engine: DatabaseEngine) => {
      if (!editingRds) return;

      const engineInfo = DATABASE_ENGINES[engine];
      setEditingRds({
        ...editingRds,
        engine,
        engineVersion: engineInfo.versions[0],
        port: engineInfo.defaultPort,
      });
    },
    [editingRds]
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Database Services
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure managed database instances using Amazon RDS. RDS handles backups, patching,
          and high availability for your databases.
        </Typography>
      </Box>

      {/* Network Layer Warning */}
      {!networkData && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Network Layer is not configured. Database instances require subnets and security groups
          from the Network Layer.
        </Alert>
      )}

      {/* Subnet Groups Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">DB Subnet Groups</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddSubnetGroup}
            disabled={privateSubnets.length < 2}
          >
            Add Subnet Group
          </Button>
        </Box>

        {privateSubnets.length < 2 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            DB Subnet Groups require at least 2 private subnets in different availability zones.
            Please configure more subnets in the Network Layer.
          </Alert>
        )}

        {database.subnetGroups.length === 0 ? (
          <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" color="text.secondary">
              No DB Subnet Groups configured. Create one before adding RDS instances.
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {database.subnetGroups.map((group) => {
              const groupSubnets = group.subnetIds
                .map((id) => subnets.find((s) => s.id === id))
                .filter(Boolean);

              return (
                <Chip
                  key={group.id}
                  label={`${group.name} (${groupSubnets.length} subnets)`}
                  onDelete={() => handleDeleteSubnetGroup(group.id)}
                  variant="outlined"
                />
              );
            })}
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* RDS Instances Section */}
      <Box>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">RDS Instances</Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddRds}
            disabled={database.subnetGroups.length === 0}
          >
            Add RDS Instance
          </Button>
        </Box>

        {database.subnetGroups.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Create a DB Subnet Group first before adding RDS instances.
          </Alert>
        )}

        {database.rdsInstances.length === 0 ? (
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <StorageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" gutterBottom>
              No RDS instances configured
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Amazon RDS provides managed PostgreSQL, MySQL, MariaDB, Oracle, and SQL Server databases.
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {database.rdsInstances.map((rds) => {
              const rdsErrors = getErrorsForResource(rds.id);
              const rdsWarnings = getWarningsForResource(rds.id);
              const engineInfo = DATABASE_ENGINES[rds.engine];
              const subnetGroup = database.subnetGroups.find((g) => g.id === rds.subnetGroupId);

              return (
                <Card key={rds.id}>
                  {rdsErrors.length > 0 && (
                    <Box sx={{ height: 4, bgcolor: 'error.main' }} />
                  )}
                  {rdsErrors.length === 0 && rdsWarnings.length > 0 && (
                    <Box sx={{ height: 4, bgcolor: 'warning.main' }} />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StorageIcon color="primary" />
                          {rds.identifier || 'Unnamed Database'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {engineInfo.name} {rds.engineVersion} | {rds.instanceClass}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => handleEditRds(rds)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteRds(rds.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {rdsErrors.length > 0 && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {rdsErrors.map((err, i) => (
                          <Typography key={i} variant="body2">{err.message}</Typography>
                        ))}
                      </Alert>
                    )}

                    {rdsWarnings.length > 0 && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        {rdsWarnings.map((warn, i) => (
                          <Typography key={i} variant="body2">{warn.message}</Typography>
                        ))}
                      </Alert>
                    )}

                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${rds.allocatedStorage}GB ${rds.storageType}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={rds.multiAZ ? 'Multi-AZ' : 'Single-AZ'}
                        size="small"
                        color={rds.multiAZ ? 'success' : 'default'}
                        variant="outlined"
                      />
                      <Chip
                        icon={<LockIcon />}
                        label={rds.encrypted ? 'Encrypted' : 'Not encrypted'}
                        size="small"
                        color={rds.encrypted ? 'success' : 'error'}
                        variant="outlined"
                      />
                      <Chip
                        label={`${rds.backupRetentionPeriod} day backup`}
                        size="small"
                        color={rds.backupRetentionPeriod >= 7 ? 'success' : 'warning'}
                        variant="outlined"
                      />
                      {rds.publiclyAccessible && (
                        <Chip
                          icon={<WarningIcon />}
                          label="Publicly accessible"
                          size="small"
                          color="error"
                        />
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Subnet Group: {subnetGroup?.name || 'Not set'} | Port: {rds.port}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Subnet Group Dialog */}
      <Dialog open={subnetGroupDialogOpen} onClose={() => setSubnetGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create DB Subnet Group</DialogTitle>
        <DialogContent>
          {editingSubnetGroup && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Subnet Group Name"
                value={editingSubnetGroup.name}
                onChange={(e) =>
                  setEditingSubnetGroup({ ...editingSubnetGroup, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
                }
                fullWidth
                required
                helperText="Lowercase letters, numbers, and hyphens only"
              />
              <TextField
                label="Description"
                value={editingSubnetGroup.description}
                onChange={(e) =>
                  setEditingSubnetGroup({ ...editingSubnetGroup, description: e.target.value })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Subnets (select at least 2 in different AZs)</InputLabel>
                <Select
                  multiple
                  value={editingSubnetGroup.subnetIds}
                  onChange={(e) =>
                    setEditingSubnetGroup({ ...editingSubnetGroup, subnetIds: e.target.value as string[] })
                  }
                  label="Subnets (select at least 2 in different AZs)"
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
                      {subnet.name} ({subnet.cidrBlock}) - {subnet.availabilityZone}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Alert severity="info">
                Select subnets from at least 2 different availability zones for high availability.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubnetGroupDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSubnetGroup}
            disabled={!editingSubnetGroup?.name || (editingSubnetGroup?.subnetIds.length || 0) < 2}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* RDS Dialog */}
      <Dialog open={rdsDialogOpen} onClose={() => setRdsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRds && database.rdsInstances.some((r) => r.id === editingRds.id)
            ? 'Edit RDS Instance'
            : 'Add RDS Instance'}
        </DialogTitle>
        <DialogContent>
          {editingRds && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="DB Instance Identifier"
                    value={editingRds.identifier}
                    onChange={(e) =>
                      setEditingRds({
                        ...editingRds,
                        identifier: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                      })
                    }
                    fullWidth
                    required
                    helperText="Lowercase letters, numbers, and hyphens only"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Master Username"
                    value={editingRds.masterUsername}
                    onChange={(e) =>
                      setEditingRds({ ...editingRds, masterUsername: e.target.value })
                    }
                    fullWidth
                    required
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Database Engine</InputLabel>
                    <Select
                      value={editingRds.engine}
                      onChange={(e) => handleEngineChange(e.target.value as DatabaseEngine)}
                      label="Database Engine"
                    >
                      {Object.entries(DATABASE_ENGINES).map(([key, info]) => (
                        <MenuItem key={key} value={key}>
                          {info.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Engine Version</InputLabel>
                    <Select
                      value={editingRds.engineVersion}
                      onChange={(e) =>
                        setEditingRds({ ...editingRds, engineVersion: e.target.value })
                      }
                      label="Engine Version"
                    >
                      {DATABASE_ENGINES[editingRds.engine].versions.map((v) => (
                        <MenuItem key={v} value={v}>{v}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Autocomplete
                options={allInstanceClasses}
                getOptionLabel={(opt) => `${opt.class} (${opt.vcpu} vCPU, ${opt.memory}GB - $${opt.price}/hr)`}
                groupBy={(opt) => opt.category}
                value={allInstanceClasses.find((c) => c.class === editingRds.instanceClass) || null}
                onChange={(_, value) =>
                  setEditingRds({ ...editingRds, instanceClass: value?.class || 'db.t3.medium' })
                }
                renderInput={(params) => <TextField {...params} label="Instance Class" />}
              />

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Storage</Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Allocated Storage (GB)"
                    type="number"
                    value={editingRds.allocatedStorage}
                    onChange={(e) =>
                      setEditingRds({
                        ...editingRds,
                        allocatedStorage: parseInt(e.target.value) || 20,
                      })
                    }
                    fullWidth
                    inputProps={{ min: 20, max: 65536 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Storage Type</InputLabel>
                    <Select
                      value={editingRds.storageType}
                      onChange={(e) =>
                        setEditingRds({ ...editingRds, storageType: e.target.value as RDSStorageType })
                      }
                      label="Storage Type"
                    >
                      <MenuItem value="gp2">General Purpose SSD (gp2)</MenuItem>
                      <MenuItem value="gp3">General Purpose SSD (gp3)</MenuItem>
                      <MenuItem value="io1">Provisioned IOPS (io1)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Max Storage (Auto Scaling)"
                    type="number"
                    value={editingRds.maxAllocatedStorage || ''}
                    onChange={(e) =>
                      setEditingRds({
                        ...editingRds,
                        maxAllocatedStorage: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    fullWidth
                    placeholder="Disabled"
                    inputProps={{ min: editingRds.allocatedStorage, max: 65536 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Network & Security</Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>DB Subnet Group</InputLabel>
                    <Select
                      value={editingRds.subnetGroupId}
                      onChange={(e) =>
                        setEditingRds({ ...editingRds, subnetGroupId: e.target.value })
                      }
                      label="DB Subnet Group"
                    >
                      {database.subnetGroups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>
                          {group.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Security Groups</InputLabel>
                    <Select
                      multiple
                      value={editingRds.securityGroupIds}
                      onChange={(e) =>
                        setEditingRds({ ...editingRds, securityGroupIds: e.target.value as string[] })
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
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Availability & Backup</Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingRds.multiAZ}
                        onChange={(e) =>
                          setEditingRds({ ...editingRds, multiAZ: e.target.checked })
                        }
                      />
                    }
                    label="Multi-AZ deployment (recommended for production)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Backup Retention (days)"
                    type="number"
                    value={editingRds.backupRetentionPeriod}
                    onChange={(e) =>
                      setEditingRds({
                        ...editingRds,
                        backupRetentionPeriod: parseInt(e.target.value) || 7,
                      })
                    }
                    fullWidth
                    inputProps={{ min: 0, max: 35 }}
                    helperText="Minimum 7 days recommended for production"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Encryption & Protection</Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={editingRds.encrypted}
                    onChange={(e) =>
                      setEditingRds({ ...editingRds, encrypted: e.target.checked })
                    }
                  />
                }
                label="Enable encryption at rest (recommended)"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={editingRds.deletionProtection}
                    onChange={(e) =>
                      setEditingRds({ ...editingRds, deletionProtection: e.target.checked })
                    }
                  />
                }
                label="Enable deletion protection"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={editingRds.performanceInsightsEnabled}
                    onChange={(e) =>
                      setEditingRds({ ...editingRds, performanceInsightsEnabled: e.target.checked })
                    }
                  />
                }
                label="Enable Performance Insights"
              />

              {editingRds.publiclyAccessible && (
                <Alert severity="error">
                  <strong>Security Risk:</strong> This database is publicly accessible. This is not
                  recommended for production workloads.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRdsDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveRds}
            disabled={!editingRds?.identifier || !editingRds?.subnetGroupId}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DatabaseServicesStep;
