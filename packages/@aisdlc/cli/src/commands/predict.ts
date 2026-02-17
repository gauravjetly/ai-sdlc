import { PredictiveEngine, type WorkflowContext } from '@aisdlc/ml';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Predict quality issues for current changes
 */
export async function predictCommand(args: string[]): Promise<void> {
  console.log('  AI-SDLC Predictive Quality Analysis');
  console.log('  ====================================\n');

  try {
    const engine = new PredictiveEngine();

    // Get current changes from git
    const context = await getCurrentContext();

    console.log('  Analyzing current changes...');
    console.log(`  Files changed: ${context.filesChanged}`);
    console.log(`  Lines changed: ${context.linesChanged}`);
    console.log(`  Description: ${context.description}\n`);

    // Get predictions
    const predictions = await engine.predict(context);

    if (predictions.length === 0) {
      console.log('  ✅ No quality issues predicted!\n');
      console.log('  Your changes look good based on historical patterns.\n');
      return;
    }

    console.log(`  ⚠️  Predicted ${predictions.length} potential issue(s):\n`);

    for (const pred of predictions) {
      const icon = getIconForType(pred.type);
      const color = getColorForConfidence(pred.confidence);

      console.log(`  ${icon} ${pred.type.toUpperCase()} (${(pred.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`     ${pred.reason}\n`);

      if (pred.historicalData.occurrences > 0) {
        console.log(`     Historical data:`);
        console.log(`     - Occurred ${pred.historicalData.occurrences} time(s) before`);
        console.log(`     - Last seen: ${pred.historicalData.lastSeen.toLocaleDateString()}`);
        console.log(`     - Avg impact: ${pred.historicalData.avgImpact}\n`);
      }

      console.log(`     Suggestions:`);
      pred.suggestions.slice(0, 3).forEach((s, i) => {
        console.log(`     ${i + 1}. ${s}`);
      });
      console.log('');
    }

    console.log('  Recommendations:');
    console.log('  ----------------');

    const highConfidence = predictions.filter(p => p.confidence > 0.7);
    if (highConfidence.length > 0) {
      console.log(`  🔴 HIGH PRIORITY: Address ${highConfidence.length} high-confidence prediction(s)`);
    }

    const securityIssues = predictions.filter(p => p.type === 'security');
    if (securityIssues.length > 0) {
      console.log('  🔒 Run security review early in workflow');
    }

    const regressionRisk = predictions.filter(p => p.type === 'regression');
    if (regressionRisk.length > 0) {
      console.log('  🧪 Run full regression test suite');
    }

    console.log('\n  Use these predictions to:');
    console.log('  • Plan your SDLC workflow');
    console.log('  • Focus testing efforts');
    console.log('  • Allocate time appropriately');
    console.log('  • Prevent issues proactively\n');

  } catch (error: any) {
    console.error('  Error running prediction:', error.message);
    process.exit(1);
  }
}

async function getCurrentContext(): Promise<WorkflowContext> {
  try {
    // Get changed files from git
    const changedFiles = execSync('git diff --name-only HEAD', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.trim());

    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.trim());

    const allFiles = [...new Set([...changedFiles, ...stagedFiles])];

    // Get line changes
    let linesChanged = 0;
    try {
      const diffStats = execSync('git diff --stat HEAD', { encoding: 'utf-8' });
      const match = diffStats.match(/(\d+) insertions?.*?(\d+) deletions?/);
      if (match) {
        linesChanged = parseInt(match[1]) + parseInt(match[2]);
      }
    } catch (e) {
      // No changes
    }

    // Get branch name
    let branch = 'main';
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch (e) {
      // Use default
    }

    // Get last commit message as description
    let description = 'Code changes';
    try {
      description = execSync('git log -1 --pretty=%s', { encoding: 'utf-8' }).trim();
    } catch (e) {
      // Use default
    }

    const fileTypes = [...new Set(allFiles.map(f => path.extname(f)))];

    return {
      files: allFiles,
      fileTypes,
      linesChanged,
      filesChanged: allFiles.length,
      branch,
      description
    };
  } catch (error) {
    // Not a git repo or no changes
    return {
      files: [],
      fileTypes: [],
      linesChanged: 0,
      filesChanged: 0,
      description: 'No changes detected'
    };
  }
}

function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    security: '🔒',
    performance: '⚡',
    'test-failure': '🧪',
    regression: '🔄',
    complexity: '🎯'
  };
  return icons[type] || '⚠️';
}

function getColorForConfidence(confidence: number): string {
  if (confidence > 0.8) return 'red';
  if (confidence > 0.6) return 'yellow';
  return 'blue';
}
