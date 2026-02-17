/**
 * aisdlc_classify MCP Tool
 *
 * Classifies a user request to determine routing strategy.
 * Uses the Phase 1 HybridClassifier for two-tier classification.
 *
 * @module mcp-server/tools/classify
 */

import { HybridClassifier } from '../../classifier';
import { ClassificationContext, RequestClassification } from '../../classifier/types';

/**
 * Input schema for the classify tool.
 */
export const classifyToolSchema = {
  name: 'aisdlc_classify',
  description: 'Classify a user request to determine its type (qa, code-change, bug-fix, etc.), complexity, urgency, and whether it should be routed through the SDLC workflow. Returns a full classification result.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      message: {
        type: 'string',
        description: 'The user message to classify',
      },
      branch: {
        type: 'string',
        description: 'Current git branch name (optional, for context)',
      },
      projectType: {
        type: 'string',
        description: 'Project type (e.g., "typescript", "python") for context',
      },
    },
    required: ['message'],
  },
};

/**
 * Execute the classify tool.
 */
export async function executeClassify(
  args: { message: string; branch?: string; projectType?: string },
  classifier: HybridClassifier,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    const context: ClassificationContext = {};
    if (args.branch) context.branch = args.branch;
    if (args.projectType) context.projectType = args.projectType;

    const classification = await classifier.classify(args.message, context);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formatClassificationResult(classification), null, 2),
      }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Classification failed: ${errorMsg}` }),
      }],
      isError: true,
    };
  }
}

/**
 * Format classification result for MCP output.
 */
function formatClassificationResult(classification: RequestClassification): Record<string, unknown> {
  return {
    id: classification.id,
    type: classification.type,
    complexity: classification.complexity,
    urgency: classification.urgency,
    confidence: classification.confidence,
    requiresSDLC: classification.requiresSDLC,
    requiredPhases: classification.requiredPhases,
    optionalPhases: classification.optionalPhases,
    estimatedDuration: classification.estimatedDuration,
    estimatedTokens: classification.estimatedTokens,
    detectedTechnologies: classification.detectedTechnologies,
    classifierUsed: classification.classifierUsed,
    classificationDuration: `${classification.classificationDuration}ms`,
    gitContext: classification.gitContext,
  };
}
