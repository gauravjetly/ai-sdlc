/**
 * Security Node Data Types
 * Types for Security Group, IAM Role, IAM Policy, and KMS Key nodes
 */

import { BaseNodeData } from './base.types';

/**
 * Security Group Ingress/Egress Rule
 */
export interface SecurityRule {
  id: string;
  protocol: 'tcp' | 'udp' | 'icmp' | '-1';
  fromPort: number;
  toPort: number;
  cidrBlocks?: string[];
  ipv6CidrBlocks?: string[];
  securityGroupIds?: string[];
  prefixListIds?: string[];
  description?: string;
}

/**
 * Security Group Node Data
 */
export interface SecurityGroupNodeData extends BaseNodeData {
  serviceType: 'security-group';
  category: 'security';
  description: string;
  vpcId: string;
  ingressRules: SecurityRule[];
  egressRules: SecurityRule[];
  ruleCount: number;
}

/**
 * Inline IAM Policy
 */
export interface InlinePolicy {
  name: string;
  policy: string;
}

/**
 * IAM Role Node Data
 */
export interface IAMRoleNodeData extends BaseNodeData {
  serviceType: 'iam-role';
  category: 'security';
  path: string;
  assumeRolePolicy: string;
  description?: string;
  maxSessionDuration: number;
  permissionsBoundary?: string;
  managedPolicyArns: string[];
  inlinePolicies: InlinePolicy[];
}

/**
 * IAM Policy Node Data
 */
export interface IAMPolicyNodeData extends BaseNodeData {
  serviceType: 'iam-policy';
  category: 'security';
  path: string;
  description?: string;
  policy: string;
  statementCount: number;
}

/**
 * KMS Key Spec Types
 */
export type KMSKeySpec =
  | 'SYMMETRIC_DEFAULT'
  | 'RSA_2048'
  | 'RSA_4096'
  | 'ECC_NIST_P256'
  | 'ECC_NIST_P384';

/**
 * KMS Key Usage Types
 */
export type KMSKeyUsage = 'ENCRYPT_DECRYPT' | 'SIGN_VERIFY';

/**
 * KMS Key Node Data
 */
export interface KMSKeyNodeData extends BaseNodeData {
  serviceType: 'kms-key';
  category: 'security';
  alias: string;
  description?: string;
  keySpec: KMSKeySpec;
  keyUsage: KMSKeyUsage;
  policy: string;
  enableKeyRotation: boolean;
  deletionWindowInDays: number;
  multiRegion: boolean;
}

/**
 * Default Security Group data
 */
export const DEFAULT_SECURITY_GROUP_DATA: Partial<SecurityGroupNodeData> = {
  serviceType: 'security-group',
  category: 'security',
  description: '',
  vpcId: '',
  ingressRules: [],
  egressRules: [
    {
      id: 'default-egress',
      protocol: '-1',
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'Allow all outbound traffic',
    },
  ],
  ruleCount: 1,
  status: 'unconfigured',
  tags: {},
};

/**
 * Default IAM Role data
 */
export const DEFAULT_IAM_ROLE_DATA: Partial<IAMRoleNodeData> = {
  serviceType: 'iam-role',
  category: 'security',
  path: '/',
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'ec2.amazonaws.com' },
        Action: 'sts:AssumeRole',
      },
    ],
  }, null, 2),
  maxSessionDuration: 3600,
  managedPolicyArns: [],
  inlinePolicies: [],
  status: 'unconfigured',
  tags: {},
};

/**
 * Default IAM Policy data
 */
export const DEFAULT_IAM_POLICY_DATA: Partial<IAMPolicyNodeData> = {
  serviceType: 'iam-policy',
  category: 'security',
  path: '/',
  policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [],
        Resource: '*',
      },
    ],
  }, null, 2),
  statementCount: 1,
  status: 'unconfigured',
  tags: {},
};

/**
 * Default KMS Key data
 */
export const DEFAULT_KMS_KEY_DATA: Partial<KMSKeyNodeData> = {
  serviceType: 'kms-key',
  category: 'security',
  alias: '',
  keySpec: 'SYMMETRIC_DEFAULT',
  keyUsage: 'ENCRYPT_DECRYPT',
  policy: '',
  enableKeyRotation: true,
  deletionWindowInDays: 30,
  multiRegion: false,
  status: 'unconfigured',
  tags: {},
};
