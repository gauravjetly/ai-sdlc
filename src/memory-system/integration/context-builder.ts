/**
 * Context Builder
 *
 * Builds enhanced context from memories for agent prompts.
 */

import { Memory, AgentType } from '../types';

export interface EnhancedContext {
  memories: Memory[];
  formattedContext: string;
  tokenEstimate: number;
}

export class ContextBuilder {
  private maxContextLength: number;

  constructor(maxContextLength: number = 4000) {
    this.maxContextLength = maxContextLength;
  }

  /**
   * Build context from memories
   */
  buildContext(memories: Memory[], agent: AgentType): EnhancedContext {
    if (memories.length === 0) {
      return {
        memories: [],
        formattedContext: '',
        tokenEstimate: 0,
      };
    }

    console.log(`[ContextBuilder] Building context from ${memories.length} memories for ${agent}`);

    // Group memories by category
    const grouped = this.groupByCategory(memories);

    // Format context
    const formattedContext = this.formatContext(grouped, agent);

    // Estimate tokens (rough: 1 token ≈ 4 characters)
    const tokenEstimate = Math.ceil(formattedContext.length / 4);

    // Truncate if needed
    let finalContext = formattedContext;
    if (tokenEstimate > this.maxContextLength) {
      console.warn(
        `[ContextBuilder] Context too long (${tokenEstimate} tokens), truncating to ${this.maxContextLength}`
      );
      const maxChars = this.maxContextLength * 4;
      finalContext = formattedContext.substring(0, maxChars) + '\n\n[Context truncated...]';
    }

    return {
      memories,
      formattedContext: finalContext,
      tokenEstimate: Math.min(tokenEstimate, this.maxContextLength),
    };
  }

  /**
   * Build minimal context (titles only)
   */
  buildMinimalContext(memories: Memory[]): string {
    if (memories.length === 0) {
      return '';
    }

    const items = memories.map((m, i) => {
      const similarity = m.metadata.similarity
        ? ` (${Math.round(m.metadata.similarity * 100)}% relevant)`
        : '';
      return `${i + 1}. ${m.title}${similarity}`;
    });

    return `## Relevant Past Work\n\n${items.join('\n')}`;
  }

