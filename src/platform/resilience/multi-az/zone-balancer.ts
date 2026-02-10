/**
 * Zone Balancer
 * Calculates optimal pod distribution across availability zones
 */

import { createLogger } from '../../utils/logger.js';
import { AvailabilityZone, ZoneDistribution } from '../types.js';

const logger = createLogger('ZoneBalancer');

/**
 * Strategies for balancing workloads across zones
 */
export type BalancingStrategy = 'equal' | 'weighted' | 'priority';

/**
 * Zone weights for weighted balancing
 */
export interface ZoneWeight {
  zone: string;
  weight: number; // 0-100
}

/**
 * Balances workload distribution across availability zones
 */
export class ZoneBalancer {
  private strategy: BalancingStrategy;

  constructor(strategy: BalancingStrategy = 'equal') {
    this.strategy = strategy;
    logger.info('Zone Balancer initialized', { strategy });
  }

  /**
   * Calculate distribution of replicas across zones
   */
  calculateDistribution(
    zones: AvailabilityZone[],
    totalReplicas: number,
    weights?: ZoneWeight[]
  ): ZoneDistribution[] {
    logger.info('Calculating distribution', {
      strategy: this.strategy,
      zones: zones.length,
      totalReplicas
    });

    switch (this.strategy) {
      case 'equal':
        return this.equalDistribution(zones, totalReplicas);
      case 'weighted':
        return this.weightedDistribution(zones, totalReplicas, weights || []);
      case 'priority':
        return this.priorityDistribution(zones, totalReplicas);
      default:
        return this.equalDistribution(zones, totalReplicas);
    }
  }

  /**
   * Equal distribution: distribute replicas evenly across all zones
   */
  private equalDistribution(
    zones: AvailabilityZone[],
    totalReplicas: number
  ): ZoneDistribution[] {
    const availableZones = zones.filter(z => z.state === 'available');

    if (availableZones.length === 0) {
      throw new Error('No available zones for distribution');
    }

    const baseReplicas = Math.floor(totalReplicas / availableZones.length);
    const remainder = totalReplicas % availableZones.length;

    const distribution: ZoneDistribution[] = availableZones.map((zone, index) => ({
      zone: zone.name,
      replicas: baseReplicas + (index < remainder ? 1 : 0),
      pods: []
    }));

    logger.debug('Equal distribution calculated', {
      distribution: distribution.map(d => ({
        zone: d.zone,
        replicas: d.replicas
      }))
    });

    return distribution;
  }

  /**
   * Weighted distribution: distribute based on zone weights
   */
  private weightedDistribution(
    zones: AvailabilityZone[],
    totalReplicas: number,
    weights: ZoneWeight[]
  ): ZoneDistribution[] {
    const availableZones = zones.filter(z => z.state === 'available');

    if (availableZones.length === 0) {
      throw new Error('No available zones for distribution');
    }

    // Create weight map
    const weightMap = new Map<string, number>();
    weights.forEach(w => weightMap.set(w.zone, w.weight));

    // Calculate total weight
    const totalWeight = availableZones.reduce((sum, zone) => {
      return sum + (weightMap.get(zone.name) || 1);
    }, 0);

    // Distribute based on weights
    let remainingReplicas = totalReplicas;
    const distribution: ZoneDistribution[] = [];

    for (let i = 0; i < availableZones.length; i++) {
      const zone = availableZones[i];
      const weight = weightMap.get(zone.name) || 1;
      const isLast = i === availableZones.length - 1;

      let replicas: number;
      if (isLast) {
        // Assign remaining replicas to last zone
        replicas = remainingReplicas;
      } else {
        replicas = Math.floor((weight / totalWeight) * totalReplicas);
        remainingReplicas -= replicas;
      }

      distribution.push({
        zone: zone.name,
        replicas,
        pods: []
      });
    }

    logger.debug('Weighted distribution calculated', {
      distribution: distribution.map(d => ({
        zone: d.zone,
        replicas: d.replicas
      })),
      weights: Array.from(weightMap.entries())
    });

    return distribution;
  }

