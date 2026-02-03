/**
 * Network Validation Utilities
 * Provides validation rules for network configurations
 */

import {
  VPCConfig,
  SubnetConfig,
  RoutingConfig,
  SecurityGroupConfig,
  ValidationError,
  ValidationResult,
  NetworkLayerData,
} from '../../../../types/network';
import {
  isValidCIDR,
  isRFC1918,
  isCIDRWithinRange,
  isCIDROverlapping,
} from './cidr';

// =============================================
// VPC Validation
// =============================================

export function validateVPCName(name: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({
      code: 'VPC_NAME_REQUIRED',
      message: 'VPC name is required',
      path: 'vpc.name',
      severity: 'error',
    });
    return errors;
  }

  if (name.length < 3) {
    errors.push({
      code: 'VPC_NAME_TOO_SHORT',
      message: 'VPC name must be at least 3 characters',
      path: 'vpc.name',
      severity: 'error',
    });
  }

  if (name.length > 64) {
    errors.push({
      code: 'VPC_NAME_TOO_LONG',
      message: 'VPC name must be 64 characters or less',
      path: 'vpc.name',
      severity: 'error',
    });
  }

  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name)) {
    errors.push({
      code: 'VPC_NAME_INVALID',
      message: 'VPC name must start with a letter and contain only alphanumeric characters and hyphens',
      path: 'vpc.name',
      severity: 'error',
    });
  }

  return errors;
}

export function validateVPCCIDR(cidr: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!cidr) {
    errors.push({
      code: 'VPC_CIDR_REQUIRED',
      message: 'VPC CIDR block is required',
      path: 'vpc.cidrBlock',
      severity: 'error',
    });
    return errors;
  }

  if (!isValidCIDR(cidr)) {
    errors.push({
      code: 'VPC_CIDR_INVALID',
      message: 'Invalid CIDR format. Use format like 10.0.0.0/16',
      path: 'vpc.cidrBlock',
      severity: 'error',
    });
    return errors;
  }

  if (!isRFC1918(cidr)) {
    errors.push({
      code: 'VPC_CIDR_NOT_RFC1918',
      message: 'CIDR must be a private range (RFC 1918): 10.x.x.x, 172.16-31.x.x, or 192.168.x.x',
      path: 'vpc.cidrBlock',
      severity: 'error',
    });
  }

  // AWS VPC CIDR restrictions
  const prefix = parseInt(cidr.split('/')[1], 10);
  if (prefix < 16 || prefix > 28) {
    errors.push({
      code: 'VPC_CIDR_PREFIX_INVALID',
      message: 'VPC CIDR prefix must be between /16 and /28',
      path: 'vpc.cidrBlock',
      severity: 'error',
    });
  }

  return errors;
}

export function validateVPC(vpc: VPCConfig): ValidationError[] {
  return [
    ...validateVPCName(vpc.name),
    ...validateVPCCIDR(vpc.cidrBlock),
  ];
}

// =============================================
// Subnet Validation
// =============================================

export function validateSubnetName(name: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({
      code: 'SUBNET_NAME_REQUIRED',
      message: 'Subnet name is required',
      path: 'subnet.name',
      severity: 'error',
    });
    return errors;
  }

  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name)) {
    errors.push({
      code: 'SUBNET_NAME_INVALID',
      message: 'Subnet name must start with a letter and contain only alphanumeric characters and hyphens',
      path: 'subnet.name',
      severity: 'error',
    });
  }

  return errors;
}

