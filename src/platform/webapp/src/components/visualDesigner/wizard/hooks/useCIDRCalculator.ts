/**
 * CIDR Calculator Hook
 * Provides CIDR calculation and suggestion utilities
 */

import { useCallback, useMemo } from 'react';
import {
  calculateAvailableIPs,
  suggestSubnetCIDRs,
  getNextAvailableCIDR,
  parseCIDR,
  formatCIDRWithCount,
  getNetworkAddress,
  getBroadcastAddress,
} from '../utils/cidr';

export interface CIDRInfo {
  cidr: string;
  networkAddress: string;
  broadcastAddress: string;
  prefix: number;
  totalIPs: number;
  availableIPs: number;
  formatted: string;
}

export interface UseCIDRCalculatorResult {
  // Information
  getCIDRInfo: (cidr: string, isSubnet?: boolean) => CIDRInfo | null;
  getAvailableIPs: (cidr: string, isSubnet?: boolean) => number;

  // Suggestions
  suggestCIDRs: (
    vpcCidr: string,
    existingCIDRs: string[],
    count?: number,
    prefix?: number
  ) => string[];
  getNextCIDR: (
    vpcCidr: string,
    existingCIDRs: string[],
    prefix?: number
  ) => string | null;

  // Formatting
  formatWithCount: (cidr: string, isSubnet?: boolean) => string;

  // Preset options
  getSubnetPrefixOptions: (vpcPrefix: number) => Array<{ value: number; label: string }>;
}

export function useCIDRCalculator(): UseCIDRCalculatorResult {
  const getCIDRInfo = useCallback(
    (cidr: string, isSubnet = false): CIDRInfo | null => {
      const parsed = parseCIDR(cidr);
      if (!parsed) return null;

      const networkAddress = getNetworkAddress(cidr);
      const broadcastAddress = getBroadcastAddress(cidr);
      if (!networkAddress || !broadcastAddress) return null;

      const totalIPs = Math.pow(2, 32 - parsed.prefix);
      const availableIPs = calculateAvailableIPs(cidr, isSubnet);

      return {
        cidr,
        networkAddress,
        broadcastAddress,
        prefix: parsed.prefix,
        totalIPs,
        availableIPs,
        formatted: formatCIDRWithCount(cidr, isSubnet),
      };
    },
    []
  );

  const getAvailableIPs = useCallback(
    (cidr: string, isSubnet = false): number => {
      return calculateAvailableIPs(cidr, isSubnet);
    },
    []
  );

  const suggestCIDRs = useCallback(
    (
      vpcCidr: string,
      existingCIDRs: string[],
      count = 4,
      prefix = 24
    ): string[] => {
      return suggestSubnetCIDRs(vpcCidr, existingCIDRs, count, prefix);
    },
    []
  );

  const getNextCIDR = useCallback(
    (
      vpcCidr: string,
      existingCIDRs: string[],
      prefix = 24
    ): string | null => {
      return getNextAvailableCIDR(vpcCidr, existingCIDRs, prefix);
    },
    []
  );

  const formatWithCount = useCallback(
    (cidr: string, isSubnet = false): string => {
      return formatCIDRWithCount(cidr, isSubnet);
    },
    []
  );

  const getSubnetPrefixOptions = useCallback(
    (vpcPrefix: number): Array<{ value: number; label: string }> => {
      const options: Array<{ value: number; label: string }> = [];

      // Start from VPC prefix, up to /28 (minimum for AWS)
      for (let prefix = Math.max(vpcPrefix, 16); prefix <= 28; prefix++) {
        const ips = Math.pow(2, 32 - prefix);
        const available = Math.max(0, ips - 5); // AWS reserves 5

        let label = `/${prefix}`;
        if (prefix === 24) {
          label += ` (${available} IPs) - Recommended`;
        } else if (prefix === 20) {
          label += ` (${available.toLocaleString()} IPs) - Large`;
        } else if (prefix === 28) {
          label += ` (${available} IPs) - Minimum`;
        } else {
          label += ` (${available.toLocaleString()} IPs)`;
        }

        options.push({ value: prefix, label });
      }

      return options;
    },
    []
  );

  return useMemo(
    () => ({
      getCIDRInfo,
      getAvailableIPs,
      suggestCIDRs,
      getNextCIDR,
      formatWithCount,
      getSubnetPrefixOptions,
    }),
    [
      getCIDRInfo,
      getAvailableIPs,
      suggestCIDRs,
      getNextCIDR,
      formatWithCount,
      getSubnetPrefixOptions,
    ]
  );
}

export default useCIDRCalculator;
