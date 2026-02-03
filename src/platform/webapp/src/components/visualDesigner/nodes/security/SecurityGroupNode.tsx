/**
 * SecurityGroupNode Component
 * AWS Security Group visualization with ingress/egress rules
 */

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Box, Chip, Typography, Stack, Tooltip } from '@mui/material';
import {
  Security as SecurityIcon,
  Input as IngressIcon,
  Output as EgressIcon,
} from '@mui/icons-material';
import { BaseNode } from '../common/BaseNode';
import {
  SecurityGroupNodeData,
  DEFAULT_SECURITY_GROUP_DATA,
  NodeMetadata,
  HandleDefinition,
} from '../types';

/**
 * Security Group node metadata
 */
export const securityGroupMetadata: NodeMetadata = {
  serviceType: 'security-group',
  category: 'security',
  displayName: 'Security Group',
  description: 'Virtual firewall for controlling inbound and outbound traffic',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>',
  color: '#E53935',
  defaultWidth: 220,
  defaultHeight: 100,
  handles: {
    inputs: [
      { id: 'vpc-in', type: 'vpc-attachment', position: 'left', label: 'VPC' },
    ],
    outputs: [
      { id: 'attach-out', type: 'security-attachment', position: 'right', label: 'Attach to resources' },
    ],
  },
  defaultData: DEFAULT_SECURITY_GROUP_DATA,
  terraformResource: 'aws_security_group',
  awsDocUrl: 'https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html',
};

/**
 * Content component for Security Group
 */
const SecurityGroupContent = memo(function SecurityGroupContent({
  data,
}: {
  data: SecurityGroupNodeData;
}) {
  const ingressCount = data.ingressRules?.length || 0;
  const egressCount = data.egressRules?.length || 0;

  return (
    <Box sx={{ mt: 0.5 }}>
      {/* VPC Association */}
      {data.vpcId && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          VPC: {data.vpcId}
        </Typography>
      )}

      {/* Rules Count */}
      <Stack direction="row" spacing={1}>
        <Tooltip title={`${ingressCount} inbound rules`} arrow>
          <Chip
            size="small"
            icon={<IngressIcon sx={{ fontSize: 14 }} />}
            label={`${ingressCount} In`}
            sx={{
              height: 22,
              fontSize: '0.7rem',
              bgcolor: '#E8F5E9',
              color: '#2E7D32',
              '& .MuiChip-icon': { color: '#2E7D32' },
            }}
          />
        </Tooltip>
        <Tooltip title={`${egressCount} outbound rules`} arrow>
          <Chip
            size="small"
            icon={<EgressIcon sx={{ fontSize: 14 }} />}
            label={`${egressCount} Out`}
            sx={{
              height: 22,
              fontSize: '0.7rem',
              bgcolor: '#FFF3E0',
              color: '#E65100',
              '& .MuiChip-icon': { color: '#E65100' },
            }}
          />
        </Tooltip>
      </Stack>
    </Box>
  );
});

/**
 * SecurityGroupNode Component
 */
export const SecurityGroupNode = memo(function SecurityGroupNode(
  props: NodeProps<SecurityGroupNodeData>
) {
  return (
    <BaseNode
      {...props}
      metadata={securityGroupMetadata}
      renderContent={(data) => <SecurityGroupContent data={data} />}
    />
  );
});

export default SecurityGroupNode;
