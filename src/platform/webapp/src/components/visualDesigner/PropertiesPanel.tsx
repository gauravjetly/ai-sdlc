/**
 * PropertiesPanel Component
 * Shows and edits properties of the selected node
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Link as ConnectionIcon,
} from '@mui/icons-material';
import { Node, Edge } from '@xyflow/react';
import { NODE_DEFINITIONS } from './nodes/nodeTypes';
import { LAYER_COLORS } from './nodes/BaseNode';
import { LayerType, Environment, ValidationError } from '../../contexts/DesignWizardContext';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  edges: Edge[];
  nodes: Node[];
  currentEnvironment: Environment;
  validationErrors: ValidationError[];
  onNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeDuplicate: (nodeId: string) => void;
}

/**
 * Get node definition by type
 */
function getNodeDefinition(type: string) {
  return NODE_DEFINITIONS.find((n) => n.type === type);
}

/**
 * Format cost estimate
 */
function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cost);
}

/**
 * Estimate monthly cost based on node type and config
 */
function estimateMonthlyCost(
  type: string,
  config: Record<string, any>,
  environment: Environment
): number {
  // Base costs by service type (rough estimates)
  const baseCosts: Record<string, number> = {
    vpc: 0,
    subnet: 0,
    securityGroup: 0,
    natGateway: 32,
    igw: 0,
    ec2: 30,
    eks: 72,
    ecs: 20,
    lambda: 5,
    fargate: 25,
    rds: 50,
    dynamodb: 25,
    elasticache: 40,
    documentdb: 100,
    s3: 5,
    efs: 10,
    alb: 20,
    nlb: 20,
    apiGateway: 10,
    sqs: 5,
    sns: 5,
    eventBridge: 5,
    cloudwatch: 10,
    xray: 5,
    secretsManager: 5,
    kms: 1,
    iam: 0,
    waf: 10,
    codepipeline: 5,
  };

  let cost = baseCosts[type] || 10;

  // Adjust based on environment
  const envMultipliers: Record<Environment, number> = {
    dev: 0.5,
    staging: 1,
    prod: 2,
  };
  cost *= envMultipliers[environment];

  return cost;
}

/**
 * Empty state when no node is selected
 */
function EmptyState() {
  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography color="text.secondary" variant="body2">
        Select a node on the canvas to view and edit its properties
      </Typography>
    </Box>
  );
}

/**
 * Node header section
 */
interface NodeHeaderProps {
  node: Node;
  onUpdate: (updates: Partial<Node>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function NodeHeader({ node, onUpdate, onDelete, onDuplicate }: NodeHeaderProps) {
  const definition = getNodeDefinition(node.type || '');
  const data = node.data as { label?: string; layer?: LayerType };
  const layer = data.layer || 'platform';
  const layerColor = LAYER_COLORS[layer];
  const IconComponent = definition?.icon;

  const handleLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({
        data: { ...node.data, label: event.target.value },
      });
    },
    [node.data, onUpdate]
  );

