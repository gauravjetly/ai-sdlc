/**
 * EC2InstanceNode Component
 * AWS EC2 Instance visualization with instance configuration
 */

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Box, Chip, Typography, Stack, Tooltip } from '@mui/material';
import {
  Computer as EC2Icon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  PlayArrow as RunningIcon,
  Stop as StoppedIcon,
} from '@mui/icons-material';
import { BaseNode } from '../common/BaseNode';
import {
  EC2InstanceNodeData,
  DEFAULT_EC2_INSTANCE_DATA,
  NodeMetadata,
} from '../types';

/**
 * EC2 Instance node metadata
 */
export const ec2InstanceMetadata: NodeMetadata = {
  serviceType: 'ec2-instance',
  category: 'compute',
  displayName: 'EC2 Instance',
  description: 'Amazon Elastic Compute Cloud virtual server',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>',
  color: '#FB8C00',
  defaultWidth: 220,
  defaultHeight: 110,
  handles: {
    inputs: [
      { id: 'subnet-in', type: 'subnet-placement', position: 'left', label: 'Subnet' },
      { id: 'sg-in', type: 'security-attachment', position: 'top', label: 'Security Groups' },
      { id: 'role-in', type: 'iam-role', position: 'top', label: 'IAM Role' },
    ],
    outputs: [
      { id: 'target-out', type: 'target', position: 'right', label: 'Target' },
    ],
  },
  defaultData: DEFAULT_EC2_INSTANCE_DATA,
  terraformResource: 'aws_instance',
  awsDocUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html',
};

/**
 * Get instance state icon and color
 */
function getInstanceStateDisplay(state: string): {
  icon: React.ReactNode;
  color: string;
  bgcolor: string;
} {
  switch (state) {
    case 'running':
      return {
        icon: <RunningIcon sx={{ fontSize: 12 }} />,
        color: '#2E7D32',
        bgcolor: '#E8F5E9',
      };
    case 'stopped':
      return {
        icon: <StoppedIcon sx={{ fontSize: 12 }} />,
        color: '#C62828',
        bgcolor: '#FFEBEE',
      };
    case 'pending':
    case 'stopping':
    case 'shutting-down':
      return {
        icon: <RunningIcon sx={{ fontSize: 12 }} />,
        color: '#F57C00',
        bgcolor: '#FFF3E0',
      };
    default:
      return {
        icon: <StoppedIcon sx={{ fontSize: 12 }} />,
        color: '#757575',
        bgcolor: '#F5F5F5',
      };
  }
}

/**
 * Content component for EC2 Instance
 */
const EC2InstanceContent = memo(function EC2InstanceContent({
  data,
}: {
  data: EC2InstanceNodeData;
}) {
  const stateDisplay = getInstanceStateDisplay(data.instanceState || 'stopped');
  const totalStorage =
    (data.rootBlockDevice?.volumeSize || 0) +
    (data.additionalVolumes?.reduce((sum, v) => sum + v.volumeSize, 0) || 0);

  return (
    <Box sx={{ mt: 0.5 }}>
      {/* Instance Type */}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1,
          fontFamily: 'monospace',
          fontWeight: 600,
        }}
      >
        {data.instanceType || 't3.micro'}
      </Typography>

      {/* Instance properties */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Tooltip title={`State: ${data.instanceState || 'stopped'}`} arrow>
          <Chip
            size="small"
            icon={stateDisplay.icon as React.ReactElement}
            label={data.instanceState || 'stopped'}
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: stateDisplay.bgcolor,
              color: stateDisplay.color,
              '& .MuiChip-icon': { color: stateDisplay.color },
              textTransform: 'capitalize',
            }}
          />
        </Tooltip>
        {totalStorage > 0 && (
          <Tooltip title={`${totalStorage} GB total storage`} arrow>
            <Chip
              size="small"
              icon={<StorageIcon sx={{ fontSize: 12 }} />}
              label={`${totalStorage}GB`}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: '#E3F2FD',
                color: '#1565C0',
                '& .MuiChip-icon': { color: '#1565C0' },
              }}
            />
          </Tooltip>
        )}
        {data.monitoring && (
          <Chip
            size="small"
            label="Monitor"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: '#F3E5F5',
              color: '#7B1FA2',
            }}
          />
        )}
      </Stack>
    </Box>
  );
});

/**
 * EC2InstanceNode Component
 */
export const EC2InstanceNode = memo(function EC2InstanceNode(
  props: NodeProps<EC2InstanceNodeData>
) {
  return (
    <BaseNode
      {...props}
      metadata={ec2InstanceMetadata}
      renderContent={(data) => <EC2InstanceContent data={data} />}
    />
  );
});

export default EC2InstanceNode;
