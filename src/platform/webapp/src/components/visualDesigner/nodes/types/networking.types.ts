/**
 * Networking Node Data Types
 * Types for Load Balancer, Route53, CloudFront, VPN Gateway, and Transit Gateway nodes
 */

import { BaseNodeData } from './base.types';

/**
 * Load Balancer Types
 */
export type LoadBalancerType = 'application' | 'network';
export type LoadBalancerScheme = 'internet-facing' | 'internal';
export type ListenerProtocol = 'HTTP' | 'HTTPS' | 'TCP' | 'TLS' | 'UDP';
export type TargetType = 'instance' | 'ip' | 'lambda';

/**
 * Health Check Configuration
 */
export interface HealthCheck {
  enabled: boolean;
  path: string;
  port: string;
  protocol: 'HTTP' | 'HTTPS' | 'TCP';
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

/**
 * Listener Action
 */
export interface ListenerAction {
  type: 'forward' | 'redirect' | 'fixed-response';
  targetGroupArn?: string;
  redirectConfig?: {
    protocol: string;
    port: string;
    host: string;
    path: string;
    query: string;
    statusCode: 'HTTP_301' | 'HTTP_302';
  };
  fixedResponseConfig?: {
    contentType: string;
    messageBody: string;
    statusCode: string;
  };
}

/**
 * Load Balancer Listener
 */
export interface LoadBalancerListener {
  port: number;
  protocol: ListenerProtocol;
  certificateArn?: string;
  defaultActions: ListenerAction[];
}

/**
 * Target Group
 */
export interface TargetGroup {
  name: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS';
  targetType: TargetType;
  healthCheck: HealthCheck;
}

/**
 * Load Balancer Node Data
 */
export interface LoadBalancerNodeData extends BaseNodeData {
  serviceType: 'load-balancer';
  category: 'networking';
  type: LoadBalancerType;
  scheme: LoadBalancerScheme;
  subnets: string[];
  securityGroups?: string[];
  listeners: LoadBalancerListener[];
  targetGroups: TargetGroup[];
  accessLogs?: {
    bucket: string;
    prefix: string;
    enabled: boolean;
  };
}

/**
 * Route53 Record Types
 */
export type Route53RecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'SRV' | 'PTR';

/**
 * Route53 Record
 */
export interface Route53Record {
  name: string;
  type: Route53RecordType;
  ttl?: number;
  records?: string[];
  alias?: {
    name: string;
    zoneId: string;
    evaluateTargetHealth: boolean;
  };
}

/**
 * Route53 Node Data
 */
export interface Route53NodeData extends BaseNodeData {
  serviceType: 'route53';
  category: 'networking';
  zoneName: string;
  zoneType: 'public' | 'private';
  vpcId?: string;
  records: Route53Record[];
  recordCount: number;
}

/**
 * CloudFront Origin
 */
export interface CloudFrontOrigin {
  id: string;
  domainName: string;
  originPath?: string;
  s3OriginConfig?: {
    originAccessIdentity: string;
  };
  customOriginConfig?: {
    httpPort: number;
    httpsPort: number;
    originProtocolPolicy: 'http-only' | 'https-only' | 'match-viewer';
    originSslProtocols: string[];
  };
}

/**
 * CloudFront Cache Behavior
 */
export interface CacheBehavior {
  pathPattern?: string;
  targetOriginId: string;
  viewerProtocolPolicy: 'allow-all' | 'https-only' | 'redirect-to-https';
  allowedMethods: string[];
  cachedMethods: string[];
  cachePolicyId?: string;
  compress: boolean;
  ttl: {
    default: number;
    max: number;
    min: number;
  };
}

/**
 * CloudFront Node Data
 */
export interface CloudFrontNodeData extends BaseNodeData {
  serviceType: 'cloudfront';
  category: 'networking';
  aliases: string[];
  enabled: boolean;
  priceClass: 'PriceClass_All' | 'PriceClass_200' | 'PriceClass_100';
  defaultRootObject?: string;
  origins: CloudFrontOrigin[];
  defaultCacheBehavior: CacheBehavior;
  cacheBehaviors: CacheBehavior[];
  viewerCertificate: {
    cloudfrontDefaultCertificate?: boolean;
    acmCertificateArn?: string;
    sslSupportMethod?: 'sni-only' | 'vip';
    minimumProtocolVersion?: string;
  };
  webAclId?: string;
}

/**
 * VPN Gateway Node Data
 */
export interface VPNGatewayNodeData extends BaseNodeData {
  serviceType: 'vpn-gateway';
  category: 'networking';
  vpcId: string;
  amazonSideAsn?: number;
  type: 'ipsec.1';
  customerGateways: CustomerGateway[];
  connections: VPNConnection[];
}

/**
 * Customer Gateway
 */
export interface CustomerGateway {
  id: string;
  bgpAsn: number;
  ipAddress: string;
  type: 'ipsec.1';
}

/**
 * VPN Connection
 */
export interface VPNConnection {
  id: string;
  customerGatewayId: string;
  staticRoutesOnly: boolean;
  tunnelOptions: TunnelOption[];
}

/**
 * VPN Tunnel Option
 */
export interface TunnelOption {
  tunnelInsideCidr: string;
  preSharedKey?: string;
}

/**
 * Transit Gateway Attachment
 */
export interface TransitGatewayAttachment {
  id: string;
  vpcId: string;
  subnetIds: string[];
  state: 'pending' | 'available' | 'deleting' | 'deleted' | 'failed';
}

/**
 * Transit Gateway Route
 */
export interface TransitGatewayRoute {
  destinationCidrBlock: string;
  attachmentId: string;
  state: 'active' | 'blackhole';
}

/**
 * Transit Gateway Node Data
 */
export interface TransitGatewayNodeData extends BaseNodeData {
  serviceType: 'transit-gateway';
  category: 'networking';
  amazonSideAsn?: number;
  description?: string;
  autoAcceptSharedAttachments: boolean;
  defaultRouteTableAssociation: boolean;
  defaultRouteTablePropagation: boolean;
  dnsSupport: boolean;
  vpnEcmpSupport: boolean;
  attachments: TransitGatewayAttachment[];
  routes: TransitGatewayRoute[];
}

/**
 * Default Load Balancer data
 */
export const DEFAULT_LOAD_BALANCER_DATA: Partial<LoadBalancerNodeData> = {
  serviceType: 'load-balancer',
  category: 'networking',
  type: 'application',
  scheme: 'internet-facing',
  subnets: [],
  securityGroups: [],
  listeners: [],
  targetGroups: [],
  status: 'unconfigured',
  tags: {},
};

/**
 * Default Route53 data
 */
export const DEFAULT_ROUTE53_DATA: Partial<Route53NodeData> = {
  serviceType: 'route53',
  category: 'networking',
  zoneName: '',
  zoneType: 'public',
  records: [],
  recordCount: 0,
  status: 'unconfigured',
  tags: {},
};

/**
 * Default CloudFront data
 */
export const DEFAULT_CLOUDFRONT_DATA: Partial<CloudFrontNodeData> = {
  serviceType: 'cloudfront',
  category: 'networking',
  aliases: [],
  enabled: true,
  priceClass: 'PriceClass_100',
  origins: [],
  defaultCacheBehavior: {
    targetOriginId: '',
    viewerProtocolPolicy: 'redirect-to-https',
    allowedMethods: ['GET', 'HEAD'],
    cachedMethods: ['GET', 'HEAD'],
    compress: true,
    ttl: { default: 86400, max: 31536000, min: 0 },
  },
  cacheBehaviors: [],
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
  status: 'unconfigured',
  tags: {},
};

/**
 * Default VPN Gateway data
 */
export const DEFAULT_VPN_GATEWAY_DATA: Partial<VPNGatewayNodeData> = {
  serviceType: 'vpn-gateway',
  category: 'networking',
  vpcId: '',
  type: 'ipsec.1',
  customerGateways: [],
  connections: [],
  status: 'unconfigured',
  tags: {},
};

/**
 * Default Transit Gateway data
 */
export const DEFAULT_TRANSIT_GATEWAY_DATA: Partial<TransitGatewayNodeData> = {
  serviceType: 'transit-gateway',
  category: 'networking',
  autoAcceptSharedAttachments: false,
  defaultRouteTableAssociation: true,
  defaultRouteTablePropagation: true,
  dnsSupport: true,
  vpnEcmpSupport: true,
  attachments: [],
  routes: [],
  status: 'unconfigured',
  tags: {},
};
