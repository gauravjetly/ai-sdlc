/**
 * Template Utility Functions Tests
 */

import {
  truncateText,
  formatUsageCount,
  formatDate,
  formatRelativeDate,
  getCategoryColor,
  getCategoryLabel,
  countComponents,
  getComponentSummary,
  estimateMonthlyCost,
  formatCost,
  isValidTemplateName,
  isValidDescription,
  isValidTags,
  isValidThumbnailFile,
  generateNewIds,
  buildTemplateUrl,
  parseTemplateUrl,
} from '../utils/templateUtils';
import type { TemplateData } from '../types/template.types';

describe('Text Formatting', () => {
  describe('truncateText', () => {
    it('returns original text if under max length', () => {
      expect(truncateText('short text', 50)).toBe('short text');
    });

    it('truncates text at max length with ellipsis', () => {
      const result = truncateText('This is a very long text that should be truncated', 20);
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('handles empty string', () => {
      expect(truncateText('', 50)).toBe('');
    });

    it('handles exact length text', () => {
      expect(truncateText('exact', 5)).toBe('exact');
    });
  });

  describe('formatUsageCount', () => {
    it('returns number as-is for counts under 1000', () => {
      expect(formatUsageCount(0)).toBe('0');
      expect(formatUsageCount(500)).toBe('500');
      expect(formatUsageCount(999)).toBe('999');
    });

    it('formats thousands with k suffix', () => {
      expect(formatUsageCount(1000)).toBe('1.0k');
      expect(formatUsageCount(1500)).toBe('1.5k');
      expect(formatUsageCount(15000)).toBe('15.0k');
    });

    it('formats millions with M suffix', () => {
      expect(formatUsageCount(1000000)).toBe('1.0M');
      expect(formatUsageCount(2500000)).toBe('2.5M');
    });
  });

  describe('formatDate', () => {
    it('formats date in readable format', () => {
      const result = formatDate('2026-01-15T10:00:00Z');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2026');
    });
  });

  describe('formatRelativeDate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-20T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns "Today" for today', () => {
      expect(formatRelativeDate('2026-01-20T10:00:00Z')).toBe('Today');
    });

    it('returns "Yesterday" for yesterday', () => {
      expect(formatRelativeDate('2026-01-19T10:00:00Z')).toBe('Yesterday');
    });

    it('returns days ago for recent dates', () => {
      expect(formatRelativeDate('2026-01-17T10:00:00Z')).toBe('3 days ago');
    });

    it('returns weeks ago for older dates', () => {
      expect(formatRelativeDate('2026-01-06T10:00:00Z')).toBe('2 weeks ago');
    });
  });
});

describe('Category Helpers', () => {
  describe('getCategoryColor', () => {
    it('returns correct color for known categories', () => {
      expect(getCategoryColor('network_foundation')).toBe('#1976d2');
      expect(getCategoryColor('compute_platform')).toBe('#2e7d32');
      expect(getCategoryColor('security')).toBe('#d32f2f');
    });

    it('returns custom color for unknown categories', () => {
      expect(getCategoryColor('custom')).toBe('#757575');
    });
  });

  describe('getCategoryLabel', () => {
    it('returns correct label for known categories', () => {
      expect(getCategoryLabel('network_foundation')).toBe('Network Foundation');
      expect(getCategoryLabel('compute_platform')).toBe('Compute Platform');
      expect(getCategoryLabel('fullstack')).toBe('Full Stack');
    });
  });
});

