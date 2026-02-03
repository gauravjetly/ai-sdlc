/**
 * useEnvironmentConfig Hook
 * Manages environment-specific configuration state
 */

import { useCallback, useMemo } from 'react';
import { useDesignWizard } from '../../../../contexts/DesignWizardContext';
import { Environment, ConfigOverride, CostDelta } from '../types';
import { getValueAtPath, setValueAtPath, mergeConfigurations } from '../utils';

interface UseEnvironmentConfigReturn {
  // Current configuration
  config: Record<string, unknown>;

  // Effective configuration (base + overrides)
  effectiveConfig: Record<string, unknown>;

  // Overrides for this environment
  overrides: Record<string, ConfigOverride>;

  // Override management
  setOverride: (path: string, value: unknown, reason?: string) => void;
  removeOverride: (path: string) => void;
  clearAllOverrides: () => void;

  // Cost tracking
  costDelta: CostDelta | null;

  // Status
  hasUnsavedChanges: boolean;
  isProtected: boolean;
}

export function useEnvironmentConfig(
  environment: Environment
): UseEnvironmentConfigReturn {
  const {
    environments,
    updateEnvironmentConfig,
    hasUnsavedChanges,
  } = useDesignWizard();

  // Get raw environment config
  const rawConfig = useMemo(() => {
    return environments[environment === 'staging' ? 'staging' : environment] || {};
  }, [environments, environment]);

  // Get base config (always dev)
  const baseConfig = useMemo(() => {
    return environments.dev || {};
  }, [environments]);

  // Calculate current overrides
  const overrides = useMemo<Record<string, ConfigOverride>>(() => {
    const result: Record<string, ConfigOverride> = {};

    // Compare instance sizes
    const rawInstanceSizes = (rawConfig as any).instanceSizes || {};
    const baseInstanceSizes = (baseConfig as any).instanceSizes || {};

    for (const [key, value] of Object.entries(rawInstanceSizes)) {
      if (baseInstanceSizes[key] !== value) {
        const path = `compute.instanceSizes.${key}`;
        result[path] = {
          path,
          originalValue: baseInstanceSizes[key],
          overrideValue: value,
          modifiedBy: 'current-user',
          modifiedAt: new Date(),
        };
      }
    }

    // Compare replica counts
    const rawReplicaCounts = (rawConfig as any).replicaCounts || {};
    const baseReplicaCounts = (baseConfig as any).replicaCounts || {};

    for (const [key, value] of Object.entries(rawReplicaCounts)) {
      if (baseReplicaCounts[key] !== value) {
        const path = `compute.replicaCounts.${key}`;
        result[path] = {
          path,
          originalValue: baseReplicaCounts[key],
          overrideValue: value,
          modifiedBy: 'current-user',
          modifiedAt: new Date(),
        };
      }
    }

    return result;
  }, [rawConfig, baseConfig]);

  // Calculate effective configuration
  const effectiveConfig = useMemo(() => {
    // Start with base config structure
    const effective: Record<string, unknown> = {
      compute: {
        instanceSizes: { ...(baseConfig as any).instanceSizes },
        replicaCounts: { ...(baseConfig as any).replicaCounts },
      },
      variables: (rawConfig as any).variables || {},
      enabledFeatures: (rawConfig as any).enabledFeatures || [],
    };

    // Apply overrides
    for (const override of Object.values(overrides)) {
      setValueAtPath(effective, override.path, override.overrideValue);
    }

    return effective;
  }, [baseConfig, rawConfig, overrides]);

  // Calculate cost delta
  const costDelta = useMemo<CostDelta | null>(() => {
    // Simplified cost calculation based on overrides
    const costPerSizeChange = 20;
    const costPerReplicaChange = 15;

    let delta = 0;
    const breakdown: CostDelta['breakdown'] = [];

    for (const override of Object.values(overrides)) {
      if (override.path.includes('instanceSizes')) {
        delta += costPerSizeChange;
        breakdown.push({
          category: 'compute',
          baseCost: 0,
          newCost: costPerSizeChange,
          delta: costPerSizeChange,
        });
      } else if (override.path.includes('replicaCounts')) {
        const diff =
          Number(override.overrideValue) - Number(override.originalValue || 0);
        delta += diff * costPerReplicaChange;
        breakdown.push({
          category: 'compute',
          baseCost: 0,
          newCost: diff * costPerReplicaChange,
          delta: diff * costPerReplicaChange,
        });
      }
    }

    const baseCost = 100;
    return {
      baseCost,
      effectiveCost: baseCost + delta,
      delta,
      percentChange: (delta / baseCost) * 100,
      breakdown,
    };
  }, [overrides]);

  // Set an override
  const setOverride = useCallback(
    (path: string, value: unknown, reason?: string) => {
      const parts = path.split('.');

      if (parts[0] === 'compute') {
        if (parts[1] === 'instanceSizes' && parts[2]) {
          updateEnvironmentConfig(environment, {
            instanceSizes: {
              ...(rawConfig as any).instanceSizes,
              [parts[2]]: value as string,
            },
          });
        } else if (parts[1] === 'replicaCounts' && parts[2]) {
          updateEnvironmentConfig(environment, {
            replicaCounts: {
              ...(rawConfig as any).replicaCounts,
              [parts[2]]: value as number,
            },
          });
        }
      }
    },
    [environment, rawConfig, updateEnvironmentConfig]
  );

  // Remove an override (revert to base)
  const removeOverride = useCallback(
    (path: string) => {
      const override = overrides[path];
      if (override) {
        setOverride(path, override.originalValue);
      }
    },
    [overrides, setOverride]
  );

  // Clear all overrides
  const clearAllOverrides = useCallback(() => {
    updateEnvironmentConfig(environment, {
      instanceSizes: { ...(baseConfig as any).instanceSizes },
      replicaCounts: { ...(baseConfig as any).replicaCounts },
    });
  }, [environment, baseConfig, updateEnvironmentConfig]);

  return {
    config: rawConfig,
    effectiveConfig,
    overrides,
    setOverride,
    removeOverride,
    clearAllOverrides,
    costDelta,
    hasUnsavedChanges,
    isProtected: environment === 'prod',
  };
}
