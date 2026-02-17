/**
 * Learning Engine
 *
 * Manages automatic learning propagation between agents.
 * When one agent learns something, this engine determines which
 * other agents would benefit and propagates the knowledge.
 *
 * Key capabilities:
 * - Automatic learning detection from agent outputs
 * - Relevance-based propagation to other agents
 * - Learning event tracking and audit
 * - Pattern recognition across agent learnings
 * - Automatic best practice extraction
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentId,
  LearningEvent,
  LearningTrigger,
  KnowledgeCategory,
  KnowledgeConfidence,
  KnowledgeEvidence,
  AgentMeshConfig,
  DEFAULT_MESH_CONFIG,
} from '../types';
import { CollectiveMemory } from '../memory/collective-memory';
import { MessageBus } from '../bus/message-bus';
import { AgentRegistry } from '../registry/agent-registry';

/**
 * Mapping of which agents should receive learnings from which categories
 */
const LEARNING_PROPAGATION_MAP: Record<KnowledgeCategory, AgentId[]> = {
  'cross-agent-learning': [
    'conductor', 'ba', 'jets', 'ux', 'engineer',
    'security', 'qa', 'atlas', 'customer', 'ask-tom',
  ],
  'error-pattern': ['engineer', 'qa', 'ask-tom', 'atlas'],
  'best-practice': [
    'conductor', 'ba', 'jets', 'ux', 'engineer',
    'security', 'qa', 'atlas',
  ],
  'anti-pattern': ['engineer', 'qa', 'security', 'ask-tom'],
  'architecture-decision': ['jets', 'engineer', 'security', 'atlas'],
  'security-insight': ['security', 'engineer', 'qa', 'atlas'],
  'performance-insight': ['engineer', 'atlas', 'qa'],
  'process-improvement': ['conductor', 'tracker', 'ba'],
  'conflict-resolution': ['conductor', 'ask-tom'],
  'integration-pattern': ['engineer', 'atlas', 'jets'],
};

/**
 * Rules for determining who should learn from whom
 */
const AGENT_LEARNING_INTERESTS: Record<AgentId, KnowledgeCategory[]> = {
  conductor: ['process-improvement', 'cross-agent-learning', 'conflict-resolution'],
  ba: ['cross-agent-learning', 'process-improvement', 'best-practice'],
  jets: ['architecture-decision', 'performance-insight', 'integration-pattern', 'best-practice'],
  ux: ['cross-agent-learning', 'best-practice'],
  engineer: [
    'error-pattern', 'anti-pattern', 'best-practice', 'architecture-decision',
    'security-insight', 'performance-insight', 'integration-pattern',
  ],
  security: ['security-insight', 'error-pattern', 'anti-pattern', 'best-practice'],
  qa: ['error-pattern', 'anti-pattern', 'best-practice', 'performance-insight'],
  atlas: ['performance-insight', 'integration-pattern', 'error-pattern', 'architecture-decision'],
  customer: ['cross-agent-learning'],
  'ask-tom': [
    'error-pattern', 'anti-pattern', 'conflict-resolution',
    'cross-agent-learning', 'integration-pattern',
  ],
  tracker: ['process-improvement'],
  finops: ['process-improvement'],
};

export class LearningEngine {
  private basePath: string;
  private eventsPath: string;
  private config: AgentMeshConfig;
  private collectiveMemory: CollectiveMemory;
  private messageBus: MessageBus;
  private registry: AgentRegistry;

  constructor(
    collectiveMemory: CollectiveMemory,
    messageBus: MessageBus,
    registry: AgentRegistry,
    config: Partial<AgentMeshConfig> = {}
  ) {
    this.config = { ...DEFAULT_MESH_CONFIG, ...config };
    this.basePath = this.config.basePath.replace('~', os.homedir());
    this.eventsPath = path.join(this.basePath, 'learning', 'events');
    this.collectiveMemory = collectiveMemory;
    this.messageBus = messageBus;
    this.registry = registry;
  }

