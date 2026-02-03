/**
 * Canvas Component
 * ReactFlow canvas wrapper for the Visual Designer
 */

import React, { useCallback, useMemo, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
  ConnectionLineType,
  useReactFlow,
  Panel,
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Typography, Button, Paper } from '@mui/material';
import {
  Add as AddIcon,
  AutoFixHigh as WizardIcon,
  Collections as TemplatesIcon,
} from '@mui/icons-material';
import { nodeTypes, NODE_DEFINITIONS } from './nodes/nodeTypes';
import { LAYER_COLORS } from './nodes/BaseNode';
import { LayerType, DesignNode } from '../../contexts/DesignWizardContext';

// Canvas configuration
const CANVAS_CONFIG = {
  minZoom: 0.25,
  maxZoom: 2,
  defaultViewport: { x: 0, y: 0, zoom: 0.75 },
  snapToGrid: true,
  snapGrid: [16, 16] as [number, number],
  connectionLineType: ConnectionLineType.SmoothStep,
  fitViewOptions: {
    padding: 0.2,
    includeHiddenNodes: false,
  },
};

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick?: NodeMouseHandler;
  onPaneClick?: () => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  currentLayer?: LayerType | null;
  onStartWizard?: () => void;
  onOpenTemplates?: () => void;
  selectedNodeId?: string | null;
}

/**
 * Empty state component shown when canvas has no nodes
 */
function EmptyState({
  onStartWizard,
  onOpenTemplates,
}: {
  onStartWizard?: () => void;
  onOpenTemplates?: () => void;
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 10,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 4,
          maxWidth: 400,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h5" gutterBottom>
          Welcome to Infrastructure Designer
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Start designing your cloud infrastructure by using the wizard, browsing templates,
          or dragging nodes from the palette.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<WizardIcon />}
            onClick={onStartWizard}
            size="large"
          >
            Start Wizard
          </Button>
          <Button
            variant="outlined"
            startIcon={<TemplatesIcon />}
            onClick={onOpenTemplates}
            size="large"
          >
            Browse Templates
          </Button>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 2 }}
        >
          Or drag services from the left palette onto the canvas
        </Typography>
      </Paper>
    </Box>
  );
}

/**
 * Connection validation function
 */
function isValidConnection(connection: Connection): boolean {
  // Don't allow self-connections
  if (connection.source === connection.target) {
    return false;
  }

  // Additional validation rules can be added here
  // For example, checking if certain node types can connect

  return true;
}

/**
 * MiniMap node color function
 */
function getMinimapNodeColor(node: Node): string {
  const data = node.data as { layer?: LayerType };
  const layer = data?.layer || 'platform';
  return LAYER_COLORS[layer] || '#888';
}

/**
 * Main Canvas component
 */
export function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDrop,
  onDragOver,
  currentLayer,
  onStartWizard,
  onOpenTemplates,
  selectedNodeId,
}: CanvasProps) {
  const reactFlowInstance = useReactFlow();

  // Filter nodes by current layer if specified
  const filteredNodes = useMemo(() => {
    if (!currentLayer || currentLayer === 'fullstack') {
      return nodes;
    }
    return nodes.filter((node) => {
      const data = node.data as { layer?: LayerType };
      return data?.layer === currentLayer;
    });
  }, [nodes, currentLayer]);

  // Filter edges to only show connections between visible nodes
  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }, [edges, filteredNodes]);

  // Handle connection with validation
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (isValidConnection(connection)) {
        onConnect(connection);
      }
    },
    [onConnect]
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      onDragOver?.(event);
    },
    [onDragOver]
  );

  // Handle drop
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      onDrop?.(event);
    },
    [onDrop]
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn();
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut();
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView(CANVAS_CONFIG.fitViewOptions);
  }, [reactFlowInstance]);

  const isEmpty = filteredNodes.length === 0;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        bgcolor: '#fafafa',
      }}
    >
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        nodeTypes={nodeTypes}
        connectionLineType={CANVAS_CONFIG.connectionLineType}
        minZoom={CANVAS_CONFIG.minZoom}
        maxZoom={CANVAS_CONFIG.maxZoom}
        defaultViewport={CANVAS_CONFIG.defaultViewport}
        snapToGrid={CANVAS_CONFIG.snapToGrid}
        snapGrid={CANVAS_CONFIG.snapGrid}
        fitView={!isEmpty}
        fitViewOptions={CANVAS_CONFIG.fitViewOptions}
        isValidConnection={isValidConnection}
        proOptions={{ hideAttribution: true }}
        selectNodesOnDrag={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#ccc"
        />

        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={true}
          position="bottom-left"
        />

        <MiniMap
          nodeColor={getMinimapNodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          position="bottom-right"
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 4,
          }}
        />

        {/* Layer indicator panel */}
        {currentLayer && currentLayer !== 'fullstack' && (
          <Panel position="top-left">
            <Paper
              sx={{
                px: 2,
                py: 1,
                bgcolor: LAYER_COLORS[currentLayer],
                color: 'white',
                borderRadius: 1,
              }}
            >
              <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                Viewing: {currentLayer} layer
              </Typography>
            </Paper>
          </Panel>
        )}

        {/* Node count panel */}
        <Panel position="top-right">
          <Paper
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'background.paper',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {filteredNodes.length} node{filteredNodes.length !== 1 ? 's' : ''}
              {currentLayer && currentLayer !== 'fullstack' && ` in ${currentLayer}`}
            </Typography>
          </Paper>
        </Panel>
      </ReactFlow>

      {/* Empty state overlay */}
      {isEmpty && (
        <EmptyState
          onStartWizard={onStartWizard}
          onOpenTemplates={onOpenTemplates}
        />
      )}
    </Box>
  );
}

export default Canvas;