  /**
   * Priority distribution: fill zones in order of priority
   * Useful for cost optimization (e.g., fill cheaper zones first)
   */
  private priorityDistribution(
    zones: AvailabilityZone[],
    totalReplicas: number
  ): ZoneDistribution[] {
    const availableZones = zones.filter(z => z.state === 'available');

    if (availableZones.length === 0) {
      throw new Error('No available zones for distribution');
    }

    // For priority, we'll fill zones in order
    // In production, this would use actual priority scores
    let remainingReplicas = totalReplicas;
    const distribution: ZoneDistribution[] = [];

    for (const zone of availableZones) {
      if (remainingReplicas <= 0) {
        distribution.push({
          zone: zone.name,
          replicas: 0,
          pods: []
        });
        continue;
      }

      // Fill this zone with up to 1/3 of total replicas
      const maxForZone = Math.ceil(totalReplicas / availableZones.length);
      const replicas = Math.min(remainingReplicas, maxForZone);

      distribution.push({
        zone: zone.name,
        replicas,
        pods: []
      });

      remainingReplicas -= replicas;
    }

    logger.debug('Priority distribution calculated', {
      distribution: distribution.map(d => ({
        zone: d.zone,
        replicas: d.replicas
      }))
    });

    return distribution;
  }

  /**
   * Rebalance distribution to ensure even distribution
   */
  rebalance(currentDistribution: ZoneDistribution[]): ZoneDistribution[] {
    const totalReplicas = currentDistribution.reduce((sum, d) => sum + d.replicas, 0);

    logger.info('Rebalancing distribution', {
      zones: currentDistribution.length,
      totalReplicas
    });

    const baseReplicas = Math.floor(totalReplicas / currentDistribution.length);
    const remainder = totalReplicas % currentDistribution.length;

    const rebalanced: ZoneDistribution[] = currentDistribution.map((dist, index) => ({
      ...dist,
      replicas: baseReplicas + (index < remainder ? 1 : 0)
    }));

    logger.debug('Distribution rebalanced', {
      before: currentDistribution.map(d => ({
        zone: d.zone,
        replicas: d.replicas
      })),
      after: rebalanced.map(d => ({
        zone: d.zone,
        replicas: d.replicas
      }))
    });

    return rebalanced;
  }

  /**
   * Check if distribution is balanced
   */
  isBalanced(distribution: ZoneDistribution[]): boolean {
    if (distribution.length === 0) return true;

    const replicaCounts = distribution.map(d => d.replicas);
    const maxReplicas = Math.max(...replicaCounts);
    const minReplicas = Math.min(...replicaCounts);

    // Distribution is balanced if difference is at most 1
    return (maxReplicas - minReplicas) <= 1;
  }

  /**
   * Get imbalance score (0 = perfectly balanced, higher = more imbalanced)
   */
  getImbalanceScore(distribution: ZoneDistribution[]): number {
    if (distribution.length === 0) return 0;

    const totalReplicas = distribution.reduce((sum, d) => sum + d.replicas, 0);
    const idealPerZone = totalReplicas / distribution.length;

    // Calculate sum of squared differences from ideal
    const imbalance = distribution.reduce((sum, d) => {
      const diff = d.replicas - idealPerZone;
      return sum + (diff * diff);
    }, 0);

    return Math.sqrt(imbalance / distribution.length);
  }

  /**
   * Change balancing strategy
   */
  setStrategy(strategy: BalancingStrategy): void {
    logger.info('Changing balancing strategy', {
      from: this.strategy,
      to: strategy
    });
    this.strategy = strategy;
  }

  /**
   * Get current strategy
   */
  getStrategy(): BalancingStrategy {
    return this.strategy;
  }
}