  /**
   * Format context by category
   */
  private formatContext(
    grouped: Map<string, Memory[]>,
    agent: AgentType
  ): string {
    const sections: string[] = [];

    // Add header
    sections.push(`## 📚 RELEVANT MEMORIES FOR ${agent.toUpperCase()}`);
    sections.push('');
    sections.push(
      'The following memories from past work may help you with this task:'
    );
    sections.push('');

    // Security findings
    if (grouped.has('security-findings')) {
      sections.push(this.formatSecurityFindings(grouped.get('security-findings')!));
    }

    // Code patterns
    if (grouped.has('code-patterns')) {
      sections.push(this.formatCodePatterns(grouped.get('code-patterns')!));
    }

    // Architecture decisions
    if (grouped.has('architecture-decisions')) {
      sections.push(this.formatArchitectureDecisions(grouped.get('architecture-decisions')!));
    }

    // Failed approaches (anti-patterns)
    if (grouped.has('failed-approaches')) {
      sections.push(this.formatFailedApproaches(grouped.get('failed-approaches')!));
    }

    // Test strategies
    if (grouped.has('test-strategies')) {
      sections.push(this.formatTestStrategies(grouped.get('test-strategies')!));
    }

    // Deployment patterns
    if (grouped.has('deployment-patterns')) {
      sections.push(this.formatDeploymentPatterns(grouped.get('deployment-patterns')!));
    }

    // Compliance rules
    if (grouped.has('compliance-rules')) {
      sections.push(this.formatComplianceRules(grouped.get('compliance-rules')!));
    }

    // Vintiq knowledge
    if (grouped.has('vintiq-knowledge')) {
      sections.push(this.formatVintiqKnowledge(grouped.get('vintiq-knowledge')!));
    }

    sections.push('---');
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Format security findings
   */
  private formatSecurityFindings(memories: Memory[]): string {
    const lines: string[] = [];
    lines.push('### 🔒 Security Findings to Consider');
    lines.push('');

    for (const memory of memories.slice(0, 3)) {
      const similarity = this.formatSimilarity(memory.metadata.similarity);
      const severity = memory.metadata.severity || 'unknown';
      lines.push(`**${memory.title}** ${similarity}`);
      lines.push(`- Severity: ${severity.toUpperCase()}`);
      if (memory.metadata.cweId) {
        lines.push(`- CWE: ${memory.metadata.cweId}`);
      }
      lines.push(`- Learning: ${this.extractLearning(memory.content)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format code patterns
   */
  private formatCodePatterns(memories: Memory[]): string {
    const lines: string[] = [];
    lines.push('### 💡 Proven Code Patterns');
    lines.push('');

    for (const memory of memories.slice(0, 3)) {
      const similarity = this.formatSimilarity(memory.metadata.similarity);
      const usageCount = memory.metadata.usageCount || 0;
      lines.push(`**${memory.title}** ${similarity}`);
      if (memory.metadata.language) {
        lines.push(`- Language: ${memory.metadata.language}`);
      }
      if (memory.metadata.framework) {
        lines.push(`- Framework: ${memory.metadata.framework}`);
      }
      if (usageCount > 0) {
        lines.push(`- Used ${usageCount} times successfully`);
      }
      lines.push(`- Summary: ${this.extractSummary(memory.content)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format architecture decisions
   */
  private formatArchitectureDecisions(memories: Memory[]): string {
    const lines: string[] = [];
    lines.push('### 🏗️ Relevant Architecture Decisions');
    lines.push('');

    for (const memory of memories.slice(0, 2)) {
      const similarity = this.formatSimilarity(memory.metadata.similarity);
      lines.push(`**${memory.title}** ${similarity}`);
      lines.push(`- Summary: ${this.extractSummary(memory.content)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format failed approaches (anti-patterns)
   */
  private formatFailedApproaches(memories: Memory[]): string {
    const lines: string[] = [];
    lines.push('### ⚠️ Anti-Patterns to Avoid');
    lines.push('');

    for (const memory of memories.slice(0, 2)) {
      const similarity = this.formatSimilarity(memory.metadata.similarity);
      lines.push(`**${memory.title}** ${similarity}`);
      lines.push(`- What to avoid: ${this.extractSummary(memory.content)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format test strategies
   */
  private formatTestStrategies(memories: Memory[]): string {
    const lines: string[] = [];
    lines.push('### 🧪 Test Strategies');
    lines.push('');

    for (const memory of memories.slice(0, 2)) {
      const similarity = this.formatSimilarity(memory.metadata.similarity);
      lines.push(`**${memory.title}** ${similarity}`);
      lines.push(`- Approach: ${this.extractSummary(memory.content)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format deployment patterns
   */
  private formatDeploymentPatterns(memories: Memory[]): string {
    const lines: string[] = [];
    lines.push('### 🚀 Deployment Patterns');
    lines.push('');

    for (const memory of memories.slice(0, 2)) {
      const similarity = this.formatSimilarity(memory.metadata.similarity);
      lines.push(`**${memory.title}** ${similarity}`);
      lines.push(`- Summary: ${this.extractSummary(memory.content)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format compliance rules
   */
  private formatComplianceRules(memories: Memory[]): string {
    const lines: string[] = [];
    lines.push('### 📋 Compliance Requirements');
    lines.push('');

    for (const memory of memories.slice(0, 2)) {
      const similarity = this.formatSimilarity(memory.metadata.similarity);
      lines.push(`**${memory.title}** ${similarity}`);
      if (memory.metadata.standard) {
        lines.push(`- Standard: ${memory.metadata.standard}`);
      }
      lines.push(`- Requirement: ${this.extractSummary(memory.content)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format Vintiq knowledge
   */
  private formatVintiqKnowledge(memories: Memory[]): string {
    const lines: string[] = [];
    lines.push('### 🏢 Vintiq Product Knowledge');
    lines.push('');

    for (const memory of memories.slice(0, 2)) {
      const similarity = this.formatSimilarity(memory.metadata.similarity);
      lines.push(`**${memory.title}** ${similarity}`);
      if (memory.metadata.product) {
        lines.push(`- Product: ${memory.metadata.product}`);
      }
      lines.push(`- Details: ${this.extractSummary(memory.content)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Group memories by category
   */
  private groupByCategory(memories: Memory[]): Map<string, Memory[]> {
    const grouped = new Map<string, Memory[]>();

    for (const memory of memories) {
      const category = memory.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(memory);
    }

    return grouped;
  }

  /**
   * Format similarity score
   */
  private formatSimilarity(similarity?: number): string {
    if (!similarity) return '';
    const percentage = Math.round(similarity * 100);
    return `**(${percentage}% relevant)**`;
  }

  /**
   * Extract summary from content (first 150 characters)
   */
  private extractSummary(content: string): string {
    // Remove markdown headings
    const cleaned = content.replace(/^#+\s+/gm, '').trim();

    // Get first paragraph
    const firstParagraph = cleaned.split('\n\n')[0];

    // Truncate to 150 characters
    if (firstParagraph.length > 150) {
      return firstParagraph.substring(0, 147) + '...';
    }

    return firstParagraph;
  }

  /**
   * Extract learning/key takeaway from content
   */
  private extractLearning(content: string): string {
    // Look for "Learning:" or "Key takeaway:" section
    const learningMatch = content.match(/(?:learning|key takeaway)[:\s]+(.+?)(?:\n|$)/i);
    if (learningMatch) {
      return learningMatch[1].trim();
    }

    // Fall back to summary
    return this.extractSummary(content);
  }
}
