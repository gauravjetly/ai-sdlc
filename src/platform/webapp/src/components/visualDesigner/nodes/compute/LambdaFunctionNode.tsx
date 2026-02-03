/**
 * LambdaFunctionNode Component
 * AWS Lambda Function visualization with runtime and configuration
 */

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Box, Chip, Typography, Stack, Tooltip } from '@mui/material';
import {
  Functions as LambdaIcon,
  Memory as MemoryIcon,
  Timer as TimeoutIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';
import { BaseNode } from '../common/BaseNode';
import {
  LambdaFunctionNodeData,
  DEFAULT_LAMBDA_DATA,
  NodeMetadata,
} from '../types';

/**
 * Lambda Function node metadata
 */
export const lambdaFunctionMetadata: NodeMetadata = {
  serviceType: 'lambda-function',
  category: 'compute',
  displayName: 'Lambda Function',
  description: 'AWS Lambda serverless compute function',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
  color: '#FB8C00',
  defaultWidth: 220,
  defaultHeight: 110,
  handles: {
    inputs: [
      { id: 'role-in', type: 'iam-role', position: 'left', label: 'Execution Role' },
      { id: 'sg-in', type: 'security-attachment', position: 'top', label: 'VPC Security Groups' },
      { id: 'trigger-in', type: 'trigger', position: 'top', label: 'Trigger' },
    ],
    outputs: [
      { id: 'target-out', type: 'target', position: 'right', label: 'Invoke' },
      { id: 'notification-out', type: 'notification', position: 'bottom', label: 'DLQ' },
    ],
  },
  defaultData: DEFAULT_LAMBDA_DATA,
  terraformResource: 'aws_lambda_function',
  awsDocUrl: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html',
};

/**
 * Get runtime display name
 */
function getRuntimeDisplay(runtime: string): { name: string; color: string } {
  const runtimeMap: Record<string, { name: string; color: string }> = {
    'nodejs18.x': { name: 'Node 18', color: '#339933' },
    'nodejs20.x': { name: 'Node 20', color: '#339933' },
    'python3.9': { name: 'Python 3.9', color: '#3776AB' },
    'python3.10': { name: 'Python 3.10', color: '#3776AB' },
    'python3.11': { name: 'Python 3.11', color: '#3776AB' },
    'python3.12': { name: 'Python 3.12', color: '#3776AB' },
    'java17': { name: 'Java 17', color: '#007396' },
    'java21': { name: 'Java 21', color: '#007396' },
    'go1.x': { name: 'Go', color: '#00ADD8' },
    'dotnet6': { name: '.NET 6', color: '#512BD4' },
    'dotnet8': { name: '.NET 8', color: '#512BD4' },
    'ruby3.2': { name: 'Ruby 3.2', color: '#CC342D' },
  };
  return runtimeMap[runtime] || { name: runtime, color: '#757575' };
}

/**
 * Format memory size
 */
function formatMemory(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)}GB`;
  }
  return `${mb}MB`;
}

/**
 * Content component for Lambda Function
 */
const LambdaFunctionContent = memo(function LambdaFunctionContent({
  data,
}: {
  data: LambdaFunctionNodeData;
}) {
  const runtimeDisplay = getRuntimeDisplay(data.runtime || 'nodejs20.x');
  const hasVPC = data.vpcConfig?.subnetIds?.length ? data.vpcConfig.subnetIds.length > 0 : false;

  return (
    <Box sx={{ mt: 0.5 }}>
      {/* Runtime */}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1,
          fontFamily: 'monospace',
        }}
      >
        {data.handler || 'index.handler'}
      </Typography>

      {/* Function properties */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={runtimeDisplay.name}
          sx={{
            height: 20,
            fontSize: '0.65rem',
            bgcolor: `${runtimeDisplay.color}20`,
            color: runtimeDisplay.color,
          }}
        />
        <Tooltip title={`Memory: ${data.memorySize}MB`} arrow>
          <Chip
            size="small"
            icon={<MemoryIcon sx={{ fontSize: 12 }} />}
            label={formatMemory(data.memorySize || 128)}
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: '#E3F2FD',
              color: '#1565C0',
              '& .MuiChip-icon': { color: '#1565C0' },
            }}
          />
        </Tooltip>
        <Tooltip title={`Timeout: ${data.timeout}s`} arrow>
          <Chip
            size="small"
            icon={<TimeoutIcon sx={{ fontSize: 12 }} />}
            label={`${data.timeout || 3}s`}
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: '#FFF3E0',
              color: '#E65100',
              '& .MuiChip-icon': { color: '#E65100' },
            }}
          />
        </Tooltip>
        {(data.layers?.length || 0) > 0 && (
          <Tooltip title={`${data.layers?.length} layers attached`} arrow>
            <Chip
              size="small"
              icon={<LayersIcon sx={{ fontSize: 12 }} />}
              label={`${data.layers?.length}`}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: '#F3E5F5',
                color: '#7B1FA2',
                '& .MuiChip-icon': { color: '#7B1FA2' },
              }}
            />
          </Tooltip>
        )}
        {hasVPC && (
          <Chip
            size="small"
            label="VPC"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: '#E8F5E9',
              color: '#2E7D32',
            }}
          />
        )}
      </Stack>
    </Box>
  );
});

/**
 * LambdaFunctionNode Component
 */
export const LambdaFunctionNode = memo(function LambdaFunctionNode(
  props: NodeProps<LambdaFunctionNodeData>
) {
  return (
    <BaseNode
      {...props}
      metadata={lambdaFunctionMetadata}
      renderContent={(data) => <LambdaFunctionContent data={data} />}
    />
  );
});

export default LambdaFunctionNode;
