/**
 * SubnetDesignStep Component
 * Step 2 of Network Wizard - Design subnet topology
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Collapse,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  SubnetConfig,
  ValidationError,
} from '../../../../../types/network';
import { FormField, CIDRInput, TagsEditor } from '../../shared';
import { useNetworkValidation, useCIDRCalculator } from '../../hooks';
import { getAZsForRegion, HELP_TEXT } from '../../utils/constants';

export interface SubnetDesignStepProps {
  vpcCidr: string;
  region: string;
  subnets: SubnetConfig[];
  onChange: (subnets: SubnetConfig[]) => void;
  errors: ValidationError[];
}

interface SubnetFormData {
  id: string;
  name: string;
  cidrBlock: string;
  availabilityZone: string;
  isPublic: boolean;
  mapPublicIpOnLaunch: boolean;
  tags: Array<{ key: string; value: string }>;
}

const DEFAULT_SUBNET: SubnetFormData = {
  id: '',
  name: '',
  cidrBlock: '',
  availabilityZone: '',
  isPublic: false,
  mapPublicIpOnLaunch: false,
  tags: [],
};

export function SubnetDesignStep({
  vpcCidr,
  region,
  subnets,
  onChange,
  errors,
}: SubnetDesignStepProps) {
  const { validateSubnetConfig, isCIDRInRange, doCIDRsOverlap } = useNetworkValidation();
  const { suggestCIDRs, getAvailableIPs } = useCIDRCalculator();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState<SubnetFormData | null>(null);
  const [formData, setFormData] = useState<SubnetFormData>(DEFAULT_SUBNET);
  const [formErrors, setFormErrors] = useState<ValidationError[]>([]);

  // Get available AZs for region
  const availabilityZones = useMemo(() => getAZsForRegion(region), [region]);

  // Get suggested CIDRs
  const suggestedCIDRs = useMemo(() => {
    const existingCIDRs = subnets
      .filter((s) => s.id !== formData.id)
      .map((s) => s.cidrBlock);
    return suggestCIDRs(vpcCidr, existingCIDRs, 4, 24);
  }, [vpcCidr, subnets, formData.id, suggestCIDRs]);

  // Group subnets by type
  const publicSubnets = useMemo(() => subnets.filter((s) => s.isPublic), [subnets]);
  const privateSubnets = useMemo(() => subnets.filter((s) => !s.isPublic), [subnets]);

  // Get warnings
  const subnetWarnings = useMemo(() => {
    return errors.filter((e) => e.severity === 'warning');
  }, [errors]);

  // Open add dialog
  const handleAddClick = useCallback(() => {
    setEditingSubnet(null);
    setFormData({
      ...DEFAULT_SUBNET,
      id: uuid(),
      cidrBlock: suggestedCIDRs[0] || '',
      availabilityZone: availabilityZones[0]?.id || '',
    });
    setFormErrors([]);
    setDialogOpen(true);
  }, [suggestedCIDRs, availabilityZones]);

  // Open edit dialog
  const handleEditClick = useCallback((subnet: SubnetConfig) => {
    setEditingSubnet(subnet);
    setFormData({ ...subnet });
    setFormErrors([]);
    setDialogOpen(true);
  }, []);

  // Delete subnet
  const handleDeleteClick = useCallback(
    (subnetId: string) => {
      onChange(subnets.filter((s) => s.id !== subnetId));
    },
    [subnets, onChange]
  );

  // Close dialog
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingSubnet(null);
    setFormData(DEFAULT_SUBNET);
    setFormErrors([]);
  }, []);

  // Save subnet
  const handleSaveSubnet = useCallback(() => {
    // Validate
    const validationErrors = validateSubnetConfig(formData, vpcCidr, subnets);
    if (validationErrors.filter((e) => e.severity === 'error').length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    // Save
    if (editingSubnet) {
      // Update existing
      onChange(subnets.map((s) => (s.id === formData.id ? formData : s)));
    } else {
      // Add new
      onChange([...subnets, formData]);
    }

    handleCloseDialog();
  }, [formData, vpcCidr, subnets, editingSubnet, onChange, validateSubnetConfig, handleCloseDialog]);

  // Form field handlers
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, name: e.target.value }));
    },
    []
  );

  const handleCIDRChange = useCallback((cidrBlock: string) => {
    setFormData((prev) => ({ ...prev, cidrBlock }));
  }, []);

  const handleAZChange = useCallback((e: SelectChangeEvent<string>) => {
    setFormData((prev) => ({ ...prev, availabilityZone: e.target.value }));
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const isPublic = e.target.checked;
    setFormData((prev) => ({
      ...prev,
      isPublic,
      mapPublicIpOnLaunch: isPublic ? prev.mapPublicIpOnLaunch : false,
    }));
  }, []);

  const handlePublicIpChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, mapPublicIpOnLaunch: e.target.checked }));
    },
    []
  );

  const handleTagsChange = useCallback((tags: SubnetFormData['tags']) => {
    setFormData((prev) => ({ ...prev, tags }));
  }, []);

  // Get error for field
  const getFieldError = useCallback(
    (field: string): string | undefined => {
      const fieldError = formErrors.find(
        (e) => e.path?.includes(field) && e.severity === 'error'
      );
      return fieldError?.message;
    },
    [formErrors]
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Subnet Design
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Design your subnet architecture. Distribute subnets across availability zones
        for high availability.
      </Typography>

      {/* Warnings */}
      {subnetWarnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {subnetWarnings.map((w, i) => (
            <Typography key={i} variant="body2">
              {w.message}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Add Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Add Subnet
        </Button>
      </Box>

      {/* Subnet Summary */}
      {subnets.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip
            icon={<PublicIcon />}
            label={`${publicSubnets.length} Public`}
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<PrivateIcon />}
            label={`${privateSubnets.length} Private`}
            color="secondary"
            variant="outlined"
          />
        </Box>
      )}

      {/* Subnet Table */}
      {subnets.length > 0 ? (
        <Paper variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>CIDR Block</TableCell>
                <TableCell>AZ</TableCell>
                <TableCell>Available IPs</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subnets.map((subnet) => (
                <TableRow key={subnet.id}>
                  <TableCell>{subnet.name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={subnet.isPublic ? <PublicIcon /> : <PrivateIcon />}
                      label={subnet.isPublic ? 'Public' : 'Private'}
                      color={subnet.isPublic ? 'primary' : 'secondary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {subnet.cidrBlock}
                    </Typography>
                  </TableCell>
                  <TableCell>{subnet.availabilityZone}</TableCell>
                  <TableCell>
                    {getAvailableIPs(subnet.cidrBlock, true).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(subnet)}
                      aria-label={`Edit ${subnet.name}`}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(subnet.id)}
                      aria-label={`Delete ${subnet.name}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography color="text.secondary">
            No subnets configured. Click "Add Subnet" to create your first subnet.
          </Typography>
        </Paper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingSubnet ? 'Edit Subnet' : 'Add Subnet'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Name */}
            <FormField
              label="Subnet Name"
              required
              helpText="A unique name for this subnet"
              error={getFieldError('name')}
            >
              <TextField
                size="small"
                fullWidth
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g., public-subnet-1a"
                error={!!getFieldError('name')}
              />
            </FormField>

            {/* Type */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPublic}
                    onChange={handleTypeChange}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      {formData.isPublic ? 'Public Subnet' : 'Private Subnet'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {HELP_TEXT.subnetType}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {/* CIDR */}
            <CIDRInput
              label="CIDR Block"
              value={formData.cidrBlock}
              onChange={handleCIDRChange}
              error={getFieldError('cidrBlock')}
              required
              showPresets
              presets={suggestedCIDRs.map((c) => ({
                value: c,
                label: `${c} (${getAvailableIPs(c, true)} IPs)`,
              }))}
              isSubnet
              placeholder="10.0.1.0/24"
            />

            {/* Availability Zone */}
            <FormField
              label="Availability Zone"
              required
              helpText={HELP_TEXT.availabilityZone}
              error={getFieldError('availabilityZone')}
            >
              <FormControl size="small" fullWidth error={!!getFieldError('availabilityZone')}>
                <Select
                  value={formData.availabilityZone}
                  onChange={handleAZChange}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    Select Availability Zone
                  </MenuItem>
                  {availabilityZones.map((az) => (
                    <MenuItem key={az.id} value={az.id}>
                      {az.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormField>

            {/* Auto-assign Public IP (only for public subnets) */}
            <Collapse in={formData.isPublic}>
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.mapPublicIpOnLaunch}
                      onChange={handlePublicIpChange}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">
                        Auto-assign public IPv4 address
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {HELP_TEXT.mapPublicIp}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Collapse>

            {/* Tags */}
            <TagsEditor tags={formData.tags} onChange={handleTagsChange} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSubnet}>
            {editingSubnet ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SubnetDesignStep;
