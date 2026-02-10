/**
 * TriggerCondition Value Object
 *
 * Represents a condition that must be met for a trigger to fire.
 * Conditions are composed into groups with AND/OR logic.
 */

export type ConditionOperator = 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'in' | 'regex';

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | string[];
}

export interface TriggerConditionGroup {
  operator: 'AND' | 'OR';
  conditions: TriggerCondition[];
}

const ALLOWED_OPERATORS: ConditionOperator[] = ['eq', 'neq', 'contains', 'gt', 'lt', 'in', 'regex'];

/**
 * Validate a trigger condition
 */
export function validateCondition(condition: TriggerCondition): string[] {
  const errors: string[] = [];

  if (!condition.field || condition.field.trim().length === 0) {
    errors.push('Condition field is required');
  }

  if (condition.field && condition.field.length > 200) {
    errors.push('Condition field must be 200 characters or less');
  }

  if (!ALLOWED_OPERATORS.includes(condition.operator)) {
    errors.push(`Invalid operator: "${condition.operator}". Allowed: ${ALLOWED_OPERATORS.join(', ')}`);
  }

  if (condition.operator === 'in' && !Array.isArray(condition.value)) {
    errors.push('The "in" operator requires an array value');
  }

  if (condition.operator === 'gt' || condition.operator === 'lt') {
    if (typeof condition.value !== 'number' && isNaN(Number(condition.value))) {
      errors.push(`The "${condition.operator}" operator requires a numeric value`);
    }
  }

  if (condition.operator === 'regex') {
    try {
      new RegExp(String(condition.value));
    } catch {
      errors.push(`Invalid regex pattern: "${condition.value}"`);
    }
  }

  // Prevent injection in field paths
  if (condition.field && /[;{}()[\]\\]/.test(condition.field)) {
    errors.push('Condition field contains invalid characters');
  }

  return errors;
}

/**
 * Validate a condition group
 */
export function validateConditionGroup(group: TriggerConditionGroup): string[] {
  const errors: string[] = [];

  if (group.operator !== 'AND' && group.operator !== 'OR') {
    errors.push(`Invalid group operator: "${group.operator}". Must be "AND" or "OR"`);
  }

  if (!Array.isArray(group.conditions) || group.conditions.length === 0) {
    errors.push('Condition group must have at least one condition');
  }

  if (group.conditions.length > 20) {
    errors.push('Condition group cannot have more than 20 conditions');
  }

  for (const condition of group.conditions) {
    errors.push(...validateCondition(condition));
  }

  return errors;
}

/**
 * Serialize condition to a display string
 */
export function conditionToString(condition: TriggerCondition): string {
  const valueStr = Array.isArray(condition.value)
    ? `[${condition.value.join(', ')}]`
    : String(condition.value);

  const operatorMap: Record<ConditionOperator, string> = {
    eq: '=',
    neq: '!=',
    contains: 'contains',
    gt: '>',
    lt: '<',
    in: 'in',
    regex: 'matches',
  };

  return `${condition.field} ${operatorMap[condition.operator]} ${valueStr}`;
}
