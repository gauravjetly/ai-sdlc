import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Code Quality Analyzer
 *
 * Analyzes codebase for quality issues:
 * - Duplicate code
 * - Complexity
 * - SOLID violations
 * - Code smells
 */

interface AnalysisResult {
  type: 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line?: number;
  description: string;
  suggestion: string;
  impact?: string;
}

export async function analyzeCommand(args: string[]): Promise<void> {
  const targetPath = args[0] || 'src/';

  console.log('  AI-SDLC Code Quality Analyzer');
  console.log('  ==============================\n');
  console.log(`  Analyzing: ${targetPath}\n`);

  const results: AnalysisResult[] = [];

  // Run multiple analyzers
  results.push(...await analyzeDuplicates(targetPath));
  results.push(...await analyzeComplexity(targetPath));
  results.push(...await analyzeSOLID(targetPath));
  results.push(...await analyzeCodeSmells(targetPath));

  // Display results
  displayResults(results);
}

async function analyzeDuplicates(targetPath: string): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  // Simple duplicate detection (in production, use jscpd or similar)
  const files = findTypeScriptFiles(targetPath);
  const codeBlocks: Map<string, string[]> = new Map();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Look for duplicate blocks (5+ lines)
    for (let i = 0; i < lines.length - 5; i++) {
      const block = lines.slice(i, i + 5).join('\n');
      const normalized = block.replace(/\s+/g, ' ').trim();

      if (normalized.length < 50) continue; // Skip short blocks

      if (!codeBlocks.has(normalized)) {
        codeBlocks.set(normalized, [file]);
      } else {
        codeBlocks.get(normalized)!.push(file);
      }
    }
  }

  // Report duplicates
  for (const [block, files] of codeBlocks.entries()) {
    if (files.length > 1) {
      results.push({
        type: 'high',
        category: 'Duplicate Code',
        file: files[0],
        description: `Duplicate code found in ${files.length} files`,
        suggestion: 'Extract to shared function or module',
        impact: `-${files.length * 5} lines`
      });
    }
  }

  return results;
}

async function analyzeComplexity(targetPath: string): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  const files = findTypeScriptFiles(targetPath);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const functions = extractFunctions(content);

    for (const func of functions) {
      const complexity = calculateCyclomaticComplexity(func.body);

      if (complexity > 15) {
        results.push({
          type: 'high',
          category: 'High Complexity',
          file,
          line: func.line,
          description: `Function '${func.name}' has cyclomatic complexity of ${complexity}`,
          suggestion: 'Refactor into smaller functions (target: <10)',
          impact: 'Reduced maintainability'
        });
      } else if (complexity > 10) {
        results.push({
          type: 'medium',
          category: 'Medium Complexity',
          file,
          line: func.line,
          description: `Function '${func.name}' has cyclomatic complexity of ${complexity}`,
          suggestion: 'Consider refactoring if adding more logic'
        });
      }
    }
  }

  return results;
}

async function analyzeSOLID(targetPath: string): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  const files = findTypeScriptFiles(targetPath);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');

    // Single Responsibility: Count methods in class
    const classes = extractClasses(content);
    for (const cls of classes) {
      if (cls.methodCount > 10) {
        results.push({
          type: 'medium',
          category: 'SOLID Violation',
          file,
          line: cls.line,
          description: `Class '${cls.name}' has ${cls.methodCount} methods (SRP violation)`,
          suggestion: 'Split into smaller, focused classes',
          impact: 'Difficult to test and maintain'
        });
      }
    }

    // Dependency Inversion: Check for direct instantiation
    if (content.match(/new \w+Service\(/g)) {
      results.push({
        type: 'low',
        category: 'SOLID Violation',
        file,
        description: 'Direct service instantiation (DIP violation)',
        suggestion: 'Use dependency injection instead',
        impact: 'Tight coupling'
      });
    }
  }

  return results;
}

