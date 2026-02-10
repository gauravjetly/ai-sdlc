/**
 * FinOps Agent
 *
 * AI persona for Financial Operations and cost optimization
 * Handles cost analysis, budget tracking, resource optimization, and cost forecasting
 */

import { BaseAgent, BaseAgentConfig } from './base-agent';
import { AgentType, PlatformEvent } from '../orchestration/types/orchestration-types';

export interface FinOpsAgentConfig extends BaseAgentConfig {
  budgetThreshold?: number;
  costAlertThreshold?: number;
  optimizationEnabled?: boolean;
}

/**
 * FinOps Agent
 * Specialized in cost management and financial optimization
 */
export class FinOpsAgent extends BaseAgent {
  private finConfig: FinOpsAgentConfig;

  constructor(config: FinOpsAgentConfig) {
    super(config);
    this.finConfig = {
      budgetThreshold: 10000, // $10,000
      costAlertThreshold: 0.8, // 80% of budget
      optimizationEnabled: true,
      ...config
    };
  }

  protected setupEventTriggers(): void {
    // Handle cost threshold exceeded
    this.registerEventHandler('cost.threshold_exceeded', async (event: PlatformEvent) => {
      await this.handleCostThresholdExceeded(event);
    });

    // Analyze deployment costs
    this.registerEventHandler('deployment.complete', async (event: PlatformEvent) => {
      await this.analyzeDeploymentCosts(event);
    });

    // Handle resource scaling for cost optimization
    this.registerEventHandler('resource.scaled', async (event: PlatformEvent) => {
      await this.trackScalingCosts(event);
    });
  }

  protected setupScheduledJobs(): void {
    // Daily cost analysis at 8 AM
    this.scheduleJob(
      'cost-analysis',
      '0 8 * * *',
      async () => await this.performDailyCostAnalysis()
    );

    // Weekly optimization recommendations (Monday 9 AM)
    this.scheduleJob(
      'optimization-recommendations',
      '0 9 * * 1',
      async () => await this.generateOptimizationRecommendations()
    );

    // Monthly budget review (1st of month, 10 AM)
    this.scheduleJob(
      'budget-review',
      '0 10 1 * *',
      async () => await this.performBudgetReview()
    );

    // Hourly cost tracking
    this.scheduleJob(
      'cost-tracking',
      '0 * * * *',
      async () => await this.trackCurrentCosts()
    );
  }

