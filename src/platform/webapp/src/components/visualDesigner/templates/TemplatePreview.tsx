/**
 * TemplatePreview Component
 * Modal for viewing full template details
 */

import React, { useState, useMemo, Suspense, lazy } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Skeleton,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as ApplyIcon,
  ContentCopy as CloneIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Update as UpdateIcon,
  Extension as ComponentIcon,
  AttachMoney as CostIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';
import { useTemplate, useTemplateVersions } from './hooks/useTemplates';
import type { TemplatePreviewProps, TemplateVersion } from './types/template.types';
import {
  getCategoryColor,
  getCategoryLabel,
  formatDate,
  formatRelativeDate,
  formatUsageCount,
  countComponents,
  estimateMonthlyCost,
  formatCost,
} from './utils/templateUtils';

// Lazy load ReactFlow for preview (heavy component)
const ReactFlow = lazy(() => import('reactflow').then((m) => ({ default: m.default })));

// ============================================
// Tab Panel Component
// ============================================

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </Box>
  );
}

// ============================================
// Version History Component
// ============================================

function VersionHistory({
  templateId,
  currentVersion,
}: {
  templateId: string;
  currentVersion: string;
}) {
  const { data: versions, isLoading, error } = useTemplateVersions(templateId);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load version history
      </Alert>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        No version history available
      </Typography>
    );
  }

  return (
    <List disablePadding>
      {versions.map((version) => (
        <ListItem
          key={version.id}
          sx={{
            bgcolor: version.versionNumber === currentVersion ? 'action.selected' : 'transparent',
            borderRadius: 1,
            mb: 1,
          }}
        >
          <ListItemIcon>
            <HistoryIcon color="action" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight={500}>
                  v{version.versionNumber}
                </Typography>
                {version.versionNumber === currentVersion && (
                  <Chip size="small" label="Current" color="primary" />
                )}
              </Box>
            }
            secondary={
              <>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(version.createdAt)}
                </Typography>
                {version.changeLog && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {version.changeLog}
                  </Typography>
                )}
              </>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}

// ============================================
// Main Component
// ============================================

export function TemplatePreview({
  templateId,
  open,
  onClose,
  onApply,
  onClone,
}: TemplatePreviewProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [cloneName, setCloneName] = useState('');
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  const { data: template, isLoading, error } = useTemplate(templateId, open);

  // Compute component counts
  const componentCounts = useMemo(() => {
    if (!template?.templateData) return {};
    return countComponents(template.templateData);
  }, [template?.templateData]);

  const totalComponents = useMemo(() => {
    return Object.values(componentCounts).reduce((sum, count) => sum + count, 0);
  }, [componentCounts]);

  // Estimated cost
  const estimatedCost = useMemo(() => {
    if (!template?.templateData) return 0;
    return estimateMonthlyCost(template.templateData);
  }, [template?.templateData]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleApply = (mode: 'new' | 'current') => {
    onApply(mode);
    onClose();
  };

  const handleClone = () => {
    if (cloneName.trim()) {
      onClone(cloneName.trim());
      setShowCloneDialog(false);
      setCloneName('');
      onClose();
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="template-preview-title"
      aria-modal
    >
      {/* Header */}
      <DialogTitle sx={{ m: 0, p: 2 }} id="template-preview-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            {isLoading ? (
              <>
                <Skeleton width={200} height={32} />
                <Skeleton width={150} height={20} />
              </>
            ) : template ? (
              <>
                <Typography variant="h5" component="h2" fontWeight={600}>
                  {template.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip
                    size="small"
                    label={getCategoryLabel(template.category)}
                    sx={{
                      bgcolor: getCategoryColor(template.category),
                      color: 'white',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    v{template.version}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatUsageCount(template.usageCount)} uses
                  </Typography>
                </Box>
              </>
            ) : null}
          </Box>
          <IconButton onClick={onClose} aria-label="Close preview">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Template preview tabs"
        >
          <Tab label="Overview" id="template-tab-0" aria-controls="template-tabpanel-0" />
          <Tab label="Components" id="template-tab-1" aria-controls="template-tabpanel-1" />
          <Tab label="Versions" id="template-tab-2" aria-controls="template-tabpanel-2" />
        </Tabs>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 2 }}>
        {error ? (
          <Alert severity="error">Failed to load template details</Alert>
        ) : isLoading ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rectangular" width="60%" height={300} />
            <Box sx={{ width: '40%' }}>
              <Skeleton height={30} />
              <Skeleton height={30} />
              <Skeleton height={30} />
            </Box>
          </Box>
        ) : template ? (
          <>
            {/* Overview Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                {/* Preview Canvas */}
                <Paper
                  variant="outlined"
                  sx={{
                    flex: 1,
                    height: 350,
                    overflow: 'hidden',
                    bgcolor: 'grey.50',
                  }}
                >
                  <Suspense
                    fallback={
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                        }}
                      >
                        <CircularProgress />
                      </Box>
                    }
                  >
                    <ReactFlow
                      nodes={template.templateData.nodes}
                      edges={template.templateData.edges}
                      fitView
                      nodesDraggable={false}
                      nodesConnectable={false}
                      elementsSelectable={false}
                      zoomOnScroll={true}
                      panOnScroll={true}
                      style={{ background: '#fafafa' }}
                    />
                  </Suspense>
                </Paper>

                {/* Details Panel */}
                <Box sx={{ width: { xs: '100%', md: 280 } }}>
                  {/* Description */}
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {template.description || 'No description provided'}
                  </Typography>

                  {/* Metadata */}
                  <List dense disablePadding>
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <LayersIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Layer Type"
                        secondary={template.layerType || 'Full Stack'}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ComponentIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Components"
                        secondary={`${totalComponents} total`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CostIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Est. Monthly Cost"
                        secondary={formatCost(estimatedCost)}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    {template.createdBy && (
                      <ListItem disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <PersonIcon fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Created By"
                          secondary={template.createdBy}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    )}
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CalendarIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Created"
                        secondary={formatRelativeDate(template.createdAt)}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <UpdateIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Updated"
                        secondary={formatRelativeDate(template.updatedAt)}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  </List>

                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                        Tags
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {template.tags.map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            </TabPanel>

            {/* Components Tab */}
            <TabPanel value={activeTab} index={1}>
              <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                Component Breakdown
              </Typography>
              <List>
                {Object.entries(componentCounts).map(([type, count]) => (
                  <ListItem key={type} disableGutters>
                    <ListItemIcon>
                      <ComponentIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={type}
                      secondary={`${count} instance${count > 1 ? 's' : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
              {totalComponents === 0 && (
                <Typography color="text.secondary">No components in this template</Typography>
              )}
            </TabPanel>

            {/* Versions Tab */}
            <TabPanel value={activeTab} index={2}>
              <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                Version History
              </Typography>
              <VersionHistory templateId={templateId} currentVersion={template.version} />
            </TabPanel>
          </>
        ) : null}
      </DialogContent>

      {/* Actions */}
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<CloneIcon />}
          onClick={() => setShowCloneDialog(true)}
        >
          Clone
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<ApplyIcon />}
          onClick={() => handleApply('new')}
          disabled={isLoading || !!error}
        >
          Apply to New Design
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TemplatePreview;
