/**
 * Visual Designer Page
 * Main integrated page for infrastructure design with wizard, canvas, and properties
 */

import React, {
  useState,
  useCallback,
  useMemo,
  Suspense,
  lazy,
  DragEvent,
} from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Paper,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  ChevronLeft as CollapseLeftIcon,
  ChevronRight as ExpandLeftIcon,
  KeyboardArrowDown as ExpandBottomIcon,
  KeyboardArrowUp as CollapseBottomIcon,
  AutoFixHigh as WizardIcon,
  GridView as PaletteIcon,
} from '@mui/icons-material';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  DesignWizardProvider,
  useDesignWizard,
  LayerType,
  Environment,
  DesignNode,
} from '../contexts/DesignWizardContext';

// Components
import Canvas from '../components/visualDesigner/Canvas';
import Toolbar from '../components/visualDesigner/Toolbar';
import NodePalette from '../components/visualDesigner/NodePalette';
import PropertiesPanel from '../components/visualDesigner/PropertiesPanel';
import { useDesignerShortcuts } from '../components/visualDesigner/hooks/useKeyboardShortcuts';
import { useAutoSave } from '../components/visualDesigner/hooks/useAutoSave';

// Lazy loaded components
const WizardDrawer = lazy(() =>
  import('../components/visualDesigner/wizard/WizardDrawer').then((m) => ({
    default: m.WizardDrawer,
  }))
);
const TemplateBrowser = lazy(() =>
  import('../components/visualDesigner/templates/TemplateBrowser').then((m) => ({
    default: m.TemplateBrowser,
  }))
);
const LayerDeploymentPanel = lazy(() =>
  import('../components/visualDesigner/layers/LayerDeploymentPanel').then((m) => ({
    default: m.LayerDeploymentPanel,
  }))
);

// Layout constants
const LEFT_SIDEBAR_WIDTH = 280;
const LEFT_SIDEBAR_COLLAPSED_WIDTH = 48;
const RIGHT_SIDEBAR_WIDTH = 320;
const BOTTOM_PANEL_HEIGHT = 300;
const BOTTOM_PANEL_COLLAPSED_HEIGHT = 40;

// Loading fallback
function LoadingFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 200,
      }}
    >
      <CircularProgress />
    </Box>
  );
}

/**
 * Main Visual Designer content component
 */
