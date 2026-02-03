/**
 * PlatformValidationStep Component
 * Final validation, security assessment, and cost estimation
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  LinearProgress,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  AttachMoney as CostIcon,
  Build as FixIcon,
  Shield as ShieldIcon,
  Storage as StorageIcon,
  Computer as ComputeIcon,
  AccountTree as IAMIcon,
} from '@mui/icons-material';
import {
  IAMConfig,
  ComputeConfig,
  DatabaseConfig,
  StorageConfig,
  PlatformLayerData,
  PlatformValidationResult,
  PlatformValidationError,
  CostEstimate,
  SecurityScore,
} from '../../../../../types/platform';
import { NetworkLayerData } from '../../../../../types/network';
import { usePlatformValidation } from '../../hooks/usePlatformValidation';

export interface PlatformValidationStepProps {
  iam: IAMConfig;
  compute: ComputeConfig;
  database: DatabaseConfig;
  storage: StorageConfig;
  networkData?: NetworkLayerData;
  onFix: (error: PlatformValidationError) => void;
  onValidationComplete: (result: PlatformValidationResult) => void;
}

export function PlatformValidationStep({
  iam,
  compute,
  database,
  storage,
  networkData,
  onFix,
  onValidationComplete,
}: PlatformValidationStepProps) {
  const { validate } = usePlatformValidation();
  const [validating, setValidating] = useState(true);
  const [result, setResult] = useState<PlatformValidationResult | null>(null);

  // Run validation on mount and when data changes
  useEffect(() => {
    setValidating(true);

    // Simulate async validation
    const timer = setTimeout(() => {
      const platformData: PlatformLayerData = { iam, compute, database, storage };
      const validationResult = validate(platformData, networkData);
      setResult(validationResult);
      onValidationComplete(validationResult);
      setValidating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [iam, compute, database, storage, networkData, validate, onValidationComplete]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'iam':
        return <IAMIcon />;
      case 'compute':
        return <ComputeIcon />;
      case 'database':
        return <StorageIcon />;
      case 'storage':
        return <StorageIcon />;
      case 'security':
        return <SecurityIcon />;
      case 'cost':
        return <CostIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const renderSecurityScore = (securityScore: SecurityScore) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <ShieldIcon color={getSecurityScoreColor(securityScore.overall) as any} sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" color={`${getSecurityScoreColor(securityScore.overall)}.main`}>
              {securityScore.overall}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Security Score
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {Object.entries(securityScore.categories).map(([category, score]) => (
            <Grid item xs={6} md={3} key={category}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={score}
                    size={60}
                    color={getSecurityScoreColor(score) as any}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {score}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" display="block" sx={{ mt: 1, textTransform: 'capitalize' }}>
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {securityScore.findings.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Security Findings
            </Typography>
            <List dense>
              {securityScore.findings.slice(0, 5).map((finding) => (
                <ListItem key={finding.id}>
                  <ListItemIcon>
                    <Chip
                      label={finding.severity}
                      size="small"
                      color={
                        finding.severity === 'critical' || finding.severity === 'high'
                          ? 'error'
                          : finding.severity === 'medium'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={finding.title}
                    secondary={finding.recommendation}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderCostEstimate = (costEstimate: CostEstimate) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CostIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" color="primary">
              ${costEstimate.monthly.total.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estimated Monthly Cost ({costEstimate.currency})
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          This is an estimate based on on-demand pricing in us-east-1. Actual costs may vary based on
          usage patterns, reserved capacity, and other factors.
        </Alert>

        <Typography variant="subtitle2" gutterBottom>
          Cost by Service
        </Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {Object.entries(costEstimate.monthly.byService)
            .filter(([_, cost]) => cost > 0)
            .map(([service, cost]) => (
              <Grid item xs={6} md={3} key={service}>
                <Card variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="h6">${cost.toFixed(2)}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {service}
                  </Typography>
                </Card>
              </Grid>
            ))}
        </Grid>

        {costEstimate.monthly.byResource.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Cost by Resource
            </Typography>
            <List dense>
              {costEstimate.monthly.byResource.slice(0, 10).map((resource) => (
                <ListItem key={resource.resourceId}>
                  <ListItemText
                    primary={resource.resourceName}
                    secondary={resource.details}
                  />
                  <Typography variant="body2" fontWeight="bold">
                    ${resource.monthlyCost.toFixed(2)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderValidationResults = (
    errors: PlatformValidationError[],
    warnings: PlatformValidationError[],
    info: PlatformValidationError[]
  ) => {
    // Group by category
    const groupByCategory = (items: PlatformValidationError[]) => {
      return items.reduce((acc, item) => {
        const category = item.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {} as Record<string, PlatformValidationError[]>);
    };

    const allIssues = [...errors, ...warnings, ...info];
    const groupedIssues = groupByCategory(allIssues);

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <Card sx={{ bgcolor: errors.length > 0 ? 'error.light' : 'success.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4">{errors.length}</Typography>
                <Typography variant="body2">Errors</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ bgcolor: warnings.length > 0 ? 'warning.light' : 'grey.100' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4">{warnings.length}</Typography>
                <Typography variant="body2">Warnings</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4">{info.length}</Typography>
                <Typography variant="body2">Info</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Issues by Category */}
        {Object.entries(groupedIssues).map(([category, issues]) => (
          <Accordion key={category} defaultExpanded={issues.some((i) => i.severity === 'error')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                {getCategoryIcon(category)}
                <Typography sx={{ textTransform: 'capitalize', flex: 1 }}>{category}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {issues.filter((i) => i.severity === 'error').length > 0 && (
                    <Chip
                      label={issues.filter((i) => i.severity === 'error').length}
                      color="error"
                      size="small"
                    />
                  )}
                  {issues.filter((i) => i.severity === 'warning').length > 0 && (
                    <Chip
                      label={issues.filter((i) => i.severity === 'warning').length}
                      color="warning"
                      size="small"
                    />
                  )}
                  {issues.filter((i) => i.severity === 'info').length > 0 && (
                    <Chip
                      label={issues.filter((i) => i.severity === 'info').length}
                      color="info"
                      size="small"
                    />
                  )}
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {issues.map((issue, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      issue.fix && (
                        <Button
                          size="small"
                          startIcon={<FixIcon />}
                          onClick={() => onFix(issue)}
                        >
                          Fix
                        </Button>
                      )
                    }
                  >
                    <ListItemIcon>{getSeverityIcon(issue.severity)}</ListItemIcon>
                    <ListItemText
                      primary={issue.message}
                      secondary={issue.resourceType ? `Resource: ${issue.resourceType}` : undefined}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}

        {allIssues.length === 0 && (
          <Alert severity="success" icon={<CheckIcon />}>
            All validations passed! Your platform configuration is ready for deployment.
          </Alert>
        )}
      </Box>
    );
  };

  if (validating) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Validating Configuration...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Checking IAM policies, compute placement, security settings, and more.
        </Typography>
      </Box>
    );
  }

  if (!result) {
    return (
      <Alert severity="error">
        Validation failed to complete. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Platform Validation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review validation results, security assessment, and cost estimates before completing
          the Platform Layer configuration.
        </Typography>
      </Box>

      {/* Overall Status */}
      <Alert
        severity={result.isValid ? 'success' : 'error'}
        sx={{ mb: 3 }}
        icon={result.isValid ? <CheckIcon /> : <ErrorIcon />}
      >
        {result.isValid ? (
          <>
            <strong>Validation Passed!</strong> Your platform configuration is ready. You can
            proceed to complete the Platform Layer.
          </>
        ) : (
          <>
            <strong>Validation Failed.</strong> Please fix {result.errors.length} error(s) before
            continuing.
          </>
        )}
      </Alert>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Validation Results */}
        <Grid item xs={12} md={7}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Validation Results
          </Typography>
          {renderValidationResults(result.errors, result.warnings, result.info)}
        </Grid>

        {/* Right Column - Security & Cost */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Security Assessment
              </Typography>
              {renderSecurityScore(result.securityScore)}
            </Box>

            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Cost Estimate
              </Typography>
              {renderCostEstimate(result.costEstimate)}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Resource Summary */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Resource Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <IAMIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5">{iam.roles.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  IAM Roles
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <ComputeIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5">
                  {compute.eksClusters.length + compute.ec2Instances.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Compute Resources
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <StorageIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5">{database.rdsInstances.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Databases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <StorageIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5">
                  {storage.s3Buckets.length + storage.ebsVolumes.length + storage.efsFileSystems.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Storage Resources
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default PlatformValidationStep;
