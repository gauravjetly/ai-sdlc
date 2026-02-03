/**
 * Network Layer Type Definitions
 * Types for VPC, Subnet, Routing, and Security Group configurations
 */

// =============================================
// VPC Configuration
// =============================================

export interface VPCConfig {
  name: string;
  cidrBlock: string;
  enableDnsSupport: boolean;
  enableDnsHostnames: boolean;
  enableIpv6: boolean;
  tags: Tag[];
}

export interface Tag {
  key: string;
  value: string;
}

// =============================================
// Subnet Configuration
// =============================================

export interface SubnetConfig {
  id: string;
  name: string;
  cidrBlock: string;
  availabilityZone: string;
  isPublic: boolean;
  mapPublicIpOnLaunch: boolean;
  tags: Tag[];
}

// =============================================
// Routing Configuration
// =============================================

export interface RoutingConfig {
  internetGateway: InternetGatewayConfig;
  natGateways: NATGatewayConfig[];
  routeTables: RouteTableConfig[];
}

export interface InternetGatewayConfig {
  enabled: boolean;
  name: string;
}

export interface NATGatewayConfig {
  id: string;
  name: string;
  subnetId: string;
  eipAllocationId?: string;
}

export interface RouteTableConfig {
  id: string;
  name: string;
  isMain: boolean;
  routes: RouteConfig[];
  subnetAssociations: string[];
}

export interface RouteConfig {
  destinationCidr: string;
  targetType: 'igw' | 'nat' | 'local' | 'vpce';
  targetId: string;
}

// =============================================
// Security Group Configuration
// =============================================

export interface SecurityGroupConfig {
  id: string;
  name: string;
  description: string;
  ingressRules: SecurityGroupRule[];
  egressRules: SecurityGroupRule[];
  tags: Tag[];
}

export interface SecurityGroupRule {
  id: string;
  protocol: 'tcp' | 'udp' | 'icmp' | '-1';
  fromPort: number;
  toPort: number;
  sourceType: 'cidr' | 'sg' | 'prefix-list';
  source: string;
  description?: string;
}

// =============================================
// Validation
// =============================================

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  nodeId?: string;
  severity: 'error' | 'warning' | 'info';
  fix?: {
    step: number;
    field: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

// =============================================
// Complete Network Layer Data
// =============================================

export interface NetworkLayerData {
  vpc: VPCConfig;
  subnets: SubnetConfig[];
  routing: RoutingConfig;
  securityGroups: SecurityGroupConfig[];
  validationResult?: ValidationResult;
}

// =============================================
// Constants
// =============================================

export const DEFAULT_VPC_CONFIG: VPCConfig = {
  name: '',
  cidrBlock: '10.0.0.0/16',
  enableDnsSupport: true,
  enableDnsHostnames: true,
  enableIpv6: false,
  tags: [],
};

export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  internetGateway: {
    enabled: false,
    name: '',
  },
  natGateways: [],
  routeTables: [],
};

export const PRESET_CIDR_BLOCKS = [
  { value: '10.0.0.0/16', label: '10.0.0.0/16 (65,536 IPs)' },
  { value: '10.0.0.0/20', label: '10.0.0.0/20 (4,096 IPs)' },
  { value: '172.16.0.0/16', label: '172.16.0.0/16 (65,536 IPs)' },
  { value: '172.31.0.0/16', label: '172.31.0.0/16 (65,536 IPs)' },
  { value: '192.168.0.0/16', label: '192.168.0.0/16 (65,536 IPs)' },
];

export const COMMON_SECURITY_RULES = [
  { name: 'HTTP', protocol: 'tcp' as const, fromPort: 80, toPort: 80, description: 'HTTP traffic' },
  { name: 'HTTPS', protocol: 'tcp' as const, fromPort: 443, toPort: 443, description: 'HTTPS traffic' },
  { name: 'SSH', protocol: 'tcp' as const, fromPort: 22, toPort: 22, description: 'SSH access' },
  { name: 'RDP', protocol: 'tcp' as const, fromPort: 3389, toPort: 3389, description: 'RDP access' },
  { name: 'MySQL', protocol: 'tcp' as const, fromPort: 3306, toPort: 3306, description: 'MySQL database' },
  { name: 'PostgreSQL', protocol: 'tcp' as const, fromPort: 5432, toPort: 5432, description: 'PostgreSQL database' },
  { name: 'Redis', protocol: 'tcp' as const, fromPort: 6379, toPort: 6379, description: 'Redis cache' },
  { name: 'Custom TCP', protocol: 'tcp' as const, fromPort: 0, toPort: 65535, description: 'Custom TCP port' },
];

export const PROTOCOLS = [
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
  { value: 'icmp', label: 'ICMP' },
  { value: '-1', label: 'All Traffic' },
];
