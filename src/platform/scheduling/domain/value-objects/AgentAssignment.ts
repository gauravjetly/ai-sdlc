/**
 * AgentAssignment Value Object
 *
 * Represents an agent assigned to a scheduled work item,
 * including its role and configuration parameters.
 */

export type AgentRole = 'primary' | 'reviewer' | 'tester' | 'monitor' | 'advisor';

export interface AgentAssignmentProps {
  agentType: string;
  role: AgentRole;
  parameters?: Record<string, unknown>;
  useMemory?: boolean;
  saveMemory?: boolean;
}

export class AgentAssignment {
  readonly agentType: string;
  readonly role: AgentRole;
  readonly parameters: Record<string, unknown>;
  readonly useMemory: boolean;
  readonly saveMemory: boolean;

  constructor(props: AgentAssignmentProps) {
    this.agentType = props.agentType;
    this.role = props.role;
    this.parameters = props.parameters || {};
    this.useMemory = props.useMemory !== false;
    this.saveMemory = props.saveMemory !== false;

    this.validate();
  }

  private validate(): void {
    if (!this.agentType || this.agentType.trim().length === 0) {
      throw new Error('Agent type is required');
    }

    const validRoles: AgentRole[] = ['primary', 'reviewer', 'tester', 'monitor', 'advisor'];
    if (!validRoles.includes(this.role)) {
      throw new Error(`Invalid agent role: "${this.role}". Valid roles: ${validRoles.join(', ')}`);
    }
  }

  equals(other: AgentAssignment): boolean {
    return this.agentType === other.agentType && this.role === other.role;
  }

  toJSON(): Record<string, unknown> {
    return {
      agentType: this.agentType,
      role: this.role,
      parameters: this.parameters,
      useMemory: this.useMemory,
      saveMemory: this.saveMemory,
    };
  }
}
