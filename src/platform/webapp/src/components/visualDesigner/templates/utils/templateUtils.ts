/**
 * Template Utility Functions
 * Helper functions for template operations
 */

import type {
  DesignTemplate,
  TemplateCategory,
  TemplateVisibility,
  LayerType,
  TemplateData,
  TEMPLATE_CATEGORIES,
} from '../types/template.types';

// ============================================
// Category Helpers
// ============================================

export const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  network_foundation: '#1976d2',
  compute_platform: '#2e7d32',
  storage_database: '#9c27b0',
  security: '#d32f2f',
  monitoring: '#f57c00',
  fullstack: '#0097a7',
  custom: '#757575',
};

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  network_foundation: 'Network Foundation',
  compute_platform: 'Compute Platform',
  storage_database: 'Storage & Database',
  security: 'Security',
  monitoring: 'Monitoring',
  fullstack: 'Full Stack',
  custom: 'Custom',
};

export const CATEGORY_ICONS: Record<TemplateCategory, string> = {
  network_foundation: 'Hub',
  compute_platform: 'Memory',
  storage_database: 'Storage',
  security: 'Security',
  monitoring: 'Monitoring',
  fullstack: 'Layers',
  custom: 'Extension',
};

export function getCategoryColor(category: TemplateCategory): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.custom;
}

export function getCategoryLabel(category: TemplateCategory): string {
  return CATEGORY_LABELS[category] || 'Unknown';
}

// ============================================
// Visibility Helpers
// ============================================

export const VISIBILITY_ICONS: Record<TemplateVisibility, string> = {
  private: 'Lock',
  organization: 'Business',
  public: 'Public',
};

export const VISIBILITY_LABELS: Record<TemplateVisibility, string> = {
  private: 'Private',
  organization: 'Organization',
  public: 'Public',
};

export function getVisibilityIcon(visibility: TemplateVisibility): string {
  return VISIBILITY_ICONS[visibility];
}

// ============================================
// Layer Type Helpers
// ============================================

export const LAYER_COLORS: Record<LayerType, string> = {
  network: '#1976d2',
  platform: '#2e7d32',
  devops: '#f57c00',
  fullstack: '#0097a7',
};

export const LAYER_LABELS: Record<LayerType, string> = {
  network: 'Network',
  platform: 'Platform',
  devops: 'DevOps',
  fullstack: 'Full Stack',
};

// ============================================
// Text Formatting
// ============================================

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function formatUsageCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================
// Template Data Helpers
// ============================================

export function countComponents(templateData: TemplateData): Record<string, number> {
  const counts: Record<string, number> = {};

  templateData.nodes.forEach((node) => {
    const type = node.type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  });

  return counts;
}

export function getComponentSummary(templateData: TemplateData): string {
  const counts = countComponents(templateData);
  const entries = Object.entries(counts);

  if (entries.length === 0) return 'No components';

  const summary = entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  const remaining = entries.length - 3;
  if (remaining > 0) {
    return `${summary}, +${remaining} more`;
  }

  return summary;
}

export function getTotalNodeCount(templateData: TemplateData): number {
  return templateData.nodes.length;
}

export function getTotalEdgeCount(templateData: TemplateData): number {
  return templateData.edges.length;
}

// ============================================
// Template Validation
// ============================================

export function isValidTemplateName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 100) return false;
  return /^[a-zA-Z0-9\s\-_]+$/.test(name);
}

export function isValidDescription(description: string): boolean {
  return description.length <= 1000;
}

export function isValidTags(tags: string[]): boolean {
  if (tags.length > 10) return false;
  return tags.every((tag) => tag.length <= 30);
}

// ============================================
// URL Helpers
// ============================================

export function buildTemplateUrl(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, String(v)));
      } else {
        params.set(key, String(value));
      }
    }
  });

  return params.toString();
}

export function parseTemplateUrl(search: string): Record<string, string | string[]> {
  const params = new URLSearchParams(search);
  const result: Record<string, string | string[]> = {};

  params.forEach((value, key) => {
    if (result[key]) {
      if (Array.isArray(result[key])) {
        (result[key] as string[]).push(value);
      } else {
        result[key] = [result[key] as string, value];
      }
    } else {
      result[key] = value;
    }
  });

  return result;
}

// ============================================
// Template Generation
// ============================================

export function generateNewIds(templateData: TemplateData): TemplateData {
  const idMap = new Map<string, string>();

  // Generate new IDs for nodes
  const newNodes = templateData.nodes.map((node) => {
    const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    idMap.set(node.id, newId);
    return { ...node, id: newId };
  });

  // Update edge references
  const newEdges = templateData.edges.map((edge) => {
    const newId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      ...edge,
      id: newId,
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    };
  });

  return {
    ...templateData,
    nodes: newNodes,
    edges: newEdges,
  };
}

// ============================================
// Cost Estimation (Placeholder)
// ============================================

export function estimateMonthlyCost(templateData: TemplateData): number {
  // Simplified cost estimation based on component count
  // In production, this would use actual pricing data
  const nodeCount = templateData.nodes.length;
  const baseCost = 50; // Base cost for any template
  const perNodeCost = 15; // Average cost per component

  return baseCost + (nodeCount * perNodeCost);
}

export function formatCost(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// Thumbnail Helpers
// ============================================

export function getDefaultThumbnail(category: TemplateCategory): string {
  // Return a placeholder based on category
  return `/thumbnails/default-${category}.png`;
}

export function isValidThumbnailFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
  const maxSize = 500 * 1024; // 500KB

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Only PNG, JPG, and WebP formats are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File must be less than 500KB' };
  }

  return { valid: true };
}
