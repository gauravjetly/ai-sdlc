/**
 * ConfigurationEditor - Edit Integration Config via UI
 *
 * Provides a form-based interface for editing integration configuration:
 * - Governance level selection
 * - Classification rules management
 * - Routing strategy configuration
 * - Performance tuning (cache, batching)
 * - Branch-level overrides
 *
 * Part of Phase 3: Advanced Dashboard Features.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Paper,
  TextField, Switch, FormControlLabel, Button, Slider,
  Select, MenuItem, FormControl, InputLabel, Divider,
  Alert, AlertTitle, Dialog, DialogTitle, DialogContent,
  DialogActions, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Tooltip as MuiTooltip, Accordion, AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import RouteIcon from '@mui/icons-material/Route';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// Configuration types matching integration config
interface IntegrationConfigUI {
  governance: {
    level: number;
    bypassEnabled: boolean;
    bypassTokenTtlMs: number;
    approvalTimeoutMs: number;
    authorizedApprovers: string[];
  };
  classification: {
    confidenceThreshold: number;
    llmEnabled: boolean;
    llmModel: string;
    maxRetries: number;
  };
  routing: {
    defaultStrategy: string;
    emergencyBypass: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    cacheMaxSize: number;
    cacheTtlMs: number;
    batchEnabled: boolean;
    batchSize: number;
    asyncConcurrency: number;
    asyncTimeoutMs: number;
  };
  audit: {
    enabled: boolean;
    hashChainEnabled: boolean;
    batchSize: number;
    flushIntervalMs: number;
    provider: string;
  };
  branches: Array<{
    pattern: string;
    governanceLevel: number;
    description: string;
  }>;
}

// Default config
const DEFAULT_CONFIG: IntegrationConfigUI = {
  governance: {
    level: 2,
    bypassEnabled: true,
    bypassTokenTtlMs: 3600000,
    approvalTimeoutMs: 3600000,
    authorizedApprovers: ['tech-lead', 'security-lead', 'admin'],
  },
  classification: {
    confidenceThreshold: 0.7,
    llmEnabled: true,
    llmModel: 'claude-3-5-sonnet',
    maxRetries: 2,
  },
  routing: {
    defaultStrategy: 'feature',
    emergencyBypass: true,
  },
  performance: {
    cacheEnabled: true,
    cacheMaxSize: 500,
    cacheTtlMs: 3600000,
    batchEnabled: true,
    batchSize: 10,
    asyncConcurrency: 5,
    asyncTimeoutMs: 30000,
  },
  audit: {
    enabled: true,
    hashChainEnabled: false,
    batchSize: 10,
    flushIntervalMs: 5000,
    provider: 'in-memory',
  },
  branches: [
    { pattern: 'main', governanceLevel: 3, description: 'Main branch - full governance' },
    { pattern: 'production', governanceLevel: 4, description: 'Production - audit mode' },
    { pattern: 'feature/*', governanceLevel: 2, description: 'Feature branches - light' },
    { pattern: 'hotfix/*', governanceLevel: 1, description: 'Hotfixes - tracking only' },
  ],
};

const GOVERNANCE_LEVELS = [
  { value: 1, label: 'Level 1: Tracking Only', description: 'All gates skip, logging only', color: '#4CAF50' },
  { value: 2, label: 'Level 2: Light Governance', description: 'Security/QA advisory, no blocking', color: '#0066CC' },
  { value: 3, label: 'Level 3: Full Governance', description: 'Security/QA blocking, bypass available', color: '#FF9800' },
  { value: 4, label: 'Level 4: Audit Mode', description: 'All blocking, no bypass, hash chain', color: '#F44336' },
];

export default function ConfigurationEditor() {
  const [config, setConfig] = useState<IntegrationConfigUI>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<IntegrationConfigUI>(DEFAULT_CONFIG);
  const [tabValue, setTabValue] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newApprover, setNewApprover] = useState('');
  const [newBranch, setNewBranch] = useState({ pattern: '', governanceLevel: 2, description: '' });

  useEffect(() => {
    // In production, load from API
    setConfig(DEFAULT_CONFIG);
    setOriginalConfig(DEFAULT_CONFIG);
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
  }, [config, originalConfig]);

  const updateConfig = (path: string, value: unknown) => {
    setConfig((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let current: Record<string, unknown> = next as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = () => {
    // In production, this would POST to the API
    setOriginalConfig(config);
    setSaveDialogOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setConfig(originalConfig);
  };

  const addApprover = () => {
    if (newApprover.trim() && !config.governance.authorizedApprovers.includes(newApprover.trim())) {
      updateConfig('governance.authorizedApprovers', [...config.governance.authorizedApprovers, newApprover.trim()]);
      setNewApprover('');
    }
  };

  const removeApprover = (approver: string) => {
    updateConfig(
      'governance.authorizedApprovers',
      config.governance.authorizedApprovers.filter((a) => a !== approver),
    );
  };

  const addBranch = () => {
    if (newBranch.pattern.trim()) {
      setConfig((prev) => ({
        ...prev,
        branches: [...prev.branches, { ...newBranch, pattern: newBranch.pattern.trim() }],
      }));
      setNewBranch({ pattern: '', governanceLevel: 2, description: '' });
    }
  };

  const removeBranch = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      branches: prev.branches.filter((_, i) => i !== index),
    }));
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon sx={{ fontSize: 32, color: '#607D8B' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Configuration Editor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Edit integration settings - governance, classification, routing, performance
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasChanges && (
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleReset}
              size="small"
            >
              Reset
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => setSaveDialogOpen(true)}
            disabled={!hasChanges}
            size="small"
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Unsaved Changes</AlertTitle>
          You have modified configuration settings. Save to apply changes.
        </Alert>
      )}

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Configuration saved successfully.
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<SecurityIcon />} label="Governance" iconPosition="start" />
          <Tab icon={<RouteIcon />} label="Classification & Routing" iconPosition="start" />
          <Tab icon={<SpeedIcon />} label="Performance" iconPosition="start" />
          <Tab icon={<AccountTreeIcon />} label="Branch Overrides" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Governance Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Governance Level</Typography>
                {GOVERNANCE_LEVELS.map((level) => (
                  <Paper
                    key={level.value}
                    onClick={() => updateConfig('governance.level', level.value)}
                    sx={{
                      p: 2,
                      mb: 1.5,
                      cursor: 'pointer',
                      border: config.governance.level === level.value
                        ? `2px solid ${level.color}`
                        : '1px solid #E0E0E0',
                      bgcolor: config.governance.level === level.value ? `${level.color}08` : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: level.color },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`L${level.value}`}
                        size="small"
                        sx={{ bgcolor: level.color, color: 'white', fontWeight: 700 }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{level.label}</Typography>
                      {config.governance.level === level.value && (
                        <Chip label="ACTIVE" size="small" color="primary" sx={{ ml: 'auto' }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {level.description}
                    </Typography>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Bypass Configuration</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.governance.bypassEnabled}
                      onChange={(e) => updateConfig('governance.bypassEnabled', e.target.checked)}
                      disabled={config.governance.level >= 4}
                    />
                  }
                  label="Enable bypass tokens (Level 3 only)"
                />
                {config.governance.level >= 4 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Bypass tokens are disabled at Level 4 (Audit Mode)
                  </Alert>
                )}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Token TTL: {(config.governance.bypassTokenTtlMs / 60000).toFixed(0)} minutes
                  </Typography>
                  <Slider
                    value={config.governance.bypassTokenTtlMs / 60000}
                    onChange={(_, v) => updateConfig('governance.bypassTokenTtlMs', (v as number) * 60000)}
                    min={5}
                    max={120}
                    step={5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v}m`}
                    disabled={!config.governance.bypassEnabled}
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Approval Timeout: {(config.governance.approvalTimeoutMs / 60000).toFixed(0)} minutes
                  </Typography>
                  <Slider
                    value={config.governance.approvalTimeoutMs / 60000}
                    onChange={(_, v) => updateConfig('governance.approvalTimeoutMs', (v as number) * 60000)}
                    min={5}
                    max={240}
                    step={5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v}m`}
                  />
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Authorized Approvers</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {config.governance.authorizedApprovers.map((approver) => (
                    <Chip
                      key={approver}
                      label={approver}
                      onDelete={() => removeApprover(approver)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Add approver..."
                    value={newApprover}
                    onChange={(e) => setNewApprover(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addApprover()}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addApprover}
                    disabled={!newApprover.trim()}
                  >
                    Add
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Classification & Routing Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Classification Settings</Typography>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Confidence Threshold: {(config.classification.confidenceThreshold * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={config.classification.confidenceThreshold * 100}
                    onChange={(_, v) => updateConfig('classification.confidenceThreshold', (v as number) / 100)}
                    min={50}
                    max={99}
                    step={1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v}%`}
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.classification.llmEnabled}
                      onChange={(e) => updateConfig('classification.llmEnabled', e.target.checked)}
                    />
                  }
                  label="Enable LLM classification (Tier 2)"
                />
                {config.classification.llmEnabled && (
                  <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <InputLabel>LLM Model</InputLabel>
                    <Select
                      value={config.classification.llmModel}
                      label="LLM Model"
                      onChange={(e) => updateConfig('classification.llmModel', e.target.value)}
                    >
                      <MenuItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</MenuItem>
                      <MenuItem value="claude-3-haiku">Claude 3 Haiku</MenuItem>
                      <MenuItem value="claude-3-opus">Claude 3 Opus</MenuItem>
                    </Select>
                  </FormControl>
                )}
                <TextField
                  label="Max Retries"
                  type="number"
                  size="small"
                  value={config.classification.maxRetries}
                  onChange={(e) => updateConfig('classification.maxRetries', parseInt(e.target.value) || 0)}
                  sx={{ mt: 2 }}
                  inputProps={{ min: 0, max: 5 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Routing Settings</Typography>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Default Strategy</InputLabel>
                  <Select
                    value={config.routing.defaultStrategy}
                    label="Default Strategy"
                    onChange={(e) => updateConfig('routing.defaultStrategy', e.target.value)}
                  >
                    <MenuItem value="passthrough">Passthrough</MenuItem>
                    <MenuItem value="feature">Feature</MenuItem>
                    <MenuItem value="bugfix">Bug Fix</MenuItem>
                    <MenuItem value="architecture">Architecture</MenuItem>
                    <MenuItem value="review">Review</MenuItem>
                    <MenuItem value="trivial">Trivial</MenuItem>
                    <MenuItem value="documentation">Documentation</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.routing.emergencyBypass}
                      onChange={(e) => updateConfig('routing.emergencyBypass', e.target.checked)}
                    />
                  }
                  label="Emergency bypass (skip governance for critical issues)"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Performance Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Cache Configuration</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.performance.cacheEnabled}
                      onChange={(e) => updateConfig('performance.cacheEnabled', e.target.checked)}
                    />
                  }
                  label="Enable classification cache"
                />
                {config.performance.cacheEnabled && (
                  <>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Max Cache Size: {config.performance.cacheMaxSize} entries
                      </Typography>
                      <Slider
                        value={config.performance.cacheMaxSize}
                        onChange={(_, v) => updateConfig('performance.cacheMaxSize', v)}
                        min={50}
                        max={2000}
                        step={50}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Cache TTL: {(config.performance.cacheTtlMs / 60000).toFixed(0)} minutes
                      </Typography>
                      <Slider
                        value={config.performance.cacheTtlMs / 60000}
                        onChange={(_, v) => updateConfig('performance.cacheTtlMs', (v as number) * 60000)}
                        min={1}
                        max={120}
                        step={1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(v) => `${v}m`}
                      />
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Async Processor</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Concurrency: {config.performance.asyncConcurrency} workers
                  </Typography>
                  <Slider
                    value={config.performance.asyncConcurrency}
                    onChange={(_, v) => updateConfig('performance.asyncConcurrency', v)}
                    min={1}
                    max={20}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Job Timeout: {(config.performance.asyncTimeoutMs / 1000).toFixed(0)}s
                  </Typography>
                  <Slider
                    value={config.performance.asyncTimeoutMs / 1000}
                    onChange={(_, v) => updateConfig('performance.asyncTimeoutMs', (v as number) * 1000)}
                    min={5}
                    max={120}
                    step={5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v}s`}
                  />
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Audit Settings</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.audit.enabled}
                      onChange={(e) => updateConfig('audit.enabled', e.target.checked)}
                    />
                  }
                  label="Enable audit logging"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.audit.hashChainEnabled}
                      onChange={(e) => updateConfig('audit.hashChainEnabled', e.target.checked)}
                      disabled={!config.audit.enabled}
                    />
                  }
                  label="Enable hash chain (Level 4 tamper detection)"
                />
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                  <InputLabel>Storage Provider</InputLabel>
                  <Select
                    value={config.audit.provider}
                    label="Storage Provider"
                    onChange={(e) => updateConfig('audit.provider', e.target.value)}
                    disabled={!config.audit.enabled}
                  >
                    <MenuItem value="in-memory">In-Memory (Development)</MenuItem>
                    <MenuItem value="postgresql">PostgreSQL (Production)</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Branch Overrides Tab */}
      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Branch-Level Governance Overrides</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure different governance levels per branch pattern. Patterns support glob syntax.
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Branch Pattern</TableCell>
                    <TableCell>Governance Level</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {config.branches.map((branch, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {branch.pattern}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`Level ${branch.governanceLevel}`}
                          size="small"
                          sx={{
                            bgcolor: GOVERNANCE_LEVELS.find((l) => l.value === branch.governanceLevel)?.color ?? '#607D8B',
                            color: 'white',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{branch.description}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => removeBranch(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Add new row */}
                  <TableRow>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="e.g., release/*"
                        value={newBranch.pattern}
                        onChange={(e) => setNewBranch((p) => ({ ...p, pattern: e.target.value }))}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={newBranch.governanceLevel}
                          onChange={(e) => setNewBranch((p) => ({ ...p, governanceLevel: e.target.value as number }))}
                        >
                          {GOVERNANCE_LEVELS.map((l) => (
                            <MenuItem key={l.value} value={l.value}>Level {l.value}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="Description"
                        value={newBranch.description}
                        onChange={(e) => setNewBranch((p) => ({ ...p, description: e.target.value }))}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={addBranch}
                        disabled={!newBranch.pattern.trim()}
                      >
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Save Confirmation Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon sx={{ color: '#FF9800' }} />
            Confirm Configuration Changes
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Configuration changes take effect immediately and may affect active workflows.
          </Alert>
          <Typography variant="body2">
            Review the changes and confirm to apply. Changes will be logged in the audit trail.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />}>
            Save & Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
