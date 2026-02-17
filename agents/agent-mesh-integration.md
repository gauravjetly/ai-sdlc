# Agent Mesh Integration Guide

## For All Agents

Every AI-SDLC agent is connected to the **Agent Mesh** -- a system that enables inter-agent communication, collective learning, and knowledge sharing. This guide describes the protocol that ALL agents must follow.

## Before Starting Work

```bash
# 1. Initialize mesh (idempotent, safe to run every time)
~/.claude/agent-mesh/mesh-cli.sh init 2>/dev/null || true

# 2. Check your inbox for messages from other agents
~/.claude/agent-mesh/mesh-cli.sh inbox {your-agent-id}

# 3. Get your collective intelligence briefing
~/.claude/agent-mesh/mesh-cli.sh briefing {your-agent-id}

# 4. Search for relevant knowledge from past work
~/.claude/agent-mesh/mesh-cli.sh search --query "{task description}" --agent {your-agent-id}
```

**Process inbox messages BEFORE starting your main task.** They may contain:
- Learnings from other agents that affect your work
- Requests for help from other agents
- Conflict notifications requiring your input
- Knowledge updates relevant to your domain

## During Work

### When You Discover Something Important

```bash
# Share a learning with the collective
~/.claude/agent-mesh/mesh-cli.sh learn \
  --agent {your-agent-id} \
  --title "{concise title}" \
  --description "{detailed learning}" \
  --category "{category}" \
  --confidence "emerging"
```

Categories:
- `best-practice` -- A proven approach that works well
- `anti-pattern` -- Something to avoid
- `error-pattern` -- A recognized error and its solution
- `security-insight` -- A security-related discovery
- `performance-insight` -- A performance-related discovery
- `architecture-decision` -- An architecture choice and rationale
- `integration-pattern` -- A working integration approach
- `process-improvement` -- A workflow improvement

### When You Need Help from Another Agent

```bash
# Send a request for help
~/.claude/agent-mesh/mesh-cli.sh send \
  --from {your-agent-id} \
  --to {target-agent-id} \
  --type request \
  --priority high \
  --subject "{what you need}" \
  --content "{detailed context and question}"
```

### When You Disagree with Another Agent's Output

```bash
# Send a conflict notification
~/.claude/agent-mesh/mesh-cli.sh send \
  --from {your-agent-id} \
  --to conductor \
  --type conflict \
  --priority high \
  --subject "Conflict: {topic}" \
  --content "I disagree with {agent}'s recommendation because {reasoning}"
```

### When You Find an Issue in Another Agent's Work

```bash
# Notify the relevant agent
~/.claude/agent-mesh/mesh-cli.sh send \
  --from {your-agent-id} \
  --to {agent-who-needs-to-know} \
  --type notification \
  --subject "Issue found: {brief description}" \
  --content "{detailed description of the issue and suggested fix}"
```

## After Completing Work

```bash
# 1. Report your key learning
~/.claude/agent-mesh/mesh-cli.sh learn \
  --agent {your-agent-id} \
  --title "{what you learned}" \
  --description "{detailed description}" \
  --category "{appropriate category}"

# 2. Acknowledge any messages you processed
~/.claude/agent-mesh/mesh-cli.sh ack {your-agent-id} {message-id}

# 3. Send handoff notification to next agent
~/.claude/agent-mesh/mesh-cli.sh send \
  --from {your-agent-id} \
  --to {next-agent-id} \
  --type notification \
  --subject "Phase complete: {your phase}" \
  --content "Key outputs: {list of deliverables}. Key decisions: {important decisions made}."
```

## Agent Discovery

The Agent Mesh contains a registry of all agents and their expertise. When you need to find the right agent to help with a specific topic, check the registry:

| Agent ID | Expertise Areas |
|----------|----------------|
| `conductor` | Workflow orchestration, project management, coordination |
| `ba` | Requirements, user stories, business rules, domain modeling |
| `jets` | System architecture, design patterns, ADRs, scalability |
| `ux` | User experience, accessibility, design systems, wireframes |
| `engineer` | Implementation, TypeScript, React, Node.js, databases |
| `security` | OWASP, threat modeling, compliance, encryption, auth |
| `qa` | Test strategy, automation, BDD, performance testing |
| `atlas` | CI/CD, Docker, Kubernetes, AWS/Azure/GCP, monitoring |
| `customer` | Acceptance testing, business value, usability |
| `ask-tom` | Root cause analysis, debugging, problem solving |
| `tracker` | Progress tracking, metrics, blocker detection |
| `finops` | Cost optimization, budget management, resource sizing |

## Collective Memory

The collective memory stores knowledge from ALL agents. Before making decisions:

1. **Check for existing knowledge** on your topic
2. **Check for anti-patterns** to avoid known mistakes
3. **Check for conflict resolutions** to avoid re-litigating settled decisions

After making decisions:
1. **Record the decision** and rationale
2. **Record any new patterns** discovered
3. **Record any anti-patterns** identified

## Security and Access

- Agents can only send messages to agents in their authorized list
- All messages are logged for audit
- Circuit breakers prevent message storms
- Loop detection prevents infinite message chains (max depth: 10)
- Messages expire after 24 hours by default
