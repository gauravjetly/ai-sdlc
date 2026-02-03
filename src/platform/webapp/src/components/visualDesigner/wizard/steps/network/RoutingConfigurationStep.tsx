/**
 * RoutingConfigurationStep Component
 * Step 3 of Network Wizard - Configure gateways and route tables
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Language as IGWIcon,
  Transform as NATIcon,
  Route as RouteIcon,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import {
  SubnetConfig,
  RoutingConfig,
  NATGatewayConfig,
  RouteTableConfig,
  ValidationError,
  DEFAULT_ROUTING_CONFIG,
} from '../../../../../types/network';
import { FormField } from '../../shared';
import { estimateNATCost, HELP_TEXT } from '../../utils/constants';

export interface RoutingConfigurationStepProps {
  subnets: SubnetConfig[];
  routing: RoutingConfig;
  onChange: (routing: RoutingConfig) => void;
  errors: ValidationError[];
}

export function RoutingConfigurationStep({
  subnets,
  routing,
  onChange,
  errors,
}: RoutingConfigurationStepProps) {
  // Separate public and private subnets
  const publicSubnets = useMemo(() => subnets.filter((s) => s.isPublic), [subnets]);
  const privateSubnets = useMemo(() => subnets.filter((s) => !s.isPublic), [subnets]);

  // Auto-configure route tables when subnets or gateways change
  useEffect(() => {
    // Only auto-configure if no route tables exist
    if (routing.routeTables.length === 0 && subnets.length > 0) {
      const newRouteTables: RouteTableConfig[] = [];

      // Public route table
      if (publicSubnets.length > 0) {
        const publicRT: RouteTableConfig = {
          id: uuid(),
          name: 'public-rt',
          isMain: false,
          routes: [
            { destinationCidr: 'local', targetType: 'local', targetId: 'local' },
          ],
          subnetAssociations: publicSubnets.map((s) => s.id),
        };

        // Add IGW route if enabled
        if (routing.internetGateway.enabled) {
          publicRT.routes.push({
            destinationCidr: '0.0.0.0/0',
            targetType: 'igw',
            targetId: 'igw',
          });
        }

        newRouteTables.push(publicRT);
      }

      // Private route table
      if (privateSubnets.length > 0) {
        const privateRT: RouteTableConfig = {
          id: uuid(),
          name: 'private-rt',
          isMain: true,
          routes: [
            { destinationCidr: 'local', targetType: 'local', targetId: 'local' },
          ],
          subnetAssociations: privateSubnets.map((s) => s.id),
        };

        // Add NAT route if NAT exists
        if (routing.natGateways.length > 0) {
          privateRT.routes.push({
            destinationCidr: '0.0.0.0/0',
            targetType: 'nat',
            targetId: routing.natGateways[0].id,
          });
        }

        newRouteTables.push(privateRT);
      }

      if (newRouteTables.length > 0) {
        onChange({ ...routing, routeTables: newRouteTables });
      }
    }
  }, [subnets, routing, onChange, publicSubnets, privateSubnets]);

  // Handle IGW toggle
  const handleIGWToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const enabled = e.target.checked;
      const newRouting = {
        ...routing,
        internetGateway: {
          ...routing.internetGateway,
          enabled,
          name: enabled ? routing.internetGateway.name || 'main-igw' : '',
        },
      };

      // Update public route table
      if (routing.routeTables.length > 0) {
        newRouting.routeTables = routing.routeTables.map((rt) => {
          // Find public route table (one with public subnet associations)
          const hasPublicSubnet = rt.subnetAssociations.some((sid) =>
            publicSubnets.some((s) => s.id === sid)
          );

          if (hasPublicSubnet) {
            const routes = rt.routes.filter((r) => r.targetType !== 'igw');
            if (enabled) {
              routes.push({
                destinationCidr: '0.0.0.0/0',
                targetType: 'igw',
                targetId: 'igw',
              });
            }
            return { ...rt, routes };
          }
          return rt;
        });
      }

      onChange(newRouting);
    },
    [routing, onChange, publicSubnets]
  );

  // Handle IGW name change
  const handleIGWNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...routing,
        internetGateway: {
          ...routing.internetGateway,
          name: e.target.value,
        },
      });
    },
    [routing, onChange]
  );

  // Add NAT Gateway
  const handleAddNAT = useCallback(() => {
    if (publicSubnets.length === 0) return;

    const newNAT: NATGatewayConfig = {
      id: uuid(),
      name: `nat-gw-${routing.natGateways.length + 1}`,
      subnetId: publicSubnets[0].id,
    };

    const newRouting = {
      ...routing,
      natGateways: [...routing.natGateways, newNAT],
    };

    // Update private route table with NAT route if this is first NAT
    if (routing.natGateways.length === 0) {
      newRouting.routeTables = routing.routeTables.map((rt) => {
        const hasPrivateSubnet = rt.subnetAssociations.some((sid) =>
          privateSubnets.some((s) => s.id === sid)
        );

        if (hasPrivateSubnet) {
          const routes = rt.routes.filter((r) => r.targetType !== 'nat');
          routes.push({
            destinationCidr: '0.0.0.0/0',
            targetType: 'nat',
            targetId: newNAT.id,
          });
          return { ...rt, routes };
        }
        return rt;
      });
    }

    onChange(newRouting);
  }, [routing, onChange, publicSubnets, privateSubnets]);

  // Remove NAT Gateway
  const handleRemoveNAT = useCallback(
    (natId: string) => {
      const newNATs = routing.natGateways.filter((n) => n.id !== natId);

      const newRouting = {
        ...routing,
        natGateways: newNATs,
      };

      // Update route tables - remove NAT routes if no NATs left
      if (newNATs.length === 0) {
        newRouting.routeTables = routing.routeTables.map((rt) => ({
          ...rt,
          routes: rt.routes.filter((r) => r.targetType !== 'nat'),
        }));
      } else {
        // Update routes to point to remaining NAT
        newRouting.routeTables = routing.routeTables.map((rt) => ({
          ...rt,
          routes: rt.routes.map((r) =>
            r.targetType === 'nat' && r.targetId === natId
              ? { ...r, targetId: newNATs[0].id }
              : r
          ),
        }));
      }

      onChange(newRouting);
    },
    [routing, onChange]
  );

  // Update NAT Gateway
  const handleNATChange = useCallback(
    (natId: string, field: 'name' | 'subnetId', value: string) => {
      onChange({
        ...routing,
        natGateways: routing.natGateways.map((n) =>
          n.id === natId ? { ...n, [field]: value } : n
        ),
      });
    },
    [routing, onChange]
  );

  // Get errors for specific component
  const getErrors = useCallback(
    (path: string) => errors.filter((e) => e.path?.includes(path)),
    [errors]
  );

  // Cost estimate
  const natCostEstimate = useMemo(
    () => estimateNATCost(routing.natGateways.length),
    [routing.natGateways.length]
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Routing Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure internet connectivity for your VPC. Public subnets use an Internet Gateway,
        while private subnets use NAT Gateways for outbound internet access.
      </Typography>

      {/* Internet Gateway */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IGWIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={500}>
            Internet Gateway
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={routing.internetGateway.enabled}
              onChange={handleIGWToggle}
              disabled={publicSubnets.length === 0}
            />
          }
          label={
            <Box>
              <Typography variant="body2">
                {routing.internetGateway.enabled ? 'Enabled' : 'Disabled'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {HELP_TEXT.internetGateway}
              </Typography>
            </Box>
          }
        />

        {publicSubnets.length === 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Add a public subnet to enable the Internet Gateway.
          </Alert>
        )}

        {routing.internetGateway.enabled && (
          <Box sx={{ mt: 2 }}>
            <FormField label="Internet Gateway Name" required>
              <TextField
                size="small"
                fullWidth
                value={routing.internetGateway.name}
                onChange={handleIGWNameChange}
                placeholder="e.g., main-igw"
              />
            </FormField>
          </Box>
        )}
      </Paper>

      {/* NAT Gateways */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NATIcon color="secondary" />
            <Typography variant="subtitle1" fontWeight={500}>
              NAT Gateways
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddNAT}
            disabled={publicSubnets.length === 0}
          >
            Add NAT Gateway
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          {HELP_TEXT.natGateway}
        </Typography>

        {publicSubnets.length === 0 ? (
          <Alert severity="info">
            Add a public subnet first. NAT Gateways must be placed in public subnets.
          </Alert>
        ) : privateSubnets.length === 0 ? (
          <Alert severity="info">
            NAT Gateways are only needed for private subnets. Add a private subnet to use NAT.
          </Alert>
        ) : routing.natGateways.length === 0 ? (
          <Alert severity="warning">
            Private subnets exist but no NAT Gateway is configured. Instances in private subnets
            won't be able to access the internet.
          </Alert>
        ) : (
          <Box>
            {routing.natGateways.map((nat, index) => (
              <Paper key={nat.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    size="small"
                    label="Name"
                    value={nat.name}
                    onChange={(e) => handleNATChange(nat.id, 'name', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Subnet</InputLabel>
                    <Select
                      value={nat.subnetId}
                      label="Subnet"
                      onChange={(e) => handleNATChange(nat.id, 'subnetId', e.target.value)}
                    >
                      {publicSubnets.map((subnet) => (
                        <MenuItem key={subnet.id} value={subnet.id}>
                          {subnet.name} ({subnet.availabilityZone})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveNAT(nat.id)}
                    aria-label={`Remove ${nat.name}`}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}

            {/* Cost Estimate */}
            <Alert severity="info" icon={false} sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Cost Estimate:</strong> {natCostEstimate.note}
              </Typography>
            </Alert>
          </Box>
        )}
      </Paper>

      {/* Route Tables (Read-only summary) */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RouteIcon />
            <Typography variant="subtitle1" fontWeight={500}>
              Route Tables
            </Typography>
            <Chip size="small" label={`${routing.routeTables.length} tables`} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {routing.routeTables.length === 0 ? (
            <Typography color="text.secondary">
              Route tables will be auto-configured based on your subnet and gateway settings.
            </Typography>
          ) : (
            routing.routeTables.map((rt) => (
              <Paper key={rt.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2">{rt.name}</Typography>
                  {rt.isMain && <Chip size="small" label="Main" color="primary" />}
                </Box>

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Associated Subnets:{' '}
                  {rt.subnetAssociations
                    .map((sid) => subnets.find((s) => s.id === sid)?.name)
                    .filter(Boolean)
                    .join(', ') || 'None'}
                </Typography>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Destination</TableCell>
                      <TableCell>Target</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rt.routes.map((route, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {route.destinationCidr}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              route.targetType === 'local'
                                ? 'local'
                                : route.targetType === 'igw'
                                ? routing.internetGateway.name || 'Internet Gateway'
                                : routing.natGateways.find((n) => n.id === route.targetId)?.name ||
                                  'NAT Gateway'
                            }
                            color={
                              route.targetType === 'igw'
                                ? 'primary'
                                : route.targetType === 'nat'
                                ? 'secondary'
                                : 'default'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            ))
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export default RoutingConfigurationStep;
