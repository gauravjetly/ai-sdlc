/**
 * TemplateBrowser Component
 * Main template browsing interface with filters, search, and grid/list views
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  Select,
  MenuItem,
  Pagination,
  Paper,
  Drawer,
  useTheme,
  useMediaQuery,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ViewModule as GridIcon,
  ViewList as ListIcon,
  FilterAlt as FilterIcon,
  Sort as SortIcon,
} from '@mui/icons-material';
import { useTemplates } from './hooks/useTemplates';
import { useTemplateFilters } from './hooks/useTemplateFilters';
import { useTemplateSearch } from './hooks/useTemplateSearch';
import { TemplateCard, TemplateCardSkeleton } from './TemplateCard';
import { TemplateFilters } from './TemplateFilters';
import { TemplateSearch } from './TemplateSearch';
import { TemplatePreview } from './TemplatePreview';
import { TemplateEditor } from './TemplateEditor';
import type {
  TemplateBrowserProps,
  ViewMode,
  DesignTemplate,
  TemplateListParams,
} from './types/template.types';
import { SORT_OPTIONS, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './types/template.types';

// ============================================
// Helper Components
// ============================================

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 6,
        textAlign: 'center',
        bgcolor: 'grey.50',
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No templates found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {hasFilters
          ? 'Try adjusting your filters or search query'
          : 'Be the first to create a template!'}
      </Typography>
      {hasFilters && (
        <Typography
          variant="body2"
          color="primary"
          sx={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={onClearFilters}
        >
          Clear all filters
        </Typography>
      )}
    </Paper>
  );
}

// ============================================
// Main Component
// ============================================

export function TemplateBrowser({
  onApplyTemplate,
  defaultView = 'grid',
  showFilters = true,
}: TemplateBrowserProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Local UI state
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Filter and search hooks
  const {
    filters,
    sort,
    setCategories,
    toggleCategory,
    setLayerType,
    setVisibility,
    setSort,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useTemplateFilters();

  const {
    searchTerm,
    debouncedTerm,
    setSearchTerm,
    clearSearch,
    searchHistory,
    clearHistory,
    isSearching,
  } = useTemplateSearch();

  // Build query params
  const queryParams = useMemo((): TemplateListParams => {
    const params: TemplateListParams = {
      page,
      limit: pageSize,
      sort: sort.field,
      order: sort.order,
    };

    if (filters.categories.length === 1) {
      params.category = filters.categories[0];
    }
    if (filters.layerType) {
      params.layerType = filters.layerType;
    }
    if (filters.visibility) {
      params.visibility = filters.visibility;
    }
    if (debouncedTerm) {
      params.search = debouncedTerm;
    }

    return params;
  }, [page, pageSize, sort, filters, debouncedTerm]);

  // Fetch templates
  const { data, isLoading, error, isFetching } = useTemplates(queryParams);

  const templates = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;
  const total = data?.meta?.total || 0;

  // Handlers
  const handleViewChange = (_: React.MouseEvent<HTMLElement>, newView: ViewMode | null) => {
    if (newView) setViewMode(newView);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (event: any) => {
    const field = event.target.value;
    setSort({ field, order: field === 'name' ? 'asc' : 'desc' });
    setPage(1);
  };

  const handlePreview = useCallback((id: string) => {
    setPreviewId(id);
  }, []);

  const handleApply = useCallback(
    (template: DesignTemplate) => {
      onApplyTemplate?.(template);
    },
    [onApplyTemplate]
  );

  const handleClone = useCallback((id: string) => {
    // Open clone dialog
    setPreviewId(id);
  }, []);

  const handleClearAll = useCallback(() => {
    clearFilters();
    clearSearch();
    setPage(1);
  }, [clearFilters, clearSearch]);

  // Render filter sidebar
  const filterSidebar = (
    <TemplateFilters
      filters={filters}
      onChange={(newFilters) => {
        if (newFilters.categories !== filters.categories) {
          setCategories(newFilters.categories);
        }
        if (newFilters.layerType !== filters.layerType) {
          setLayerType(newFilters.layerType);
        }
        if (newFilters.visibility !== filters.visibility) {
          setVisibility(newFilters.visibility);
        }
        setPage(1);
      }}
      onClear={clearFilters}
      activeFilterCount={activeFilterCount}
    />
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
      role="main"
      aria-label="Template Browser"
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Search */}
        <Box sx={{ flex: 1 }}>
          <TemplateSearch
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            searchHistory={searchHistory}
            onClearHistory={clearHistory}
            isSearching={isSearching}
          />
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Mobile filter button */}
          {isMobile && showFilters && (
            <IconButton
              onClick={() => setFilterDrawerOpen(true)}
              color={hasActiveFilters ? 'primary' : 'default'}
              aria-label="Open filters"
            >
              <FilterIcon />
              {activeFilterCount > 0 && (
                <Chip
                  size="small"
                  label={activeFilterCount}
                  color="primary"
                  sx={{ position: 'absolute', top: -4, right: -4, height: 18, fontSize: 10 }}
                />
              )}
            </IconButton>
          )}

          {/* Sort */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={sort.field}
              onChange={handleSortChange}
              startAdornment={<SortIcon sx={{ mr: 0.5, color: 'action.active' }} />}
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* View toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewChange}
            size="small"
            aria-label="View mode"
          >
            <ToggleButton value="grid" aria-label="Grid view">
              <GridIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="List view">
              <ListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Main content area */}
      <Box sx={{ display: 'flex', flex: 1, gap: 3, minHeight: 0 }}>
        {/* Desktop filter sidebar */}
        {showFilters && !isMobile && (
          <Box sx={{ width: 280, flexShrink: 0 }}>{filterSidebar}</Box>
        )}

        {/* Templates area */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Results info */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {isLoading ? (
                <CircularProgress size={14} sx={{ mr: 1 }} />
              ) : (
                `Showing ${templates.length} of ${total} templates`
              )}
              {isFetching && !isLoading && (
                <CircularProgress size={14} sx={{ ml: 1 }} />
              )}
            </Typography>

            {/* Active filters badges */}
            {(hasActiveFilters || debouncedTerm) && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {debouncedTerm && (
                  <Chip
                    size="small"
                    label={`"${debouncedTerm}"`}
                    onDelete={clearSearch}
                  />
                )}
                {hasActiveFilters && (
                  <Chip
                    size="small"
                    label={`${activeFilterCount} filters`}
                    onDelete={clearFilters}
                  />
                )}
              </Box>
            )}
          </Box>

          {/* Error state */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load templates. Please try again.
            </Alert>
          )}

          {/* Templates grid/list */}
          {isLoading ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  viewMode === 'grid'
                    ? {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)',
                      }
                    : '1fr',
                gap: 2,
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <TemplateCardSkeleton key={i} viewMode={viewMode} />
              ))}
            </Box>
          ) : templates.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters || !!debouncedTerm}
              onClearFilters={handleClearAll}
            />
          ) : (
            <Box
              role="list"
              aria-label="Template list"
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  viewMode === 'grid'
                    ? {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)',
                      }
                    : '1fr',
                gap: 2,
              }}
            >
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  viewMode={viewMode}
                  onPreview={() => handlePreview(template.id)}
                  onApply={() => handleApply(template)}
                  onClone={() => handleClone(template.id)}
                />
              ))}
            </Box>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mt: 4,
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Mobile filter drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
        >
          <Box sx={{ width: 280, p: 2 }}>{filterSidebar}</Box>
        </Drawer>
      )}

      {/* Preview modal */}
      {previewId && (
        <TemplatePreview
          templateId={previewId}
          open={!!previewId}
          onClose={() => setPreviewId(null)}
          onApply={(mode) => {
            const template = templates.find((t) => t.id === previewId);
            if (template) handleApply(template);
          }}
          onClone={(name) => {
            // Handle clone
            setPreviewId(null);
          }}
        />
      )}

      {/* Editor modal */}
      {showEditor && (
        <TemplateEditor
          mode="create"
          onSave={(template) => {
            setShowEditor(false);
            // Refresh list
          }}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </Box>
  );
}

export default TemplateBrowser;
