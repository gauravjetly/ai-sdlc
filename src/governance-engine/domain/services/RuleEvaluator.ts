/**
 * Rule Evaluator Service
 * @module @deltek/governance-engine/domain/services/RuleEvaluator
 */

import { Policy, EnforcementLevel } from '../../types/policy.types';
import { Violation, ViolationSeverity } from '../../types/validation.types';

/**
 * Service for evaluating rules and determining enforcement actions
 */
export class RuleEvaluator {
  /**
   * Determine if a violation should block
   */
  shouldBlock(violation: Violation, policy: Policy): boolean {
    const enforcement = this.getEnforcementLevel(violation.rule, policy);
    return enforcement === 'block' && this.isSeverityBlocking(violation.severity);
  }

  /**
   * Determine if a violation should warn
   */
  shouldWarn(violation: Violation, policy: Policy): boolean {
    const enforcement = this.getEnforcementLevel(violation.rule, policy);
    return enforcement === 'warn' ||
           (enforcement === 'block' && !this.isSeverityBlocking(violation.severity));
  }

  /**
   * Check if severity should cause blocking
   */
  private isSeverityBlocking(severity: ViolationSeverity): boolean {
    return severity === 'critical' || severity === 'high';
  }

  /**
   * Get enforcement level for a rule
   */
  getEnforcementLevel(rule: string, policy: Policy): EnforcementLevel {
    // Parse rule path like "security.secrets" or "architecture.layer_violation"
    const parts = rule.split('.');

    // Check enforcement section first
    if (policy.enforcement?.postGeneration) {
      const check = policy.enforcement.postGeneration.find(c => c.check === rule);
      if (check) {
        return check.action as EnforcementLevel;
      }
    }

    // Map rule categories to policy sections
    const ruleMap: Record<string, () => EnforcementLevel | undefined> = {
      'security.secrets': () => policy.security?.secrets?.enforcement,
      'security.sql_injection': () => policy.security?.sqlInjection?.enforcement,
      'security.input_validation': () => policy.security?.inputValidation?.enforcement,
      'security.owasp': () => policy.security?.owaspTop10?.enforcement,
      'architecture.layer_violation': () => this.getArchitectureEnforcement(policy),
      'code_quality.test_coverage': () => policy.codeQuality?.testCoverage?.enforcement,
      'code_quality.linting': () => policy.codeQuality?.linting?.enforcement,
      'code_quality.type_safety': () => policy.codeQuality?.typeSafety?.enforcement,
      'repository.branch_naming': () => policy.repository?.branchNaming?.enforcement,
      'repository.commit_message': () => policy.repository?.commitMessage?.enforcement,
    };

    // Try exact match first
    if (ruleMap[rule]) {
      const level = ruleMap[rule]();
      if (level) return level;
    }

    // Try prefix match
    for (const [key, getter] of Object.entries(ruleMap)) {
      if (rule.startsWith(key)) {
        const level = getter();
        if (level) return level;
      }
    }

    // Default to warn
    return 'warn';
  }

  /**
   * Get architecture enforcement level
   */
  private getArchitectureEnforcement(policy: Policy): EnforcementLevel {
    // Check if any SOLID principle blocks
    const principles = policy.architecture?.principles;
    if (principles) {
      if (principles.dependencyInversion?.violationsBlock) return 'block';
      if (principles.singleResponsibility?.violationsBlock) return 'block';
      if (principles.liskovSubstitution?.violationsBlock) return 'block';
    }
    return 'warn';
  }

  /**
   * Map severity string to ViolationSeverity
   */
  mapSeverity(severity: string): ViolationSeverity {
    const mapping: Record<string, ViolationSeverity> = {
      'critical': 'critical',
      'error': 'high',
      'high': 'high',
      'warning': 'medium',
      'medium': 'medium',
      'info': 'low',
      'low': 'low',
      'note': 'info',
    };
    return mapping[severity.toLowerCase()] || 'medium';
  }
}
