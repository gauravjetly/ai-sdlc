/**
 * SecurityGroupNode Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { ThemeProvider, createTheme } from '@mui/material';
import { SecurityGroupNode, securityGroupMetadata } from '../../../security/SecurityGroupNode';
import { SecurityGroupNodeData } from '../../../types';

const theme = createTheme();

const mockSecurityGroupData: SecurityGroupNodeData = {
  id: 'sg-test-001',
  name: 'web-server-sg',
  serviceType: 'security-group',
  category: 'security',
  description: 'Security group for web servers',
  vpcId: 'vpc-12345678',
  ingressRules: [
    {
      id: 'rule-1',
      protocol: 'tcp',
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'HTTP',
    },
    {
      id: 'rule-2',
      protocol: 'tcp',
      fromPort: 443,
      toPort: 443,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'HTTPS',
    },
    {
      id: 'rule-3',
      protocol: 'tcp',
      fromPort: 22,
      toPort: 22,
      cidrBlocks: ['10.0.0.0/8'],
      description: 'SSH',
    },
  ],
  egressRules: [
    {
      id: 'egress-1',
      protocol: '-1',
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'Allow all outbound',
    },
  ],
  ruleCount: 4,
  tags: {
    Environment: 'production',
  },
  status: 'configured',
  createdAt: '2026-02-02T00:00:00Z',
  updatedAt: '2026-02-02T00:00:00Z',
};

const renderSecurityGroupNode = (data: SecurityGroupNodeData) => {
  return render(
    <ThemeProvider theme={theme}>
      <ReactFlowProvider>
        <SecurityGroupNode
          id={data.id}
          data={data}
          selected={false}
          type="security-group"
          zIndex={1}
          isConnectable={true}
          xPos={0}
          yPos={0}
          dragging={false}
        />
      </ReactFlowProvider>
    </ThemeProvider>
  );
};

describe('SecurityGroupNode', () => {
  describe('Metadata', () => {
    it('should have correct service type', () => {
      expect(securityGroupMetadata.serviceType).toBe('security-group');
    });

    it('should have correct category', () => {
      expect(securityGroupMetadata.category).toBe('security');
    });

    it('should have default dimensions', () => {
      expect(securityGroupMetadata.defaultWidth).toBeGreaterThan(0);
      expect(securityGroupMetadata.defaultHeight).toBeGreaterThan(0);
    });

    it('should have input and output handles', () => {
      expect(securityGroupMetadata.handles.inputs.length).toBeGreaterThan(0);
      expect(securityGroupMetadata.handles.outputs.length).toBeGreaterThan(0);
    });

    it('should have terraform resource defined', () => {
      expect(securityGroupMetadata.terraformResource).toBe('aws_security_group');
    });
  });

  describe('Rendering', () => {
    it('should render the node name', () => {
      renderSecurityGroupNode(mockSecurityGroupData);
      expect(screen.getByText('web-server-sg')).toBeInTheDocument();
    });

    it('should display VPC ID', () => {
      renderSecurityGroupNode(mockSecurityGroupData);
      expect(screen.getByText(/vpc-12345678/)).toBeInTheDocument();
    });

    it('should show ingress rule count', () => {
      renderSecurityGroupNode(mockSecurityGroupData);
      expect(screen.getByText('3 In')).toBeInTheDocument();
    });

    it('should show egress rule count', () => {
      renderSecurityGroupNode(mockSecurityGroupData);
      expect(screen.getByText('1 Out')).toBeInTheDocument();
    });

    it('should show status badge', () => {
      renderSecurityGroupNode(mockSecurityGroupData);
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });
  });

  describe('Unconfigured State', () => {
    it('should show unconfigured status when missing required fields', () => {
      const unconfiguredData: SecurityGroupNodeData = {
        ...mockSecurityGroupData,
        vpcId: '',
        status: 'unconfigured',
      };
      renderSecurityGroupNode(unconfiguredData);
      expect(screen.getByText('Configure')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error status when validation fails', () => {
      const errorData: SecurityGroupNodeData = {
        ...mockSecurityGroupData,
        status: 'error',
        validationResult: {
          valid: false,
          errors: [
            {
              code: 'INVALID_CIDR',
              message: 'Invalid CIDR block',
              severity: 'error',
            },
          ],
          warnings: [],
        },
      };
      renderSecurityGroupNode(errorData);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });
});
