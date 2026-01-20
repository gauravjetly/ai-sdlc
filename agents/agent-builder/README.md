# Custom Agent Builder Framework

Build specialized AI-SDLC agents tailored to your organization's needs.

## Overview

The Agent Builder framework allows you to create custom agents that integrate seamlessly with the AI-SDLC workflow. Custom agents can:

- Specialize in domain-specific tasks
- Integrate with internal tools and APIs
- Apply organization-specific patterns and standards
- Learn from your codebase and documentation

## Quick Start

```bash
# Create a new agent
./agent-builder.sh create my-agent

# Configure the agent
./agent-builder.sh configure my-agent

# Test the agent
./agent-builder.sh test my-agent

# Deploy the agent
./agent-builder.sh deploy my-agent
```

## Agent Structure

```
my-agent/
├── agent.yaml           # Agent configuration
├── system-prompt.md     # Agent personality and instructions
├── tools/               # Custom tool definitions
│   └── my-tool.yaml
├── patterns/            # Domain patterns
│   └── patterns.json
├── examples/            # Few-shot examples
│   └── examples.json
└── tests/               # Agent tests
    └── test-cases.yaml
```

## Configuration Reference

### agent.yaml

```yaml
name: my-agent
version: 1.0.0
description: Custom agent for specific domain

# Agent identity
identity:
  role: "Domain Expert"
  expertise:
    - "Specific technology"
    - "Internal processes"
  personality: "Professional and thorough"

# Integration settings
integration:
  # Which SDLC phases this agent participates in
  phases:
    - requirements
    - implementation
    - review

  # Agents this agent can consult
  consults:
    - security-agent
    - architect-agent

  # Events this agent responds to
  triggers:
    - file_created: "*.config.ts"
    - pr_opened: true
    - manual: true

# Tool access
tools:
  builtin:
    - read
    - write
    - bash
    - grep
  custom:
    - my-custom-tool

# Memory settings
memory:
  enabled: true
  categories:
    - patterns
    - solutions
    - learnings
  retention_days: 90

# Resource limits
limits:
  max_tokens: 100000
  max_tool_calls: 50
  timeout_minutes: 30
```

### system-prompt.md

```markdown
# My Custom Agent

You are a specialized agent for [DOMAIN].

## Your Responsibilities

1. [Primary responsibility]
2. [Secondary responsibility]
3. [Tertiary responsibility]

## Your Expertise

- [Area of expertise 1]
- [Area of expertise 2]

## How You Work

When given a task:
1. First, understand the context
2. Then, analyze the requirements
3. Finally, produce the deliverable

## Output Format

Always structure your output as:
- Summary
- Details
- Recommendations
- Next Steps

## Important Rules

- ALWAYS [rule 1]
- NEVER [rule 2]
- PREFER [preference]
```

## Creating Custom Tools

### tools/my-tool.yaml

```yaml
name: my-custom-tool
description: Performs custom operation
version: 1.0.0

# Input schema
parameters:
  type: object
  properties:
    input_file:
      type: string
      description: Path to input file
    options:
      type: object
      properties:
        verbose:
          type: boolean
          default: false
  required:
    - input_file

# Execution
execution:
  type: bash
  command: |
    #!/bin/bash
    # Tool implementation
    cat {{input_file}}
    if [ "{{options.verbose}}" = "true" ]; then
      echo "Verbose mode enabled"
    fi

# Output schema
output:
  type: object
  properties:
    result:
      type: string
    success:
      type: boolean
```

## Pattern Library

### patterns/patterns.json

```json
{
  "patterns": [
    {
      "name": "pattern-name",
      "description": "When to use this pattern",
      "triggers": [
        "keyword1",
        "keyword2"
      ],
      "template": "Pattern template with {{variables}}",
      "examples": [
        {
          "input": "Example input",
          "output": "Example output"
        }
      ]
    }
  ]
}
```

## Few-Shot Examples

### examples/examples.json

```json
{
  "examples": [
    {
      "name": "example-task",
      "description": "How to handle this type of task",
      "input": {
        "task": "Description of the task",
        "context": "Relevant context"
      },
      "thinking": "Step-by-step reasoning",
      "output": "Expected output format"
    }
  ]
}
```

## Testing Your Agent

### tests/test-cases.yaml

```yaml
test_cases:
  - name: "Basic functionality test"
    input:
      task: "Test task description"
      files:
        - path: "test/file.ts"
          content: "// Test content"
    expected:
      contains:
        - "expected output phrase"
      not_contains:
        - "unexpected phrase"

  - name: "Edge case test"
    input:
      task: "Edge case scenario"
    expected:
      behavior: "handles_gracefully"
```

## Integration with SDLC

### Registering Your Agent

```bash
# Register with the conductor
./agent-builder.sh register my-agent

# Verify registration
./agent-builder.sh list
```

### Workflow Integration

Custom agents integrate through the conductor:

```yaml
# In your agent.yaml
integration:
  conductor:
    # When conductor should invoke this agent
    invoke_on:
      - keyword: "specific-domain"
      - file_pattern: "*.domain.ts"

    # Priority relative to built-in agents
    priority: 100

    # Can run in parallel with
    parallel_with:
      - engineer-agent
```

## Best Practices

### 1. Clear Scope
Define exactly what your agent does and doesn't do.

### 2. Comprehensive Examples
Provide many few-shot examples for consistent behavior.

### 3. Pattern Library
Build up patterns over time from successful interactions.

### 4. Thorough Testing
Test edge cases and failure modes.

### 5. Memory Management
Configure appropriate retention and categorization.

### 6. Integration Points
Define clear consultation and escalation paths.

## Example: API Documentation Agent

```yaml
name: api-docs-agent
version: 1.0.0
description: Generates and maintains API documentation

identity:
  role: "API Documentation Specialist"
  expertise:
    - "OpenAPI/Swagger"
    - "REST API design"
    - "Technical writing"

integration:
  phases:
    - implementation
    - review
  triggers:
    - file_created: "src/api/**/*.ts"
    - file_modified: "src/api/**/*.ts"

tools:
  builtin:
    - read
    - write
    - glob
  custom:
    - openapi-generator
    - markdown-formatter

memory:
  enabled: true
  categories:
    - api_patterns
    - documentation_templates
```

## Support

For help building custom agents:
1. Check the examples in `agents/examples/`
2. Review built-in agent configurations
3. Open an issue with your use case
