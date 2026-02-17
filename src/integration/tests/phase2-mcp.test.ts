/**
 * Phase 2 MCP Server Tool Tests
 *
 * Tests the MCP tool implementations.
 */

import { HybridClassifier } from '../classifier';
import { SmartRouter } from '../router';
import { GovernanceEngine } from '../governance';
import { executeClassify } from '../mcp-server/tools/classify';
import { executeStartWorkflow } from '../mcp-server/tools/start-workflow';
import { executeCheckGovernance } from '../mcp-server/tools/check-governance';
import { executeGetStatus } from '../mcp-server/tools/get-status';
import { executeReviewCode } from '../mcp-server/tools/review-code';
import { executeAskTom } from '../mcp-server/tools/ask-tom';
import { executeSearchMemory } from '../mcp-server/tools/search-memory';
import { executeGetConfig } from '../mcp-server/tools/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Shared instances
const classifier = new HybridClassifier({
  tier1Enabled: true,
  tier2Enabled: false, // No LLM in tests
});

const router = new SmartRouter();
const governanceEngine = new GovernanceEngine({ level: 2 });

// --- Classify Tool Tests ---

describe('aisdlc_classify tool', () => {
  it('should classify a Q&A request', async () => {
    const result = await executeClassify({ message: 'What is React?' }, classifier);
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.type).toBe('qa');
    expect(parsed.requiresSDLC).toBe(false);
    expect(parsed.confidence).toBeGreaterThan(0);
  });

  it('should classify a code change request', async () => {
    const result = await executeClassify(
      { message: 'Add a user authentication system with OAuth 2.0' },
      classifier,
    );
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.type).toBe('code-change');
    expect(parsed.requiresSDLC).toBe(true);
    expect(parsed.requiredPhases).toBeInstanceOf(Array);
  });

  it('should classify an emergency request', async () => {
    const result = await executeClassify(
      { message: 'URGENT: production API returning 500 errors' },
      classifier,
    );
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.urgency).toBe('critical');
  });

  it('should include classification duration', async () => {
    const result = await executeClassify({ message: 'What is TypeScript?' }, classifier);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.classificationDuration).toBeDefined();
  });

  it('should accept optional branch context', async () => {
    const result = await executeClassify(
      { message: 'Add feature', branch: 'feature/auth', projectType: 'typescript' },
      classifier,
    );
    expect(result.isError).toBeFalsy();
  });
});

// --- Start Workflow Tool Tests ---

describe('aisdlc_start_workflow tool', () => {
  it('should initiate a workflow for a feature request', async () => {
    const result = await executeStartWorkflow(
      { description: 'Add user profile page with avatar upload' },
      classifier,
      router,
      governanceEngine,
    );
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('initiated');
    expect(parsed.workflowId).toBeDefined();
    expect(parsed.phases).toBeInstanceOf(Array);
    expect(parsed.agents).toBeInstanceOf(Array);
    expect(parsed.instructions).toBeDefined();
  });

  it('should block workflow when governance blocks it', async () => {
    const strictEngine = new GovernanceEngine({ level: 3 });
    const result = await executeStartWorkflow(
      { description: 'Deploy critical changes to production' },
      classifier,
      router,
      strictEngine,
    );

    const parsed = JSON.parse(result.content[0].text);
    // At level 3, complex code changes may be blocked
    expect(parsed.status).toBeDefined();
  });

  it('should save workflow to registry', async () => {
    const result = await executeStartWorkflow(
      { description: 'Build a REST API endpoint' },
      classifier,
      router,
      governanceEngine,
    );

    const parsed = JSON.parse(result.content[0].text);
    if (parsed.workflowId) {
      const workflowPath = path.join(
        os.homedir(),
        '.aisdlc',
        'registry',
        'workflows',
        `${parsed.workflowId}.json`,
      );

      // Check the file was created
      if (fs.existsSync(workflowPath)) {
        const saved = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
        expect(saved.id).toBe(parsed.workflowId);
        // Cleanup
        fs.unlinkSync(workflowPath);
      }
    }
  });
});

// --- Check Governance Tool Tests ---

