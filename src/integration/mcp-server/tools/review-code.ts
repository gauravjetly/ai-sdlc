/**
 * aisdlc_review_code MCP Tool
 *
 * Initiates a code review (quality, security, or full) for specified files.
 *
 * @module mcp-server/tools/review-code
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const reviewCodeToolSchema = {
  name: 'aisdlc_review_code',
  description: 'Initiate a governed code review for specified files or directories. Can be a security-focused review, quality-focused review, or full review. Returns review findings and summary.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'File or directory path to review',
      },
      type: {
        type: 'string',
        enum: ['security', 'quality', 'full'],
        description: 'Type of review to perform (default: full)',
      },
      severity: {
        type: 'string',
        enum: ['info', 'warning', 'error', 'critical'],
        description: 'Minimum severity to report (default: warning)',
      },
    },
    required: ['path'],
  },
};

/**
 * Execute the review-code tool.
 */
export async function executeReviewCode(
  args: { path: string; type?: string; severity?: string },
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    const reviewType = args.type || 'full';
    const minSeverity = args.severity || 'warning';
    const targetPath = args.path;

    // Verify path exists
    if (!fs.existsSync(targetPath)) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Path not found: ${targetPath}` }),
        }],
        isError: true,
      };
    }

    // Create review tracking entry
    const reviewId = `REVIEW-${Date.now()}`;
    const reviewEntry = {
      id: reviewId,
      type: reviewType,
      targetPath,
      minSeverity,
      status: 'initiated',
      createdAt: new Date().toISOString(),
      agents: reviewType === 'security'
        ? ['security']
        : reviewType === 'quality'
          ? ['qa']
          : ['security', 'qa'],
      instructions: buildReviewInstructions(reviewType, targetPath),
    };

    // Save review entry
    const reviewDir = path.join(os.homedir(), '.aisdlc', 'registry', 'reviews');
    if (!fs.existsSync(reviewDir)) {
      fs.mkdirSync(reviewDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(reviewDir, `${reviewId}.json`),
      JSON.stringify(reviewEntry, null, 2),
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'initiated',
          reviewId,
          type: reviewType,
          targetPath,
          agents: reviewEntry.agents,
          instructions: reviewEntry.instructions,
        }, null, 2),
      }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Review initiation failed: ${errorMsg}` }),
      }],
      isError: true,
    };
  }
}

/**
 * Build review instructions based on review type.
 */
function buildReviewInstructions(reviewType: string, targetPath: string): string {
  switch (reviewType) {
    case 'security':
      return `Invoke the Security Agent to review ${targetPath} for:\n` +
        '- OWASP Top 10 vulnerabilities\n' +
        '- Input validation and sanitization\n' +
        '- Authentication and authorization\n' +
        '- Secrets and credential exposure\n' +
        '- Dependency vulnerabilities';
    case 'quality':
      return `Invoke the QA Agent to review ${targetPath} for:\n` +
        '- Code quality and maintainability\n' +
        '- Test coverage and test quality\n' +
        '- Performance concerns\n' +
        '- Code duplication\n' +
        '- SOLID principle adherence';
    default:
      return `Invoke both Security and QA Agents to review ${targetPath} for a comprehensive review covering security, quality, performance, and maintainability.`;
  }
}
