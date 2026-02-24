/**
 * Network Foundation Template
 * Enterprise-grade network foundation with multi-account connectivity
 */

import type { TemplateDefinition } from './types';
import {
  createSecurityGroupNode,
  createTransitGatewayNode,
  createVPNGatewayNode,
  createRoute53Node,
  createS3BucketNode,
  createIAMRoleNode,
} from './utils/node-factory';
import { createEdge } from './utils/edge-factory';

export function createNetworkFoundationTemplate(): TemplateDefinition {
  // Transit Gateway for multi-VPC connectivity
  const transitGateway = createTransitGatewayNode('enterprise-tgw', { x: 560, y: 150 }, {
    amazonSideAsn: 64512,
    description: 'Central transit gateway for enterprise connectivity',
  });

  // VPN Gateway for on-premises connectivity
  const vpnGateway = createVPNGatewayNode('onprem-vpn', { x: 280, y: 150 }, {
    amazonSideAsn: 65000,
  });

  // Route53 Private Hosted Zone
  const route53Private = createRoute53Node('internal-dns', { x: 840, y: 150 }, {
    zoneName: 'internal.example.com',
    zoneType: 'private',
  });

  // Route53 Public Hosted Zone
  const route53Public = createRoute53Node('public-dns', { x: 840, y: 300 }, {
    zoneName: 'example.com',
    zoneType: 'public',
  });

  // S3 Bucket for VPC Flow Logs
  const flowLogsBucket = createS3BucketNode('vpc-flow-logs', { x: 280, y: 400 }, {
    versioning: false,
    encryption: { enabled: true, algorithm: 'AES256' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // S3 Bucket for CloudTrail Network Logs
  const networkLogsBucket = createS3BucketNode('network-audit-logs', { x: 560, y: 400 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'AES256' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // Baseline Security Groups
  const bastionSg = createSecurityGroupNode('bastion-sg', { x: 100, y: 550 }, {
    description: 'Security group for bastion hosts - SSH from corporate IP ranges',
    ingressRules: [
      { id: 'ssh-corp', protocol: 'tcp', fromPort: 22, toPort: 22, cidrBlocks: ['10.0.0.0/8'], description: 'SSH from corporate network' },
    ],
    egressRules: [
      { id: 'all-out', protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'], description: 'Allow all outbound' },
    ],
  });

  const internalSg = createSecurityGroupNode('internal-sg', { x: 380, y: 550 }, {
    description: 'Security group for internal services - VPC CIDR only',
    ingressRules: [
      { id: 'internal-all', protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['10.0.0.0/16'], description: 'All from VPC' },
    ],
    egressRules: [
      { id: 'all-out', protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'], description: 'Allow all outbound' },
    ],
  });

  const managementSg = createSecurityGroupNode('management-sg', { x: 660, y: 550 }, {
    description: 'Security group for management plane - restricted access',
    ingressRules: [
      { id: 'ssh-bastion', protocol: 'tcp', fromPort: 22, toPort: 22, securityGroupIds: ['bastion-sg'], description: 'SSH from bastion' },
      { id: 'https-mgmt', protocol: 'tcp', fromPort: 443, toPort: 443, cidrBlocks: ['10.0.0.0/8'], description: 'HTTPS management' },
    ],
    egressRules: [
      { id: 'all-out', protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'], description: 'Allow all outbound' },
    ],
  });

  const databaseSg = createSecurityGroupNode('shared-db-sg', { x: 940, y: 550 }, {
    description: 'Security group template for shared databases',
    ingressRules: [
      { id: 'postgres', protocol: 'tcp', fromPort: 5432, toPort: 5432, securityGroupIds: ['internal-sg'], description: 'PostgreSQL' },
      { id: 'mysql', protocol: 'tcp', fromPort: 3306, toPort: 3306, securityGroupIds: ['internal-sg'], description: 'MySQL' },
    ],
    egressRules: [],
  });

  // IAM Role for VPC Flow Logs
  const flowLogsRole = createIAMRoleNode('vpc-flow-logs-role', { x: 100, y: 400 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'vpc-flow-logs.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [],
    description: 'IAM role for VPC Flow Logs to write to S3',
  });

  // IAM Role for Network Admin
  const networkAdminRole = createIAMRoleNode('network-admin-role', { x: 840, y: 400 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: 'arn:aws:iam::${AWS_ACCOUNT_ID}:root' },
        Action: 'sts:AssumeRole',
        Condition: { Bool: { 'aws:MultiFactorAuthPresent': 'true' } },
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/AmazonVPCFullAccess',
      'arn:aws:iam::aws:policy/AmazonRoute53FullAccess',
    ],
    description: 'IAM role for network administrators (requires MFA)',
  });

  const nodes = [
    transitGateway, vpnGateway, route53Private, route53Public,
    flowLogsBucket, networkLogsBucket,
    bastionSg, internalSg, managementSg, databaseSg,
    flowLogsRole, networkAdminRole,
  ];

  const edges = [
    // Transit Gateway connections
    createEdge(vpnGateway.id, transitGateway.id, { label: 'attached' }),
    // DNS connections
    createEdge(route53Private.id, transitGateway.id, { label: 'resolves' }),
    // Flow logs
    createEdge(flowLogsRole.id, flowLogsBucket.id, { label: 'writes to' }),
    // Security group relationships
    createEdge(bastionSg.id, managementSg.id, { label: 'ssh source' }),
    createEdge(internalSg.id, databaseSg.id, { label: 'db access' }),
  ];

  return {
    name: 'Network Foundation (Multi-Account)',
    description: 'Enterprise-grade network foundation designed for multi-account AWS environments. Includes Transit Gateway for centralized VPC connectivity, VPN Gateway for secure on-premises integration, Route53 for DNS management (public and private zones), VPC Flow Logs to S3 for network monitoring, and baseline security groups for common use cases. Follows AWS Landing Zone and Control Tower best practices.',
    category: 'network_foundation',
    visibility: 'public',
    layerType: 'network',
    version: '1.0.0',
    tags: ['network', 'vpc', 'transit-gateway', 'vpn', 'route53', 'enterprise', 'multi-account', 'foundation'],
    templateData: {
      nodes,
      edges,
      metadata: {
        author: 'Vintiq Catalyst Team',
        version: '1.0.0',
        tested: true,
        compliance: ['SOC2', 'HIPAA-eligible', 'PCI-DSS-ready', 'FedRAMP-ready'],
        estimatedCost: {
          dev: 100,
          staging: 150,
          prod: 200,
          currency: 'USD',
        },
        prerequisites: [
          'AWS Organizations set up (for multi-account)',
          'Corporate IP ranges defined for bastion access',
          'On-premises network CIDR blocks documented',
          'Domain name registered in Route53 or ready to transfer',
        ],
        customizationGuide: 'Adjust Transit Gateway ASN to avoid conflicts with on-premises BGP. Configure VPN tunnel options for your on-premises firewall. Modify security group CIDR blocks to match your network architecture. Enable IPv6 on subnets if required.',
        deploymentTime: '10-15 minutes',
        components: [
          { type: 'Transit Gateway', count: 1, description: 'Central hub for VPC connectivity' },
          { type: 'VPN Gateway', count: 1, description: 'On-premises VPN connectivity' },
          { type: 'Route53 Hosted Zones', count: 2, description: 'Public and private DNS' },
          { type: 'S3 Buckets', count: 2, description: 'Flow logs and network audit logs' },
          { type: 'Security Groups', count: 4, description: 'Bastion, Internal, Management, Database' },
          { type: 'IAM Roles', count: 2, description: 'Flow logs and network admin' },
        ],
      },
    },
  };
}
