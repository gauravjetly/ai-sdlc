/**
 * Multi-AZ Manager
 * Distributes workloads across multiple availability zones for high availability
 */

import { createLogger } from '../../utils/logger.js';
import {
  WorkloadConfig,
  Distribution,
  ZoneDistribution,
  AvailabilityZone,
  AffinityRules,
  PodInfo
} from '../types.js';
import { ZoneBalancer } from './zone-balancer.js';
import { AffinityRuleBuilder } from './affinity-rules.js';

const logger = createLogger('MultiAZManager');

/**
 * Manages distribution of workloads across multiple availability zones
 */
export class MultiAZManager {
  private zoneBalancer: ZoneBalancer;
  private affinityBuilder: AffinityRuleBuilder;
  private minAvailabilityZones: number;

  constructor(minAvailabilityZones: number = 3) {
    this.minAvailabilityZones = minAvailabilityZones;
    this.zoneBalancer = new ZoneBalancer();
    this.affinityBuilder = new AffinityRuleBuilder();

    logger.info('Multi-AZ Manager initialized', {
      minAvailabilityZones: this.minAvailabilityZones
    });
  }

  /**
   * Distribute workload across availability zones
   */
  async distributeWorkload(config: WorkloadConfig): Promise<Distribution> {
    logger.info('Starting workload distribution', {
      application: config.application,
      region: config.region,
      replicas: config.replicas
    });

    // Get available zones
    const availableAZs = await this.getAvailableAZs(config.region);

    // Validate minimum zones
    if (availableAZs.length < this.minAvailabilityZones) {
      throw new Error(
        `Insufficient availability zones: found ${availableAZs.length}, ` +
        `minimum required ${this.minAvailabilityZones}`
      );
    }

    logger.info('Available zones retrieved', {
      zones: availableAZs.map(az => az.name),
      count: availableAZs.length
    });

    // Calculate pod distribution
    const zoneDistribution = this.zoneBalancer.calculateDistribution(
      availableAZs,
      config.replicas
    );

    logger.info('Distribution calculated', {
      distribution: zoneDistribution.map(zd => ({
        zone: zd.zone,
        replicas: zd.replicas
      }))
    });

    // Create pod anti-affinity rules
    const affinityRules = this.affinityBuilder.createPodAntiAffinity(
      config.application,
      config.namespace
    );

    // Deploy across zones
    const distribution = await this.deployAcrossZones(
      config,
      zoneDistribution,
      affinityRules
    );

    logger.info('Workload distribution complete', {
      application: config.application,
      totalReplicas: distribution.totalReplicas,
      zones: distribution.zones.length
    });

    return distribution;
  }

  /**
   * Get available availability zones for a region
   */
  async getAvailableAZs(region: string): Promise<AvailabilityZone[]> {
    // In production, this would call cloud provider APIs
    // For now, simulate with common AZ patterns

    const azPatterns = {
      'us-east-1': ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f'],
      'us-west-2': ['us-west-2a', 'us-west-2b', 'us-west-2c', 'us-west-2d'],
      'eu-west-1': ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
      'ap-southeast-1': ['ap-southeast-1a', 'ap-southeast-1b', 'ap-southeast-1c']
    };

    const zones = azPatterns[region as keyof typeof azPatterns] || ['zone-a', 'zone-b', 'zone-c'];

    return zones.map(zoneName => ({
      id: zoneName,
      name: zoneName,
      region,
      state: 'available' as const
    }));
  }

  /**
   * Deploy workload across zones with affinity rules
   */
  private async deployAcrossZones(
    config: WorkloadConfig,
    zoneDistribution: ZoneDistribution[],
    affinityRules: AffinityRules
  ): Promise<Distribution> {
    const distribution: Distribution = {
      application: config.application,
      region: config.region,
      zones: [],
      totalReplicas: config.replicas,
      affinityRules,
      createdAt: new Date().toISOString()
    };

    // Deploy to each zone
    for (const zoneDist of zoneDistribution) {
      const pods = await this.createPodsInZone(
        config,
        zoneDist.zone,
        zoneDist.replicas
      );

      distribution.zones.push({
        zone: zoneDist.zone,
        replicas: zoneDist.replicas,
        pods
      });

      logger.info('Pods created in zone', {
        zone: zoneDist.zone,
        replicas: zoneDist.replicas,
        pods: pods.length
      });
    }

    return distribution;
  }

  /**
   * Create pods in a specific zone
   */
  private async createPodsInZone(
    config: WorkloadConfig,
    zone: string,
    replicas: number
  ): Promise<PodInfo[]> {
    const pods: PodInfo[] = [];

    for (let i = 0; i < replicas; i++) {
      const podName = `${config.application}-${zone}-${i}`;

      // In production, this would create actual pods via Kubernetes API
      // For now, simulate pod creation
      pods.push({
        name: podName,
        zone,
        ready: true,
        status: 'Running',
        restarts: 0,
        age: '0s',
        ip: this.generatePodIP(),
        node: `node-${zone}-${Math.floor(Math.random() * 3)}`
      });
    }

    return pods;
  }

