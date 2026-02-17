/**
 * Message Transformer
 *
 * Transforms user messages based on classification and routing decisions.
 * Responsible for injecting SDLC context into messages when routing through SDLC,
 * and returning the message unchanged for passthrough requests.
 *
 * @module hooks/lib/message-transformer
 */

import { RequestClassification } from '../../classifier/types';
import { RoutingDecision } from '../../router/types';
import { GovernanceDecision } from '../../governance/types';

/**
 * Result of transforming a user message.
 */
export interface TransformResult {
  /** The transformed (or original) user message */
  userMessage: string;
  /** Whether the message was transformed */
  transformed: boolean;
  /** Context metadata about the transformation */
  metadata: {
    classification?: RequestClassification;
    route?: RoutingDecision;
    governance?: GovernanceDecision;
  };
}

/**
 * Transform a user message based on classification and routing.
 *
 * For passthrough requests, the message is returned unchanged.
 * For SDLC requests, context is injected instructing Claude to use MCP tools.
 * For blocked requests, a blocking message is returned.
 */
export function transformMessage(
  originalMessage: string,
  classification: RequestClassification,
  route: RoutingDecision,
  governance?: GovernanceDecision,
): TransformResult {
  // If governance blocks the request, return blocking message
  if (governance && !governance.allowed) {
    return {
      userMessage: formatBlockedMessage(originalMessage, governance),
      transformed: true,
      metadata: { classification, route, governance },
    };
  }

  // If passthrough, return unchanged
  if (route.strategy === 'passthrough') {
    return {
      userMessage: originalMessage,
      transformed: false,
      metadata: { classification, route },
    };
  }

  // If SDLC routing, inject context
  const enrichedMessage = buildEnrichedMessage(originalMessage, classification, route, governance);
  return {
    userMessage: enrichedMessage,
    transformed: true,
    metadata: { classification, route, governance },
  };
}

/**
 * Build an enriched message with SDLC context injection.
 */
function buildEnrichedMessage(
  originalMessage: string,
  classification: RequestClassification,
  route: RoutingDecision,
  governance?: GovernanceDecision,
): string {
  const contextLines: string[] = [];

  // Emergency routing -- direct to Ask Tom
  if (route.strategy === 'emergency') {
    contextLines.push('[AISDLC EMERGENCY DETECTED]');
    contextLines.push(`Classification: ${classification.type} (urgency: ${classification.urgency})`);
    contextLines.push('Action: Use the aisdlc_ask_tom MCP tool immediately for root cause analysis.');
    contextLines.push('After resolution, use aisdlc_start_workflow to track the hotfix.');
    contextLines.push('');
    return `${originalMessage}\n\n${contextLines.join('\n')}`;
  }

  // Standard SDLC routing
  contextLines.push('[AISDLC CONTEXT]');
  contextLines.push(`Request type: ${classification.type}`);
  contextLines.push(`Complexity: ${classification.complexity}`);
  contextLines.push(`Urgency: ${classification.urgency}`);
  contextLines.push(`Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
  contextLines.push(`Required phases: ${route.phases.join(', ')}`);
  contextLines.push(`Routing strategy: ${route.strategy}`);
  contextLines.push(`Estimated duration: ${route.estimatedDuration}`);

  if (classification.detectedTechnologies.length > 0) {
    contextLines.push(`Technologies: ${classification.detectedTechnologies.join(', ')}`);
  }

  // Governance info
  if (governance) {
    contextLines.push(`Governance: Level ${governance.level}`);
    if (governance.advisories.length > 0) {
      contextLines.push(`Advisories: ${governance.advisories.join('; ')}`);
    }
  }

  // Instruction to use MCP tools
  contextLines.push('');
  contextLines.push(`Action: Use the aisdlc_start_workflow MCP tool to begin the governed SDLC workflow.`);
  contextLines.push(`Pass the description: "${originalMessage}"`);

  if (route.sdlcCommand) {
    contextLines.push(`SDLC command: ${route.sdlcCommand}`);
  }

  return `${originalMessage}\n\n${contextLines.join('\n')}`;
}

/**
 * Format a message explaining why a request was blocked by governance.
 */
function formatBlockedMessage(
  originalMessage: string,
  governance: GovernanceDecision,
): string {
  const lines: string[] = [];
  lines.push('[AISDLC GOVERNANCE BLOCK]');
  lines.push('');
  lines.push(`This request was blocked by governance (Level ${governance.level}).`);
  lines.push('');
  lines.push('Required gates not met:');

  for (const gate of governance.gates.filter(g => g.blocking && !g.passed)) {
    lines.push(`  - ${gate.gate}: ${gate.message}`);
    if (gate.remediation) {
      lines.push(`    Remediation: ${gate.remediation}`);
    }
  }

  if (governance.overrideAvailable) {
    lines.push('');
    if (governance.overrideRequiresToken) {
      lines.push('To override: Provide an approval token via AISDLC_BYPASS_TOKEN.');
    } else {
      lines.push('To override: Use aisdlc_check_governance MCP tool with a bypass reason.');
    }
  } else {
    lines.push('');
    lines.push('This cannot be bypassed at the current governance level.');
  }

  return `${originalMessage}\n\n${lines.join('\n')}`;
}

/**
 * Create a minimal passthrough result.
 */
export function createPassthroughResult(message: string): TransformResult {
  return {
    userMessage: message,
    transformed: false,
    metadata: {},
  };
}
