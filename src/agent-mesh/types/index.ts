/**
 * Agent Mesh Type Definitions
 *
 * Core types for the inter-agent communication, collective memory,
 * and autonomous learning system.
 */

// ============================================================
// Agent Identity & Registry Types
// ============================================================

export type AgentId =
  | 'conductor'
  | 'ba'
  | 'jets'        // Architect
  | 'ux'
  | 'engineer'
  | 'security'
  | 'qa'
  | 'atlas'       // DevOps/SRE
  | 'customer'
  | 'ask-tom'
  | 'tracker'
  | 'finops'
  | 'exec';       // Executive Presentation Specialist (V2)

export type AgentCapability =
  | 'requirements'
  | 'architecture'
  | 'ux-design'
  | 'implementation'
  | 'security-review'
  | 'testing'
  | 'deployment'
  | 'acceptance'
  | 'problem-solving'
  | 'tracking'
  | 'cost-analysis'
  | 'orchestration'
  | 'presentation-generation'; // V2 ADDITION: exec agent capability

export interface AgentProfile {
  id: AgentId;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  model: 'opus' | 'sonnet' | 'haiku';
  memoryPath: string;
  status: 'available' | 'busy' | 'offline';
  lastActive: string;
  expertise: string[];
  canReceiveFrom: AgentId[];
  canSendTo: AgentId[];
}

// ============================================================
// Message Types
// ============================================================

export type MessageType =
  | 'request'           // Ask another agent for help
  | 'response'          // Reply to a request
  | 'notification'      // Inform agents of something
  | 'learning'          // Share a learning/insight
  | 'consultation'      // Formal expertise consultation
  | 'escalation'        // Escalate an issue
  | 'broadcast'         // Message to all agents
  | 'knowledge-update'  // Update shared knowledge
  | 'conflict'          // Report a disagreement
  | 'resolution';       // Resolve a conflict

export type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

export type MessageStatus =
  | 'pending'
  | 'delivered'
  | 'read'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'acknowledged';

export interface AgentMessage {
  id: string;
  correlationId: string;      // Links related messages
  parentMessageId?: string;   // For threading
  timestamp: string;
  type: MessageType;
  priority: MessagePriority;
  status: MessageStatus;
  sender: AgentId;
  receiver: AgentId | 'all';  // 'all' for broadcasts
  subject: string;
  content: string;
  context: MessageContext;
  metadata: MessageMetadata;
  ttl: number;                // Seconds until expiry
  requiresAck: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface MessageContext {
  sdlcPhase?: string;
  workItemId?: string;
  projectId?: string;
  relatedFiles?: string[];
  relatedAgents?: AgentId[];
  tags?: string[];
}

export interface MessageMetadata {
  traceId: string;
  spanId: string;
  processingTime?: number;
  tokenCost?: number;
  learningGenerated?: boolean;
  conflictDetected?: boolean;
}

// ============================================================
// Collective Memory Types
// ============================================================

export type KnowledgeCategory =
  | 'cross-agent-learning'
  | 'error-pattern'
  | 'best-practice'
  | 'anti-pattern'
  | 'architecture-decision'
  | 'security-insight'
  | 'performance-insight'
  | 'process-improvement'
  | 'conflict-resolution'
  | 'integration-pattern';

export type KnowledgeConfidence = 'speculative' | 'emerging' | 'established' | 'proven';

export interface CollectiveKnowledge {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  confidence: KnowledgeConfidence;
  sourceAgents: AgentId[];
  applicableAgents: AgentId[];
  evidenceCount: number;
  evidence: KnowledgeEvidence[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  accessCount: number;
  version: number;
  status: 'active' | 'deprecated' | 'superseded';
  supersededBy?: string;
}

export interface KnowledgeEvidence {
  agentId: AgentId;
  messageId: string;
  timestamp: string;
  description: string;
  outcome: 'success' | 'failure' | 'partial';
}

// ============================================================
// Learning Types
// ============================================================

export type LearningTrigger =
  | 'problem-solved'
  | 'error-encountered'
  | 'pattern-recognized'
  | 'consultation-completed'
  | 'conflict-resolved'
  | 'performance-anomaly'
  | 'security-finding'
  | 'process-deviation'
  | 'manual';

export interface LearningEvent {
  id: string;
  trigger: LearningTrigger;
  timestamp: string;
  sourceAgent: AgentId;
  targetAgents: AgentId[];
  learning: {
    title: string;
    description: string;
    category: KnowledgeCategory;
    confidence: KnowledgeConfidence;
    applicability: string;
    preventionStrategy?: string;
  };
  context: {
    projectId?: string;
    workItemId?: string;
    phase?: string;
    relatedMessages: string[];
  };
  propagated: boolean;
  propagatedTo: AgentId[];
  propagatedAt?: string;
}

// ============================================================
// Audit Types
// ============================================================

export type AuditEventType =
  | 'message-sent'
  | 'message-received'
  | 'message-processed'
  | 'message-failed'
  | 'learning-created'
  | 'learning-propagated'
  | 'knowledge-updated'
  | 'conflict-detected'
  | 'conflict-resolved'
  | 'agent-registered'
  | 'agent-deregistered'
  | 'circuit-breaker-opened'
  | 'circuit-breaker-closed';

export interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  agentId: AgentId;
  targetAgentId?: AgentId;
  messageId?: string;
  details: Record<string, any>;
  success: boolean;
  error?: string;
  duration?: number;
}

// ============================================================
// Protocol Types
// ============================================================

export interface CircuitBreakerState {
  agentId: AgentId;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure?: string;
  lastSuccess?: string;
  resetTimeout: number;   // ms
  threshold: number;
}

export interface ConflictRecord {
  id: string;
  timestamp: string;
  agents: AgentId[];
  subject: string;
  positions: ConflictPosition[];
  status: 'open' | 'voting' | 'resolved' | 'escalated';
  resolution?: ConflictResolution;
}

export interface ConflictPosition {
  agentId: AgentId;
  position: string;
  reasoning: string;
  confidence: number;   // 0-1
  evidence: string[];
}

export interface ConflictResolution {
  method: 'consensus' | 'majority-vote' | 'expertise-weighted' | 'conductor-decision' | 'user-decision';
  outcome: string;
  rationale: string;
  resolvedBy: AgentId | 'user';
  resolvedAt: string;
  dissent?: {
    agentId: AgentId;
    reason: string;
  }[];
}

// ============================================================
// Configuration Types
// ============================================================

export interface AgentMeshConfig {
  basePath: string;               // Where mesh data lives
  messageTTL: number;             // Default message TTL in seconds
  maxRetries: number;             // Default max retries
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
  learningPropagationDelay: number;  // ms before propagating
  maxConcurrentMessages: number;
  auditRetentionDays: number;
  conflictResolutionTimeout: number; // ms
  loopDetectionDepth: number;        // Max message chain depth
}

export const DEFAULT_MESH_CONFIG: AgentMeshConfig = {
  basePath: '~/.claude/agent-mesh',
  messageTTL: 86400,             // 24 hours
  maxRetries: 3,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60000,  // 1 minute
  learningPropagationDelay: 5000, // 5 seconds
  maxConcurrentMessages: 50,
  auditRetentionDays: 30,
  conflictResolutionTimeout: 300000, // 5 minutes
  loopDetectionDepth: 10,
};