  /**
   * Handle zone failure by redistributing pods
   */
  async handleZoneFailure(
    distribution: Distribution,
    failedZone: string
  ): Promise<Distribution> {
    logger.warn('Handling zone failure', {
      application: distribution.application,
      failedZone,
      currentZones: distribution.zones.length
    });

    // Find the failed zone
    const failedZoneIndex = distribution.zones.findIndex(z => z.zone === failedZone);
    if (failedZoneIndex === -1) {
      throw new Error(`Zone ${failedZone} not found in distribution`);
    }

    const failedZoneData = distribution.zones[failedZoneIndex];
    const affectedReplicas = failedZoneData.replicas;

    // Remove failed zone
    distribution.zones.splice(failedZoneIndex, 1);

    // Redistribute affected replicas to remaining zones
    const remainingZones = distribution.zones;
    if (remainingZones.length < 2) {
      throw new Error('Insufficient remaining zones for redistribution');
    }

    const replicasPerZone = Math.ceil(affectedReplicas / remainingZones.length);

    // Add replicas to remaining zones
    for (let i = 0; i < remainingZones.length && affectedReplicas > 0; i++) {
      const additionalReplicas = Math.min(replicasPerZone, affectedReplicas);

      // Create new pods in this zone
      const newPods = await this.createPodsInZone(
        {
          application: distribution.application,
          region: distribution.region,
          replicas: additionalReplicas,
          namespace: undefined
        },
        remainingZones[i].zone,
        additionalReplicas
      );

      remainingZones[i].pods.push(...newPods);
      remainingZones[i].replicas += additionalReplicas;
    }

    logger.info('Zone failure handled', {
      application: distribution.application,
      failedZone,
      affectedReplicas,
      remainingZones: distribution.zones.length
    });

    return distribution;
  }

  /**
   * Rebalance workload across zones
   */
  async rebalanceWorkload(distribution: Distribution): Promise<Distribution> {
    logger.info('Rebalancing workload', {
      application: distribution.application,
      currentZones: distribution.zones.length,
      totalReplicas: distribution.totalReplicas
    });

    // Calculate ideal distribution
    const availableAZs = await this.getAvailableAZs(distribution.region);
    const idealDistribution = this.zoneBalancer.calculateDistribution(
      availableAZs,
      distribution.totalReplicas
    );

    // Compare and adjust
    for (const idealZone of idealDistribution) {
      const currentZone = distribution.zones.find(z => z.zone === idealZone.zone);

      if (!currentZone) {
        // Zone not in current distribution, add it
        const pods = await this.createPodsInZone(
          {
            application: distribution.application,
            region: distribution.region,
            replicas: idealZone.replicas,
            namespace: undefined
          },
          idealZone.zone,
          idealZone.replicas
        );

        distribution.zones.push({
          zone: idealZone.zone,
          replicas: idealZone.replicas,
          pods
        });
      } else if (currentZone.replicas !== idealZone.replicas) {
        // Adjust replica count
        const delta = idealZone.replicas - currentZone.replicas;

        if (delta > 0) {
          // Add pods
          const newPods = await this.createPodsInZone(
            {
              application: distribution.application,
              region: distribution.region,
              replicas: delta,
              namespace: undefined
            },
            currentZone.zone,
            delta
          );
          currentZone.pods.push(...newPods);
          currentZone.replicas = idealZone.replicas;
        } else if (delta < 0) {
          // Remove pods (mark for deletion)
          const podsToRemove = Math.abs(delta);
          currentZone.pods.splice(-podsToRemove);
          currentZone.replicas = idealZone.replicas;
        }
      }
    }

    logger.info('Workload rebalanced', {
      application: distribution.application,
      zones: distribution.zones.length
    });

    return distribution;
  }

  /**
   * Get distribution status
   */
  getDistributionStatus(distribution: Distribution): {
    balanced: boolean;
    zones: number;
    totalReplicas: number;
    replicasPerZone: { zone: string; replicas: number }[];
    healthyPods: number;
    unhealthyPods: number;
  } {
    const replicasPerZone = distribution.zones.map(z => ({
      zone: z.zone,
      replicas: z.replicas
    }));

    const healthyPods = distribution.zones.reduce(
      (sum, z) => sum + z.pods.filter(p => p.ready).length,
      0
    );

    const unhealthyPods = distribution.totalReplicas - healthyPods;

    // Check if distribution is balanced
    const replicaCounts = distribution.zones.map(z => z.replicas);
    const maxReplicas = Math.max(...replicaCounts);
    const minReplicas = Math.min(...replicaCounts);
    const balanced = (maxReplicas - minReplicas) <= 1;

    return {
      balanced,
      zones: distribution.zones.length,
      totalReplicas: distribution.totalReplicas,
      replicasPerZone,
      healthyPods,
      unhealthyPods
    };
  }

  /**
   * Generate a simulated pod IP
   */
  private generatePodIP(): string {
    return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }
}
