/**
 * LayerConfigPanel Component
 * View and edit layer configuration with environment support
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  TextField,
  Button,
  Alert,
  Collapse,
  Tooltip,
  Badge,
  alpha,
} from '@mui/material';
import {
  CloudQueue as VPCIcon,
  Lan as SubnetIcon,
  Security as SecurityIcon,
  Router as RouterIcon,
  Storage as DatabaseIcon,
  Memory as ComputeIcon,
  Speed as CacheIcon,
  Hub as LoadBalancerIcon,
  Code as CodeIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ContentCopy as CopyIcon,
  History as HistoryIcon,
  Compare as CompareIcon,
  Restore as RestoreIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useDesignWizard, Environment } from '../../../contexts/DesignWizardContext';
import {
  LayerType,
  LAYER_CONFIG,
} from '../../../types/layers';

interface LayerConfigPanelProps {
  /** Layer to configure */
  layer: LayerType;
  /** Whether editing is enabled */
  editable?: boolean;
  /** Handler for config changes */
  onConfigChange?: (config: Record<string, unknown>) => void;
}

interface ComponentInfo {
  id: string;
  type: string;
  name: string;
  status: 'configured' | 'deployed' | 'error';
  properties: Record<string, unknown>;
}

interface ConfigVersion {
  version: string;
  timestamp: Date;
  author: string;
  changes: string[];
}

type TabValue = 'components' | 'outputs' | 'versions';

/**
 * Get icon for component type
 */
function getComponentIcon(type: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    vpcNode: <VPCIcon />,
    subnetNode: <SubnetIcon />,
    sgNode: <SecurityIcon />,
    igwNode: <RouterIcon />,
    natNode: <RouterIcon />,
    rdsNode: <DatabaseIcon />,
    eksNode: <ComputeIcon />,
    ec2Node: <ComputeIcon />,
    elasticacheNode: <CacheIcon />,
    albNode: <LoadBalancerIcon />,
  };
  return iconMap[type] || <CodeIcon />;
}

/**
 * Component List Item
 */
