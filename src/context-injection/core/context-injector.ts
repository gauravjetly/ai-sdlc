/**
 * Context Injector
 *
 * Formats and injects context into agent prompts.
 */

import { Context } from '../types/context.types';

export class ContextInjector {
  /**
   * Inject context into agent prompt
   */
  async inject(originalPrompt: string, context: Context): Promise<string> {
    const contextBlock = this.formatContext(context);

    return `${originalPrompt}

${contextBlock}

---
**IMPORTANT**: Follow all Deltek standards above. Build on existing code. Reference past implementations for proven patterns.
`;
  }

  /**
   * Format context for injection
   */
  private formatContext(context: Context): string {
    const sections: string[] = [
      '## Deltek Engineering Context (Auto-Injected)',
      '',
      this.formatOrganizationalContext(context.organizational),
      this.formatProjectContext(context.project),
      this.formatHistoricalContext(context.historical),
      this.formatLiveContext(context.live),
      '',
      this.formatMetadata(context.metadata)
    ];

    return sections.filter(s => s.length > 0).join('\n\n');
  }

  private formatOrganizationalContext(org: Context['organizational']): string {
    const sections: string[] = ['### Organizational Standards (Mandatory)'];

    if (org.standards) {
      sections.push('**Coding Standards**:');
      sections.push(this.indent(org.standards));
    }

    if (org.security) {
      sections.push('**Security Requirements**:');
      sections.push(this.indent(org.security));
    }

    if (org.architecture) {
      sections.push('**Architecture Patterns**:');
      sections.push(this.indent(org.architecture));
    }

    if (org.libraries && org.libraries.length > 0) {
      sections.push(`**Approved Libraries**: ${org.libraries.join(', ')}`);
    }

    if (org.testing) {
      sections.push('**Testing Requirements**:');
      sections.push(this.indent(org.testing));
    }

    return sections.join('\n\n');
  }

  private formatProjectContext(project: Context['project']): string {
    const sections: string[] = ['### Project Configuration'];

    if (project.stack) {
      sections.push('**Technology Stack**:');
      sections.push(this.indent(project.stack));
    }

    if (project.architecture) {
      sections.push('**Project Architecture**:');
      sections.push(this.indent(project.architecture));
    }

    if (project.adrs.length > 0) {
      sections.push('**Architecture Decision Records**:');
      project.adrs.forEach(adr => {
        sections.push(`- **${adr.id}**: ${adr.title}`);
        sections.push(`  ${adr.decision}`);
      });
    }

    if (project.conventions) {
      sections.push('**Team Conventions**:');
      sections.push(this.indent(project.conventions));
    }

    if (project.existing) {
      sections.push('**Existing Code Structure**:');
      sections.push(this.indent(project.existing));
    }

    return sections.join('\n\n');
  }

  private formatHistoricalContext(historical: Context['historical']): string {
    if (historical.length === 0) {
      return '';
    }

    const sections: string[] = ['### Past Implementations & Learnings'];

    // Group by type
    const implementations = historical.filter(h => h.type === 'implementation');
    const bugFixes = historical.filter(h => h.type === 'bug-fix');
    const antiPatterns = historical.filter(h => h.type === 'anti-pattern');
    const bestPractices = historical.filter(h => h.type === 'best-practice');

    if (implementations.length > 0) {
      sections.push('**Similar Past Implementations**:');
      implementations.forEach(impl => {
        sections.push(
          `- Similarity: ${(impl.similarity * 100).toFixed(0)}% (${impl.source})`
        );
        sections.push(this.indent(impl.content, 2));
      });
    }

    if (bugFixes.length > 0) {
      sections.push('**Related Bug Fixes**:');
      bugFixes.forEach(bug => {
        sections.push(`- ${bug.source}`);
        sections.push(this.indent(bug.content, 2));
      });
    }

    if (antiPatterns.length > 0) {
      sections.push('**Anti-Patterns to Avoid**:');
      antiPatterns.forEach(pattern => {
        sections.push(this.indent(pattern.content, 2));
      });
    }

    if (bestPractices.length > 0) {
      sections.push('**Recommended Best Practices**:');
      bestPractices.forEach(practice => {
        sections.push(this.indent(practice.content, 2));
      });
    }

    return sections.join('\n\n');
  }

