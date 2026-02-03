/**
 * Network Wizard Constants
 * Static data and configuration constants
 */

// =============================================
// AWS Region and Availability Zone Data
// =============================================

export interface AZInfo {
  id: string;
  name: string;
}

export interface RegionInfo {
  id: string;
  name: string;
  azs: AZInfo[];
}

export const AWS_REGIONS: RegionInfo[] = [
  {
    id: 'us-east-1',
    name: 'US East (N. Virginia)',
    azs: [
      { id: 'us-east-1a', name: 'us-east-1a' },
      { id: 'us-east-1b', name: 'us-east-1b' },
      { id: 'us-east-1c', name: 'us-east-1c' },
      { id: 'us-east-1d', name: 'us-east-1d' },
      { id: 'us-east-1e', name: 'us-east-1e' },
      { id: 'us-east-1f', name: 'us-east-1f' },
    ],
  },
  {
    id: 'us-east-2',
    name: 'US East (Ohio)',
    azs: [
      { id: 'us-east-2a', name: 'us-east-2a' },
      { id: 'us-east-2b', name: 'us-east-2b' },
      { id: 'us-east-2c', name: 'us-east-2c' },
    ],
  },
  {
    id: 'us-west-1',
    name: 'US West (N. California)',
    azs: [
      { id: 'us-west-1a', name: 'us-west-1a' },
      { id: 'us-west-1b', name: 'us-west-1b' },
    ],
  },
  {
    id: 'us-west-2',
    name: 'US West (Oregon)',
    azs: [
      { id: 'us-west-2a', name: 'us-west-2a' },
      { id: 'us-west-2b', name: 'us-west-2b' },
      { id: 'us-west-2c', name: 'us-west-2c' },
      { id: 'us-west-2d', name: 'us-west-2d' },
    ],
  },
  {
    id: 'eu-west-1',
    name: 'EU (Ireland)',
    azs: [
      { id: 'eu-west-1a', name: 'eu-west-1a' },
      { id: 'eu-west-1b', name: 'eu-west-1b' },
      { id: 'eu-west-1c', name: 'eu-west-1c' },
    ],
  },
  {
    id: 'eu-west-2',
    name: 'EU (London)',
    azs: [
      { id: 'eu-west-2a', name: 'eu-west-2a' },
      { id: 'eu-west-2b', name: 'eu-west-2b' },
      { id: 'eu-west-2c', name: 'eu-west-2c' },
    ],
  },
  {
    id: 'eu-central-1',
    name: 'EU (Frankfurt)',
    azs: [
      { id: 'eu-central-1a', name: 'eu-central-1a' },
      { id: 'eu-central-1b', name: 'eu-central-1b' },
      { id: 'eu-central-1c', name: 'eu-central-1c' },
    ],
  },
  {
    id: 'ap-southeast-1',
    name: 'Asia Pacific (Singapore)',
    azs: [
      { id: 'ap-southeast-1a', name: 'ap-southeast-1a' },
      { id: 'ap-southeast-1b', name: 'ap-southeast-1b' },
      { id: 'ap-southeast-1c', name: 'ap-southeast-1c' },
    ],
  },
  {
    id: 'ap-southeast-2',
    name: 'Asia Pacific (Sydney)',
    azs: [
      { id: 'ap-southeast-2a', name: 'ap-southeast-2a' },
      { id: 'ap-southeast-2b', name: 'ap-southeast-2b' },
      { id: 'ap-southeast-2c', name: 'ap-southeast-2c' },
    ],
  },
  {
    id: 'ap-northeast-1',
    name: 'Asia Pacific (Tokyo)',
    azs: [
      { id: 'ap-northeast-1a', name: 'ap-northeast-1a' },
      { id: 'ap-northeast-1c', name: 'ap-northeast-1c' },
      { id: 'ap-northeast-1d', name: 'ap-northeast-1d' },
    ],
  },
];

export function getRegion(regionId: string): RegionInfo | undefined {
  return AWS_REGIONS.find((r) => r.id === regionId);
}

