# Security Review: Phase 2 - Claude Code + AI-SDLC Integration

**Review ID**: SECURITY-REVIEW-20260217-0800
**SDLC ID**: SDLC-20260217-0800
**Date**: 2026-02-17
**Reviewer**: Security Agent
**Verdict**: APPROVED WITH ADVISORIES

---

## Executive Summary

Phase 2 of the Claude Code + AI-SDLC integration introduces a hooks system, MCP server, file-based IPC bridge, workflow executor, and dashboard. This review covers all 25+ new source files across 6 component groups. The codebase demonstrates **strong security posture** overall with defense-in-depth patterns, proper error handling, and no critical vulnerabilities. Several advisory findings are documented below for hardening.

**Overall Risk Level**: LOW

| Category | Critical | High | Medium | Low | Info |
|----------|----------|------|--------|-----|------|
| Input Validation | 0 | 0 | 1 | 2 | 1 |
| Authentication/Authorization | 0 | 0 | 0 | 1 | 1 |
| Data Protection | 0 | 0 | 1 | 1 | 0 |
| File System Security | 0 | 0 | 1 | 2 | 1 |
| IPC Security | 0 | 0 | 1 | 1 | 0 |
| Dependency Security | 0 | 0 | 0 | 1 | 0 |
| Error Handling | 0 | 0 | 0 | 0 | 2 |
| **TOTAL** | **0** | **0** | **4** | **8** | **5** |

---

## Scope

### Files Reviewed

**Hooks System (6 files)**:
- `src/integration/hooks/user-prompt-submit.ts`
- `src/integration/hooks/stop.ts`
- `src/integration/hooks/post-write.ts`
- `src/integration/hooks/lib/config-loader.ts`
- `src/integration/hooks/lib/hook-bridge.ts`
- `src/integration/hooks/lib/message-transformer.ts`

**MCP Server (12 files)**:
- `src/integration/mcp-server/index.ts`
- `src/integration/mcp-server/tools/classify.ts`
- `src/integration/mcp-server/tools/start-workflow.ts`
- `src/integration/mcp-server/tools/check-governance.ts`
- `src/integration/mcp-server/tools/get-status.ts`
- `src/integration/mcp-server/tools/review-code.ts`
- `src/integration/mcp-server/tools/ask-tom.ts`
- `src/integration/mcp-server/tools/search-memory.ts`
- `src/integration/mcp-server/tools/config.ts`
- `src/integration/mcp-server/resources/registry.ts`
- `src/integration/mcp-server/resources/health.ts`
- `src/integration/mcp-server/resources/config-resource.ts`

**Bridge and Executor (3 files)**:
- `src/integration/bridge/hook-mcp-bridge.ts`
- `src/integration/executor/workflow-executor.ts`
- `src/integration/executor/progress-tracker.ts`

**Configuration and Templates (2 files)**:
- `src/integration/templates/claude-settings.json`
- Module exports in `src/integration/index.ts`

**Test Files (4 files)**:
- `src/integration/tests/phase2-hooks.test.ts`
- `src/integration/tests/phase2-mcp.test.ts`
- `src/integration/tests/phase2-bridge.test.ts`
- `src/integration/tests/phase2-e2e.test.ts`

---

## Security Strengths

### S1: Crash-Proof Hook Design
**Rating: EXCELLENT**

All three hooks (`user-prompt-submit.ts`, `stop.ts`, `post-write.ts`) implement a multi-layer crash protection pattern:

1. Inner try/catch blocks for specific operations (JSON parsing, file I/O)
2. Outer try/catch in `main()` function
3. `.catch()` on the main() promise as final safety net
4. All error paths output valid JSON (`{}`) to stdout

This ensures Claude Code is **never blocked** by a hook failure. The user experience is preserved even when the integration layer encounters unexpected errors.

### S2: Local-Only MCP Transport
**Rating: EXCELLENT**

The MCP server uses `StdioServerTransport` (stdio), which means:
- No network sockets opened
- No HTTP/WebSocket exposure
- Communication is process-local only
- No attack surface for remote exploits

This is the most secure MCP transport option and aligns with zero-trust principles for local tooling.

### S3: Governance-as-Code Enforcement
**Rating: GOOD**

The 4-level governance model is enforced at multiple points:
- Hook bridge evaluates governance before transformation
- MCP `start-workflow` tool checks governance before initiating workflows
- Governance blocks produce clear remediation guidance
- Level changes are audited with before/after descriptions
- Protected branch detection prevents accidental production changes

