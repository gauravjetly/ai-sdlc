/**
 * IAMRolesPoliciesStep Component
 * Configure IAM roles, trust policies, and permissions
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Tooltip,
  Autocomplete,
  Grid,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Policy as PolicyIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  IAMConfig,
  IAMRole,
  InlinePolicy,
  TrustPolicy,
  PolicyDocument,
  InstanceProfile,
  PlatformValidationError,
  COMMON_MANAGED_POLICIES,
  SERVICE_PRINCIPALS,
  createDefaultTrustPolicy,
  createEmptyPolicyDocument,
} from '../../../../../types/platform';

export interface IAMRolesPoliciesStepProps {
  iam: IAMConfig;
  onChange: (iam: IAMConfig) => void;
  errors: PlatformValidationError[];
  onValidate?: (errors: PlatformValidationError[]) => void;
}

interface RoleDialogState {
  open: boolean;
  mode: 'create' | 'edit';
  role: IAMRole | null;
}

interface PolicyDialogState {
  open: boolean;
  roleId: string;
  policy: InlinePolicy | null;
}

const DEFAULT_NEW_ROLE: Omit<IAMRole, 'id'> = {
  name: '',
  description: '',
  path: '/',
  assumeRolePolicy: createDefaultTrustPolicy('ec2.amazonaws.com'),
  managedPolicies: [],
  inlinePolicies: [],
  maxSessionDuration: 3600,
  tags: [],
};

export function IAMRolesPoliciesStep({
  iam,
  onChange,
  errors,
  onValidate,
}: IAMRolesPoliciesStepProps) {
  const [roleDialog, setRoleDialog] = useState<RoleDialogState>({
    open: false,
    mode: 'create',
    role: null,
  });
  const [policyDialog, setPolicyDialog] = useState<PolicyDialogState>({
    open: false,
    roleId: '',
    policy: null,
  });
  const [editingRole, setEditingRole] = useState<IAMRole | null>(null);
  const [selectedService, setSelectedService] = useState<string>('ec2.amazonaws.com');
  const [policyJson, setPolicyJson] = useState<string>('');
  const [policyJsonError, setPolicyJsonError] = useState<string>('');

  // Get errors for a specific role
  const getErrorsForRole = useCallback(
    (roleId: string) => errors.filter((e) => e.resourceId === roleId && e.severity === 'error'),
    [errors]
  );

  // Get warnings for a specific role
  const getWarningsForRole = useCallback(
    (roleId: string) => errors.filter((e) => e.resourceId === roleId && e.severity === 'warning'),
    [errors]
  );

  // Open role dialog for creation
  const handleAddRole = useCallback(() => {
    const newRole: IAMRole = {
      id: uuid(),
      ...DEFAULT_NEW_ROLE,
    };
    setEditingRole(newRole);
    setSelectedService('ec2.amazonaws.com');
    setRoleDialog({ open: true, mode: 'create', role: newRole });
  }, []);

  // Open role dialog for editing
  const handleEditRole = useCallback((role: IAMRole) => {
    setEditingRole({ ...role });
    const servicePrincipal = role.assumeRolePolicy.Statement[0]?.Principal?.Service;
    if (typeof servicePrincipal === 'string') {
      setSelectedService(servicePrincipal);
    }
    setRoleDialog({ open: true, mode: 'edit', role });
  }, []);

  // Save role
  const handleSaveRole = useCallback(() => {
    if (!editingRole) return;

    // Update trust policy with selected service
    const updatedRole: IAMRole = {
      ...editingRole,
      assumeRolePolicy: createDefaultTrustPolicy(selectedService),
    };

    if (roleDialog.mode === 'create') {
      onChange({
        ...iam,
        roles: [...iam.roles, updatedRole],
      });
    } else {
      onChange({
        ...iam,
        roles: iam.roles.map((r) => (r.id === updatedRole.id ? updatedRole : r)),
      });
    }

    setRoleDialog({ open: false, mode: 'create', role: null });
    setEditingRole(null);
  }, [editingRole, selectedService, roleDialog.mode, iam, onChange]);

  // Delete role
  const handleDeleteRole = useCallback(
    (roleId: string) => {
      onChange({
        ...iam,
        roles: iam.roles.filter((r) => r.id !== roleId),
        instanceProfiles: iam.instanceProfiles.filter((ip) => ip.roleId !== roleId),
      });
    },
    [iam, onChange]
  );

  // Toggle managed policy
  const handleToggleManagedPolicy = useCallback(
    (roleId: string, policyArn: string) => {
      const role = iam.roles.find((r) => r.id === roleId);
      if (!role) return;

      const hasPolicy = role.managedPolicies.includes(policyArn);
      const updatedPolicies = hasPolicy
        ? role.managedPolicies.filter((p) => p !== policyArn)
        : [...role.managedPolicies, policyArn];

      onChange({
        ...iam,
        roles: iam.roles.map((r) =>
          r.id === roleId ? { ...r, managedPolicies: updatedPolicies } : r
        ),
      });
    },
    [iam, onChange]
  );

  // Open inline policy dialog
  const handleAddInlinePolicy = useCallback((roleId: string) => {
    setPolicyJson(JSON.stringify(createEmptyPolicyDocument(), null, 2));
    setPolicyJsonError('');
    setPolicyDialog({
      open: true,
      roleId,
      policy: null,
    });
  }, []);

  // Edit inline policy
  const handleEditInlinePolicy = useCallback((roleId: string, policy: InlinePolicy) => {
    setPolicyJson(JSON.stringify(policy.document, null, 2));
    setPolicyJsonError('');
    setPolicyDialog({
      open: true,
      roleId,
      policy,
    });
  }, []);

  // Save inline policy
  const handleSaveInlinePolicy = useCallback(
    (policyName: string) => {
      try {
        const document = JSON.parse(policyJson) as PolicyDocument;

        // Validate required fields
        if (document.Version !== '2012-10-17') {
          setPolicyJsonError('Policy Version must be "2012-10-17"');
          return;
        }
        if (!document.Statement || !Array.isArray(document.Statement)) {
          setPolicyJsonError('Policy must have a Statement array');
          return;
        }

        const policy: InlinePolicy = {
          name: policyName,
          document,
        };

        const role = iam.roles.find((r) => r.id === policyDialog.roleId);
        if (!role) return;

        let updatedPolicies: InlinePolicy[];
        if (policyDialog.policy) {
          // Edit existing
          updatedPolicies = role.inlinePolicies.map((p) =>
            p.name === policyDialog.policy!.name ? policy : p
          );
        } else {
          // Add new
          updatedPolicies = [...role.inlinePolicies, policy];
        }

        onChange({
          ...iam,
          roles: iam.roles.map((r) =>
            r.id === policyDialog.roleId ? { ...r, inlinePolicies: updatedPolicies } : r
          ),
        });

        setPolicyDialog({ open: false, roleId: '', policy: null });
      } catch (e) {
        setPolicyJsonError('Invalid JSON syntax');
      }
    },
    [policyJson, policyDialog, iam, onChange]
  );

  // Delete inline policy
  const handleDeleteInlinePolicy = useCallback(
    (roleId: string, policyName: string) => {
      onChange({
        ...iam,
        roles: iam.roles.map((r) =>
          r.id === roleId
            ? { ...r, inlinePolicies: r.inlinePolicies.filter((p) => p.name !== policyName) }
            : r
        ),
      });
    },
    [iam, onChange]
  );

  // Toggle instance profile for role
  const handleToggleInstanceProfile = useCallback(
    (roleId: string, roleName: string) => {
      const hasProfile = iam.instanceProfiles.some((ip) => ip.roleId === roleId);

      if (hasProfile) {
        onChange({
          ...iam,
          instanceProfiles: iam.instanceProfiles.filter((ip) => ip.roleId !== roleId),
        });
      } else {
        const newProfile: InstanceProfile = {
          id: uuid(),
          name: `${roleName}-instance-profile`,
          roleId,
        };
        onChange({
          ...iam,
          instanceProfiles: [...iam.instanceProfiles, newProfile],
        });
      }
    },
    [iam, onChange]
  );

  // Check if role has instance profile
  const hasInstanceProfile = useCallback(
    (roleId: string) => iam.instanceProfiles.some((ip) => ip.roleId === roleId),
    [iam.instanceProfiles]
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          IAM Roles and Policies
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure IAM roles that your platform resources will use. Roles define what actions
          AWS services can perform on your behalf.
        </Typography>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Tip:</strong> Follow the principle of least privilege. Only grant the permissions
          necessary for your workload. You can always add more permissions later.
        </Typography>
      </Alert>

      {/* Add Role Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddRole}
        >
          Add IAM Role
        </Button>
      </Box>

      {/* Roles List */}
      {iam.roles.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No IAM Roles Configured
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            IAM roles are optional but recommended for EC2, EKS, and other services
            that need to access AWS resources.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddRole}>
            Create Your First Role
          </Button>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {iam.roles.map((role) => {
            const roleErrors = getErrorsForRole(role.id);
            const roleWarnings = getWarningsForRole(role.id);

            return (
              <Card key={role.id} sx={{ position: 'relative' }}>
                {/* Error/Warning Indicators */}
                {roleErrors.length > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      bgcolor: 'error.main',
                    }}
                  />
                )}
                {roleErrors.length === 0 && roleWarnings.length > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      bgcolor: 'warning.main',
                    }}
                  />
                )}

                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon fontSize="small" color="primary" />
                        {role.name || 'Unnamed Role'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {role.description || 'No description'}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEditRole(role)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteRole(role.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Errors Display */}
                  {roleErrors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {roleErrors.map((err, i) => (
                        <Typography key={i} variant="body2">
                          {err.message}
                        </Typography>
                      ))}
                    </Alert>
                  )}

                  {/* Warnings Display */}
                  {roleWarnings.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      {roleWarnings.map((warn, i) => (
                        <Typography key={i} variant="body2">
                          {warn.message}
                        </Typography>
                      ))}
                    </Alert>
                  )}

                  {/* Trust Policy */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Trust Policy (Who can assume this role)
                    </Typography>
                    <Chip
                      label={role.assumeRolePolicy.Statement[0]?.Principal?.Service || 'Custom'}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  {/* Instance Profile Toggle */}
                  {role.assumeRolePolicy.Statement[0]?.Principal?.Service === 'ec2.amazonaws.com' && (
                    <Box sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={hasInstanceProfile(role.id)}
                            onChange={() => handleToggleInstanceProfile(role.id, role.name)}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Create Instance Profile (required for EC2)
                          </Typography>
                        }
                      />
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Managed Policies */}
                  <Accordion defaultExpanded={role.managedPolicies.length > 0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        Managed Policies ({role.managedPolicies.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {COMMON_MANAGED_POLICIES.map((policy) => (
                          <Chip
                            key={policy.arn}
                            label={policy.name}
                            size="small"
                            variant={role.managedPolicies.includes(policy.arn) ? 'filled' : 'outlined'}
                            color={role.managedPolicies.includes(policy.arn) ? 'primary' : 'default'}
                            onClick={() => handleToggleManagedPolicy(role.id, policy.arn)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  {/* Inline Policies */}
                  <Accordion defaultExpanded={role.inlinePolicies.length > 0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        Inline Policies ({role.inlinePolicies.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {role.inlinePolicies.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No inline policies. Click below to add a custom policy.
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {role.inlinePolicies.map((policy) => (
                            <Box
                              key={policy.name}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                p: 1,
                                bgcolor: 'grey.50',
                                borderRadius: 1,
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PolicyIcon fontSize="small" color="action" />
                                <Typography variant="body2">{policy.name}</Typography>
                                <Chip
                                  label={`${policy.document.Statement.length} statement(s)`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                              <Box>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditInlinePolicy(role.id, policy)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteInlinePolicy(role.id, policy.name)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddInlinePolicy(role.id)}
                        sx={{ mt: 1 }}
                      >
                        Add Inline Policy
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Role Dialog */}
      <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ ...roleDialog, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {roleDialog.mode === 'create' ? 'Create IAM Role' : 'Edit IAM Role'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Role Name"
              value={editingRole?.name || ''}
              onChange={(e) => setEditingRole((prev) => prev ? { ...prev, name: e.target.value } : null)}
              fullWidth
              required
              helperText="Use alphanumeric characters, hyphens, and underscores. Max 64 characters."
            />
            <TextField
              label="Description"
              value={editingRole?.description || ''}
              onChange={(e) => setEditingRole((prev) => prev ? { ...prev, description: e.target.value } : null)}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Trusted Service</InputLabel>
              <Select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                label="Trusted Service"
              >
                {SERVICE_PRINCIPALS.map((sp) => (
                  <MenuItem key={sp.service} value={sp.service}>
                    {sp.name} ({sp.service})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog({ ...roleDialog, open: false })}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRole} disabled={!editingRole?.name}>
            {roleDialog.mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog open={policyDialog.open} onClose={() => setPolicyDialog({ ...policyDialog, open: false })} maxWidth="md" fullWidth>
        <DialogTitle>
          {policyDialog.policy ? 'Edit Inline Policy' : 'Add Inline Policy'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Policy Name"
              defaultValue={policyDialog.policy?.name || ''}
              fullWidth
              required
              id="policy-name-input"
            />
            <Alert severity="info">
              Enter a valid IAM policy document in JSON format. The policy must have a Version of
              "2012-10-17" and at least one Statement.
            </Alert>
            <TextField
              label="Policy Document (JSON)"
              value={policyJson}
              onChange={(e) => {
                setPolicyJson(e.target.value);
                setPolicyJsonError('');
              }}
              fullWidth
              multiline
              rows={15}
              error={!!policyJsonError}
              helperText={policyJsonError}
              sx={{ fontFamily: 'monospace' }}
              InputProps={{
                sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialog({ ...policyDialog, open: false })}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const nameInput = document.getElementById('policy-name-input') as HTMLInputElement;
              handleSaveInlinePolicy(nameInput?.value || 'unnamed-policy');
            }}
          >
            Save Policy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default IAMRolesPoliciesStep;
