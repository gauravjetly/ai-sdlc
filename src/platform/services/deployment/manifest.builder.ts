/**
 * Kubernetes Manifest Builder
 * Generates K8s manifests from deployment config - NO MOCK DATA
 */

import * as k8s from '@kubernetes/client-node';
import { DeploymentConfig } from './types.js';

export class ManifestBuilder {
  /**
   * Build a Kubernetes Deployment manifest
   */
  static buildDeployment(config: DeploymentConfig): k8s.V1Deployment {
    const deploymentName = `${config.application}-${config.environment}`;
    const labels = {
      app: config.application,
      environment: config.environment,
      version: config.version,
      'managed-by': 'deltek-catalyst',
    };

    const deployment: k8s.V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: deploymentName,
        namespace: config.namespace,
        labels,
        annotations: {
          'deltek.com/strategy': config.strategy,
          'deltek.com/cloud': config.cloud,
        },
      },
      spec: {
        replicas: config.replicas,
        selector: {
          matchLabels: {
            app: config.application,
            environment: config.environment,
          },
        },
        strategy: this.buildStrategy(config.strategy),
        template: {
          metadata: {
            labels,
          },
          spec: {
            containers: [
              {
                name: config.application,
                image: `${config.imageRegistry}:${config.version}`,
                ports: config.containerPort
                  ? [
                      {
                        containerPort: config.containerPort,
                        protocol: 'TCP',
                      },
                    ]
                  : undefined,
                resources: config.resources
                  ? {
                      requests: {
                        cpu: config.resources.cpu,
                        memory: config.resources.memory,
                      },
                      limits: {
                        cpu: config.resources.cpuLimit || config.resources.cpu,
                        memory:
                          config.resources.memoryLimit || config.resources.memory,
                      },
                    }
                  : undefined,
                env: config.environmentVariables
                  ? Object.entries(config.environmentVariables).map(([key, value]) => ({
                      name: key,
                      value,
                    }))
                  : undefined,
                livenessProbe: config.healthCheck
                  ? {
                      httpGet: {
                        path: config.healthCheck.path,
                        port: config.healthCheck.port,
                      },
                      initialDelaySeconds:
                        config.healthCheck.initialDelaySeconds || 30,
                      periodSeconds: config.healthCheck.periodSeconds || 10,
                    }
                  : undefined,
                readinessProbe: config.healthCheck
                  ? {
                      httpGet: {
                        path: config.healthCheck.path,
                        port: config.healthCheck.port,
                      },
                      initialDelaySeconds:
                        config.healthCheck.initialDelaySeconds || 10,
                      periodSeconds: config.healthCheck.periodSeconds || 5,
                    }
                  : undefined,
              },
            ],
          },
        },
      },
    };

    return deployment;
  }

  /**
   * Build deployment strategy
   */
  private static buildStrategy(
    strategy: string
  ): k8s.V1DeploymentStrategy {
    switch (strategy) {
      case 'rolling':
        return {
          type: 'RollingUpdate',
          rollingUpdate: {
            maxSurge: '25%',
            maxUnavailable: '25%',
          },
        };
      case 'blue_green':
        // Blue-green is implemented via service switching
        return {
          type: 'RollingUpdate',
          rollingUpdate: {
            maxSurge: '100%',
            maxUnavailable: '0%',
          },
        };
      case 'canary':
        // Canary requires additional setup (e.g., Istio)
        return {
          type: 'RollingUpdate',
          rollingUpdate: {
            maxSurge: '25%',
            maxUnavailable: '0%',
          },
        };
      default:
        return {
          type: 'RollingUpdate',
          rollingUpdate: {
            maxSurge: '25%',
            maxUnavailable: '25%',
          },
        };
    }
  }

  /**
   * Build a Kubernetes Service manifest
   */
  static buildService(config: DeploymentConfig): k8s.V1Service | null {
    if (!config.containerPort) {
      return null;
    }

    const serviceName = `${config.application}-${config.environment}-svc`;
    const labels = {
      app: config.application,
      environment: config.environment,
      'managed-by': 'deltek-catalyst',
    };

    const service: k8s.V1Service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: serviceName,
        namespace: config.namespace,
        labels,
      },
      spec: {
        type: 'ClusterIP',
        selector: {
          app: config.application,
          environment: config.environment,
        },
        ports: [
          {
            port: 80,
            targetPort: config.containerPort,
            protocol: 'TCP',
          },
        ],
      },
    };

    return service;
  }

  /**
   * Build HorizontalPodAutoscaler if needed
   */
  static buildHPA(
    config: DeploymentConfig,
    minReplicas: number = 2,
    maxReplicas: number = 10
  ): k8s.V2HorizontalPodAutoscaler {
    const deploymentName = `${config.application}-${config.environment}`;

    const hpa: k8s.V2HorizontalPodAutoscaler = {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: `${deploymentName}-hpa`,
        namespace: config.namespace,
        labels: {
          app: config.application,
          environment: config.environment,
          'managed-by': 'deltek-catalyst',
        },
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: deploymentName,
        },
        minReplicas,
        maxReplicas,
        metrics: [
          {
            type: 'Resource',
            resource: {
              name: 'cpu',
              target: {
                type: 'Utilization',
                averageUtilization: 70,
              },
            },
          },
          {
            type: 'Resource',
            resource: {
              name: 'memory',
              target: {
                type: 'Utilization',
                averageUtilization: 80,
              },
            },
          },
        ],
      },
    };

    return hpa;
  }
}