export function validateSubnetCIDR(
  cidr: string,
  vpcCidr: string,
  existingCIDRs: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!cidr) {
    errors.push({
      code: 'SUBNET_CIDR_REQUIRED',
      message: 'Subnet CIDR block is required',
      path: 'subnet.cidrBlock',
      severity: 'error',
    });
    return errors;
  }

  if (!isValidCIDR(cidr)) {
    errors.push({
      code: 'SUBNET_CIDR_INVALID',
      message: 'Invalid CIDR format. Use format like 10.0.1.0/24',
      path: 'subnet.cidrBlock',
      severity: 'error',
    });
    return errors;
  }

  if (!isCIDRWithinRange(cidr, vpcCidr)) {
    errors.push({
      code: 'SUBNET_CIDR_OUT_OF_RANGE',
      message: `Subnet CIDR must be within VPC CIDR range (${vpcCidr})`,
      path: 'subnet.cidrBlock',
      severity: 'error',
    });
  }

  // Check for overlaps with existing subnets
  for (const existing of existingCIDRs) {
    if (isCIDROverlapping(cidr, existing)) {
      errors.push({
        code: 'SUBNET_CIDR_OVERLAP',
        message: `Subnet CIDR overlaps with existing subnet (${existing})`,
        path: 'subnet.cidrBlock',
        severity: 'error',
      });
      break;
    }
  }

  return errors;
}

export function validateSubnet(
  subnet: SubnetConfig,
  vpcCidr: string,
  existingSubnets: SubnetConfig[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...validateSubnetName(subnet.name));

  const existingCIDRs = existingSubnets
    .filter((s) => s.id !== subnet.id)
    .map((s) => s.cidrBlock);

  errors.push(...validateSubnetCIDR(subnet.cidrBlock, vpcCidr, existingCIDRs));

  if (!subnet.availabilityZone) {
    errors.push({
      code: 'SUBNET_AZ_REQUIRED',
      message: 'Availability zone is required',
      path: 'subnet.availabilityZone',
      severity: 'error',
    });
  }

  return errors;
}

export function validateSubnets(
  subnets: SubnetConfig[],
  vpcCidr: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (subnets.length === 0) {
    errors.push({
      code: 'SUBNETS_REQUIRED',
      message: 'At least one subnet is required',
      path: 'subnets',
      severity: 'error',
    });
    return errors;
  }

  // Validate each subnet
  for (const subnet of subnets) {
    const subnetErrors = validateSubnet(subnet, vpcCidr, subnets);
    errors.push(
      ...subnetErrors.map((e) => ({
        ...e,
        nodeId: subnet.id,
        path: `subnets[${subnet.id}].${e.path?.split('.')[1] || ''}`,
      }))
    );
  }

  // Check for single AZ (warning)
  const uniqueAZs = new Set(subnets.map((s) => s.availabilityZone));
  if (uniqueAZs.size === 1 && subnets.length > 1) {
    errors.push({
      code: 'SINGLE_AZ_WARNING',
      message: 'All subnets are in a single availability zone. Consider distributing across multiple AZs for high availability.',
      path: 'subnets',
      severity: 'warning',
    });
  }

  // Check for missing public/private (warning)
  const hasPublic = subnets.some((s) => s.isPublic);
  const hasPrivate = subnets.some((s) => !s.isPublic);

  if (!hasPublic) {
    errors.push({
      code: 'NO_PUBLIC_SUBNET',
      message: 'No public subnet defined. Consider adding a public subnet for internet-facing resources.',
      path: 'subnets',
      severity: 'warning',
    });
  }

  if (!hasPrivate) {
    errors.push({
      code: 'NO_PRIVATE_SUBNET',
      message: 'No private subnet defined. Consider adding private subnets for backend resources.',
      path: 'subnets',
      severity: 'warning',
    });
  }

  return errors;
}

// =============================================
// Routing Validation
// =============================================

