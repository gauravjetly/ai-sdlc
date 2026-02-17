/**
 * Bypass Token Manager
 *
 * Generates and validates HMAC-SHA256 bypass tokens for Level 3 governance.
 * Bypass tokens are single-use, time-limited cryptographic tokens that allow
 * authorized users to bypass specific governance gates.
 *
 * Part of Phase 3: Enhanced Governance Engine.
 * See ADR-042 for bypass token design.
 *
 * @module governance/bypass-token-manager
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Data structure embedded in a bypass token.
 */
export interface BypassTokenData {
  /** The workflow ID this token applies to */
  workflowId: string;
  /** Reason for the bypass */
  reason: string;
  /** Who created the token */
  createdBy: string;
  /** Gates this token bypasses */
  gates: string[];
  /** When the token was created (ISO string) */
  createdAt: string;
  /** When the token expires (ISO string) */
  expiresAt: string;
  /** Random nonce for uniqueness */
  nonce: string;
}

/**
 * Input for generating a bypass token.
 */
export interface GenerateTokenInput {
  /** The workflow ID to bypass */
  workflowId: string;
  /** Reason for the bypass */
  reason: string;
  /** Who is creating the token */
  createdBy?: string;
  /** Specific gates to bypass. Empty means all gates. */
  gates?: string[];
  /** Expiration time in milliseconds from now. Default: 1 hour */
  expiresIn?: number;
}

/**
 * Result of token validation.
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** Reason for validation failure (if invalid) */
  reason?: string;
  /** The decoded token data (if valid) */
  data?: BypassTokenData;
}

/**
 * Record of a used token stored in the token registry.
 */
interface TokenRecord {
  /** The token hash for lookup */
  tokenHash: string;
  /** The token data */
  data: BypassTokenData;
  /** Whether the token has been used */
  used: boolean;
  /** When the token was used */
  usedAt: string | null;
}

const DEFAULT_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour
const HMAC_ALGORITHM = 'sha256';
const TOKEN_ENCODING = 'hex' as const;

/**
 * BypassTokenManager generates and validates HMAC-SHA256 bypass tokens
 * for Level 3 governance overrides.
 *
 * Tokens are:
 * - Cryptographically signed with HMAC-SHA256
 * - Single-use (consumed after first validation)
 * - Time-limited (configurable expiration)
 * - Scoped to a specific workflow and gates
 */
export class BypassTokenManager {
  private readonly secret: string;
  private readonly tokenRegistry: Map<string, TokenRecord> = new Map();

  /**
   * Create a new BypassTokenManager.
   *
   * @param secret - The HMAC secret key. Must be at least 32 characters.
   * @throws Error if secret is too short
   */
  constructor(secret?: string) {
    const resolvedSecret = secret ?? process.env.AISDLC_BYPASS_SECRET ?? '';

    if (resolvedSecret.length < 32) {
      throw new Error(
        'Bypass token secret must be at least 32 characters. ' +
        'Set AISDLC_BYPASS_SECRET environment variable or pass secret to constructor.',
      );
    }

    this.secret = resolvedSecret;
  }

  /**
   * Generate a new bypass token.
   *
   * @param input - Token generation parameters
   * @returns The generated token string (hex-encoded HMAC signature)
   */
  generateToken(input: GenerateTokenInput): string {
    if (!input.workflowId) {
      throw new Error('workflowId is required');
    }
    if (!input.reason || input.reason.trim().length === 0) {
      throw new Error('reason is required for bypass tokens');
    }

    const now = new Date();
    const expiresIn = input.expiresIn ?? DEFAULT_EXPIRATION_MS;

    const data: BypassTokenData = {
      workflowId: input.workflowId,
      reason: input.reason,
      createdBy: input.createdBy ?? 'system',
      gates: input.gates ?? [],
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + expiresIn).toISOString(),
      nonce: randomBytes(16).toString('hex'),
    };

    // Generate HMAC-SHA256 signature
    const payload = JSON.stringify(data);
    const hmac = createHmac(HMAC_ALGORITHM, this.secret);
    hmac.update(payload);
    const token = hmac.digest(TOKEN_ENCODING);

    // Store token in registry
    const tokenHash = this.hashToken(token);
    this.tokenRegistry.set(tokenHash, {
      tokenHash,
      data,
      used: false,
      usedAt: null,
    });

