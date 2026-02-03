/**
 * Template Filters Hook
 * Manages filter state with URL synchronization
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  TemplateFilters,
  TemplateCategory,
  TemplateVisibility,
  LayerType,
  TemplateSort,
  TemplateSortField,
  TemplateSortOrder,
} from '../types/template.types';

interface UseTemplateFiltersOptions {
  syncWithUrl?: boolean;
  defaultFilters?: Partial<TemplateFilters>;
  defaultSort?: TemplateSort;
}

interface UseTemplateFiltersResult {
  filters: TemplateFilters;
  sort: TemplateSort;
  setCategories: (categories: TemplateCategory[]) => void;
  toggleCategory: (category: TemplateCategory) => void;
  setLayerType: (layerType: LayerType | undefined) => void;
  setVisibility: (visibility: TemplateVisibility | undefined) => void;
  setSort: (sort: TemplateSort) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const DEFAULT_FILTERS: TemplateFilters = {
  categories: [],
  layerType: undefined,
  visibility: undefined,
  cloudProvider: undefined,
};

const DEFAULT_SORT: TemplateSort = {
  field: 'usageCount',
  order: 'desc',
};

/**
 * Hook for managing template filters with optional URL sync
 */
export function useTemplateFilters(
  options: UseTemplateFiltersOptions = {}
): UseTemplateFiltersResult {
  const { syncWithUrl = true, defaultFilters = {}, defaultSort = DEFAULT_SORT } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL or defaults
  const initialFilters = useMemo((): TemplateFilters => {
    if (syncWithUrl) {
      const categoriesParam = searchParams.get('categories');
      const layerTypeParam = searchParams.get('layerType') as LayerType | null;
      const visibilityParam = searchParams.get('visibility') as TemplateVisibility | null;

      return {
        categories: categoriesParam
          ? (categoriesParam.split(',') as TemplateCategory[])
          : defaultFilters.categories || [],
        layerType: layerTypeParam || defaultFilters.layerType,
        visibility: visibilityParam || defaultFilters.visibility,
        cloudProvider: defaultFilters.cloudProvider,
      };
    }
    return { ...DEFAULT_FILTERS, ...defaultFilters };
  }, [searchParams, syncWithUrl, defaultFilters]);

  // Initialize sort from URL or defaults
  const initialSort = useMemo((): TemplateSort => {
    if (syncWithUrl) {
      const sortParam = searchParams.get('sort') as TemplateSortField | null;
      const orderParam = searchParams.get('order') as TemplateSortOrder | null;

      return {
        field: sortParam || defaultSort.field,
        order: orderParam || defaultSort.order,
      };
    }
    return defaultSort;
  }, [searchParams, syncWithUrl, defaultSort]);

  const [filters, setFilters] = useState<TemplateFilters>(initialFilters);
  const [sort, setSort] = useState<TemplateSort>(initialSort);

  // Sync filters to URL
  useEffect(() => {
    if (!syncWithUrl) return;

    const newParams = new URLSearchParams(searchParams);

    // Update categories
    if (filters.categories.length > 0) {
      newParams.set('categories', filters.categories.join(','));
    } else {
      newParams.delete('categories');
    }

    // Update layer type
    if (filters.layerType) {
      newParams.set('layerType', filters.layerType);
    } else {
      newParams.delete('layerType');
    }

    // Update visibility
    if (filters.visibility) {
      newParams.set('visibility', filters.visibility);
    } else {
      newParams.delete('visibility');
    }

    // Update sort
    if (sort.field !== DEFAULT_SORT.field) {
      newParams.set('sort', sort.field);
    } else {
      newParams.delete('sort');
    }

    if (sort.order !== DEFAULT_SORT.order) {
      newParams.set('order', sort.order);
    } else {
      newParams.delete('order');
    }

    // Preserve search param if exists
    const currentSearch = searchParams.get('search');
    if (currentSearch) {
      newParams.set('search', currentSearch);
    }

    setSearchParams(newParams, { replace: true });
  }, [filters, sort, syncWithUrl, setSearchParams, searchParams]);

  // Set categories
  const setCategories = useCallback((categories: TemplateCategory[]) => {
    setFilters((prev) => ({ ...prev, categories }));
  }, []);

  // Toggle single category
  const toggleCategory = useCallback((category: TemplateCategory) => {
    setFilters((prev) => {
      const exists = prev.categories.includes(category);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== category)
          : [...prev.categories, category],
      };
    });
  }, []);

  // Set layer type
  const setLayerType = useCallback((layerType: LayerType | undefined) => {
    setFilters((prev) => ({ ...prev, layerType }));
  }, []);

  // Set visibility
  const setVisibility = useCallback((visibility: TemplateVisibility | undefined) => {
    setFilters((prev) => ({ ...prev, visibility }));
  }, []);

  // Set sort
  const handleSetSort = useCallback((newSort: TemplateSort) => {
    setSort(newSort);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = filters.categories.length;
    if (filters.layerType) count++;
    if (filters.visibility) count++;
    if (filters.cloudProvider) count++;
    return count;
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = activeFilterCount > 0;

  return {
    filters,
    sort,
    setCategories,
    toggleCategory,
    setLayerType,
    setVisibility,
    setSort: handleSetSort,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}

export default useTemplateFilters;
