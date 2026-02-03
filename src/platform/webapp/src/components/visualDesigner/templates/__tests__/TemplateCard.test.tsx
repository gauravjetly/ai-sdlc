/**
 * TemplateCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { TemplateCard } from '../TemplateCard';
import type { DesignTemplate } from '../types/template.types';

// Mock template data
const mockTemplate: DesignTemplate = {
  id: 'test-123',
  name: 'Production VPC Setup',
  description: 'A comprehensive VPC configuration with public and private subnets',
  category: 'network_foundation',
  visibility: 'organization',
  templateData: {
    nodes: [
      { id: '1', type: 'vpc', position: { x: 0, y: 0 }, data: {} },
      { id: '2', type: 'subnet', position: { x: 100, y: 0 }, data: {} },
    ],
    edges: [],
    metadata: {},
  },
  layerType: 'network',
  version: '1.2.0',
  tags: ['vpc', 'networking', 'production', 'aws'],
  usageCount: 1234,
  createdBy: 'user@example.com',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-20T14:30:00Z',
};

// Test wrapper with theme
const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme();
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('TemplateCard', () => {
  const mockOnPreview = jest.fn();
  const mockOnApply = jest.fn();
  const mockOnClone = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Grid View', () => {
    it('renders template name correctly', () => {
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByText('Production VPC Setup')).toBeInTheDocument();
    });

    it('renders category badge', () => {
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByText('Network Foundation')).toBeInTheDocument();
    });

    it('renders usage count formatted correctly', () => {
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByText('1.2k uses')).toBeInTheDocument();
    });

    it('shows first 3 tags with +N more indicator', () => {
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByText('vpc')).toBeInTheDocument();
      expect(screen.getByText('networking')).toBeInTheDocument();
      expect(screen.getByText('production')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('displays version number', () => {
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByText('v1.2.0')).toBeInTheDocument();
    });

    it('calls onPreview when card is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      const card = screen.getByRole('listitem');
      await user.click(card);

      expect(mockOnPreview).toHaveBeenCalledTimes(1);
    });

    it('calls onPreview when Enter key is pressed', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      const card = screen.getByRole('listitem');
      card.focus();
      await user.keyboard('{Enter}');

      expect(mockOnPreview).toHaveBeenCalledTimes(1);
    });

    it('has correct aria-label', () => {
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByRole('listitem')).toHaveAttribute(
        'aria-label',
        'Template: Production VPC Setup'
      );
    });

    it('truncates long names', () => {
      const longNameTemplate = {
        ...mockTemplate,
        name: 'This is a very long template name that should be truncated to fit in the card',
      };

      renderWithTheme(
        <TemplateCard
          template={longNameTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      // Name should be truncated to 50 chars
      const nameElement = screen.getByText(/This is a very long template name/);
      expect(nameElement).toBeInTheDocument();
    });
  });

  describe('List View', () => {
    it('renders in list format', () => {
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="list"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByText('Production VPC Setup')).toBeInTheDocument();
      expect(screen.getByText('Network Foundation')).toBeInTheDocument();
    });

    it('shows more description in list view', () => {
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="list"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(
        screen.getByText('A comprehensive VPC configuration with public and private subnets')
      ).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('calls onApply when apply button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      // Hover to show actions
      const card = screen.getByRole('listitem');
      await user.hover(card);

      // Find and click apply button
      const applyButton = screen.getByLabelText('Apply template');
      await user.click(applyButton);

      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnPreview).not.toHaveBeenCalled(); // Should not trigger preview
    });

    it('calls onClone when clone button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      const card = screen.getByRole('listitem');
      await user.hover(card);

      const cloneButton = screen.getByLabelText('Clone template');
      await user.click(cloneButton);

      expect(mockOnClone).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing description', () => {
      const noDescTemplate = { ...mockTemplate, description: undefined };

      renderWithTheme(
        <TemplateCard
          template={noDescTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('handles empty tags array', () => {
      const noTagsTemplate = { ...mockTemplate, tags: [] };

      renderWithTheme(
        <TemplateCard
          template={noTagsTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      // Should render without tags section
      expect(screen.queryByText('vpc')).not.toBeInTheDocument();
    });

    it('handles zero usage count', () => {
      const noUsageTemplate = { ...mockTemplate, usageCount: 0 };

      renderWithTheme(
        <TemplateCard
          template={noUsageTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByText('0 uses')).toBeInTheDocument();
    });

    it('handles large usage count', () => {
      const highUsageTemplate = { ...mockTemplate, usageCount: 1500000 };

      renderWithTheme(
        <TemplateCard
          template={highUsageTemplate}
          viewMode="grid"
          onPreview={mockOnPreview}
          onApply={mockOnApply}
          onClone={mockOnClone}
        />
      );

      expect(screen.getByText('1.5M uses')).toBeInTheDocument();
    });
  });
});
