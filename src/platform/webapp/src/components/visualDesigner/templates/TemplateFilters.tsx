/**
 * TemplateFilters Component
 * Filter sidebar for template browsing
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Divider,
  Button,
  Chip,
  Collapse,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  FilterAlt as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import type {
  TemplateFilters as TemplateFiltersType,
  TemplateCategory,
  TemplateVisibility,
  LayerType,
} from './types/template.types';
import { TEMPLATE_CATEGORIES, LAYER_TYPES, VISIBILITY_OPTIONS } from './types/template.types';
import { getCategoryColor } from './utils/templateUtils';

interface TemplateFiltersProps {
  filters: TemplateFiltersType;
  onChange: (filters: TemplateFiltersType) => void;
  onClear: () => void;
  activeFilterCount: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function FilterSection({ title, children, defaultExpanded = true }: FilterSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          py: 1,
        }}
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          {title}
        </Typography>
        <IconButton size="small" aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <CollapseIcon /> : <ExpandIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ pb: 2 }}>{children}</Box>
      </Collapse>
      <Divider />
    </Box>
  );
}

export function TemplateFilters({
  filters,
  onChange,
  onClear,
  activeFilterCount,
  collapsed = false,
  onToggleCollapse,
}: TemplateFiltersProps) {
  const theme = useTheme();

  const handleCategoryChange = (category: TemplateCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onChange({ ...filters, categories: newCategories });
  };

  const handleLayerTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as LayerType | '';
    onChange({ ...filters, layerType: value || undefined });
  };

  const handleVisibilityChange = (visibility: TemplateVisibility) => {
    const newVisibility = filters.visibility === visibility ? undefined : visibility;
    onChange({ ...filters, visibility: newVisibility });
  };

  if (collapsed) {
    return (
      <Paper
        sx={{
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
        aria-label="Filter panel collapsed"
      >
        <IconButton
          onClick={onToggleCollapse}
          aria-label="Expand filters"
          color={activeFilterCount > 0 ? 'primary' : 'default'}
        >
          <FilterIcon />
        </IconButton>
        {activeFilterCount > 0 && (
          <Chip size="small" label={activeFilterCount} color="primary" />
        )}
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 2,
        minWidth: 240,
        maxWidth: 280,
      }}
      role="navigation"
      aria-label="Template filters"
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Filters
          </Typography>
          {activeFilterCount > 0 && (
            <Chip size="small" label={activeFilterCount} color="primary" />
          )}
        </Box>
        {onToggleCollapse && (
          <IconButton size="small" onClick={onToggleCollapse} aria-label="Collapse filters">
            <CollapseIcon />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Category Filter */}
      <FilterSection title="Category">
        <FormGroup>
          {TEMPLATE_CATEGORIES.map(({ value, label, color }) => (
            <FormControlLabel
              key={value}
              control={
                <Checkbox
                  checked={filters.categories.includes(value)}
                  onChange={() => handleCategoryChange(value)}
                  size="small"
                  sx={{
                    color: color,
                    '&.Mui-checked': { color: color },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: color,
                    }}
                  />
                  {label}
                </Typography>
              }
              sx={{ mx: 0, '&:hover': { bgcolor: 'action.hover' } }}
            />
          ))}
        </FormGroup>
      </FilterSection>

      {/* Layer Type Filter */}
      <FilterSection title="Layer Type">
        <RadioGroup
          value={filters.layerType || ''}
          onChange={handleLayerTypeChange}
        >
          <FormControlLabel
            value=""
            control={<Radio size="small" />}
            label={<Typography variant="body2">All Layers</Typography>}
            sx={{ mx: 0 }}
          />
          {LAYER_TYPES.map(({ value, label }) => (
            <FormControlLabel
              key={value}
              value={value}
              control={<Radio size="small" />}
              label={<Typography variant="body2">{label}</Typography>}
              sx={{ mx: 0 }}
            />
          ))}
        </RadioGroup>
      </FilterSection>

      {/* Visibility Filter */}
      <FilterSection title="Visibility">
        <FormGroup>
          {VISIBILITY_OPTIONS.map(({ value, label }) => (
            <FormControlLabel
              key={value}
              control={
                <Checkbox
                  checked={filters.visibility === value}
                  onChange={() => handleVisibilityChange(value)}
                  size="small"
                />
              }
              label={<Typography variant="body2">{label}</Typography>}
              sx={{ mx: 0 }}
            />
          ))}
        </FormGroup>
      </FilterSection>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={onClear}
          sx={{ mt: 2 }}
          aria-label="Clear all filters"
        >
          Clear All Filters
        </Button>
      )}
    </Paper>
  );
}

export default TemplateFilters;
