/**
 * Conflict Resolution Protocol
 *
 * When two or more agents disagree on a technical decision,
 * this protocol manages the resolution process.
 *
 * Resolution methods (in priority order):
 * 1. Consensus: All parties agree on a solution
 * 2. Expertise-Weighted Vote: Domain expert's opinion carries more weight
 * 3. Majority Vote: Simple majority decides
 * 4. Conductor Decision: Conductor breaks the tie
 * 5. User Decision: Escalate to human
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentId,
  ConflictRecord,
  ConflictPosition,
  ConflictResolution,
  AgentMeshConfig,
  DEFAULT_MESH_CONFIG,
} from '../types';
import { AgentRegistry } from '../registry/agent-registry';
import { CollectiveMemory } from '../memory/collective-memory';

/**
 * Domain expertise weights for conflict resolution
 * Higher weight means more authority in that domain
 */
const EXPERTISE_WEIGHTS: Record<string, Partial<Record<AgentId, number>>> = {
  security: { security: 5, engineer: 2, jets: 3, qa: 2 },
  architecture: { jets: 5, engineer: 3, security: 2, atlas: 2 },
  implementation: { engineer: 5, jets: 2, qa: 2, security: 1 },
  testing: { qa: 5, engineer: 2, security: 2, customer: 1 },
  deployment: { atlas: 5, engineer: 2, security: 2, qa: 1 },
  requirements: { ba: 5, customer: 3, jets: 2, ux: 2 },
  performance: { engineer: 4, atlas: 4, jets: 3, qa: 2 },
  ux: { ux: 5, customer: 3, ba: 2, engineer: 1 },
  cost: { finops: 5, atlas: 3, conductor: 2 },
};

export class ConflictResolver {
  private basePath: string;
  private conflictsPath: string;
  private config: AgentMeshConfig;
  private registry: AgentRegistry;
  private collectiveMemory: CollectiveMemory;

  constructor(
    registry: AgentRegistry,
    collectiveMemory: CollectiveMemory,
    config: Partial<AgentMeshConfig> = {}
  ) {
    this.config = { ...DEFAULT_MESH_CONFIG, ...config };
    this.basePath = this.config.basePath.replace('~', os.homedir());
    this.conflictsPath = path.join(this.basePath, 'conflicts');
    this.registry = registry;
    this.collectiveMemory = collectiveMemory;
  }

  /**
   * Initialize conflict resolution storage
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.conflictsPath, { recursive: true });
    console.log('[ConflictResolver] Initialized');
  }

  /**
   * Register a new conflict between agents
   */
  async registerConflict(
    agents: AgentId[],
    subject: string,
    positions: ConflictPosition[]
  ): Promise<ConflictRecord> {
    const conflict: ConflictRecord = {
      id: `CONF-${uuidv4().split('-')[0]}`,
      timestamp: new Date().toISOString(),
      agents,
      subject,
      positions,
      status: 'open',
    };

    await this.saveConflict(conflict);

    console.log(
      `[ConflictResolver] Conflict registered: ${conflict.id} - ${subject} ` +
      `between ${agents.join(', ')}`
    );

    return conflict;
  }

  /**
   * Add a position to an existing conflict
   */
  async addPosition(
    conflictId: string,
    position: ConflictPosition
  ): Promise<ConflictRecord | null> {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) return null;
    if (conflict.status === 'resolved' || conflict.status === 'escalated') {
      return conflict;
    }

    // Add or update position
    const existingIdx = conflict.positions.findIndex(
      (p) => p.agentId === position.agentId
    );
    if (existingIdx >= 0) {
      conflict.positions[existingIdx] = position;
    } else {
      conflict.positions.push(position);
      if (!conflict.agents.includes(position.agentId)) {
        conflict.agents.push(position.agentId);
      }
    }

