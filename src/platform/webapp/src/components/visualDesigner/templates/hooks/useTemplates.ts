/**
 * Template Hooks using React Query
 * Manages server state for templates with caching
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { templateApi } from '../utils/templateApi';
import type {
  DesignTemplate,
  TemplateListParams,
  TemplateListResponse,
  TemplateVersion,
  CreateTemplateDTO,
  UpdateTemplateDTO,
  CloneTemplateDTO,
} from '../types/template.types';

// ============================================
// Query Keys
// ============================================

export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (params: TemplateListParams) => [...templateKeys.lists(), params] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
  versions: (id: string) => [...templateKeys.detail(id), 'versions'] as const,
};

// ============================================
// List Hook
// ============================================

/**
 * Hook for fetching template list with caching and pagination
 */
export function useTemplates(
  params: TemplateListParams = {},
  options?: Omit<UseQueryOptions<TemplateListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => templateApi.list(params),
    staleTime: 30 * 1000, // 30 seconds
    keepPreviousData: true, // Smooth pagination
    ...options,
  });
}

// ============================================
// Single Template Hook
// ============================================

/**
 * Hook for fetching single template
 */
export function useTemplate(
  id: string,
  options?: Omit<UseQueryOptions<DesignTemplate>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templateApi.get(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

// ============================================
// Versions Hook
// ============================================

/**
 * Hook for fetching template versions
 */
export function useTemplateVersions(
  id: string,
  options?: Omit<UseQueryOptions<TemplateVersion[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: templateKeys.versions(id),
    queryFn: () => templateApi.getVersions(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook for template mutations (create, update, delete, clone)
 */
export function useTemplateMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateTemplateDTO) => templateApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateDTO }) =>
      templateApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templateApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloneTemplateDTO }) =>
      templateApi.clone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    clone: cloneMutation,
    isLoading:
      createMutation.isLoading ||
      updateMutation.isLoading ||
      deleteMutation.isLoading ||
      cloneMutation.isLoading,
  };
}

// ============================================
// Prefetch Functions
// ============================================

/**
 * Prefetch template for preview
 */
export function usePrefetchTemplate() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: templateKeys.detail(id),
      queryFn: () => templateApi.get(id),
      staleTime: 60 * 1000,
    });
  };
}

// ============================================
// Export
// ============================================

export default {
  useTemplates,
  useTemplate,
  useTemplateVersions,
  useTemplateMutations,
  usePrefetchTemplate,
  templateKeys,
};
