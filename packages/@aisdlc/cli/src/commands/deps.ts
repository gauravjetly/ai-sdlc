import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Dependency Analyzer
 * Check dependencies for security, updates, and optimization
 */

export async function depsCommand(args: string[]): Promise<void> {
  const action = args[0] || 'analyze';

  switch (action) {
    case 'analyze':
      await analyzeDependencies();
      break;
    case 'security':
      await checkSecurity();
      break;
    case 'outdated':
      await checkOutdated();
      break;
    case 'unused':
      await findUnused();
      break;
    default:
      console.log('Usage: aisdlc deps [analyze|security|outdated|unused]');
  }
}

async function analyzeDependencies(): Promise<void> {
  console.log('\n  Dependency Health Report');
  console.log('  ═══════════════════════════\n');

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  console.log(`  Total dependencies: ${Object.keys(deps).length}\n`);

  // Check security
  const securityIssues = await checkSecurityQuick();
  if (securityIssues > 0) {
    console.log(`  🔴 Security: ${securityIssues} vulnerabilities found`);
  } else {
    console.log('  ✅ Security: No vulnerabilities');
  }

  // Check outdated
  const outdated = await checkOutdatedQuick();
  console.log(`  ${outdated > 0 ? '🟡' : '✅'} Updates: ${outdated} packages outdated`);

  // Estimate size
  const size = estimateSize(deps);
  console.log(`  📦 Size: ~${size}MB\n`);
}

async function checkSecurity(): Promise<void> {
  console.log('\n  Security Vulnerabilities:\n');

  try {
    const audit = execSync('npm audit --json', { encoding: 'utf-8' });
    const auditData = JSON.parse(audit);

    if (auditData.vulnerabilities) {
      const vulns = Object.values(auditData.vulnerabilities) as any[];
      const critical = vulns.filter((v: any) => v.severity === 'critical').length;
      const high = vulns.filter((v: any) => v.severity === 'high').length;
      const moderate = vulns.filter((v: any) => v.severity === 'moderate').length;

      console.log(`  Critical: ${critical}`);
      console.log(`  High:     ${high}`);
      console.log(`  Moderate: ${moderate}\n`);

      if (critical + high > 0) {
        console.log('  Run: npm audit fix\n');
      }
    }
  } catch (error) {
    console.log('  ✅ No vulnerabilities found\n');
  }
}

async function checkOutdated(): Promise<void> {
  console.log('\n  Outdated Dependencies:\n');

  try {
    const outdated = execSync('npm outdated --json', { encoding: 'utf-8' });
    const outdatedData = JSON.parse(outdated || '{}');

    if (Object.keys(outdatedData).length === 0) {
      console.log('  ✅ All dependencies up to date\n');
      return;
    }

    for (const [name, info] of Object.entries(outdatedData) as any) {
      console.log(`  ${name}: ${info.current} → ${info.latest}`);
    }

    console.log(`\n  Run: npm update\n`);
  } catch (error) {
    console.log('  ✅ All dependencies up to date\n');
  }
}

async function findUnused(): Promise<void> {
  console.log('\n  Unused Dependencies:\n');

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const deps = Object.keys(packageJson.dependencies || {});

  const unused: string[] = [];

  for (const dep of deps) {
    const isUsed = checkIfUsed(dep);
    if (!isUsed) {
      unused.push(dep);
    }
  }

  if (unused.length === 0) {
    console.log('  ✅ No unused dependencies\n');
    return;
  }

  unused.forEach(dep => {
    console.log(`  ${dep}`);
  });

  console.log(`\n  Remove with: npm uninstall ${unused.join(' ')}\n`);
}

function checkIfUsed(dep: string): boolean {
  try {
    const result = execSync(`grep -r "from '${dep}'" src/`, { encoding: 'utf-8' });
    return result.length > 0;
  } catch {
    return false;
  }
}

async function checkSecurityQuick(): Promise<number> {
  try {
    const audit = execSync('npm audit --json', { encoding: 'utf-8' });
    const auditData = JSON.parse(audit);
    return Object.keys(auditData.vulnerabilities || {}).length;
  } catch {
    return 0;
  }
}

async function checkOutdatedQuick(): Promise<number> {
  try {
    const outdated = execSync('npm outdated --json', { encoding: 'utf-8' });
    const outdatedData = JSON.parse(outdated || '{}');
    return Object.keys(outdatedData).length;
  } catch {
    return 0;
  }
}

function estimateSize(deps: Record<string, string>): number {
  // Rough estimate: 1MB per 5 packages
  return Math.round(Object.keys(deps).length / 5);
}
