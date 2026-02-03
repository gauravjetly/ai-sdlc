/**
 * IAMRoleNode Component
 * AWS IAM Role visualization with trust relationships and policies
 */

import React, { memo, useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { Box, Chip, Typography, Stack, Tooltip } from '@mui/material';
import {
  Person as RoleIcon,
  Policy as PolicyIcon,
  VerifiedUser as TrustIcon,
} from '@mui/icons-material';
import { BaseNode } from '../common/BaseNode';
import {
  IAMRoleNodeData,
  DEFAULT_IAM_ROLE_DATA,
  NodeMetadata,
} from '../types';

/**
 * Parse trust policy to get trusted principals
 */
function getTrustedPrincipals(assumeRolePolicy: string): string[] {
  try {
    const policy = JSON.parse(assumeRolePolicy);
    const principals: string[] = [];

    policy.Statement?.forEach((statement: any) => {
      if (statement.Effect === 'Allow' && statement.Principal) {
        if (typeof statement.Principal === 'string') {
          principals.push(statement.Principal);
        } else if (statement.Principal.Service) {
          const services = Array.isArray(statement.Principal.Service)
            ? statement.Principal.Service
            : [statement.Principal.Service];
          principals.push(...services.map((s: string) => s.replace('.amazonaws.com', '')));
        } else if (statement.Principal.AWS) {
          const awsPrincipals = Array.isArray(statement.Principal.AWS)
            ? statement.Principal.AWS
            : [statement.Principal.AWS];
          principals.push(...awsPrincipals.map((a: string) =>
            a === '*' ? 'Any AWS' : a.split(':').pop() || a
          ));
        }
      }
    });

    return principals.slice(0, 3); // Return max 3 principals
  } catch {
    return [];
  }
}

/**
 * IAM Role node metadata
 */
export const iamRoleMetadata: NodeMetadata = {
  serviceType: 'iam-role',
  category: 'security',
  displayName: 'IAM Role',
  description: 'AWS Identity and Access Management role for service permissions',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>',
  color: '#E53935',
  defaultWidth: 220,
  defaultHeight: 110,
  handles: {
    inputs: [
      { id: 'policy-in', type: 'iam-role', position: 'left', label: 'Attach Policy' },
    ],
    outputs: [
      { id: 'assume-out', type: 'iam-role', position: 'right', label: 'Assume Role' },
    ],
  },
  defaultData: DEFAULT_IAM_ROLE_DATA,
  terraformResource: 'aws_iam_role',
  awsDocUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html',
};

/**
 * Content component for IAM Role
 */
const IAMRoleContent = memo(function IAMRoleContent({
  data,
}: {
  data: IAMRoleNodeData;
}) {
  const trustedPrincipals = useMemo(
    () => getTrustedPrincipals(data.assumeRolePolicy || '{}'),
    [data.assumeRolePolicy]
  );

  const policyCount = (data.managedPolicyArns?.length || 0) + (data.inlinePolicies?.length || 0);

  return (
    <Box sx={{ mt: 0.5 }}>
      {/* Trusted By */}
      {trustedPrincipals.length > 0 && (
        <Tooltip
          title={`Trusted by: ${trustedPrincipals.join(', ')}`}
          arrow
          placement="top"
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mb: 1,
            }}
          >
            <TrustIcon sx={{ fontSize: 14 }} />
            {trustedPrincipals[0]}
            {trustedPrincipals.length > 1 && ` +${trustedPrincipals.length - 1}`}
          </Typography>
        </Tooltip>
      )}

      {/* Policies Count */}
      <Stack direction="row" spacing={1}>
        <Tooltip title={`${data.managedPolicyArns?.length || 0} managed policies`} arrow>
          <Chip
            size="small"
            icon={<PolicyIcon sx={{ fontSize: 14 }} />}
            label={`${data.managedPolicyArns?.length || 0} Managed`}
            sx={{
              height: 22,
              fontSize: '0.7rem',
              bgcolor: '#E3F2FD',
              color: '#1565C0',
              '& .MuiChip-icon': { color: '#1565C0' },
            }}
          />
        </Tooltip>
        <Tooltip title={`${data.inlinePolicies?.length || 0} inline policies`} arrow>
          <Chip
            size="small"
            label={`${data.inlinePolicies?.length || 0} Inline`}
            sx={{
              height: 22,
              fontSize: '0.7rem',
              bgcolor: '#FFF3E0',
              color: '#E65100',
            }}
          />
        </Tooltip>
      </Stack>
    </Box>
  );
});

/**
 * IAMRoleNode Component
 */
export const IAMRoleNode = memo(function IAMRoleNode(
  props: NodeProps<IAMRoleNodeData>
) {
  return (
    <BaseNode
      {...props}
      metadata={iamRoleMetadata}
      renderContent={(data) => <IAMRoleContent data={data} />}
    />
  );
});

export default IAMRoleNode;
