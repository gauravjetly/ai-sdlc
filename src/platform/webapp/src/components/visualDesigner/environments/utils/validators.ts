/**
 * Environment Validation Utilities
 * Validates environment configurations, variables, and promotions
 */

import {
  Environment,
  EnvironmentConfig,
  EnvironmentVariable,
  PromotionRequest,
  EnvironmentError,
  EnvironmentErrorCode,
} from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: EnvironmentError[];
  warnings: EnvironmentError[];
}

/**
 * Validate variable key name
 */
export function validateVariableKey(key: string): ValidationResult {
  const errors: EnvironmentError[] = [];
  const warnings: EnvironmentError[] = [];

  if (!key || key.trim().length === 0) {
    errors.push({
      code: EnvironmentErrorCode.INVALID_VARIABLE_NAME,
      message: 'Variable key cannot be empty',
    });
  }

  // Check for valid variable name pattern
  const validPattern = /^[A-Z][A-Z0-9_]*$/;
  if (key && !validPattern.test(key)) {
    warnings.push({
      code: EnvironmentErrorCode.INVALID_VARIABLE_NAME,
      message:
        'Variable key should be uppercase with underscores (e.g., API_KEY)',
      details: { key, pattern: validPattern.source },
    });
  }

  // Check for reserved names
  const reservedNames = [
    'PATH',
    'HOME',
    'USER',
    'SHELL',
    'PWD',
    'TERM',
    'LANG',
  ];
  if (reservedNames.includes(key.toUpperCase())) {
    warnings.push({
      code: EnvironmentErrorCode.INVALID_VARIABLE_NAME,
      message: `'${key}' is a reserved system variable name`,
      details: { key, reservedNames },
    });
  }

  // Check length
  if (key && key.length > 256) {
    errors.push({
      code: EnvironmentErrorCode.INVALID_VARIABLE_NAME,
      message: 'Variable key cannot exceed 256 characters',
      details: { length: key.length, maxLength: 256 },
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate variable value
 */
export function validateVariableValue(
  value: string,
  variable: Partial<EnvironmentVariable>
): ValidationResult {
  const errors: EnvironmentError[] = [];
  const warnings: EnvironmentError[] = [];

  // Check for potential secret exposure
  const secretPatterns = [
    /password/i,
    /secret/i,
    /api[_-]?key/i,
    /private[_-]?key/i,
    /token/i,
    /credential/i,
  ];

  if (variable.type !== 'secret') {
    const keyMatchesSecret = secretPatterns.some((pattern) =>
      pattern.test(variable.key || '')
    );
    if (keyMatchesSecret) {
      warnings.push({
        code: EnvironmentErrorCode.VARIABLE_VALIDATION_FAILED,
        message:
          'This variable name suggests it contains sensitive data. Consider marking it as a secret.',
        details: { key: variable.key },
      });
    }
  }

  // Validate against pattern if provided
  if (variable.validationPattern && value) {
    try {
      const pattern = new RegExp(variable.validationPattern);
      if (!pattern.test(value)) {
        errors.push({
          code: EnvironmentErrorCode.VARIABLE_VALIDATION_FAILED,
          message: `Value does not match required pattern: ${variable.validationPattern}`,
          details: { value, pattern: variable.validationPattern },
        });
      }
    } catch {
      warnings.push({
        code: EnvironmentErrorCode.VARIABLE_VALIDATION_FAILED,
        message: 'Invalid validation pattern configured',
        details: { pattern: variable.validationPattern },
      });
    }
  }

  // Check for unresolved references in non-reference types
  if (variable.type === 'plain') {
    const unresolvedRefs = findUnresolvedReferences(value);
    if (unresolvedRefs.length > 0) {
      warnings.push({
        code: EnvironmentErrorCode.VARIABLE_VALIDATION_FAILED,
        message: 'Value contains unresolved variable references',
        details: { unresolvedReferences: unresolvedRefs },
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Find unresolved variable references in a string
 */
export function findUnresolvedReferences(value: string): string[] {
  const refPattern = /\$\{([^}]+)\}/g;
  const references: string[] = [];
  let match;

  while ((match = refPattern.exec(value)) !== null) {
    references.push(match[1]);
  }

  return references;
}

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(
  config: Partial<EnvironmentConfig>
): ValidationResult {
  const errors: EnvironmentError[] = [];
  const warnings: EnvironmentError[] = [];

  // Check required metadata
  if (!config.metadata?.name) {
    errors.push({
      code: EnvironmentErrorCode.VALIDATION_FAILED,
      message: 'Environment name is required',
    });
  }

  // Check for duplicate variable keys
  if (config.variables) {
    const keys = config.variables.map((v) => v.key);
    const duplicates = keys.filter(
      (key, index) => keys.indexOf(key) !== index
    );
    if (duplicates.length > 0) {
      errors.push({
        code: EnvironmentErrorCode.VALIDATION_FAILED,
        message: 'Duplicate variable keys found',
        details: { duplicates: [...new Set(duplicates)] },
      });
    }

    // Validate each variable
    for (const variable of config.variables) {
      const keyResult = validateVariableKey(variable.key);
      const valueResult = validateVariableValue(variable.value, variable);
      errors.push(...keyResult.errors, ...valueResult.errors);
      warnings.push(...keyResult.warnings, ...valueResult.warnings);
    }
  }

  // Check for required variables
  if (config.variables) {
    const missingRequired = config.variables.filter(
      (v) => v.isRequired && (!v.value || v.value.trim() === '')
    );
    if (missingRequired.length > 0) {
      errors.push({
        code: EnvironmentErrorCode.VALIDATION_FAILED,
        message: 'Required variables are missing values',
        details: { missingVariables: missingRequired.map((v) => v.key) },
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate promotion request
 */
export function validatePromotionRequest(
  request: PromotionRequest,
  sourceConfig: EnvironmentConfig,
  targetConfig: EnvironmentConfig
): ValidationResult {
  const errors: EnvironmentError[] = [];
  const warnings: EnvironmentError[] = [];

  // Cannot promote to same environment
  if (request.sourceEnvironment === request.targetEnvironment) {
    errors.push({
      code: EnvironmentErrorCode.VALIDATION_FAILED,
      message: 'Cannot promote to the same environment',
    });
  }

  // Validate promotion path
  const validPaths: Record<Environment, Environment[]> = {
    dev: ['staging'],
    staging: ['prod', 'dev'],
    prod: ['dr'],
    dr: ['prod'],
  };

  if (
    !validPaths[request.sourceEnvironment]?.includes(request.targetEnvironment)
  ) {
    errors.push({
      code: EnvironmentErrorCode.PROMOTION_BLOCKED,
      message: `Cannot promote from ${request.sourceEnvironment} to ${request.targetEnvironment}`,
      details: {
        validTargets: validPaths[request.sourceEnvironment],
      },
    });
  }

  // Check if target is protected
  if (targetConfig.metadata.isProtected) {
    warnings.push({
      code: EnvironmentErrorCode.APPROVAL_REQUIRED,
      message: `Promotion to ${request.targetEnvironment} requires approval`,
    });
  }

  // Validate selected changes exist
  if (request.changes.length === 0) {
    errors.push({
      code: EnvironmentErrorCode.VALIDATION_FAILED,
      message: 'No changes selected for promotion',
    });
  }

  // Production-specific validations
  if (request.targetEnvironment === 'prod') {
    // Require reason for production
    if (!request.reason || request.reason.trim().length < 10) {
      errors.push({
        code: EnvironmentErrorCode.VALIDATION_FAILED,
        message: 'A detailed reason is required for production promotions',
        details: { minLength: 10 },
      });
    }

    // Check if source environment is validated
    if (sourceConfig.metadata.status !== 'healthy') {
      errors.push({
        code: EnvironmentErrorCode.PROMOTION_BLOCKED,
        message: 'Source environment must be healthy before promoting to production',
        details: { currentStatus: sourceConfig.metadata.status },
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if user has permission for environment action
 */
export function checkEnvironmentPermission(
  environment: Environment,
  action: 'read' | 'write' | 'promote' | 'approve' | 'delete',
  userRole: string
): boolean {
  const permissions: Record<string, Record<Environment, string[]>> = {
    developer: {
      dev: ['read', 'write'],
      staging: ['read'],
      prod: ['read'],
      dr: [],
    },
    devops: {
      dev: ['read', 'write', 'promote'],
      staging: ['read', 'write', 'promote'],
      prod: ['read'],
      dr: ['read'],
    },
    admin: {
      dev: ['read', 'write', 'promote', 'approve', 'delete'],
      staging: ['read', 'write', 'promote', 'approve', 'delete'],
      prod: ['read', 'write', 'promote', 'approve'],
      dr: ['read', 'write', 'promote', 'approve'],
    },
  };

  const rolePermissions = permissions[userRole];
  if (!rolePermissions) return false;

  const envPermissions = rolePermissions[environment];
  if (!envPermissions) return false;

  return envPermissions.includes(action);
}

/**
 * Validate bulk import data
 */
export function validateBulkImport(
  data: Array<{ key: string; value: string; type?: string }>
): ValidationResult {
  const errors: EnvironmentError[] = [];
  const warnings: EnvironmentError[] = [];

  if (!Array.isArray(data)) {
    errors.push({
      code: EnvironmentErrorCode.VALIDATION_FAILED,
      message: 'Import data must be an array',
    });
    return { isValid: false, errors, warnings };
  }

  if (data.length === 0) {
    errors.push({
      code: EnvironmentErrorCode.VALIDATION_FAILED,
      message: 'Import data is empty',
    });
  }

  if (data.length > 100) {
    warnings.push({
      code: EnvironmentErrorCode.VALIDATION_FAILED,
      message: 'Large import detected. This may take a while.',
      details: { count: data.length },
    });
  }

  // Check for required fields
  data.forEach((item, index) => {
    if (!item.key) {
      errors.push({
        code: EnvironmentErrorCode.VALIDATION_FAILED,
        message: `Item at index ${index} is missing required 'key' field`,
      });
    }
  });

  // Check for duplicates within import
  const keys = data.map((item) => item.key).filter(Boolean);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length > 0) {
    errors.push({
      code: EnvironmentErrorCode.VALIDATION_FAILED,
      message: 'Import contains duplicate keys',
      details: { duplicates: [...new Set(duplicates)] },
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