  protected async executeInternal(parameters: any): Promise<any> {
    const { action, ...params } = parameters;

    switch (action) {
      case 'analyze_costs':
        return await this.analyzeCosts(params);
      case 'forecast_costs':
        return await this.forecastCosts(params);
      case 'optimize_resources':
        return await this.optimizeResources(params);
      case 'get_cost_report':
        return await this.getCostReport(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  protected getAgentType(): AgentType {
    return AgentType.FINOPS;
  }

  protected getCapabilities(): string[] {
    return [
      'analyze_costs',
      'get_cost_recommendations',
      'optimize_resources',
      'forecast_costs',
      'track_budget',
      'generate_cost_reports'
    ];
  }

  // Public Methods
  async analyzeCosts(params: {
    period?: 'daily' | 'weekly' | 'monthly';
    cloud?: 'aws' | 'oci' | 'azure' | 'gcp';
  }): Promise<any> {
    this.logger.info('Analyzing costs', params);

    const result = await this.mcpClient.callTool('analyze_costs', {
      period: params.period || 'daily',
      cloud: params.cloud
    });

    this.logger.info('Cost analysis complete', {
      total_cost: result.total_cost,
      period: params.period,
      top_services: result.top_cost_services
    });

    // Check against threshold
    if (result.total_cost > this.finConfig.budgetThreshold!) {
      this.logger.warn('Cost exceeds budget threshold', {
        current: result.total_cost,
        threshold: this.finConfig.budgetThreshold
      });

      await this.eventManager.costThresholdExceeded(
        this.finConfig.budgetThreshold!,
        result.total_cost,
        { period: params.period, cloud: params.cloud }
      );
    }

    return result;
  }

  async forecastCosts(params: {
    cloud: 'aws' | 'oci' | 'azure' | 'gcp';
    months: number;
  }): Promise<any> {
    this.logger.info('Forecasting costs', params);

    const result = await this.mcpClient.forecastCosts({
      cloud: params.cloud,
      months: params.months
    });

    this.logger.info('Cost forecast complete', {
      cloud: params.cloud,
      forecast_months: params.months,
      projected_cost: result.projected_cost
    });

    return result;
  }

  async optimizeResources(params: {
    target?: string;
    aggressive?: boolean;
  }): Promise<any> {
    this.logger.info('Optimizing resources', params);

    const result = await this.mcpClient.callTool('optimize_resources', {
      target: params.target || 'all',
      aggressive: params.aggressive || false
    });

    this.logger.info('Resource optimization complete', {
      potential_savings: result.potential_savings,
      recommendations: result.recommendations?.length || 0
    });

    // Apply optimizations if enabled
    if (this.finConfig.optimizationEnabled && !params.aggressive) {
      await this.applyOptimizations(result.recommendations);
    }

    return result;
  }

  async getCostReport(params: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    cloud?: 'aws' | 'oci' | 'azure' | 'gcp';
  }): Promise<any> {
    this.logger.info('Generating cost report', params);

    const result = await this.mcpClient.getCostReport({
      period: params.period,
      cloud: params.cloud
    });

    this.logger.info('Cost report generated', {
      period: params.period,
      total_cost: result.total_cost
    });

    return result;
  }

  // Event Handlers
  private async handleCostThresholdExceeded(event: PlatformEvent): Promise<void> {
    const { threshold, actual } = event.data;

    this.logger.error('Cost threshold exceeded', {
      threshold,
      actual,
      overage: actual - threshold
    });

    try {
      // Generate immediate optimization recommendations
      const optimizations = await this.optimizeResources({
        aggressive: true
      });

      this.logger.info('Emergency optimization recommendations generated', {
        potential_savings: optimizations.potential_savings
      });

    } catch (error: any) {
      this.logger.error('Failed to handle cost threshold exceeded:', {
        error: error.message
      });
    }
  }

  private async analyzeDeploymentCosts(event: PlatformEvent): Promise<void> {
    const { deploymentId, application } = event.data;

    this.logger.info('Analyzing deployment costs', {
      deploymentId,
      application
    });

    try {
      const costs = await this.mcpClient.callTool('get_deployment_costs', {
        deployment_id: deploymentId
      });

      this.logger.info('Deployment cost analysis complete', {
        deploymentId,
        estimated_monthly_cost: costs.monthly_cost
      });

    } catch (error: any) {
      this.logger.error('Failed to analyze deployment costs:', {
        error: error.message,
        deploymentId
      });
    }
  }

  private async trackScalingCosts(event: PlatformEvent): Promise<void> {
    const { service, previous_replicas, new_replicas } = event.data;

    const costImpact = (new_replicas - previous_replicas) * event.data.cost_per_replica;

    this.logger.info('Tracking scaling cost impact', {
      service,
      previous_replicas,
      new_replicas,
      cost_impact: costImpact
    });
  }

  // Scheduled Tasks
  private async performDailyCostAnalysis(): Promise<void> {
    this.logger.info('Starting daily cost analysis');

    try {
      const costs = await this.analyzeCosts({ period: 'daily' });

      this.logger.info('Daily cost analysis complete', {
        total_cost: costs.total_cost,
        budget_utilization: (costs.total_cost / this.finConfig.budgetThreshold! * 100).toFixed(2) + '%'
      });

    } catch (error: any) {
      this.logger.error('Daily cost analysis failed:', { error: error.message });
    }
  }

  private async generateOptimizationRecommendations(): Promise<void> {
    this.logger.info('Generating weekly optimization recommendations');

    try {
      const optimizations = await this.optimizeResources({});

      this.logger.info('Optimization recommendations generated', {
        potential_savings: optimizations.potential_savings,
        recommendations_count: optimizations.recommendations?.length || 0
      });

    } catch (error: any) {
      this.logger.error('Failed to generate optimization recommendations:', {
        error: error.message
      });
    }
  }

  private async performBudgetReview(): Promise<void> {
    this.logger.info('Starting monthly budget review');

    try {
      const report = await this.getCostReport({ period: 'monthly' });

      this.logger.info('Monthly budget review complete', {
        total_cost: report.total_cost,
        budget: this.finConfig.budgetThreshold,
        variance: report.total_cost - this.finConfig.budgetThreshold!
      });

      // Generate forecast for next month
      const forecast = await this.forecastCosts({
        cloud: 'aws',
        months: 1
      });

      this.logger.info('Next month cost forecast', {
        projected_cost: forecast.projected_cost
      });

    } catch (error: any) {
      this.logger.error('Monthly budget review failed:', { error: error.message });
    }
  }

  private async trackCurrentCosts(): Promise<void> {
    this.logger.debug('Tracking current hour costs');

    try {
      const costs = await this.mcpClient.callTool('get_current_costs', {});

      const budgetUtilization = (costs.current_cost / this.finConfig.budgetThreshold!) * 100;

      if (budgetUtilization > this.finConfig.costAlertThreshold! * 100) {
        this.logger.warn('Budget utilization approaching threshold', {
          utilization: budgetUtilization.toFixed(2) + '%',
          threshold: this.finConfig.costAlertThreshold! * 100 + '%'
        });
      }

    } catch (error: any) {
      this.logger.error('Cost tracking failed:', { error: error.message });
    }
  }

  // Private Helper Methods
  private async applyOptimizations(recommendations: any[]): Promise<void> {
    if (!recommendations || recommendations.length === 0) {
      return;
    }

    this.logger.info('Applying safe optimizations', {
      count: recommendations.length
    });

    for (const rec of recommendations) {
      if (rec.risk_level === 'low' && rec.auto_apply) {
        try {
          await this.mcpClient.callTool('apply_optimization', {
            optimization_id: rec.id
          });

          this.logger.info('Optimization applied', {
            optimization: rec.name,
            estimated_savings: rec.savings
          });

        } catch (error: any) {
          this.logger.error('Failed to apply optimization:', {
            error: error.message,
            optimization: rec.name
          });
        }
      }
    }
  }
}