### S4: Configuration Type Validation
**Rating: GOOD**

The `config-loader.ts` mergeConfig function validates each config property by type before accepting overrides:
- `typeof override.enabled === 'boolean'` checks
- Governance level range validation (1-4)
- Confidence threshold validation as number type
- Prevents type confusion attacks via malformed config files

### S5: Error Information Containment
**Rating: GOOD**

Error messages returned to MCP tools use controlled formatting:
- Errors caught with `error instanceof Error ? error.message : String(error)`
- No stack traces exposed in MCP tool responses
- Internal implementation details not leaked to consumers

---

## Findings

### MEDIUM Findings

#### M1: Message Hash Used as Cache Filename Without Sanitization
**Severity**: MEDIUM
**Component**: `bridge/hook-mcp-bridge.ts`, line 68
**CWE**: CWE-22 (Path Traversal)

**Finding**: The `storeClassification()` method uses `shared.messageHash` directly as a filename:
```typescript
const filePath = path.join(this.cacheDir, `${shared.messageHash}.json`);
```

If a messageHash contains path traversal characters (e.g., `../../etc/cron.d/evil`), this could write files outside the intended cache directory.

**Risk Assessment**: LOW in practice. The messageHash is generated internally by the HybridClassifier using a deterministic hash function that produces alphanumeric output. However, the bridge module does not enforce this constraint at the API boundary.

**Recommendation**: Validate or sanitize the messageHash before using it as a filename:
```typescript
const safeHash = shared.messageHash.replace(/[^a-zA-Z0-9-_]/g, '');
const filePath = path.join(this.cacheDir, `${safeHash}.json`);
```

---

#### M2: User Message Content Logged to Registry
**Severity**: MEDIUM
**Component**: `hooks/user-prompt-submit.ts`, line 132
**CWE**: CWE-532 (Information Exposure Through Log Files)

**Finding**: The `logToRegistry()` function records `messageLength` but the `transformResult.metadata` may contain the full classification with user message details. While the message text itself is not directly logged, the classification data (type, technologies, affected files) derived from the message is persisted to disk.

**Risk Assessment**: MODERATE. In environments where user messages contain sensitive information (credentials, personal data), derived metadata could leak context about those messages.

**Recommendation**:
- Ensure registry log entries never contain raw user message text (currently they do not -- this is correct)
- Add a configurable `logLevel` to control what metadata is persisted
- Document that registry files at `~/.aisdlc/registry/requests/` may contain classification metadata

---

#### M3: File-Based IPC Without Access Controls
**Severity**: MEDIUM
**Component**: `bridge/hook-mcp-bridge.ts`, lines 56-61
**CWE**: CWE-732 (Incorrect Permission Assignment)

**Finding**: The bridge creates directories at `~/.aisdlc/bridge/` using `fs.mkdirSync` with default permissions. On macOS/Linux, the default umask typically results in 755 permissions, meaning other users on the system could read the bridge state files.

**Risk Assessment**: LOW for single-user development machines. MEDIUM for shared development servers.

**Recommendation**: Set restrictive permissions on bridge directories:
```typescript
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
```
And on written files:
```typescript
fs.writeFileSync(filePath, content, { mode: 0o600 });
```

---

#### M4: Search Memory Tool Reads Arbitrary JSON Files
**Severity**: MEDIUM
**Component**: `mcp-server/tools/search-memory.ts`, lines 49-82
**CWE**: CWE-200 (Information Exposure)

**Finding**: The `executeSearchMemory` function reads all `.json` files from agent memory directories and performs substring matching. While the search scope is limited to `~/.claude/agent-memory/{agent}/{category}/`, the function reads and parses all JSON files in those directories.

**Risk Assessment**: LOW. The directories are well-scoped and expected to contain only agent memory files. No user-controlled path input is used for directory traversal. The search results are limited to 20 entries.

**Recommendation**:
- Add a maximum file size check before reading (skip files > 1MB)
- Consider indexing instead of full-scan for performance at scale

---

### LOW Findings

#### L1: Hardcoded Protected Branch List
**Severity**: LOW
**Component**: `hooks/user-prompt-submit.ts`, line 105
**Finding**: Protected branches are hardcoded: `['main', 'master', 'production', 'release/*']`. Organizations with different branch naming conventions would not benefit from this protection.
**Recommendation**: Make configurable via `config.governance.protectedBranches`.

