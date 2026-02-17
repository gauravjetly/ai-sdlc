/**
 * Agent Registry
 *
 * Central registry where all agents register their capabilities,
 * expertise, and communication preferences. Enables dynamic
 * agent discovery and routing.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  AgentId,
  AgentProfile,
  AgentCapability,
  AgentMeshConfig,
  DEFAULT_MESH_CONFIG,
} from '../types';

export class AgentRegistry {
  private agents: Map<AgentId, AgentProfile> = new Map();
  private registryPath: string;
  private config: AgentMeshConfig;

  constructor(config: Partial<AgentMeshConfig> = {}) {
    this.config = { ...DEFAULT_MESH_CONFIG, ...config };
    const basePath = this.config.basePath.replace('~', os.homedir());
    this.registryPath = path.join(basePath, 'registry');
  }

  /**
   * Initialize the registry with default agent profiles
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.registryPath, { recursive: true });

    // Load existing registry or create default
    const registryFile = path.join(this.registryPath, 'agents.json');
    try {
      const data = await fs.readFile(registryFile, 'utf-8');
      const profiles: AgentProfile[] = JSON.parse(data);
      for (const profile of profiles) {
        this.agents.set(profile.id, profile);
      }
      console.log(`[AgentRegistry] Loaded ${this.agents.size} agents from registry`);
    } catch {
      // Initialize with default profiles
      this.initializeDefaults();
      await this.persist();
      console.log(`[AgentRegistry] Initialized registry with ${this.agents.size} default agents`);
    }
  }

  /**
   * Register or update an agent
   */
  async register(profile: AgentProfile): Promise<void> {
    this.agents.set(profile.id, {
      ...profile,
      status: 'available',
      lastActive: new Date().toISOString(),
    });
    await this.persist();
    console.log(`[AgentRegistry] Registered agent: ${profile.id}`);
  }

  /**
   * Deregister an agent
   */
  async deregister(agentId: AgentId): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'offline';
      agent.lastActive = new Date().toISOString();
      await this.persist();
      console.log(`[AgentRegistry] Deregistered agent: ${agentId}`);
    }
  }

  /**
   * Get an agent profile
   */
  getAgent(agentId: AgentId): AgentProfile | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get available agents (not offline)
   */
  getAvailableAgents(): AgentProfile[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.status !== 'offline'
    );
  }

  /**
   * Find agents by capability
   */
  findByCapability(capability: AgentCapability): AgentProfile[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.capabilities.includes(capability) && a.status !== 'offline'
    );
  }

  /**
   * Find agents by expertise keyword
   */
  findByExpertise(keyword: string): AgentProfile[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.agents.values()).filter(
      (a) =>
        a.status !== 'offline' &&
        a.expertise.some((e) => e.toLowerCase().includes(lowerKeyword))
    );
  }

  /**
   * Find the best agent to handle a specific topic
   * Returns agents ranked by relevance
   */
  findBestAgentForTopic(topic: string): AgentProfile[] {
    const lowerTopic = topic.toLowerCase();
    const scored = Array.from(this.agents.values())
      .filter((a) => a.status !== 'offline')
      .map((agent) => {
        let score = 0;
        // Check expertise match
        for (const expertise of agent.expertise) {
          if (lowerTopic.includes(expertise.toLowerCase())) {
            score += 3;
          }
        }
        // Check capability match
        for (const cap of agent.capabilities) {
          if (lowerTopic.includes(cap.replace('-', ' '))) {
            score += 2;
          }
        }
        // Check name/description match
        if (lowerTopic.includes(agent.name.toLowerCase())) {
          score += 1;
        }
        return { agent, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((item) => item.agent);
  }

  /**
   * Check if agent can send to another agent
   */
  canCommunicate(sender: AgentId, receiver: AgentId): boolean {
    const senderProfile = this.agents.get(sender);
    const receiverProfile = this.agents.get(receiver);

    if (!senderProfile || !receiverProfile) return false;
    if (receiverProfile.status === 'offline') return false;

    // Check explicit communication rules
    if (senderProfile.canSendTo.length > 0) {
      return senderProfile.canSendTo.includes(receiver);
    }

    // Default: all agents can communicate
    return true;
  }

  /**
   * Update agent status
   */
  async updateStatus(
    agentId: AgentId,
    status: 'available' | 'busy' | 'offline'
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastActive = new Date().toISOString();
      await this.persist();
    }
  }

  /**
   * Get the communication matrix
   */
  getCommunicationMatrix(): Record<AgentId, AgentId[]> {
    const matrix: Partial<Record<AgentId, AgentId[]>> = {};

    for (const [agentId, profile] of this.agents) {
      const canSendTo: AgentId[] = [];
      for (const [targetId] of this.agents) {
        if (targetId !== agentId && this.canCommunicate(agentId, targetId)) {
          canSendTo.push(targetId);
        }
      }
      matrix[agentId] = canSendTo;
    }

    return matrix as Record<AgentId, AgentId[]>;
  }

  /**
   * Persist registry to disk
   */
  private async persist(): Promise<void> {
    const registryFile = path.join(this.registryPath, 'agents.json');
    const profiles = Array.from(this.agents.values());
    await fs.writeFile(registryFile, JSON.stringify(profiles, null, 2), 'utf-8');
  }

  /**
   * Initialize default agent profiles
   */
  private initializeDefaults(): void {
    const now = new Date().toISOString();

    const defaults: AgentProfile[] = [
      {
        id: 'conductor',
        name: 'Conductor',
        description: 'Meta-orchestrator for SDLC workflows',
        capabilities: ['orchestration'],
        model: 'opus',
        memoryPath: '~/.claude/agent-memory/conductor',
        status: 'available',
        lastActive: now,
        expertise: [
          'workflow orchestration',
          'project management',
          'phase coordination',
          'blocker resolution',
          'cost management',
        ],
        canReceiveFrom: [
          'ba', 'jets', 'ux', 'engineer', 'security',
          'qa', 'atlas', 'customer', 'ask-tom', 'tracker', 'finops',
        ],
        canSendTo: [
          'ba', 'jets', 'ux', 'engineer', 'security',
          'qa', 'atlas', 'customer', 'ask-tom', 'tracker', 'finops',
        ],
      },
      {
        id: 'ba',
        name: 'BA Agent',
        description: 'Business Analyst - Requirements gathering and analysis',
        capabilities: ['requirements'],
        model: 'sonnet',
        memoryPath: '~/.claude/agent-memory/ba',
        status: 'available',
        lastActive: now,
        expertise: [
          'requirements engineering',
          'user stories',
          'acceptance criteria',
          'business rules',
          'stakeholder analysis',
          'domain modeling',
        ],
        canReceiveFrom: ['conductor', 'customer', 'jets', 'engineer'],
        canSendTo: ['conductor', 'jets', 'customer', 'tracker'],
      },
      {
        id: 'jets',
        name: 'Architect Jets',
        description: 'System Architect - Architecture design and ADRs',
        capabilities: ['architecture'],
        model: 'opus',
        memoryPath: '~/.claude/agent-memory/jets',
        status: 'available',
        lastActive: now,
        expertise: [
          'system architecture',
          'design patterns',
          'microservices',
          'event-driven architecture',
          'clean architecture',
          'domain-driven design',
          'ADR writing',
          'technology selection',
          'scalability',
        ],
        canReceiveFrom: ['conductor', 'ba', 'engineer', 'security', 'qa'],
        canSendTo: ['conductor', 'engineer', 'security', 'tracker'],
      },
      {
        id: 'ux',
        name: 'UX Agent',
        description: 'UX/UI Design Specialist',
        capabilities: ['ux-design'],
        model: 'sonnet',
        memoryPath: '~/.claude/agent-memory/ux',
        status: 'available',
        lastActive: now,
        expertise: [
          'user experience design',
          'accessibility',
          'design systems',
          'wireframing',
          'user research',
          'WCAG compliance',
          'responsive design',
          'information architecture',
        ],
        canReceiveFrom: ['conductor', 'ba', 'engineer', 'customer'],
        canSendTo: ['conductor', 'engineer', 'customer', 'tracker'],
      },
      {
        id: 'engineer',
        name: 'Software Engineer',
        description: 'Full-stack implementation specialist',
        capabilities: ['implementation'],
        model: 'sonnet',
        memoryPath: '~/.claude/agent-memory/engineer',
        status: 'available',
        lastActive: now,
        expertise: [
          'TypeScript',
          'JavaScript',
          'Python',
          'Go',
          'React',
          'Node.js',
          'API development',
          'database design',
          'testing',
          'clean code',
          'SOLID principles',
          'performance optimization',
        ],
        canReceiveFrom: ['conductor', 'jets', 'ux', 'security', 'qa'],
        canSendTo: ['conductor', 'security', 'qa', 'tracker'],
      },
      {
        id: 'security',
        name: 'Security Agent',
        description: 'Security review and compliance specialist',
        capabilities: ['security-review'],
        model: 'sonnet',
        memoryPath: '~/.claude/agent-memory/security',
        status: 'available',
        lastActive: now,
        expertise: [
          'OWASP Top 10',
          'threat modeling',
          'STRIDE',
          'security scanning',
          'SAST',
          'DAST',
          'compliance',
          'zero trust',
          'encryption',
          'authentication',
          'authorization',
        ],
        canReceiveFrom: ['conductor', 'jets', 'engineer'],
        canSendTo: ['conductor', 'engineer', 'qa', 'tracker'],
      },
      {
        id: 'qa',
        name: 'QA Agent',
        description: 'Quality assurance and testing specialist',
        capabilities: ['testing'],
        model: 'sonnet',
        memoryPath: '~/.claude/agent-memory/qa',
        status: 'available',
        lastActive: now,
        expertise: [
          'test strategy',
          'test automation',
          'integration testing',
          'E2E testing',
          'performance testing',
          'load testing',
          'BDD',
          'TDD',
          'test pyramids',
          'coverage analysis',
        ],
        canReceiveFrom: ['conductor', 'security', 'engineer'],
        canSendTo: ['conductor', 'engineer', 'customer', 'tracker'],
      },
      {
        id: 'atlas',
        name: 'Atlas Agent',
        description: 'DevOps/SRE - Deployment and infrastructure',
        capabilities: ['deployment'],
        model: 'sonnet',
        memoryPath: '~/.claude/agent-memory/atlas',
        status: 'available',
        lastActive: now,
        expertise: [
          'CI/CD',
          'Docker',
          'Kubernetes',
          'AWS',
          'Azure',
          'GCP',
          'Terraform',
          'monitoring',
          'SRE',
          'incident response',
          'infrastructure as code',
        ],
        canReceiveFrom: ['conductor', 'engineer', 'security'],
        canSendTo: ['conductor', 'customer', 'tracker'],
      },
      {
        id: 'customer',
        name: 'Customer Agent',
        description: 'User acceptance testing and validation',
        capabilities: ['acceptance'],
        model: 'sonnet',
        memoryPath: '~/.claude/agent-memory/customer',
        status: 'available',
        lastActive: now,
        expertise: [
          'acceptance testing',
          'user validation',
          'business value verification',
          'usability assessment',
          'functional validation',
        ],
        canReceiveFrom: ['conductor', 'qa', 'ba', 'atlas'],
        canSendTo: ['conductor', 'ba', 'tracker'],
      },
      {
        id: 'ask-tom',
        name: 'Ask Tom',
        description: 'Elite problem solver with memory and self-learning',
        capabilities: ['problem-solving'],
        model: 'opus',
        memoryPath: '~/.claude/ask-tom-memory',
        status: 'available',
        lastActive: now,
        expertise: [
          'root cause analysis',
          'systematic debugging',
          'binary search debugging',
          'environment issues',
          'build failures',
          'test failures',
          'integration issues',
          'performance debugging',
          'security issues',
        ],
        canReceiveFrom: [
          'conductor', 'ba', 'jets', 'ux', 'engineer',
          'security', 'qa', 'atlas', 'customer', 'tracker', 'finops',
        ],
        canSendTo: [
          'conductor', 'ba', 'jets', 'ux', 'engineer',
          'security', 'qa', 'atlas', 'customer', 'tracker', 'finops',
        ],
      },
      {
        id: 'tracker',
        name: 'Tracker Agent',
        description: 'Progress tracking and status reporting',
        capabilities: ['tracking'],
        model: 'haiku',
        memoryPath: '~/.claude/agent-memory/tracker',
        status: 'available',
        lastActive: now,
        expertise: [
          'progress tracking',
          'status reporting',
          'metrics',
          'blocker detection',
          'timeline management',
        ],
        canReceiveFrom: [
          'conductor', 'ba', 'jets', 'ux', 'engineer',
          'security', 'qa', 'atlas', 'customer', 'ask-tom', 'finops',
        ],
        canSendTo: ['conductor'],
      },
      {
        id: 'finops',
        name: 'FinOps Agent',
        description: 'Cost tracking and optimization',
        capabilities: ['cost-analysis'],
        model: 'haiku',
        memoryPath: '~/.claude/agent-memory/finops',
        status: 'available',
        lastActive: now,
        expertise: [
          'cost optimization',
          'budget management',
          'cloud cost analysis',
          'token usage tracking',
          'resource right-sizing',
        ],
        canReceiveFrom: ['conductor', 'atlas', 'jets'],
        canSendTo: ['conductor', 'atlas', 'tracker'],
      },
    ];

    for (const profile of defaults) {
      this.agents.set(profile.id, profile);
    }
  }
}
