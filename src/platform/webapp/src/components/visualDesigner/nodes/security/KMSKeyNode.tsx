/**
 * KMSKeyNode Component
 * AWS KMS Key visualization with encryption settings
 */

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Box, Chip, Typography, Stack, Tooltip } from '@mui/material';
import {
  VpnKey as KeyIcon,
  Autorenew as RotationIcon,
  Public as MultiRegionIcon,
} from '@mui/icons-material';
import { BaseNode } from '../common/BaseNode';
import {
  KMSKeyNodeData,
  DEFAULT_KMS_KEY_DATA,
  NodeMetadata,
} from '../types';

/**
 * KMS Key node metadata
 */
export const kmsKeyMetadata: NodeMetadata = {
  serviceType: 'kms-key',
  category: 'security',
  displayName: 'KMS Key',
  description: 'AWS Key Management Service encryption key',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>',
  color: '#E53935',
  defaultWidth: 200,
  defaultHeight: 100,
  handles: {
    inputs: [],
    outputs: [
      { id: 'encrypt-out', type: 'encryption', position: 'right', label: 'Encrypt resources' },
    ],
  },
  defaultData: DEFAULT_KMS_KEY_DATA,
  terraformResource: 'aws_kms_key',
  awsDocUrl: 'https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html',
};

/**
 * Get key type display name
 */
function getKeyTypeDisplay(keySpec: string): string {
  const typeMap: Record<string, string> = {
    'SYMMETRIC_DEFAULT': 'Symmetric',
    'RSA_2048': 'RSA 2048',
    'RSA_4096': 'RSA 4096',
    'ECC_NIST_P256': 'ECC P256',
    'ECC_NIST_P384': 'ECC P384',
  };
  return typeMap[keySpec] || keySpec;
}

/**
 * Content component for KMS Key
 */
const KMSKeyContent = memo(function KMSKeyContent({
  data,
}: {
  data: KMSKeyNodeData;
}) {
  return (
    <Box sx={{ mt: 0.5 }}>
      {/* Alias */}
      {data.alias && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mb: 1,
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          alias/{data.alias}
        </Typography>
      )}

      {/* Key properties */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={getKeyTypeDisplay(data.keySpec)}
          sx={{
            height: 20,
            fontSize: '0.65rem',
            bgcolor: '#E3F2FD',
            color: '#1565C0',
          }}
        />
        {data.enableKeyRotation && (
          <Tooltip title="Automatic key rotation enabled" arrow>
            <Chip
              size="small"
              icon={<RotationIcon sx={{ fontSize: 12 }} />}
              label="Rotation"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: '#E8F5E9',
                color: '#2E7D32',
                '& .MuiChip-icon': { color: '#2E7D32' },
              }}
            />
          </Tooltip>
        )}
        {data.multiRegion && (
          <Tooltip title="Multi-region key" arrow>
            <Chip
              size="small"
              icon={<MultiRegionIcon sx={{ fontSize: 12 }} />}
              label="Multi-region"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: '#FFF3E0',
                color: '#E65100',
                '& .MuiChip-icon': { color: '#E65100' },
              }}
            />
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
});

/**
 * KMSKeyNode Component
 */
export const KMSKeyNode = memo(function KMSKeyNode(
  props: NodeProps<KMSKeyNodeData>
) {
  return (
    <BaseNode
      {...props}
      metadata={kmsKeyMetadata}
      renderContent={(data) => <KMSKeyContent data={data} />}
    />
  );
});

export default KMSKeyNode;
