/**
 * CIDRInput Component
 * CIDR input with validation and IP count display
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { FormField } from './FormField';
import { useCIDRCalculator } from '../hooks';
import { PRESET_CIDR_BLOCKS } from '../../../../types/network';

export interface CIDRInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  showPresets?: boolean;
  presets?: Array<{ value: string; label: string }>;
  isSubnet?: boolean;
  placeholder?: string;
}

export function CIDRInput({
  label,
  value,
  onChange,
  error,
  helpText,
  required = false,
  disabled = false,
  showPresets = true,
  presets = PRESET_CIDR_BLOCKS,
  isSubnet = false,
  placeholder = '10.0.0.0/16',
}: CIDRInputProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>(
    presets.some((p) => p.value === value) ? 'preset' : 'custom'
  );
  const { getCIDRInfo } = useCIDRCalculator();

  // Update mode when value changes externally
  useEffect(() => {
    if (presets.some((p) => p.value === value)) {
      setMode('preset');
    } else if (value && mode === 'preset') {
      setMode('custom');
    }
  }, [value, presets, mode]);

  const handleModeChange = (event: SelectChangeEvent<'preset' | 'custom'>) => {
    const newMode = event.target.value as 'preset' | 'custom';
    setMode(newMode);
    if (newMode === 'preset' && presets.length > 0) {
      onChange(presets[0].value);
    }
  };

  const handlePresetChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  const handleCustomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const cidrInfo = value ? getCIDRInfo(value, isSubnet) : null;

  return (
    <FormField
      label={label}
      required={required}
      helpText={helpText}
      error={error}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {showPresets && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id={`${label}-mode-label`}>Type</InputLabel>
            <Select
              labelId={`${label}-mode-label`}
              value={mode}
              label="Type"
              onChange={handleModeChange}
              disabled={disabled}
            >
              <MenuItem value="preset">Preset</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
        )}

        {mode === 'preset' && showPresets ? (
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel id={`${label}-preset-label`}>CIDR Block</InputLabel>
            <Select
              labelId={`${label}-preset-label`}
              value={value}
              label="CIDR Block"
              onChange={handlePresetChange}
              disabled={disabled}
              error={!!error}
            >
              {presets.map((preset) => (
                <MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <TextField
            size="small"
            value={value}
            onChange={handleCustomChange}
            placeholder={placeholder}
            disabled={disabled}
            error={!!error}
            sx={{ flex: 1 }}
            inputProps={{
              'aria-label': label,
              'aria-describedby': error ? `${label}-error` : undefined,
            }}
          />
        )}
      </Box>

      {cidrInfo && !error && (
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`${cidrInfo.availableIPs.toLocaleString()} available IPs`}
            color="primary"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Range: ${cidrInfo.networkAddress} - ${cidrInfo.broadcastAddress}`}
            variant="outlined"
          />
        </Box>
      )}
    </FormField>
  );
}

export default CIDRInput;