#### L2: Workflow ID Generation Uses Timestamp Only
**Severity**: LOW
**Component**: `executor/workflow-executor.ts`, line 103
**Finding**: Workflow IDs are generated from timestamps (`SDLC-{timestamp}`). If two workflows are created within the same second, IDs could collide.
**Recommendation**: Append a random suffix or use a UUID for the ID portion.

#### L3: No Rate Limiting on Hook Processing
**Severity**: LOW
**Component**: `hooks/user-prompt-submit.ts`
**Finding**: Every user message triggers the full classification pipeline. There is no rate limiting to prevent resource exhaustion if messages are submitted very rapidly.
**Recommendation**: The timeout fallback (line 201-208) provides some protection. Consider adding a cooldown period for very rapid consecutive messages.

#### L4: Config File Load Race Condition
**Severity**: LOW
**Component**: `hooks/lib/config-loader.ts`, lines 70-110
**Finding**: The config loader uses a simple timestamp-based cache. If the config file is modified while the cache is valid, stale config is used for up to 60 seconds.
**Recommendation**: Acceptable for this use case. Document that config changes take up to 60 seconds to take effect.

#### L5: Bridge Message Ordering Not Guaranteed
**Severity**: LOW
**Component**: `bridge/hook-mcp-bridge.ts`, lines 108-131
**Finding**: Messages are sorted by filename, which uses `message.id` as the filename. If IDs are not lexicographically ordered, message ordering may be incorrect.
**Recommendation**: Use timestamp-prefixed filenames for reliable ordering.

#### L6: Unvalidated setLevel Input in Governance Tool
**Severity**: LOW
**Component**: `mcp-server/tools/check-governance.ts`, line 51
**Finding**: The `setLevel` value is cast directly to `GovernanceLevel`: `const level = args.setLevel as GovernanceLevel;`. While the MCP input schema restricts values to `[1, 2, 3, 4]`, the schema validation happens upstream.
**Recommendation**: Add a defensive bounds check: `if (args.setLevel < 1 || args.setLevel > 4)`.

#### L7: No TLS/Encryption for Bridge Files
**Severity**: LOW
**Component**: `bridge/hook-mcp-bridge.ts`
**Finding**: Bridge cache and message files are stored as plain JSON. For governance levels 3-4 (full/audit), classification data about code changes is stored unencrypted.
**Recommendation**: For production deployments at governance level 4, consider encrypting bridge files at rest.

#### L8: PostToolUse Hook Logs Content Length
**Severity**: LOW
**Component**: `hooks/post-write.ts`, line 48
**Finding**: The hook logs `contentLength` for all Write operations. While the actual file content is not logged, the content length could leak information about what was written.
**Recommendation**: Acceptable for audit trail purposes. Document this in the privacy notice.

---

### INFORMATIONAL Findings

#### I1: Stderr Used for MCP Server Logging
**Component**: `mcp-server/index.ts`, lines 311-313
**Finding**: Server startup messages are logged to stderr (`console.error`). This is correct for MCP servers (stdout is the protocol channel), but these messages include configuration details (governance level).
**Status**: ACCEPTABLE - this is the documented MCP pattern.

#### I2: Health Resource Exposes System Information
**Component**: `mcp-server/resources/health.ts`, lines 63-65
**Finding**: The health resource exposes OS platform, architecture, and Node.js version. This is standard for health endpoints but could aid reconnaissance.
**Status**: ACCEPTABLE - MCP is local-only via stdio, so this information is not network-accessible.

#### I3: Test Files Include Classification Patterns
**Component**: `tests/phase2-e2e.test.ts`
**Finding**: Test files document the exact patterns that trigger different classifications. This is expected for testing but documents the classification rules explicitly.
**Status**: ACCEPTABLE - the classification rules themselves are in the source code.

#### I4: Config Resource Exposes Full Configuration
**Component**: `mcp-server/resources/config-resource.ts`
**Finding**: The `aisdlc://config` resource returns the full platform configuration including all settings.
**Status**: ACCEPTABLE - MCP is local-only, and configuration visibility is needed for debugging.

