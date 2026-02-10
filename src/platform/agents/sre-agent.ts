/**
 * SRE Agent
 *
 * AI persona for Site Reliability Engineering tasks
 * Handles system health monitoring, performance analysis, scaling, and incident response
 */

import { BaseAgent, BaseAgentConfig } from './base-agent';
import { AgentType, PlatformEvent } from '../orchestration/types/orchestration-types';

export interface SREAgentConfig extends BaseAgentConfig {
  healthCheckInterval?: number; // minutes
  autoScalingEnabled?: boolean;
  performanceThresholds?: {
    cpu?: number;
    memory?: number;
    latency?: number;
  };
}

/**
 * SRE Agent
 * Specialized in reliability, monitoring, and performance
 */
export class SREAgent extends BaseAgent {
  private sreConfig: SREAgentConfig;

  constructor(config: SREAgentConfig) {
    super(config);
    this.sreConfig = {
      healthCheckInterval: 5,
      autoScalingEnabled: true,
      performanceThresholds: {
        cpu: 80,
        memory: 85,
        latency: 500
      },
      ...config
    };
  }

  /**
   * Setup event triggers
   * - alert.critical: Respond to critical alerts
   * - resource.exhausted: Handle resource exhaustion
   * - health.check_failed: Handle health check failures
   */
  protected setupEventTriggers(): void {
    // Handle critical alerts
    this.registerEventHandler('alert.fired', async (event: PlatformEvent) => {
      if (event.data.severity === 'critical') {
        await this.handleCriticalAlert(event);
      }
    });

    // Handle resource exhaustion
    this.registerEventHandler('resource.exhausted', async (event: PlatformEvent) => {
      await this.handleResourceExhaustion(event);
    });

    // Handle health check failures
    this.registerEventHandler('health.check_failed', async (event: PlatformEvent) => {
      await this.handleHealthCheckFailure(event);
    });

    // Handle deployment completion for health validation
    this.registerEventHandler('deployment.complete', async (event: PlatformEvent) => {
      await this.validateDeploymentHealth(event);
    });
  }

  /**
   * Setup scheduled jobs
   * - Health checks every 5 minutes
   * - Performance analysis hourly
   * - System metrics collection every 15 minutes
   */
  protected setupScheduledJobs(): void {
    // Health checks every 5 minutes
    this.scheduleJob(
      'health-checks',
      '*/5 * * * *',
      async () => await this.performHealthChecks()
    );

    // Performance analysis hourly
    this.scheduleJob(
      'performance-analysis',
      '0 * * * *',
      async () => await this.performPerformanceAnalysis()
    );

    // System metrics collection every 15 minutes
    this.scheduleJob(
      'metrics-collection',
      '*/15 * * * *',
      async () => await this.collectSystemMetrics()
    );

    // Daily capacity planning at 8 AM
    this.scheduleJob(
      'capacity-planning',
      '0 8 * * *',
      async () => await this.performCapacityPlanning()
    );
  }

