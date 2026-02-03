/**
 * Design Wizard Context
 * Central state management for the Infrastructure Designer wizard
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

// =============================================
// TYPES
// =============================================

export type LayerType = 'network' | 'platform' | 'devops' | 'fullstack';
export type Environment = 'dev' | 'staging' | 'prod';
export type CloudProvider = 'aws' | 'oci' | 'azure' | 'gcp';
export type DesignStatus = 'draft' | 'validated' | 'deploying' | 'deployed' | 'failed';
export type LayerStatus = 'pending' | 'complete' | 'deployed' | 'failed';

export interface Position {
  x: number;
  y: number;
}

export interface DesignNode {
  id: string;
  type: string;
  position: Position;
  data: Record<string, any>;
  layer: LayerType;
  parentId?: string;
  width?: number;
  height?: number;
}

export interface DesignEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  label?: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DesignData {
  nodes: DesignNode[];
  edges: DesignEdge[];
  viewport?: Viewport;
}

export interface LayerData {
  nodes: DesignNode[];
  edges: DesignEdge[];
  config?: Record<string, any>;
}

export interface EnvironmentConfig {
  instanceSizes?: Record<string, string>;
  replicaCounts?: Record<string, number>;
  enabledFeatures?: string[];
  variables?: Record<string, string>;
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  nodeId?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  templateData: {
    nodes: DesignNode[];
    edges: DesignEdge[];
  };
  layerType?: LayerType;
}

// =============================================
// STATE INTERFACE
// =============================================

export interface DesignWizardState {
  // Workflow Identity
  workflowId: string | null;
  designId: string | null;
  designName: string;

  // Layer Navigation
  currentLayer: LayerType | null;
  currentStep: number;

  // Layer Status
  layers: {
    network: { status: LayerStatus; data: LayerData | null };
    platform: { status: LayerStatus; data: LayerData | null };
    devops: { status: LayerStatus; data: LayerData | null };
  };

  // Design Data (combined view)
  designData: DesignData;

  // Environment
  selectedEnvironment: Environment;
  environments: {
    dev: EnvironmentConfig;
    staging: EnvironmentConfig;
    prod: EnvironmentConfig;
  };

  // Template
  selectedTemplate: Template | null;

  // Cloud Configuration
  cloud: CloudProvider;
  region: string;

  // UI State
  isWizardOpen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isDeploying: boolean;
  validationErrors: ValidationError[];

  // Dirty state tracking
  hasUnsavedChanges: boolean;
}

// =============================================
// ACTION TYPES
// =============================================

type DesignWizardAction =
  | { type: 'INIT_WORKFLOW'; payload: { workflowId: string; designId: string; designName: string; cloud: CloudProvider; region: string } }
  | { type: 'LOAD_WORKFLOW'; payload: Partial<DesignWizardState> }
  | { type: 'SET_CURRENT_LAYER'; payload: LayerType }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'UPDATE_LAYER_DATA'; payload: { layer: LayerType; data: Partial<LayerData> } }
  | { type: 'SET_LAYER_STATUS'; payload: { layer: LayerType; status: LayerStatus } }
  | { type: 'UPDATE_DESIGN_DATA'; payload: Partial<DesignData> }
  | { type: 'ADD_NODE'; payload: DesignNode }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<DesignNode> } }
  | { type: 'REMOVE_NODE'; payload: string }
  | { type: 'ADD_EDGE'; payload: DesignEdge }
  | { type: 'REMOVE_EDGE'; payload: string }
  | { type: 'SET_ENVIRONMENT'; payload: Environment }
  | { type: 'UPDATE_ENV_CONFIG'; payload: { env: Environment; config: Partial<EnvironmentConfig> } }
  | { type: 'SET_TEMPLATE'; payload: Template | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_DEPLOYING'; payload: boolean }
  | { type: 'SET_VALIDATION_ERRORS'; payload: ValidationError[] }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'OPEN_WIZARD' }
  | { type: 'CLOSE_WIZARD' }
  | { type: 'MARK_SAVED' }
  | { type: 'RESET_WIZARD' };

// =============================================
// INITIAL STATE
// =============================================

const initialState: DesignWizardState = {
  workflowId: null,
  designId: null,
  designName: '',
  currentLayer: null,
  currentStep: 1,
  layers: {
    network: { status: 'pending', data: null },
    platform: { status: 'pending', data: null },
    devops: { status: 'pending', data: null },
  },
  designData: {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  selectedEnvironment: 'dev',
  environments: {
    dev: { instanceSizes: {}, replicaCounts: {}, enabledFeatures: [], variables: {} },
    staging: { instanceSizes: {}, replicaCounts: {}, enabledFeatures: [], variables: {} },
    prod: { instanceSizes: {}, replicaCounts: {}, enabledFeatures: [], variables: {} },
  },
  selectedTemplate: null,
  cloud: 'aws',
  region: 'us-east-1',
  isWizardOpen: false,
  isLoading: false,
  isSaving: false,
  isDeploying: false,
  validationErrors: [],
  hasUnsavedChanges: false,
};

// =============================================
// REDUCER
// =============================================

function designWizardReducer(
  state: DesignWizardState,
  action: DesignWizardAction
): DesignWizardState {
  switch (action.type) {
    case 'INIT_WORKFLOW':
      return {
        ...initialState,
        workflowId: action.payload.workflowId,
        designId: action.payload.designId,
        designName: action.payload.designName,
        cloud: action.payload.cloud,
        region: action.payload.region,
        currentLayer: 'network',
        currentStep: 1,
        isWizardOpen: true,
      };

    case 'LOAD_WORKFLOW':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
      };

    case 'SET_CURRENT_LAYER':
      return {
        ...state,
        currentLayer: action.payload,
        currentStep: 1,
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };

    case 'UPDATE_LAYER_DATA': {
      const { layer, data } = action.payload;
      return {
        ...state,
        layers: {
          ...state.layers,
          [layer]: {
            ...state.layers[layer],
            data: state.layers[layer].data
              ? { ...state.layers[layer].data, ...data }
              : (data as LayerData),
          },
        },
        hasUnsavedChanges: true,
      };
    }

    case 'SET_LAYER_STATUS': {
      const { layer, status } = action.payload;
      return {
        ...state,
        layers: {
          ...state.layers,
          [layer]: {
            ...state.layers[layer],
            status,
          },
        },
      };
    }

    case 'UPDATE_DESIGN_DATA':
      return {
        ...state,
        designData: {
          ...state.designData,
          ...action.payload,
        },
        hasUnsavedChanges: true,
      };

    case 'ADD_NODE':
      return {
        ...state,
        designData: {
          ...state.designData,
          nodes: [...state.designData.nodes, action.payload],
        },
        hasUnsavedChanges: true,
      };

    case 'UPDATE_NODE':
      return {
        ...state,
        designData: {
          ...state.designData,
          nodes: state.designData.nodes.map((node) =>
            node.id === action.payload.id
              ? { ...node, ...action.payload.updates }
              : node
          ),
        },
        hasUnsavedChanges: true,
      };

    case 'REMOVE_NODE':
      return {
        ...state,
        designData: {
          ...state.designData,
          nodes: state.designData.nodes.filter((n) => n.id !== action.payload),
          edges: state.designData.edges.filter(
            (e) => e.source !== action.payload && e.target !== action.payload
          ),
        },
        hasUnsavedChanges: true,
      };

    case 'ADD_EDGE':
      return {
        ...state,
        designData: {
          ...state.designData,
          edges: [...state.designData.edges, action.payload],
        },
        hasUnsavedChanges: true,
      };

    case 'REMOVE_EDGE':
      return {
        ...state,
        designData: {
          ...state.designData,
          edges: state.designData.edges.filter((e) => e.id !== action.payload),
        },
        hasUnsavedChanges: true,
      };

    case 'SET_ENVIRONMENT':
      return {
        ...state,
        selectedEnvironment: action.payload,
      };

    case 'UPDATE_ENV_CONFIG':
      return {
        ...state,
        environments: {
          ...state.environments,
          [action.payload.env]: {
            ...state.environments[action.payload.env],
            ...action.payload.config,
          },
        },
        hasUnsavedChanges: true,
      };

    case 'SET_TEMPLATE':
      return {
        ...state,
        selectedTemplate: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_SAVING':
      return {
        ...state,
        isSaving: action.payload,
      };

    case 'SET_DEPLOYING':
      return {
        ...state,
        isDeploying: action.payload,
      };

    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: action.payload,
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        validationErrors: [],
      };

    case 'OPEN_WIZARD':
      return {
        ...state,
        isWizardOpen: true,
      };

    case 'CLOSE_WIZARD':
      return {
        ...state,
        isWizardOpen: false,
      };

    case 'MARK_SAVED':
      return {
        ...state,
        hasUnsavedChanges: false,
      };

    case 'RESET_WIZARD':
      return initialState;

    default:
      return state;
  }
}

// =============================================
// CONTEXT INTERFACE
// =============================================

interface DesignWizardContextValue extends DesignWizardState {
  // Workflow Actions
  initializeWorkflow: (
    designName: string,
    cloud: CloudProvider,
    region: string,
    templateId?: string
  ) => Promise<void>;
  loadWorkflow: (workflowId: string) => Promise<void>;

  // Layer Navigation
  advanceToNextLayer: () => Promise<boolean>;
  goToPreviousLayer: () => void;
  setCurrentStep: (step: number) => void;
  setCurrentLayer: (layer: LayerType) => void;

  // Data Updates
  updateLayerData: (layer: LayerType, data: Partial<LayerData>) => void;
  updateDesignData: (data: Partial<DesignData>) => void;
  addNode: (node: DesignNode) => void;
  updateNode: (nodeId: string, updates: Partial<DesignNode>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: DesignEdge) => void;
  removeEdge: (edgeId: string) => void;

  // Environment
  selectEnvironment: (env: Environment) => void;
  updateEnvironmentConfig: (env: Environment, config: Partial<EnvironmentConfig>) => void;

  // Template
  setTemplate: (template: Template | null) => void;

  // Persistence
  saveProgress: () => Promise<void>;

  // Validation
  validateCurrentLayer: () => Promise<ValidationError[]>;
  clearErrors: () => void;

  // Deployment
  deployCurrentLayer: () => Promise<boolean>;

  // UI
  openWizard: () => void;
  closeWizard: () => void;
  resetWizard: () => void;

  // Computed
  isLayerComplete: (layer: LayerType) => boolean;
  canAdvance: () => boolean;
  getLayerNodes: (layer: LayerType) => DesignNode[];
}

// =============================================
// CONTEXT
// =============================================

const DesignWizardContext = createContext<DesignWizardContextValue | null>(null);

// =============================================
// PROVIDER
// =============================================

interface DesignWizardProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
}

export function DesignWizardProvider({
  children,
  apiBaseUrl = '/api/v1',
}: DesignWizardProviderProps) {
  const [state, dispatch] = useReducer(designWizardReducer, initialState);

  // API Helper
  const api = useCallback(
    async (endpoint: string, options?: RequestInit) => {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'API request failed');
      }
      return data;
    },
    [apiBaseUrl]
  );

  // Initialize Workflow
  const initializeWorkflow = useCallback(
    async (
      designName: string,
      cloud: CloudProvider,
      region: string,
      templateId?: string
    ) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await api('/workflows', {
          method: 'POST',
          body: JSON.stringify({
            designName,
            cloud,
            region,
            templateId,
          }),
        });

        dispatch({
          type: 'INIT_WORKFLOW',
          payload: {
            workflowId: response.data.workflow.id,
            designId: response.data.designId,
            designName,
            cloud,
            region,
          },
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [api]
  );

  // Load Workflow
  const loadWorkflow = useCallback(
    async (workflowId: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await api(`/workflows/${workflowId}`);
        const { workflow, design, layers } = response.data;

        dispatch({
          type: 'LOAD_WORKFLOW',
          payload: {
            workflowId: workflow.id,
            designId: workflow.designId,
            designName: design.name,
            currentLayer: workflow.currentLayer,
            currentStep: workflow.currentStep,
            layers: {
              network: {
                status: workflow.networkComplete ? 'complete' : 'pending',
                data: workflow.networkData,
              },
              platform: {
                status: workflow.platformComplete ? 'complete' : 'pending',
                data: workflow.platformData,
              },
              devops: {
                status: workflow.devopsComplete ? 'complete' : 'pending',
                data: workflow.devopsData,
              },
            },
            designData: design.designData,
            environments: workflow.environments,
            cloud: design.cloud,
            region: design.region,
            isWizardOpen: true,
          },
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [api]
  );

  // Advance Layer
  const advanceToNextLayer = useCallback(async (): Promise<boolean> => {
    if (!state.workflowId || !state.currentLayer) return false;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await api(`/workflows/${state.workflowId}/advance`, {
        method: 'POST',
        body: JSON.stringify({ validateFirst: true }),
      });

      if (response.success) {
        const workflow = response.data;
        dispatch({
          type: 'SET_LAYER_STATUS',
          payload: { layer: state.currentLayer, status: 'complete' },
        });
        if (workflow.currentLayer) {
          dispatch({ type: 'SET_CURRENT_LAYER', payload: workflow.currentLayer });
        }
        return true;
      }
      return false;
    } catch (error: any) {
      if (error.validationErrors) {
        dispatch({ type: 'SET_VALIDATION_ERRORS', payload: error.validationErrors });
      }
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [api, state.workflowId, state.currentLayer]);

  // Go Back Layer
  const goToPreviousLayer = useCallback(() => {
    const layerOrder: LayerType[] = ['network', 'platform', 'devops'];
    const currentIndex = state.currentLayer ? layerOrder.indexOf(state.currentLayer) : 0;
    if (currentIndex > 0) {
      dispatch({ type: 'SET_CURRENT_LAYER', payload: layerOrder[currentIndex - 1] });
    }
  }, [state.currentLayer]);

  // Set Current Step
  const setCurrentStep = useCallback((step: number) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  }, []);

  // Set Current Layer
  const setCurrentLayer = useCallback((layer: LayerType) => {
    dispatch({ type: 'SET_CURRENT_LAYER', payload: layer });
  }, []);

  // Update Layer Data
  const updateLayerData = useCallback((layer: LayerType, data: Partial<LayerData>) => {
    dispatch({ type: 'UPDATE_LAYER_DATA', payload: { layer, data } });
  }, []);

  // Update Design Data
  const updateDesignData = useCallback((data: Partial<DesignData>) => {
    dispatch({ type: 'UPDATE_DESIGN_DATA', payload: data });
  }, []);

  // Node Management
  const addNode = useCallback((node: DesignNode) => {
    dispatch({ type: 'ADD_NODE', payload: node });
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<DesignNode>) => {
    dispatch({ type: 'UPDATE_NODE', payload: { id: nodeId, updates } });
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    dispatch({ type: 'REMOVE_NODE', payload: nodeId });
  }, []);

  // Edge Management
  const addEdge = useCallback((edge: DesignEdge) => {
    dispatch({ type: 'ADD_EDGE', payload: edge });
  }, []);

  const removeEdge = useCallback((edgeId: string) => {
    dispatch({ type: 'REMOVE_EDGE', payload: edgeId });
  }, []);

  // Environment Management
  const selectEnvironment = useCallback((env: Environment) => {
    dispatch({ type: 'SET_ENVIRONMENT', payload: env });
  }, []);

  const updateEnvironmentConfig = useCallback(
    (env: Environment, config: Partial<EnvironmentConfig>) => {
      dispatch({ type: 'UPDATE_ENV_CONFIG', payload: { env, config } });
    },
    []
  );

  // Template
  const setTemplate = useCallback((template: Template | null) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
  }, []);

  // Save Progress
  const saveProgress = useCallback(async () => {
    if (!state.workflowId) return;

    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await api(`/workflows/${state.workflowId}`, {
        method: 'PUT',
        body: JSON.stringify({
          currentLayer: state.currentLayer,
          currentStep: state.currentStep,
          networkData: state.layers.network.data,
          platformData: state.layers.platform.data,
          devopsData: state.layers.devops.data,
          environments: state.environments,
        }),
      });
      dispatch({ type: 'MARK_SAVED' });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [api, state]);

  // Validate Layer
  const validateCurrentLayer = useCallback(async (): Promise<ValidationError[]> => {
    if (!state.workflowId || !state.currentLayer) return [];

    try {
      const response = await api(`/workflows/${state.workflowId}/validate`, {
        method: 'POST',
        body: JSON.stringify({ layer: state.currentLayer }),
      });
      const errors = response.data.errors || [];
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
      return errors;
    } catch {
      return [];
    }
  }, [api, state.workflowId, state.currentLayer]);

  // Clear Errors
  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  // Deploy Layer
  const deployCurrentLayer = useCallback(async (): Promise<boolean> => {
    if (!state.workflowId || !state.currentLayer) return false;

    dispatch({ type: 'SET_DEPLOYING', payload: true });
    try {
      const response = await api(`/workflows/${state.workflowId}/deploy`, {
        method: 'POST',
        body: JSON.stringify({
          layer: state.currentLayer,
          environment: state.selectedEnvironment,
        }),
      });

      if (response.success) {
        dispatch({
          type: 'SET_LAYER_STATUS',
          payload: { layer: state.currentLayer, status: 'deployed' },
        });
        return true;
      }
      return false;
    } finally {
      dispatch({ type: 'SET_DEPLOYING', payload: false });
    }
  }, [api, state.workflowId, state.currentLayer, state.selectedEnvironment]);

  // UI Actions
  const openWizard = useCallback(() => {
    dispatch({ type: 'OPEN_WIZARD' });
  }, []);

  const closeWizard = useCallback(() => {
    dispatch({ type: 'CLOSE_WIZARD' });
  }, []);

  const resetWizard = useCallback(() => {
    dispatch({ type: 'RESET_WIZARD' });
  }, []);

  // Computed Values
  const isLayerComplete = useCallback(
    (layer: LayerType): boolean => {
      return (
        state.layers[layer].status === 'complete' ||
        state.layers[layer].status === 'deployed'
      );
    },
    [state.layers]
  );

  const canAdvance = useCallback((): boolean => {
    if (!state.currentLayer) return false;
    const currentLayerData = state.layers[state.currentLayer].data;
    return currentLayerData !== null && currentLayerData.nodes.length > 0;
  }, [state.currentLayer, state.layers]);

  const getLayerNodes = useCallback(
    (layer: LayerType): DesignNode[] => {
      return state.designData.nodes.filter((node) => node.layer === layer);
    },
    [state.designData.nodes]
  );

  // Context Value
  const value = useMemo<DesignWizardContextValue>(
    () => ({
      ...state,
      initializeWorkflow,
      loadWorkflow,
      advanceToNextLayer,
      goToPreviousLayer,
      setCurrentStep,
      setCurrentLayer,
      updateLayerData,
      updateDesignData,
      addNode,
      updateNode,
      removeNode,
      addEdge,
      removeEdge,
      selectEnvironment,
      updateEnvironmentConfig,
      setTemplate,
      saveProgress,
      validateCurrentLayer,
      clearErrors,
      deployCurrentLayer,
      openWizard,
      closeWizard,
      resetWizard,
      isLayerComplete,
      canAdvance,
      getLayerNodes,
    }),
    [
      state,
      initializeWorkflow,
      loadWorkflow,
      advanceToNextLayer,
      goToPreviousLayer,
      setCurrentStep,
      setCurrentLayer,
      updateLayerData,
      updateDesignData,
      addNode,
      updateNode,
      removeNode,
      addEdge,
      removeEdge,
      selectEnvironment,
      updateEnvironmentConfig,
      setTemplate,
      saveProgress,
      validateCurrentLayer,
      clearErrors,
      deployCurrentLayer,
      openWizard,
      closeWizard,
      resetWizard,
      isLayerComplete,
      canAdvance,
      getLayerNodes,
    ]
  );

  return (
    <DesignWizardContext.Provider value={value}>
      {children}
    </DesignWizardContext.Provider>
  );
}

// =============================================
// HOOKS
// =============================================

export function useDesignWizard(): DesignWizardContextValue {
  const context = useContext(DesignWizardContext);
  if (!context) {
    throw new Error('useDesignWizard must be used within a DesignWizardProvider');
  }
  return context;
}

// Selective hooks for performance
export function useCurrentLayer() {
  const { currentLayer, currentStep } = useDesignWizard();
  return { currentLayer, currentStep };
}

export function useLayerStatus(layer: LayerType) {
  const { layers } = useDesignWizard();
  return layers[layer];
}

export function useDesignNodes() {
  const { designData } = useDesignWizard();
  return designData.nodes;
}

export function useWizardUI() {
  const {
    isWizardOpen,
    isLoading,
    isSaving,
    isDeploying,
    validationErrors,
    openWizard,
    closeWizard,
  } = useDesignWizard();
  return {
    isWizardOpen,
    isLoading,
    isSaving,
    isDeploying,
    validationErrors,
    openWizard,
    closeWizard,
  };
}

export default DesignWizardContext;
