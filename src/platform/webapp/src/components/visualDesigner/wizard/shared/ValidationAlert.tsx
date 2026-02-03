/**
 * ValidationAlert Component
 * Displays validation errors, warnings, and info messages
 */

import React from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  Typography,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Build as FixIcon,
} from '@mui/icons-material';
import { ValidationError } from '../../../../types/network';

export interface ValidationAlertProps {
  errors: ValidationError[];
  warnings?: ValidationError[];
  info?: ValidationError[];
  onFix?: (error: ValidationError) => void;
  onDismiss?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function ValidationAlert({
  errors,
  warnings = [],
  info = [],
  onFix,
  onDismiss,
  collapsible = true,
  defaultExpanded = true,
}: ValidationAlertProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasInfo = info.length > 0;
  const hasAny = hasErrors || hasWarnings || hasInfo;

  if (!hasAny) {
    return null;
  }

  const renderIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
    }
  };

  const renderList = (
    items: ValidationError[],
    severity: 'error' | 'warning' | 'info'
  ) => {
    if (items.length === 0) return null;

    return (
      <List dense sx={{ py: 0 }}>
        {items.map((item, index) => (
          <ListItem
            key={`${severity}-${index}`}
            sx={{ py: 0.5, px: 0 }}
            secondaryAction={
              item.fix && onFix ? (
                <Button
                  size="small"
                  startIcon={<FixIcon />}
                  onClick={() => onFix(item)}
                >
                  Fix
                </Button>
              ) : undefined
            }
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {renderIcon(severity)}
            </ListItemIcon>
            <ListItemText
              primary={item.message}
              secondary={item.path}
              primaryTypographyProps={{
                variant: 'body2',
                color: severity === 'error' ? 'error.main' : 'text.primary',
              }}
              secondaryTypographyProps={{
                variant: 'caption',
              }}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const mainSeverity = hasErrors ? 'error' : hasWarnings ? 'warning' : 'info';
  const totalCount = errors.length + warnings.length + info.length;

  return (
    <Alert
      severity={mainSeverity}
      onClose={onDismiss}
      sx={{ mb: 2 }}
      action={
        collapsible ? (
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        ) : undefined
      }
    >
      <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2">
          {hasErrors
            ? `${errors.length} Error${errors.length > 1 ? 's' : ''}`
            : hasWarnings
            ? `${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`
            : `${info.length} Suggestion${info.length > 1 ? 's' : ''}`}
        </Typography>
        {!collapsible && (
          <Typography variant="caption" color="text.secondary">
            ({totalCount} total)
          </Typography>
        )}
      </AlertTitle>

      <Collapse in={!collapsible || expanded}>
        <Box>
          {renderList(errors, 'error')}
          {renderList(warnings, 'warning')}
          {renderList(info, 'info')}
        </Box>
      </Collapse>

      {collapsible && !expanded && totalCount > 1 && (
        <Typography variant="caption" color="text.secondary">
          Click to expand and see all {totalCount} issues
        </Typography>
      )}
    </Alert>
  );
}

export default ValidationAlert;
