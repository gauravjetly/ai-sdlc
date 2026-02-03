/**
 * NodeHandles Component
 * Renders typed connection handles for a node
 */

import React, { memo, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { Tooltip, Box } from '@mui/material';
import { HandleDefinition, HandleType } from '../types';
import { HANDLE_COLORS } from '../constants/nodeColors';

export interface NodeHandlesProps {
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  nodeId: string;
}

/**
 * Map position string to ReactFlow Position enum
 */
const positionMap: Record<string, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/**
 * Get handle position offset for multiple handles on same side
 */
function getHandleOffset(index: number, total: number): string {
  if (total === 1) return '50%';
  const spacing = 100 / (total + 1);
  return `${spacing * (index + 1)}%`;
}

/**
 * Get handle style based on type and position
 */
function getHandleStyle(type: HandleType, position: Position): React.CSSProperties {
  const color = HANDLE_COLORS[type] || '#757575';
  const isHorizontal = position === Position.Left || position === Position.Right;

  return {
    width: 10,
    height: 10,
    backgroundColor: color,
    border: '2px solid white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    cursor: 'crosshair',
    transition: 'transform 0.2s ease',
  };
}

export const NodeHandles = memo(function NodeHandles({
  inputs,
  outputs,
  nodeId,
}: NodeHandlesProps) {
  // Group handles by position
  const inputsByPosition = useMemo(() => {
    const grouped: Record<string, HandleDefinition[]> = {};
    inputs.forEach((input) => {
      if (!grouped[input.position]) grouped[input.position] = [];
      grouped[input.position].push(input);
    });
    return grouped;
  }, [inputs]);

  const outputsByPosition = useMemo(() => {
    const grouped: Record<string, HandleDefinition[]> = {};
    outputs.forEach((output) => {
      if (!grouped[output.position]) grouped[output.position] = [];
      grouped[output.position].push(output);
    });
    return grouped;
  }, [outputs]);

  return (
    <>
      {/* Input Handles */}
      {Object.entries(inputsByPosition).map(([position, handles]) =>
        handles.map((handle, index) => {
          const offset = getHandleOffset(index, handles.length);
          const isHorizontal = position === 'left' || position === 'right';

          return (
            <Tooltip
              key={`input-${handle.id}`}
              title={handle.label || handle.type}
              placement={position === 'left' ? 'left' : position === 'right' ? 'right' : 'top'}
              arrow
            >
              <Handle
                type="target"
                position={positionMap[position]}
                id={handle.id}
                style={{
                  ...getHandleStyle(handle.type, positionMap[position]),
                  ...(isHorizontal
                    ? { top: offset }
                    : { left: offset }),
                }}
                isConnectable={true}
              />
            </Tooltip>
          );
        })
      )}

      {/* Output Handles */}
      {Object.entries(outputsByPosition).map(([position, handles]) =>
        handles.map((handle, index) => {
          const offset = getHandleOffset(index, handles.length);
          const isHorizontal = position === 'left' || position === 'right';

          return (
            <Tooltip
              key={`output-${handle.id}`}
              title={handle.label || handle.type}
              placement={position === 'left' ? 'left' : position === 'right' ? 'right' : 'bottom'}
              arrow
            >
              <Handle
                type="source"
                position={positionMap[position]}
                id={handle.id}
                style={{
                  ...getHandleStyle(handle.type, positionMap[position]),
                  ...(isHorizontal
                    ? { top: offset }
                    : { left: offset }),
                }}
                isConnectable={true}
              />
            </Tooltip>
          );
        })
      )}
    </>
  );
});

export default NodeHandles;
