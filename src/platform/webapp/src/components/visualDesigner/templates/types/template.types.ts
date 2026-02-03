/**
 * Template System Type Definitions
 * Mirrors backend Prisma models with frontend extensions
 */

import type { Node, Edge } from 'reactflow';

// ============================================
// Enums
// ============================================

export type TemplateCategory =
  | 'network_foundation'
  | 'compute_platform'
  | 'storage_database'
  | 'security'
  | 'monitoring'
  | 'fullstack'
  | 'custom';

export type TemplateVisibility = 'private' | 'organization' | 'public';

export type LayerType = 'network' | 'platform' | 'devops' | 'fullstack';

export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'multi';

// ============================================
// Core Types
// ============================================

export interface TemplateData {
  nodes: Node[];
  edges: Edge[];
  metadata: Record<string, unknown>;
}

export interface DesignTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  visibility: TemplateVisibility;
  templateData: TemplateData;
  layerType?: LayerType;
  thumbnail?: string;
  version: string;
  tags: string[];
  usageCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: string;
  templateData: TemplateData;
  changeLog?: string;
  createdAt: string;
}

// ============================================
// Filter & Sort Types
// ============================================

export interface TemplateFilters {
  categories: TemplateCategory[];
  layerType?: LayerType;
  visibility?: TemplateVisibility;
  cloudProvider?: CloudProvider;
}

export type TemplateSortField = 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
export type TemplateSortOrder = 'asc' | 'desc';

export interface TemplateSort {
  field: TemplateSortField;
  order: TemplateSortOrder;
}

// ============================================
// Pagination Types
// ============================================

export interface TemplatePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface TemplateListParams {
  category?: TemplateCategory;
  layerType?: LayerType;
  visibility?: TemplateVisibility;
  search?: string;
  page?: number;
  limit?: number;
  sort?: TemplateSortField;
  order?: TemplateSortOrder;
}

export interface TemplateListResponse {
  success: boolean;
  data: DesignTemplate[];
  meta: TemplatePagination;
}

export interface TemplateResponse {
  success: boolean;
  data: DesignTemplate;
}

export interface TemplateVersionsResponse {
  success: boolean;
  data: TemplateVersion[];
}

// ============================================
// DTO Types
// ============================================

export interface CreateTemplateDTO {
  name: string;
  description?: string;
  category: TemplateCategory;
  layerType?: LayerType;
  visibility?: TemplateVisibility;
  tags?: string[];
  templateData: TemplateData;
}

export interface UpdateTemplateDTO {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  layerType?: LayerType;
  visibility?: TemplateVisibility;
  tags?: string[];
  thumbnail?: string;
}

export interface CloneTemplateDTO {
  name: string;
  visibility?: TemplateVisibility;
}

// ============================================
// UI State Types
// ============================================

export type ViewMode = 'grid' | 'list';

export interface TemplateCardActions {
  onPreview: (id: string) => void;
  onApply: (template: DesignTemplate) => void;
  onClone: (id: string) => void;
}

export interface TemplatePreviewState {
  isOpen: boolean;
  templateId: string | null;
  activeTab: 'overview' | 'components' | 'versions';
}

export interface TemplateEditorState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  templateId: string | null;
}

// ============================================
// Error Types
// ============================================

export interface TemplateError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

// ============================================
// Component Props Types
// ============================================

export interface TemplateBrowserProps {
  onApplyTemplate?: (template: DesignTemplate) => void;
  defaultView?: ViewMode;
  showFilters?: boolean;
}

export interface TemplateCardProps {
  template: DesignTemplate;
  viewMode: ViewMode;
  onPreview: () => void;
  onApply: () => void;
  onClone: () => void;
}

export interface TemplatePreviewProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
  onApply: (mode: 'new' | 'current') => void;
  onClone: (name: string) => void;
}

export interface TemplateEditorProps {
  mode: 'create' | 'edit';
  templateId?: string;
  initialData?: Partial<CreateTemplateDTO>;
  onSave: (template: DesignTemplate) => void;
  onCancel: () => void;
}

export interface TemplateFiltersProps {
  filters: TemplateFilters;
  onChange: (filters: TemplateFilters) => void;
  onClear: () => void;
}

export interface TemplateSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface TemplateGalleryProps {
  onSelectTemplate: (template: DesignTemplate) => void;
}

// ============================================
// Constants
// ============================================

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string; color: string }[] = [
  { value: 'network_foundation', label: 'Network Foundation', color: '#1976d2' },
  { value: 'compute_platform', label: 'Compute Platform', color: '#2e7d32' },
  { value: 'storage_database', label: 'Storage & Database', color: '#9c27b0' },
  { value: 'security', label: 'Security', color: '#d32f2f' },
  { value: 'monitoring', label: 'Monitoring', color: '#f57c00' },
  { value: 'fullstack', label: 'Full Stack', color: '#0097a7' },
  { value: 'custom', label: 'Custom', color: '#757575' },
];

export const LAYER_TYPES: { value: LayerType; label: string }[] = [
  { value: 'network', label: 'Network' },
  { value: 'platform', label: 'Platform' },
  { value: 'devops', label: 'DevOps' },
  { value: 'fullstack', label: 'Full Stack' },
];

export const VISIBILITY_OPTIONS: { value: TemplateVisibility; label: string; icon: string }[] = [
  { value: 'private', label: 'Private', icon: 'Lock' },
  { value: 'organization', label: 'Organization', icon: 'Business' },
  { value: 'public', label: 'Public', icon: 'Public' },
];

export const SORT_OPTIONS: { value: TemplateSortField; label: string }[] = [
  { value: 'usageCount', label: 'Most Used' },
  { value: 'createdAt', label: 'Newest' },
  { value: 'updatedAt', label: 'Recently Updated' },
  { value: 'name', label: 'Name (A-Z)' },
];

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];
