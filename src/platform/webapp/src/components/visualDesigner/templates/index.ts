/**
 * Template System Barrel Export
 * Infrastructure Designer Template Components
 */

// Main Components
export { TemplateBrowser } from './TemplateBrowser';
export { TemplateCard, TemplateCardSkeleton } from './TemplateCard';
export { TemplatePreview } from './TemplatePreview';
export { TemplateEditor } from './TemplateEditor';
export { TemplateGallery } from './TemplateGallery';
export { TemplateFilters } from './TemplateFilters';
export { TemplateSearch } from './TemplateSearch';

// Hooks
export {
  useTemplates,
  useTemplate,
  useTemplateVersions,
  useTemplateMutations,
  usePrefetchTemplate,
  templateKeys,
} from './hooks';
export { useTemplateFilters } from './hooks/useTemplateFilters';
export { useTemplateSearch } from './hooks/useTemplateSearch';

// Types
export type {
  DesignTemplate,
  TemplateData,
  TemplateVersion,
  TemplateCategory,
  TemplateVisibility,
  LayerType,
  TemplateFilters as TemplateFiltersType,
  TemplateSort,
  TemplatePagination,
  TemplateListParams,
  TemplateListResponse,
  CreateTemplateDTO,
  UpdateTemplateDTO,
  CloneTemplateDTO,
  ViewMode,
  TemplateBrowserProps,
  TemplateCardProps,
  TemplatePreviewProps,
  TemplateEditorProps,
  TemplateFiltersProps,
  TemplateSearchProps,
  TemplateGalleryProps,
} from './types/template.types';

// Constants
export {
  TEMPLATE_CATEGORIES,
  LAYER_TYPES,
  VISIBILITY_OPTIONS,
  SORT_OPTIONS,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from './types/template.types';

// Utilities
export {
  getCategoryColor,
  getCategoryLabel,
  getVisibilityIcon,
  truncateText,
  formatUsageCount,
  formatDate,
  formatRelativeDate,
  countComponents,
  getComponentSummary,
  estimateMonthlyCost,
  formatCost,
  generateNewIds,
  isValidTemplateName,
  isValidDescription,
  isValidThumbnailFile,
  buildTemplateUrl,
  parseTemplateUrl,
} from './utils/templateUtils';

// API
export { templateApi } from './utils/templateApi';
