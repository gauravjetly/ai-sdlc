/**
 * Service Connections Step Component
 * Configure service connections, load balancers, DNS, and API gateway
 */

import React, { useCallback, useState, useMemo } from 'react';
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
  Chip,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Autocomplete,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Link as LinkIcon,
  Public as DnsIcon,
  AccountTree as LoadBalancerIcon,
  Cable as ConnectionIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  ServiceConnectionConfig,
  LoadBalancerConfig,
  DNSConfig,
  ConnectionType,
  LoadBalancerType,
  LoadBalancerScheme,
  ListenerConfig,
  TargetGroupConfig,
  HostedZoneConfig,
  DNSRecordConfig,
  HealthCheckConfig,
} from '../../../../../types/devops';
import { ValidationError, NetworkLayerData, SubnetConfig, SecurityGroupConfig } from '../../../../../types/network';

interface ServiceConnectionsStepProps {
  connections: ServiceConnectionConfig[];
  onConnectionsChange: (connections: ServiceConnectionConfig[]) => void;
  loadBalancers: LoadBalancerConfig[];
  onLoadBalancersChange: (loadBalancers: LoadBalancerConfig[]) => void;
  dns: DNSConfig;
  onDNSChange: (dns: DNSConfig) => void;
  networkData?: NetworkLayerData;
  platformData?: Record<string, unknown>;
  errors: ValidationError[];
}

const CONNECTION_TYPES: { value: ConnectionType; label: string; description: string }[] = [
  { value: 'compute-to-database', label: 'Compute to Database', description: 'Connect ECS/Lambda to RDS/DynamoDB' },
  { value: 'compute-to-cache', label: 'Compute to Cache', description: 'Connect compute to ElastiCache' },
  { value: 'compute-to-queue', label: 'Compute to Queue', description: 'Connect compute to SQS/SNS' },
  { value: 'load-balancer', label: 'Load Balancer', description: 'Route traffic through ALB/NLB' },
  { value: 'api-gateway', label: 'API Gateway', description: 'Configure API Gateway integration' },
  { value: 'dns', label: 'DNS', description: 'Configure Route 53 records' },
];

