/**
 * Edge Factory Utilities
 * Creates connections between infrastructure template nodes
 */

import { v4 as uuid } from 'uuid';
import type { TemplateEdge } from '../types';

/**
 * Create a generic edge between two nodes
 */
export function createEdge(
  source: string,
  target: string,
  options?: {
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
    animated?: boolean;
    type?: string;
  }
): TemplateEdge {
  return {
    id: uuid(),
    source,
    target,
    sourceHandle: options?.sourceHandle,
    targetHandle: options?.targetHandle,
    type: options?.type ?? 'default',
    animated: options?.animated ?? false,
    label: options?.label,
  };
}

/**
 * Create a security group attachment edge
 */
export function createSecurityGroupAttachment(
  securityGroupId: string,
  resourceId: string
): TemplateEdge {
  return createEdge(securityGroupId, resourceId, {
    sourceHandle: 'security-attachment',
    label: 'secures',
  });
}

/**
 * Create a load balancer target edge
 */
export function createLoadBalancerTarget(
  albId: string,
  targetId: string
): TemplateEdge {
  return createEdge(albId, targetId, {
    sourceHandle: 'target',
    label: 'targets',
  });
}

/**
 * Create a subnet placement edge
 */
export function createSubnetPlacement(
  subnetId: string,
  resourceId: string
): TemplateEdge {
  return createEdge(subnetId, resourceId, {
    sourceHandle: 'subnet-placement',
    label: 'hosts',
  });
}

/**
 * Create an IAM role attachment edge
 */
export function createIAMRoleAttachment(
  roleId: string,
  resourceId: string
): TemplateEdge {
  return createEdge(roleId, resourceId, {
    sourceHandle: 'iam-role',
    label: 'role',
  });
}

/**
 * Create a data connection edge (database, cache, etc.)
 */
export function createDataConnection(
  sourceId: string,
  targetId: string,
  label?: string
): TemplateEdge {
  return createEdge(sourceId, targetId, {
    label: label ?? 'connects',
    animated: true,
  });
}

/**
 * Create a trigger connection (Lambda triggers, etc.)
 */
export function createTriggerConnection(
  triggerId: string,
  targetId: string,
  label?: string
): TemplateEdge {
  return createEdge(triggerId, targetId, {
    sourceHandle: 'trigger',
    label: label ?? 'triggers',
    animated: true,
  });
}

/**
 * Create a notification connection (SNS, SQS, etc.)
 */
export function createNotificationConnection(
  sourceId: string,
  targetId: string,
  label?: string
): TemplateEdge {
  return createEdge(sourceId, targetId, {
    sourceHandle: 'notification',
    label: label ?? 'notifies',
  });
}

/**
 * Create a DNS alias connection
 */
export function createDNSAliasConnection(
  route53Id: string,
  targetId: string
): TemplateEdge {
  return createEdge(route53Id, targetId, {
    sourceHandle: 'dns-alias',
    label: 'alias',
  });
}

/**
 * Create a CDN origin connection
 */
export function createCDNOriginConnection(
  cloudfrontId: string,
  originId: string
): TemplateEdge {
  return createEdge(cloudfrontId, originId, {
    sourceHandle: 'origin',
    label: 'origin',
  });
}

/**
 * Create an encryption connection (KMS key usage)
 */
export function createEncryptionConnection(
  kmsKeyId: string,
  resourceId: string
): TemplateEdge {
  return createEdge(kmsKeyId, resourceId, {
    sourceHandle: 'encryption',
    label: 'encrypts',
  });
}

/**
 * Create a VPC attachment connection
 */
export function createVPCAttachment(
  vpcId: string,
  resourceId: string
): TemplateEdge {
  return createEdge(vpcId, resourceId, {
    sourceHandle: 'vpc-attachment',
    label: 'attached',
  });
}

/**
 * Create a pipeline stage connection
 */
export function createPipelineStageConnection(
  sourceStageId: string,
  targetStageId: string,
  label?: string
): TemplateEdge {
  return createEdge(sourceStageId, targetStageId, {
    label: label ?? 'deploys to',
    animated: true,
  });
}

/**
 * Create an event routing connection
 */
export function createEventRoutingConnection(
  sourceId: string,
  targetId: string,
  label?: string
): TemplateEdge {
  return createEdge(sourceId, targetId, {
    label: label ?? 'routes',
    animated: true,
  });
}

/**
 * Create a data flow connection (for analytics pipelines)
 */
export function createDataFlowConnection(
  sourceId: string,
  targetId: string,
  label?: string
): TemplateEdge {
  return createEdge(sourceId, targetId, {
    label: label ?? 'flows to',
    animated: true,
    type: 'smoothstep',
  });
}

/**
 * Create a monitoring connection
 */
export function createMonitoringConnection(
  alarmId: string,
  targetId: string
): TemplateEdge {
  return createEdge(alarmId, targetId, {
    label: 'monitors',
  });
}

/**
 * Create a logging connection
 */
export function createLoggingConnection(
  sourceId: string,
  logDestinationId: string
): TemplateEdge {
  return createEdge(sourceId, logDestinationId, {
    label: 'logs to',
  });
}
