/**
 * Coverage Validator
 * @module @deltek/governance-engine/infrastructure/validators/CoverageValidator
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Policy } from '../../types/policy.types';
import {
  Validator,
  ValidationContext,
  ValidationResult,
  Violation,
} from '../../types/validation.types';

/**
 * Coverage report format (lcov/istanbul summary)
 */
interface CoverageReport {
  total: CoverageSummary;
  byFile?: Record<string, CoverageSummary>;
}

interface CoverageSummary {
  lines: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
}

/**
 * Validates test coverage meets policy requirements
 */
export class CoverageValidator implements Validator {
  readonly name = 'coverage-validator';
  readonly description = 'Validates test coverage meets minimum thresholds';

  private readonly coveragePaths = [
    'coverage/coverage-summary.json',
    'coverage/lcov-report/coverage-summary.json',
    '.nyc_output/coverage-summary.json',
  ];

  appliesTo(context: ValidationContext, policy: Policy): boolean {
    return (
      !!policy.codeQuality?.testCoverage &&
      policy.codeQuality.testCoverage.enforcement !== 'off'
    );
  }

  async validate(
    context: ValidationContext,
    policy: Policy
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];

    try {
      const report = await this.loadCoverageReport(context.workingDirectory);

      if (!report) {
        // No coverage report found - warn but don't fail
        return {
          validator: this.name,
          passed: true,
          violations: [],
          duration: Date.now() - startTime,
          metadata: {
            warning: 'No coverage report found. Run tests with coverage first.',
          },
        };
      }

      // Check total coverage
      const minTotal = policy.codeQuality.testCoverage.minimumTotal;
      if (report.total.lines.pct < minTotal) {
        violations.push({
          rule: 'code_quality.test_coverage.total',
          severity: 'high',
          message: `Test coverage ${report.total.lines.pct.toFixed(1)}% is below minimum ${minTotal}%`,
          remediation: `Add tests to increase coverage. Current: ${report.total.lines.covered}/${report.total.lines.total} lines covered.`,
          details: {
            current: report.total.lines.pct,
            required: minTotal,
            covered: report.total.lines.covered,
            total: report.total.lines.total,
          },
        });
      }

      // Check layer-specific coverage
      if (
        policy.codeQuality.testCoverage.byLayer &&
        report.byFile
      ) {
        const layerCoverage = this.calculateLayerCoverage(
          report.byFile,
          policy.codeQuality.testCoverage.byLayer
        );

        for (const [layer, coverage] of Object.entries(layerCoverage)) {
          const minLayer = policy.codeQuality.testCoverage.byLayer[layer];
          if (minLayer && coverage.pct < minLayer) {
            violations.push({
              rule: `code_quality.test_coverage.${layer}`,
              severity: 'high',
              message: `${layer} layer coverage ${coverage.pct.toFixed(1)}% is below minimum ${minLayer}%`,
              remediation: `Add tests for ${layer} layer. Current: ${coverage.covered}/${coverage.total} lines covered.`,
              details: {
                layer,
                current: coverage.pct,
                required: minLayer,
              },
            });
          }
        }
      }
    } catch (error) {
      return {
        validator: this.name,
        passed: true,
        violations: [],
        duration: Date.now() - startTime,
        skipped: true,
        skipReason: `Could not load coverage report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    return {
      validator: this.name,
      passed: violations.length === 0,
      violations,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Load coverage report from various possible locations
   */
  private async loadCoverageReport(
    workingDirectory: string
  ): Promise<CoverageReport | null> {
    for (const coveragePath of this.coveragePaths) {
      const fullPath = path.join(workingDirectory, coveragePath);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const parsed = JSON.parse(content);
        return this.normalizeCoverageReport(parsed);
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Normalize different coverage report formats
   */
  private normalizeCoverageReport(raw: unknown): CoverageReport {
    const report = raw as Record<string, unknown>;

    // Istanbul/nyc format
    if (report.total) {
      const total = report.total as CoverageSummary;
      const byFile: Record<string, CoverageSummary> = {};

      for (const [key, value] of Object.entries(report)) {
        if (key !== 'total' && typeof value === 'object') {
          byFile[key] = value as CoverageSummary;
        }
      }

      return { total, byFile };
    }

    // Jest coverage format
    if ((report as Record<string, unknown>).coverageMap) {
      // Convert Jest format to standard format
      return this.convertJestCoverage(report);
    }

    throw new Error('Unknown coverage report format');
  }

  /**
   * Convert Jest coverage format to standard format
   */
  private convertJestCoverage(raw: Record<string, unknown>): CoverageReport {
    // Simplified conversion - Jest's format is complex
    const total: CoverageSummary = {
      lines: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
    };

    // Sum up all file coverages
    const coverageMap = raw.coverageMap as Record<string, unknown>;
    for (const fileCoverage of Object.values(coverageMap)) {
      const fc = fileCoverage as Record<string, unknown>;
      if (fc.s) {
        const statements = fc.s as Record<string, number>;
        total.statements.total += Object.keys(statements).length;
        total.statements.covered += Object.values(statements).filter((v) => v > 0).length;
      }
    }

    // Calculate percentages
    if (total.statements.total > 0) {
      total.statements.pct =
        (total.statements.covered / total.statements.total) * 100;
      total.lines.pct = total.statements.pct; // Approximate
      total.lines.total = total.statements.total;
      total.lines.covered = total.statements.covered;
    }

    return { total };
  }

  /**
   * Calculate coverage by architectural layer
   */
  private calculateLayerCoverage(
    byFile: Record<string, CoverageSummary>,
    layerConfig: Record<string, number>
  ): Record<string, { pct: number; covered: number; total: number }> {
    const layerCoverage: Record<string, { covered: number; total: number }> = {};

    // Initialize layers
    for (const layer of Object.keys(layerConfig)) {
      layerCoverage[layer] = { covered: 0, total: 0 };
    }

    // Aggregate by layer
    for (const [filePath, coverage] of Object.entries(byFile)) {
      for (const layer of Object.keys(layerConfig)) {
        if (filePath.includes(`/${layer}/`) || filePath.includes(`src/${layer}`)) {
          const layerData = layerCoverage[layer];
          if (layerData) {
            layerData.covered += coverage.lines.covered;
            layerData.total += coverage.lines.total;
          }
          break;
        }
      }
    }

    // Calculate percentages
    const result: Record<string, { pct: number; covered: number; total: number }> = {};
    for (const [layer, data] of Object.entries(layerCoverage)) {
      result[layer] = {
        ...data,
        pct: data.total > 0 ? (data.covered / data.total) * 100 : 100,
      };
    }

    return result;
  }
}