export function ServiceConnectionsStep({
  connections,
  onConnectionsChange,
  loadBalancers,
  onLoadBalancersChange,
  dns,
  onDNSChange,
  networkData,
  platformData,
  errors,
}: ServiceConnectionsStepProps) {
  const [expandedPanel, setExpandedPanel] = useState<string | false>('connections');
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ServiceConnectionConfig | null>(null);
  const [lbDialogOpen, setLbDialogOpen] = useState(false);
  const [editingLb, setEditingLb] = useState<LoadBalancerConfig | null>(null);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<HostedZoneConfig | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DNSRecordConfig | null>(null);

  // Extract subnets and security groups from network data
  const subnets = useMemo(() => networkData?.subnets || [], [networkData]);
  const securityGroups = useMemo(() => networkData?.securityGroups || [], [networkData]);

  // Mock compute and database services (would come from platform layer in real implementation)
  const computeServices = useMemo(() => [
    { id: 'ecs-web', name: 'Web Service (ECS)', type: 'ecs' },
    { id: 'ecs-api', name: 'API Service (ECS)', type: 'ecs' },
    { id: 'lambda-processor', name: 'Event Processor (Lambda)', type: 'lambda' },
  ], []);

  const databaseServices = useMemo(() => [
    { id: 'rds-main', name: 'Main Database (RDS)', type: 'rds' },
    { id: 'dynamodb-cache', name: 'Cache Table (DynamoDB)', type: 'dynamodb' },
    { id: 'elasticache-redis', name: 'Redis Cache (ElastiCache)', type: 'elasticache' },
  ], []);

  const handlePanelChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Connection handlers
  const handleAddConnection = useCallback(() => {
    const newConnection: ServiceConnectionConfig = {
      id: uuid(),
      name: '',
      type: 'compute-to-database',
      sourceId: '',
      sourceType: '',
      sourceName: '',
      targetId: '',
      targetType: '',
      targetName: '',
      config: {},
    };
    setEditingConnection(newConnection);
    setConnectionDialogOpen(true);
  }, []);

  const handleSaveConnection = useCallback(
    (connection: ServiceConnectionConfig) => {
      const exists = connections.find((c) => c.id === connection.id);
      if (exists) {
        onConnectionsChange(
          connections.map((c) => (c.id === connection.id ? connection : c))
        );
      } else {
        onConnectionsChange([...connections, connection]);
      }
      setConnectionDialogOpen(false);
      setEditingConnection(null);
    },
    [connections, onConnectionsChange]
  );

  const handleDeleteConnection = useCallback(
    (id: string) => {
      onConnectionsChange(connections.filter((c) => c.id !== id));
    },
    [connections, onConnectionsChange]
  );

  // Load Balancer handlers
  const handleAddLoadBalancer = useCallback(() => {
    const defaultHealthCheck: HealthCheckConfig = {
      enabled: true,
      path: '/health',
      port: 'traffic-port',
      protocol: 'HTTP',
      interval: 30,
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
    };

    const newLb: LoadBalancerConfig = {
      id: uuid(),
      name: '',
      type: 'alb',
      scheme: 'internet-facing',
      subnets: [],
      securityGroups: [],
      listeners: [
        {
          id: uuid(),
          port: 80,
          protocol: 'HTTP',
          defaultAction: { type: 'forward' },
          rules: [],
        },
      ],
      targetGroups: [
        {
          id: uuid(),
          name: 'default-tg',
          port: 80,
          protocol: 'HTTP',
          targetType: 'ip',
          healthCheck: defaultHealthCheck,
          targets: [],
        },
      ],
      tags: [],
    };
    setEditingLb(newLb);
    setLbDialogOpen(true);
  }, []);

  const handleSaveLoadBalancer = useCallback(
    (lb: LoadBalancerConfig) => {
      const exists = loadBalancers.find((l) => l.id === lb.id);
      if (exists) {
        onLoadBalancersChange(
          loadBalancers.map((l) => (l.id === lb.id ? lb : l))
        );
      } else {
        onLoadBalancersChange([...loadBalancers, lb]);
      }
      setLbDialogOpen(false);
      setEditingLb(null);
    },
    [loadBalancers, onLoadBalancersChange]
  );

  const handleDeleteLoadBalancer = useCallback(
    (id: string) => {
      onLoadBalancersChange(loadBalancers.filter((l) => l.id !== id));
    },
    [loadBalancers, onLoadBalancersChange]
  );

  // DNS handlers
  const handleAddHostedZone = useCallback(() => {
    const newZone: HostedZoneConfig = {
      id: uuid(),
      name: '',
      isPrivate: false,
      tags: [],
    };
    setEditingZone(newZone);
    setZoneDialogOpen(true);
  }, []);

  const handleSaveHostedZone = useCallback(
    (zone: HostedZoneConfig) => {
      const exists = dns.hostedZones.find((z) => z.id === zone.id);
      if (exists) {
        onDNSChange({
          ...dns,
          hostedZones: dns.hostedZones.map((z) => (z.id === zone.id ? zone : z)),
        });
      } else {
        onDNSChange({
          ...dns,
          hostedZones: [...dns.hostedZones, zone],
        });
      }
      setZoneDialogOpen(false);
      setEditingZone(null);
    },
    [dns, onDNSChange]
  );

  const handleDeleteHostedZone = useCallback(
    (id: string) => {
      onDNSChange({
        ...dns,
        hostedZones: dns.hostedZones.filter((z) => z.id !== id),
        records: dns.records.filter((r) => r.hostedZoneId !== id),
      });
    },
    [dns, onDNSChange]
  );

  const handleAddDNSRecord = useCallback(() => {
    const newRecord: DNSRecordConfig = {
      id: uuid(),
      name: '',
      type: 'A',
      hostedZoneId: dns.hostedZones[0]?.id || '',
      value: '',
      ttl: 300,
    };
    setEditingRecord(newRecord);
    setRecordDialogOpen(true);
  }, [dns.hostedZones]);

  const handleSaveDNSRecord = useCallback(
    (record: DNSRecordConfig) => {
      const exists = dns.records.find((r) => r.id === record.id);
      if (exists) {
        onDNSChange({
          ...dns,
          records: dns.records.map((r) => (r.id === record.id ? record : r)),
        });
      } else {
        onDNSChange({
          ...dns,
          records: [...dns.records, record],
        });
      }
      setRecordDialogOpen(false);
      setEditingRecord(null);
    },
    [dns, onDNSChange]
  );

  const handleDeleteDNSRecord = useCallback(
    (id: string) => {
      onDNSChange({
        ...dns,
        records: dns.records.filter((r) => r.id !== id),
      });
    },
    [dns, onDNSChange]
  );

  // Get errors for specific paths
  const getFieldErrors = (path: string) =>
    errors.filter((e) => e.path?.includes(path));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Service Connections
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure connections between services, load balancers, and DNS settings.
      </Typography>

      {errors.filter((e) => e.severity === 'error').length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.filter((e) => e.severity === 'error').length} configuration error(s) found.
        </Alert>
      )}

      {/* Service Connections Section */}
      <Accordion
        expanded={expandedPanel === 'connections'}
        onChange={handlePanelChange('connections')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConnectionIcon />
            <Typography>Service Connections</Typography>
            <Chip
              size="small"
              label={`${connections.length} configured`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddConnection}
            >
              Add Connection
            </Button>
          </Box>

          {connections.length === 0 ? (
            <Alert severity="info">
              No service connections configured. Add connections to link your compute resources to databases, caches, and other services.
            </Alert>
          ) : (
            <List dense>
              {connections.map((conn) => (
                <ListItem
                  key={conn.id}
                  sx={{
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{conn.name || 'Unnamed Connection'}</Typography>
                        <Chip size="small" label={conn.type} variant="outlined" />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption">
                        {conn.sourceName || conn.sourceId} {'->'} {conn.targetName || conn.targetId}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingConnection(conn);
                        setConnectionDialogOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteConnection(conn.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Load Balancers Section */}
      <Accordion
        expanded={expandedPanel === 'load-balancers'}
        onChange={handlePanelChange('load-balancers')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LoadBalancerIcon />
            <Typography>Load Balancers</Typography>
            <Chip
              size="small"
              label={`${loadBalancers.length} configured`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddLoadBalancer}
            >
              Add Load Balancer
            </Button>
          </Box>

          {loadBalancers.length === 0 ? (
            <Alert severity="info">
              No load balancers configured. Add a load balancer to distribute traffic to your services.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {loadBalancers.map((lb) => (
                <Grid item xs={12} md={6} key={lb.id}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2">{lb.name || 'Unnamed LB'}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          <Chip size="small" label={lb.type.toUpperCase()} color="primary" />
                          <Chip size="small" label={lb.scheme} variant="outlined" />
                        </Box>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingLb(lb);
                            setLbDialogOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteLoadBalancer(lb.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {lb.listeners.length} listener(s), {lb.targetGroups.length} target group(s)
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {lb.subnets.length} subnet(s), {lb.securityGroups.length} security group(s)
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* DNS Section */}
      <Accordion
        expanded={expandedPanel === 'dns'}
        onChange={handlePanelChange('dns')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DnsIcon />
            <Typography>DNS (Route 53)</Typography>
            <Chip
              size="small"
              label={`${dns.hostedZones.length} zones, ${dns.records.length} records`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {/* Hosted Zones */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Hosted Zones</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddHostedZone}
              >
                Add Zone
              </Button>
            </Box>

            {dns.hostedZones.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                No hosted zones configured. Add a hosted zone to manage DNS records.
              </Alert>
            ) : (
              <List dense sx={{ mb: 2 }}>
                {dns.hostedZones.map((zone) => (
                  <ListItem
                    key={zone.id}
                    sx={{
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={zone.name}
                      secondary={zone.isPrivate ? 'Private Zone' : 'Public Zone'}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingZone(zone);
                          setZoneDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteHostedZone(zone.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          {/* DNS Records */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">DNS Records</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddDNSRecord}
                disabled={dns.hostedZones.length === 0}
              >
                Add Record
              </Button>
            </Box>

            {dns.records.length === 0 ? (
              <Alert severity="info">
                No DNS records configured. Add records to route traffic to your services.
              </Alert>
            ) : (
              <List dense>
                {dns.records.map((record) => (
                  <ListItem
                    key={record.id}
                    sx={{
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{record.name}</Typography>
                          <Chip size="small" label={record.type} variant="outlined" />
                        </Box>
                      }
                      secondary={record.alias ? 'Alias Record' : record.value}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingRecord(record);
                          setRecordDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteDNSRecord(record.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Warnings */}
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

      {/* Connection Dialog */}
      <Dialog
        open={connectionDialogOpen}
        onClose={() => {
          setConnectionDialogOpen(false);
          setEditingConnection(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingConnection && connections.find((c) => c.id === editingConnection.id)
            ? 'Edit Connection'
            : 'Add Connection'}
        </DialogTitle>
        <DialogContent>
          {editingConnection && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Connection Name"
                  value={editingConnection.name}
                  onChange={(e) =>
                    setEditingConnection({ ...editingConnection, name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Connection Type</InputLabel>
                  <Select
                    value={editingConnection.type}
                    label="Connection Type"
                    onChange={(e) =>
                      setEditingConnection({
                        ...editingConnection,
                        type: e.target.value as ConnectionType,
                      })
                    }
                  >
                    {CONNECTION_TYPES.map((ct) => (
                      <MenuItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source Service</InputLabel>
                  <Select
                    value={editingConnection.sourceId}
                    label="Source Service"
                    onChange={(e) => {
                      const service = computeServices.find((s) => s.id === e.target.value);
                      setEditingConnection({
                        ...editingConnection,
                        sourceId: e.target.value,
                        sourceType: service?.type || '',
                        sourceName: service?.name || '',
                      });
                    }}
                  >
                    {computeServices.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target Service</InputLabel>
                  <Select
                    value={editingConnection.targetId}
                    label="Target Service"
                    onChange={(e) => {
                      const service = databaseServices.find((s) => s.id === e.target.value);
                      setEditingConnection({
                        ...editingConnection,
                        targetId: e.target.value,
                        targetType: service?.type || '',
                        targetName: service?.name || '',
                      });
                    }}
                  >
                    {databaseServices.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {securityGroups.length > 0 && (
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Security Group</InputLabel>
                    <Select
                      value={editingConnection.securityGroupId || ''}
                      label="Security Group"
                      onChange={(e) =>
                        setEditingConnection({
                          ...editingConnection,
                          securityGroupId: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="">Auto-create</MenuItem>
                      {securityGroups.map((sg) => (
                        <MenuItem key={sg.id} value={sg.id}>
                          {sg.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              {editingConnection.type === 'compute-to-database' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Secrets Manager ARN"
                    value={editingConnection.secretsManagerArn || ''}
                    onChange={(e) =>
                      setEditingConnection({
                        ...editingConnection,
                        secretsManagerArn: e.target.value,
                      })
                    }
                    placeholder="arn:aws:secretsmanager:..."
                    helperText="Store database credentials in Secrets Manager"
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConnectionDialogOpen(false);
              setEditingConnection(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => editingConnection && handleSaveConnection(editingConnection)}
            disabled={!editingConnection?.sourceId || !editingConnection?.targetId}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Balancer Dialog */}
      <Dialog
        open={lbDialogOpen}
        onClose={() => {
          setLbDialogOpen(false);
          setEditingLb(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingLb && loadBalancers.find((l) => l.id === editingLb.id)
            ? 'Edit Load Balancer'
            : 'Add Load Balancer'}
        </DialogTitle>
        <DialogContent>
          {editingLb && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Load Balancer Name"
                  value={editingLb.name}
                  onChange={(e) =>
                    setEditingLb({ ...editingLb, name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={editingLb.type}
                    label="Type"
                    onChange={(e) =>
                      setEditingLb({
                        ...editingLb,
                        type: e.target.value as LoadBalancerType,
                      })
                    }
                  >
                    <MenuItem value="alb">Application (ALB)</MenuItem>
                    <MenuItem value="nlb">Network (NLB)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Scheme</InputLabel>
                  <Select
                    value={editingLb.scheme}
                    label="Scheme"
                    onChange={(e) =>
                      setEditingLb({
                        ...editingLb,
                        scheme: e.target.value as LoadBalancerScheme,
                      })
                    }
                  >
                    <MenuItem value="internet-facing">Internet Facing</MenuItem>
                    <MenuItem value="internal">Internal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {subnets.length > 0 && (
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={subnets.map((s) => s.id)}
                    value={editingLb.subnets}
                    onChange={(_, value) =>
                      setEditingLb({ ...editingLb, subnets: value })
                    }
                    getOptionLabel={(id) => {
                      const subnet = subnets.find((s) => s.id === id);
                      return subnet ? `${subnet.name} (${subnet.cidrBlock})` : id;
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Subnets"
                        placeholder="Select subnets"
                      />
                    )}
                  />
                </Grid>
              )}
              {securityGroups.length > 0 && editingLb.type === 'alb' && (
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={securityGroups.map((sg) => sg.id)}
                    value={editingLb.securityGroups}
                    onChange={(_, value) =>
                      setEditingLb({ ...editingLb, securityGroups: value })
                    }
                    getOptionLabel={(id) => {
                      const sg = securityGroups.find((s) => s.id === id);
                      return sg ? sg.name : id;
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Security Groups"
                        placeholder="Select security groups"
                      />
                    )}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setLbDialogOpen(false);
              setEditingLb(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => editingLb && handleSaveLoadBalancer(editingLb)}
            disabled={!editingLb?.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hosted Zone Dialog */}
      <Dialog
        open={zoneDialogOpen}
        onClose={() => {
          setZoneDialogOpen(false);
          setEditingZone(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingZone && dns.hostedZones.find((z) => z.id === editingZone.id)
            ? 'Edit Hosted Zone'
            : 'Add Hosted Zone'}
        </DialogTitle>
        <DialogContent>
          {editingZone && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Domain Name"
                  value={editingZone.name}
                  onChange={(e) =>
                    setEditingZone({ ...editingZone, name: e.target.value })
                  }
                  placeholder="example.com"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingZone.isPrivate}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, isPrivate: e.target.checked })
                      }
                    />
                  }
                  label="Private Hosted Zone"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Comment"
                  value={editingZone.comment || ''}
                  onChange={(e) =>
                    setEditingZone({ ...editingZone, comment: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setZoneDialogOpen(false);
              setEditingZone(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => editingZone && handleSaveHostedZone(editingZone)}
            disabled={!editingZone?.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* DNS Record Dialog */}
      <Dialog
        open={recordDialogOpen}
        onClose={() => {
          setRecordDialogOpen(false);
          setEditingRecord(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingRecord && dns.records.find((r) => r.id === editingRecord.id)
            ? 'Edit DNS Record'
            : 'Add DNS Record'}
        </DialogTitle>
        <DialogContent>
          {editingRecord && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Hosted Zone</InputLabel>
                  <Select
                    value={editingRecord.hostedZoneId}
                    label="Hosted Zone"
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        hostedZoneId: e.target.value,
                      })
                    }
                  >
                    {dns.hostedZones.map((zone) => (
                      <MenuItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Record Name"
                  value={editingRecord.name}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, name: e.target.value })
                  }
                  placeholder="www"
                  helperText="Leave empty for root domain"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={editingRecord.type}
                    label="Type"
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        type: e.target.value as DNSRecordConfig['type'],
                      })
                    }
                  >
                    <MenuItem value="A">A</MenuItem>
                    <MenuItem value="AAAA">AAAA</MenuItem>
                    <MenuItem value="CNAME">CNAME</MenuItem>
                    <MenuItem value="MX">MX</MenuItem>
                    <MenuItem value="TXT">TXT</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Value"
                  value={editingRecord.value}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, value: e.target.value })
                  }
                  placeholder="IP address or hostname"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="TTL (seconds)"
                  value={editingRecord.ttl}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      ttl: parseInt(e.target.value) || 300,
                    })
                  }
                  inputProps={{ min: 60 }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRecordDialogOpen(false);
              setEditingRecord(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => editingRecord && handleSaveDNSRecord(editingRecord)}
            disabled={!editingRecord?.name || !editingRecord?.hostedZoneId}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ServiceConnectionsStep;
