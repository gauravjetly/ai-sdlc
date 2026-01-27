/**
 * Project Context Loader
 *
 * Loads project-specific context including tech stack, architecture,
 * existing code structure, and team conventions.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { ProjectContext, ADRSummary } from '../types/context.types';
import { TokenCounter } from '../utils/token-counter';

export class ProjectContextLoader {
  /**
   * Load complete project context
   */
  async load(projectPath: string): Promise<ProjectContext> {
    try {
      const contextPath = path.join(projectPath, '.claude', 'context');

      const [stack, architecture, conventions, adrs, existingCode] =
        await Promise.all([
          this.loadTechStack(contextPath),
          this.loadArchitecture(contextPath),
          this.loadConventions(contextPath),
          this.loadADRs(projectPath),
          this.scanExistingCode(projectPath)
        ]);

      const content = [stack, architecture, conventions, existingCode].join('\n\n');

      return {
        stack,
        architecture,
        conventions,
        existing: existingCode,
        adrs,
        tokens: TokenCounter.count(content),
        priority: 3
      };
    } catch (error) {
      console.warn('Failed to load project context:', error);
      return this.getDefaultProjectContext();
    }
  }

  private async loadTechStack(contextPath: string): Promise<string> {
    try {
      const stackPath = path.join(contextPath, 'tech-stack.yaml');
      const content = await fs.readFile(stackPath, 'utf-8');
      const stack = yaml.parse(content);

      return `Technology Stack:
- Runtime: ${stack.runtime || 'Unknown'}
- Framework: ${stack.framework || 'Unknown'}
- Database: ${stack.database || 'Unknown'}
- Cache: ${stack.cache || 'None'}
- Language: ${stack.language || 'Unknown'}
- Version: ${stack.version || 'Unknown'}`;
    } catch {
      return 'Technology Stack: Not configured';
    }
  }

  private async loadArchitecture(contextPath: string): Promise<string> {
    try {
      const archPath = path.join(contextPath, 'architecture.md');
      return await fs.readFile(archPath, 'utf-8');
    } catch {
      return 'Architecture: Layered architecture (default)';
    }
  }

  private async loadConventions(contextPath: string): Promise<string> {
    try {
      const convPath = path.join(contextPath, 'conventions.md');
      return await fs.readFile(convPath, 'utf-8');
    } catch {
      return this.getDefaultConventions();
    }
  }

  private async loadADRs(projectPath: string): Promise<ADRSummary[]> {
    try {
      const adrPath = path.join(projectPath, 'docs', 'sdlc', 'architecture');
      const files = await fs.readdir(adrPath);
      const adrFiles = files.filter(f => f.startsWith('ADR-') && f.endsWith('.md'));

      const adrs = await Promise.all(
        adrFiles.map(async (file) => {
          const content = await fs.readFile(path.join(adrPath, file), 'utf-8');
          return this.parseADR(file, content);
        })
      );

      // Return top 5 most recent ADRs
      return adrs
        .filter(adr => adr !== null)
        .slice(0, 5) as ADRSummary[];
    } catch {
      return [];
    }
  }

  private parseADR(filename: string, content: string): ADRSummary | null {
    try {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const decisionMatch = content.match(/##\s+Decision\s+Outcome\s+(.+?)(?=##|$)/s);

      if (!titleMatch || !titleMatch[1]) return null;

      return {
        id: filename.replace('.md', ''),
        title: titleMatch[1],
        decision: decisionMatch && decisionMatch[1]
          ? decisionMatch[1].trim().substring(0, 200)
          : 'See document for details',
        relevance: 1.0
      };
    } catch {
      return null;
    }
  }

  private async scanExistingCode(projectPath: string): Promise<string> {
    try {
      const srcPath = path.join(projectPath, 'src');
      const structure = await this.getDirectoryTree(srcPath, 0, 3);
      return `Existing Code Structure:\n${structure}`;
    } catch {
      return 'Existing Code: No src directory found';
    }
  }

  private async getDirectoryTree(
    dirPath: string,
    level: number,
    maxLevel: number
  ): Promise<string> {
    if (level >= maxLevel) return '';

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const indent = '  '.repeat(level);
      let tree = '';

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        tree += `${indent}- ${entry.name}${entry.isDirectory() ? '/' : ''}\n`;

        if (entry.isDirectory()) {
          const subPath = path.join(dirPath, entry.name);
          tree += await this.getDirectoryTree(subPath, level + 1, maxLevel);
        }
      }

      return tree;
    } catch {
      return '';
    }
  }

  private getDefaultProjectContext(): ProjectContext {
    return {
      stack: 'Technology Stack: Not configured',
      architecture: 'Architecture: Layered architecture (default)',
      conventions: this.getDefaultConventions(),
      existing: 'Existing Code: Not scanned',
      adrs: [],
      tokens: 0,
      priority: 3
    };
  }

  private getDefaultConventions(): string {
    return `# Project Conventions

## Naming
- Files: kebab-case.ts
- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE

## Git
- Branch naming: feature/[ticket-id]-brief-description
- Commit format: type(scope): description

## Code Organization
- Follow layered architecture
- Keep files focused (single responsibility)
- Co-locate related code
`;
  }

  /**
   * Initialize project context directory
   */
  async initialize(projectPath: string): Promise<void> {
    const contextPath = path.join(projectPath, '.claude', 'context');
    await fs.mkdir(contextPath, { recursive: true });

    const defaults = {
      'tech-stack.yaml': this.getDefaultTechStackYAML(),
      'architecture.md': this.getDefaultArchitectureMd(),
      'conventions.md': this.getDefaultConventions()
    };

    await Promise.all(
      Object.entries(defaults).map(([filename, content]) =>
        fs.writeFile(path.join(contextPath, filename), content, 'utf-8')
      )
    );
  }

  private getDefaultTechStackYAML(): string {
    return yaml.stringify({
      language: 'TypeScript',
      runtime: 'Node.js 20',
      framework: 'Express',
      database: 'PostgreSQL',
      cache: 'Redis',
      version: '1.0.0'
    });
  }

  private getDefaultArchitectureMd(): string {
    return `# Project Architecture

## Pattern
Layered Architecture

## Layers
1. **Presentation**: API controllers, validators, DTOs
2. **Application**: Use cases, orchestration
3. **Domain**: Business logic
4. **Infrastructure**: Data access, external APIs

## Dependency Rule
Dependencies flow inward only: Presentation -> Application -> Domain
`;
  }
}
