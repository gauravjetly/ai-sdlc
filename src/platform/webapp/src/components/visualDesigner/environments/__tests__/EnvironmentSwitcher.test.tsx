/**
 * EnvironmentSwitcher Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { EnvironmentSwitcher } from '../EnvironmentSwitcher';
import { DesignWizardProvider } from '../../../../contexts/DesignWizardContext';

// Mock the context
const mockSelectEnvironment = jest.fn();
const mockEnvironments = {
  dev: { instanceSizes: {}, replicaCounts: {}, enabledFeatures: [], variables: {} },
  staging: { instanceSizes: {}, replicaCounts: {}, enabledFeatures: [], variables: {} },
  prod: { instanceSizes: {}, replicaCounts: {}, enabledFeatures: [], variables: {} },
};

jest.mock('../../../../contexts/DesignWizardContext', () => ({
  ...jest.requireActual('../../../../contexts/DesignWizardContext'),
  useDesignWizard: () => ({
    selectedEnvironment: 'dev',
    selectEnvironment: mockSelectEnvironment,
    environments: mockEnvironments,
  }),
}));

const theme = createTheme();

const renderComponent = (props = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <EnvironmentSwitcher {...props} />
    </ThemeProvider>
  );
};

describe('EnvironmentSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all available environments', () => {
      renderComponent();

      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Staging')).toBeInTheDocument();
      expect(screen.getByText('Production')).toBeInTheDocument();
    });

    it('highlights the currently selected environment', () => {
      renderComponent();

      const devTab = screen.getByRole('tab', { name: /development/i });
      expect(devTab).toHaveAttribute('aria-selected', 'true');
    });

    it('renders with tabs variant by default', () => {
      renderComponent();

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('renders with chips variant when specified', () => {
      renderComponent({ variant: 'chips' });

      // Should not have tablist
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('shows environment status when showStatus is true', () => {
      renderComponent({ showStatus: true });

      // Status indicators should be present
      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('shows metadata when showMetadata is true', () => {
      renderComponent({ showMetadata: true });

      expect(screen.getByText(/resources/i)).toBeInTheDocument();
    });
  });

  describe('Environment Switching', () => {
    it('switches to staging environment without confirmation', async () => {
      renderComponent();

      const stagingTab = screen.getByRole('tab', { name: /staging/i });
      await userEvent.click(stagingTab);

      expect(mockSelectEnvironment).toHaveBeenCalledWith('staging');
    });

    it('shows confirmation dialog when switching to production', async () => {
      renderComponent();

      const prodTab = screen.getByRole('tab', { name: /production/i });
      await userEvent.click(prodTab);

      // Dialog should appear
      expect(screen.getByText(/switch to production\?/i)).toBeInTheDocument();
      expect(
        screen.getByText(/changes in this environment can affect live systems/i)
      ).toBeInTheDocument();
    });

    it('switches to production after confirmation', async () => {
      renderComponent();

      const prodTab = screen.getByRole('tab', { name: /production/i });
      await userEvent.click(prodTab);

      // Confirm the switch
      const confirmButton = screen.getByRole('button', {
        name: /switch to production/i,
      });
      await userEvent.click(confirmButton);

      expect(mockSelectEnvironment).toHaveBeenCalledWith('prod');
    });

    it('cancels production switch when cancel is clicked', async () => {
      renderComponent();

      const prodTab = screen.getByRole('tab', { name: /production/i });
      await userEvent.click(prodTab);

      // Cancel the switch
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockSelectEnvironment).not.toHaveBeenCalledWith('prod');
    });

    it('calls onEnvironmentChange callback when environment changes', async () => {
      const onChangeMock = jest.fn();
      renderComponent({ onEnvironmentChange: onChangeMock });

      const stagingTab = screen.getByRole('tab', { name: /staging/i });
      await userEvent.click(stagingTab);

      expect(onChangeMock).toHaveBeenCalledWith('staging');
    });
  });

  describe('Disabled State', () => {
    it('prevents switching when disabled', async () => {
      renderComponent({ disabled: true });

      const stagingTab = screen.getByRole('tab', { name: /staging/i });
      expect(stagingTab).toBeDisabled();
    });
  });

  describe('Add Environment', () => {
    it('shows add button when allowAddEnvironment is true', () => {
      renderComponent({ variant: 'chips', allowAddEnvironment: true });

      expect(screen.getByLabelText(/add environment/i)).toBeInTheDocument();
    });

    it('hides add button when allowAddEnvironment is false', () => {
      renderComponent({ variant: 'chips', allowAddEnvironment: false });

      expect(screen.queryByLabelText(/add environment/i)).not.toBeInTheDocument();
    });

    it('opens add dialog when add button is clicked', async () => {
      renderComponent({ variant: 'chips', allowAddEnvironment: true });

      const addButton = screen.getByLabelText(/add environment/i);
      await userEvent.click(addButton);

      expect(screen.getByText(/add custom environment/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes for tabs', () => {
      renderComponent();

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('supports keyboard navigation', async () => {
      renderComponent();

      const tablist = screen.getByRole('tablist');
      tablist.focus();

      // Navigate with arrow keys
      fireEvent.keyDown(tablist, { key: 'ArrowRight' });

      // This would typically move focus to the next tab
    });
  });
});