function VisualDesignerContent() {
  const {
    workflowId,
    designName,
    designData,
    currentLayer,
    layers,
    selectedEnvironment,
    validationErrors,
    hasUnsavedChanges,
    isWizardOpen,
    isSaving,
    isDeploying,
    initializeWorkflow,
    saveProgress,
    openWizard,
    closeWizard,
    setCurrentLayer,
    selectEnvironment,
    addNode,
    updateNode,
    removeNode,
    addEdge: contextAddEdge,
    removeEdge: contextRemoveEdge,
    updateDesignData,
    deployCurrentLayer,
    validateCurrentLayer,
    isLayerComplete,
  } = useDesignWizard();

  const reactFlowInstance = useReactFlow();

  // Local UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [bottomPanelExpanded, setBottomPanelExpanded] = useState(false);
  const [bottomPanelTab, setBottomPanelTab] = useState(0);
  const [sidebarMode, setSidebarMode] = useState<'palette' | 'wizard'>('palette');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState(
    designData.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    designData.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.type || 'smoothstep',
    }))
  );

  // Sync context data to ReactFlow state
  React.useEffect(() => {
    setNodes(
      designData.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      }))
    );
    setEdges(
      designData.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type || 'smoothstep',
      }))
    );
  }, [designData, setNodes, setEdges]);

  // Selected node
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  // Layer status
  const layerStatus = useMemo(
    () => ({
      network: layers.network.status,
      platform: layers.platform.status,
      devops: layers.devops.status,
      fullstack: 'pending' as const,
    }),
    [layers]
  );

  // Undo/Redo state (simplified - would need full implementation)
  const [canUndo] = useState(false);
  const [canRedo] = useState(false);

  // Auto-save
  const { triggerSave, lastSaved } = useAutoSave(
    async () => {
      await saveProgress();
    },
    hasUnsavedChanges,
    {
      delay: 30000,
      enabled: !!workflowId,
      onSaveSuccess: () => {
        setSnackbar({ open: true, message: 'Design saved', severity: 'success' });
      },
      onSaveError: () => {
        setSnackbar({ open: true, message: 'Failed to save', severity: 'error' });
      },
    }
  );

  // Handle connection
  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: 'smoothstep',
      };
      setEdges((eds) => addEdge(newEdge, eds));
      contextAddEdge({
        id: newEdge.id,
        source: newEdge.source,
        target: newEdge.target,
        sourceHandle: newEdge.sourceHandle,
        targetHandle: newEdge.targetHandle,
        type: newEdge.type,
      });
    },
    [setEdges, contextAddEdge]
  );

  // Handle node click
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Handle pane click
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Handle drop from palette
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const dataString = event.dataTransfer.getData('application/reactflow');
      if (!dataString) return;

      try {
        const nodeData = JSON.parse(dataString);
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const id = `${nodeData.type}-${Date.now()}`;
        const newNode: DesignNode = {
          id,
          type: nodeData.type,
          position,
          data: {
            label: `${nodeData.label}-${id.slice(-4)}`,
            layer: currentLayer || nodeData.layer,
            ...nodeData.defaultConfig,
          },
          layer: currentLayer || nodeData.layer,
        };

        addNode(newNode);
        setSelectedNodeId(id);
      } catch (error) {
        console.error('Failed to handle drop:', error);
      }
    },
    [reactFlowInstance, addNode, currentLayer]
  );

  // Handle node update from properties panel
  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<Node>) => {
      updateNode(nodeId, {
        position: updates.position,
        data: updates.data,
      } as Partial<DesignNode>);
    },
    [updateNode]
  );

  // Handle node delete
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setConfirmDialog({
        open: true,
        title: 'Delete Node',
        message: 'Are you sure you want to delete this node? This action cannot be undone.',
        onConfirm: () => {
          removeNode(nodeId);
          setSelectedNodeId(null);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [removeNode]
  );

  // Handle node duplicate
  const handleNodeDuplicate = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const newId = `${node.type}-${Date.now()}`;
      const newNode: DesignNode = {
        id: newId,
        type: node.type || 'default',
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        data: { ...node.data },
        layer: (node.data as any).layer || currentLayer || 'platform',
      };

      addNode(newNode);
      setSelectedNodeId(newId);
    },
    [nodes, addNode, currentLayer]
  );

  // Toolbar actions
  const handleSave = useCallback(() => {
    triggerSave();
  }, [triggerSave]);

  const handleDeploy = useCallback(async () => {
    const errors = await validateCurrentLayer();
    if (errors.length > 0) {
      setSnackbar({
        open: true,
        message: `Cannot deploy: ${errors.length} validation error(s)`,
        severity: 'error',
      });
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Deploy Layer',
      message: `Are you sure you want to deploy the ${currentLayer} layer to ${selectedEnvironment}?`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        const success = await deployCurrentLayer();
        if (success) {
          setSnackbar({
            open: true,
            message: 'Deployment started successfully',
            severity: 'success',
          });
        }
      },
    });
  }, [validateCurrentLayer, currentLayer, selectedEnvironment, deployCurrentLayer]);

  const handleExport = useCallback(() => {
    setSnackbar({
      open: true,
      message: 'Export functionality coming soon',
      severity: 'info',
    });
  }, []);

  const handleUndo = useCallback(() => {
    // TODO: Implement undo
  }, []);

  const handleRedo = useCallback(() => {
    // TODO: Implement redo
  }, []);

  const handleSelectAll = useCallback(() => {
    // Select all nodes
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
  }, [setNodes]);

  const handleDeselect = useCallback(() => {
    setSelectedNodeId(null);
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [setNodes]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn();
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut();
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView();
  }, [reactFlowInstance]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeId) {
      handleNodeDelete(selectedNodeId);
    }
  }, [selectedNodeId, handleNodeDelete]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedNodeId) {
      handleNodeDuplicate(selectedNodeId);
    }
  }, [selectedNodeId, handleNodeDuplicate]);

  // Keyboard shortcuts
  useDesignerShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSave: handleSave,
    onDelete: handleDeleteSelected,
    onDuplicate: handleDuplicateSelected,
    onSelectAll: handleSelectAll,
    onDeselect: handleDeselect,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onFitView: handleFitView,
    canUndo,
    canRedo,
    hasSelection: !!selectedNodeId,
  });

  // Start wizard handler
  const handleStartWizard = useCallback(() => {
    setSidebarMode('wizard');
    setLeftSidebarCollapsed(false);
    if (!workflowId) {
      // Would open new design dialog in full implementation
      initializeWorkflow('New Design', 'aws', 'us-east-1');
    } else {
      openWizard();
    }
  }, [workflowId, initializeWorkflow, openWizard]);

  // Open templates handler
  const handleOpenTemplates = useCallback(() => {
    setBottomPanelExpanded(true);
    setBottomPanelTab(0);
  }, []);

  // Layer change handler
  const handleLayerChange = useCallback(
    (layer: LayerType) => {
      setCurrentLayer(layer);
    },
    [setCurrentLayer]
  );

  // Calculate layout
  const leftSidebarWidth = leftSidebarCollapsed
    ? LEFT_SIDEBAR_COLLAPSED_WIDTH
    : LEFT_SIDEBAR_WIDTH;
  const bottomPanelHeight = bottomPanelExpanded
    ? BOTTOM_PANEL_HEIGHT
    : BOTTOM_PANEL_COLLAPSED_HEIGHT;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Top Toolbar */}
      <Toolbar
        onSave={handleSave}
        onDeploy={handleDeploy}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        isDeploying={isDeploying}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSaved={lastSaved}
        currentLayer={currentLayer}
        onLayerChange={handleLayerChange}
        layerStatus={layerStatus}
        currentEnvironment={selectedEnvironment}
        onEnvironmentChange={selectEnvironment}
        validationErrors={validationErrors.length}
        canDeploy={nodes.length > 0 && validationErrors.filter((e) => e.severity === 'error').length === 0}
        onSaveAsTemplate={() => {}}
        onClearCanvas={() => {}}
      />

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <Box
          sx={{
            width: leftSidebarWidth,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s',
            overflow: 'hidden',
          }}
        >
          {/* Sidebar header with toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: leftSidebarCollapsed ? 'center' : 'space-between',
              p: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {!leftSidebarCollapsed && (
              <Tabs
                value={sidebarMode === 'palette' ? 0 : 1}
                onChange={(_, v) => setSidebarMode(v === 0 ? 'palette' : 'wizard')}
                sx={{ minHeight: 36 }}
              >
                <Tab
                  icon={<PaletteIcon />}
                  iconPosition="start"
                  label="Palette"
                  sx={{ minHeight: 36, py: 0 }}
                />
                <Tab
                  icon={<WizardIcon />}
                  iconPosition="start"
                  label="Wizard"
                  sx={{ minHeight: 36, py: 0 }}
                />
              </Tabs>
            )}
            <Tooltip title={leftSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <IconButton
                size="small"
                onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              >
                {leftSidebarCollapsed ? <ExpandLeftIcon /> : <CollapseLeftIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Sidebar content */}
          {!leftSidebarCollapsed && (
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {sidebarMode === 'palette' ? (
                <NodePalette currentLayer={currentLayer} />
              ) : (
                <Suspense fallback={<LoadingFallback />}>
                  <WizardDrawer />
                </Suspense>
              )}
            </Box>
          )}
        </Box>

        {/* Center Canvas */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ flex: 1, position: 'relative' }}>
            <Canvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              currentLayer={currentLayer}
              onStartWizard={handleStartWizard}
              onOpenTemplates={handleOpenTemplates}
              selectedNodeId={selectedNodeId}
            />
          </Box>

          {/* Bottom Panel */}
          <Paper
            elevation={2}
            sx={{
              height: bottomPanelHeight,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              transition: 'height 0.2s',
            }}
          >
            {/* Bottom panel header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 0.5,
                borderBottom: bottomPanelExpanded ? '1px solid' : 'none',
                borderColor: 'divider',
                cursor: 'pointer',
              }}
              onClick={() => setBottomPanelExpanded(!bottomPanelExpanded)}
            >
              <Tabs
                value={bottomPanelTab}
                onChange={(_, v) => {
                  setBottomPanelTab(v);
                  if (!bottomPanelExpanded) setBottomPanelExpanded(true);
                }}
                sx={{ flex: 1 }}
              >
                <Tab label="Templates" sx={{ minHeight: 36, py: 0 }} />
                <Tab label="Deployment" sx={{ minHeight: 36, py: 0 }} />
              </Tabs>
              <IconButton size="small">
                {bottomPanelExpanded ? <CollapseBottomIcon /> : <ExpandBottomIcon />}
              </IconButton>
            </Box>

            {/* Bottom panel content */}
            {bottomPanelExpanded && (
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Suspense fallback={<LoadingFallback />}>
                  {bottomPanelTab === 0 ? (
                    <TemplateBrowser />
                  ) : (
                    <LayerDeploymentPanel />
                  )}
                </Suspense>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Right Sidebar - Properties Panel */}
        <Box
          sx={{
            width: RIGHT_SIDEBAR_WIDTH,
            flexShrink: 0,
            borderLeft: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <PropertiesPanel
            selectedNode={selectedNode}
            edges={edges}
            nodes={nodes}
            currentEnvironment={selectedEnvironment}
            validationErrors={validationErrors}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
            onNodeDuplicate={handleNodeDuplicate}
          />
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirmDialog.onConfirm} autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/**
 * Visual Designer page with providers
 */
export default function VisualDesigner() {
  return (
    <DesignWizardProvider apiBaseUrl="/api/v1">
      <ReactFlowProvider>
        <VisualDesignerContent />
      </ReactFlowProvider>
    </DesignWizardProvider>
  );
}
