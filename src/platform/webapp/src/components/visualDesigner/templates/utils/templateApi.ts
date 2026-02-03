/**
 * Template API Service
 * Handles all HTTP communication with template endpoints
 */

import axios from 'axios';
import type {
  DesignTemplate,
  TemplateListParams,
  TemplateListResponse,
  TemplateResponse,
  TemplateVersionsResponse,
  CreateTemplateDTO,
  UpdateTemplateDTO,
  CloneTemplateDTO,
  TemplateVersion,
  TemplateError,
} from '../types/template.types';

const API_BASE = 'http://localhost:3000/api/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('catalyst_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const templateError = handleApiError(error);
    return Promise.reject(templateError);
  }
);

/**
 * Convert API errors to consistent TemplateError format
 */
function handleApiError(error: unknown): TemplateError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message;

    switch (status) {
      case 401:
        return { code: 'UNAUTHORIZED', message: message || 'Please log in to continue' };
      case 403:
        return { code: 'FORBIDDEN', message: message || 'You do not have permission' };
      case 404:
        return { code: 'NOT_FOUND', message: message || 'Template not found' };
      case 422:
        return {
          code: 'VALIDATION',
          message: message || 'Invalid data provided',
          details: error.response?.data?.error?.details,
        };
      case 429:
        return { code: 'RATE_LIMITED', message: message || 'Too many requests, please wait' };
      default:
        return { code: 'SERVER_ERROR', message: message || 'Something went wrong' };
    }
  }
  return { code: 'UNKNOWN', message: 'An unexpected error occurred' };
}

/**
 * Template API methods
 */
export const templateApi = {
  /**
   * List templates with filtering, pagination, and sorting
   */
  async list(params: TemplateListParams = {}): Promise<TemplateListResponse> {
    // Clean up undefined params
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    );

    const response = await apiClient.get<TemplateListResponse>('/templates', {
      params: cleanParams
    });
    return response.data;
  },

  /**
   * Get single template by ID
   */
  async get(id: string): Promise<DesignTemplate> {
    const response = await apiClient.get<TemplateResponse>(`/templates/${id}`);
    return response.data.data;
  },

  /**
   * Create new template
   */
  async create(data: CreateTemplateDTO): Promise<DesignTemplate> {
    const response = await apiClient.post<TemplateResponse>('/templates', data);
    return response.data.data;
  },

  /**
   * Update existing template
   */
  async update(id: string, data: UpdateTemplateDTO): Promise<DesignTemplate> {
    const response = await apiClient.put<TemplateResponse>(`/templates/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/templates/${id}`);
  },

  /**
   * Get template version history
   */
  async getVersions(id: string): Promise<TemplateVersion[]> {
    const response = await apiClient.get<TemplateVersionsResponse>(`/templates/${id}/versions`);
    return response.data.data;
  },

  /**
   * Clone template
   */
  async clone(id: string, data: CloneTemplateDTO): Promise<DesignTemplate> {
    const response = await apiClient.post<TemplateResponse>(`/templates/${id}/clone`, data);
    return response.data.data;
  },

  /**
   * Increment usage count (called when template is applied)
   */
  async incrementUsage(id: string): Promise<void> {
    await apiClient.post(`/templates/${id}/use`);
  },

  /**
   * Upload thumbnail (future endpoint)
   */
  async uploadThumbnail(id: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('thumbnail', file);

    const response = await apiClient.post<{ data: { url: string } }>(
      `/templates/${id}/thumbnail`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data.url;
  },
};

export default templateApi;
