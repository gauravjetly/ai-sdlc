/**
 * Affinity Rules Builder
 * Creates Kubernetes affinity and anti-affinity rules for zone distribution
 */

import { createLogger } from '../../utils/logger.js';
import {
  AffinityRules,
  PodAffinityTerm,
  WeightedPodAffinityTerm,
  NodeSelector,
  PreferredSchedulingTerm,
  LabelSelector
} from '../types.js';

const logger = createLogger('AffinityRuleBuilder');

/**
 * Builds Kubernetes affinity and anti-affinity rules
 */
export class AffinityRuleBuilder {
  /**
   * Create pod anti-affinity rules to spread pods across zones
   */
  createPodAntiAffinity(
    application: string,
    namespace?: string
  ): AffinityRules {
    logger.info('Creating pod anti-affinity rules', {
      application,
      namespace
    });

    const labelSelector: LabelSelector = {
      matchExpressions: [
        {
          key: 'app',
          operator: 'In',
          values: [application]
        }
      ]
    };

    const requiredTerm: PodAffinityTerm = {
      labelSelector,
      topologyKey: 'topology.kubernetes.io/zone'
    };

    if (namespace) {
      requiredTerm.namespaces = [namespace];
    }

    const rules: AffinityRules = {
      podAntiAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: [requiredTerm]
      }
    };

    logger.debug('Pod anti-affinity rules created', {
      application,
      topologyKey: 'topology.kubernetes.io/zone'
    });