  /**
   * Initialize the learning engine
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.eventsPath, { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'learning', 'patterns'), { recursive: true });
    console.log('[LearningEngine] Initialized');
  }

  /**
   * Capture a learning from an agent and propagate to relevant agents
   */
  async captureLearning(
    trigger: LearningTrigger,
    sourceAgent: AgentId,
    learning: {
      title: string;
      description: string;
      category: KnowledgeCategory;
      confidence?: KnowledgeConfidence;
      applicability?: string;
      preventionStrategy?: string;
    },
    context?: {
      projectId?: string;
      workItemId?: string;
      phase?: string;
      relatedMessages?: string[];
    }
  ): Promise<LearningEvent> {
    // Determine target agents
    const targetAgents = this.determineTargetAgents(
      sourceAgent,
      learning.category
    );

    // Create learning event
    const event: LearningEvent = {
      id: `LE-${uuidv4().split('-')[0]}`,
      trigger,
      timestamp: new Date().toISOString(),
      sourceAgent,
      targetAgents,
      learning: {
        title: learning.title,
        description: learning.description,
        category: learning.category,
        confidence: learning.confidence || 'emerging',
        applicability: learning.applicability || 'general',
        preventionStrategy: learning.preventionStrategy,
      },
      context: {
        projectId: context?.projectId,
        workItemId: context?.workItemId,
        phase: context?.phase,
        relatedMessages: context?.relatedMessages || [],
      },
      propagated: false,
      propagatedTo: [],
    };

    // Save learning event
    await this.saveLearningEvent(event);

    // Store in collective memory
    const evidence: KnowledgeEvidence = {
      agentId: sourceAgent,
      messageId: event.id,
      timestamp: event.timestamp,
      description: `Learning from ${trigger}: ${learning.title}`,
      outcome: 'success',
    };

    await this.collectiveMemory.addKnowledge({
      category: learning.category,
      title: learning.title,
      content: learning.description,
      confidence: learning.confidence || 'emerging',
      sourceAgent,
      applicableAgents: targetAgents,
      tags: this.extractTags(learning.description),
      evidence,
    });

    // Propagate to target agents
    await this.propagateLearning(event);

    return event;
  }

  /**
   * Analyze an agent's output for learnings to extract
   */
  async analyzeForLearnings(
    agentId: AgentId,
    output: string,
    context?: {
      projectId?: string;
      workItemId?: string;
      phase?: string;
    }
  ): Promise<LearningEvent[]> {
    const events: LearningEvent[] = [];

    // Pattern 1: Error patterns
    const errorPatterns = this.detectErrorPatterns(output);
    for (const pattern of errorPatterns) {
      const event = await this.captureLearning(
        'error-encountered',
        agentId,
        {
          title: `Error Pattern: ${pattern.name}`,
          description: pattern.description,
          category: 'error-pattern',
          confidence: 'emerging',
          preventionStrategy: pattern.prevention,
        },
        context
      );
      events.push(event);
    }

    // Pattern 2: Best practices discovered
    const practices = this.detectBestPractices(output);
    for (const practice of practices) {
      const event = await this.captureLearning(
        'pattern-recognized',
        agentId,
        {
          title: `Best Practice: ${practice.name}`,
          description: practice.description,
          category: 'best-practice',
          confidence: 'emerging',
        },
        context
      );
      events.push(event);
    }

    // Pattern 3: Security insights
    const securityInsights = this.detectSecurityInsights(output);
    for (const insight of securityInsights) {
      const event = await this.captureLearning(
        'security-finding',
        agentId,
        {
          title: `Security: ${insight.name}`,
          description: insight.description,
          category: 'security-insight',
          confidence: 'emerging',
        },
        context
      );
      events.push(event);
    }

    return events;
  }