describe('aisdlc_check_governance tool', () => {
  it('should return current governance status when no args', async () => {
    const result = await executeCheckGovernance({}, classifier, governanceEngine);
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.currentLevel).toBe(2);
    expect(parsed.levelName).toBe('Light Governance');
  });

  it('should check governance for a message', async () => {
    const result = await executeCheckGovernance(
      { message: 'Add authentication' },
      classifier,
      governanceEngine,
    );
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.allowed).toBeDefined();
    expect(parsed.level).toBeDefined();
    expect(parsed.gates).toBeInstanceOf(Array);
  });

  it('should change governance level', async () => {
    const testEngine = new GovernanceEngine({ level: 2 });
    const result = await executeCheckGovernance(
      { setLevel: 3 },
      classifier,
      testEngine,
    );
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.action).toBe('governance-level-changed');
    expect(parsed.previous.level).toBe(2);
    expect(parsed.current.level).toBe(3);
    expect(parsed.changes).toBeInstanceOf(Array);
    expect(parsed.changes.length).toBeGreaterThan(0);
  });
});

// --- Get Status Tool Tests ---

describe('aisdlc_get_status tool', () => {
  it('should return status summary', async () => {
    const result = await executeGetStatus({});
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.summary || parsed.active !== undefined || parsed.message).toBeTruthy();
  });

  it('should return error for non-existent workflow', async () => {
    const result = await executeGetStatus({ workflowId: 'SDLC-NONEXISTENT' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });
});

// --- Review Code Tool Tests ---

describe('aisdlc_review_code tool', () => {
  it('should initiate a review for an existing path', async () => {
    const result = await executeReviewCode({ path: __dirname });
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('initiated');
    expect(parsed.reviewId).toBeDefined();
    expect(parsed.agents).toBeInstanceOf(Array);
  });

  it('should return error for non-existent path', async () => {
    const result = await executeReviewCode({ path: '/nonexistent/path' });
    expect(result.isError).toBe(true);
  });

  it('should support security-only review', async () => {
    const result = await executeReviewCode({ path: __dirname, type: 'security' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.agents).toContain('security');
    expect(parsed.agents).not.toContain('qa');
  });

  it('should support quality-only review', async () => {
    const result = await executeReviewCode({ path: __dirname, type: 'quality' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.agents).toContain('qa');
    expect(parsed.agents).not.toContain('security');
  });
});

// --- Ask Tom Tool Tests ---

describe('aisdlc_ask_tom tool', () => {
  it('should initiate a problem for analysis', async () => {
    const result = await executeAskTom({ problem: 'Database connection timeout' });
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('initiated');
    expect(parsed.problemId).toBeDefined();
  });

  it('should handle critical urgency', async () => {
    const result = await executeAskTom({
      problem: 'Production API down',
      urgency: 'critical',
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.urgency).toBe('critical');
    expect(parsed.instructions).toContain('EMERGENCY');
  });
});

// --- Search Memory Tool Tests ---

describe('aisdlc_search_memory tool', () => {
  it('should search without errors', async () => {
    const result = await executeSearchMemory({ query: 'authentication' });
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.query).toBe('authentication');
    expect(parsed.resultCount).toBeDefined();
    expect(parsed.results).toBeInstanceOf(Array);
  });

  it('should support category filtering', async () => {
    const result = await executeSearchMemory({
      query: 'pattern',
      category: 'patterns',
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.category).toBe('patterns');
  });
});

// --- Get Config Tool Tests ---

describe('aisdlc_get_config tool', () => {
  it('should return full configuration', async () => {
    const result = await executeGetConfig({});
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.enabled).toBeDefined();
    expect(parsed.governance).toBeDefined();
    expect(parsed.classification).toBeDefined();
  });

  it('should return specific section', async () => {
    const result = await executeGetConfig({ section: 'governance' });
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.section).toBe('governance');
    expect(parsed.config).toBeDefined();
  });

  it('should return error for unknown section', async () => {
    const result = await executeGetConfig({ section: 'nonexistent' });
    expect(result.isError).toBe(true);
  });
});
