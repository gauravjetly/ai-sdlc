/**
 * Node Drag and Drop Hook
 * Handles dragging nodes from palette to canvas
 */

import { useCallback, DragEvent } from 'react';
import { useReactFlow, XYPosition } from '@xyflow/react';
import { LayerType, DesignNode } from '../../../contexts/DesignWizardContext';

interface NodeDragData {
  type: string;
  layer: LayerType;
  label: string;
  defaultConfig: Record<string, any>;
}

interface UseNodeDragDropOptions {
  onNodeAdd: (node: DesignNode) => void;
  currentLayer: LayerType | null;
}

/**
 * Hook for handling node drag and drop from palette to canvas
 */
export function useNodeDragDrop({ onNodeAdd, currentLayer }: UseNodeDragDropOptions) {
  const reactFlowInstance = useReactFlow();

  /**
   * Handle drag start from palette
   */
  const handleDragStart = useCallback(
    (event: DragEvent, nodeData: NodeDragData) => {
      event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  /**
   * Handle drag over canvas
   */
  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * Handle drop on canvas
   */
  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const dataString = event.dataTransfer.getData('application/reactflow');
      if (!dataString) return;

      try {
        const nodeData: NodeDragData = JSON.parse(dataString);

        // Get drop position in flow coordinates
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Generate unique ID
        const id = `${nodeData.type}-${Date.now()}`;

        // Create new node
        const newNode: DesignNode = {
          id,
          type: nodeData.type,
          position,
          data: {
            label: `${nodeData.label}-${id.slice(-4)}`,
            ...nodeData.defaultConfig,
          },
          layer: currentLayer || nodeData.layer,
        };

        onNodeAdd(newNode);
      } catch (error) {
        console.error('Failed to parse drag data:', error);
      }
    },
    [reactFlowInstance, onNodeAdd, currentLayer]
  );

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
}

/**
 * Create draggable props for palette items
 */
export function createDraggableProps(nodeData: NodeDragData) {
  return {
    draggable: true,
    onDragStart: (event: DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
      event.dataTransfer.effectAllowed = 'move';
    },
  };
}

export default useNodeDragDrop;
