/**
 * CI/CD Pipeline Step Component
 * Configure source control, build pipeline, deployment strategy, and test automation
 */

import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Slider,
  Chip,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  GitHub as GitHubIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Add as AddIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  CICDConfig,
  BuildStage,
  SourceControlProvider,
  BuildEnvironment,
  DeploymentStrategy,
  BuildTrigger,
  ArtifactStorage,
  SOURCE_CONTROL_PROVIDERS,
  BUILD_ENVIRONMENTS,
  DEPLOYMENT_STRATEGIES,
  DEFAULT_BUILD_STAGES,
} from '../../../../../types/devops';
import { ValidationError } from '../../../../../types/network';
import { FormField, ValidationAlert } from '../../shared';

interface CICDPipelineStepProps {
  cicd: CICDConfig;
  onChange: (config: CICDConfig) => void;
  errors: ValidationError[];
  onValidate?: (errors: ValidationError[]) => void;
}

export function CICDPipelineStep({
  cicd,
  onChange,
  errors,
  onValidate,
}: CICDPipelineStepProps) {
  const [expandedPanel, setExpandedPanel] = useState<string | false>('source-control');

  const handlePanelChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Source Control handlers
  const handleSourceControlChange = useCallback(
    (field: keyof CICDConfig['sourceControl'], value: unknown) => {
      onChange({
        ...cicd,
        sourceControl: {
          ...cicd.sourceControl,
          [field]: value,
        },
      });
    },
    [cicd, onChange]
  );

  const handleBranchProtectionChange = useCallback(
    (field: keyof CICDConfig['sourceControl']['branchProtection'], value: unknown) => {
      onChange({
        ...cicd,
        sourceControl: {
          ...cicd.sourceControl,
          branchProtection: {
            ...cicd.sourceControl.branchProtection,
            [field]: value,
          },
        },
      });
    },
    [cicd, onChange]
  );

  // Build Pipeline handlers
  const handleBuildPipelineChange = useCallback(
    (field: keyof CICDConfig['buildPipeline'], value: unknown) => {
      onChange({
        ...cicd,
        buildPipeline: {
          ...cicd.buildPipeline,
          [field]: value,
        },
      });
    },
    [cicd, onChange]
  );

  const handleStageToggle = useCallback(
    (stageId: string) => {
      const newStages = cicd.buildPipeline.stages.map((s) =>
        s.id === stageId ? { ...s, enabled: !s.enabled } : s
      );
      handleBuildPipelineChange('stages', newStages);
    },
    [cicd.buildPipeline.stages, handleBuildPipelineChange]
  );

  const handleAddStage = useCallback(() => {
    const newStage: BuildStage = {
      id: uuid(),
      name: 'New Stage',
      type: 'custom',
      environment: cicd.buildPipeline.environment,
      commands: [],
      timeout: 300,
      dependsOn: [],
      enabled: true,
    };
    handleBuildPipelineChange('stages', [...cicd.buildPipeline.stages, newStage]);
  }, [cicd.buildPipeline.stages, cicd.buildPipeline.environment, handleBuildPipelineChange]);

  const handleRemoveStage = useCallback(
    (stageId: string) => {
      const newStages = cicd.buildPipeline.stages.filter((s) => s.id !== stageId);
      handleBuildPipelineChange('stages', newStages);
    },
    [cicd.buildPipeline.stages, handleBuildPipelineChange]
  );

  const handleResetStages = useCallback(() => {
    handleBuildPipelineChange('stages', [...DEFAULT_BUILD_STAGES]);
  }, [handleBuildPipelineChange]);

  const handleTriggerToggle = useCallback(
    (trigger: BuildTrigger) => {
      const triggers = cicd.buildPipeline.triggers.includes(trigger)
        ? cicd.buildPipeline.triggers.filter((t) => t !== trigger)
        : [...cicd.buildPipeline.triggers, trigger];
      handleBuildPipelineChange('triggers', triggers);
    },
    [cicd.buildPipeline.triggers, handleBuildPipelineChange]
  );

  // Deployment handlers
  const handleDeploymentChange = useCallback(
    (field: keyof CICDConfig['deployment'], value: unknown) => {
      onChange({
        ...cicd,
        deployment: {
          ...cicd.deployment,
          [field]: value,
        },
      });
    },
    [cicd, onChange]
  );

  // Test Automation handlers
  const handleTestAutomationChange = useCallback(
    (field: keyof CICDConfig['testAutomation'], value: unknown) => {
      onChange({
        ...cicd,
        testAutomation: {
          ...cicd.testAutomation,
          [field]: value,
        },
      });
    },
    [cicd, onChange]
  );

  // Get errors for specific paths
  const getFieldErrors = (path: string) =>
    errors.filter((e) => e.path?.includes(path));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        CI/CD Pipeline Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure your continuous integration and deployment pipeline settings.
      </Typography>

      {errors.filter((e) => e.severity === 'error').length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.filter((e) => e.severity === 'error').length} configuration error(s) found. Please review the highlighted fields.
        </Alert>
      )}

      {/* Source Control Section */}
      <Accordion
        expanded={expandedPanel === 'source-control'}
        onChange={handlePanelChange('source-control')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GitHubIcon />
            <Typography>Source Control</Typography>
            {cicd.sourceControl.repositoryUrl && (
              <Chip
                size="small"
                label={cicd.sourceControl.provider}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Provider</InputLabel>
                <Select
                  value={cicd.sourceControl.provider}
                  label="Provider"
                  onChange={(e) => handleSourceControlChange('provider', e.target.value as SourceControlProvider)}
                >
                  {SOURCE_CONTROL_PROVIDERS.map((provider) => (
                    <MenuItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Repository URL"
                placeholder="https://github.com/org/repo"
                value={cicd.sourceControl.repositoryUrl}
                onChange={(e) => handleSourceControlChange('repositoryUrl', e.target.value)}
                error={getFieldErrors('repositoryUrl').length > 0}
                helperText={getFieldErrors('repositoryUrl')[0]?.message}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Default Branch"
                value={cicd.sourceControl.defaultBranch}
                onChange={(e) => handleSourceControlChange('defaultBranch', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Production Branch"
                value={cicd.sourceControl.productionBranch}
                onChange={(e) => handleSourceControlChange('productionBranch', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cicd.sourceControl.webhookEnabled}
                    onChange={(e) => handleSourceControlChange('webhookEnabled', e.target.checked)}
                  />
                }
                label="Enable Webhooks"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Branch Protection
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cicd.sourceControl.branchProtection.enabled}
                    onChange={(e) => handleBranchProtectionChange('enabled', e.target.checked)}
                  />
                }
                label="Enable Branch Protection"
              />
            </Grid>
            {cicd.sourceControl.branchProtection.enabled && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={cicd.sourceControl.branchProtection.requireReviews}
                        onChange={(e) => handleBranchProtectionChange('requireReviews', e.target.checked)}
                      />
                    }
                    label="Require Code Reviews"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Required Reviewers"
                    value={cicd.sourceControl.branchProtection.requiredReviewers}
                    onChange={(e) => handleBranchProtectionChange('requiredReviewers', parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 10 }}
                    disabled={!cicd.sourceControl.branchProtection.requireReviews}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={cicd.sourceControl.branchProtection.requireStatusChecks}
                        onChange={(e) => handleBranchProtectionChange('requireStatusChecks', e.target.checked)}
                      />
                    }
                    label="Require Status Checks"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Build Pipeline Section */}
      <Accordion
        expanded={expandedPanel === 'build-pipeline'}
        onChange={handlePanelChange('build-pipeline')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Build Pipeline</Typography>
            <Chip
              size="small"
              label={`${cicd.buildPipeline.stages.filter((s) => s.enabled).length} stages`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Build Environment</InputLabel>
                <Select
                  value={cicd.buildPipeline.environment}
                  label="Build Environment"
                  onChange={(e) => handleBuildPipelineChange('environment', e.target.value as BuildEnvironment)}
                >
                  {BUILD_ENVIRONMENTS.map((env) => (
                    <MenuItem key={env.value} value={env.value}>
                      {env.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Version</InputLabel>
                <Select
                  value={cicd.buildPipeline.environmentVersion}
                  label="Version"
                  onChange={(e) => handleBuildPipelineChange('environmentVersion', e.target.value)}
                >
                  {BUILD_ENVIRONMENTS.find((e) => e.value === cicd.buildPipeline.environment)?.versions.map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Artifact Storage</InputLabel>
                <Select
                  value={cicd.buildPipeline.artifactStorage}
                  label="Artifact Storage"
                  onChange={(e) => handleBuildPipelineChange('artifactStorage', e.target.value as ArtifactStorage)}
                >
                  <MenuItem value="ecr">Amazon ECR</MenuItem>
                  <MenuItem value="s3">Amazon S3</MenuItem>
                  <MenuItem value="artifactory">JFrog Artifactory</MenuItem>
                  <MenuItem value="nexus">Sonatype Nexus</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cicd.buildPipeline.cachingEnabled}
                    onChange={(e) => handleBuildPipelineChange('cachingEnabled', e.target.checked)}
                  />
                }
                label="Enable Build Caching"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Build Stages</Typography>
                <Box>
                  <Button size="small" onClick={handleResetStages} sx={{ mr: 1 }}>
                    Reset to Default
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddStage}>
                    Add Stage
                  </Button>
                </Box>
              </Box>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <List dense>
                  {cicd.buildPipeline.stages.map((stage, index) => (
                    <ListItem
                      key={stage.id}
                      sx={{
                        bgcolor: stage.enabled ? 'transparent' : 'action.disabledBackground',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      <DragIcon sx={{ mr: 1, color: 'text.secondary', cursor: 'grab' }} />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">{index + 1}. {stage.name}</Typography>
                            <Chip
                              size="small"
                              label={stage.type}
                              color={stage.type === 'test' ? 'success' : stage.type === 'security' ? 'warning' : 'default'}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={`Timeout: ${stage.timeout}s`}
                      />
                      <ListItemSecondaryAction>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={stage.enabled}
                              onChange={() => handleStageToggle(stage.id)}
                            />
                          }
                          label=""
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveStage(stage.id)}
                          disabled={cicd.buildPipeline.stages.length <= 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Build Triggers
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(['push', 'pull_request', 'schedule', 'manual'] as BuildTrigger[]).map((trigger) => (
                  <Chip
                    key={trigger}
                    label={trigger.replace('_', ' ')}
                    onClick={() => handleTriggerToggle(trigger)}
                    color={cicd.buildPipeline.triggers.includes(trigger) ? 'primary' : 'default'}
                    variant={cicd.buildPipeline.triggers.includes(trigger) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              {getFieldErrors('triggers').length > 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  {getFieldErrors('triggers')[0]?.message}
                </Typography>
              )}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Deployment Strategy Section */}
      <Accordion
        expanded={expandedPanel === 'deployment'}
        onChange={handlePanelChange('deployment')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Deployment Strategy</Typography>
            <Chip
              size="small"
              label={cicd.deployment.strategy}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                {DEPLOYMENT_STRATEGIES.map((strategy) => (
                  <Paper
                    key={strategy.value}
                    variant="outlined"
                    sx={{
                      p: 2,
                      flex: 1,
                      cursor: 'pointer',
                      borderColor: cicd.deployment.strategy === strategy.value ? 'primary.main' : undefined,
                      borderWidth: cicd.deployment.strategy === strategy.value ? 2 : 1,
                    }}
                    onClick={() => handleDeploymentChange('strategy', strategy.value)}
                  >
                    <Typography variant="subtitle2">{strategy.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {strategy.description}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Health Check Path"
                value={cicd.deployment.healthCheckPath}
                onChange={(e) => handleDeploymentChange('healthCheckPath', e.target.value)}
                error={getFieldErrors('healthCheckPath').length > 0}
                helperText={getFieldErrors('healthCheckPath')[0]?.message || 'e.g., /health or /api/health'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Health Check Interval (seconds)"
                value={cicd.deployment.healthCheckInterval}
                onChange={(e) => handleDeploymentChange('healthCheckInterval', parseInt(e.target.value) || 30)}
                inputProps={{ min: 5, max: 300 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cicd.deployment.rollbackOnFailure}
                    onChange={(e) => handleDeploymentChange('rollbackOnFailure', e.target.checked)}
                  />
                }
                label="Automatic Rollback on Failure"
              />
            </Grid>
            {cicd.deployment.rollbackOnFailure && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Rollback Threshold (failures)"
                  value={cicd.deployment.rollbackThreshold}
                  onChange={(e) => handleDeploymentChange('rollbackThreshold', parseInt(e.target.value) || 3)}
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
            )}

            {cicd.deployment.strategy === 'canary' && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Traffic Shift Percentage
                </Typography>
                <Slider
                  value={cicd.deployment.trafficShiftPercentage || 10}
                  onChange={(_, value) => handleDeploymentChange('trafficShiftPercentage', value as number)}
                  valueLabelDisplay="auto"
                  step={5}
                  marks
                  min={5}
                  max={50}
                />
              </Grid>
            )}

            {cicd.deployment.strategy === 'blue-green' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Switch Timeout (minutes)"
                  value={cicd.deployment.blueGreenSwitchTimeout || 5}
                  onChange={(e) => handleDeploymentChange('blueGreenSwitchTimeout', parseInt(e.target.value) || 5)}
                  inputProps={{ min: 1, max: 60 }}
                />
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Min Healthy Percent: {cicd.deployment.minHealthyPercent}%
              </Typography>
              <Slider
                value={cicd.deployment.minHealthyPercent}
                onChange={(_, value) => handleDeploymentChange('minHealthyPercent', value as number)}
                valueLabelDisplay="auto"
                step={10}
                min={0}
                max={100}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Max Healthy Percent: {cicd.deployment.maxHealthyPercent}%
              </Typography>
              <Slider
                value={cicd.deployment.maxHealthyPercent}
                onChange={(_, value) => handleDeploymentChange('maxHealthyPercent', value as number)}
                valueLabelDisplay="auto"
                step={10}
                min={100}
                max={300}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Test Automation Section */}
      <Accordion
        expanded={expandedPanel === 'test-automation'}
        onChange={handlePanelChange('test-automation')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Test Automation</Typography>
            <Chip
              size="small"
              label={`${cicd.testAutomation.coverageThreshold}% coverage`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cicd.testAutomation.unitTestEnabled}
                    onChange={(e) => handleTestAutomationChange('unitTestEnabled', e.target.checked)}
                  />
                }
                label="Unit Tests"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cicd.testAutomation.integrationTestEnabled}
                    onChange={(e) => handleTestAutomationChange('integrationTestEnabled', e.target.checked)}
                  />
                }
                label="Integration Tests"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cicd.testAutomation.e2eTestEnabled}
                    onChange={(e) => handleTestAutomationChange('e2eTestEnabled', e.target.checked)}
                  />
                }
                label="E2E Tests"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Code Coverage Threshold: {cicd.testAutomation.coverageThreshold}%
              </Typography>
              <Slider
                value={cicd.testAutomation.coverageThreshold}
                onChange={(_, value) => handleTestAutomationChange('coverageThreshold', value as number)}
                valueLabelDisplay="auto"
                step={5}
                marks={[
                  { value: 50, label: '50%' },
                  { value: 80, label: '80%' },
                  { value: 100, label: '100%' },
                ]}
                min={0}
                max={100}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cicd.testAutomation.failOnCoverageThreshold}
                    onChange={(e) => handleTestAutomationChange('failOnCoverageThreshold', e.target.checked)}
                  />
                }
                label="Fail build if coverage below threshold"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Test Report Format</InputLabel>
                <Select
                  value={cicd.testAutomation.testReportFormat}
                  label="Test Report Format"
                  onChange={(e) => handleTestAutomationChange('testReportFormat', e.target.value)}
                >
                  <MenuItem value="junit">JUnit XML</MenuItem>
                  <MenuItem value="html">HTML</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Validation Errors */}
      {errors.filter((e) => e.severity === 'warning').length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Warnings:</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors
              .filter((e) => e.severity === 'warning')
              .map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
          </ul>
        </Alert>
      )}
    </Box>
  );
}

export default CICDPipelineStep;