  return (
    <Box sx={{ p: 2, bgcolor: layerColor, color: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {IconComponent && <IconComponent />}
        <Typography variant="subtitle1" fontWeight={600}>
          {definition?.label || node.type}
        </Typography>
        <Chip
          label={layer}
          size="small"
          sx={{
            ml: 'auto',
            bgcolor: 'rgba(255,255,255,0.2)',
            color: 'white',
            textTransform: 'capitalize',
          }}
        />
      </Box>
      <TextField
        fullWidth
        size="small"
        value={data.label || ''}
        onChange={handleLabelChange}
        placeholder="Node name"
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(255,255,255,0.1)',
            color: 'white',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255,255,255,0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'white',
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'rgba(255,255,255,0.7)',
          },
        }}
      />
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Tooltip title="Duplicate node">
          <IconButton size="small" onClick={onDuplicate} sx={{ color: 'white' }}>
            <CopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete node">
          <IconButton size="small" onClick={onDelete} sx={{ color: 'white' }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

/**
 * Configuration section based on node type
 */
interface ConfigurationSectionProps {
  node: Node;
  onUpdate: (updates: Partial<Node>) => void;
}

function ConfigurationSection({ node, onUpdate }: ConfigurationSectionProps) {
  const data = node.data as Record<string, any>;
  const definition = getNodeDefinition(node.type || '');

  const handleConfigChange = useCallback(
    (key: string, value: any) => {
      onUpdate({
        data: { ...data, [key]: value },
      });
    },
    [data, onUpdate]
  );

  // Render different config fields based on node type
  const renderConfigFields = () => {
    switch (node.type) {
      case 'vpc':
        return (
          <>
            <TextField
              fullWidth
              size="small"
              label="CIDR Block"
              value={data.cidr || '10.0.0.0/16'}
              onChange={(e) => handleConfigChange('cidr', e.target.value)}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={data.enableDnsHostnames ?? true}
                  onChange={(e) => handleConfigChange('enableDnsHostnames', e.target.checked)}
                />
              }
              label="Enable DNS Hostnames"
            />
          </>
        );

      case 'subnet':
        return (
          <>
            <TextField
              fullWidth
              size="small"
              label="CIDR Block"
              value={data.cidr || '10.0.1.0/24'}
              onChange={(e) => handleConfigChange('cidr', e.target.value)}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={data.public ?? false}
                  onChange={(e) => handleConfigChange('public', e.target.checked)}
                />
              }
              label="Public Subnet"
            />
          </>
        );

      case 'ec2':
        return (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Instance Type</InputLabel>
              <Select
                value={data.instanceType || 't3.micro'}
                label="Instance Type"
                onChange={(e) => handleConfigChange('instanceType', e.target.value)}
              >
                <MenuItem value="t3.micro">t3.micro</MenuItem>
                <MenuItem value="t3.small">t3.small</MenuItem>
                <MenuItem value="t3.medium">t3.medium</MenuItem>
                <MenuItem value="t3.large">t3.large</MenuItem>
                <MenuItem value="m5.large">m5.large</MenuItem>
                <MenuItem value="m5.xlarge">m5.xlarge</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="AMI ID"
              value={data.ami || 'ami-latest'}
              onChange={(e) => handleConfigChange('ami', e.target.value)}
            />
          </>
        );

      case 'rds':
        return (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Engine</InputLabel>
              <Select
                value={data.engine || 'postgres'}
                label="Engine"
                onChange={(e) => handleConfigChange('engine', e.target.value)}
              >
                <MenuItem value="postgres">PostgreSQL</MenuItem>
                <MenuItem value="mysql">MySQL</MenuItem>
                <MenuItem value="mariadb">MariaDB</MenuItem>
                <MenuItem value="aurora-mysql">Aurora MySQL</MenuItem>
                <MenuItem value="aurora-postgresql">Aurora PostgreSQL</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Instance Class</InputLabel>
              <Select
                value={data.instanceClass || 'db.t3.micro'}
                label="Instance Class"
                onChange={(e) => handleConfigChange('instanceClass', e.target.value)}
              >
                <MenuItem value="db.t3.micro">db.t3.micro</MenuItem>
                <MenuItem value="db.t3.small">db.t3.small</MenuItem>
                <MenuItem value="db.t3.medium">db.t3.medium</MenuItem>
                <MenuItem value="db.r5.large">db.r5.large</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={data.multiAZ ?? false}
                  onChange={(e) => handleConfigChange('multiAZ', e.target.checked)}
                />
              }
              label="Multi-AZ Deployment"
            />
          </>
        );

      case 'lambda':
        return (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Runtime</InputLabel>
              <Select
                value={data.runtime || 'nodejs18.x'}
                label="Runtime"
                onChange={(e) => handleConfigChange('runtime', e.target.value)}
              >
                <MenuItem value="nodejs18.x">Node.js 18.x</MenuItem>
                <MenuItem value="nodejs16.x">Node.js 16.x</MenuItem>
                <MenuItem value="python3.11">Python 3.11</MenuItem>
                <MenuItem value="python3.10">Python 3.10</MenuItem>
                <MenuItem value="java17">Java 17</MenuItem>
                <MenuItem value="go1.x">Go 1.x</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="Memory (MB)"
              type="number"
              value={data.memory || 128}
              onChange={(e) => handleConfigChange('memory', parseInt(e.target.value))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Timeout (seconds)"
              type="number"
              value={data.timeout || 30}
              onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
            />
          </>
        );

      default:
        return (
          <Typography color="text.secondary" variant="body2">
            No additional configuration options
          </Typography>
        );
    }
  };

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Configuration</Typography>
      </AccordionSummary>
      <AccordionDetails>{renderConfigFields()}</AccordionDetails>
    </Accordion>
  );
}