function ComponentListItem({
  component,
  isSelected,
  onClick,
  onEdit,
  editable,
}: {
  component: ComponentInfo;
  isSelected: boolean;
  onClick: () => void;
  onEdit?: () => void;
  editable: boolean;
}) {
  return (
    <ListItem
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        bgcolor: isSelected ? alpha('#2196F3', 0.08) : 'transparent',
        borderRadius: 1,
        mb: 0.5,
        '&:hover': {
          bgcolor: alpha('#2196F3', 0.04),
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        {getComponentIcon(component.type)}
      </ListItemIcon>
      <ListItemText
        primary={component.name}
        secondary={component.type.replace('Node', '')}
        primaryTypographyProps={{ fontWeight: isSelected ? 600 : 400 }}
      />
      <ListItemSecondaryAction>
        <Chip
          label={component.status}
          size="small"
          color={
            component.status === 'deployed'
              ? 'success'
              : component.status === 'error'
              ? 'error'
              : 'default'
          }
          sx={{ mr: 1 }}
        />
        {editable && (
          <IconButton size="small" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );
}

/**
 * Component Detail View
 */
function ComponentDetailView({
  component,
  editable,
  onSave,
  onCancel,
}: {
  component: ComponentInfo;
  editable: boolean;
  onSave: (updates: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});

  const handleEdit = () => {
    setEditedValues({ ...component.properties });
    setEditMode(true);
  };

  const handleSave = () => {
    onSave(editedValues);
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditedValues({});
    setEditMode(false);
    onCancel();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getComponentIcon(component.type)}
          <Typography variant="subtitle1" fontWeight={600}>
            {component.name}
          </Typography>
        </Box>
        {editable && !editMode && (
          <Button size="small" startIcon={<EditIcon />} onClick={handleEdit}>
            Edit
          </Button>
        )}
        {editMode && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<CheckIcon />} onClick={handleSave} color="primary">
              Save
            </Button>
            <Button size="small" startIcon={<CloseIcon />} onClick={handleCancel}>
              Cancel
            </Button>
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {Object.entries(component.properties).map(([key, value]) => {
          // Skip complex objects for simple display
          if (typeof value === 'object' && value !== null) {
            return (
              <Box key={key}>
                <Typography variant="caption" color="text.secondary">
                  {key}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}
                >
                  {JSON.stringify(value, null, 2)}
                </Typography>
              </Box>
            );
          }

          return (
            <Box key={key}>
              <Typography variant="caption" color="text.secondary">
                {key}
              </Typography>
              {editMode ? (
                <TextField
                  size="small"
                  fullWidth
                  value={String(editedValues[key] ?? value)}
                  onChange={(e) =>
                    setEditedValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              ) : (
                <Typography variant="body2">{String(value)}</Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/**
 * Terraform Outputs Display
 */
function TerraformOutputsView({ outputs }: { outputs: Record<string, unknown> }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, value: unknown) => {
    await navigator.clipboard.writeText(String(value));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!outputs || Object.keys(outputs).length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No Terraform outputs available. Deploy the layer to see outputs.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Terraform Outputs
      </Typography>
      <List dense>
        {Object.entries(outputs).map(([key, value]) => (
          <ListItem
            key={key}
            sx={{
              bgcolor: alpha('#000', 0.02),
              borderRadius: 1,
              mb: 0.5,
            }}
          >
            <ListItemText
              primary={key}
              secondary={
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {String(value)}
                </Typography>
              }
            />
            <ListItemSecondaryAction>
              <Tooltip title={copiedKey === key ? 'Copied!' : 'Copy'}>
                <IconButton size="small" onClick={() => handleCopy(key, value)}>
                  {copiedKey === key ? <CheckIcon color="success" /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

/**
 * Version History View
 */
function VersionHistoryView({
  versions,
  onRestore,
  onCompare,
}: {
  versions: ConfigVersion[];
  onRestore: (version: string) => void;
  onCompare: (v1: string, v2: string) => void;
}) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  const toggleVersion = (version: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(version)) {
        return prev.filter((v) => v !== version);
      }
      if (prev.length < 2) {
        return [...prev, version];
      }
      return [prev[1], version];
    });
  };

  if (!versions || versions.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No version history available.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2">Version History</Typography>
        {selectedVersions.length === 2 && (
          <Button
            size="small"
            startIcon={<CompareIcon />}
            onClick={() => onCompare(selectedVersions[0], selectedVersions[1])}
          >
            Compare Selected
          </Button>
        )}
      </Box>

      <List dense>
        {versions.map((version) => (
          <ListItem
            key={version.version}
            sx={{
              bgcolor: selectedVersions.includes(version.version)
                ? alpha('#2196F3', 0.08)
                : 'transparent',
              borderRadius: 1,
              mb: 0.5,
              cursor: 'pointer',
            }}
            onClick={() => toggleVersion(version.version)}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={`v${version.version}`}
              secondary={
                <>
                  {new Date(version.timestamp).toLocaleString()} by {version.author}
                  <br />
                  {version.changes.join(', ')}
                </>
              }
            />
            <ListItemSecondaryAction>
              <Tooltip title="Restore this version">
                <IconButton size="small" onClick={() => onRestore(version.version)}>
                  <RestoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

/**
 * LayerConfigPanel main component
 */
export function LayerConfigPanel({
  layer,
  editable = true,
  onConfigChange,
}: LayerConfigPanelProps) {
  const { layers, selectedEnvironment, selectEnvironment, environments, updateEnvironmentConfig } =
    useDesignWizard();

  const [activeTab, setActiveTab] = useState<TabValue>('components');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [versions] = useState<ConfigVersion[]>([
    // Mock data - would come from API
    {
      version: '1.2.0',
      timestamp: new Date(),
      author: 'user@example.com',
      changes: ['Updated instance size', 'Added new security group'],
    },
    {
      version: '1.1.0',
      timestamp: new Date(Date.now() - 86400000),
      author: 'user@example.com',
      changes: ['Initial configuration'],
    },
  ]);

  const config = LAYER_CONFIG[layer];
  const layerData = layers[layer]?.data;
  const layerStatus = layers[layer]?.status;

  // Extract components from layer data
  const components: ComponentInfo[] = useMemo(() => {
    if (!layerData?.nodes) return [];

    return layerData.nodes
      .filter((node) => node.layer === layer)
      .map((node) => ({
        id: node.id,
        type: node.type,
        name: node.data?.name || node.id,
        status: layerStatus === 'deployed' ? 'deployed' : 'configured',
        properties: node.data || {},
      }));
  }, [layerData, layer, layerStatus]);

  // Extract Terraform outputs (mock for now)
  const terraformOutputs: Record<string, unknown> = useMemo(() => {
    if (layerStatus !== 'deployed') return {};

    // In real implementation, this would come from API
    return {
      vpc_id: 'vpc-12345678',
      vpc_cidr: '10.0.0.0/16',
      public_subnet_ids: ['subnet-abc123', 'subnet-def456'],
      private_subnet_ids: ['subnet-ghi789', 'subnet-jkl012'],
    };
  }, [layerStatus]);

  const selectedComponentData = useMemo(() => {
    return components.find((c) => c.id === selectedComponent);
  }, [components, selectedComponent]);

  const handleComponentSelect = useCallback((id: string) => {
    setSelectedComponent(id);
  }, []);

  const handleConfigSave = useCallback(
    (updates: Record<string, unknown>) => {
      onConfigChange?.(updates);
    },
    [onConfigChange]
  );

  const handleVersionRestore = useCallback((version: string) => {
    console.log('Restore version:', version);
    // Would call API to restore version
  }, []);

  const handleVersionCompare = useCallback((v1: string, v2: string) => {
    console.log('Compare versions:', v1, v2);
    // Would open diff view
  }, []);

  return (
    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: config.color,
              }}
            />
            <Typography variant="h6" fontWeight={600}>
              {config.title} Configuration
            </Typography>
          </Box>
          <Chip
            label={`${components.length} components`}
            size="small"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Environment Tabs */}
      <Box sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={selectedEnvironment}
          onChange={(_, v) => selectEnvironment(v)}
          variant="fullWidth"
        >
          <Tab label="Dev" value="dev" />
          <Tab label="Staging" value="staging" />
          <Tab label="Prod" value="prod" />
        </Tabs>
      </Box>

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth">
          <Tab
            label={
              <Badge badgeContent={components.length} color="primary">
                Components
              </Badge>
            }
            value="components"
          />
          <Tab label="Outputs" value="outputs" disabled={layerStatus !== 'deployed'} />
          <Tab label="Versions" value="versions" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'components' && (
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Component List */}
            <Box sx={{ width: 280, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
              <List sx={{ p: 1 }}>
                {components.length === 0 ? (
                  <Alert severity="info" sx={{ m: 1 }}>
                    No components configured. Complete the wizard to add components.
                  </Alert>
                ) : (
                  components.map((component) => (
                    <ComponentListItem
                      key={component.id}
                      component={component}
                      isSelected={selectedComponent === component.id}
                      onClick={() => handleComponentSelect(component.id)}
                      editable={editable}
                    />
                  ))
                )}
              </List>
            </Box>

            {/* Component Detail */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {selectedComponentData ? (
                <ComponentDetailView
                  component={selectedComponentData}
                  editable={editable}
                  onSave={handleConfigSave}
                  onCancel={() => setSelectedComponent(null)}
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary',
                  }}
                >
                  <Typography>Select a component to view details</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {activeTab === 'outputs' && <TerraformOutputsView outputs={terraformOutputs} />}

        {activeTab === 'versions' && (
          <VersionHistoryView
            versions={versions}
            onRestore={handleVersionRestore}
            onCompare={handleVersionCompare}
          />
        )}
      </Box>
    </Paper>
  );
}

export default LayerConfigPanel;
