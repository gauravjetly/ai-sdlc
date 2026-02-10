/**
 * Architect Agent
 *
 * AI persona for architecture review and design validation
 * Handles architecture analysis, design pattern validation, dependency management, and technical debt tracking
 */

import { BaseAgent, BaseAgentConfig } from './base-agent';
import { AgentType, PlatformEvent } from '../orchestration/types/orchestration-types';

export interface ArchitectAgentConfig extends BaseAgentConfig {
  architectureStandards?: string[];
  complexityThreshold?: number;
  weeklyReviewDay?: number; // 0-6, 0 = Sunday
}

/**
 * Architect Agent
 * Specialized in architecture review and design validation
 */
export class ArchitectAgent extends BaseAgent {
  private archConfig: ArchitectAgentConfig;

  constructor(config: ArchitectAgentConfig) {
    super(config);
    this.archConfig = {
      architectureStandards: ['clean-architecture', 'solid', 'ddd'],
      complexityThreshold: 10,
      weeklyReviewDay: 1, // Monday
      ...config
    };
  }

  protected setupEventTriggers(): void {
    // Review new services
    this.registerEventHandler('service.created', async (event: PlatformEvent) => {
      await this.reviewNewService(event);
    });

    // Review architecture changes
    this.registerEventHandler('code.committed', async (event: PlatformEvent) => {
      await this.reviewArchitectureChanges(event);
    });

    // Review deployment architecture
    this.registerEventHandler('deployment.complete', async (event: PlatformEvent) => {
      await this.validateDeploymentArchitecture(event);
    });
  }

  protected setupScheduledJobs(): void {
    // Weekly architecture review (Monday 10 AM)
    this.scheduleJob(
      'architecture-review',
      '0 10 * * 1',
      async () => await this.performWeeklyReview()
    );

    // Monthly technical debt assessment (1st of month, 9 AM)
    this.scheduleJob(
      'technical-debt',
      '0 9 1 * *',
      async () => await this.assessTechnicalDebt()
    );

    // Daily dependency analysis at 11 AM
    this.scheduleJob(
      'dependency-analysis',
      '0 11 * * *',
      async () => await this.analyzeDependencies()
    );
  }

  protected async executeInternal(parameters: any): Promise<any> {
    const { action, ...params } = parameters;

    switch (action) {
      case 'validate_architecture':
        return await this.validateArchitecture(params);
      case 'analyze_dependencies':
        return await this.checkDependencies(params);
      case 'review_design':
        return await this.reviewDesignPatterns(params);
      case 'assess_complexity':
        return await this.assessComplexity(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  protected getAgentType(): AgentType {
    return AgentType.ARCHITECT;
  }

  protected getCapabilities(): string[] {
    return [
      'validate_architecture',
      'analyze_dependencies',
      'review_design_patterns',
      'check_dependencies',
      'assess_technical_debt',
      'analyze_complexity'
    ];
  }

  // Public Methods
  async validateArchitecture(params: {
    target: string;
    rules?: string[];
  }): Promise<any> {
    this.logger.info('Validating architecture', params);

    const result = await this.mcpClient.validateArchitecture({
      target: params.target,
      rules: params.rules || this.archConfig.architectureStandards
    });

    this.logger.info('Architecture validation complete', {
      target: params.target,
      violations: result.violations_count,
      score: result.architecture_score
    });

    return result;
  }

  async checkDependencies(params: {
    target: string;
    depth?: number;
  }): Promise<any> {
    this.logger.info('Analyzing dependencies', params);

    const result = await this.mcpClient.analyzeDependencies({
      target: params.target,
      depth: params.depth || 3
    });

    this.logger.info('Dependency analysis complete', {
      total_dependencies: result.total_dependencies,
      circular_dependencies: result.circular_dependencies,
      outdated: result.outdated_dependencies
    });

    return result;
  }

  async reviewDesignPatterns(params: { target: string }): Promise<any> {
    this.logger.info('Reviewing design patterns', params);

    const result = await this.mcpClient.callTool('review_design_patterns', {
      target: params.target
    });

    this.logger.info('Design pattern review complete', {
      patterns_found: result.patterns_count,
      anti_patterns: result.anti_patterns_count
    });

    return result;
  }

  async assessComplexity(params: { target: string }): Promise<any> {
    this.logger.info('Assessing code complexity', params);

    const result = await this.mcpClient.callTool('assess_complexity', {
      target: params.target
    });

    this.logger.info('Complexity assessment complete', {
      avg_complexity: result.average_complexity,
      high_complexity_count: result.high_complexity_modules
    });

    return result;
  }

  // Event Handlers
  private async reviewNewService(event: PlatformEvent): Promise<void> {
    const { serviceId, serviceName } = event.data;

    this.logger.info('Reviewing new service architecture', {
      serviceId,
      serviceName
    });

    try {
      const validation = await this.validateArchitecture({
        target: serviceName
      });

      if (validation.violations_count > 0) {
        this.logger.warn('Architecture violations found in new service', {
          serviceId,
          violations: validation.violations_count
        });
      }
    } catch (error: any) {
      this.logger.error('Failed to review new service:', {
        error: error.message,
        serviceId
      });
    }
  }

  private async reviewArchitectureChanges(event: PlatformEvent): Promise<void> {
    const { commitId, files } = event.data;

    if (files && files.length > 0) {
      this.logger.debug('Reviewing architecture changes in commit', {
        commitId,
        files_changed: files.length
      });

      // Check for architectural files
      const archFiles = files.filter((f: string) =>
        f.includes('/domain/') || f.includes('/application/') || f.includes('/infrastructure/')
      );

      if (archFiles.length > 0) {
        this.logger.info('Architecture files modified, validating', {
          commitId,
          arch_files: archFiles.length
        });
      }
    }
  }

  private async validateDeploymentArchitecture(event: PlatformEvent): Promise<void> {
    const { deploymentId, application } = event.data;

    this.logger.info('Validating deployment architecture', {
      deploymentId,
      application
    });

    try {
      await this.validateArchitecture({ target: application });
    } catch (error: any) {
      this.logger.error('Deployment architecture validation failed:', {
        error: error.message,
        deploymentId
      });
    }
  }

  // Scheduled Tasks
  private async performWeeklyReview(): Promise<void> {
    this.logger.info('Starting weekly architecture review');

    try {
      const review = await this.mcpClient.callTool('comprehensive_architecture_review', {});

      this.logger.info('Weekly architecture review complete', {
        services_reviewed: review.services_count,
        violations: review.total_violations,
        recommendations: review.recommendations?.length || 0
      });

    } catch (error: any) {
      this.logger.error('Weekly architecture review failed:', { error: error.message });
    }
  }

  private async assessTechnicalDebt(): Promise<void> {
    this.logger.info('Starting technical debt assessment');

    try {
      const debt = await this.mcpClient.callTool('assess_technical_debt', {});

      this.logger.info('Technical debt assessment complete', {
        debt_score: debt.debt_score,
        high_priority_items: debt.high_priority_count,
        estimated_effort: debt.total_effort_days
      });

    } catch (error: any) {
      this.logger.error('Technical debt assessment failed:', { error: error.message });
    }
  }

  private async analyzeDependencies(): Promise<void> {
    this.logger.info('Starting daily dependency analysis');

    try {
      const deps = await this.checkDependencies({ target: '.' });

      if (deps.circular_dependencies > 0) {
        this.logger.warn('Circular dependencies detected', {
          count: deps.circular_dependencies
        });
      }

    } catch (error: any) {
      this.logger.error('Dependency analysis failed:', { error: error.message });
    }
  }
}
