/**
 * CIDR Utility Functions
 * Provides CIDR parsing, validation, and calculation utilities
 */

/**
 * Parse a CIDR string into its components
 */
export function parseCIDR(cidr: string): { ip: string; prefix: number } | null {
  const match = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (!match) return null;

  const [, ip, prefixStr] = match;
  const prefix = parseInt(prefixStr, 10);

  // Validate prefix range
  if (prefix < 0 || prefix > 32) return null;

  // Validate IP octets
  const octets = ip.split('.').map(Number);
  if (octets.some((o) => o < 0 || o > 255)) return null;

  return { ip, prefix };
}

/**
 * Convert IP string to 32-bit number
 */
export function ipToNumber(ip: string): number {
  const octets = ip.split('.').map(Number);
  return (
    (octets[0] << 24) +
    (octets[1] << 16) +
    (octets[2] << 8) +
    octets[3]
  ) >>> 0; // >>> 0 converts to unsigned
}

/**
 * Convert 32-bit number to IP string
 */
export function numberToIP(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

/**
 * Get the start and end IP numbers for a CIDR range
 */
export function cidrToRange(cidr: string): { start: number; end: number } | null {
  const parsed = parseCIDR(cidr);
  if (!parsed) return null;

  const ipNum = ipToNumber(parsed.ip);
  const mask = ~((1 << (32 - parsed.prefix)) - 1) >>> 0;
  const start = (ipNum & mask) >>> 0;
  const end = (start | ~mask) >>> 0;

  return { start, end };
}

/**
 * Check if two CIDR ranges overlap
 */
export function isCIDROverlapping(cidr1: string, cidr2: string): boolean {
  const range1 = cidrToRange(cidr1);
  const range2 = cidrToRange(cidr2);

  if (!range1 || !range2) return false;

  return range1.start <= range2.end && range2.start <= range1.end;
}

/**
 * Check if inner CIDR is within outer CIDR
 */
export function isCIDRWithinRange(inner: string, outer: string): boolean {
  const innerRange = cidrToRange(inner);
  const outerRange = cidrToRange(outer);

  if (!innerRange || !outerRange) return false;

  return innerRange.start >= outerRange.start && innerRange.end <= outerRange.end;
}

/**
 * Check if CIDR is RFC 1918 private address range
 */
export function isRFC1918(cidr: string): boolean {
  const parsed = parseCIDR(cidr);
  if (!parsed) return false;

  const ipNum = ipToNumber(parsed.ip);

  // 10.0.0.0/8
  const range10Start = ipToNumber('10.0.0.0');
  const range10End = ipToNumber('10.255.255.255');

  // 172.16.0.0/12
  const range172Start = ipToNumber('172.16.0.0');
  const range172End = ipToNumber('172.31.255.255');

  // 192.168.0.0/16
  const range192Start = ipToNumber('192.168.0.0');
  const range192End = ipToNumber('192.168.255.255');

  const range = cidrToRange(cidr);
  if (!range) return false;

  // Check if entire CIDR range is within RFC 1918
  return (
    (range.start >= range10Start && range.end <= range10End) ||
    (range.start >= range172Start && range.end <= range172End) ||
    (range.start >= range192Start && range.end <= range192End)
  );
}

/**
 * Calculate the number of available IPs in a CIDR range
 * (AWS reserves 5 IPs per subnet)
 */
export function calculateAvailableIPs(cidr: string, isSubnet = false): number {
  const parsed = parseCIDR(cidr);
  if (!parsed) return 0;

  const totalIPs = Math.pow(2, 32 - parsed.prefix);

  // AWS reserves 5 IPs per subnet
  if (isSubnet) {
    return Math.max(0, totalIPs - 5);
  }

  return totalIPs;
}

/**
 * Suggest non-overlapping subnet CIDRs within a VPC
 */
export function suggestSubnetCIDRs(
  vpcCidr: string,
  existingCIDRs: string[],
  count: number,
  prefixLength = 24
): string[] {
  const vpcRange = cidrToRange(vpcCidr);
  if (!vpcRange) return [];

  const vpcParsed = parseCIDR(vpcCidr);
  if (!vpcParsed) return [];

  // Can't have subnet prefix smaller than VPC prefix
  if (prefixLength < vpcParsed.prefix) return [];

  const suggestions: string[] = [];
  const subnetSize = Math.pow(2, 32 - prefixLength);

  // Start from VPC start address
  let currentStart = vpcRange.start;

  while (suggestions.length < count && currentStart < vpcRange.end) {
    const candidateCidr = `${numberToIP(currentStart)}/${prefixLength}`;

    // Check if this candidate overlaps with existing CIDRs
    const overlaps = existingCIDRs.some((existing) =>
      isCIDROverlapping(candidateCidr, existing)
    );

    if (!overlaps && isCIDRWithinRange(candidateCidr, vpcCidr)) {
      suggestions.push(candidateCidr);
    }

    currentStart += subnetSize;
  }

  return suggestions;
}

/**
 * Get the next available CIDR block
 */
export function getNextAvailableCIDR(
  vpcCidr: string,
  existingCIDRs: string[],
  prefixLength = 24
): string | null {
  const suggestions = suggestSubnetCIDRs(vpcCidr, existingCIDRs, 1, prefixLength);
  return suggestions[0] || null;
}

/**
 * Validate CIDR format
 */
export function isValidCIDR(cidr: string): boolean {
  return parseCIDR(cidr) !== null;
}

/**
 * Get network address (first IP) of CIDR
 */
export function getNetworkAddress(cidr: string): string | null {
  const range = cidrToRange(cidr);
  if (!range) return null;
  return numberToIP(range.start);
}

/**
 * Get broadcast address (last IP) of CIDR
 */
export function getBroadcastAddress(cidr: string): string | null {
  const range = cidrToRange(cidr);
  if (!range) return null;
  return numberToIP(range.end);
}

/**
 * Format CIDR with IP count
 */
export function formatCIDRWithCount(cidr: string, isSubnet = false): string {
  const count = calculateAvailableIPs(cidr, isSubnet);
  return `${cidr} (${count.toLocaleString()} IPs)`;
}