  /**
   * Execute SRE agent action
   */
  protected async executeInternal(parameters: any): Promise<any> {
    const { action, ...params } = parameters;

    switch (action) {
      case 'check_health':
        return await this.checkSystemHealth(params);
      case 'scale_application':
        return await this.scaleApplication(params);
      case 'analyze_performance':
        return await this.analyzePerformance(params);
      case 'get_metrics':
        return await this.getMetrics(params);
      case 'investigate_incident':
        return await this.investigateIncident(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Get agent type
   */
  protected getAgentType(): AgentType {
    return AgentType.SRE;
  }

  /**
   * Get agent capabilities
   */
  protected getCapabilities(): string[] {
    return [
      'get_system_health',
      'scale_application',
      'analyze_performance',
      'get_metrics',
      'get_logs',
      'create_alert',
      'resolve_incident'
    ];
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Check system health
   */
  async checkSystemHealth(params: { service?: string }): Promise<any> {
    this.logger.info('Checking system health', params);

    if (params.service) {
      const result = await this.mcpClient.getServiceHealth(params.service);
      this.logger.info('Service health check complete', {
        service: params.service,
        status: result.status
      });
      return result;
    }

    // Check all services
    const result = await this.mcpClient.callTool('get_system_health', {});

    this.logger.info('System health check complete', {
      overall_status: result.overall_status,
      services_healthy: result.healthy_services,
      services_unhealthy: result.unhealthy_services
    });

    return result;
  }

  /**
   * Scale application
   */
  async scaleApplication(params: {
    application: string;
    replicas: number;
    environment?: 'dev' | 'uat' | 'prod' | 'dr';
  }): Promise<any> {
    this.logger.info('Scaling application', params);

    const result = await this.mcpClient.callTool('scale_application', {
      application: params.application,
      replicas: params.replicas,
      environment: params.environment || 'prod'
    });

    this.logger.info('Scaling operation complete', {
      application: params.application,
      previous_replicas: result.previous_replicas,
      new_replicas: result.new_replicas
    });

    return result;
  }

  /**
   * Analyze performance
   */
  async analyzePerformance(params: {
    service?: string;
    timeRange?: string;
  }): Promise<any> {
    this.logger.info('Analyzing performance', params);

    const result = await this.mcpClient.callTool('analyze_performance', {
      service: params.service,
      time_range: params.timeRange || '1h'
    });

    this.logger.info('Performance analysis complete', {
      service: params.service,
      avg_latency: result.avg_latency,
      p95_latency: result.p95_latency,
      error_rate: result.error_rate
    });

    return result;
  }

  /**
   * Get metrics
   */
  async getMetrics(params: {
    service: string;
    metrics: Array<'cpu' | 'memory' | 'requests' | 'errors' | 'latency'>;
    timeRange?: string;
  }): Promise<any> {
    this.logger.info('Fetching metrics', params);

    const result = await this.mcpClient.getMetrics({
      service: params.service,
      metrics: params.metrics,
      start_time: params.timeRange
    });

    this.logger.info('Metrics retrieved', {
      service: params.service,
      metrics_count: params.metrics.length
    });

    return result;
  }

  /**
   * Investigate incident
   */
  async investigateIncident(params: {
    incidentId: string;
    service: string;
  }): Promise<any> {
    this.logger.info('Investigating incident', params);

    // Gather comprehensive diagnostic data
    const diagnostics = await this.gatherDiagnostics(params.service);

    this.logger.info('Incident investigation complete', {
      incidentId: params.incidentId,
      findings: diagnostics.summary
    });

    return diagnostics;
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Handle critical alert
   */
  private async handleCriticalAlert(event: PlatformEvent): Promise<void> {
    const { alertId, severity, message, service } = event.data;

    this.logger.error('Critical alert received', {
      alertId,
      severity,
      message,
      service
    });

    try {
      // Gather diagnostics
      const diagnostics = await this.gatherDiagnostics(service);

      // Attempt automated remediation
      await this.attemptRemediation(service, diagnostics);

      this.logger.info('Alert handling complete', {
        alertId,
        service
      });

    } catch (error: any) {
      this.logger.error('Failed to handle critical alert:', {
        error: error.message,
        alertId
      });
    }
  }

  /**
   * Handle resource exhaustion
   */
  private async handleResourceExhaustion(event: PlatformEvent): Promise<void> {
    const { service, resource, current, limit } = event.data;

    this.logger.warn('Resource exhaustion detected', {
      service,
      resource,
      current,
      limit
    });

    try {
      if (this.sreConfig.autoScalingEnabled && resource === 'cpu') {
        // Auto-scale if CPU exhausted
        const currentReplicas = event.data.replicas || 3;
        const newReplicas = Math.min(currentReplicas * 2, 10); // Max 10 replicas

        this.logger.info('Auto-scaling triggered', {
          service,
          currentReplicas,
          newReplicas
        });

        await this.scaleApplication({
          application: service,
          replicas: newReplicas
        });
      }

    } catch (error: any) {
      this.logger.error('Failed to handle resource exhaustion:', {
        error: error.message,
        service
      });
    }
  }

  /**
   * Handle health check failure
   */
  private async handleHealthCheckFailure(event: PlatformEvent): Promise<void> {
    const { serviceId, reason } = event.data;

    this.logger.error('Health check failed', {
      serviceId,
      reason
    });

    try {
      // Get service logs
      const logs = await this.mcpClient.getLogs({
        service: serviceId,
        level: 'error',
        lines: 50
      });

      // Analyze failure
      this.logger.info('Health check failure analysis', {
        serviceId,
        recent_errors: logs.entries?.length || 0
      });

    } catch (error: any) {
      this.logger.error('Failed to handle health check failure:', {
        error: error.message,
        serviceId
      });
    }
  }

  /**
   * Validate deployment health
   */
  private async validateDeploymentHealth(event: PlatformEvent): Promise<void> {
    const { deploymentId, application } = event.data;

    this.logger.info('Validating deployment health', {
      deploymentId,
      application
    });

    try {
      // Wait a bit for deployment to stabilize
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

      // Check health
      const health = await this.checkSystemHealth({ service: application });

      if (health.status !== 'healthy') {
        this.logger.warn('Deployment health validation failed', {
          deploymentId,
          application,
          status: health.status
        });

        // Publish health check failed event
        await this.eventManager.healthCheckFailed(
          application,
          `Post-deployment health check failed: ${health.reason}`
        );
      } else {
        this.logger.info('Deployment health validation passed', {
          deploymentId,
          application
        });
      }

    } catch (error: any) {
      this.logger.error('Failed to validate deployment health:', {
        error: error.message,
        deploymentId
      });
    }
  }

  // ============================================
  // Scheduled Tasks
  // ============================================

  /**
   * Perform periodic health checks
   */
  private async performHealthChecks(): Promise<void> {
    this.logger.debug('Performing periodic health checks');

    try {
      const health = await this.checkSystemHealth({});

      if (health.unhealthy_services > 0) {
        this.logger.warn('Unhealthy services detected', {
          count: health.unhealthy_services,
          services: health.unhealthy_service_list
        });
      }

    } catch (error: any) {
      this.logger.error('Health check failed:', {
        error: error.message
      });
    }
  }

  /**
   * Perform performance analysis
   */
  private async performPerformanceAnalysis(): Promise<void> {
    this.logger.info('Starting performance analysis');

    try {
      const performance = await this.analyzePerformance({
        timeRange: '1h'
      });

      // Check against thresholds
      const thresholds = this.sreConfig.performanceThresholds!;

      if (performance.p95_latency > thresholds.latency!) {
        this.logger.warn('Latency threshold exceeded', {
          current: performance.p95_latency,
          threshold: thresholds.latency
        });
      }

    } catch (error: any) {
      this.logger.error('Performance analysis failed:', {
        error: error.message
      });
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    this.logger.debug('Collecting system metrics');

    try {
      const metrics = await this.mcpClient.callTool('get_system_metrics', {
        time_range: '15m'
      });

      this.logger.debug('System metrics collected', {
        metrics_count: metrics.metrics?.length || 0
      });

    } catch (error: any) {
      this.logger.error('Metrics collection failed:', {
        error: error.message
      });
    }
  }

  /**
   * Perform capacity planning
   */
  private async performCapacityPlanning(): Promise<void> {
    this.logger.info('Starting capacity planning analysis');

    try {
      const capacity = await this.mcpClient.callTool('analyze_capacity', {
        forecast_days: 30
      });

      this.logger.info('Capacity planning complete', {
        current_utilization: capacity.current_utilization,
        projected_utilization: capacity.projected_utilization,
        recommendations: capacity.recommendations
      });

    } catch (error: any) {
      this.logger.error('Capacity planning failed:', {
        error: error.message
      });
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Gather comprehensive diagnostics
   */
  private async gatherDiagnostics(service: string): Promise<any> {
    const diagnostics: any = {
      service,
      timestamp: new Date(),
      health: null,
      metrics: null,
      logs: null,
      summary: ''
    };

    try {
      // Get health status
      diagnostics.health = await this.checkSystemHealth({ service });

      // Get metrics
      diagnostics.metrics = await this.getMetrics({
        service,
        metrics: ['cpu', 'memory', 'requests', 'errors', 'latency'],
        timeRange: '1h'
      });

      // Get error logs
      diagnostics.logs = await this.mcpClient.getLogs({
        service,
        level: 'error',
        lines: 100
      });

      // Generate summary
      diagnostics.summary = this.generateDiagnosticSummary(diagnostics);

    } catch (error: any) {
      this.logger.error('Failed to gather diagnostics:', {
        error: error.message,
        service
      });
    }

    return diagnostics;
  }

  /**
   * Attempt automated remediation
   */
  private async attemptRemediation(service: string, diagnostics: any): Promise<void> {
    this.logger.info('Attempting automated remediation', { service });

    // Simple remediation logic - in production, this could be more sophisticated
    if (diagnostics.metrics?.cpu > 90) {
      this.logger.info('High CPU detected, scaling up', { service });
      await this.scaleApplication({
        application: service,
        replicas: diagnostics.metrics.current_replicas * 2
      });
    }
  }

  /**
   * Generate diagnostic summary
   */
  private generateDiagnosticSummary(diagnostics: any): string {
    const parts = [];

    if (diagnostics.health?.status !== 'healthy') {
      parts.push(`Service health: ${diagnostics.health?.status}`);
    }

    if (diagnostics.metrics?.cpu > 80) {
      parts.push(`High CPU: ${diagnostics.metrics?.cpu}%`);
    }

    if (diagnostics.metrics?.error_rate > 0.01) {
      parts.push(`Elevated error rate: ${diagnostics.metrics?.error_rate * 100}%`);
    }

    return parts.join('; ') || 'No issues detected';
  }
}