#### I5: Error Logging to User Home Directory
**Component**: `hooks/user-prompt-submit.ts`, lines 247-256
**Finding**: Errors are logged to `~/.aisdlc/logs/hook-errors.log` using `appendFileSync`. This file grows unbounded.
**Recommendation**: Consider log rotation or max file size limits in future iterations.

---

## Dependency Analysis

### Direct Dependencies

| Package | Version | Risk | Notes |
|---------|---------|------|-------|
| @modelcontextprotocol/sdk | ^2.x | LOW | Official Anthropic MCP SDK, well-maintained |
| uuid | ^9.x | LOW | Standard UUID generation, no known vulnerabilities |
| yaml | ^2.x | LOW | YAML parser, used for config loading |
| zod | ^3.x | LOW | Schema validation, no execution of untrusted code |

### Transitive Dependencies
No high-risk transitive dependencies identified. The MCP SDK uses standard Node.js APIs for stdio transport.

---

## Architecture Security Assessment

### Data Flow Security

```
User Message  -->  Hook (process boundary)  -->  HookBridge  -->  Classifier
     |                     |                          |               |
     |                     |                     (in-memory)     (rules only,
     |                     |                          |          no network)
     |              (JSON on stdin/stdout)             |
     |                     |                          v
     |                     |                     Router + Governance
     |                     |                          |
     |                     v                          v
     |              Message Transformer         File IPC Bridge
     |                     |                    (~/.aisdlc/bridge/)
     |                     v                          |
     |              Claude Code stdout                v
     |                                          MCP Server
     |                                         (stdio only)
     v
  Registry Logs (~/.aisdlc/registry/)
```

**Security Boundaries**:
1. Hook Process Boundary: Hooks run as child processes of Claude Code. They have the same permissions as the parent process.
2. File IPC Boundary: Bridge files are readable/writable by any process running as the same user.
3. MCP Protocol Boundary: Stdio transport ensures no network exposure.

**Assessment**: The architecture correctly uses process isolation (hooks) and local-only IPC (file system + stdio). There is no network attack surface introduced by Phase 2.

### Threat Model (STRIDE)

| Threat | Risk | Mitigation |
|--------|------|------------|
| **Spoofing**: Fake hook input | LOW | Hooks only accept input from Claude Code via stdin |
| **Tampering**: Modify bridge files | LOW | Files are in user home directory, same trust boundary |
| **Repudiation**: Deny actions | LOW | Registry logs all request classifications and file changes |
| **Info Disclosure**: Leak user messages | MEDIUM | Classification metadata is logged; raw messages are not |
| **Denial of Service**: Block hooks | LOW | Timeout fallback ensures passthrough on slow processing |
| **Elevation of Privilege**: Governance bypass | LOW | Governance is enforced at hook level before Claude sees modified message |

---

## Compliance Check

| Requirement | Status | Notes |
|-------------|--------|-------|
| No hardcoded secrets | PASS | No credentials, API keys, or tokens in source |
| Input validation | PASS | MCP tools validate required fields via schemas |
| Error handling | PASS | All paths handle errors gracefully, no crashes |
| Audit trail | PASS | Registry logs requests, completions, file changes |
| Data minimization | PASS | Only classification metadata logged, not raw messages |
| Governance enforcement | PASS | 4-level governance blocks at hook level |
| Secure defaults | PASS | Level 2 governance, Tier 1 only (no LLM calls by default) |

---

## Verdict

### APPROVED WITH ADVISORIES

The Phase 2 implementation demonstrates strong security practices:

1. **No critical or high vulnerabilities found**
2. **4 medium findings** -- all advisory, none blocking
3. **8 low findings** -- minor improvements for hardening
4. **5 informational** -- documentation items

The medium findings (M1-M4) should be addressed in a future hardening sprint but do not block deployment. The codebase follows defense-in-depth principles with crash-proof hooks, local-only transport, type-validated configuration, and governance enforcement at multiple layers.

### Recommended Priority Actions

1. **M3**: Set restrictive file permissions on bridge directories (quick fix)
2. **M1**: Sanitize messageHash before using as filename (quick fix)
3. **L2**: Add randomness to workflow ID generation (prevents collision)
4. **M4**: Add file size limits to memory search (prevents resource exhaustion)

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Security Agent | Security Review System | 2026-02-17 | APPROVED |

---

*This security review covers Phase 2 of the Claude Code + AI-SDLC Integration only. Phase 1 components were reviewed separately in SECURITY-REVIEW-20260216-0900.md.*
