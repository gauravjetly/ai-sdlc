/**
 * BaseNode Component
 * Base component that all AWS node types extend via composition
 */

import React, { memo, useCallback } from 'react';
import { NodeProps } from 'reactflow';
import { Box, Paper, useTheme } from '@mui/material';
import { BaseNodeData, NodeMetadata } from '../types';
import { NodeHeader } from './NodeHeader';
import { NodeHandles } from './NodeHandles';
import { NodeStatusBadge } from './NodeStatusBadge';
import { NodeCostBadge } from './NodeCostBadge';
import { NODE_CATEGORY_COLORS } from '../constants/nodeColors';

export interface BaseNodeProps<T extends BaseNodeData = BaseNodeData> extends NodeProps<T> {
  /** Node metadata from registry */
  metadata: NodeMetadata;
  /** Custom content renderer */
  renderContent?: (data: T) => React.ReactNode;
  /** Custom badges renderer */
  renderBadges?: (data: T) => React.ReactNode;
  /** Click handler for opening properties */
  onDoubleClick?: (nodeId: string) => void;
}

/**
 * BaseNode - Foundation component for all visual designer nodes
 *
 * Features:
 * - Consistent header with icon and service name
 * - Status badge showing configuration state
 * - Cost estimation badge
 * - Typed connection handles
 * - Selection highlighting
 * - Resize support
 */
export const BaseNode = memo(function BaseNode<T extends BaseNodeData>({
  id,
  data,
  selected,
  metadata,
  renderContent,
  renderBadges,
  onDoubleClick,
}: BaseNodeProps<T>) {
  const theme = useTheme();
  const colors = NODE_CATEGORY_COLORS[data.category];

  const handleDoubleClick = useCallback(() => {
    onDoubleClick?.(id);
  }, [id, onDoubleClick]);

  return (
    <Paper
      elevation={selected ? 8 : 2}
      onDoubleClick={handleDoubleClick}
      sx={{
        position: 'relative',
        minWidth: metadata.defaultWidth,
        minHeight: metadata.defaultHeight,
        border: selected
          ? `2px solid ${colors.primary}`
          : `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        overflow: 'visible',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        bgcolor: 'background.paper',
        '&:hover': {
          boxShadow: theme.shadows[4],
          borderColor: colors.light,
        },
      }}
    >
      {/* Header Section */}
      <NodeHeader
        name={data.name}
        icon={<Box component="span" dangerouslySetInnerHTML={{ __html: metadata.icon }} />}
        color={colors.primary}
        serviceType={data.serviceType}
        category={data.category}
      />

      {/* Status Badge */}
      <NodeStatusBadge status={data.status} />

      {/* Cost Badge */}
      {data.estimatedMonthlyCost !== undefined && data.estimatedMonthlyCost > 0 && (
        <NodeCostBadge cost={data.estimatedMonthlyCost} />
      )}

      {/* Content Area */}
      <Box
        sx={{
          p: 1.5,
          minHeight: metadata.defaultHeight - 48,
        }}
      >
        {renderContent?.(data)}
        {renderBadges?.(data)}
      </Box>

      {/* Connection Handles */}
      <NodeHandles
        inputs={metadata.handles.inputs}
        outputs={metadata.handles.outputs}
        nodeId={id}
      />
    </Paper>
  );
});

/**
 * Create a typed node component with specific data type
 */
export function createNodeComponent<T extends BaseNodeData>(
  metadata: NodeMetadata,
  ContentComponent?: React.FC<{ data: T }>,
  BadgesComponent?: React.FC<{ data: T }>
): React.FC<NodeProps<T>> {
  const NodeComponent = memo(function NodeComponent(props: NodeProps<T>) {
    return (
      <BaseNode
        {...props}
        metadata={metadata}
        renderContent={ContentComponent ? (data) => <ContentComponent data={data} /> : undefined}
        renderBadges={BadgesComponent ? (data) => <BadgesComponent data={data} /> : undefined}
      />
    );
  });

  NodeComponent.displayName = `${metadata.displayName}Node`;
  return NodeComponent as React.FC<NodeProps<T>>;
}

export default BaseNode;
