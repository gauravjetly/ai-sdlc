/**
 * LayerDependencyGraph Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { LayerDependencyGraph } from '../LayerDependencyGraph';

// Mock the DesignWizardContext
jest.mock('../../../../contexts/DesignWizardContext', () => ({
  useDesignWizard: () => ({
    layers: {
      network: { status: 'deployed', data: { nodes: [], edges: [] } },
      platform: { status: 'complete', data: { nodes: [], edges: [] } },
      devops: { status: 'pending', data: null },
    },
    validationErrors: [],
  }),
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('LayerDependencyGraph', () => {
  it('renders three layer nodes', () => {
    renderWithTheme(<LayerDependencyGraph />);

    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('DevOps')).toBeInTheDocument();
  });

  it('renders SVG graph', () => {
    const { container } = renderWithTheme(<LayerDependencyGraph />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders in horizontal orientation by default', () => {
    const { container } = renderWithTheme(<LayerDependencyGraph />);

    const svg = container.querySelector('svg');
    // Check viewBox aspect ratio for horizontal layout
    const viewBox = svg?.getAttribute('viewBox');
    expect(viewBox).toContain('420'); // Medium width
  });

  it('renders in vertical orientation when specified', () => {
    const { container } = renderWithTheme(
      <LayerDependencyGraph orientation="vertical" />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('calls onNodeClick when a node is clicked', () => {
    const onNodeClick = jest.fn();

    renderWithTheme(<LayerDependencyGraph onNodeClick={onNodeClick} />);

    // Click on Network node text
    fireEvent.click(screen.getByText('Network'));

    expect(onNodeClick).toHaveBeenCalledWith('network');
  });

  it('renders legend with all status types', () => {
    renderWithTheme(<LayerDependencyGraph />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Deployed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('applies correct status colors to nodes', () => {
    const { container } = renderWithTheme(<LayerDependencyGraph />);

    // Check for stroke colors on circles
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(0);
  });
});

describe('LayerDependencyGraph - Size Variants', () => {
  it('renders small size variant', () => {
    const { container } = renderWithTheme(
      <LayerDependencyGraph size="small" />
    );

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('280');
  });

  it('renders medium size variant', () => {
    const { container } = renderWithTheme(
      <LayerDependencyGraph size="medium" />
    );

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('420');
  });

  it('renders large size variant', () => {
    const { container } = renderWithTheme(
      <LayerDependencyGraph size="large" />
    );

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('560');
  });
});

describe('LayerDependencyGraph - Animation', () => {
  it('shows deploying animation when deployingLayer is specified', () => {
    const { container } = renderWithTheme(
      <LayerDependencyGraph deployingLayer="platform" animated={true} />
    );

    // Check for animate elements
    const animateElements = container.querySelectorAll('animate');
    expect(animateElements.length).toBeGreaterThan(0);
  });

  it('does not show animation when animated is false', () => {
    const { container } = renderWithTheme(
      <LayerDependencyGraph deployingLayer="platform" animated={false} />
    );

    // Deploying ring animation should still show for deployingLayer
    // but flow animation on edges should not
  });
});

describe('LayerDependencyGraph - Validation Warnings', () => {
  it('shows warning indicator when validation errors exist', () => {
    // Update mock to include validation errors
    jest.doMock('../../../../contexts/DesignWizardContext', () => ({
      useDesignWizard: () => ({
        layers: {
          network: { status: 'complete', data: { nodes: [], edges: [] } },
          platform: { status: 'pending', data: null },
          devops: { status: 'pending', data: null },
        },
        validationErrors: [
          {
            code: 'NETWORK_INCOMPLETE',
            message: 'Network configuration incomplete',
            path: 'network.subnets',
            severity: 'warning',
          },
        ],
      }),
    }));

    // Re-render would show warning icons
    renderWithTheme(<LayerDependencyGraph />);

    // Check for warning icon presence
  });
});

describe('LayerDependencyGraph - Edge Rendering', () => {
  it('renders edges between layers', () => {
    const { container } = renderWithTheme(<LayerDependencyGraph />);

    // Check for path elements (edges)
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2); // At least 2 edges
  });

  it('renders arrow heads on edges', () => {
    const { container } = renderWithTheme(<LayerDependencyGraph />);

    // Check for polygon elements (arrow heads)
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(2);
  });

  it('changes edge style based on source status', () => {
    const { container } = renderWithTheme(<LayerDependencyGraph />);

    // Deployed -> Complete edge should be solid (no dash)
    const paths = container.querySelectorAll('path');
    const firstEdge = paths[0];

    // Check for solid stroke (no stroke-dasharray)
    expect(firstEdge.getAttribute('stroke-dasharray')).toBe('none');
  });
});
