/**
 * SecurityGroupsStep Component
 * Step 4 of Network Wizard - Configure security group rules
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
  Tabs,
  Tab,
  Alert,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  ArrowDownward as IngressIcon,
  ArrowUpward as EgressIcon,
  ContentCopy as TemplateIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  SecurityGroupConfig,
  SecurityGroupRule,
  ValidationError,
  COMMON_SECURITY_RULES,
  PROTOCOLS,
} from '../../../../../types/network';
import { FormField, TagsEditor } from '../../shared';
import { HELP_TEXT } from '../../utils/constants';

export interface SecurityGroupsStepProps {
  securityGroups: SecurityGroupConfig[];
  onChange: (securityGroups: SecurityGroupConfig[]) => void;
  errors: ValidationError[];
}

interface RuleFormData {
  id: string;
  protocol: 'tcp' | 'udp' | 'icmp' | '-1';
  fromPort: number;
  toPort: number;
  sourceType: 'cidr' | 'sg' | 'prefix-list';
  source: string;
  description: string;
}

const DEFAULT_RULE: RuleFormData = {
  id: '',
  protocol: 'tcp',
  fromPort: 0,
  toPort: 0,
  sourceType: 'cidr',
  source: '',
  description: '',
};

export function SecurityGroupsStep({
  securityGroups,
  onChange,
  errors,
}: SecurityGroupsStepProps) {
  // State
  const [selectedSGId, setSelectedSGId] = useState<string | null>(
    securityGroups.length > 0 ? securityGroups[0].id : null
  );
  const [sgDialogOpen, setSGDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingSG, setEditingSG] = useState<SecurityGroupConfig | null>(null);
  const [editingRule, setEditingRule] = useState<SecurityGroupRule | null>(null);
  const [isIngress, setIsIngress] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [templateAnchor, setTemplateAnchor] = useState<null | HTMLElement>(null);

  // Form state
  const [sgName, setSGName] = useState('');
  const [sgDescription, setSGDescription] = useState('');
  const [sgTags, setSGTags] = useState<Array<{ key: string; value: string }>>([]);
  const [ruleForm, setRuleForm] = useState<RuleFormData>(DEFAULT_RULE);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Get selected security group
  const selectedSG = useMemo(
    () => securityGroups.find((sg) => sg.id === selectedSGId),
    [securityGroups, selectedSGId]
  );

  // Get warnings for selected SG
  const sgWarnings = useMemo(() => {
    return errors.filter(
      (e) =>
        (e.severity === 'warning' || e.severity === 'error') &&
        e.nodeId === selectedSGId
    );
  }, [errors, selectedSGId]);

  // Add security group
  const handleAddSG = useCallback(() => {
    setEditingSG(null);
    setSGName('');
    setSGDescription('');
    setSGTags([]);
    setSGDialogOpen(true);
  }, []);

  // Edit security group
  const handleEditSG = useCallback((sg: SecurityGroupConfig) => {
    setEditingSG(sg);
    setSGName(sg.name);
    setSGDescription(sg.description);
    setSGTags([...sg.tags]);
    setSGDialogOpen(true);
  }, []);

  // Save security group
  const handleSaveSG = useCallback(() => {
    if (!sgName.trim()) {
      setFormErrors(['Security group name is required']);
      return;
    }

    if (editingSG) {
      // Update
      onChange(
        securityGroups.map((sg) =>
          sg.id === editingSG.id
            ? { ...sg, name: sgName, description: sgDescription, tags: sgTags }
            : sg
        )
      );
    } else {
      // Create
      const newSG: SecurityGroupConfig = {
        id: uuid(),
        name: sgName,
        description: sgDescription,
        ingressRules: [],
        egressRules: [
          // Default egress rule
          {
            id: uuid(),
            protocol: '-1',
            fromPort: 0,
            toPort: 65535,
            sourceType: 'cidr',
            source: '0.0.0.0/0',
            description: 'Allow all outbound traffic',
          },
        ],
        tags: sgTags,
      };
      onChange([...securityGroups, newSG]);
      setSelectedSGId(newSG.id);
    }

    setSGDialogOpen(false);
    setFormErrors([]);
  }, [sgName, sgDescription, sgTags, editingSG, securityGroups, onChange]);

  // Delete security group
  const handleDeleteSG = useCallback(
    (sgId: string) => {
      const newSGs = securityGroups.filter((sg) => sg.id !== sgId);
      onChange(newSGs);
      if (selectedSGId === sgId) {
        setSelectedSGId(newSGs.length > 0 ? newSGs[0].id : null);
      }
    },
    [securityGroups, selectedSGId, onChange]
  );

  // Add rule
  const handleAddRule = useCallback((ingress: boolean) => {
    setIsIngress(ingress);
    setEditingRule(null);
    setRuleForm({ ...DEFAULT_RULE, id: uuid() });
    setRuleDialogOpen(true);
  }, []);

  // Edit rule
  const handleEditRule = useCallback(
    (rule: SecurityGroupRule, ingress: boolean) => {
      setIsIngress(ingress);
      setEditingRule(rule);
      setRuleForm({
        ...rule,
        description: rule.description || '',
      });
      setRuleDialogOpen(true);
    },
    []
  );

  // Delete rule
  const handleDeleteRule = useCallback(
    (ruleId: string, ingress: boolean) => {
      if (!selectedSG) return;

      onChange(
        securityGroups.map((sg) =>
          sg.id === selectedSG.id
            ? {
                ...sg,
                [ingress ? 'ingressRules' : 'egressRules']: sg[
                  ingress ? 'ingressRules' : 'egressRules'
                ].filter((r) => r.id !== ruleId),
              }
            : sg
        )
      );
    },
    [selectedSG, securityGroups, onChange]
  );

  // Save rule
  const handleSaveRule = useCallback(() => {
    if (!selectedSG) return;

    // Validate
    const errors: string[] = [];
    if (ruleForm.sourceType === 'cidr' && !ruleForm.source) {
      errors.push('Source/Destination CIDR is required');
    }
    if (ruleForm.protocol !== '-1' && ruleForm.protocol !== 'icmp') {
      if (ruleForm.fromPort < 0 || ruleForm.fromPort > 65535) {
        errors.push('From port must be between 0 and 65535');
      }
      if (ruleForm.toPort < 0 || ruleForm.toPort > 65535) {
        errors.push('To port must be between 0 and 65535');
      }
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const rulesKey = isIngress ? 'ingressRules' : 'egressRules';
    const rule: SecurityGroupRule = {
      ...ruleForm,
      description: ruleForm.description || undefined,
    };

    onChange(
      securityGroups.map((sg) => {
        if (sg.id !== selectedSG.id) return sg;

        if (editingRule) {
          return {
            ...sg,
            [rulesKey]: sg[rulesKey].map((r) =>
              r.id === editingRule.id ? rule : r
            ),
          };
        } else {
          return {
            ...sg,
            [rulesKey]: [...sg[rulesKey], rule],
          };
        }
      })
    );

    setRuleDialogOpen(false);
    setFormErrors([]);
  }, [selectedSG, ruleForm, isIngress, editingRule, securityGroups, onChange]);

  // Apply template
  const handleApplyTemplate = useCallback(
    (template: (typeof COMMON_SECURITY_RULES)[0]) => {
      setRuleForm({
        id: uuid(),
        protocol: template.protocol,
        fromPort: template.fromPort,
        toPort: template.toPort,
        sourceType: 'cidr',
        source: '0.0.0.0/0',
        description: template.description,
      });
      setTemplateAnchor(null);
      setIsIngress(true);
      setEditingRule(null);
      setRuleDialogOpen(true);
    },
    []
  );

  // Render rules table
  const renderRulesTable = (
    rules: SecurityGroupRule[],
    ingress: boolean
  ) => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          {ingress ? 'Inbound Rules' : 'Outbound Rules'}
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleAddRule(ingress)}
        >
          Add Rule
        </Button>
      </Box>

      {rules.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No {ingress ? 'inbound' : 'outbound'} rules configured
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Protocol</TableCell>
              <TableCell>Port Range</TableCell>
              <TableCell>{ingress ? 'Source' : 'Destination'}</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Chip
                    size="small"
                    label={
                      rule.protocol === '-1'
                        ? 'All Traffic'
                        : rule.protocol.toUpperCase()
                    }
                    color={rule.protocol === '-1' ? 'warning' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{rule.protocol === '-1' ? 'All' : rule.protocol.toUpperCase()}</TableCell>
                <TableCell>
                  {rule.protocol === '-1' || rule.protocol === 'icmp'
                    ? 'All'
                    : rule.fromPort === rule.toPort
                    ? rule.fromPort
                    : `${rule.fromPort}-${rule.toPort}`}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {rule.source}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>
                    {rule.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleEditRule(rule, ingress)}
                    aria-label="Edit rule"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteRule(rule.id, ingress)}
                    aria-label="Delete rule"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Security Groups
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {HELP_TEXT.securityGroup}
      </Typography>

      {/* Security Group List */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Paper sx={{ width: 240, p: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Security Groups</Typography>
            <IconButton size="small" onClick={handleAddSG}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 1 }} />

          {securityGroups.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
              No security groups. Click + to add.
            </Typography>
          ) : (
            securityGroups.map((sg) => (
              <Paper
                key={sg.id}
                variant={selectedSGId === sg.id ? 'elevation' : 'outlined'}
                elevation={selectedSGId === sg.id ? 3 : 0}
                sx={{
                  p: 1,
                  mb: 0.5,
                  cursor: 'pointer',
                  bgcolor: selectedSGId === sg.id ? 'primary.50' : 'transparent',
                  borderColor: selectedSGId === sg.id ? 'primary.main' : 'divider',
                }}
                onClick={() => setSelectedSGId(sg.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon fontSize="small" color="action" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {sg.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {sg.ingressRules.length} in / {sg.egressRules.length} out
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))
          )}
        </Paper>

        {/* Selected Security Group Details */}
        <Box sx={{ flex: 1 }}>
          {selectedSG ? (
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6">{selectedSG.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedSG.description || 'No description'}
                  </Typography>
                </Box>
                <Box>
                  <Button
                    size="small"
                    startIcon={<TemplateIcon />}
                    onClick={(e) => setTemplateAnchor(e.currentTarget)}
                  >
                    Templates
                  </Button>
                  <IconButton onClick={() => handleEditSG(selectedSG)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteSG(selectedSG.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Warnings */}
              {sgWarnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {sgWarnings.map((w, i) => (
                    <Typography key={i} variant="body2">
                      {w.message}
                    </Typography>
                  ))}
                </Alert>
              )}

              {/* Rules Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                  <Tab
                    icon={<IngressIcon />}
                    iconPosition="start"
                    label={`Inbound (${selectedSG.ingressRules.length})`}
                  />
                  <Tab
                    icon={<EgressIcon />}
                    iconPosition="start"
                    label={`Outbound (${selectedSG.egressRules.length})`}
                  />
                </Tabs>
              </Box>

              {tabValue === 0 && renderRulesTable(selectedSG.ingressRules, true)}
              {tabValue === 1 && renderRulesTable(selectedSG.egressRules, false)}
            </Paper>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Select a security group or create a new one
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Template Menu */}
      <Menu
        anchorEl={templateAnchor}
        open={Boolean(templateAnchor)}
        onClose={() => setTemplateAnchor(null)}
      >
        {COMMON_SECURITY_RULES.map((template) => (
          <MenuItem key={template.name} onClick={() => handleApplyTemplate(template)}>
            <ListItemText
              primary={template.name}
              secondary={`Port ${template.fromPort}${template.fromPort !== template.toPort ? `-${template.toPort}` : ''}`}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Security Group Dialog */}
      <Dialog open={sgDialogOpen} onClose={() => setSGDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSG ? 'Edit Security Group' : 'Add Security Group'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {formErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formErrors.map((e, i) => (
                  <Typography key={i} variant="body2">
                    {e}
                  </Typography>
                ))}
              </Alert>
            )}

            <FormField label="Name" required>
              <TextField
                size="small"
                fullWidth
                value={sgName}
                onChange={(e) => setSGName(e.target.value)}
                placeholder="e.g., web-tier-sg"
              />
            </FormField>

            <FormField label="Description">
              <TextField
                size="small"
                fullWidth
                multiline
                rows={2}
                value={sgDescription}
                onChange={(e) => setSGDescription(e.target.value)}
                placeholder="Security group for web tier instances"
              />
            </FormField>

            <TagsEditor tags={sgTags} onChange={setSGTags} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSGDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSG}>
            {editingSG ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRule ? 'Edit' : 'Add'} {isIngress ? 'Inbound' : 'Outbound'} Rule
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {formErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formErrors.map((e, i) => (
                  <Typography key={i} variant="body2">
                    {e}
                  </Typography>
                ))}
              </Alert>
            )}

            <FormField label="Protocol" required>
              <FormControl size="small" fullWidth>
                <Select
                  value={ruleForm.protocol}
                  onChange={(e: SelectChangeEvent<typeof ruleForm.protocol>) =>
                    setRuleForm({ ...ruleForm, protocol: e.target.value as typeof ruleForm.protocol })
                  }
                >
                  {PROTOCOLS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormField>

            {ruleForm.protocol !== '-1' && ruleForm.protocol !== 'icmp' && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormField label="From Port" required sx={{ flex: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={ruleForm.fromPort}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, fromPort: parseInt(e.target.value) || 0 })
                    }
                    inputProps={{ min: 0, max: 65535 }}
                  />
                </FormField>
                <FormField label="To Port" required sx={{ flex: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={ruleForm.toPort}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, toPort: parseInt(e.target.value) || 0 })
                    }
                    inputProps={{ min: 0, max: 65535 }}
                  />
                </FormField>
              </Box>
            )}

            <FormField label={isIngress ? 'Source' : 'Destination'} required helpText="CIDR notation, e.g., 0.0.0.0/0 for anywhere">
              <TextField
                size="small"
                fullWidth
                value={ruleForm.source}
                onChange={(e) => setRuleForm({ ...ruleForm, source: e.target.value })}
                placeholder="0.0.0.0/0"
              />
            </FormField>

            <FormField label="Description">
              <TextField
                size="small"
                fullWidth
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                placeholder="e.g., Allow HTTP from anywhere"
              />
            </FormField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRule}>
            {editingRule ? 'Update' : 'Add'} Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SecurityGroupsStep;
