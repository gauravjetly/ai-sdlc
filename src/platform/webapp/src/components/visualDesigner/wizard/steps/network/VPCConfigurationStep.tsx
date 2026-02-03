/**
 * VPCConfigurationStep Component
 * Step 1 of Network Wizard - Configure VPC settings
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import {
  VPCConfig,
  ValidationError,
  DEFAULT_VPC_CONFIG,
} from '../../../../../types/network';
import { FormField, CIDRInput, TagsEditor } from '../../shared';
import { useNetworkValidation } from '../../hooks';
import { HELP_TEXT } from '../../utils/constants';

export interface VPCConfigurationStepProps {
  vpc: VPCConfig;
  onChange: (vpc: VPCConfig) => void;
  errors: ValidationError[];
  onValidate?: (errors: ValidationError[]) => void;
}

export function VPCConfigurationStep({
  vpc,
  onChange,
  errors,
  onValidate,
}: VPCConfigurationStepProps) {
  const { validateVPCConfig } = useNetworkValidation();
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Get error for specific field
  const getFieldError = useCallback(
    (field: string): string | undefined => {
      if (!touched[field]) return undefined;
      const fieldErrors = errors.filter((e) => e.path === `vpc.${field}`);
      return fieldErrors.length > 0 ? fieldErrors[0].message : undefined;
    },
    [errors, touched]
  );

  // Handle field blur for validation
  const handleBlur = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      if (onValidate) {
        const validationErrors = validateVPCConfig(vpc);
        onValidate(validationErrors);
      }
    },
    [vpc, onValidate, validateVPCConfig]
  );

  // Handle name change
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...vpc, name: e.target.value });
    },
    [vpc, onChange]
  );

  // Handle CIDR change
  const handleCIDRChange = useCallback(
    (cidrBlock: string) => {
      onChange({ ...vpc, cidrBlock });
    },
    [vpc, onChange]
  );

  // Handle DNS support toggle
  const handleDnsSupportChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const enableDnsSupport = e.target.checked;
      onChange({
        ...vpc,
        enableDnsSupport,
        // DNS hostnames requires DNS support
        enableDnsHostnames: enableDnsSupport ? vpc.enableDnsHostnames : false,
      });
    },
    [vpc, onChange]
  );

  // Handle DNS hostnames toggle
  const handleDnsHostnamesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...vpc, enableDnsHostnames: e.target.checked });
    },
    [vpc, onChange]
  );

  // Handle IPv6 toggle
  const handleIpv6Change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...vpc, enableIpv6: e.target.checked });
    },
    [vpc, onChange]
  );

  // Handle tags change
  const handleTagsChange = useCallback(
    (tags: VPCConfig['tags']) => {
      onChange({ ...vpc, tags });
    },
    [vpc, onChange]
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        VPC Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure your Virtual Private Cloud (VPC) settings. The VPC is the foundation
        of your network infrastructure in AWS.
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        {/* VPC Name */}
        <FormField
          label="VPC Name"
          htmlFor="vpc-name"
          required
          helpText="A unique name for your VPC. Use lowercase letters, numbers, and hyphens."
          error={getFieldError('name')}
        >
          <TextField
            id="vpc-name"
            size="small"
            fullWidth
            value={vpc.name}
            onChange={handleNameChange}
            onBlur={() => handleBlur('name')}
            placeholder="e.g., production-vpc"
            error={!!getFieldError('name')}
            inputProps={{
              'aria-required': true,
              'aria-invalid': !!getFieldError('name'),
              'aria-describedby': getFieldError('name') ? 'vpc-name-error' : undefined,
            }}
          />
        </FormField>

        {/* CIDR Block */}
        <CIDRInput
          label="IPv4 CIDR Block"
          value={vpc.cidrBlock}
          onChange={handleCIDRChange}
          error={getFieldError('cidrBlock')}
          helpText={HELP_TEXT.vpcCidr}
          required
        />

        <Divider sx={{ my: 2 }} />

        {/* DNS Options */}
        <Typography variant="subtitle2" gutterBottom>
          DNS Settings
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={vpc.enableDnsSupport}
                onChange={handleDnsSupportChange}
                inputProps={{ 'aria-label': 'Enable DNS resolution' }}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Enable DNS resolution</Typography>
                <Typography variant="caption" color="text.secondary">
                  {HELP_TEXT.enableDnsSupport}
                </Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={vpc.enableDnsHostnames}
                onChange={handleDnsHostnamesChange}
                disabled={!vpc.enableDnsSupport}
                inputProps={{ 'aria-label': 'Enable DNS hostnames' }}
              />
            }
            label={
              <Box>
                <Typography
                  variant="body2"
                  color={!vpc.enableDnsSupport ? 'text.disabled' : 'text.primary'}
                >
                  Enable DNS hostnames
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {HELP_TEXT.enableDnsHostnames}
                </Typography>
              </Box>
            }
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* IPv6 Option */}
        <Typography variant="subtitle2" gutterBottom>
          IPv6 Settings (Optional)
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={vpc.enableIpv6}
              onChange={handleIpv6Change}
              inputProps={{ 'aria-label': 'Enable IPv6' }}
            />
          }
          label={
            <Box>
              <Typography variant="body2">Request IPv6 CIDR block</Typography>
              <Typography variant="caption" color="text.secondary">
                Amazon will assign an IPv6 CIDR block to your VPC
              </Typography>
            </Box>
          }
        />

        {vpc.enableIpv6 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            An Amazon-provided IPv6 CIDR block will be automatically assigned to your VPC.
          </Alert>
        )}
      </Paper>

      {/* Tags */}
      <Paper sx={{ p: 2 }}>
        <TagsEditor tags={vpc.tags} onChange={handleTagsChange} />
      </Paper>
    </Box>
  );
}

export default VPCConfigurationStep;
