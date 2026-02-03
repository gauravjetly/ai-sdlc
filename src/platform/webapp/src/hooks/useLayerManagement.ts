/**
 * useLayerManagement Hook
 * Provides layer management functionality including deployment and rollback
 */

import { useCallback, useMemo } from 'react';
import { useDesignWizard } from '../contexts/DesignWizardContext';
import {
  LayerType,
  LayerStatus,
  Environment,
  LAYER_DEPENDENCIES,
  CanDeployResult,
  DeploymentResult,
  RollbackResult,
} from '../types/layers';

/**
 * Hook for managing infrastructure layer deployments
 */
export function useLayerManagement() {
  const {
    workflowId,
    layers,
    selectedEnvironment,
    isDeploying,
    deployCurrentLayer,
  } = useDesignWizard();

  /**
   * Check if a layer can be deployed based on dependencies
   */
  const canDeployLayer = useCallback(
    (layer: LayerType): CanDeployResult => {
      // Check if already deploying
      if (isDeploying) {
        return {
          canDeploy: false,
          reason: 'A deployment is already in progress',
        };
      }

      // Check dependencies
      const deps = LAYER_DEPENDENCIES[layer] || [];
      const missingDeps: LayerType[] = [];

      for (const dep of deps) {
        const depStatus = layers[dep]?.status;
        if (depStatus !== 'deployed') {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length > 0) {
        return {
          canDeploy: false,
          reason: `Required layers not deployed: ${missingDeps.join(', ')}`,
          missingDependencies: missingDeps,
        };
      }

      // Check if layer is configured
      const layerData = layers[layer]?.data;
      if (!layerData || (layerData.nodes && layerData.nodes.length === 0)) {
        return {
          canDeploy: false,
          reason: 'Layer has no configuration. Complete the wizard first.',
        };
      }

      // Check if layer status allows deployment
      const layerStatus = layers[layer]?.status;
      if (layerStatus === 'deployed') {
        return {
          canDeploy: true,
          reason: 'Layer is already deployed. Deploying will update the infrastructure.',
        };
      }

      if (layerStatus === 'failed') {
        return {
          canDeploy: true,
          reason: 'Previous deployment failed. You can retry the deployment.',
        };
      }

      return { canDeploy: true };
    },
    [layers, isDeploying]
  );

  /**
   * Check if a layer can be rolled back
   */
  const canRollbackLayer = useCallback(
    (layer: LayerType): CanDeployResult => {
      if (isDeploying) {
        return {
          canDeploy: false,
          reason: 'A deployment is already in progress',
        };
      }

      const layerStatus = layers[layer]?.status;
      if (layerStatus !== 'deployed' && layerStatus !== 'failed') {
        return {
          canDeploy: false,
          reason: 'Layer has not been deployed',
        };
      }

      // Check if dependent layers are deployed
      const dependentLayers = getDependentLayers(layer);
      const deployedDependents = dependentLayers.filter(
        (dep) => layers[dep]?.status === 'deployed'
      );

      if (deployedDependents.length > 0) {
        return {
          canDeploy: false,
          reason: `Cannot rollback: ${deployedDependents.join(', ')} layer(s) depend on this layer`,
          missingDependencies: deployedDependents,
        };
      }

      return { canDeploy: true };
    },
    [layers, isDeploying]
  );

  /**
   * Get layers that depend on a given layer
   */
  const getDependentLayers = useCallback((layer: LayerType): LayerType[] => {
    const dependents: LayerType[] = [];
    for (const [key, deps] of Object.entries(LAYER_DEPENDENCIES)) {
      if (deps.includes(layer)) {
        dependents.push(key as LayerType);
      }
    }
    return dependents;
  }, []);

  /**
   * Get layer dependencies
   */
  const getLayerDependencies = useCallback((layer: LayerType): LayerType[] => {
    return LAYER_DEPENDENCIES[layer] || [];
  }, []);

  /**
   * Deploy a layer (using context method)
   */
  const deployLayer = useCallback(
    async (layer: LayerType, environment?: Environment): Promise<DeploymentResult> => {
      const check = canDeployLayer(layer);
      if (!check.canDeploy) {
        return {
          success: false,
          error: check.reason,
        };
      }

      try {
        const success = await deployCurrentLayer();
        return {
          success,
          deploymentId: success ? `deploy-${Date.now()}` : undefined,
          error: success ? undefined : 'Deployment failed',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [canDeployLayer, deployCurrentLayer]
  );

  /**
   * Rollback a layer deployment
   */
  const rollbackLayer = useCallback(
    async (layer: LayerType): Promise<RollbackResult> => {
      const check = canRollbackLayer(layer);
      if (!check.canDeploy) {
        return {
          success: false,
          error: check.reason,
        };
      }

      try {
        // Call rollback API
        const response = await fetch(`/api/v1/workflows/${workflowId}/rollback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layer }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Rollback failed');
        }

        const result = await response.json();
        return {
          success: true,
          affectedLayers: result.data?.affectedLayers,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [canRollbackLayer, workflowId]
  );

  /**
   * Get overall deployment status
   */
  const deploymentStatus = useMemo(() => {
    const networkStatus = layers.network?.status || 'pending';
    const platformStatus = layers.platform?.status || 'pending';
    const devopsStatus = layers.devops?.status || 'pending';

    if (networkStatus === 'deployed' && platformStatus === 'deployed' && devopsStatus === 'deployed') {
      return 'fully_deployed';
    }

    if (networkStatus === 'failed' || platformStatus === 'failed' || devopsStatus === 'failed') {
      return 'has_failures';
    }

    if (networkStatus === 'deployed' || platformStatus === 'deployed' || devopsStatus === 'deployed') {
      return 'partially_deployed';
    }

    return 'not_deployed';
  }, [layers]);

  /**
   * Get next layer to deploy
   */
  const getNextDeployableLayer = useCallback((): LayerType | null => {
    const order: LayerType[] = ['network', 'platform', 'devops'];

    for (const layer of order) {
      const status = layers[layer]?.status;
      if (status !== 'deployed') {
        const check = canDeployLayer(layer);
        if (check.canDeploy) {
          return layer;
        }
      }
    }

    return null;
  }, [layers, canDeployLayer]);

  return {
    // Check functions
    canDeployLayer,
    canRollbackLayer,

    // Dependency functions
    getLayerDependencies,
    getDependentLayers,

    // Action functions
    deployLayer,
    rollbackLayer,

    // Status
    deploymentStatus,
    getNextDeployableLayer,
    isDeploying,

    // Current environment
    selectedEnvironment,
  };
}

export default useLayerManagement;