    return rules;
  }

  /**
   * Create preferred pod anti-affinity (soft constraint)
   */
  createPreferredPodAntiAffinity(
    application: string,
    weight: number = 100,
    namespace?: string
  ): AffinityRules {
    logger.info('Creating preferred pod anti-affinity rules', {
      application,
      weight,
      namespace
    });

    const labelSelector: LabelSelector = {
      matchExpressions: [
        {
          key: 'app',
          operator: 'In',
          values: [application]
        }
      ]
    };

    const podAffinityTerm: PodAffinityTerm = {
      labelSelector,
      topologyKey: 'topology.kubernetes.io/zone'
    };

    if (namespace) {
      podAffinityTerm.namespaces = [namespace];
    }

    const preferredTerm: WeightedPodAffinityTerm = {
      weight,
      podAffinityTerm
    };

    const rules: AffinityRules = {
      podAntiAffinity: {
        preferredDuringSchedulingIgnoredDuringExecution: [preferredTerm]
      }
    };

    logger.debug('Preferred pod anti-affinity rules created', {
      application,
      weight
    });

    return rules;
  }

  /**
   * Create node affinity to prefer specific zones
   */
  createNodeAffinity(preferredZones: string[]): AffinityRules {
    logger.info('Creating node affinity rules', {
      preferredZones
    });

    const preferredTerms: PreferredSchedulingTerm[] = preferredZones.map((zone, index) => ({
      weight: 100 - (index * 10), // Decreasing weights for priority
      preference: {
        matchExpressions: [
          {
            key: 'topology.kubernetes.io/zone',
            operator: 'In',
            values: [zone]
          }
        ]
      }
    }));

    const rules: AffinityRules = {
      nodeAffinity: {
        preferredDuringSchedulingIgnoredDuringExecution: preferredTerms
      }
    };

    logger.debug('Node affinity rules created', {
      zones: preferredZones.length
    });

    return rules;
  }

  /**
   * Create required node affinity (hard constraint)
   */
  createRequiredNodeAffinity(allowedZones: string[]): AffinityRules {
    logger.info('Creating required node affinity rules', {
      allowedZones
    });

    const nodeSelector: NodeSelector = {
      nodeSelectorTerms: [
        {
          matchExpressions: [
            {
              key: 'topology.kubernetes.io/zone',
              operator: 'In',
              values: allowedZones
            }
          ]
        }
      ]
    };

    const rules: AffinityRules = {
      nodeAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: nodeSelector
      }
    };

    logger.debug('Required node affinity rules created', {
      allowedZones
    });

    return rules;
  }

  /**
   * Create combined affinity rules (both pod anti-affinity and node affinity)
   */
  createCombinedRules(
    application: string,
    preferredZones: string[],
    namespace?: string
  ): AffinityRules {
    logger.info('Creating combined affinity rules', {
      application,
      preferredZones,
      namespace
    });

    const podAntiAffinity = this.createPodAntiAffinity(application, namespace);
    const nodeAffinity = this.createNodeAffinity(preferredZones);

    const combined: AffinityRules = {
      podAntiAffinity: podAntiAffinity.podAntiAffinity,
      nodeAffinity: nodeAffinity.nodeAffinity
    };

    logger.debug('Combined affinity rules created', {
      application,
      zones: preferredZones.length
    });

    return combined;
  }

  /**
   * Create anti-affinity for multiple applications
   * Useful for separating different services
   */
  createMultiAppAntiAffinity(applications: string[]): AffinityRules {
    logger.info('Creating multi-app anti-affinity rules', {
      applications
    });

    const labelSelector: LabelSelector = {
      matchExpressions: [
        {
          key: 'app',
          operator: 'In',
          values: applications
        }
      ]
    };

    const requiredTerm: PodAffinityTerm = {
      labelSelector,
      topologyKey: 'kubernetes.io/hostname' // Prevent co-location on same node
    };

    const rules: AffinityRules = {
      podAntiAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: [requiredTerm]
      }
    };

    logger.debug('Multi-app anti-affinity rules created', {
      applications
    });

    return rules;
  }

  /**
   * Create zone-level and node-level anti-affinity
   * Maximum spread across infrastructure
   */
  createMaxSpreadRules(application: string, namespace?: string): AffinityRules {
    logger.info('Creating max spread rules', {
      application,
      namespace
    });

    const labelSelector: LabelSelector = {
      matchExpressions: [
        {
          key: 'app',
          operator: 'In',
          values: [application]
        }
      ]
    };

    // Zone-level anti-affinity (required)
    const zoneTerm: PodAffinityTerm = {
      labelSelector,
      topologyKey: 'topology.kubernetes.io/zone'
    };

    // Node-level anti-affinity (preferred)
    const nodeTerm: PodAffinityTerm = {
      labelSelector,
      topologyKey: 'kubernetes.io/hostname'
    };

    if (namespace) {
      zoneTerm.namespaces = [namespace];
      nodeTerm.namespaces = [namespace];
    }

    const rules: AffinityRules = {
      podAntiAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: [zoneTerm],
        preferredDuringSchedulingIgnoredDuringExecution: [
          {
            weight: 100,
            podAffinityTerm: nodeTerm
          }
        ]
      }
    };

    logger.debug('Max spread rules created', {
      application,
      hasRequired: true,
      hasPreferred: true
    });

    return rules;
  }

  /**
   * Create affinity to co-locate with specific application
   * Useful for service mesh sidecars or data locality
   */
  createCoLocationRules(targetApplication: string, namespace?: string): AffinityRules {
    logger.info('Creating co-location rules', {
      targetApplication,
      namespace
    });

    const labelSelector: LabelSelector = {
      matchExpressions: [
        {
          key: 'app',
          operator: 'In',
          values: [targetApplication]
        }
      ]
    };

    const requiredTerm: PodAffinityTerm = {
      labelSelector,
      topologyKey: 'kubernetes.io/hostname' // Must be on same node
    };

    if (namespace) {
      requiredTerm.namespaces = [namespace];
    }

    const rules: AffinityRules = {
      podAntiAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: [requiredTerm]
      }
    };

    logger.debug('Co-location rules created', {
      targetApplication
    });

    return rules;
  }

  /**
   * Merge multiple affinity rules
   */
  mergeRules(...rules: AffinityRules[]): AffinityRules {
    logger.info('Merging affinity rules', {
      count: rules.length
    });

    const merged: AffinityRules = {
      podAntiAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: [],
        preferredDuringSchedulingIgnoredDuringExecution: []
      },
      nodeAffinity: {
        preferredDuringSchedulingIgnoredDuringExecution: []
      }
    };

    for (const rule of rules) {
      // Merge pod anti-affinity
      if (rule.podAntiAffinity?.requiredDuringSchedulingIgnoredDuringExecution) {
        merged.podAntiAffinity!.requiredDuringSchedulingIgnoredDuringExecution!.push(
          ...rule.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution
        );
      }

      if (rule.podAntiAffinity?.preferredDuringSchedulingIgnoredDuringExecution) {
        merged.podAntiAffinity!.preferredDuringSchedulingIgnoredDuringExecution!.push(
          ...rule.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution
        );
      }

      // Merge node affinity
      if (rule.nodeAffinity?.preferredDuringSchedulingIgnoredDuringExecution) {
        merged.nodeAffinity!.preferredDuringSchedulingIgnoredDuringExecution!.push(
          ...rule.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution
        );
      }

      if (rule.nodeAffinity?.requiredDuringSchedulingIgnoredDuringExecution) {
        merged.nodeAffinity!.requiredDuringSchedulingIgnoredDuringExecution =
          rule.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution;
      }
    }

    logger.debug('Affinity rules merged', {
      totalRequired: merged.podAntiAffinity?.requiredDuringSchedulingIgnoredDuringExecution?.length,
      totalPreferred: merged.podAntiAffinity?.preferredDuringSchedulingIgnoredDuringExecution?.length
    });

    return merged;
  }
}