    await this.saveConflict(conflict);
    return conflict;
  }

  /**
   * Attempt to resolve a conflict
   * Tries each resolution method in order until one succeeds
   */
  async resolveConflict(conflictId: string): Promise<ConflictRecord | null> {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) return null;
    if (conflict.status === 'resolved') return conflict;

    conflict.status = 'voting';
    await this.saveConflict(conflict);

    // Method 1: Check for consensus
    const consensus = this.checkConsensus(conflict);
    if (consensus) {
      conflict.resolution = {
        method: 'consensus',
        outcome: consensus.position,
        rationale: 'All agents agree on this approach',
        resolvedBy: consensus.agentId,
        resolvedAt: new Date().toISOString(),
      };
      conflict.status = 'resolved';
      await this.saveConflict(conflict);
      await this.recordResolutionLearning(conflict);
      return conflict;
    }

    // Method 2: Expertise-weighted vote
    const domain = this.detectDomain(conflict.subject);
    const expertiseResult = this.expertiseWeightedVote(
      conflict.positions,
      domain
    );
    if (expertiseResult && expertiseResult.confidence > 0.7) {
      conflict.resolution = {
        method: 'expertise-weighted',
        outcome: expertiseResult.position,
        rationale: `Domain expert (${expertiseResult.agentId}) recommends this approach for ${domain} concerns`,
        resolvedBy: expertiseResult.agentId,
        resolvedAt: new Date().toISOString(),
        dissent: conflict.positions
          .filter((p) => p.position !== expertiseResult.position)
          .map((p) => ({ agentId: p.agentId, reason: p.reasoning })),
      };
      conflict.status = 'resolved';
      await this.saveConflict(conflict);
      await this.recordResolutionLearning(conflict);
      return conflict;
    }

    // Method 3: Majority vote
    const majorityResult = this.majorityVote(conflict.positions);
    if (majorityResult) {
      conflict.resolution = {
        method: 'majority-vote',
        outcome: majorityResult.position,
        rationale: `Majority of agents (${majorityResult.count}/${conflict.positions.length}) support this approach`,
        resolvedBy: majorityResult.agentId,
        resolvedAt: new Date().toISOString(),
        dissent: conflict.positions
          .filter((p) => p.position !== majorityResult.position)
          .map((p) => ({ agentId: p.agentId, reason: p.reasoning })),
      };
      conflict.status = 'resolved';
      await this.saveConflict(conflict);
      await this.recordResolutionLearning(conflict);
      return conflict;
    }

    // Method 4: Conductor decision (default)
    const conductorPosition = conflict.positions.find(
      (p) => p.agentId === 'conductor'
    );
    if (conductorPosition) {
      conflict.resolution = {
        method: 'conductor-decision',
        outcome: conductorPosition.position,
        rationale: 'No consensus or majority. Conductor makes the call.',
        resolvedBy: 'conductor',
        resolvedAt: new Date().toISOString(),
        dissent: conflict.positions
          .filter((p) => p.agentId !== 'conductor' && p.position !== conductorPosition.position)
          .map((p) => ({ agentId: p.agentId, reason: p.reasoning })),
      };
      conflict.status = 'resolved';
      await this.saveConflict(conflict);
      await this.recordResolutionLearning(conflict);
      return conflict;
    }

    // Method 5: Escalate to user
    conflict.status = 'escalated';
    await this.saveConflict(conflict);

    console.log(
      `[ConflictResolver] Conflict ${conflictId} escalated to user - no automated resolution possible`
    );

    return conflict;
  }

  /**
   * Resolve a conflict by user decision
   */
  async resolveByUser(
    conflictId: string,
    decision: string,
    rationale: string
  ): Promise<ConflictRecord | null> {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) return null;

    conflict.resolution = {
      method: 'user-decision',
      outcome: decision,
      rationale,
      resolvedBy: 'user',
      resolvedAt: new Date().toISOString(),
    };
    conflict.status = 'resolved';

    await this.saveConflict(conflict);
    await this.recordResolutionLearning(conflict);

    return conflict;
  }

  /**
   * Get a conflict by ID
   */
  async getConflict(id: string): Promise<ConflictRecord | null> {
    try {
      const filePath = path.join(this.conflictsPath, `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get all open conflicts
   */
  async getOpenConflicts(): Promise<ConflictRecord[]> {
    const conflicts: ConflictRecord[] = [];

    try {
      const files = await fs.readdir(this.conflictsPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const content = await fs.readFile(
          path.join(this.conflictsPath, file),
          'utf-8'
        );
        const conflict: ConflictRecord = JSON.parse(content);
        if (conflict.status === 'open' || conflict.status === 'voting') {
          conflicts.push(conflict);
        }
      }
    } catch {
      // Directory may not exist
    }

    return conflicts;
  }

  /**
   * Get conflict history
   */
  async getConflictHistory(limit: number = 20): Promise<ConflictRecord[]> {
    const conflicts: ConflictRecord[] = [];

    try {
      const files = await fs.readdir(this.conflictsPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const content = await fs.readFile(
          path.join(this.conflictsPath, file),
          'utf-8'
        );
        conflicts.push(JSON.parse(content));
      }
    } catch {
      // Directory may not exist
    }

    return conflicts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // ---- Private Methods ----

  private checkConsensus(
    conflict: ConflictRecord
  ): ConflictPosition | null {
    if (conflict.positions.length < 2) return null;

    const firstPosition = conflict.positions[0].position;
    const allAgree = conflict.positions.every(
      (p) => p.position === firstPosition
    );

    return allAgree ? conflict.positions[0] : null;
  }

  private expertiseWeightedVote(
    positions: ConflictPosition[],
    domain: string
  ): (ConflictPosition & { confidence: number }) | null {
    const weights = EXPERTISE_WEIGHTS[domain];
    if (!weights) return null;

    let bestPosition: ConflictPosition | null = null;
    let bestScore = 0;
    let totalWeight = 0;

    for (const position of positions) {
      const weight = weights[position.agentId] || 1;
      const score = weight * position.confidence;
      totalWeight += weight;

      if (score > bestScore) {
        bestScore = score;
        bestPosition = position;
      }
    }

    if (!bestPosition) return null;

    return {
      ...bestPosition,
      confidence: bestScore / totalWeight,
    };
  }

  private majorityVote(
    positions: ConflictPosition[]
  ): (ConflictPosition & { count: number }) | null {
    const votes = new Map<string, { position: ConflictPosition; count: number }>();

    for (const position of positions) {
      const key = position.position;
      const existing = votes.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        votes.set(key, { position, count: 1 });
      }
    }

    const majority = Math.floor(positions.length / 2) + 1;

    for (const [, value] of votes) {
      if (value.count >= majority) {
        return { ...value.position, count: value.count };
      }
    }

    return null;
  }

  private detectDomain(subject: string): string {
    const lower = subject.toLowerCase();
    const domainKeywords: Record<string, string[]> = {
      security: ['security', 'vulnerability', 'authentication', 'authorization', 'encryption', 'compliance'],
      architecture: ['architecture', 'design', 'pattern', 'scalability', 'microservice', 'monolith'],
      implementation: ['code', 'implementation', 'algorithm', 'function', 'class', 'module'],
      testing: ['test', 'coverage', 'quality', 'bug', 'regression'],
      deployment: ['deploy', 'infrastructure', 'kubernetes', 'docker', 'ci/cd', 'pipeline'],
      requirements: ['requirement', 'feature', 'user story', 'acceptance criteria'],
      performance: ['performance', 'latency', 'throughput', 'optimization', 'cache'],
      ux: ['user experience', 'design', 'accessibility', 'usability', 'interface'],
      cost: ['cost', 'budget', 'pricing', 'optimization', 'resource'],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return domain;
        }
      }
    }

    return 'implementation'; // Default domain
  }

  private async recordResolutionLearning(
    conflict: ConflictRecord
  ): Promise<void> {
    if (!conflict.resolution) return;

    await this.collectiveMemory.addKnowledge({
      category: 'conflict-resolution',
      title: `Conflict Resolution: ${conflict.subject}`,
      content: [
        `## Conflict: ${conflict.subject}`,
        ``,
        `### Positions`,
        ...conflict.positions.map(
          (p) => `- **${p.agentId}**: ${p.position} (confidence: ${p.confidence})`
        ),
        ``,
        `### Resolution`,
        `- **Method**: ${conflict.resolution.method}`,
        `- **Outcome**: ${conflict.resolution.outcome}`,
        `- **Rationale**: ${conflict.resolution.rationale}`,
        conflict.resolution.dissent
          ? `\n### Dissent\n${conflict.resolution.dissent.map((d) => `- ${d.agentId}: ${d.reason}`).join('\n')}`
          : '',
      ].join('\n'),
      confidence: 'emerging',
      sourceAgent: conflict.resolution.resolvedBy === 'user'
        ? 'conductor'
        : conflict.resolution.resolvedBy as AgentId,
      applicableAgents: conflict.agents,
      tags: ['conflict-resolution', this.detectDomain(conflict.subject)],
    });
  }

  private async saveConflict(conflict: ConflictRecord): Promise<void> {
    const filePath = path.join(this.conflictsPath, `${conflict.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(conflict, null, 2), 'utf-8');
  }
}
