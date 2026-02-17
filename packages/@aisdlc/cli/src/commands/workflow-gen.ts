/**
 * Natural Language Workflow Generator
 * Parse natural language and generate custom SDLC workflows
 */

interface WorkflowPhase {
  name: string;
  agent: string;
  duration: string;
  description: string;
  required: boolean;
}

export async function workflowGenCommand(args: string[]): Promise<void> {
  const description = args.join(' ');

  if (!description) {
    console.log('Usage: aisdlc workflow-gen "<description>"');
    console.log('Example: aisdlc workflow-gen "Add Stripe payments with PCI compliance, 3 week deadline"');
    return;
  }

  console.log('\n  Natural Language Workflow Generator');
  console.log('  ====================================\n');
  console.log(`  Input: "${description}"\n`);

  // Parse intent
  const intent = parseIntent(description);
  displayIntent(intent);

  // Generate workflow
  const workflow = generateWorkflow(intent);
  displayWorkflow(workflow);

  // Estimate
  const estimate = estimateWorkflow(workflow);
  displayEstimate(estimate);
}

function parseIntent(description: string): any {
  const intent: any = {
    type: 'feature',
    urgency: 'normal',
    risk: 'medium',
    compliance: [],
    timeline: null,
    keywords: []
  };

  // Detect type
  if (description.match(/payment|stripe|billing/i)) {
    intent.type = 'payment-integration';
    intent.risk = 'high';
    intent.compliance.push('PCI DSS');
  } else if (description.match(/auth|login|oauth|jwt/i)) {
    intent.type = 'authentication';
    intent.risk = 'high';
    intent.compliance.push('Security Standards');
  } else if (description.match(/fix|bug|error/i)) {
    intent.type = 'bugfix';
    intent.risk = 'low';
  }

  // Detect urgency
  if (description.match(/urgent|asap|critical|immediately/i)) {
    intent.urgency = 'high';
  } else if (description.match(/low priority|when possible/i)) {
    intent.urgency = 'low';
  }

  // Detect timeline
  const timelineMatch = description.match(/(\d+)\s*(week|day|month)/i);
  if (timelineMatch) {
    intent.timeline = {
      value: parseInt(timelineMatch[1]),
      unit: timelineMatch[2].toLowerCase()
    };
  }

  // Detect compliance
  if (description.match(/pci|pci-dss|pci dss/i)) {
    if (!intent.compliance.includes('PCI DSS')) {
      intent.compliance.push('PCI DSS');
    }
  }
  if (description.match(/gdpr/i)) {
    intent.compliance.push('GDPR');
  }
  if (description.match(/hipaa/i)) {
    intent.compliance.push('HIPAA');
  }

  return intent;
}

function generateWorkflow(intent: any): WorkflowPhase[] {
  const baseWorkflow: WorkflowPhase[] = [
    {
      name: 'Requirements',
      agent: 'BA Agent',
      duration: '2 hours',
      description: 'Gather requirements and acceptance criteria',
      required: true
    }
  ];

  // Add compliance-specific phases
  if (intent.compliance.length > 0) {
    baseWorkflow.push({
      name: 'Compliance Review',
      agent: 'Security Agent',
      duration: '1 hour',
      description: `Pre-approve architecture for ${intent.compliance.join(', ')}`,
      required: true
    });
  }

  // Architecture
  baseWorkflow.push({
    name: 'Architecture',
    agent: 'Architect (Jets)',
    duration: '3 hours',
    description: `Design solution${intent.risk === 'high' ? ' with security-first approach' : ''}`,
    required: true
  });

  // UX (if needed)
  if (intent.type !== 'bugfix') {
    baseWorkflow.push({
      name: 'UX Design',
      agent: 'UX Agent',
      duration: '2 hours',
      description: 'Design user interface and experience',
      required: false
    });
  }

  // Development
  const devDuration = intent.type === 'bugfix' ? '4 hours' : '3 days';
  baseWorkflow.push({
    name: 'Development',
    agent: 'Software Engineer',
    duration: devDuration,
    description: intent.risk === 'high' ? 'TDD approach required' : 'Implement with tests',
    required: true
  });

  // Security (extra review for high risk)
  if (intent.risk === 'high') {
    baseWorkflow.push({
      name: 'Security Review',
      agent: 'Security Agent',
      duration: '2 hours',
      description: `${intent.compliance.join(', ')} compliance verification`,
      required: true
    });
  }

  // Testing
  baseWorkflow.push({
    name: 'Testing',
    agent: 'QA Agent',
    duration: intent.risk === 'high' ? '1 day' : '4 hours',
    description: `${intent.risk === 'high' ? 'Comprehensive test suite + edge cases' : 'Standard testing'}`,
    required: true
  });

  // Deployment (phased for high risk)
  const deployStrategy = intent.risk === 'high' ? 'Phased rollout (5% → 25% → 100%)' : 'Standard deployment';
  baseWorkflow.push({
    name: 'Deployment',
    agent: 'Atlas Agent',
    duration: '2 days',
    description: deployStrategy,
    required: true
  });

  // UAT
  baseWorkflow.push({
    name: 'Acceptance',
    agent: 'Customer Agent',
    duration: '1 day',
    description: 'User acceptance testing',
    required: true
  });

  return baseWorkflow;
}

function displayIntent(intent: any): void {
  console.log('  Parsed Intent:');
  console.log('  ──────────────');
  console.log(`  Type: ${intent.type}`);
  console.log(`  Risk Level: ${intent.risk.toUpperCase()}`);
  console.log(`  Urgency: ${intent.urgency}`);

  if (intent.compliance.length > 0) {
    console.log(`  Compliance: ${intent.compliance.join(', ')}`);
  }

  if (intent.timeline) {
    console.log(`  Timeline: ${intent.timeline.value} ${intent.timeline.unit}(s)`);
  }

  console.log('');
}

function displayWorkflow(workflow: WorkflowPhase[]): void {
  console.log('  Generated Custom Workflow:');
  console.log('  ──────────────────────────\n');

  workflow.forEach((phase, idx) => {
    const required = phase.required ? '✓' : '○';
    console.log(`  ${idx + 1}. ${phase.name} [${required}]`);
    console.log(`     Agent: ${phase.agent}`);
    console.log(`     Duration: ${phase.duration}`);
    console.log(`     ${phase.description}`);
    console.log('');
  });
}

function estimateWorkflow(workflow: WorkflowPhase[]): any {
  const durations: Record<string, number> = {
    '1 hour': 1,
    '2 hours': 2,
    '3 hours': 3,
    '4 hours': 4,
    '1 day': 8,
    '2 days': 16,
    '3 days': 24
  };

  const totalHours = workflow.reduce((sum, phase) => {
    return sum + (durations[phase.duration] || 8);
  }, 0);

  return {
    hours: totalHours,
    days: Math.ceil(totalHours / 8),
    weeks: Math.ceil(totalHours / 40)
  };
}

function displayEstimate(estimate: any): void {
  console.log('  Time Estimate:');
  console.log('  ──────────────');
  console.log(`  Total: ${estimate.hours} hours (${estimate.days} days, ${estimate.weeks} weeks)`);
  console.log(`  Recommended buffer: +${Math.ceil(estimate.weeks * 0.25)} weeks\n`);

  console.log('  Ready to proceed? (Y/n)');
}
