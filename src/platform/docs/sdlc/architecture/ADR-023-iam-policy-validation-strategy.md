# ADR-023: IAM Policy Validation Strategy

**Status**: Accepted
**Date**: 2026-02-02
**Author**: Architect (Jets) Agent

## Context

IAM policies are JSON documents that must conform to AWS IAM policy grammar. Users need immediate feedback on policy validity, and security best practices must be enforced.

## Decision

Implement a multi-layer validation strategy:

### Layer 1: JSON Syntax Validation
- Parse JSON structure
- Report line/column for syntax errors
- Immediate feedback on typing

### Layer 2: IAM Grammar Validation
- Validate required fields (Version, Statement)
- Validate Effect is "Allow" or "Deny"
- Validate Action/Resource format
- Validate Condition operators

### Layer 3: Security Best Practices
- Warn on `"Action": "*"` (all actions)
- Warn on `"Resource": "*"` (all resources)
- Warn on `"Action": "service:*"` (all actions for service)
- Recommend conditions for sensitive actions
- Flag common misconfigurations

### Layer 4: Reference Validation
- Validate IAM role references exist
- Validate instance profile mappings
- Cross-reference with compute resources

## Implementation

```typescript
interface PolicyValidationResult {
  isValid: boolean;
  syntaxErrors: SyntaxError[];
  grammarErrors: GrammarError[];
  securityWarnings: SecurityWarning[];
  referenceErrors: ReferenceError[];
}

function validatePolicy(policy: string): PolicyValidationResult {
  // Layer 1: JSON syntax
  const parsed = parseJSON(policy);
  if (!parsed.success) return { syntaxErrors: [parsed.error] };

  // Layer 2: IAM grammar
  const grammarErrors = validateGrammar(parsed.document);

  // Layer 3: Security
  const securityWarnings = checkSecurityBestPractices(parsed.document);

  return { grammarErrors, securityWarnings };
}
```

## Rationale

- **Immediate Feedback**: Users see errors as they type
- **Security First**: Best practices enforced by default
- **Educational**: Warnings help users learn IAM best practices
- **Flexible**: Can proceed with warnings, blocked by errors

## Consequences

### Positive
- Prevents invalid policies from being deployed
- Educates users on security best practices
- Reduces security review burden

### Negative
- May initially frustrate users unfamiliar with IAM
- Cannot validate all AWS-specific constraints (e.g., resource existence)

## Alternatives Considered

1. **AWS Policy Simulator API**: Requires credentials, adds latency
2. **Backend Validation Only**: Poor UX, no immediate feedback
3. **No Validation**: Security risk, poor user experience
