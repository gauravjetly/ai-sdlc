/**
 * FormField Component
 * Reusable form field wrapper with label, help text, and error display
 */

import React, { ReactNode } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  FormHelperText,
} from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  warning?: string;
  children: ReactNode;
  fullWidth?: boolean;
  sx?: object;
}

export function FormField({
  label,
  htmlFor,
  required = false,
  helpText,
  error,
  warning,
  children,
  fullWidth = true,
  sx,
}: FormFieldProps) {
  const id = htmlFor || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <Box
      sx={{
        mb: 2,
        width: fullWidth ? '100%' : 'auto',
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 0.5,
        }}
      >
        <Typography
          component="label"
          htmlFor={id}
          variant="body2"
          fontWeight={500}
          sx={{ color: error ? 'error.main' : 'text.primary' }}
        >
          {label}
          {required && (
            <Typography
              component="span"
              color="error"
              sx={{ ml: 0.5 }}
              aria-hidden="true"
            >
              *
            </Typography>
          )}
        </Typography>
        {helpText && (
          <Tooltip title={helpText} placement="top" arrow>
            <IconButton
              size="small"
              sx={{ ml: 0.5, p: 0.25 }}
              aria-label={`Help: ${helpText}`}
            >
              <HelpIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {children}

      {error && (
        <FormHelperText
          error
          id={`${id}-error`}
          role="alert"
          sx={{ mt: 0.5, mx: 0 }}
        >
          {error}
        </FormHelperText>
      )}

      {warning && !error && (
        <FormHelperText
          id={`${id}-warning`}
          sx={{ mt: 0.5, mx: 0, color: 'warning.main' }}
        >
          {warning}
        </FormHelperText>
      )}
    </Box>
  );
}

export default FormField;
