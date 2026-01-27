/**
 * Historical Context Loader
 *
 * Searches agent memory for relevant past implementations,
 * bug fixes, and lessons learned.
 */

import { HistoricalContext, MemorySearchOptions } from '../types/context.types';

// Mock interface for memory system (will be integrated with actual memory system)
interface Memory {
  id: string;
  agent: string;
  category: string;
  content: string;
  metadata: {
    similarity?: number;
    timestamp?: string;
    type?: string;
  };
}

interface MemoryRetriever {
  search(options: MemorySearchOptions): Promise<{ memories: Memory[] }>;
}

export class HistoricalContextLoader {
  constructor(private memorySystem?: MemoryRetriever) {}

  /**
   * Load historical context relevant to the query
   */
  async load(query: string, agent: string): Promise<HistoricalContext[]> {
    if (!this.memorySystem) {
      return this.getDefaultHistoricalContext();
    }

    try {
      const memories = await this.memorySystem.search({
        query,
        agent,
        limit: 5,
        minSimilarity: 0.7
      });

      return memories.memories.map(m => this.convertMemoryToContext(m));
    } catch (error) {
      console.warn('Failed to load historical context:', error);
      return this.getDefaultHistoricalContext();
    }
  }

  /**
   * Load specific types of historical context
   */
  async loadByType(
    query: string,
    agent: string,
    type: 'implementation' | 'bug-fix' | 'anti-pattern' | 'best-practice'
  ): Promise<HistoricalContext[]> {
    const allContext = await this.load(query, agent);
    return allContext.filter(c => c.type === type);
  }

  /**
   * Load anti-patterns to avoid
   */
  async loadAntiPatterns(query: string): Promise<HistoricalContext[]> {
    return this.loadByType(query, 'engineer', 'anti-pattern');
  }

  /**
   * Load successful implementations
   */
  async loadSuccessfulImplementations(query: string): Promise<HistoricalContext[]> {
    return this.loadByType(query, 'engineer', 'implementation');
  }

  private convertMemoryToContext(memory: Memory): HistoricalContext {
    return {
      similarity: memory.metadata.similarity || 0,
      content: memory.content,
      source: `${memory.agent}/${memory.category}`,
      type: this.inferType(memory),
      timestamp: memory.metadata.timestamp
    };
  }

  private inferType(
    memory: Memory
  ): 'implementation' | 'bug-fix' | 'anti-pattern' | 'best-practice' {
    if (memory.metadata.type) {
      return memory.metadata.type as any;
    }

    const content = memory.content.toLowerCase();

    if (content.includes('bug') || content.includes('fix')) {
      return 'bug-fix';
    }
    if (content.includes('avoid') || content.includes('anti-pattern')) {
      return 'anti-pattern';
    }
    if (content.includes('best practice') || content.includes('pattern')) {
      return 'best-practice';
    }

    return 'implementation';
  }

  private getDefaultHistoricalContext(): HistoricalContext[] {
    return [
      {
        similarity: 0.85,
        content: `Past implementation: RESTful API with JWT authentication

What worked well:
- Using middleware for authentication
- Separating concerns (controllers, services, repositories)
- Comprehensive error handling with custom error classes
- Input validation with joi schemas

Key learnings:
- Always hash passwords with bcrypt (min 10 rounds)
- Use refresh tokens with rotation
- Log authentication failures for security monitoring
- Rate limit login endpoints`,
        source: 'engineer/implementation',
        type: 'implementation'
      },
      {
        similarity: 0.78,
        content: `Bug fix: SQL injection vulnerability in search endpoint

Root cause: String concatenation instead of parameterized queries

Fix applied:
- Replaced string concatenation with parameterized queries
- Added input validation and sanitization
- Implemented query whitelisting for dynamic fields

Lesson: NEVER trust user input, always use parameterized queries`,
        source: 'security/bug-fix',
        type: 'bug-fix'
      },
      {
        similarity: 0.72,
        content: `Anti-pattern to avoid: God classes

Symptom: Single service class with 2000+ lines handling multiple concerns

Impact: Difficult to test, maintain, and reason about

Better approach:
- Split into focused service classes (Single Responsibility)
- Use dependency injection
- Keep classes under 200 lines
- Each class should do ONE thing well`,
        source: 'architect/anti-pattern',
        type: 'anti-pattern'
      }
    ];
  }
}
