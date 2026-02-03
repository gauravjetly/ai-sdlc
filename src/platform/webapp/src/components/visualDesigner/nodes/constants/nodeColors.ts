/**
 * Node Category Color Scheme
 * Defines colors for each node category for consistent visual design
 */

import { NodeCategory } from '../types';

export interface CategoryColors {
  primary: string;
  light: string;
  dark: string;
  icon: string;
  gradient: string;
}

export const NODE_CATEGORY_COLORS: Record<NodeCategory, CategoryColors> = {
  security: {
    primary: '#E53935',
    light: '#FFCDD2',
    dark: '#B71C1C',
    icon: '#C62828',
    gradient: 'linear-gradient(135deg, #E53935 0%, #C62828 100%)',
  },
  networking: {
    primary: '#1E88E5',
    light: '#BBDEFB',
    dark: '#0D47A1',
    icon: '#1565C0',
    gradient: 'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)',
  },
  compute: {
    primary: '#FB8C00',
    light: '#FFE0B2',
    dark: '#E65100',
    icon: '#EF6C00',
    gradient: 'linear-gradient(135deg, #FB8C00 0%, #EF6C00 100%)',
  },
  storage: {
    primary: '#43A047',
    light: '#C8E6C9',
    dark: '#1B5E20',
    icon: '#2E7D32',
    gradient: 'linear-gradient(135deg, #43A047 0%, #2E7D32 100%)',
  },
  monitoring: {
    primary: '#8E24AA',
    light: '#E1BEE7',
    dark: '#4A148C',
    icon: '#6A1B9A',
    gradient: 'linear-gradient(135deg, #8E24AA 0%, #6A1B9A 100%)',
  },
};

/**
 * Node status colors
 */
export const NODE_STATUS_COLORS = {
  unconfigured: {
    color: '#9E9E9E',
    background: '#F5F5F5',
  },
  configured: {
    color: '#4CAF50',
    background: '#E8F5E9',
  },
  warning: {
    color: '#FF9800',
    background: '#FFF3E0',
  },
  error: {
    color: '#F44336',
    background: '#FFEBEE',
  },
  deployed: {
    color: '#2196F3',
    background: '#E3F2FD',
  },
};

/**
 * Default node dimensions
 */
export const NODE_DEFAULT_DIMENSIONS = {
  width: 200,
  height: 80,
  minWidth: 150,
  minHeight: 60,
  maxWidth: 400,
  maxHeight: 300,
};

/**
 * Handle colors for different connection types
 */
export const HANDLE_COLORS = {
  'vpc-attachment': '#1E88E5',
  'subnet-placement': '#42A5F5',
  'security-attachment': '#E53935',
  'iam-role': '#E53935',
  'encryption': '#FFC107',
  'target': '#FB8C00',
  'trigger': '#8E24AA',
  'notification': '#8E24AA',
  'dns-alias': '#1E88E5',
  'origin': '#1E88E5',
};