export function getAZsForRegion(regionId: string): AZInfo[] {
  const region = getRegion(regionId);
  return region?.azs || [];
}

// =============================================
// Wizard Step Configuration
// =============================================

export const NETWORK_WIZARD_STEPS = [
  {
    key: 'vpc',
    label: 'VPC Configuration',
    description: 'Configure your Virtual Private Cloud settings',
  },
  {
    key: 'subnets',
    label: 'Subnet Design',
    description: 'Design your subnet architecture across availability zones',
  },
  {
    key: 'routing',
    label: 'Routing Configuration',
    description: 'Set up internet gateway, NAT gateway, and route tables',
  },
  {
    key: 'security',
    label: 'Security Groups',
    description: 'Configure firewall rules for your resources',
  },
  {
    key: 'review',
    label: 'Review & Validate',
    description: 'Review your configuration and validate before deployment',
  },
];

// =============================================
// Cost Estimates
// =============================================

export const AWS_PRICING = {
  natGateway: {
    hourly: 0.045, // per hour
    perGB: 0.045, // per GB processed
    monthlyEstimate: 32.40, // ~720 hours/month
  },
  elasticIP: {
    attached: 0, // Free when attached
    unattached: 0.005, // per hour when not attached
  },
  vpcEndpoint: {
    hourly: 0.01, // per AZ per hour
    perGB: 0.01, // per GB processed
  },
};

export function estimateNATCost(count: number): {
  monthly: number;
  note: string;
} {
  const monthly = count * AWS_PRICING.natGateway.monthlyEstimate;
  return {
    monthly,
    note: `Estimated $${monthly.toFixed(2)}/month (${count} NAT Gateway${count > 1 ? 's' : ''}) + data processing charges`,
  };
}

// =============================================
// Validation Messages
// =============================================

export const VALIDATION_MESSAGES = {
  vpcNameRequired: 'VPC name is required',
  vpcNameInvalid: 'VPC name must start with a letter and contain only alphanumeric characters and hyphens',
  vpcCidrRequired: 'VPC CIDR block is required',
  vpcCidrInvalid: 'Invalid CIDR format. Use format like 10.0.0.0/16',
  vpcCidrNotRFC1918: 'CIDR must be a private range (RFC 1918): 10.x, 172.16-31.x, or 192.168.x',
  subnetNameRequired: 'Subnet name is required',
  subnetCidrRequired: 'Subnet CIDR block is required',
  subnetCidrOutOfRange: 'Subnet CIDR must be within VPC CIDR range',
  subnetCidrOverlap: 'Subnet CIDR overlaps with an existing subnet',
  subnetAzRequired: 'Availability zone is required',
  sgNameRequired: 'Security group name is required',
  sgRuleSourceRequired: 'Source/destination is required',
  sgRulePortInvalid: 'Port must be between 0 and 65535',
};

// =============================================
// Help Text
// =============================================

export const HELP_TEXT = {
  vpcCidr: 'The IP range for your VPC. AWS recommends /16 for most use cases. Must be a private IP range (RFC 1918).',
  enableDnsSupport: 'Enables the Amazon DNS server to resolve public DNS hostnames to IP addresses.',
  enableDnsHostnames: 'Assigns public DNS hostnames to instances with public IPs.',
  subnetType: 'Public subnets have direct internet access. Private subnets access internet through NAT.',
  availabilityZone: 'AWS availability zones provide fault isolation. Distribute subnets across AZs for high availability.',
  mapPublicIp: 'Automatically assign public IPv4 addresses to instances launched in this subnet.',
  internetGateway: 'Allows communication between instances in your VPC and the internet.',
  natGateway: 'Enables instances in private subnets to connect to the internet while remaining private.',
  securityGroup: 'Acts as a virtual firewall that controls inbound and outbound traffic.',
  ingressRule: 'Controls incoming traffic to your resources.',
  egressRule: 'Controls outgoing traffic from your resources.',
};
