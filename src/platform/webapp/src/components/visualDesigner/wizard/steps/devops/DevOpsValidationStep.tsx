/**
 * DevOps Validation Step Component
 * Comprehensive validation, security scanning, cost estimation, and readiness report
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Grid,
  Divider,
  LinearProgress,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as PassIcon,
  Error as FailIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Help as NotApplicableIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Build as FixIcon,
  AttachMoney as CostIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  CheckCircleOutline as ReadyIcon,
  NetworkCheck as NetworkIcon,
  Storage as PlatformIcon,
  Cloud as DevOpsIcon,
} from '@mui/icons-material';
import {
  DevOpsLayerData,
  DevOpsValidationResult,
  ReadinessCheckItem,
  CostRecommendation,
  ReadinessStatus,
} from '../../../../../types/devops';
import { ValidationError, NetworkLayerData } from '../../../../../types/network';
import { useDevOpsValidation } from '../../hooks/useDevOpsValidation';

interface DevOpsValidationStepProps {
  devopsData: DevOpsLayerData;
  networkData?: NetworkLayerData;
  platformData?: Record<string, unknown>;
  onFix: (error: ValidationError) => void;
  onValidationComplete: (result: DevOpsValidationResult) => void;
}

const getStatusIcon = (status: ReadinessStatus) => {
  switch (status) {
    case 'pass':
      return <PassIcon color="success" />;
    case 'fail':
      return <FailIcon color="error" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'not-applicable':
      return <NotApplicableIcon color="disabled" />;
    case 'pending':
      return <CircularProgress size={20} />;
    default:
      return <InfoIcon color="info" />;
  }
};

const getStatusColor = (status: ReadinessStatus): 'success' | 'error' | 'warning' | 'default' | 'info' => {
  switch (status) {
    case 'pass':
      return 'success';
    case 'fail':
      return 'error';
    case 'warning':
      return 'warning';
    case 'not-applicable':
      return 'default';
    default:
      return 'info';
  }
};

export function DevOpsValidationStep({
  devopsData,
  networkData,
  platformData,
  onFix,
  onValidationComplete,
}: DevOpsValidationStepProps) {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<DevOpsValidationResult | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<string | false>('overview');

  const { validate, estimateCosts, generateReadinessChecklist } = useDevOpsValidation();

  const handlePanelChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Run validation
  const runValidation = useCallback(() => {
    setValidating(true);

    // Simulate validation delay for UX
    setTimeout(() => {
      const result = validate(devopsData, networkData || null);
      setValidationResult(result);
      onValidationComplete(result);
      setValidating(false);
    }, 1000);
  }, [devopsData, networkData, validate, onValidationComplete]);

  // Run validation on mount
  useEffect(() => {
    runValidation();
  }, []);

  // Summary statistics
  const summary = useMemo(() => {
    if (!validationResult) return null;

    const totalChecks = validationResult.readinessChecklist.length;
    const passed = validationResult.readinessChecklist.filter((c) => c.status === 'pass').length;
    const failed = validationResult.readinessChecklist.filter((c) => c.status === 'fail').length;
    const warnings = validationResult.readinessChecklist.filter((c) => c.status === 'warning').length;

    return {
      totalChecks,
      passed,
      failed,
      warnings,
      passRate: Math.round((passed / totalChecks) * 100),
      isReady: failed === 0,
    };
  }, [validationResult]);

  // Group checks by category
  const checksByCategory = useMemo(() => {
    if (!validationResult) return {};

    return validationResult.readinessChecklist.reduce((acc, check) => {
      if (!acc[check.category]) {
        acc[check.category] = [];
      }
      acc[check.category].push(check);
      return acc;
    }, {} as Record<string, ReadinessCheckItem[]>);
  }, [validationResult]);

  // Handle fix navigation
  const handleFix = useCallback(
    (check: ReadinessCheckItem) => {
      if (check.fixStep) {
        const error: ValidationError = {
          code: check.id,
          message: check.message,
          severity: check.status === 'fail' ? 'error' : 'warning',
          fix: { step: check.fixStep, field: '' },
        };
        onFix(error);
      }
    },
    [onFix]
  );

  // Export report
  const exportReport = useCallback(() => {
    if (!validationResult) return;

    const report = {
      timestamp: new Date().toISOString(),
      summary: summary,
      validation: validationResult,
      devopsConfig: devopsData,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devops-validation-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [validationResult, summary, devopsData]);

  if (validating) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Running Validation...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Checking all configurations and generating readiness report
        </Typography>
      </Box>
    );
  }

  if (!validationResult) {
    return (
      <Alert severity="error">
        Validation failed to complete. Please try again.
        <Button onClick={runValidation} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">DevOps Validation</Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive infrastructure readiness assessment
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={runValidation}
            sx={{ mr: 1 }}
          >
            Re-validate
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportReport}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Summary Card */}
      <Card sx={{ mb: 3, bgcolor: summary?.isReady ? 'success.dark' : 'error.dark' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {summary?.isReady ? (
                  <ReadyIcon sx={{ fontSize: 64, color: 'white' }} />
                ) : (
                  <FailIcon sx={{ fontSize: 64, color: 'white' }} />
                )}
                <Box>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {summary?.isReady ? 'Ready to Deploy' : 'Not Ready'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {summary?.passRate}% checks passing
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: 'white' }}>
                      {summary?.passed}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Passed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: 'white' }}>
                      {summary?.failed}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Failed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: 'white' }}>
                      {summary?.warnings}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Warnings
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationResult.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            {validationResult.errors.length} critical issue(s) must be resolved:
          </Typography>
          <List dense>
            {validationResult.errors.map((error, i) => (
              <ListItem key={i} sx={{ pl: 0 }}>
                <ListItemText primary={error.message} />
                {error.fix && (
                  <ListItemSecondaryAction>
                    <Button size="small" onClick={() => onFix(error)}>
                      Fix
                    </Button>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Validation Warnings */}
      {validationResult.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            {validationResult.warnings.length} warning(s):
          </Typography>
          <List dense>
            {validationResult.warnings.slice(0, 5).map((warning, i) => (
              <ListItem key={i} sx={{ pl: 0 }}>
                <ListItemText primary={warning.message} />
              </ListItem>
            ))}
            {validationResult.warnings.length > 5 && (
              <ListItem sx={{ pl: 0 }}>
                <ListItemText
                  primary={`...and ${validationResult.warnings.length - 5} more`}
                  sx={{ fontStyle: 'italic' }}
                />
              </ListItem>
            )}
          </List>
        </Alert>
      )}

      {/* Readiness Checklist */}
      <Accordion
        expanded={expandedPanel === 'overview'}
        onChange={handlePanelChange('overview')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReadyIcon />
            <Typography>Readiness Checklist</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {Object.entries(checksByCategory).map(([category, checks]) => (
            <Box key={category} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                {category === 'CI/CD' && <DevOpsIcon fontSize="small" />}
                {category === 'Monitoring' && <PerformanceIcon fontSize="small" />}
                {category === 'Networking' && <NetworkIcon fontSize="small" />}
                {category === 'Infrastructure' && <PlatformIcon fontSize="small" />}
                {category === 'Security' && <SecurityIcon fontSize="small" />}
                {category === 'Network' && <NetworkIcon fontSize="small" />}
                {category}
              </Typography>
              <Paper variant="outlined">
                <List dense disablePadding>
                  {checks.map((check) => (
                    <ListItem key={check.id} divider>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getStatusIcon(check.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={check.name}
                        secondary={check.message}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          size="small"
                          label={check.status}
                          color={getStatusColor(check.status)}
                          variant="outlined"
                        />
                        {check.fixStep && check.status !== 'pass' && (
                          <Tooltip title="Go to fix">
                            <IconButton
                              size="small"
                              onClick={() => handleFix(check)}
                              sx={{ ml: 1 }}
                            >
                              <FixIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Cost Estimation */}
      <Accordion
        expanded={expandedPanel === 'cost'}
        onChange={handlePanelChange('cost')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CostIcon />
            <Typography>Cost Estimation</Typography>
            <Chip
              size="small"
              label={`~$${validationResult.costValidation.estimatedMonthlyCost}/mo`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Estimated Monthly Cost
              </Typography>
              <Typography variant="h3" color="primary">
                ${validationResult.costValidation.estimatedMonthlyCost.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {validationResult.costValidation.currency} per month
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Cost by Category
              </Typography>
              {Object.entries(validationResult.costValidation.costByCategory).map(([category, cost]) => (
                <Box key={category} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {category}
                  </Typography>
                  <Typography variant="body2">${(cost as number).toFixed(2)}</Typography>
                </Box>
              ))}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Cost by Service
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell align="right">Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(validationResult.costValidation.costByService).map(([service, cost]) => (
                      <TableRow key={service}>
                        <TableCell>{service}</TableCell>
                        <TableCell align="right">${(cost as number).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>

          {validationResult.costValidation.recommendations.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Cost Optimization Recommendations
              </Typography>
              <List>
                {validationResult.costValidation.recommendations.map((rec) => (
                  <ListItem key={rec.id}>
                    <ListItemIcon>
                      <CostIcon color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary={rec.description}
                      secondary={`Potential savings: $${rec.potentialSavings.toFixed(2)}/mo | Effort: ${rec.effort}`}
                    />
                    <Chip
                      size="small"
                      label={rec.type}
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Security Summary */}
      <Accordion
        expanded={expandedPanel === 'security'}
        onChange={handlePanelChange('security')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            <Typography>Security Summary</Typography>
            <Chip
              size="small"
              label={validationResult.securityValidation.isValid ? 'Secure' : 'Issues Found'}
              color={validationResult.securityValidation.isValid ? 'success' : 'warning'}
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {validationResult.securityValidation.isValid ? (
            <Alert severity="success">
              No critical security issues detected. Your configuration follows security best practices.
            </Alert>
          ) : (
            <Box>
              {validationResult.securityValidation.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Security Issues:</Typography>
                  <List dense>
                    {validationResult.securityValidation.errors.map((error, i) => (
                      <ListItem key={i} sx={{ pl: 0 }}>
                        <ListItemText primary={error.message} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}
              {validationResult.securityValidation.warnings.length > 0 && (
                <Alert severity="warning">
                  <Typography variant="subtitle2">Security Recommendations:</Typography>
                  <List dense>
                    {validationResult.securityValidation.warnings.map((warning, i) => (
                      <ListItem key={i} sx={{ pl: 0 }}>
                        <ListItemText primary={warning.message} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Security Checklist
            </Typography>
            <Grid container spacing={1}>
              {[
                { label: 'Branch Protection', check: devopsData.cicd.sourceControl.branchProtection.enabled },
                { label: 'State Encryption', check: devopsData.iac.stateBackend.encrypt },
                { label: 'Production Approval', check: devopsData.iac.gitOps.approvalRequired },
                { label: 'Secrets Manager', check: devopsData.connections.every(c => c.type !== 'compute-to-database' || c.secretsManagerArn) },
                { label: 'HTTPS Listeners', check: devopsData.loadBalancers.every(lb => lb.listeners.some(l => l.protocol === 'HTTPS')) || devopsData.loadBalancers.length === 0 },
              ].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.label}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: item.check ? 'success.dark' : 'warning.dark',
                    }}
                  >
                    {item.check ? (
                      <PassIcon sx={{ color: 'white' }} />
                    ) : (
                      <WarningIcon sx={{ color: 'white' }} />
                    )}
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      {item.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Terraform Validation */}
      <Accordion
        expanded={expandedPanel === 'terraform'}
        onChange={handlePanelChange('terraform')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlatformIcon />
            <Typography>Terraform Validation</Typography>
            <Chip
              size="small"
              label={validationResult.terraformValidation.isValid ? 'Valid' : 'Issues Found'}
              color={validationResult.terraformValidation.isValid ? 'success' : 'warning'}
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {validationResult.terraformValidation.isValid ? (
            <Alert severity="success">
              Terraform configuration is valid. {devopsData.iac.modules.length} modules ready for deployment.
            </Alert>
          ) : (
            <Box>
              {validationResult.terraformValidation.errors.map((error, i) => (
                <Alert key={i} severity="error" sx={{ mb: 1 }}>
                  {error.message}
                </Alert>
              ))}
              {validationResult.terraformValidation.warnings.map((warning, i) => (
                <Alert key={i} severity="warning" sx={{ mb: 1 }}>
                  {warning.message}
                </Alert>
              ))}
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Generated Modules
            </Typography>
            <Grid container spacing={1}>
              {devopsData.iac.modules.map((module) => (
                <Grid item xs={12} sm={6} md={4} key={module.name}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {module.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {module.path} | v{module.version}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        size="small"
                        label={`${module.variables.length} vars`}
                        variant="outlined"
                        sx={{ mr: 0.5 }}
                      />
                      <Chip
                        size="small"
                        label={`${module.outputs.length} outputs`}
                        variant="outlined"
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Ready State Message */}
      {summary?.isReady && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">All Checks Passed!</Typography>
          <Typography variant="body2">
            Your DevOps configuration is ready for deployment. Click "Complete DevOps Layer" to finish the wizard.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

export default DevOpsValidationStep;