async function analyzeCodeSmells(targetPath: string): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  const files = findTypeScriptFiles(targetPath);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Long functions
    const functions = extractFunctions(content);
    for (const func of functions) {
      const lineCount = func.body.split('\n').length;
      if (lineCount > 50) {
        results.push({
          type: 'medium',
          category: 'Code Smell',
          file,
          line: func.line,
          description: `Function '${func.name}' is ${lineCount} lines long`,
          suggestion: 'Extract methods to improve readability',
          impact: 'Hard to understand and test'
        });
      }
    }

    // Magic numbers
    lines.forEach((line, idx) => {
      const magicNumbers = line.match(/[^.\w](100|200|300|400|500|1000|3000|5000|10000)[^\w]/g);
      if (magicNumbers && !line.includes('//')) {
        results.push({
          type: 'low',
          category: 'Code Smell',
          file,
          line: idx + 1,
          description: 'Magic number detected',
          suggestion: 'Extract to named constant',
          impact: 'Unclear intent'
        });
      }
    });

    // TODO comments
    lines.forEach((line, idx) => {
      if (line.match(/\/\/\s*TODO/i)) {
        results.push({
          type: 'low',
          category: 'Technical Debt',
          file,
          line: idx + 1,
          description: 'TODO comment found',
          suggestion: 'Create ticket or fix immediately'
        });
      }
    });
  }

  return results;
}

function displayResults(results: AnalysisResult[]): void {
  if (results.length === 0) {
    console.log('  ✅ No issues found! Code quality is excellent.\n');
    return;
  }

  console.log(`  Found ${results.length} issue(s):\n`);

  const high = results.filter(r => r.type === 'high');
  const medium = results.filter(r => r.type === 'medium');
  const low = results.filter(r => r.type === 'low');

  if (high.length > 0) {
    console.log('  🔴 HIGH PRIORITY:\n');
    high.forEach(r => displayIssue(r));
  }

  if (medium.length > 0) {
    console.log('  🟡 MEDIUM PRIORITY:\n');
    medium.forEach(r => displayIssue(r));
  }

  if (low.length > 0) {
    console.log('  🟢 LOW PRIORITY:\n');
    low.forEach(r => displayIssue(r));
  }

  console.log('  Summary:');
  console.log('  ────────');
  console.log(`  High:    ${high.length}`);
  console.log(`  Medium:  ${medium.length}`);
  console.log(`  Low:     ${low.length}`);
  console.log(`  Total:   ${results.length}\n`);
}

function displayIssue(issue: AnalysisResult): void {
  const location = issue.line ? `:${issue.line}` : '';
  console.log(`  ${issue.category}: ${issue.file}${location}`);
  console.log(`  ${issue.description}`);
  console.log(`  → ${issue.suggestion}`);
  if (issue.impact) {
    console.log(`  Impact: ${issue.impact}`);
  }
  console.log('');
}

function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(directory: string) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }

  if (fs.existsSync(dir)) {
    walk(dir);
  }

  return files;
}

function extractFunctions(content: string): Array<{ name: string; body: string; line: number }> {
  const functions: Array<{ name: string; body: string; line: number }> = [];
  const lines = content.split('\n');

  let inFunction = false;
  let braceCount = 0;
  let currentFunction: { name: string; body: string; line: number } | null = null;

  lines.forEach((line, idx) => {
    const funcMatch = line.match(/(?:function|async\s+function)\s+(\w+)|(\w+)\s*\(.*?\)\s*[:{]/);

    if (funcMatch && !inFunction) {
      inFunction = true;
      braceCount = 0;
      currentFunction = {
        name: funcMatch[1] || funcMatch[2] || 'anonymous',
        body: '',
        line: idx + 1
      };
    }

    if (inFunction && currentFunction) {
      currentFunction.body += line + '\n';

      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (braceCount === 0 && currentFunction.body.includes('{')) {
        functions.push(currentFunction);
        inFunction = false;
        currentFunction = null;
      }
    }
  });

  return functions;
}

function extractClasses(content: string): Array<{ name: string; methodCount: number; line: number }> {
  const classes: Array<{ name: string; methodCount: number; line: number }> = [];
  const lines = content.split('\n');

  let inClass = false;
  let braceCount = 0;
  let currentClass: { name: string; methodCount: number; line: number } | null = null;

  lines.forEach((line, idx) => {
    const classMatch = line.match(/class\s+(\w+)/);

    if (classMatch && !inClass) {
      inClass = true;
      braceCount = 0;
      currentClass = {
        name: classMatch[1],
        methodCount: 0,
        line: idx + 1
      };
    }

    if (inClass && currentClass) {
      if (line.match(/^\s+(?:public|private|protected)?\s*\w+\s*\(/)) {
        currentClass.methodCount++;
      }

      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (braceCount === 0 && line.includes('}')) {
        classes.push(currentClass);
        inClass = false;
        currentClass = null;
      }
    }
  });

  return classes;
}

function calculateCyclomaticComplexity(code: string): number {
  let complexity = 1; // Base complexity

  // Count decision points
  const patterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /&&/g,
    /\|\|/g,
    /\?/g
  ];

  for (const pattern of patterns) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}