export function validateRouting(
  routing: RoutingConfig,
  subnets: SubnetConfig[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  const hasPublicSubnets = subnets.some((s) => s.isPublic);
  const hasPrivateSubnets = subnets.some((s) => !s.isPublic);

  // IGW required for public subnets
  if (hasPublicSubnets && !routing.internetGateway.enabled) {
    errors.push({
      code: 'IGW_REQUIRED',
      message: 'Internet Gateway is required for public subnets to access the internet',
      path: 'routing.internetGateway',
      severity: 'error',
    });
  }

  // NAT required for private subnets (warning)
  if (hasPrivateSubnets && routing.natGateways.length === 0) {
    errors.push({
      code: 'NAT_RECOMMENDED',
      message: 'NAT Gateway is recommended for private subnets to access the internet',
      path: 'routing.natGateways',
      severity: 'warning',
    });
  }

  // Validate NAT Gateway placement
  for (const nat of routing.natGateways) {
    const subnet = subnets.find((s) => s.id === nat.subnetId);
    if (!subnet) {
      errors.push({
        code: 'NAT_SUBNET_NOT_FOUND',
        message: `NAT Gateway references non-existent subnet`,
        path: `routing.natGateways[${nat.id}].subnetId`,
        severity: 'error',
      });
    } else if (!subnet.isPublic) {
      errors.push({
        code: 'NAT_IN_PRIVATE_SUBNET',
        message: `NAT Gateway must be placed in a public subnet, not "${subnet.name}"`,
        path: `routing.natGateways[${nat.id}].subnetId`,
        severity: 'error',
      });
    }
  }

  // Check route table associations
  const associatedSubnets = new Set(
    routing.routeTables.flatMap((rt) => rt.subnetAssociations)
  );

  for (const subnet of subnets) {
    if (!associatedSubnets.has(subnet.id)) {
      errors.push({
        code: 'SUBNET_NO_ROUTE_TABLE',
        message: `Subnet "${subnet.name}" is not associated with any route table`,
        path: 'routing.routeTables',
        severity: 'warning',
        nodeId: subnet.id,
      });
    }
  }

  // Multi-AZ NAT recommendation
  if (hasPrivateSubnets && routing.natGateways.length === 1) {
    const uniqueAZs = new Set(
      subnets.filter((s) => !s.isPublic).map((s) => s.availabilityZone)
    );
    if (uniqueAZs.size > 1) {
      errors.push({
        code: 'SINGLE_NAT_MULTI_AZ',
        message: 'Consider adding NAT Gateways in each AZ for high availability',
        path: 'routing.natGateways',
        severity: 'info',
      });
    }
  }

  return errors;
}

// =============================================
// Security Group Validation
// =============================================

export function validateSecurityGroupRule(
  rule: {
    protocol: string;
    fromPort: number;
    toPort: number;
    source: string;
    sourceType: string;
  },
  isIngress: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];
  const ruleType = isIngress ? 'ingress' : 'egress';
  const sourceLabel = isIngress ? 'Source' : 'Destination';

  // Validate port range
  if (rule.protocol !== '-1' && rule.protocol !== 'icmp') {
    if (rule.fromPort < 0 || rule.fromPort > 65535) {
      errors.push({
        code: 'INVALID_FROM_PORT',
        message: `From port must be between 0 and 65535`,
        path: `${ruleType}.fromPort`,
        severity: 'error',
      });
    }

    if (rule.toPort < 0 || rule.toPort > 65535) {
      errors.push({
        code: 'INVALID_TO_PORT',
        message: `To port must be between 0 and 65535`,
        path: `${ruleType}.toPort`,
        severity: 'error',
      });
    }

    if (rule.fromPort > rule.toPort) {
      errors.push({
        code: 'INVALID_PORT_RANGE',
        message: `From port cannot be greater than to port`,
        path: `${ruleType}.ports`,
        severity: 'error',
      });
    }
  }

  // Validate CIDR source
  if (rule.sourceType === 'cidr') {
    if (!rule.source) {
      errors.push({
        code: 'SOURCE_REQUIRED',
        message: `${sourceLabel} CIDR is required`,
        path: `${ruleType}.source`,
        severity: 'error',
      });
    } else if (!isValidCIDR(rule.source) && rule.source !== '::/0') {
      errors.push({
        code: 'INVALID_SOURCE_CIDR',
        message: `Invalid ${sourceLabel.toLowerCase()} CIDR format`,
        path: `${ruleType}.source`,
        severity: 'error',
      });
    }
  }

  // Security warnings for risky rules
  if (
    isIngress &&
    rule.sourceType === 'cidr' &&
    (rule.source === '0.0.0.0/0' || rule.source === '::/0')
  ) {
    // SSH/RDP open to world
    if (
      (rule.fromPort <= 22 && rule.toPort >= 22) ||
      (rule.fromPort <= 3389 && rule.toPort >= 3389)
    ) {
      const port = rule.fromPort <= 22 && rule.toPort >= 22 ? 'SSH (22)' : 'RDP (3389)';
      errors.push({
        code: 'UNRESTRICTED_ADMIN_ACCESS',
        message: `${port} is open to the entire internet (0.0.0.0/0). Restrict to specific IP ranges.`,
        path: `${ruleType}.source`,
        severity: 'error',
      });
    }

    // Database ports open to world
    const dbPorts = [3306, 5432, 1433, 27017, 6379];
    for (const port of dbPorts) {
      if (rule.fromPort <= port && rule.toPort >= port) {
        errors.push({
          code: 'UNRESTRICTED_DB_ACCESS',
          message: `Database port ${port} should not be exposed to the internet`,
          path: `${ruleType}.source`,
          severity: 'warning',
        });
        break;
      }
    }
  }

  return errors;
}