  private formatLiveContext(live: Context['live']): string {
    const sections: string[] = ['### Current Codebase State'];

    sections.push(`**Branch**: ${live.branch}`);
    sections.push(`**Last Commit**: ${live.lastCommit}`);

    if (live.openPRs > 0) {
      sections.push(`**Open PRs**: ${live.openPRs}`);
    }

    const depCount = Object.keys(live.dependencies).length;
    if (depCount > 0) {
      sections.push(`**Dependencies**: ${depCount} packages installed`);

      // Show key dependencies (top 5 by name recognition)
      const keyDeps = this.getKeyDependencies(live.dependencies);
      if (keyDeps.length > 0) {
        sections.push(`Key: ${keyDeps.join(', ')}`);
      }
    }

    if (live.recentChanges.length > 0) {
      sections.push('**Recent Changes**:');
      live.recentChanges.slice(0, 3).forEach(change => {
        sections.push(`- ${change}`);
      });
    }

    return sections.join('\n');
  }

  private formatMetadata(metadata: Context['metadata']): string {
    const sections: string[] = ['### Context Metadata'];

    sections.push(`**Retrieval Time**: ${metadata.retrievalTime}ms`);
    sections.push(`**Sources Used**: ${metadata.sourcesUsed.join(', ')}`);
    sections.push(`**Cache Hit**: ${metadata.cacheHit ? 'Yes' : 'No'}`);
    sections.push(`**Trimmed**: ${metadata.trimmed ? 'Yes' : 'No'}`);
    sections.push(`**Request ID**: ${metadata.requestId}`);

    return sections.join('\n');
  }

  private indent(text: string, spaces: number = 0): string {
    const indentation = ' '.repeat(spaces);
    return text
      .split('\n')
      .map(line => `${indentation}${line}`)
      .join('\n');
  }

  private getKeyDependencies(dependencies: Record<string, string>): string[] {
    const keyLibs = [
      'express',
      'fastify',
      'react',
      'vue',
      'angular',
      'next',
      'typescript',
      'jest',
      'mocha',
      'prisma',
      'typeorm',
      'mongoose',
      'axios',
      'graphql'
    ];

    return Object.keys(dependencies)
      .filter(dep => keyLibs.includes(dep))
      .slice(0, 5);
  }

  /**
   * Extract context that was actually used in response
   */
  extractUsedContext(response: string, context: Context): string[] {
    const used: string[] = [];

    // Check for references to organizational standards
    if (
      context.organizational.standards &&
      this.isReferenced(response, context.organizational.standards)
    ) {
      used.push('organizational-standards');
    }

    // Check for references to project architecture
    if (
      context.project.architecture &&
      this.isReferenced(response, context.project.architecture)
    ) {
      used.push('project-architecture');
    }

    // Check for references to historical context
    context.historical.forEach((h, i) => {
      if (this.isReferenced(response, h.content)) {
        used.push(`historical-${i}`);
      }
    });

    return used;
  }

  private isReferenced(response: string, contextText: string): boolean {
    // Extract key phrases (3+ words) from context
    const phrases = this.extractKeyPhrases(contextText);

    // Check if any key phrase appears in response
    return phrases.some(phrase => response.toLowerCase().includes(phrase.toLowerCase()));
  }

  private extractKeyPhrases(text: string): string[] {
    // Simple implementation: extract quoted text and capitalized phrases
    const phrases: string[] = [];

    // Extract quoted text
    const quotedMatches = text.match(/"([^"]+)"/g);
    if (quotedMatches) {
      phrases.push(...quotedMatches.map(m => m.replace(/"/g, '')));
    }

    // Extract capitalized multi-word phrases
    const capitalizedMatches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g);
    if (capitalizedMatches) {
      phrases.push(...capitalizedMatches);
    }

    return phrases.filter(p => p.split(/\s+/).length >= 3); // Only 3+ word phrases
  }
}