    return token;
  }

  /**
   * Validate a bypass token.
   *
   * The token is validated for:
   * 1. Existence in the registry
   * 2. Not already used (single-use)
   * 3. Not expired
   * 4. Workflow ID match
   * 5. Gate scope match (if specified)
   *
   * If valid, the token is consumed (marked as used).
   *
   * @param token - The token string to validate
   * @param workflowId - The workflow ID to validate against
   * @param gate - Optional specific gate to validate against
   * @returns Validation result
   */
  validateToken(
    token: string,
    workflowId: string,
    gate?: string,
  ): TokenValidationResult {
    // Look up token in registry
    const tokenHash = this.hashToken(token);
    const record = this.tokenRegistry.get(tokenHash);

    if (!record) {
      return { valid: false, reason: 'Token not found or invalid signature' };
    }

    // Check if already used (single-use enforcement)
    if (record.used) {
      return { valid: false, reason: 'Token has already been used (single-use)' };
    }

    // Check expiration
    if (new Date(record.data.expiresAt) <= new Date()) {
      return { valid: false, reason: 'Token has expired' };
    }

    // Check workflow ID match
    if (record.data.workflowId !== workflowId) {
      return {
        valid: false,
        reason: `Token is scoped to workflow '${record.data.workflowId}', not '${workflowId}'`,
      };
    }

    // Check gate scope (if token has specific gates and a gate is requested)
    if (gate && record.data.gates.length > 0) {
      if (!record.data.gates.includes(gate)) {
        return {
          valid: false,
          reason: `Token does not cover gate '${gate}'. Covered gates: ${record.data.gates.join(', ')}`,
        };
      }
    }

    // Token is valid -- consume it (single-use)
    record.used = true;
    record.usedAt = new Date().toISOString();

    return { valid: true, data: record.data };
  }

  /**
   * Check if a token is valid without consuming it.
   * Useful for pre-validation before attempting a bypass.
   *
   * @param token - The token string to check
   * @param workflowId - The workflow ID to check against
   * @returns True if the token would be valid
   */
  isTokenValid(token: string, workflowId: string): boolean {
    const tokenHash = this.hashToken(token);
    const record = this.tokenRegistry.get(tokenHash);

    if (!record) return false;
    if (record.used) return false;
    if (new Date(record.data.expiresAt) <= new Date()) return false;
    if (record.data.workflowId !== workflowId) return false;

    return true;
  }

  /**
   * Revoke a token (mark as used without actually using it).
   *
   * @param token - The token to revoke
   * @returns True if the token was found and revoked
   */
  revokeToken(token: string): boolean {
    const tokenHash = this.hashToken(token);
    const record = this.tokenRegistry.get(tokenHash);

    if (!record) return false;
    if (record.used) return false;

    record.used = true;
    record.usedAt = new Date().toISOString();
    return true;
  }

  /**
   * Get the data embedded in a token (without consuming it).
   *
   * @param token - The token to inspect
   * @returns The token data or null if not found
   */
  getTokenData(token: string): BypassTokenData | null {
    const tokenHash = this.hashToken(token);
    const record = this.tokenRegistry.get(tokenHash);
    return record?.data ?? null;
  }

  /**
   * Get statistics about bypass tokens.
   */
  getStats(): {
    total: number;
    used: number;
    unused: number;
    expired: number;
  } {
    let total = 0;
    let used = 0;
    let unused = 0;
    let expired = 0;
    const now = new Date();

    for (const record of this.tokenRegistry.values()) {
      total++;
      if (record.used) {
        used++;
      } else if (new Date(record.data.expiresAt) <= now) {
        expired++;
      } else {
        unused++;
      }
    }

    return { total, used, unused, expired };
  }

  /**
   * Clean up expired tokens from the registry.
   *
   * @returns Number of tokens cleaned up
   */
  cleanupExpired(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [hash, record] of this.tokenRegistry.entries()) {
      if (record.used || new Date(record.data.expiresAt) <= now) {
        this.tokenRegistry.delete(hash);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Hash a token for registry lookup.
   * Uses a secondary hash to avoid storing the raw token.
   */
  private hashToken(token: string): string {
    const hmac = createHmac(HMAC_ALGORITHM, 'token-lookup');
    hmac.update(token);
    return hmac.digest(TOKEN_ENCODING);
  }
}
