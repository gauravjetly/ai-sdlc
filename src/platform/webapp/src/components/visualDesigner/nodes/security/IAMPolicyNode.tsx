/**
 * IAMPolicyNode Component
 * AWS IAM Policy visualization with policy statements
 */

import React, { memo, useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { Box, Chip, Typography, Stack, Tooltip } from '@mui/material';
import {
  Policy as PolicyIcon,
  Check as AllowIcon,
  Block as DenyIcon,
} from '@mui/icons-material';
import { BaseNode } from '../common/BaseNode';
import {
  IAMPolicyNodeData,
  DEFAULT_IAM_POLICY_DATA,
  NodeMetadata,
} from '../types';

/**
 * Parse policy to get statement summary
 */
function getPolicyStats(policy: string): { allowCount: number; denyCount: number; actions: string[] } {
  try {
    const parsed = JSON.parse(policy);
    let allowCount = 0;
    let denyCount = 0;
    const actions: string[] = [];

    parsed.Statement?.forEach((statement: any) => {
      if (statement.Effect === 'Allow') {
        allowCount++;
      } else if (statement.Effect === 'Deny') {
        denyCount++;
      }

      const statementActions = Array.isArray(statement.Action)
        ? statement.Action
        : [statement.Action];

      actions.push(...statementActions.slice(0, 2).map((a: string) =>
        a.includes(':') ? a.split(':')[0] : a
      ));
    });

    return {
      allowCount,
      denyCount,
      actions: [...new Set(actions)].slice(0, 3),
    };
  } catch {
    return { allowCount: 0, denyCount: 0, actions: [] };
  }
}

/**
 * IAM Policy node metadata
 */
export const iamPolicyMetadata: NodeMetadata = {
  serviceType: 'iam-policy',
  category: 'security',
  displayName: 'IAM Policy',
  description: 'AWS IAM Policy document defining permissions',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
  color: '#E53935',
  defaultWidth: 200,
  defaultHeight: 100,
  handles: {
    inputs: [],
    outputs: [
      { id: 'attach-out', type: 'iam-role', position: 'right', label: 'Attach to Role' },
    ],
  },
  defaultData: DEFAULT_IAM_POLICY_DATA,
  terraformResource: 'aws_iam_policy',
  awsDocUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html',
};

/**
 * Content component for IAM Policy
 */
const IAMPolicyContent = memo(function IAMPolicyContent({
  data,
}: {
  data: IAMPolicyNodeData;
}) {
  const stats = useMemo(
    () => getPolicyStats(data.policy || '{}'),
    [data.policy]
  );

  return (
    <Box sx={{ mt: 0.5 }}>
      {/* Services affected */}
      {stats.actions.length > 0 && (
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
          Services: {stats.actions.join(', ')}
        </Typography>
      )}

      {/* Statement counts */}
      <Stack direction="row" spacing={1}>
        <Tooltip title={`${stats.allowCount} Allow statements`} arrow>
          <Chip
            size="small"
            icon={<AllowIcon sx={{ fontSize: 14 }} />}
            label={`${stats.allowCount} Allow`}
            sx={{
              height: 22,
              fontSize: '0.7rem',
              bgcolor: '#E8F5E9',
              color: '#2E7D32',
              '& .MuiChip-icon': { color: '#2E7D32' },
            }}
          />
        </Tooltip>
        {stats.denyCount > 0 && (
          <Tooltip title={`${stats.denyCount} Deny statements`} arrow>
            <Chip
              size="small"
              icon={<DenyIcon sx={{ fontSize: 14 }} />}
              label={`${stats.denyCount} Deny`}
              sx={{
                height: 22,
                fontSize: '0.7rem',
                bgcolor: '#FFEBEE',
                color: '#C62828',
                '& .MuiChip-icon': { color: '#C62828' },
              }}
            />
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
});

/**
 * IAMPolicyNode Component
 */
export const IAMPolicyNode = memo(function IAMPolicyNode(
  props: NodeProps<IAMPolicyNodeData>
) {
  return (
    <BaseNode
      {...props}
      metadata={iamPolicyMetadata}
      renderContent={(data) => <IAMPolicyContent data={data} />}
    />
  );
});

export default IAMPolicyNode;