describe('Template Data Helpers', () => {
  const mockTemplateData: TemplateData = {
    nodes: [
      { id: '1', type: 'vpc', position: { x: 0, y: 0 }, data: {} },
      { id: '2', type: 'vpc', position: { x: 100, y: 0 }, data: {} },
      { id: '3', type: 'subnet', position: { x: 200, y: 0 }, data: {} },
      { id: '4', type: 'ec2', position: { x: 300, y: 0 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
    ],
    metadata: {},
  };

  describe('countComponents', () => {
    it('counts components by type', () => {
      const counts = countComponents(mockTemplateData);
      expect(counts['vpc']).toBe(2);
      expect(counts['subnet']).toBe(1);
      expect(counts['ec2']).toBe(1);
    });

    it('handles empty nodes array', () => {
      const counts = countComponents({ nodes: [], edges: [], metadata: {} });
      expect(Object.keys(counts)).toHaveLength(0);
    });
  });

  describe('getComponentSummary', () => {
    it('returns formatted summary of top 3 components', () => {
      const summary = getComponentSummary(mockTemplateData);
      expect(summary).toContain('2 vpc');
      expect(summary).toContain('1 subnet');
    });

    it('returns "No components" for empty data', () => {
      expect(getComponentSummary({ nodes: [], edges: [], metadata: {} })).toBe('No components');
    });
  });

  describe('estimateMonthlyCost', () => {
    it('calculates cost based on node count', () => {
      const cost = estimateMonthlyCost(mockTemplateData);
      // Base cost (50) + 4 nodes * 15 = 110
      expect(cost).toBe(110);
    });

    it('returns base cost for empty template', () => {
      expect(estimateMonthlyCost({ nodes: [], edges: [], metadata: {} })).toBe(50);
    });
  });

  describe('formatCost', () => {
    it('formats cost with currency symbol', () => {
      expect(formatCost(100)).toBe('$100');
      expect(formatCost(1500)).toBe('$1,500');
    });
  });

  describe('generateNewIds', () => {
    it('generates new unique IDs for nodes and edges', () => {
      const result = generateNewIds(mockTemplateData);

      // Check nodes have new IDs
      result.nodes.forEach((node, index) => {
        expect(node.id).not.toBe(mockTemplateData.nodes[index].id);
        expect(node.id).toMatch(/^node_/);
      });

      // Check edges have new IDs and updated references
      result.edges.forEach((edge, index) => {
        expect(edge.id).not.toBe(mockTemplateData.edges[index].id);
        expect(edge.id).toMatch(/^edge_/);
      });
    });
  });
});

describe('Validation', () => {
  describe('isValidTemplateName', () => {
    it('returns true for valid names', () => {
      expect(isValidTemplateName('Production VPC')).toBe(true);
      expect(isValidTemplateName('my-template-123')).toBe(true);
      expect(isValidTemplateName('template_name')).toBe(true);
    });

    it('returns false for names too short', () => {
      expect(isValidTemplateName('ab')).toBe(false);
    });

    it('returns false for names too long', () => {
      expect(isValidTemplateName('a'.repeat(101))).toBe(false);
    });

    it('returns false for invalid characters', () => {
      expect(isValidTemplateName('name@with!special')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidTemplateName('')).toBe(false);
    });
  });

  describe('isValidDescription', () => {
    it('returns true for valid descriptions', () => {
      expect(isValidDescription('A short description')).toBe(true);
      expect(isValidDescription('')).toBe(true);
    });

    it('returns false for descriptions too long', () => {
      expect(isValidDescription('a'.repeat(1001))).toBe(false);
    });
  });

  describe('isValidTags', () => {
    it('returns true for valid tags array', () => {
      expect(isValidTags(['aws', 'vpc', 'networking'])).toBe(true);
    });

    it('returns false for too many tags', () => {
      expect(isValidTags(Array(11).fill('tag'))).toBe(false);
    });

    it('returns false for tags too long', () => {
      expect(isValidTags(['a'.repeat(31)])).toBe(false);
    });
  });

  describe('isValidThumbnailFile', () => {
    it('returns valid for correct file types', () => {
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      Object.defineProperty(pngFile, 'size', { value: 100 * 1024 });
      expect(isValidThumbnailFile(pngFile).valid).toBe(true);

      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(jpgFile, 'size', { value: 100 * 1024 });
      expect(isValidThumbnailFile(jpgFile).valid).toBe(true);
    });

    it('returns invalid for wrong file type', () => {
      const gifFile = new File([''], 'test.gif', { type: 'image/gif' });
      Object.defineProperty(gifFile, 'size', { value: 100 * 1024 });
      const result = isValidThumbnailFile(gifFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PNG, JPG, and WebP');
    });

    it('returns invalid for files too large', () => {
      const largeFile = new File([''], 'test.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', { value: 600 * 1024 });
      const result = isValidThumbnailFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('500KB');
    });
  });
});

describe('URL Helpers', () => {
  describe('buildTemplateUrl', () => {
    it('builds URL params from filters', () => {
      const result = buildTemplateUrl({
        category: 'network',
        search: 'vpc',
        page: 2,
      });
      expect(result).toContain('category=network');
      expect(result).toContain('search=vpc');
      expect(result).toContain('page=2');
    });

    it('ignores undefined and empty values', () => {
      const result = buildTemplateUrl({
        category: 'network',
        search: '',
        page: undefined,
      });
      expect(result).toBe('category=network');
    });

    it('handles arrays', () => {
      const result = buildTemplateUrl({
        tags: ['aws', 'vpc'],
      });
      expect(result).toContain('tags=aws');
      expect(result).toContain('tags=vpc');
    });
  });

  describe('parseTemplateUrl', () => {
    it('parses URL params', () => {
      const result = parseTemplateUrl('?category=network&search=vpc');
      expect(result.category).toBe('network');
      expect(result.search).toBe('vpc');
    });

    it('handles multiple values as array', () => {
      const result = parseTemplateUrl('?tags=aws&tags=vpc');
      expect(result.tags).toEqual(['aws', 'vpc']);
    });
  });
});
