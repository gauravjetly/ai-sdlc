/**
 * aisdlc_start_workflow MCP Tool
 *
 * Starts a governed SDLC workflow for a user request.
 * Integrates with the existing SDLC conductor/registry system.
 *
 * @module mcp-server/tools/start-workflow
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HybridClassifier } from '../../classifier';
import { SmartRouter } from '../../router';
import { GovernanceEngine } from '../../governance';
import { GovernanceLevel } from '../../governance/types';

export const startWorkflowToolSchema = {
  name: 'aisdlc_start_workflow',
  description: 'Start a governed SDLC workflow. This classifies the request, determines required phases (requirements, architecture, implementation, security, testing, deployment, acceptance), applies governance rules, and initiates the multi-agent workflow. Returns a workflow ID and status.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      description: {
        type: 'string',
        description: 'Description of what needs to be built or changed',
      },
      type: {
        type: 'string',
        enum: ['new-feature', 'bug-fix', 'enhancement', 'modernization', 'security-fix', 'hotfix'],
        description: 'Type of work (optional, will be auto-classified if not provided)',
      },
      governance: {
        type: 'number',
        enum: [1, 2, 3, 4],
        description: 'Governance level override (1=tracking, 2=light, 3=full, 4=audit)',
      },
      branch: {
        type: 'string',
        description: 'Target git branch',
      },
    },
    required: ['description'],
  },
};

/**
 * Execute the start-workflow tool.
 */
export async function executeStartWorkflow(
  args: {
    description: string;
    type?: string;
    governance?: number;
    branch?: string;
  },
  classifier: HybridClassifier,
  router: SmartRouter,
  governanceEngine: GovernanceEngine,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    // 1. Classify the request
    const classification = await classifier.classify(args.description, {
      branch: args.branch,
    });

    // 2. Route the classification
    const govLevel = (args.governance || governanceEngine.getLevel()) as GovernanceLevel;
    const route = router.route(classification, govLevel);

    // 3. Apply governance
    const governance = governanceEngine.evaluate(classification, args.branch);

    if (!governance.allowed) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'blocked',
            reason: 'Governance check failed',
            blockedBy: governance.blockedBy,
            advisories: governance.advisories,
            overrideAvailable: governance.overrideAvailable,
            overrideRequiresToken: governance.overrideRequiresToken,
          }, null, 2),
        }],
      };
    }

    // 4. Generate workflow ID
    const now = new Date();
    const workflowId = `SDLC-${now.toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;

    // 5. Create workflow tracking entry
    const workflowEntry = {
      id: workflowId,
      description: args.description,
      classification: {
        type: classification.type,
        complexity: classification.complexity,
        urgency: classification.urgency,
        confidence: classification.confidence,
      },
      route: {
        strategy: route.strategy,
        phases: route.phases,
        agents: route.agents,
        estimatedDuration: route.estimatedDuration,
      },
      governance: {
        level: governance.level,
        allowed: governance.allowed,
        advisories: governance.advisories,
      },
      status: 'initiated',
      createdAt: now.toISOString(),
      phases: route.phases.map(phase => ({
        name: phase,
        status: 'pending',
        startedAt: null,
        completedAt: null,
      })),
    };

    // 6. Save workflow entry
    const workflowDir = path.join(os.homedir(), '.aisdlc', 'registry', 'workflows');
    if (!fs.existsSync(workflowDir)) {
      fs.mkdirSync(workflowDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(workflowDir, `${workflowId}.json`),
      JSON.stringify(workflowEntry, null, 2),
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'initiated',
          workflowId,
          description: args.description,
          type: classification.type,
          complexity: classification.complexity,
          strategy: route.strategy,
          phases: route.phases,
          agents: route.agents,
          estimatedDuration: route.estimatedDuration,
          governanceLevel: governance.level,
          advisories: governance.advisories,
          instructions: `Workflow ${workflowId} has been initiated. Execute the SDLC phases in order: ${route.phases.join(' -> ')}. Use the /sdlc-start command or invoke the Conductor agent to orchestrate the full workflow.`,
        }, null, 2),
      }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Workflow start failed: ${errorMsg}` }),
      }],
      isError: true,
    };
  }
}