  /**
   * Get learning history for an agent
   */
  async getAgentLearningHistory(
    agentId: AgentId,
    limit: number = 20
  ): Promise<LearningEvent[]> {
    const events: LearningEvent[] = [];

    try {
      const files = await fs.readdir(this.eventsPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const content = await fs.readFile(
          path.join(this.eventsPath, file),
          'utf-8'
        );
        const event: LearningEvent = JSON.parse(content);

        if (
          event.sourceAgent === agentId ||
          event.targetAgents.includes(agentId) ||
          event.propagatedTo.includes(agentId)
        ) {
          events.push(event);
        }
      }
    } catch {
      // Directory may not exist
    }

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get unpropagated learnings
   */
  async getUnpropagatedLearnings(): Promise<LearningEvent[]> {
    const events: LearningEvent[] = [];

    try {
      const files = await fs.readdir(this.eventsPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const content = await fs.readFile(
          path.join(this.eventsPath, file),
          'utf-8'
        );
        const event: LearningEvent = JSON.parse(content);
        if (!event.propagated) {
          events.push(event);
        }
      }
    } catch {
      // Directory may not exist
    }

    return events;
  }

  /**
   * Generate a learning summary for an agent
   * This is injected into the agent's context when it starts work
   */
  async generateAgentBriefing(agentId: AgentId): Promise<string> {
    // Get relevant collective knowledge
    const knowledge = await this.collectiveMemory.getAgentRelevantKnowledge(
      agentId,
      5
    );

    // Get recent learnings
    const recentLearnings = await this.getAgentLearningHistory(agentId, 5);

    if (knowledge.length === 0 && recentLearnings.length === 0) {
      return '';
    }

    let briefing = `## Collective Intelligence Briefing for ${agentId}\n\n`;
    briefing += `*Auto-generated from cross-agent learnings*\n\n`;

    if (knowledge.length > 0) {
      briefing += `### Relevant Knowledge\n\n`;
      for (const item of knowledge) {
        briefing += `**${item.title}** (${item.confidence}, ${item.evidenceCount} evidence)\n`;
        briefing += `Sources: ${item.sourceAgents.join(', ')}\n`;
        briefing += `${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}\n\n`;
      }
    }

    if (recentLearnings.length > 0) {
      briefing += `### Recent Learnings\n\n`;
      for (const event of recentLearnings) {
        briefing += `- **${event.learning.title}** (from ${event.sourceAgent}, ${event.timestamp.split('T')[0]})\n`;
        if (event.learning.preventionStrategy) {
          briefing += `  Prevention: ${event.learning.preventionStrategy}\n`;
        }
      }
    }

    briefing += `\n---\n`;
    return briefing;
  }

  // ---- Private Methods ----

  private determineTargetAgents(
    sourceAgent: AgentId,
    category: KnowledgeCategory
  ): AgentId[] {
    // Get agents from propagation map
    const fromMap = LEARNING_PROPAGATION_MAP[category] || [];

    // Filter out source agent and check interest
    return fromMap.filter((agentId) => {
      if (agentId === sourceAgent) return false;

      // Check if agent is interested in this category
      const interests = AGENT_LEARNING_INTERESTS[agentId] || [];
      return interests.includes(category);
    });
  }

  private async propagateLearning(event: LearningEvent): Promise<void> {
    const propagatedTo: AgentId[] = [];

    for (const targetAgent of event.targetAgents) {
      try {
        // Send learning notification via message bus
        await this.messageBus.send({
          type: 'learning',
          priority: 'normal',
          sender: event.sourceAgent,
          receiver: targetAgent,
          subject: `Learning: ${event.learning.title}`,
          content: JSON.stringify({
            learningEventId: event.id,
            title: event.learning.title,
            description: event.learning.description,
            category: event.learning.category,
            confidence: event.learning.confidence,
            applicability: event.learning.applicability,
            preventionStrategy: event.learning.preventionStrategy,
          }),
          context: {
            tags: ['learning', 'auto-propagated', event.learning.category],
          },
          correlationId: event.id,
        });

        propagatedTo.push(targetAgent);
      } catch (error) {
        console.warn(
          `[LearningEngine] Failed to propagate to ${targetAgent}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Update event with propagation results
    event.propagated = true;
    event.propagatedTo = propagatedTo;
    event.propagatedAt = new Date().toISOString();
    await this.saveLearningEvent(event);

    console.log(
      `[LearningEngine] Propagated learning "${event.learning.title}" ` +
      `from ${event.sourceAgent} to ${propagatedTo.join(', ')}`
    );
  }

  private async saveLearningEvent(event: LearningEvent): Promise<void> {
    const filePath = path.join(this.eventsPath, `${event.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(event, null, 2), 'utf-8');
  }

  private extractTags(text: string): string[] {
    const tags: string[] = [];
    const keywords = [
      'authentication', 'authorization', 'database', 'api', 'security',
      'testing', 'deployment', 'performance', 'caching', 'error-handling',
      'logging', 'monitoring', 'accessibility', 'scalability', 'reliability',
      'docker', 'kubernetes', 'ci-cd', 'typescript', 'react', 'node',
      'sql', 'nosql', 'rest', 'graphql', 'microservices', 'architecture',
    ];

    const lower = text.toLowerCase();
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        tags.push(keyword);
      }
    }

    return tags.slice(0, 10);
  }

  private detectErrorPatterns(
    output: string
  ): Array<{ name: string; description: string; prevention?: string }> {
    const patterns: Array<{ name: string; description: string; prevention?: string }> = [];

    // Look for common error indicators
    const errorIndicators = [
      { regex: /ENOENT|file not found|no such file/i, name: 'Missing File' },
      { regex: /EACCES|permission denied/i, name: 'Permission Error' },
      { regex: /timeout|timed out|ETIMEDOUT/i, name: 'Timeout' },
      { regex: /out of memory|heap|OOM/i, name: 'Memory Exhaustion' },
      { regex: /connection refused|ECONNREFUSED/i, name: 'Connection Failure' },
      { regex: /syntax error|SyntaxError/i, name: 'Syntax Error' },
      { regex: /type error|TypeError/i, name: 'Type Error' },
      { regex: /null pointer|undefined is not|cannot read propert/i, name: 'Null Reference' },
      { regex: /circular dependency|circular import/i, name: 'Circular Dependency' },
      { regex: /deadlock|lock timeout/i, name: 'Deadlock' },
    ];

    for (const indicator of errorIndicators) {
      if (indicator.regex.test(output)) {
        // Extract context around the error
        const match = output.match(indicator.regex);
        const startIdx = Math.max(0, (match?.index || 0) - 100);
        const endIdx = Math.min(output.length, (match?.index || 0) + 200);
        const context = output.substring(startIdx, endIdx);

        patterns.push({
          name: indicator.name,
          description: `Detected ${indicator.name} pattern: ${context.trim()}`,
          prevention: `Add validation/check before operations that may cause ${indicator.name.toLowerCase()}`,
        });
      }
    }

    return patterns;
  }

  private detectBestPractices(
    output: string
  ): Array<{ name: string; description: string }> {
    const practices: Array<{ name: string; description: string }> = [];

    const practiceIndicators = [
      { regex: /best practice|recommended approach|pattern.*follow/i, name: 'General' },
      { regex: /input validation|validate.*input|sanitize/i, name: 'Input Validation' },
      { regex: /error handling|try.*catch|graceful.*degrad/i, name: 'Error Handling' },
      { regex: /test.*coverage|unit test|integration test/i, name: 'Testing' },
      { regex: /cache|memoiz|optimization/i, name: 'Performance' },
      { regex: /rate limit|throttl|circuit breaker/i, name: 'Resilience' },
    ];

    for (const indicator of practiceIndicators) {
      const matches = output.match(new RegExp(indicator.regex.source, 'gi'));
      if (matches && matches.length >= 2) {
        // Pattern mentioned multiple times, likely a deliberate practice
        practices.push({
          name: `${indicator.name} Practice`,
          description: `Identified recurring ${indicator.name.toLowerCase()} pattern in agent output. This suggests an emerging best practice.`,
        });
      }
    }

    return practices;
  }

  private detectSecurityInsights(
    output: string
  ): Array<{ name: string; description: string }> {
    const insights: Array<{ name: string; description: string }> = [];

    const securityIndicators = [
      { regex: /sql injection|sqli/i, name: 'SQL Injection Risk' },
      { regex: /xss|cross.?site.?script/i, name: 'XSS Vulnerability' },
      { regex: /csrf|cross.?site.?request/i, name: 'CSRF Risk' },
      { regex: /hardcoded.*secret|hardcoded.*password|hardcoded.*key/i, name: 'Hardcoded Secrets' },
      { regex: /insecure.*direct.*object/i, name: 'IDOR Vulnerability' },
      { regex: /authentication.*bypass|auth.*bypass/i, name: 'Authentication Bypass' },
      { regex: /privilege.*escalation/i, name: 'Privilege Escalation' },
      { regex: /unvalidated.*redirect/i, name: 'Unvalidated Redirect' },
    ];

    for (const indicator of securityIndicators) {
      if (indicator.regex.test(output)) {
        const match = output.match(indicator.regex);
        const startIdx = Math.max(0, (match?.index || 0) - 100);
        const endIdx = Math.min(output.length, (match?.index || 0) + 200);
        const context = output.substring(startIdx, endIdx);

        insights.push({
          name: indicator.name,
          description: `Security concern detected: ${indicator.name}. Context: ${context.trim()}`,
        });
      }
    }

    return insights;
  }
}