/**
 * Connections section
 */
interface ConnectionsSectionProps {
  node: Node;
  edges: Edge[];
  nodes: Node[];
}

function ConnectionsSection({ node, edges, nodes }: ConnectionsSectionProps) {
  const connections = useMemo(() => {
    const incoming = edges
      .filter((e) => e.target === node.id)
      .map((e) => ({
        direction: 'incoming' as const,
        node: nodes.find((n) => n.id === e.source),
      }));

    const outgoing = edges
      .filter((e) => e.source === node.id)
      .map((e) => ({
        direction: 'outgoing' as const,
        node: nodes.find((n) => n.id === e.target),
      }));

    return [...incoming, ...outgoing];
  }, [node.id, edges, nodes]);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">
          Connections ({connections.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {connections.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No connections
          </Typography>
        ) : (
          <List dense disablePadding>
            {connections.map((conn, index) => {
              const connNode = conn.node;
              if (!connNode) return null;
              const connData = connNode.data as { label?: string };
              return (
                <ListItem key={index} disablePadding>
                  <ConnectionIcon
                    fontSize="small"
                    sx={{
                      mr: 1,
                      transform: conn.direction === 'incoming' ? 'rotate(180deg)' : 'none',
                      color: conn.direction === 'incoming' ? 'info.main' : 'success.main',
                    }}
                  />
                  <ListItemText
                    primary={connData.label || connNode.type}
                    secondary={conn.direction}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Cost estimate section
 */
interface CostSectionProps {
  node: Node;
  environment: Environment;
}

function CostSection({ node, environment }: CostSectionProps) {
  const data = node.data as Record<string, any>;
  const monthlyCost = estimateMonthlyCost(node.type || '', data, environment);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Cost Estimate</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Monthly ({environment})
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {formatCost(monthlyCost)}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          * Estimate based on typical usage patterns
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Validation section
 */
interface ValidationSectionProps {
  errors: ValidationError[];
}

function ValidationSection({ errors }: ValidationSectionProps) {
  if (errors.length === 0) return null;

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">Validation</Typography>
          <Chip
            label={errors.length}
            size="small"
            color="error"
            sx={{ height: 18 }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {errors.map((error, index) => (
          <Alert
            key={index}
            severity={error.severity}
            icon={
              error.severity === 'error' ? (
                <ErrorIcon fontSize="small" />
              ) : error.severity === 'warning' ? (
                <WarningIcon fontSize="small" />
              ) : (
                <InfoIcon fontSize="small" />
              )
            }
            sx={{ mb: 1, py: 0 }}
          >
            <Typography variant="body2">{error.message}</Typography>
          </Alert>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Main PropertiesPanel component
 */
export function PropertiesPanel({
  selectedNode,
  edges,
  nodes,
  currentEnvironment,
  validationErrors,
  onNodeUpdate,
  onNodeDelete,
  onNodeDuplicate,
}: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <Box sx={{ height: '100%', bgcolor: 'background.paper' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Properties
          </Typography>
        </Box>
        <EmptyState />
      </Box>
    );
  }

  const nodeErrors = validationErrors.filter(
    (e) => e.nodeId === selectedNode.id
  );

  const handleUpdate = useCallback(
    (updates: Partial<Node>) => {
      onNodeUpdate(selectedNode.id, updates);
    },
    [selectedNode.id, onNodeUpdate]
  );

  const handleDelete = useCallback(() => {
    onNodeDelete(selectedNode.id);
  }, [selectedNode.id, onNodeDelete]);

  const handleDuplicate = useCallback(() => {
    onNodeDuplicate(selectedNode.id);
  }, [selectedNode.id, onNodeDuplicate]);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <NodeHeader
        node={selectedNode}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <ConfigurationSection node={selectedNode} onUpdate={handleUpdate} />
        <ConnectionsSection node={selectedNode} edges={edges} nodes={nodes} />
        <CostSection node={selectedNode} environment={currentEnvironment} />
        <ValidationSection errors={nodeErrors} />
      </Box>
    </Box>
  );
}

export default PropertiesPanel;