export function validateSecurityGroup(sg: SecurityGroupConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!sg.name || sg.name.trim().length === 0) {
    errors.push({
      code: 'SG_NAME_REQUIRED',
      message: 'Security group name is required',
      path: 'securityGroup.name',
      severity: 'error',
      nodeId: sg.id,
    });
  }

  if (sg.name && !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(sg.name)) {
    errors.push({
      code: 'SG_NAME_INVALID',
      message: 'Security group name must start with a letter and contain only alphanumeric characters, hyphens, and underscores',
      path: 'securityGroup.name',
      severity: 'error',
      nodeId: sg.id,
    });
  }

  // Validate ingress rules
  for (const rule of sg.ingressRules) {
    const ruleErrors = validateSecurityGroupRule(rule, true);
    errors.push(
      ...ruleErrors.map((e) => ({
        ...e,
        nodeId: sg.id,
        path: `securityGroups[${sg.id}].ingressRules[${rule.id}].${e.path}`,
      }))
    );
  }

  // Validate egress rules
  for (const rule of sg.egressRules) {
    const ruleErrors = validateSecurityGroupRule(rule, false);
    errors.push(
      ...ruleErrors.map((e) => ({
        ...e,
        nodeId: sg.id,
        path: `securityGroups[${sg.id}].egressRules[${rule.id}].${e.path}`,
      }))
    );
  }

  return errors;
}

export function validateSecurityGroups(
  securityGroups: SecurityGroupConfig[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (securityGroups.length === 0) {
    errors.push({
      code: 'SG_REQUIRED',
      message: 'At least one security group is required',
      path: 'securityGroups',
      severity: 'error',
    });
    return errors;
  }

  // Validate each security group
  for (const sg of securityGroups) {
    errors.push(...validateSecurityGroup(sg));
  }

  // Check for duplicate names
  const names = securityGroups.map((sg) => sg.name.toLowerCase());
  const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
  if (duplicates.length > 0) {
    errors.push({
      code: 'SG_DUPLICATE_NAME',
      message: `Duplicate security group name: ${duplicates[0]}`,
      path: 'securityGroups',
      severity: 'error',
    });
  }

  return errors;
}

// =============================================
// Complete Network Validation
// =============================================

export function validateNetworkLayer(data: NetworkLayerData): ValidationResult {
  const allErrors: ValidationError[] = [];

  // VPC validation
  allErrors.push(...validateVPC(data.vpc));

  // Subnet validation
  allErrors.push(...validateSubnets(data.subnets, data.vpc.cidrBlock));

  // Routing validation
  allErrors.push(...validateRouting(data.routing, data.subnets));

  // Security group validation
  allErrors.push(...validateSecurityGroups(data.securityGroups));

  // Best practices (info level)
  if (!data.vpc.enableDnsHostnames) {
    allErrors.push({
      code: 'DNS_HOSTNAMES_DISABLED',
      message: 'Consider enabling DNS hostnames for easier resource identification',
      path: 'vpc.enableDnsHostnames',
      severity: 'info',
    });
  }

  // Categorize errors
  const errors = allErrors.filter((e) => e.severity === 'error');
  const warnings = allErrors.filter((e) => e.severity === 'warning');
  const info = allErrors.filter((e) => e.severity === 'info');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}
