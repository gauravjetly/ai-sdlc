import * as fs from 'fs';
import * as path from 'path';
import { SQLiteProvider } from '@aisdlc/storage';

/**
 * Semantic Code Search
 * Search codebase by intent, not just keywords
 */

interface SearchResult {
  file: string;
  relevance: number;
  description: string;
  lines: number;
  lastModified: Date;
}

export async function searchCommand(args: string[]): Promise<void> {
  const query = args.join(' ');

  if (!query) {
    console.log('Usage: aisdlc search "<query>"');
    console.log('Examples:');
    console.log('  aisdlc search "authentication code"');
    console.log('  aisdlc search "database queries"');
    console.log('  aisdlc search "functions that return promises"');
    return;
  }

  console.log(`\n  Semantic Code Search`);
  console.log('  ════════════════════\n');
  console.log(`  Query: "${query}"\n`);

  // Understand intent
  const intent = parseIntent(query);
  console.log(`  Understanding: ${intent}\n`);

  // Search
  const results = await semanticSearch(query);

  if (results.length === 0) {
    console.log('  No results found\n');
    return;
  }

  console.log(`  Found ${results.length} result(s):\n`);

  results.forEach((result, idx) => {
    console.log(`  ${idx + 1}. ${result.file} (${Math.round(result.relevance * 100)}% match)`);
    console.log(`     ${result.description}`);
    console.log(`     Lines: ${result.lines} | Modified: ${result.lastModified.toLocaleDateString()}\n`);
  });

  console.log('  Open file? (1-${results.length}, or \'q\' to quit)');
}

function parseIntent(query: string): string {
  const lowercaseQuery = query.toLowerCase();

  if (lowercaseQuery.match(/auth|login|password|token/)) {
    return 'You want authentication-related code';
  } else if (lowercaseQuery.match(/database|query|sql|orm/)) {
    return 'You want database access code';
  } else if (lowercaseQuery.match(/api|endpoint|route|controller/)) {
    return 'You want API endpoints';
  } else if (lowercaseQuery.match(/test|spec|jest/)) {
    return 'You want test files';
  } else if (lowercaseQuery.match(/component|react|vue/)) {
    return 'You want UI components';
  } else if (lowercaseQuery.match(/validation|validate|check/)) {
    return 'You want validation logic';
  } else {
    return 'Searching for relevant code';
  }
}

async function semanticSearch(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const files = findAllSourceFiles();

  // Score each file
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relevance = calculateRelevance(query, file, content);

    if (relevance > 0.3) {
      const stats = fs.statSync(file);
      results.push({
        file,
        relevance,
        description: extractDescription(content),
        lines: content.split('\n').length,
        lastModified: stats.mtime
      });
    }
  }

  // Sort by relevance
  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
}

function calculateRelevance(query: string, filePath: string, content: string): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();
  const contentLower = content.toLowerCase();

  // File name match (highest weight)
  if (fileName.includes(queryLower)) {
    score += 0.5;
  }

  // Path match
  if (filePath.toLowerCase().includes(queryLower)) {
    score += 0.3;
  }

  // Content match (keyword frequency)
  const matches = contentLower.match(new RegExp(queryLower, 'g'));
  if (matches) {
    score += Math.min(0.4, matches.length * 0.05);
  }

  // Semantic patterns
  const queryWords = queryLower.split(/\s+/);
  for (const word of queryWords) {
    if (word === 'authentication' || word === 'auth') {
      if (contentLower.match(/jwt|oauth|password|login|session/)) {
        score += 0.2;
      }
    } else if (word === 'database' || word === 'query') {
      if (contentLower.match(/select|insert|update|delete|from|where/)) {
        score += 0.2;
      }
    } else if (word === 'api' || word === 'endpoint') {
      if (contentLower.match(/router|app\.(get|post|put|delete)|endpoint/)) {
        score += 0.2;
      }
    }
  }

  return Math.min(1.0, score);
}

function extractDescription(content: string): string {
  // Try to find first comment or docstring
  const commentMatch = content.match(/\/\*\*?\s*\n\s*\*\s*([^\n]+)/);
  if (commentMatch) {
    return commentMatch[1].trim();
  }

  // Try class or function definition
  const classMatch = content.match(/class\s+(\w+)/);
  if (classMatch) {
    return `${classMatch[1]} class`;
  }

  const funcMatch = content.match(/function\s+(\w+)/);
  if (funcMatch) {
    return `${funcMatch[1]} function`;
  }

  return 'Source file';
}

function findAllSourceFiles(): string[] {
  const files: string[] = [];
  const searchDirs = ['src/', 'lib/', 'app/'];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  for (const dir of searchDirs) {
    walk(dir);
  }

  return files;
}
